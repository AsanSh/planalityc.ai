/**
 * ContractTerminationDialog
 *
 * A 4-step stepper for terminating a sales or lease contract:
 *   1. Инициация   (POST  /contract-terminations)
 *   2. Согласование (PATCH /contract-terminations/:id/approve)
 *   3. Финрасчёт   (POST  /contract-terminations/:id/settle)
 *   4. Закрытие    (POST  /contract-terminations/:id/close)
 *
 * After the final step the dialog calls `onDone` so parent can invalidate queries.
 */
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-error";

// ─── Types ──────────────────────────────────────────────────────────────────

type ContractType = "sales" | "lease";

interface Termination {
  id: number;
  companyId: number;
  contractType: string;
  contractId: number;
  terminationDate: string | null;
  reason: string | null;
  basis: string | null;
  status: string; // initiated | approved | settled | closed
  financials: Record<string, unknown>;
  note: string | null;
  createdBy: number | null;
  approvedBy: number | null;
  createdAt: string;
  updatedAt: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  /** Called after the termination is fully closed (status=closed) */
  onDone: () => void;
  contractType: ContractType;
  contractId: number;
  contractLabel?: string; // e.g. contract number for display
}

// ─── Step config ────────────────────────────────────────────────────────────

const STEPS = [
  { key: "initiated", label: "Инициация", index: 0 },
  { key: "approved", label: "Согласование", index: 1 },
  { key: "settled", label: "Финрасчёт", index: 2 },
  { key: "closed", label: "Закрытие", index: 3 },
] as const;

function statusToStepIndex(status: string): number {
  switch (status) {
    case "initiated":
      return 0;
    case "approved":
      return 1;
    case "settled":
      return 2;
    case "closed":
      return 3;
    default:
      return -1;
  }
}

// ─── Stepper indicator ──────────────────────────────────────────────────────

function StepIndicator({ currentStatus }: { currentStatus: string }) {
  const currentIdx = statusToStepIndex(currentStatus);
  return (
    <ol className="flex items-center gap-0 mb-6 w-full">
      {STEPS.map((step, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        return (
          <li key={step.key} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <span
                className={[
                  "w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-colors",
                  done
                    ? "bg-emerald-500 border-emerald-500 text-white"
                    : active
                      ? "bg-blue-600 border-blue-600 text-white"
                      : "bg-white border-gray-300 text-gray-400",
                ].join(" ")}
              >
                {done ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
              </span>
              <span
                className={[
                  "text-[10px] mt-1 font-medium",
                  done
                    ? "text-emerald-600"
                    : active
                      ? "text-blue-700"
                      : "text-gray-400",
                ].join(" ")}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
            )}
          </li>
        );
      })}
    </ol>
  );
}

// ─── Step panels ────────────────────────────────────────────────────────────

