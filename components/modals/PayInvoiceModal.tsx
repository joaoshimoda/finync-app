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
  getInvoiceOutstanding,
  getPostedInvoiceOutstanding,
  getSuggestedInvoicePayment,
} from "@/lib/invoicePayments";
import {
  useFinanceStore,
  type CardInvoice,
  type InvoicePaymentMethod,
} from "@/store/useFinanceStore";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";

const paymentMethodLabels: Record<InvoicePaymentMethod, string> = {
  PIX: "Pix",
  DEBIT: "Débito",
  TRANSFER: "Transferência",
  CASH: "Dinheiro",
  OTHER: "Outro",
};

type PayInvoiceModalProps = {
  invoice: CardInvoice | null;
  cardName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function PayInvoiceModal({
  invoice,
  cardName,
  open,
  onOpenChange,
}: PayInvoiceModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && invoice ? (
        <InvoicePaymentForm
          key={`${invoice.id}:${invoice.paidAmount}`}
          invoice={invoice}
          cardName={cardName}
          onClose={() => onOpenChange(false)}
        />
      ) : null}
    </Dialog>
  );
}

function InvoicePaymentForm({
  invoice,
  cardName,
  onClose,
}: {
  invoice: CardInvoice;
  cardName?: string;
  onClose: () => void;
}) {
  const { formatCurrency, currencySymbol } = useCurrencyFormatter();
  const payCardInvoice = useFinanceStore((state) => state.payCardInvoice);
  const invoicePayments = useFinanceStore((state) => state.invoicePayments);
  const outstanding = getInvoiceOutstanding(invoice);
  const postedOutstanding = getPostedInvoiceOutstanding(invoice);
  const suggestedPayment = getSuggestedInvoicePayment(invoice);
  const paymentProgress =
    invoice.totalAmount > 0
      ? Math.min((invoice.paidAmount / invoice.totalAmount) * 100, 100)
      : 0;
  const [amount, setAmount] = useState(suggestedPayment.toFixed(2));
  const [paidAt, setPaidAt] = useState(getLocalTodayDateOnly());
  const [method, setMethod] = useState<InvoicePaymentMethod>("PIX");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const paymentHistory = useMemo(
    () =>
      invoicePayments
        .filter(
          (payment) =>
            payment.invoiceId === invoice.id && payment.status === "confirmed",
        )
        .slice(0, 3),
    [invoice.id, invoicePayments],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    const parsedAmount = Number(amount.replace(",", "."));

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast.error("Informe um valor válido para o pagamento.");
      return;
    }

    if (parsedAmount > outstanding) {
      toast.error("O valor não pode exceder o saldo da fatura.");
      return;
    }

    setIsSubmitting(true);

    try {
      await payCardInvoice(invoice.id, {
        amount: parsedAmount,
        method,
        paidAt: new Date(`${paidAt}T12:00:00`).toISOString(),
      });
      toast.success(
        parsedAmount >= outstanding
          ? "Fatura liquidada!"
          : "Pagamento parcial registrado!",
      );
      onClose();
    } catch (error) {
      console.error("Erro ao registrar pagamento da fatura:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível registrar o pagamento.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const triggerClassName = selectTriggerClassName("emerald");
  const inputClassName = fieldClassName("emerald");

  return (
    <ModalShell
      tour="invoice-payment-modal"
      focusId="invoice-payment-amount"
      size="md"
      onSubmit={handleSubmit}
      stage={
        <ModalStage
          accent="emerald"
          context={cardName || "Cartão de crédito"}
          title="Pagar fatura"
          description={`Vencimento em ${formatDateOnlyBR(invoice.dueDate)}. Pagamentos parciais também ficam registrados.`}
          onClose={onClose}
          compact={
            <StageAmount label="Falta pagar" value={formatCurrency(outstanding)} />
          }
        >
          <div>
            <p className="text-[13px] text-white/60">Falta pagar</p>
            <p className="mt-1 text-[40px] font-semibold leading-none tabular-nums tracking-[-0.03em] text-white">
              {formatCurrency(outstanding)}
            </p>
            <div className="mt-6">
              <StageMeter value={paymentProgress} tone="bg-emerald-300" />
              <div className="mt-2 flex justify-between text-[13px] text-white/60">
                <span>{paymentProgress.toFixed(0)}% pago</span>
                <span>de {formatCurrency(invoice.totalAmount)}</span>
              </div>
            </div>
            <div className="mt-6">
              <StageFacts
                items={[
                  { label: "Lançado", value: formatCurrency(invoice.postedAmount) },
                  { label: "Já pago", value: formatCurrency(invoice.paidAmount) },
                  { label: "Vencimento", value: formatDateOnlyBR(invoice.dueDate) },
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
              id="invoice-payment-amount"
              label="Valor do pagamento"
              accent="emerald"
              currencySymbol={currencySymbol}
              aside={
                postedOutstanding < outstanding
                  ? `Lançado até hoje: ${formatCurrency(postedOutstanding)}`
                  : undefined
              }
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
                  label: "Pagar o lançado",
                  hidden: postedOutstanding <= 0,
                  onSelect: () => setAmount(postedOutstanding.toFixed(2)),
                },
                {
                  label: "Quitar saldo total",
                  onSelect: () => setAmount(outstanding.toFixed(2)),
                },
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Pago com" htmlFor="invoice-payment-method" icon={Landmark}>
              <Select
                value={method}
                onValueChange={(value) => setMethod(value as InvoicePaymentMethod)}
              >
                <SelectTrigger id="invoice-payment-method" className={triggerClassName}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(paymentMethodLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Data" htmlFor="invoice-payment-date" icon={CalendarDays}>
              <Input
                id="invoice-payment-date"
                type="date"
                value={paidAt}
                onChange={(event) => setPaidAt(event.target.value)}
                className={inputClassName}
                required
              />
            </Field>
          </div>

          <HistoryList
            title="Pagamentos desta fatura"
            emptyText="Esta fatura ainda não recebeu pagamentos."
            items={paymentHistory.map((payment) => ({
              id: payment.id,
              label: `${formatDateOnlyBR(payment.paidAt.slice(0, 10))}, ${paymentMethodLabels[payment.method]}`,
              value: formatCurrency(payment.amount),
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
          accent="emerald"
          icon={Check}
          loading={isSubmitting}
          loadingLabel="Registrando..."
          disabled={isSubmitting || outstanding <= 0}
        >
          Confirmar pagamento
        </PrimaryButton>
      </ModalFooter>
    </ModalShell>
  );
}
