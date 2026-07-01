import { Router } from "express";
import { eq, and, SQL } from "drizzle-orm";
import {
  db,
  warehousesTable,
  warehouseStockTable,
  warehouseTransfersTable,
  warehouseTransferItemsTable,
} from "../lib/db";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth";
import { requireTenantCompany } from "../middleware/tenant";
import { requireEnabledModule } from "../middleware/modules";
import {
  isTransferAllowed,
  availableToReserve,
  computeTransferReceipt,
  type TransferLine,
} from "../lib/warehouse-stock";

const router: ReturnType<typeof Router> = Router();

router.use(requireAuth, requireTenantCompany, requireEnabledModule("warehouse"));

// GET /warehouse/transfers — список перемещений компании
router.get("/warehouse/transfers", async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const { status, warehouseId } = req.query as Record<string, string | undefined>;
    const conditions: SQL[] = [eq(warehouseTransfersTable.companyId, req.scopedCompanyId!)];
    if (status) conditions.push(eq(warehouseTransfersTable.status, status));

    const rows = await db.select().from(warehouseTransfersTable)
      .where(and(...conditions))
      .orderBy(warehouseTransfersTable.createdAt);

    // фильтр по складу (источник ИЛИ получатель) — на стороне приложения, чтобы не усложнять SQL
    const filtered = warehouseId
      ? rows.filter((t) => t.fromWarehouseId === Number(warehouseId) || t.toWarehouseId === Number(warehouseId))
      : rows;
    res.json(filtered);
  } catch (error) {
    console.error("Error fetching transfers:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /warehouse/transfers/:id — шапка + позиции
router.get("/warehouse/transfers/:id", async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const [transfer] = await db.select().from(warehouseTransfersTable)
      .where(and(eq(warehouseTransfersTable.id, id), eq(warehouseTransfersTable.companyId, req.scopedCompanyId!)));
    if (!transfer) {
      res.status(404).json({ error: "transfer not found" });
      return;
    }
    const items = await db.select().from(warehouseTransferItemsTable)
      .where(eq(warehouseTransferItemsTable.transferId, id));
    res.json({ ...transfer, items });
  } catch (error) {
    console.error("Error fetching transfer:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /warehouse/transfers — создать draft (шапка + позиции)
router.post("/warehouse/transfers", async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const companyId = req.scopedCompanyId!;
    const body = req.body ?? {};
    const fromWarehouseId = Number(body.fromWarehouseId);
    const toWarehouseId = Number(body.toWarehouseId);
    const items = Array.isArray(body.items) ? body.items : [];

    if (!fromWarehouseId || !toWarehouseId) {
      res.status(400).json({ error: "fromWarehouseId и toWarehouseId обязательны" });
      return;
    }
    if (items.length === 0) {
      res.status(400).json({ error: "Добавьте хотя бы одну позицию" });
      return;
    }

    // склады должны принадлежать компании
    const warehouses = await db.select().from(warehousesTable)
      .where(and(eq(warehousesTable.companyId, companyId)));
    const from = warehouses.find((w) => w.id === fromWarehouseId);
    const to = warehouses.find((w) => w.id === toWarehouseId);
    if (!from || !to) {
      res.status(400).json({ error: "Склад-источник или склад-получатель не найден" });
      return;
    }
    if (!isTransferAllowed({ id: from.id, type: from.type as never }, { id: to.id, type: to.type as never })) {
      res.status(400).json({ error: "Нельзя перемещать в тот же склад" });
      return;
    }

    // проверить наличие на складе-источнике
    const sourceStock = await db.select().from(warehouseStockTable)
      .where(and(eq(warehouseStockTable.companyId, companyId), eq(warehouseStockTable.warehouseId, fromWarehouseId)));
    for (const item of items) {
      const stock = sourceStock.find((s) => s.itemId === Number(item.itemId));
      const available = stock ? availableToReserve(stock.quantity, stock.reservedQuantity) : 0;
      if (Number(item.quantitySent ?? 0) > available) {
        res.status(400).json({ error: `Недостаточно на складе-источнике для позиции ${item.itemId}: доступно ${available}` });
        return;
      }
    }

    const created = await db.transaction(async (tx) => {
      const [transfer] = await tx.insert(warehouseTransfersTable).values({
        companyId,
        fromWarehouseId,
        toWarehouseId,
        status: "draft",
        documentNumber: body.documentNumber ? String(body.documentNumber) : null,
        notes: body.notes ? String(body.notes) : null,
      }).returning();

      for (const item of items) {
        await tx.insert(warehouseTransferItemsTable).values({
          transferId: transfer.id,
          itemId: Number(item.itemId),
          quantitySent: String(item.quantitySent ?? "0"),
          notes: item.notes ? String(item.notes) : null,
        });
      }
      return transfer;
    });

    res.status(201).json(created);
  } catch (error) {
    console.error("Error creating transfer:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /warehouse/transfers/:id/send — отправить: списать со склада-источника, статус in_transit
router.post("/warehouse/transfers/:id/send", async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const companyId = req.scopedCompanyId!;
    const id = Number(req.params.id);

    const [transfer] = await db.select().from(warehouseTransfersTable)
      .where(and(eq(warehouseTransfersTable.id, id), eq(warehouseTransfersTable.companyId, companyId)));
    if (!transfer) {
      res.status(404).json({ error: "transfer not found" });
      return;
    }
    if (transfer.status !== "draft") {
      res.status(400).json({ error: `Отправить можно только черновик (текущий статус: ${transfer.status})` });
      return;
    }
    const items = await db.select().from(warehouseTransferItemsTable)
      .where(eq(warehouseTransferItemsTable.transferId, id));

    const updated = await db.transaction(async (tx) => {
      for (const item of items) {
        const [stock] = await tx.select().from(warehouseStockTable)
          .where(and(
            eq(warehouseStockTable.companyId, companyId),
            eq(warehouseStockTable.warehouseId, transfer.fromWarehouseId),
            eq(warehouseStockTable.itemId, item.itemId),
          ));
        const current = stock ? Number(stock.quantity) : 0;
        const sent = Number(item.quantitySent);
        if (sent > current) {
          throw new Error(`Недостаточно на складе-источнике для позиции ${item.itemId}`);
        }
        await tx.update(warehouseStockTable)
          .set({ quantity: String(current - sent) })
          .where(eq(warehouseStockTable.id, stock!.id));
      }
      const [t] = await tx.update(warehouseTransfersTable)
        .set({ status: "in_transit", sentBy: req.userId ?? null, sentAt: new Date() })
        .where(eq(warehouseTransfersTable.id, id))
        .returning();
      return t;
    });

    res.json(updated);
  } catch (error) {
    console.error("Error sending transfer:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Internal server error" });
  }
});

// POST /warehouse/transfers/:id/receive — принять: зачислить на склад-получатель, зафиксировать расхождения
router.post("/warehouse/transfers/:id/receive", async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const companyId = req.scopedCompanyId!;
    const id = Number(req.params.id);
    const body = req.body ?? {};
    const receivedInput: Array<{ itemId: number; quantityReceived: number | string }> =
      Array.isArray(body.items) ? body.items : [];

    const [transfer] = await db.select().from(warehouseTransfersTable)
      .where(and(eq(warehouseTransfersTable.id, id), eq(warehouseTransfersTable.companyId, companyId)));
    if (!transfer) {
      res.status(404).json({ error: "transfer not found" });
      return;
    }
    if (transfer.status !== "in_transit") {
      res.status(400).json({ error: `Принять можно только отправленное (текущий статус: ${transfer.status})` });
      return;
    }
    const items = await db.select().from(warehouseTransferItemsTable)
      .where(eq(warehouseTransferItemsTable.transferId, id));

    // сопоставить фактически принятое количество (по умолчанию = отправленному)
    const lines: TransferLine[] = items.map((it) => {
      const match = receivedInput.find((r) => Number(r.itemId) === it.itemId);
      return {
        itemId: it.itemId,
        quantitySent: it.quantitySent,
        quantityReceived: match ? String(match.quantityReceived) : it.quantitySent,
      };
    });
    const receipt = computeTransferReceipt(lines);

    const updated = await db.transaction(async (tx) => {
      for (const line of lines) {
        const receivedQty = Number(line.quantityReceived);
        if (receivedQty <= 0) continue;

        // цена перемещаемого материала — средняя со склада-источника
        const [srcStock] = await tx.select().from(warehouseStockTable)
          .where(and(
            eq(warehouseStockTable.companyId, companyId),
            eq(warehouseStockTable.warehouseId, transfer.fromWarehouseId),
            eq(warehouseStockTable.itemId, line.itemId),
          ));
        const movedPrice = srcStock ? Number(srcStock.avgPrice) : 0;

        const [destStock] = await tx.select().from(warehouseStockTable)
          .where(and(
            eq(warehouseStockTable.companyId, companyId),
            eq(warehouseStockTable.warehouseId, transfer.toWarehouseId),
            eq(warehouseStockTable.itemId, line.itemId),
          ));

        if (destStock) {
          const existingQty = Number(destStock.quantity);
          const existingAvg = Number(destStock.avgPrice);
          const totalQty = existingQty + receivedQty;
          const newAvg = totalQty > 0
            ? (existingQty * existingAvg + receivedQty * movedPrice) / totalQty
            : movedPrice;
          await tx.update(warehouseStockTable)
            .set({ quantity: String(totalQty), avgPrice: String(newAvg.toFixed(2)) })
            .where(eq(warehouseStockTable.id, destStock.id));
        } else {
          await tx.insert(warehouseStockTable).values({
            companyId,
            warehouseId: transfer.toWarehouseId,
            itemId: line.itemId,
            quantity: String(receivedQty),
            avgPrice: String(movedPrice.toFixed(2)),
          });
        }

        // зафиксировать фактически принятое в позиции перемещения
        await tx.update(warehouseTransferItemsTable)
          .set({ quantityReceived: String(receivedQty) })
          .where(and(
            eq(warehouseTransferItemsTable.transferId, id),
            eq(warehouseTransferItemsTable.itemId, line.itemId),
          ));
      }

      const [t] = await tx.update(warehouseTransfersTable)
        .set({ status: receipt.status, receivedBy: req.userId ?? null, receivedAt: new Date() })
        .where(eq(warehouseTransfersTable.id, id))
        .returning();
      return t;
    });

    res.json({ ...updated, discrepancies: receipt.discrepancies });
  } catch (error) {
    console.error("Error receiving transfer:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Internal server error" });
  }
});

export default router;
