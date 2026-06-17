"use client";

import { TransactionFeed } from "@/components/finance/TransactionFeed";
import { WalletSlider } from "@/components/finance/WalletSlider";
import { AddCardModal } from "@/components/modals/AddCardModal";
import { formatCurrency } from "@/lib/financeUtils";
import { useFinanceStore } from "@/store/useFinanceStore";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";

export default function DashboardPage() {
  const [isAddCardModalOpen, setIsAddCardModalOpen] = useState(false);
  const cards = useFinanceStore((state) => state.cards);
  const transactions = useFinanceStore((state) => state.transactions);

  const summaryCards = useMemo(() => {
    const totalSpent = transactions.reduce(
      (sum, transaction) => sum + transaction.amount,
      0,
    );
    const openInvoices = new Set(
      transactions
        .filter((transaction) => transaction.cardId && transaction.status !== "paid")
        .map((transaction) => transaction.cardId),
    ).size;

    return [
      {
        label: "Gasto Total",
        value: formatCurrency(totalSpent),
        hint: `${transactions.length} lancamentos`,
      },
      {
        label: "Faturas Abertas",
        value: String(openInvoices),
        hint: "Cartoes com pendencias",
      },
      {
        label: "Cartoes Ativos",
        value: String(cards.length),
        hint: cards.length === 1 ? "1 cartao cadastrado" : `${cards.length} cartoes cadastrados`,
      },
    ];
  }, [cards.length, transactions]);

  return (
    <div className="space-y-8">
      <header className="rounded-[2rem] border border-white/[0.08] bg-white/[0.055] p-6 shadow-2xl shadow-black/20 backdrop-blur-2xl sm:p-8">
        <p className="text-sm font-medium text-brand-300">Dashboard</p>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Visao Geral
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-300 sm:text-base">
              Acompanhe seus gastos, cartoes e movimentacoes em um painel centralizado.
            </p>
          </div>
          <div className="rounded-2xl border border-brand-500/20 bg-brand-500/10 px-4 py-3 text-sm font-medium text-brand-100">
            Resumo atualizado
          </div>
        </div>
      </header>

      <section className="space-y-4">
        <div>
          <p className="text-sm font-medium text-brand-300">Resumo Financeiro</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-white">
            Seus numeros principais
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {summaryCards.map((card) => (
            <article
              key={card.label}
              className="rounded-3xl border border-white/[0.08] bg-white/[0.045] p-5 shadow-xl shadow-black/10 backdrop-blur-xl"
            >
              <p className="text-sm font-medium text-zinc-400">{card.label}</p>
              <strong className="mt-4 block text-2xl font-semibold tracking-tight text-white">
                {card.value}
              </strong>
              <p className="mt-3 text-xs text-zinc-500">{card.hint}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setIsAddCardModalOpen(true)}
              className="inline-flex h-11 items-center gap-2 rounded-2xl bg-brand-500 px-4 text-sm font-bold text-slate-950 shadow-[0_0_28px_rgba(16,185,129,0.14)] transition hover:bg-brand-400 hover:shadow-[0_0_36px_rgba(16,185,129,0.24)] focus:outline-none focus:ring-4 focus:ring-brand-500/30"
            >
              <Plus className="h-4 w-4" strokeWidth={2.5} />
              Novo Cartao
            </button>
          </div>
          <WalletSlider cards={cards} transactions={transactions} />
        </div>
        <TransactionFeed cards={cards} transactions={transactions} />
      </section>

      <AddCardModal
        isOpen={isAddCardModalOpen}
        onClose={() => setIsAddCardModalOpen(false)}
      />
    </div>
  );
}
