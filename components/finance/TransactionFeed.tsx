"use client";

import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import {
  getDateOnlyParts,
} from "@/lib/dateUtils";
import { getTransactionStatusPresentation } from "@/lib/transactionStatus";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { RecurringDeleteDialog } from "@/components/finance/RecurringDeleteDialog";
import {
  getTransactionDescriptionPresentation,
} from "@/components/finance/TransactionDescription";
import {
  useFinanceStore,
  type Card,
  type Transaction,
} from "@/store/useFinanceStore";
import {
  BookOpen,
  Car,
  Dumbbell,
  Home,
  ReceiptText,
  Pencil,
  ShoppingBasket,
  CircleHelp,
  Trash2,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

interface TransactionFeedProps {
  transactions?: Transaction[];
  cards?: Card[];
  onEdit?: (transaction: Transaction) => void;
}

const categoryMeta: Record<string, { color: string; icon: LucideIcon }> = {
  Alimentação: { color: "#fb923c", icon: ShoppingBasket },
  Transporte: { color: "#38bdf8", icon: Car },
  Moradia: { color: "#86efac", icon: Home },
  Lazer: { color: "#a78bfa", icon: ReceiptText },
  Saúde: { color: "#34d399", icon: Dumbbell },
  Educação: { color: "#fbbf24", icon: BookOpen },
  Receita: { color: "#34d399", icon: Wallet },
  Outros: { color: "#94a3b8", icon: CircleHelp },
};

export function TransactionFeed({
  transactions = [],
  cards = [],
  onEdit,
}: TransactionFeedProps) {
  const { formatCurrency } = useCurrencyFormatter();
  const deleteTransaction = useFinanceStore((state) => state.deleteTransaction);
  const deleteTransactionGroup = useFinanceStore(
    (state) => state.deleteTransactionGroup,
  );
  const cardsById = new Map(cards.map((card) => [card.id, card]));

  async function handleDeleteTransaction(transactionId: string) {
    try {
      await deleteTransaction(transactionId);
      toast.success("Item removido com sucesso");
    } catch (error) {
      console.error("Erro ao remover transação:", error);
      toast.error("Erro ao remover item");
    }
  }

  async function handleDeleteFutureTransactions(transaction: Transaction) {
    if (!transaction.groupId) return;

    try {
      await deleteTransactionGroup(transaction.groupId, transaction.date);
      toast.success("Recorrência atual e próximas removidas");
    } catch (error) {
      console.error("Erro ao remover recorrência:", error);
      toast.error("Erro ao remover recorrência");
    }
  }

  return (
    <section className="rounded-[2rem] border border-white/[0.08] bg-white/[0.045] p-5 shadow-2xl shadow-black/20 backdrop-blur-2xl sm:p-6">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-brand-300">Movimentações</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-white">
            Transações recentes
          </h2>
        </div>
        <span className="rounded-full border border-white/[0.08] bg-white/[0.045] px-3 py-1 text-xs font-medium text-zinc-300">
          {transactions.length} itens
        </span>
      </div>

      {transactions.length ? (
        <div className="space-y-3">
          {transactions.slice(0, 8).map((transaction) => {
            const isIncome = transaction.type === "income";
            const descriptionPresentation =
              getTransactionDescriptionPresentation(transaction);
            const card = transaction.cardId ? cardsById.get(transaction.cardId) : null;
            const isDebitPix = !isIncome && (!transaction.cardId || transaction.type === "fixed");
            const status = isIncome
              ? {
                  label: "Receita",
                  className: "border-emerald-300/20 bg-emerald-300/10 text-emerald-200",
                }
              : isDebitPix
                ? {
                    label: "Débito/PIX",
                    className: "border-brand-300/20 bg-brand-300/10 text-brand-100",
                  }
                : getTransactionStatusPresentation(transaction);
            const categoryLabel = isIncome
              ? "Receita"
              : transaction.category || "Sem categoria";
            const category = categoryMeta[categoryLabel] || categoryMeta.Outros;
            const CategoryIcon = category.icon;
            const day = getDateOnlyParts(transaction.date).dayLabel;
            const amountColor = isIncome ? "text-emerald-300" : "text-white";
            const amountPrefix = isIncome ? "+" : "";

            return (
              <article
                key={transaction.id}
                className={[
                  "group flex gap-4 rounded-3xl border p-4 transition",
                  isIncome
                    ? "border-emerald-300/15 bg-emerald-300/[0.045] hover:border-emerald-300/25 hover:bg-emerald-300/[0.07]"
                    : "border-white/[0.08] bg-black/15 hover:border-white/[0.16] hover:bg-white/[0.055]",
                ].join(" ")}
              >
                <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.045]">
                  <span className="text-[10px] font-medium uppercase text-zinc-500">
                    Dia
                  </span>
                  <span className="text-sm font-bold text-zinc-200">{day}</span>
                </div>

                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border"
                  style={{
                    backgroundColor: `${category.color}18`,
                    borderColor: `${category.color}33`,
                    color: category.color,
                  }}
                >
                  <CategoryIcon className="h-5 w-5" strokeWidth={2} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-sm font-semibold text-white sm:text-base">
                      {descriptionPresentation.description}
                    </h3>
                    {descriptionPresentation.hasInstallments ? (
                      <span className="rounded-full border border-white/[0.08] bg-white/[0.045] px-2 py-0.5 text-xs font-semibold text-zinc-300">
                        {descriptionPresentation.installmentNumber}/
                        {descriptionPresentation.installmentsTotal}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                    <span>{categoryLabel}</span>
                    <span className="h-1 w-1 rounded-full bg-zinc-600" />
                    <span>
                      {isIncome ? "Entrada" : card?.name || "Débito/PIX"}
                    </span>
                    {transaction.owner ? (
                      <>
                        <span className="h-1 w-1 rounded-full bg-zinc-600" />
                        <span>{transaction.owner}</span>
                      </>
                    ) : null}
                  </div>
                </div>

                <div className="flex shrink-0 flex-col items-end justify-between gap-3">
                  <span
                    className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${status.className}`}
                  >
                    {status.label}
                  </span>
                  <div className="flex items-center gap-2">
                    <strong className={`text-sm font-semibold sm:text-base ${amountColor}`}>
                      {amountPrefix}
                      {formatCurrency(transaction.amount)}
                    </strong>
                    {onEdit ? (
                      <button
                        type="button"
                        onClick={() => onEdit(transaction)}
                        className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.045] text-zinc-500 transition hover:border-brand-400/20 hover:bg-brand-500/10 hover:text-brand-200"
                        aria-label="Editar transação"
                      >
                        <Pencil className="h-4 w-4" strokeWidth={2} />
                      </button>
                    ) : null}
                    {transaction.groupId ? (
                      <RecurringDeleteDialog
                        transaction={transaction}
                        onDeleteSingle={(item) =>
                          handleDeleteTransaction(item.id)
                        }
                        onDeleteFuture={handleDeleteFutureTransactions}
                      >
                        <button
                          type="button"
                          className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.045] text-zinc-500 transition hover:border-red-400/20 hover:bg-red-500/10 hover:text-red-200"
                          aria-label="Excluir transação"
                        >
                          <Trash2 className="h-4 w-4" strokeWidth={2} />
                        </button>
                      </RecurringDeleteDialog>
                    ) : (
                      <ConfirmDialog
                        title="Excluir transação"
                        description="Esta ação remove o lançamento da sua lista e não pode ser desfeita."
                        confirmLabel="Excluir"
                        onConfirm={() => handleDeleteTransaction(transaction.id)}
                      >
                        <button
                          type="button"
                          className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.045] text-zinc-500 transition hover:border-red-400/20 hover:bg-red-500/10 hover:text-red-200"
                          aria-label="Excluir transação"
                        >
                          <Trash2 className="h-4 w-4" strokeWidth={2} />
                        </button>
                      </ConfirmDialog>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="flex min-h-52 items-center justify-center rounded-3xl border border-dashed border-white/[0.08] bg-black/10 p-8 text-center">
          <div>
            <Wallet className="mx-auto h-8 w-8 text-zinc-500" strokeWidth={1.8} />
            <p className="mt-4 text-sm font-medium text-zinc-300">
              Nenhuma transação registrada ainda.
            </p>
            <p className="mt-2 text-xs text-zinc-500">
              Suas movimentações recentes aparecerão aqui.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
