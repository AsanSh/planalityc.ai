/**
 * DocumentsSection — reusable component for showing generated documents
 * (invoices, tax invoices, etc.) for an entity.
 *
 * Supports displaying tax_invoice ("Счёт-фактура") and invoice ("Счёт") documents
 * with human-readable labels and a download/view action.
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, Plus, Loader2, Eye } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-error";

/** Human-readable labels by docType */
const DOC_TYPE_LABEL: Record<string, string> = {
  tax_invoice: "Счёт-фактура",
  invoice: "Счёт",
  act: "Акт",
  reconciliation: "Акт сверки",
};

/** Map docType to badge colour class */
const DOC_TYPE_COLOR: Record<string, string> = {
  tax_invoice: "bg-amber-100 text-amber-700",
  invoice: "bg-blue-100 text-blue-700",
  act: "bg-green-100 text-green-700",
  reconciliation: "bg-slate-100 text-slate-700",
};

interface DocumentRow {
  id: number;
  name: string;
  docType?: string | null;
  docStatus?: string | null;
  payload?: string | null;
  fileUrl?: string | null;
  mimeType?: string | null;
  createdAt: string;
}

interface DocumentsSectionProps {
  /** API entity type used to query documents */
  entityType: string;
  entityId: number;
  companyId?: number;
  /** Show "Сформировать счёт-фактуру" button */
  showTaxInvoiceButton?: boolean;
  /** Data needed to generate a tax invoice */
  taxInvoiceParams?: {
    contractType: string;
    contractId: number;
    grossAmount?: number;
    currency?: string;
    buyerName?: string;
    contractNumber?: string;
  };
}

function viewPayload(doc: DocumentRow) {
  if (!doc.payload) return;
  try {
    const data = JSON.parse(doc.payload) as Record<string, unknown>;
    const parts = [
      `${doc.name}`,
      ``,
      `Продавец: ${String(data["sellerName"] ?? "—")}`,
      `Покупатель: ${String(data["buyerName"] ?? "—")}`,
      ``,
      `Наименование: ${String(data["serviceDescription"] ?? "—")}`,
      ``,
      `Сумма без НДС: ${formatMoney(data["netAmount"])} ${String(data["currency"] ?? "")}`,
      `НДС (${String(data["vatRate"] ?? 12)}%): ${formatMoney(data["vatAmount"])} ${String(data["currency"] ?? "")}`,
      `Итого с НДС: ${formatMoney(data["grossAmount"])} ${String(data["currency"] ?? "")}`,
      ``,
      data["contractNumber"] ? `Договор: ${String(data["contractNumber"])}` : null,
      `Дата: ${String(data["date"] ?? "")}`,
    ];
    const text = parts.filter((p): p is string => p !== null && p !== "").join("\n");
    alert(text);
  } catch {
    alert(doc.payload);
  }
}

function formatMoney(n: unknown): string {
  const v = parseFloat(String(n ?? 0));
  if (!Number.isFinite(v)) return "0";
  return new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v);
}

export function DocumentsSection({
  entityType,
  entityId,
  showTaxInvoiceButton = false,
  taxInvoiceParams,
}: DocumentsSectionProps) {
  const qc = useQueryClient();
  const [generating, setGenerating] = useState(false);

  const { data: docs = [], isLoading } = useQuery<DocumentRow[]>({
    queryKey: ["documents", entityType, entityId],
    queryFn: () =>
      api
        .get(`/documents?entityType=${entityType}&entityId=${entityId}`)
        .then((r) => r.data),
  });

  const taxInvoiceMut = useMutation({
    mutationFn: (params: Record<string, unknown>) =>
      api.post("/documents/tax-invoice", params).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documents", entityType, entityId] });
      toast.success("Счёт-фактура сформирована");
    },
    onError: (err: unknown) => {
      toast.error(getApiErrorMessage(err, "Не удалось сформировать счёт-фактуру"));
    },
  });

  const handleGenerateTaxInvoice = async () => {
    if (!taxInvoiceParams) return;
    const { contractType, contractId, grossAmount, currency, buyerName, contractNumber } =
      taxInvoiceParams;
    if (!grossAmount || grossAmount <= 0) {
      toast.error("Укажите сумму договора для формирования счёт-фактуры");
      return;
    }
    setGenerating(true);
    try {
      await taxInvoiceMut.mutateAsync({
        contractType,
        contractId,
        grossAmount,
        currency: currency ?? "KGS",
        buyerName: buyerName ?? undefined,
        contractNumber: contractNumber ?? undefined,
      });
    } finally {
      setGenerating(false);
    }
  };

  // Filter to only show generated docs (those with docType set)
  const generatedDocs = docs.filter((d) => d.docType);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-700">Документы</p>
        {showTaxInvoiceButton && taxInvoiceParams && (
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-amber-700 border-amber-200 hover:bg-amber-50"
            onClick={() => void handleGenerateTaxInvoice()}
            disabled={generating || taxInvoiceMut.isPending}
          >
            {generating || taxInvoiceMut.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Plus className="w-3.5 h-3.5" />
            )}
            Сформировать счёт-фактуру
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-slate-400 py-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          Загрузка...
        </div>
      ) : generatedDocs.length === 0 ? (
        <p className="text-xs text-slate-400 py-2">
          Нет сформированных документов.
          {showTaxInvoiceButton && " Нажмите «Сформировать счёт-фактуру» для создания."}
        </p>
      ) : (
        <ul className="space-y-2">
          {generatedDocs.map((doc) => {
            const typeLabel = doc.docType
              ? (DOC_TYPE_LABEL[doc.docType] ?? doc.docType)
              : "Документ";
            const colorClass = doc.docType
              ? (DOC_TYPE_COLOR[doc.docType] ?? "bg-slate-100 text-slate-700")
              : "bg-slate-100 text-slate-700";
            return (
              <li
                key={doc.id}
                className="flex items-center gap-2 rounded-lg border border-slate-100 bg-white px-3 py-2"
              >
                <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">
                    {doc.name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${colorClass}`}
                    >
                      {typeLabel}
                    </span>
                    {doc.docStatus && (
                      <span className="text-[10px] text-slate-400">
                        {doc.docStatus === "draft" ? "Черновик" : "Финальный"}
                      </span>
                    )}
                    <span className="text-[10px] text-slate-400">
                      {new Date(doc.createdAt).toLocaleDateString("ru-RU")}
                    </span>
                  </div>
                </div>
                {doc.payload && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="gap-1 text-slate-500 hover:text-slate-700 flex-shrink-0"
                    onClick={() => viewPayload(doc)}
                    title="Просмотреть"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
