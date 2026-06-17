"use client";

import { WalletSlider } from "@/components/finance/WalletSlider";
import { AddCardModal } from "@/components/modals/AddCardModal";
import { useFinanceStore } from "@/store/useFinanceStore";
import { Plus } from "lucide-react";
import { useState } from "react";

export default function CardsPage() {
  const [isAddCardModalOpen, setIsAddCardModalOpen] = useState(false);
  const cards = useFinanceStore((state) => state.cards);
  const transactions = useFinanceStore((state) => state.transactions);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-brand-300">Carteira</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
            Meus Cartões
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
            Gerencie seus cartões, limites e faturas em um único lugar.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddCardModalOpen(true)}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-brand-500 px-4 text-sm font-bold text-slate-950 shadow-[0_0_28px_rgba(16,185,129,0.14)] transition hover:bg-brand-400 hover:shadow-[0_0_36px_rgba(16,185,129,0.24)] focus:outline-none focus:ring-4 focus:ring-brand-500/30"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          Novo Cartão
        </button>
      </header>

      <WalletSlider cards={cards} transactions={transactions} />

      <AddCardModal
        isOpen={isAddCardModalOpen}
        onClose={() => setIsAddCardModalOpen(false)}
      />
    </div>
  );
}
