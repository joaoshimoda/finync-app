"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  Banknote,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
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

  const pillFieldClassName =
    "h-10 rounded-full border-zinc-700 bg-transparent px-4 text-zinc-100 shadow-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 dark:bg-transparent";

  return (
    <DialogContent
      data-tour="invoice-payment-modal"
      showCloseButton={false}
      onOpenAutoFocus={(event) => {
        event.preventDefault();
        window.requestAnimationFrame(() => {
          document.getElementById("invoice-payment-amount")?.focus();
        });
      }}
      className="inset-x-0 bottom-0 left-0 top-auto flex max-h-[96dvh] w-full max-w-none translate-x-0 translate-y-0 overflow-hidden rounded-b-none rounded-t-xl border border-b-0 border-zinc-800 bg-zinc-950 p-0 text-zinc-50 shadow-2xl md:left-1/2 md:top-1/2 md:h-[560px] md:max-h-[90dvh] md:max-w-[920px] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-xl md:border-b"
    >
      <form
        className="grid min-h-0 w-full md:grid-cols-[44%_56%]"
        onSubmit={handleSubmit}
      >
        <aside className="relative flex min-h-[230px] flex-col overflow-hidden bg-emerald-900 p-5 text-white md:min-h-0 md:p-8 [@media_(max-height:_700px)_and_(max-width:_767px)]:min-h-[202px] [@media_(max-height:_700px)_and_(max-width:_767px)]:p-4">
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
              Pagamento de fatura
            </p>
            <DialogTitle className="mt-2 max-w-xs text-2xl font-semibold leading-tight text-white md:mt-4 md:text-4xl [@media_(max-height:_700px)_and_(max-width:_767px)]:text-xl">
              Registrar pagamento.
            </DialogTitle>
            <DialogDescription className="mt-2 max-w-[275px] text-xs leading-5 text-white/75 [@media_(max-height:_700px)_and_(max-width:_767px)]:hidden">
              {cardName || "Cartão de crédito"} · vencimento em{" "}
              {formatDateOnlyBR(invoice.dueDate)}.
            </DialogDescription>
          </div>

          <section className="relative z-10 my-auto md:py-5">
            <div className="flex items-end justify-between gap-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white/15">
                <Banknote className="size-5" />
              </span>
              <div className="text-right">
                <p className="text-[9px] font-semibold uppercase text-white/60">
                  Falta pagar
                </p>
                <strong className="mt-1 block text-2xl font-semibold text-white md:text-3xl">
                  {currencyFormatter.format(outstanding)}
                </strong>
              </div>
            </div>

            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-black/20">
              <div
                className="h-full rounded-full bg-white/85 transition-[width] duration-300"
                style={{ width: `${paymentProgress}%` }}
              />
            </div>
            <div className="mt-2 flex justify-between text-[10px] font-medium text-white/65">
              <span>{paymentProgress.toFixed(0)}% pago</span>
              <span>Total {currencyFormatter.format(invoice.totalAmount)}</span>
            </div>

            <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-white/15 pt-3">
              <div>
                <dt className="text-[9px] font-semibold uppercase text-white/55">
                  Lançado
                </dt>
                <dd className="mt-1 truncate text-xs font-semibold text-white">
                  {currencyFormatter.format(invoice.postedAmount)}
                </dd>
              </div>
              <div>
                <dt className="text-[9px] font-semibold uppercase text-white/55">
                  Já pago
                </dt>
                <dd className="mt-1 truncate text-xs font-semibold text-white">
                  {currencyFormatter.format(invoice.paidAmount)}
                </dd>
              </div>
              <div>
                <dt className="text-[9px] font-semibold uppercase text-white/55">
                  Vencimento
                </dt>
                <dd className="mt-1 truncate text-xs font-semibold text-white">
                  {formatDateOnlyBR(invoice.dueDate)}
                </dd>
              </div>
            </dl>
          </section>
        </aside>

        <section className="flex min-h-0 flex-col bg-zinc-950">
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 [scrollbar-width:thin] md:px-7 md:py-6">
            <fieldset disabled={isSubmitting} className="space-y-5">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <Label
                    htmlFor="invoice-payment-amount"
                    className="text-[10px] font-bold uppercase text-zinc-500"
                  >
                    Valor do pagamento
                  </Label>
                  {postedOutstanding < outstanding ? (
                    <span className="text-[10px] text-zinc-500">
                      Hoje: {currencyFormatter.format(postedOutstanding)}
                    </span>
                  ) : null}
                </div>
                <div className="flex items-center border-b border-zinc-700">
                  <span className="shrink-0 text-xs font-semibold text-emerald-400">
                    R$
                  </span>
                  <Input
                    id="invoice-payment-amount"
                    type="number"
                    inputMode="decimal"
                    min="0.01"
                    max={outstanding}
                    step="0.01"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    className="h-11 rounded-none border-0 bg-transparent px-2 text-xl font-semibold shadow-none focus-visible:ring-0 dark:bg-transparent"
                    required
                  />
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {postedOutstanding > 0 ? (
                    <button
                      type="button"
                      onClick={() => setAmount(postedOutstanding.toFixed(2))}
                      className="h-8 rounded-full border border-zinc-700 px-3 text-xs font-medium text-zinc-300 transition-colors hover:border-emerald-500/50 hover:text-emerald-300"
                    >
                      Pagar lançado
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setAmount(outstanding.toFixed(2))}
                    className="h-8 rounded-full border border-zinc-700 px-3 text-xs font-medium text-zinc-300 transition-colors hover:border-emerald-500/50 hover:text-emerald-300"
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
                      setMethod(value as InvoicePaymentMethod)
                    }
                  >
                    <SelectTrigger className={pillFieldClassName}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(paymentMethodLabels).map(
                        ([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="invoice-payment-date"
                    className="flex items-center gap-2 text-[10px] font-bold uppercase text-zinc-500"
                  >
                    <CalendarDays className="size-3.5" />
                    Data
                  </Label>
                  <Input
                    id="invoice-payment-date"
                    type="date"
                    value={paidAt}
                    onChange={(event) => setPaidAt(event.target.value)}
                    className={`${pillFieldClassName} [color-scheme:dark]`}
                    required
                  />
                </div>
              </div>

              <div className="border-t border-zinc-800 pt-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="flex items-center gap-2 text-xs font-semibold text-zinc-300">
                    <Clock3 className="size-3.5 text-zinc-500" />
                    Pagamentos recentes
                  </p>
                  <span className="text-[10px] text-zinc-600">
                    {paymentHistory.length || "Nenhum"}
                  </span>
                </div>

                {paymentHistory.length ? (
                  <div className="mt-3 space-y-2">
                    {paymentHistory.map((payment) => (
                      <div
                        key={payment.id}
                        className="flex items-center justify-between gap-3 border-b border-zinc-900 pb-2 text-xs last:border-0 last:pb-0"
                      >
                        <span className="flex min-w-0 items-center gap-2 text-zinc-500">
                          <CheckCircle2 className="size-3.5 shrink-0 text-emerald-500" />
                          <span className="truncate">
                            {formatDateOnlyBR(payment.paidAt.slice(0, 10))} ·{" "}
                            {paymentMethodLabels[payment.method]}
                          </span>
                        </span>
                        <strong className="shrink-0 text-zinc-200">
                          {currencyFormatter.format(payment.amount)}
                        </strong>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-zinc-600">
                    Esta fatura ainda não recebeu pagamentos.
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
              className="h-10 flex-[1.35] rounded-full bg-emerald-600 px-6 font-semibold text-white hover:bg-emerald-700 md:flex-none"
              disabled={isSubmitting || outstanding <= 0}
            >
              <Check className="size-4" />
              {isSubmitting ? "Registrando..." : "Confirmar pagamento"}
            </Button>
          </footer>
        </section>
      </form>
    </DialogContent>
  );
}
