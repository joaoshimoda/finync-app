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

import { CategoryGlyph } from "@/components/finance/categoryIcons";
import {
  getTransactionDescriptionPresentation,
} from "@/components/finance/TransactionDescription";
import {
  PrimaryButton,
  getStageBackground,
} from "@/components/modals/ModalKit";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { getCardSignedAmount, isCardCreditAdjustment } from "@/lib/cardCredits";
import { formatDateOnlyBR } from "@/lib/dateUtils";
import { getTransactionStatusPresentation } from "@/lib/transactionStatus";
import { cn } from "@/lib/utils";
import { useFinanceStore, type Transaction } from "@/store/useFinanceStore";
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
    <div className="flex items-center gap-3 px-3.5 py-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.05] text-zinc-400">
        <Icon className="size-4" />
      </span>
      <dt className="flex-1 text-[13px] text-zinc-500">{label}</dt>
      <dd className="min-w-0 max-w-[60%] break-words text-right text-sm font-medium text-zinc-100">
        {value}
      </dd>
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
  const categories = useFinanceStore((state) => state.categories);
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
  const categoryIcon = categories.find(
    (item) => item.label === transaction.category,
  )?.icon;
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
      <SheetContent className="sm:w-[460px] sm:max-w-[460px]">
        <header
          className="relative shrink-0 border-b border-white/[0.06] px-5 pb-6 pt-6 sm:px-7"
          style={{ background: getStageBackground(isPositive ? "emerald" : "rose") }}
        >
          <div className="flex items-center gap-3 pr-12">
            <span
              className={cn(
                "flex size-11 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset ring-white/10",
                isPositive
                  ? "bg-emerald-400/15 text-emerald-100"
                  : "bg-rose-400/15 text-rose-100",
              )}
            >
              <CategoryGlyph name={categoryIcon} className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[13px] text-white/60">
                {transaction.category || "Outros"}
              </p>
              <SheetTitle className="truncate pr-0 text-xl text-white">
                {description.description}
              </SheetTitle>
            </div>
          </div>

          <p
            className={cn(
              "mt-6 text-[40px] font-semibold leading-none tabular-nums tracking-[-0.03em]",
              isPositive ? "text-emerald-100" : "text-white",
            )}
          >
            {isPositive ? "+" : "−"} {formatCurrency(Math.abs(signedAmount))}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-xs font-medium",
                status.className,
              )}
            >
              {status.label}
            </span>
            <SheetDescription className="text-[13px] leading-5 text-white/60">
              {formatDateOnlyBR(transaction.date)}, {origin}
            </SheetDescription>
          </div>
        </header>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-6 [scrollbar-width:thin] [scrollbar-color:#3f3f46_transparent] sm:px-7">
          <dl className="divide-y divide-white/[0.06] rounded-xl bg-white/[0.02] ring-1 ring-inset ring-white/[0.08]">
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
              label="De quem é"
              value={dependentName || "Gasto pessoal"}
            />
            <DetailRow icon={Repeat2} label="Frequência" value={recurrenceLabel} />
            {description.hasInstallments ? (
              <DetailRow
                icon={Layers3}
                label="Parcelamento"
                value={`${description.installmentNumber} de ${description.installmentsTotal}`}
              />
            ) : null}
          </dl>

          {description.hasInstallments && groupTransactions.length ? (
            <section>
              <div className="mb-3 flex items-baseline justify-between gap-4">
                <h3 className="text-[13px] font-medium text-zinc-300">
                  Parcelas
                </h3>
                <p className="text-xs text-zinc-500">
                  {groupTransactions.length} encontradas
                </p>
              </div>
              <ol className="grid grid-cols-2 gap-2">
                {groupTransactions.map((item) => {
                  const installmentNumber =
                    item.installmentNumber ?? item.current_installment ?? 1;
                  const isCurrent = item.id === transaction.id;

                  return (
                    <li
                      key={item.id}
                      aria-current={isCurrent ? "true" : undefined}
                      className={cn(
                        "rounded-xl px-3 py-2.5 ring-1 ring-inset",
                        isCurrent
                          ? "bg-white/[0.08] ring-white/25"
                          : "bg-white/[0.02] ring-white/[0.06]",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={cn(
                            "text-[13px] font-semibold tabular-nums",
                            isCurrent ? "text-zinc-50" : "text-zinc-400",
                          )}
                        >
                          {installmentNumber}/{description.installmentsTotal}
                        </span>
                        {isCurrent ? (
                          <span className="text-[11px] text-zinc-300">Esta</span>
                        ) : null}
                      </div>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        {formatCompetence(item.billingMonthStart)}
                      </p>
                    </li>
                  );
                })}
              </ol>
            </section>
          ) : null}
        </div>

        <footer className="shrink-0 border-t border-white/[0.06] px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-7">
          <PrimaryButton
            type="button"
            accent={isPositive ? "emerald" : "rose"}
            icon={Pencil}
            className="w-full md:flex-1"
            onClick={() => {
              onOpenChange(false);
              onEdit(transaction);
            }}
          >
            Editar
          </PrimaryButton>
        </footer>
      </SheetContent>
    </Sheet>
  );
}
