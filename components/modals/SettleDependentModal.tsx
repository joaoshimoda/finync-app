"use client";

import { FormEvent, useMemo, useState } from "react";
import { CheckCircle2, Clock3, HandCoins } from "lucide-react";
import { toast } from "sonner";

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
import { formatDateOnlyBR, getLocalTodayDateOnly } from "@/lib/dateUtils";
import {
  useFinanceStore,
  type Dependent,
  type DependentSettlementMethod,
} from "@/store/useFinanceStore";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const methodLabels: Record<DependentSettlementMethod, string> = {
  PIX: "Pix",
  TRANSFER: "Transferência",
  CASH: "Dinheiro",
  OTHER: "Outro",
};

type SettleDependentModalProps = {
  dependent: Dependent | null;
  competenceMonth: string;
  obligationTotal: number;
  settledTotal: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function SettleDependentModal({
  dependent,
  competenceMonth,
  obligationTotal,
  settledTotal,
  open,
  onOpenChange,
}: SettleDependentModalProps) {
  const outstanding = Math.max(obligationTotal - settledTotal, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && dependent ? (
        <DependentSettlementForm
          key={`${dependent.id}:${competenceMonth}:${settledTotal}`}
          dependent={dependent}
          competenceMonth={competenceMonth}
          obligationTotal={obligationTotal}
          settledTotal={settledTotal}
          outstanding={outstanding}
          onClose={() => onOpenChange(false)}
        />
      ) : null}
    </Dialog>
  );
}

function DependentSettlementForm({
  dependent,
  competenceMonth,
  obligationTotal,
  settledTotal,
  outstanding,
  onClose,
}: {
  dependent: Dependent;
  competenceMonth: string;
  obligationTotal: number;
  settledTotal: number;
  outstanding: number;
  onClose: () => void;
}) {
  const settleDependent = useFinanceStore((state) => state.settleDependent);
  const dependentSettlements = useFinanceStore(
    (state) => state.dependentSettlements,
  );
  const [amount, setAmount] = useState(outstanding.toFixed(2));
  const [settledAt, setSettledAt] = useState(getLocalTodayDateOnly());
  const [method, setMethod] = useState<DependentSettlementMethod>("PIX");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const settlementHistory = useMemo(
    () =>
      dependentSettlements
        .filter(
          (settlement) =>
            settlement.dependentId === dependent.id &&
            settlement.competenceMonth === competenceMonth &&
            settlement.status === "confirmed",
        )
        .slice(0, 3),
    [competenceMonth, dependent.id, dependentSettlements],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    const parsedAmount = Number(amount.replace(",", "."));

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast.error("Informe um valor válido para o acerto.");
      return;
    }

    if (parsedAmount > outstanding) {
      toast.error("O valor não pode exceder o total a receber.");
      return;
    }

    setIsSubmitting(true);

    try {
      await settleDependent({
        dependentId: dependent.id,
        competenceMonth,
        amount: parsedAmount,
        settledAt: new Date(`${settledAt}T12:00:00`).toISOString(),
        method,
      });
      toast.success(
        parsedAmount >= outstanding
          ? "Acerto concluído!"
          : "Acerto parcial registrado!",
      );
      onClose();
    } catch (error) {
      console.error("Erro ao registrar acerto:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível registrar o acerto.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <DialogContent className="border-zinc-800 bg-zinc-950 text-zinc-50 sm:max-w-lg">
      <DialogHeader>
        <div className="mb-1 flex size-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
          <HandCoins className="size-5" />
        </div>
        <DialogTitle>Registrar acerto</DialogTitle>
        <DialogDescription>
          Pagamento recebido de {dependent.name} nesta competência.
        </DialogDescription>
      </DialogHeader>

      <div className="grid grid-cols-3 gap-2 border-y border-zinc-800 py-4">
        <div>
          <p className="text-[11px] text-zinc-500">Total vinculado</p>
          <strong className="mt-1 block text-sm text-zinc-200">
            {currencyFormatter.format(obligationTotal)}
          </strong>
        </div>
        <div>
          <p className="text-[11px] text-zinc-500">Recebido</p>
          <strong className="mt-1 block text-sm text-emerald-300">
            {currencyFormatter.format(settledTotal)}
          </strong>
        </div>
        <div className="text-right">
          <p className="text-[11px] text-zinc-500">A receber</p>
          <strong className="mt-1 block text-sm text-amber-300">
            {currencyFormatter.format(outstanding)}
          </strong>
        </div>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="dependent-settlement-amount">Valor recebido</Label>
          <Input
            id="dependent-settlement-amount"
            type="number"
            inputMode="decimal"
            min="0.01"
            max={outstanding}
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className="h-12 border-zinc-700 bg-zinc-900 text-xl font-semibold"
            disabled={isSubmitting}
            required
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Método</Label>
            <Select
              value={method}
              onValueChange={(value) =>
                setMethod(value as DependentSettlementMethod)
              }
              disabled={isSubmitting}
            >
              <SelectTrigger className="h-10 border-zinc-700 bg-zinc-900">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(methodLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dependent-settlement-date">Data do acerto</Label>
            <Input
              id="dependent-settlement-date"
              type="date"
              value={settledAt}
              onChange={(event) => setSettledAt(event.target.value)}
              className="h-10 border-zinc-700 bg-zinc-900"
              disabled={isSubmitting}
              required
            />
          </div>
        </div>

        {settlementHistory.length ? (
          <div className="space-y-2 border-t border-zinc-800 pt-4">
            <div className="flex items-center gap-2 text-xs font-medium text-zinc-400">
              <Clock3 className="size-3.5" />
              Acertos recentes
            </div>
            {settlementHistory.map((settlement) => (
              <div
                key={settlement.id}
                className="flex items-center justify-between gap-3 text-xs"
              >
                <span className="flex items-center gap-2 text-zinc-500">
                  <CheckCircle2 className="size-3.5 text-emerald-500" />
                  {formatDateOnlyBR(settlement.settledAt.slice(0, 10))} ·{" "}
                  {methodLabels[settlement.method]}
                </span>
                <strong className="text-zinc-200">
                  {currencyFormatter.format(settlement.amount)}
                </strong>
              </div>
            ))}
          </div>
        ) : null}

        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            className="bg-emerald-600 text-white hover:bg-emerald-700"
            disabled={isSubmitting || outstanding <= 0}
          >
            {isSubmitting ? "Registrando..." : "Confirmar acerto"}
          </Button>
        </div>
      </form>
    </DialogContent>
  );
}
