"use client";

import {
  CalendarDays,
  CreditCard,
  Layers3,
  Pencil,
  ReceiptText,
  Repeat2,
  Tag,
  UserRound,
} from "lucide-react";

import {
  getTransactionDescriptionPresentation,
} from "@/components/finance/TransactionDescription";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { getCardSignedAmount, isCardCreditAdjustment } from "@/lib/cardCredits";
import { formatDateOnlyBR } from "@/lib/dateUtils";
import { getTransactionStatusPresentation } from "@/lib/transactionStatus";
import { cn } from "@/lib/utils";
import type { Transaction } from "@/store/useFinanceStore";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";

const monthFormatter = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

interface TransactionDetailSheetProps {
  transaction: Transaction | null;
  transactions: Transaction[];
  cardName?: string | null;
  dependentName?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (transaction: Transaction) => void;
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CalendarDays;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-white/[0.06] py-3.5 last:border-0">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.045] text-zinc-500">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-zinc-600">{label}</p>
        <p className="mt-1 break-words text-sm font-medium text-zinc-200">
          {value}
        </p>
      </div>
    </div>
  );
}

function formatCompetence(value?: string) {
  if (!value) return "Não informada";

  const normalizedValue = value.slice(0, 10);
  const formatted = monthFormatter.format(new Date(`${normalizedValue}T12:00:00Z`));

  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export function TransactionDetailSheet({
  transaction,
  transactions,
  cardName,
  dependentName,
  open,
  onOpenChange,
  onEdit,
}: TransactionDetailSheetProps) {
  const { formatCurrency } = useCurrencyFormatter();
  if (!transaction) return null;

  const description = getTransactionDescriptionPresentation(transaction);
  const status = getTransactionStatusPresentation(transaction);
  const isPositive =
    transaction.type === "income" || isCardCreditAdjustment(transaction);
  const signedAmount =
    transaction.type === "card"
      ? getCardSignedAmount(transaction)
      : transaction.amount;
  const origin =
    transaction.type === "income"
      ? "Receita"
      : transaction.type === "card"
        ? cardName || "Cartão de crédito"
        : "Débito / PIX";
  const recurrenceLabel = transaction.is_recurring
    ? transaction.type === "card"
      ? "Assinatura mensal"
      : "Conta recorrente"
    : "Lançamento único";
  const groupTransactions = transaction.groupId
    ? transactions
        .filter((item) => item.groupId === transaction.groupId)
        .sort(
          (left, right) =>
            (left.installmentNumber ?? left.current_installment ?? 1) -
            (right.installmentNumber ?? right.current_installment ?? 1),
        )
    : [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader className="border-b border-white/[0.07]">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-600">
            Detalhes da movimentação
          </p>
          <SheetTitle>{description.description}</SheetTitle>
          <SheetDescription>
            Consulte a origem, competência e vínculos deste lançamento.
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 [scrollbar-width:thin] [scrollbar-color:#3f3f46_transparent] sm:px-6">
          <section className="rounded-xl border border-white/[0.07] bg-zinc-900/55 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs text-zinc-500">Valor do lançamento</p>
                <p
                  className={cn(
                    "mt-2 text-2xl font-semibold tracking-tight tabular-nums",
                    isPositive ? "text-emerald-400" : "text-rose-400",
                  )}
                >
                  {isPositive ? "+" : "-"}
                  {formatCurrency(Math.abs(signedAmount))}
                </p>
              </div>
              <Badge variant="outline" className={status.className}>
                {status.label}
              </Badge>
            </div>
          </section>

          <section className="mt-5">
            <DetailRow
              icon={CalendarDays}
              label="Data"
              value={formatDateOnlyBR(transaction.date)}
            />
            <DetailRow
              icon={ReceiptText}
              label="Competência"
              value={formatCompetence(
                transaction.billingMonthStart ?? transaction.date,
              )}
            />
            <DetailRow icon={CreditCard} label="Origem" value={origin} />
            <DetailRow
              icon={Tag}
              label="Categoria"
              value={transaction.category || "Outros"}
            />
            <DetailRow
              icon={UserRound}
              label="Responsável"
              value={dependentName || "Gasto pessoal"}
            />
            <DetailRow icon={Repeat2} label="Frequência" value={recurrenceLabel} />
            {description.hasInstallments ? (
              <DetailRow
                icon={Layers3}
                label="Parcelamento"
                value={`${description.installmentNumber} de ${description.installmentsTotal} parcelas`}
              />
            ) : null}
          </section>

          {description.hasInstallments && groupTransactions.length ? (
            <section className="mt-6 border-t border-white/[0.07] pt-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-200">
                    Linha do parcelamento
                  </h3>
                  <p className="mt-1 text-xs text-zinc-600">
                    {groupTransactions.length} ocorrências localizadas
                  </p>
                </div>
                <Layers3 className="size-4 text-zinc-600" />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {groupTransactions.map((item) => {
                  const installmentNumber =
                    item.installmentNumber ?? item.current_installment ?? 1;
                  const isCurrent = item.id === transaction.id;

                  return (
                    <div
                      key={item.id}
                      className={cn(
                        "rounded-lg border px-3 py-2.5",
                        isCurrent
                          ? "border-emerald-400/20 bg-emerald-400/[0.07]"
                          : "border-white/[0.06] bg-white/[0.025]",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={cn(
                            "text-xs font-semibold",
                            isCurrent ? "text-emerald-300" : "text-zinc-400",
                          )}
                        >
                          {installmentNumber}/{description.installmentsTotal}
                        </span>
                        {isCurrent ? (
                          <span className="text-[10px] text-emerald-400">
                            Atual
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-[11px] text-zinc-600">
                        {formatCompetence(item.billingMonthStart)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>
          ) : null}
        </div>

        <SheetFooter>
          <Button
            type="button"
            className="h-11 w-full bg-emerald-600 font-medium text-white hover:bg-emerald-700"
            onClick={() => {
              onOpenChange(false);
              onEdit(transaction);
            }}
          >
            <Pencil className="size-4" />
            Editar
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
