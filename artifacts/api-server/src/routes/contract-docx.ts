import { Router } from "express";
import { eq, and, asc, inArray } from "drizzle-orm";
import {
  db,
  constructionSalesContractsTable,
  constructionUnitsTable,
  constructionProjectsTable,
  constructionAccrualsTable,
  counterpartiesTable,
} from "../lib/db";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth";
import { requireTenantCompany } from "../middleware/tenant";
import {
  findCounterpartyForContract,
  mergeContractBuyer,
} from "../lib/contract-buyer";
import {
  generateContractDocx,
  parseContractDate,
  formatMoneyDisplay,
  formatMoneyWords,
  type ContractGeneratePayload,
} from "../lib/contract-docx";
import {
  generateAnnex1Docx,
  resolveAnnexSchedule,
  type Annex1GeneratePayload,
} from "../lib/contract-annex1-docx";

const router: ReturnType<typeof Router> = Router();

router.use(requireAuth, requireTenantCompany);

function readContractUnitIds(contract: Pick<typeof constructionSalesContractsTable.$inferSelect, "unitId" | "notes">): number[] {
  const ids = new Set<number>();
  if (contract.unitId) ids.add(Number(contract.unitId));
  const match = (contract.notes || "").match(/\[PLANALITYC_CONTRACT_UNITS\]([\s\S]*?)\[\/PLANALITYC_CONTRACT_UNITS\]/);
  if (match?.[1]) {
    try {
      const parsed = JSON.parse(match[1]) as { unitIds?: unknown[] };
      for (const id of parsed.unitIds || []) {
        const n = Number(id);
        if (Number.isFinite(n) && n > 0) ids.add(n);
      }
    } catch {
      /* ignore malformed legacy notes */
    }
  }
  return Array.from(ids);
}

function officeFromUnit(
  unit: typeof constructionUnitsTable.$inferSelect | null | undefined,
  project: typeof constructionProjectsTable.$inferSelect | null | undefined,
  price: string,
  priceWords: string,
  initial: string,
  initialWords: string,
) {
  return {
    address: project?.address || "г. Бишкек",
    cadastralCode: "",
    area: unit?.area?.toString() || "",
    floor: unit?.floor?.toString() || "",
    block: unit?.block || "",
    number: unit?.unitNumber || "",
    priceUsd: price,
    priceUsdWords: priceWords,
    initialPayment: initial,
    initialPaymentWords: initialWords,
  };
}

function aggregateOffices(offices: ReturnType<typeof officeFromUnit>[]) {
  if (offices.length <= 1) return offices[0];
  const unique = (values: string[]) => Array.from(new Set(values.filter(Boolean))).join(", ");
  const areaTotal = offices.reduce((sum, office) => {
    const n = parseFloat(String(office.area).replace(",", "."));
    return sum + (Number.isFinite(n) ? n : 0);
  }, 0);
  return {
    ...offices[0],
    area: areaTotal > 0 ? areaTotal.toFixed(2) : unique(offices.map((o) => o.area)),
    floor: unique(offices.map((o) => o.floor)),
    block: unique(offices.map((o) => o.block)),
    number: unique(offices.map((o) => o.number)),
  };
}

