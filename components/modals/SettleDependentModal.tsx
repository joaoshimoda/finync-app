"use client";

import { FormEvent, useMemo, useState } from "react";
import { CalendarDays, Check, Landmark } from "lucide-react";
import { toast } from "sonner";

import {
  AmountInput,
  Field,
  HistoryList,
  ModalBody,
  ModalFooter,
  ModalShell,
  ModalStage,
  PrimaryButton,
  QuickAmounts,
  SecondaryButton,
  StageAmount,
  StageFacts,
  StageMeter,
  fieldClassName,
  selectTriggerClassName,
} from "@/components/modals/ModalKit";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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

  const triggerClassName = selectTriggerClassName("teal");
  const inputClassName = fieldClassName("teal");

  return (
    <ModalShell
      tour="dependent-settlement-modal"
      focusId="dependent-settlement-amount"
      size="md"
      onSubmit={handleSubmit}
      stage={
        <ModalStage
          accent="teal"
          context={`Acerto de ${formatCompetenceMonth(competenceMonth)}`}
          title={dependent.name}
          description="Registre o que essa pessoa já te devolveu dos gastos feitos no seu nome."
          onClose={onClose}
          compact={
            <StageAmount label="Falta receber" value={formatCurrency(outstanding)} />
          }
        >
          <div>
            <p className="text-[13px] text-white/60">Ainda falta receber</p>
            <p className="mt-1 text-[40px] font-semibold leading-none tabular-nums tracking-[-0.03em] text-white">
              {formatCurrency(outstanding)}
            </p>
            <div className="mt-6">
              <StageMeter value={settlementProgress} tone="bg-teal-300" />
              <div className="mt-2 flex justify-between text-[13px] text-white/60">
                <span>{settlementProgress.toFixed(0)}% recebido</span>
                <span>de {formatCurrency(obligationTotal)}</span>
              </div>
            </div>
            <div className="mt-6">
              <StageFacts
                items={[
                  { label: "Gastos no nome", value: formatCurrency(obligationTotal) },
                  { label: "Recebido", value: formatCurrency(settledTotal) },
                  {
                    label: "Mês",
                    value: (
                      <span className="capitalize">
                        {formatShortCompetenceMonth(competenceMonth)}
                      </span>
                    ),
                  },
                ]}
              />
            </div>
          </div>
        </ModalStage>
      }
    >
      <ModalBody>
        <fieldset disabled={isSubmitting} className="min-w-0 space-y-6">
          <div>
            <AmountInput
              id="dependent-settlement-amount"
              label="Valor recebido"
              accent="teal"
              currencySymbol={currencySymbol}
              type="number"
              inputMode="decimal"
              min="0.01"
              max={outstanding}
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              required
            />
            <QuickAmounts
              items={[
                {
                  label: "Metade do saldo",
                  hidden: halfOutstanding <= 0,
                  onSelect: () => setAmount(halfOutstanding.toFixed(2)),
                },
                {
                  label: "Quitar saldo total",
                  onSelect: () => setAmount(outstanding.toFixed(2)),
                },
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Recebido via" htmlFor="dependent-settlement-method" icon={Landmark}>
              <Select
                value={method}
                onValueChange={(value) => setMethod(value as DependentSettlementMethod)}
              >
                <SelectTrigger id="dependent-settlement-method" className={triggerClassName}>
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
            </Field>

            <Field label="Data" htmlFor="dependent-settlement-date" icon={CalendarDays}>
              <Input
                id="dependent-settlement-date"
                type="date"
                value={settledAt}
                onChange={(event) => setSettledAt(event.target.value)}
                className={inputClassName}
                required
              />
            </Field>
          </div>

          <HistoryList
            title="Recebidos neste mês"
            emptyText="Nenhum valor recebido neste mês ainda."
            items={settlementHistory.map((settlement) => ({
              id: settlement.id,
              label: `${formatDateOnlyBR(settlement.settledAt.slice(0, 10))}, ${methodLabels[settlement.method]}`,
              value: formatCurrency(settlement.amount),
            }))}
          />
        </fieldset>
      </ModalBody>

      <ModalFooter>
        <SecondaryButton onClick={onClose} disabled={isSubmitting}>
          Cancelar
        </SecondaryButton>
        <PrimaryButton
          type="submit"
          accent="teal"
          icon={Check}
          loading={isSubmitting}
          loadingLabel="Registrando..."
          disabled={isSubmitting || outstanding <= 0}
        >
          Confirmar acerto
        </PrimaryButton>
      </ModalFooter>
    </ModalShell>
  );
}
