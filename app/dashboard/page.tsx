"use client";

import { TransactionFeed } from "@/components/finance/TransactionFeed";
import { WalletSlider } from "@/components/finance/WalletSlider";
import { AddCardModal } from "@/components/modals/AddCardModal";
import { useFinanceStore } from "@/store/useFinanceStore";
import { Plus } from "lucide-react";
import { useState } from "react";

const brlFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export default function DashboardPage() {
  const [isAddCardModalOpen, setIsAddCardModalOpen] = useState(false);
  const cards = useFinanceStore((state) => state.cards);
  const transactions = useFinanceStore((state) => state.transactions);
  const calculateBalances = useFinanceStore((state) => state.calculateBalances);
  const balances = calculateBalances();

  const summaryCards = [
    {
      label: "Saldo disponível",
      value: brlFormatter.format(balances.availableBalance),
      hint: "Receitas menos despesas e faturas",
    },
    {
      label: "Receitas",
      value: brlFormatter.format(balances.totalIncome),
      hint: "Entradas registradas no período",
    },
    {
      label: "Débito/PIX",
      value: brlFormatter.format(balances.totalExpenseDebit),
      hint: "Despesas fora da fatura do cartão",
    },
    {
      label: "Faturas de cartão",
      value: brlFormatter.format(balances.totalCreditCardInvoice),
      hint:
        cards.length === 1 ? "1 cartão ativo" : `${cards.length} cartões ativos`,
    },
  ];

  return (
    <div className="space-y-8">
      <header className="rounded-[2rem] border border-white/[0.08] bg-white/[0.055] p-6 shadow-2xl shadow-black/20 backdrop-blur-2xl sm:p-8">
        <p className="text-sm font-medium text-brand-300">Painel</p>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Visão Geral
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-300 sm:text-base">
              Acompanhe seus gastos, cartões e movimentações em um painel centralizado.
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
            Seus números principais
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
              Novo Cartão
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
