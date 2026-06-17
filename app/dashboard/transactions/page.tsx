"use client";

import { TransactionFeed } from "@/components/finance/TransactionFeed";
import { AddTransactionModal } from "@/components/modals/AddTransactionModal";
import { useFinanceStore } from "@/store/useFinanceStore";
import { Plus } from "lucide-react";
import { useState } from "react";

export default function TransactionsPage() {
  const [isAddTransactionModalOpen, setIsAddTransactionModalOpen] = useState(false);
  const cards = useFinanceStore((state) => state.cards);
  const transactions = useFinanceStore((state) => state.transactions);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-brand-300">Movimentações</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
            Histórico de Transações
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
            Consulte os lançamentos recentes e acompanhe o status das suas despesas.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddTransactionModalOpen(true)}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-brand-500 px-4 text-sm font-bold text-slate-950 shadow-[0_0_28px_rgba(16,185,129,0.14)] transition hover:bg-brand-400 hover:shadow-[0_0_36px_rgba(16,185,129,0.24)] focus:outline-none focus:ring-4 focus:ring-brand-500/30"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          Nova Despesa
        </button>
      </header>

      <TransactionFeed cards={cards} transactions={transactions} />

      <AddTransactionModal
        isOpen={isAddTransactionModalOpen}
        onClose={() => setIsAddTransactionModalOpen(false)}
      />
    </div>
  );
}
