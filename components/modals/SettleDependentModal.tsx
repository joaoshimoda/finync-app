"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  HandCoins,
  Landmark,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";

const competenceFormatter = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  year: "numeric",
});

const shortCompetenceFormatter = new Intl.DateTimeFormat("pt-BR", {
  month: "short",
  year: "numeric",
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

function formatCompetenceMonth(value: string) {
  return competenceFormatter.format(new Date(`${value}T12:00:00`));
}

function formatShortCompetenceMonth(value: string) {
  return shortCompetenceFormatter
    .format(new Date(`${value}T12:00:00`))
    .replace(" de ", "/");
}

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
  const { formatCurrency, currencySymbol } = useCurrencyFormatter();
  const settleDependent = useFinanceStore((state) => state.settleDependent);
  const dependentSettlements = useFinanceStore(
    (state) => state.dependentSettlements,
  );
  const settlementProgress =
    obligationTotal > 0
      ? Math.min((settledTotal / obligationTotal) * 100, 100)
      : 0;
  const halfOutstanding = Math.round((outstanding / 2) * 100) / 100;
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

  const pillFieldClassName =
    "h-10 rounded-full border-zinc-700 bg-transparent px-4 text-zinc-100 shadow-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 dark:bg-transparent";

  return (
    <DialogContent
      data-tour="dependent-settlement-modal"
      showCloseButton={false}
      onOpenAutoFocus={(event) => {
        event.preventDefault();
        window.requestAnimationFrame(() => {
          document.getElementById("dependent-settlement-amount")?.focus();
        });
      }}
      className="inset-x-0 bottom-0 left-0 top-auto flex max-h-[96dvh] w-full max-w-none translate-x-0 translate-y-0 overflow-hidden rounded-b-none rounded-t-xl border border-b-0 border-zinc-800 bg-zinc-950 p-0 text-zinc-50 shadow-2xl md:left-1/2 md:top-1/2 md:h-[560px] md:max-h-[90dvh] md:max-w-[920px] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-xl md:border-b"
    >
      <form
        className="grid min-h-0 w-full md:grid-cols-[44%_56%]"
        onSubmit={handleSubmit}
      >
        <aside className="relative flex min-h-[230px] flex-col overflow-hidden bg-teal-800 p-5 text-white md:min-h-0 md:p-8 [@media_(max-height:_700px)_and_(max-width:_767px)]:min-h-[202px] [@media_(max-height:_700px)_and_(max-width:_767px)]:p-4">
          <div className="pointer-events-none absolute inset-y-0 right-0 w-28 border-l border-white/10 bg-black/10 [transform:skewX(-10deg)_translateX(45%)]" />
          <div className="pointer-events-none absolute bottom-0 left-0 h-px w-full bg-white/10" />

          <button
            type="button"
            aria-label="Fechar"
            onClick={onClose}
            className="absolute right-5 top-5 z-20 flex size-10 items-center justify-center rounded-full text-white/75 transition-colors hover:bg-black/10 hover:text-white md:right-7 md:top-7"
          >
            <X className="size-5" />
          </button>

          <div className="relative z-10">
            <p className="text-[10px] font-bold uppercase text-white/65">
              Acerto de dependente
            </p>
            <DialogTitle className="mt-2 max-w-xs truncate text-2xl font-semibold leading-tight text-white md:mt-4 md:text-4xl [@media_(max-height:_700px)_and_(max-width:_767px)]:text-xl">
              {dependent.name}.
            </DialogTitle>
            <DialogDescription className="mt-2 max-w-[275px] text-xs leading-5 text-white/75 [@media_(max-height:_700px)_and_(max-width:_767px)]:hidden">
              Registre valores recebidos referentes a {formatCompetenceMonth(competenceMonth)}.
            </DialogDescription>
          </div>

          <section className="relative z-10 my-auto md:py-5">
            <div className="flex items-end justify-between gap-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white/15">
                <HandCoins className="size-5" />
              </span>
              <div className="text-right">
                <p className="text-[9px] font-semibold uppercase text-white/60">
                  Ainda falta receber
                </p>
                <strong className="mt-1 block text-2xl font-semibold text-white md:text-3xl">
                  {formatCurrency(outstanding)}
                </strong>
              </div>
            </div>

            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-black/20">
              <div
                className="h-full rounded-full bg-white/85 transition-[width] duration-300"
                style={{ width: `${settlementProgress}%` }}
              />
            </div>
            <div className="mt-2 flex justify-between text-[10px] font-medium text-white/65">
              <span>{settlementProgress.toFixed(0)}% recebido</span>
              <span>Total {formatCurrency(obligationTotal)}</span>
            </div>

            <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-white/15 pt-3">
              <div>
                <dt className="text-[9px] font-semibold uppercase text-white/55">
                  Vinculado
                </dt>
                <dd className="mt-1 truncate text-xs font-semibold text-white">
                  {formatCurrency(obligationTotal)}
                </dd>
              </div>
              <div>
                <dt className="text-[9px] font-semibold uppercase text-white/55">
                  Recebido
                </dt>
                <dd className="mt-1 truncate text-xs font-semibold text-white">
                  {formatCurrency(settledTotal)}
                </dd>
              </div>
              <div>
                <dt className="text-[9px] font-semibold uppercase text-white/55">
                  Competência
                </dt>
                <dd className="mt-1 truncate capitalize text-xs font-semibold text-white">
                  {formatShortCompetenceMonth(competenceMonth)}
                </dd>
              </div>
            </dl>
          </section>
        </aside>

        <section className="flex min-h-0 flex-col bg-zinc-950">
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 [scrollbar-width:thin] md:px-7 md:py-6">
            <fieldset disabled={isSubmitting} className="space-y-5">
              <div className="space-y-2">
                <Label
                  htmlFor="dependent-settlement-amount"
                  className="text-[10px] font-bold uppercase text-zinc-500"
                >
                  Valor recebido
                </Label>
                <div className="flex items-center border-b border-zinc-700">
                  <span className="shrink-0 text-xs font-semibold text-teal-400">
                    {currencySymbol}
                  </span>
                  <Input
                    id="dependent-settlement-amount"
                    type="number"
                    inputMode="decimal"
                    min="0.01"
                    max={outstanding}
                    step="0.01"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    className="h-11 appearance-none rounded-none border-0 bg-transparent px-2 text-xl font-semibold shadow-none focus-visible:ring-0 dark:bg-transparent [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    required
                  />
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {halfOutstanding > 0 ? (
                    <button
                      type="button"
                      onClick={() => setAmount(halfOutstanding.toFixed(2))}
                      className="h-8 rounded-full border border-zinc-700 px-3 text-xs font-medium text-zinc-300 transition-colors hover:border-teal-500/50 hover:text-teal-300"
                    >
                      50% do saldo
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setAmount(outstanding.toFixed(2))}
                    className="h-8 rounded-full border border-zinc-700 px-3 text-xs font-medium text-zinc-300 transition-colors hover:border-teal-500/50 hover:text-teal-300"
                  >
                    Quitar saldo total
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 border-t border-zinc-800 pt-5">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-[10px] font-bold uppercase text-zinc-500">
                    <Landmark className="size-3.5" />
                    Método
                  </Label>
                  <Select
                    value={method}
                    onValueChange={(value) =>
                      setMethod(value as DependentSettlementMethod)
                    }
                  >
                    <SelectTrigger className={pillFieldClassName}>
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
                  <Label
                    htmlFor="dependent-settlement-date"
                    className="flex items-center gap-2 text-[10px] font-bold uppercase text-zinc-500"
                  >
                    <CalendarDays className="size-3.5" />
                    Data
                  </Label>
                  <Input
                    id="dependent-settlement-date"
                    type="date"
                    value={settledAt}
                    onChange={(event) => setSettledAt(event.target.value)}
                    className={`${pillFieldClassName} [color-scheme:dark]`}
                    required
                  />
                </div>
              </div>

              <div className="border-t border-zinc-800 pt-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="flex items-center gap-2 text-xs font-semibold text-zinc-300">
                    <Clock3 className="size-3.5 text-zinc-500" />
                    Acertos recentes
                  </p>
                  <span className="text-[10px] text-zinc-600">
                    {settlementHistory.length || "Nenhum"}
                  </span>
                </div>

                {settlementHistory.length ? (
                  <div className="mt-3 space-y-2">
                    {settlementHistory.map((settlement) => (
                      <div
                        key={settlement.id}
                        className="flex items-center justify-between gap-3 border-b border-zinc-900 pb-2 text-xs last:border-0 last:pb-0"
                      >
                        <span className="flex min-w-0 items-center gap-2 text-zinc-500">
                          <CheckCircle2 className="size-3.5 shrink-0 text-teal-500" />
                          <span className="truncate">
                            {formatDateOnlyBR(
                              settlement.settledAt.slice(0, 10),
                            )}{" "}
                            · {methodLabels[settlement.method]}
                          </span>
                        </span>
                        <strong className="shrink-0 text-zinc-200">
                          {formatCurrency(settlement.amount)}
                        </strong>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-zinc-600">
                    Nenhum valor recebido nesta competência.
                  </p>
                )}
              </div>
            </fieldset>
          </div>

          <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-zinc-900 px-5 py-3 md:border-0 md:px-7 md:pb-6 md:pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={isSubmitting}
              className="h-10 flex-1 text-zinc-400 hover:text-white md:flex-none"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="h-10 flex-[1.35] rounded-full bg-teal-600 px-6 font-semibold text-white hover:bg-teal-700 md:flex-none"
              disabled={isSubmitting || outstanding <= 0}
            >
              <Check className="size-4" />
              {isSubmitting ? "Registrando..." : "Confirmar acerto"}
            </Button>
          </footer>
        </section>
      </form>
    </DialogContent>
  );
}
