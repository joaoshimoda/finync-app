"use client";

import { formatCurrency } from "@/lib/financeUtils";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  useFinanceStore,
  type Card,
  type Transaction,
  type TransactionStatus,
} from "@/store/useFinanceStore";
import {
  BookOpen,
  Car,
  CreditCard,
  Dumbbell,
  Home,
  ReceiptText,
  ShoppingBasket,
  Tag,
  Trash2,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

interface TransactionFeedProps {
  transactions?: Transaction[];
  cards?: Card[];
}

const categoryMeta: Record<string, { color: string; icon: LucideIcon }> = {
  Alimentação: { color: "#fb923c", icon: ShoppingBasket },
  Transporte: { color: "#38bdf8", icon: Car },
  Lazer: { color: "#a78bfa", icon: ReceiptText },
  Saúde: { color: "#34d399", icon: Dumbbell },
  Educação: { color: "#fbbf24", icon: BookOpen },
  Casa: { color: "#86efac", icon: Home },
  Assinatura: { color: "#f472b6", icon: CreditCard },
  Outros: { color: "#94a3b8", icon: Tag },
};

const statusStyles: Record<
  TransactionStatus,
  { label: string; className: string }
> = {
  paid: {
    label: "Pago",
    className: "border-emerald-300/20 bg-emerald-300/10 text-emerald-200",
  },
  confirmed: {
    label: "Na fatura",
    className: "border-sky-300/20 bg-sky-300/10 text-sky-200",
  },
  pending: {
    label: "Pendente",
    className: "border-amber-300/20 bg-amber-300/10 text-amber-200",
  },
};

export function TransactionFeed({
  transactions = [],
  cards = [],
}: TransactionFeedProps) {
  const deleteTransaction = useFinanceStore((state) => state.deleteTransaction);
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

  return (
    <section className="rounded-[2rem] border border-white/[0.08] bg-white/[0.045] p-5 shadow-2xl shadow-black/20 backdrop-blur-2xl sm:p-6">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-brand-300">Movimentações</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-white">
            Despesas recentes
          </h2>
        </div>
        <span className="rounded-full border border-white/[0.08] bg-white/[0.045] px-3 py-1 text-xs font-medium text-zinc-300">
          {transactions.length} itens
        </span>
      </div>

      {transactions.length ? (
        <div className="space-y-3">
          {transactions.slice(0, 8).map((transaction) => {
            const card = transaction.cardId ? cardsById.get(transaction.cardId) : null;
            const isDebitPix = !transaction.cardId || transaction.type === "fixed";
            const status = isDebitPix
              ? {
                  label: "Débito/PIX",
                  className: "border-brand-300/20 bg-brand-300/10 text-brand-100",
                }
              : statusStyles[transaction.status || "confirmed"];
            const category = categoryMeta[transaction.category] || categoryMeta.Outros;
            const CategoryIcon = category.icon;
            const transactionDate = new Date(transaction.date);
            const day = Number.isNaN(transactionDate.getTime())
              ? "--"
              : String(transactionDate.getDate()).padStart(2, "0");

            return (
              <article
                key={transaction.id}
                className="group flex gap-4 rounded-3xl border border-white/[0.08] bg-black/15 p-4 transition hover:border-white/[0.16] hover:bg-white/[0.055]"
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
                      {transaction.description}
                    </h3>
                    {transaction.installmentsTotal && transaction.installmentsTotal > 1 ? (
                      <span className="rounded-full border border-white/[0.08] bg-white/[0.045] px-2 py-0.5 text-xs font-semibold text-zinc-300">
                        {transaction.installmentNumber || 1}/{transaction.installmentsTotal}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                    <span>{transaction.category || "Sem categoria"}</span>
                    <span className="h-1 w-1 rounded-full bg-zinc-600" />
                    <span>{card?.name || "Débito/PIX"}</span>
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
                    <strong className="text-sm font-semibold text-white sm:text-base">
                      {formatCurrency(transaction.amount)}
                    </strong>
                    <ConfirmDialog
                      title="Excluir transação"
                      description="Esta ação remove a despesa da sua lista e não pode ser desfeita."
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
              Nenhuma despesa registrada ainda.
            </p>
            <p className="mt-2 text-xs text-zinc-500">
              Suas transações recentes aparecerão aqui.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