function StepInitiate({
  contractType,
  contractId,
  onCreated,
}: {
  contractType: ContractType;
  contractId: number;
  onCreated: (term: Termination) => void;
}) {
  const [reason, setReason] = useState("");
  const [basis, setBasis] = useState<"agreement" | "unilateral">("agreement");
  const [terminationDate, setTerminationDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!terminationDate) {
      toast.error("Укажите дату расторжения");
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post<Termination>("/contract-terminations", {
        contractType,
        contractId,
        terminationDate,
        reason: reason.trim() || undefined,
        basis,
      });
      toast.success("Расторжение инициировано");
      onCreated(data);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Не удалось инициировать расторжение"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="termination-date">Дата расторжения</Label>
        <Input
          id="termination-date"
          type="date"
          className="mt-1"
          value={terminationDate}
          onChange={(e) => setTerminationDate(e.target.value)}
        />
        <p className="text-[11px] text-muted-foreground mt-1">
          С этой даты начисления по договору прекратятся, будущие — отменятся.
        </p>
      </div>
      <div>
        <Label htmlFor="basis">Основание</Label>
        <Select value={basis} onValueChange={(v) => setBasis(v as "agreement" | "unilateral")}>
          <SelectTrigger id="basis" className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="agreement">По соглашению сторон</SelectItem>
            <SelectItem value="unilateral">В одностороннем порядке</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="reason">Причина расторжения</Label>
        <Textarea
          id="reason"
          className="mt-1"
          rows={3}
          placeholder="Опишите причину расторжения договора..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </div>
      <Button className="w-full" onClick={handleSubmit} disabled={loading}>
        {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        Инициировать расторжение
      </Button>
    </div>
  );
}

function StepApprove({
  termination,
  onApproved,
}: {
  termination: Termination;
  onApproved: (term: Termination) => void;
}) {
  const [loading, setLoading] = useState(false);

  const handleApprove = async () => {
    setLoading(true);
    try {
      const { data } = await api.patch<Termination>(
        `/contract-terminations/${termination.id}/approve`,
        {},
      );
      toast.success("Расторжение согласовано");
      onApproved(data);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Не удалось согласовать"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground bg-muted rounded-lg p-3 space-y-1">
        <div>
          <span className="font-medium">Основание: </span>
          {termination.basis === "agreement" ? "По соглашению сторон" : "В одностороннем порядке"}
        </div>
        {termination.reason && (
          <div>
            <span className="font-medium">Причина: </span>
            {termination.reason}
          </div>
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        Подтвердите согласование расторжения договора. После согласования можно будет перейти к
        финансовому расчёту.
      </p>
      <Button className="w-full" onClick={handleApprove} disabled={loading}>
        {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        Согласовать расторжение
      </Button>
    </div>
  );
}

interface HeldDeposit {
  id: number;
  amount: string;
  currency: string;
  status: string;
}

interface OpenAccrual {
  id: number;
  period: string;
  dueDate: string;
  amount: string;
  paidAmount: string;
  balance: string;
  status: string;
}

function StepSettle({
  termination,
  onSettled,
}: {
  termination: Termination;
  onSettled: (term: Termination) => void;
}) {
  const isLease = termination.contractType === "lease";
  const [loading, setLoading] = useState(false);
  const [financials, setFinancials] = useState({
    paid: "",
    debt: "",
    penalty: "",
    refund: "",
  });
  const [note, setNote] = useState(termination.note ?? "");

  // Deposit split (lease only)
  const [applyAmount, setApplyAmount] = useState("");
  const [applyAccrualId, setApplyAccrualId] = useState<string>("auto");
  const [returnAmount, setReturnAmount] = useState("");
  const [returnDate, setReturnDate] = useState(
    termination.terminationDate ?? new Date().toISOString().split("T")[0],
  );

  const { data: deposits } = useQuery<HeldDeposit[]>({
    queryKey: ["rental-deposits", termination.contractId, "held"],
    queryFn: () =>
      api
        .get<HeldDeposit[]>("/rental/deposits", {
          params: { leaseContractId: String(termination.contractId), status: "held" },
        })
        .then((r) => r.data),
    enabled: isLease,
  });
  const deposit = deposits?.[0] ?? null;

  const { data: accruals } = useQuery<OpenAccrual[]>({
    queryKey: ["rental-accruals", termination.contractId],
    queryFn: () =>
      api
        .get<OpenAccrual[]>("/rental/accruals", {
          params: { leaseContractId: String(termination.contractId) },
        })
        .then((r) => r.data),
    enabled: isLease && !!deposit,
  });
  const openAccruals = (accruals ?? []).filter((a) => {
    if (a.status === "cancelled" || a.status === "paid") return false;
    const open = parseFloat(a.amount || "0") - parseFloat(a.paidAmount || "0");
    return open > 0.01;
  });

  const depositTotal = deposit ? parseFloat(deposit.amount || "0") : 0;
  const applyNum = parseFloat(applyAmount) || 0;
  const returnNum = parseFloat(returnAmount) || 0;
  const depositOverspent = depositTotal > 0 && applyNum + returnNum > depositTotal + 0.01;

  const fillAll = (target: "apply" | "return") => {
    if (target === "apply") {
      setApplyAmount(String(depositTotal));
      setReturnAmount("");
    } else {
      setReturnAmount(String(depositTotal));
      setApplyAmount("");
    }
  };

  const handleSettle = async () => {
    if (depositOverspent) {
      toast.error("Зачёт + возврат превышают сумму депозита");
      return;
    }
    setLoading(true);
    try {
      const body: Record<string, unknown> = {};
      if (financials.paid !== "") body.paid = parseFloat(financials.paid) || 0;
      if (financials.debt !== "") body.debt = parseFloat(financials.debt) || 0;
      if (financials.penalty !== "") body.penalty = parseFloat(financials.penalty) || 0;
      if (financials.refund !== "") body.refund = parseFloat(financials.refund) || 0;
      if (note) body.note = note;

      if (isLease && deposit && (applyNum > 0 || returnNum > 0)) {
        body.depositActions = {
          ...(applyNum > 0
            ? {
                apply: {
                  amount: applyNum,
                  startAccrualId: applyAccrualId === "auto" ? null : parseInt(applyAccrualId, 10),
                },
              }
            : {}),
          ...(returnNum > 0 ? { return: { amount: returnNum, date: returnDate } } : {}),
        };
      }

      const { data } = await api.post<Termination>(
        `/contract-terminations/${termination.id}/settle`,
        body,
      );
      toast.success("Финансовый расчёт зафиксирован");
      onSettled(data);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Не удалось зафиксировать расчёт"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Укажите финансовые параметры расторжения (все поля необязательны).
      </p>
      <div className="grid grid-cols-2 gap-3">
        {(
          [
            { key: "paid", label: "Оплачено" },
            { key: "debt", label: "Долг" },
            { key: "penalty", label: "Штраф / неустойка" },
            { key: "refund", label: "Возврат покупателю" },
          ] as const
        ).map(({ key, label }) => (
          <div key={key}>
            <Label htmlFor={`fin-${key}`} className="text-xs">
              {label}
            </Label>
            <Input
              id={`fin-${key}`}
              type="number"
              min="0"
              step="0.01"
              className="mt-1"
              placeholder="0.00"
              value={financials[key]}
              onChange={(e) => setFinancials((f) => ({ ...f, [key]: e.target.value }))}
            />
          </div>
        ))}
      </div>

      {/* Deposit handling — lease only */}
      {isLease && deposit && (
        <div className="rounded-lg border border-am-brand/30 bg-am-brand/5 p-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Депозит</span>
            <span className="text-sm font-semibold">
              {depositTotal.toLocaleString("ru-RU")} {deposit.currency}
            </span>
          </div>

          {/* Apply toward rent */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="dep-apply" className="text-xs">
                Зачесть в счёт аренды
              </Label>
              <button
                type="button"
                className="text-[11px] text-am-brand hover:underline"
                onClick={() => fillAll("apply")}
              >
                весь депозит
              </button>
            </div>
            <Input
              id="dep-apply"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={applyAmount}
              onChange={(e) => setApplyAmount(e.target.value)}
            />
            {applyNum > 0 && (
              <Select value={applyAccrualId} onValueChange={setApplyAccrualId}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Автоматически — с самого раннего долга</SelectItem>
                  {openAccruals.map((a) => (
                    <SelectItem key={a.id} value={String(a.id)}>
                      {a.period} · остаток{" "}
                      {(parseFloat(a.amount) - parseFloat(a.paidAmount)).toLocaleString("ru-RU")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Return to tenant */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="dep-return" className="text-xs">
                Вернуть арендатору
              </Label>
              <button
                type="button"
                className="text-[11px] text-am-brand hover:underline"
                onClick={() => fillAll("return")}
              >
                весь депозит
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input
                id="dep-return"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={returnAmount}
                onChange={(e) => setReturnAmount(e.target.value)}
              />
              <Input
                type="date"
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
              />
            </div>
          </div>

          {depositOverspent && (
            <p className="text-xs text-rose-600">
              Зачёт + возврат ({(applyNum + returnNum).toLocaleString("ru-RU")}) превышают депозит.
            </p>
          )}
          {!depositOverspent && applyNum + returnNum > 0 && applyNum + returnNum < depositTotal - 0.01 && (
            <p className="text-xs text-muted-foreground">
              Остаток депозита{" "}
              {(depositTotal - applyNum - returnNum).toLocaleString("ru-RU")} останется удержанным.
            </p>
          )}
        </div>
      )}

      <div>
        <Label htmlFor="settle-note">Примечание</Label>
        <Textarea
          id="settle-note"
          rows={2}
          className="mt-1"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Дополнительные комментарии к финрасчёту..."
        />
      </div>
      <Button className="w-full" onClick={handleSettle} disabled={loading || depositOverspent}>
        {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        Зафиксировать расчёт
      </Button>
    </div>
  );
}

function StepClose({
  termination,
  contractType,
  onClosed,
}: {
  termination: Termination;
  contractType: ContractType;
  onClosed: (term: Termination) => void;
}) {
  const [loading, setLoading] = useState(false);
  const fin = (termination.financials ?? {}) as Record<string, number>;

  const handleClose = async () => {
    setLoading(true);
    try {
      const { data } = await api.post<{ termination: Termination }>(
        `/contract-terminations/${termination.id}/close`,
        {},
      );
      toast.success("Договор расторгнут. Объект возвращён в пул.");
      onClosed(data.termination);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Не удалось закрыть расторжение"));
    } finally {
      setLoading(false);
    }
  };

  const finRows = [
    { key: "paid", label: "Оплачено" },
    { key: "debt", label: "Долг" },
    { key: "penalty", label: "Штраф" },
    { key: "depositApplied", label: "Депозит в счёт аренды" },
    { key: "depositReturn", label: "Возврат депозита" },
    { key: "refund", label: "Возврат" },
  ].filter(({ key }) => fin[key] != null && fin[key] !== 0);

  return (
    <div className="space-y-4">
      {finRows.length > 0 && (
        <div className="bg-muted rounded-lg p-3 text-sm space-y-1">
          <p className="font-medium text-xs text-muted-foreground uppercase tracking-wide mb-2">
            Итоги финрасчёта
          </p>
          {finRows.map(({ key, label }) => (
            <div key={key} className="flex justify-between">
              <span className="text-muted-foreground">{label}</span>
              <span className="font-medium">
                {Number(fin[key]).toLocaleString("ru-RU")}
              </span>
            </div>
          ))}
        </div>
      )}
      <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
        <p className="font-medium">Внимание!</p>
        <p className="mt-1 text-xs">
          Это действие{" "}
          <strong>
            {contractType === "sales" ? "расторгнет договор и вернёт квартиру в пул свободных" : "расторгнет договор и освободит объект аренды"}
          </strong>
          . Операция необратима.
        </p>
      </div>
      <Button variant="destructive" className="w-full" onClick={handleClose} disabled={loading}>
        {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        Подтвердить закрытие расторжения
      </Button>
    </div>
  );
}

function ClosedState({ contractType }: { contractType: ContractType }) {
  return (
    <div className="text-center py-6 space-y-2">
      <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
      <p className="font-semibold text-gray-800">Расторжение завершено</p>
      <p className="text-sm text-muted-foreground">
        {contractType === "sales"
          ? "Договор расторгнут, квартира возвращена в пул свободных."
          : "Договор расторгнут, объект освобождён."}
      </p>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export function ContractTerminationDialog({
  open,
  onClose,
  onDone,
  contractType,
  contractId,
  contractLabel,
}: Props) {
  const [termination, setTermination] = useState<Termination | null>(null);
  const queryClient = useQueryClient();

  // Load existing termination if one already exists
  const { data: existingList, isLoading: loadingExisting } = useQuery<Termination[]>({
    queryKey: ["contract-terminations", contractType, contractId],
    queryFn: () =>
      api
        .get<Termination[]>("/contract-terminations", {
          params: {
            contractType,
            contractId: String(contractId),
          },
        })
        .then((r) => r.data),
    enabled: open,
  });

  // Pick the latest (most advanced) termination record
  useEffect(() => {
    if (!existingList) return;
    if (existingList.length === 0) {
      setTermination(null);
      return;
    }
    // Prefer the one furthest in the lifecycle
    const order = ["closed", "settled", "approved", "initiated"];
    const sorted = [...existingList].sort(
      (a, b) => order.indexOf(a.status) - order.indexOf(b.status),
    );
    setTermination(sorted[0] ?? null);
  }, [existingList]);

  const handleCreated = (term: Termination) => {
    setTermination(term);
    queryClient.invalidateQueries({ queryKey: ["contract-terminations", contractType, contractId] });
  };

  const handleApproved = (term: Termination) => {
    setTermination(term);
    queryClient.invalidateQueries({ queryKey: ["contract-terminations", contractType, contractId] });
  };

  const handleSettled = (term: Termination) => {
    setTermination(term);
    queryClient.invalidateQueries({ queryKey: ["contract-terminations", contractType, contractId] });
  };

  const handleClosed = (term: Termination) => {
    setTermination(term);
    queryClient.invalidateQueries({ queryKey: ["contract-terminations", contractType, contractId] });
    onDone();
  };

  const currentStatus = termination?.status ?? "not_started";
  const stepIndex = termination ? statusToStepIndex(termination.status) : -1;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Расторжение договора
            {contractLabel && (
              <span className="ml-2 text-am-brand font-mono">{contractLabel}</span>
            )}
          </DialogTitle>
          <DialogDescription>
            {contractType === "sales"
              ? "Управляемое расторжение договора продажи"
              : "Управляемое расторжение договора аренды"}
          </DialogDescription>
        </DialogHeader>

        {loadingExisting ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {termination && (
              <StepIndicator currentStatus={currentStatus} />
            )}

            {/* Step 0: Initiate */}
            {!termination && (
              <StepInitiate
                contractType={contractType}
                contractId={contractId}
                onCreated={handleCreated}
              />
            )}

            {/* Step 1: Approve */}
            {termination && stepIndex === 0 && (
              <StepApprove termination={termination} onApproved={handleApproved} />
            )}

            {/* Step 2: Settle */}
            {termination && stepIndex === 1 && (
              <StepSettle termination={termination} onSettled={handleSettled} />
            )}

            {/* Step 3: Close */}
            {termination && stepIndex === 2 && (
              <StepClose
                termination={termination}
                contractType={contractType}
                onClosed={handleClosed}
              />
            )}

            {/* Closed state */}
            {termination && stepIndex === 3 && (
              <ClosedState contractType={contractType} />
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