/** Данные для вкладки «Договор» по ID договора продажи */
router.get("/construction/contracts-sales/:id/docx-data",
  async (req: AuthenticatedRequest, res): Promise<void> => {
    const id = Number(req.params.id);
    const companyId = req.scopedCompanyId!;

    const [contract] = await db
      .select()
      .from(constructionSalesContractsTable)
      .where(
        and(
          eq(constructionSalesContractsTable.id, id),
          eq(constructionSalesContractsTable.companyId, companyId),
        ),
      );

    if (!contract) {
      res.status(404).json({ error: "Договор не найден" });
      return;
    }

    const unitIds = readContractUnitIds(contract);
    const units = unitIds.length > 0
      ? await db
        .select()
        .from(constructionUnitsTable)
        .where(and(
          eq(constructionUnitsTable.companyId, companyId),
          inArray(constructionUnitsTable.id, unitIds),
        ))
      : [];
    const unit = units.find((u) => u.id === contract.unitId) || units[0] || null;

    const [project] = await db
      .select()
      .from(constructionProjectsTable)
      .where(eq(constructionProjectsTable.id, contract.projectId));

    const counterparty = await findCounterpartyForContract(
      companyId,
      contract.buyerId,
      contract.buyerName,
    );

    if (!contract.buyerId && counterparty) {
      await db
        .update(constructionSalesContractsTable)
        .set({ buyerId: counterparty.id, updatedAt: new Date() })
        .where(
          and(
            eq(constructionSalesContractsTable.id, contract.id),
            eq(constructionSalesContractsTable.companyId, companyId),
          ),
        );
    }

    const buyer = mergeContractBuyer(counterparty, {
      buyerName: contract.buyerName,
      buyerPhone: contract.buyerPhone,
      buyerMeta:
        contract.buyerMeta ??
        (contract as { buyer_meta?: string | null }).buyer_meta ??
        null,
    });
    const total = parseFloat(contract.totalAmount?.toString() || "0");
    const down = parseFloat(contract.downPayment?.toString() || "0");
    const priceUsd =
      contract.currency === "USD"
        ? formatMoneyDisplay(total)
        : formatMoneyDisplay(total);
    const initial =
      contract.currency === "USD"
        ? formatMoneyDisplay(down)
        : formatMoneyDisplay(down);

    const offices = (units.length > 0 ? units : [unit]).filter(Boolean).map((u) =>
      officeFromUnit(u, project, priceUsd, formatMoneyWords(total), initial, formatMoneyWords(down)),
    );

    const payload: ContractGeneratePayload = {
      contractDate: parseContractDate(
        contract.contractDate || new Date().toISOString().slice(0, 10),
      ),
      buyer,
      office: aggregateOffices(offices),
      offices,
    };

    const accruals = await db
      .select()
      .from(constructionAccrualsTable)
      .where(
        and(
          eq(constructionAccrualsTable.contractId, contract.id),
          eq(constructionAccrualsTable.companyId, companyId),
        ),
      )
      .orderBy(asc(constructionAccrualsTable.installmentNumber));

    const installmentMonths =
      contract.installmentMonths && contract.installmentMonths > 0
        ? contract.installmentMonths
        : accruals.filter((a) => a.installmentNumber > 0).length || 12;

    const schedule = resolveAnnexSchedule(
      accruals,
      total,
      down,
      installmentMonths,
      contract.contractDate || new Date().toISOString().slice(0, 10),
    );

    const annexPayload: Annex1GeneratePayload = {
      contractDate: payload.contractDate,
      buyer: payload.buyer,
      schedule,
    };

    res.json({
      contractId: contract.id,
      buyerId: contract.buyerId ?? counterparty?.id ?? null,
      buyerName: contract.buyerName,
      buyerPhone: contract.buyerPhone,
      contractNumber: contract.contractNumber,
      contractDate: contract.contractDate,
      totalAmount: total,
      downPayment: down,
      remainingAmount: Math.max(0, total - down),
      installmentMonths,
      payload,
      annexPayload,
      schedule,
    });
  },
);

/** Генерация .docx */
router.post(
  "/construction/contracts/generate-docx",
  requireAuth,
  async (req: AuthenticatedRequest, res): Promise<void> => {
    try {
      const body = req.body as ContractGeneratePayload & { projectId?: number };
      if (!body?.buyer?.fullName || !body?.office?.number) {
        res.status(400).json({ error: "Укажите покупателя и помещение" });
        return;
      }

      let templateBuffer: Buffer | undefined;
      if (body.projectId) {
        const [project] = await db
          .select({ contractTemplateMeta: constructionProjectsTable.contractTemplateMeta })
          .from(constructionProjectsTable)
          .where(and(
            eq(constructionProjectsTable.id, body.projectId),
            eq(constructionProjectsTable.companyId, req.scopedCompanyId!),
          ));
        if (project?.contractTemplateMeta) {
          try {
            const meta = JSON.parse(project.contractTemplateMeta) as { dataBase64?: string };
            if (meta.dataBase64) {
              templateBuffer = Buffer.from(meta.dataBase64, "base64");
            }
          } catch {
            /* use default template */
          }
        }
      }

      const buffer = generateContractDocx(body, templateBuffer);
      const fileName = `Договор_${body.buyer.fullName.split(" ")[0]}_офис${body.office.number}.docx`.replace(
        /\s+/g,
        "_",
      );

      res.set({
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      });
      res.send(buffer);
    } catch (err) {
      console.error("Contract docx error:", err);
      res.status(500).json({
        error:
          err instanceof Error
            ? err.message
            : "Не удалось сгенерировать договор. Проверьте шаблон.",
      });
    }
  },
);

/** Генерация Приложения №1 — график выплат на остаток */
router.post(
  "/construction/contracts/generate-annex1-docx",
  requireAuth,
  async (req: AuthenticatedRequest, res): Promise<void> => {
    try {
      const body = req.body as Annex1GeneratePayload;
      if (!body?.buyer?.fullName) {
        res.status(400).json({ error: "Укажите данные покупателя" });
        return;
      }
      if (!Array.isArray(body.schedule) || body.schedule.length === 0) {
        res.status(400).json({ error: "График выплат пуст" });
        return;
      }

      const buffer = generateAnnex1Docx(body);
      const fileName = `Приложение_1_${body.buyer.fullName.split(" ")[0] || "договор"}.docx`.replace(
        /\s+/g,
        "_",
      );

      res.set({
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      });
      res.send(buffer);
    } catch (err) {
      console.error("Annex1 docx error:", err);
      res.status(500).json({
        error:
          err instanceof Error
            ? err.message
            : "Не удалось сгенерировать приложение 1",
      });
    }
  },
);

export default router;
