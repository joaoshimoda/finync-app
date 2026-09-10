"use client";

import { FormEvent, useMemo, useState } from "react";
import { Banknote, CheckCircle2, Clock3 } from "lucide-react";
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
  getInvoiceOutstanding,
  getPostedInvoiceOutstanding,
  getSuggestedInvoicePayment,
} from "@/lib/invoicePayments";
import {
  useFinanceStore,
  type CardInvoice,
  type InvoicePaymentMethod,
} from "@/store/useFinanceStore";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

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
  const payCardInvoice = useFinanceStore((state) => state.payCardInvoice);
  const invoicePayments = useFinanceStore((state) => state.invoicePayments);
  const outstanding = getInvoiceOutstanding(invoice);
  const postedOutstanding = getPostedInvoiceOutstanding(invoice);
  const suggestedPayment = getSuggestedInvoicePayment(invoice);
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

  return (
    <DialogContent className="border-zinc-800 bg-zinc-950 text-zinc-50 sm:max-w-lg">
      <DialogHeader>
        <div className="mb-1 flex size-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
          <Banknote className="size-5" />
        </div>
        <DialogTitle>Registrar pagamento</DialogTitle>
        <DialogDescription>
          {cardName ? `${cardName} · ` : ""}Fatura com vencimento em{" "}
          {formatDateOnlyBR(invoice.dueDate)}.
        </DialogDescription>
      </DialogHeader>

      <div className="grid grid-cols-3 gap-2 border-y border-zinc-800 py-4">
        <div>
          <p className="text-[11px] text-zinc-500">Lançado</p>
          <strong className="mt-1 block text-sm text-zinc-200">
            {currencyFormatter.format(invoice.postedAmount)}
          </strong>
        </div>
        <div>
          <p className="text-[11px] text-zinc-500">Já pago</p>
          <strong className="mt-1 block text-sm text-zinc-200">
            {currencyFormatter.format(invoice.paidAmount)}
          </strong>
        </div>
        <div className="text-right">
          <p className="text-[11px] text-zinc-500">Saldo projetado</p>
          <strong className="mt-1 block text-sm text-amber-300">
            {currencyFormatter.format(outstanding)}
          </strong>
        </div>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="invoice-payment-amount">Valor do pagamento</Label>
            {postedOutstanding < outstanding ? (
              <span className="text-[11px] text-zinc-500">
                Em aberto hoje: {currencyFormatter.format(postedOutstanding)}
              </span>
            ) : null}
          </div>
          <Input
            id="invoice-payment-amount"
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
                setMethod(value as InvoicePaymentMethod)
              }
              disabled={isSubmitting}
            >
              <SelectTrigger className="h-10 border-zinc-700 bg-zinc-900">
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="invoice-payment-date">Data do pagamento</Label>
            <Input
              id="invoice-payment-date"
              type="date"
              value={paidAt}
              onChange={(event) => setPaidAt(event.target.value)}
              className="h-10 border-zinc-700 bg-zinc-900"
              disabled={isSubmitting}
              required
            />
          </div>
        </div>

        {paymentHistory.length ? (
          <div className="space-y-2 border-t border-zinc-800 pt-4">
            <div className="flex items-center gap-2 text-xs font-medium text-zinc-400">
              <Clock3 className="size-3.5" />
              Pagamentos recentes
            </div>
            {paymentHistory.map((payment) => (
              <div
                key={payment.id}
                className="flex items-center justify-between gap-3 text-xs"
              >
                <span className="flex items-center gap-2 text-zinc-500">
                  <CheckCircle2 className="size-3.5 text-emerald-500" />
                  {formatDateOnlyBR(payment.paidAt.slice(0, 10))} ·{" "}
                  {paymentMethodLabels[payment.method]}
                </span>
                <strong className="text-zinc-200">
                  {currencyFormatter.format(payment.amount)}
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
            {isSubmitting ? "Registrando..." : "Confirmar pagamento"}
          </Button>
        </div>
      </form>
    </DialogContent>
  );
}
