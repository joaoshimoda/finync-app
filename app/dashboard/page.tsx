"use client";

import { TransactionFeed } from "@/components/finance/TransactionFeed";
import { WalletSlider } from "@/components/finance/WalletSlider";
import { AddCardModal } from "@/components/modals/AddCardModal";
import { AddIncomeModal } from "@/components/modals/AddIncomeModal";
import { AddTransactionModal } from "@/components/modals/AddTransactionModal";
import { useFinanceStore, type Transaction } from "@/store/useFinanceStore";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useEffect, useState } from "react";

const brlFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const monthFormatter = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  year: "numeric",
});

export default function DashboardPage() {
  const [isAddCardModalOpen, setIsAddCardModalOpen] = useState(false);
  const [isAddIncomeModalOpen, setIsAddIncomeModalOpen] = useState(false);
  const [isAddTransactionModalOpen, setIsAddTransactionModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);
  const cards = useFinanceStore((state) => state.cards);
  const transactions = useFinanceStore((state) => state.transactions);
  const fetchCards = useFinanceStore((state) => state.fetchCards);
  const fetchTransactions = useFinanceStore((state) => state.fetchTransactions);
  const currentMonth = useFinanceStore((state) => state.currentMonth);
  const currentYear = useFinanceStore((state) => state.currentYear);
  const nextMonth = useFinanceStore((state) => state.nextMonth);
  const prevMonth = useFinanceStore((state) => state.prevMonth);
  const calculateBalances = useFinanceStore((state) => state.calculateBalances);
  const balances = calculateBalances();
  const selectedPeriodLabel = monthFormatter.format(
    new Date(currentYear, currentMonth - 1, 1),
  );

  useEffect(() => {
    void fetchCards();
    void fetchTransactions();
  }, [currentMonth, currentYear, fetchCards, fetchTransactions]);

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

  function handleCloseIncomeModal() {
    setIsAddIncomeModalOpen(false);
    setEditingTransaction(null);
  }

  function handleCloseTransactionModal() {
    setIsAddTransactionModalOpen(false);
    setEditingTransaction(null);
  }

  function handleEditTransaction(transaction: Transaction) {
    setEditingTransaction(transaction);

    if (transaction.type === "income") {
      setIsAddIncomeModalOpen(true);
      return;
    }

    setIsAddTransactionModalOpen(true);
  }

  return (
    <div className="space-y-8">
      <header className="rounded-[2rem] border border-white/[0.08] bg-white/[0.055] p-6 shadow-2xl shadow-black/20 backdrop-blur-2xl sm:p-8">
        <p className="text-sm font-medium text-brand-300">Painel</p>
        <div className="mt-3 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Visão Geral
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-300 sm:text-base">
              Acompanhe seus gastos, receitas, cartões e movimentações em um painel
              centralizado.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex h-11 items-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.045] px-2 text-sm font-semibold text-zinc-100 backdrop-blur-xl">
              <button
                type="button"
                onClick={prevMonth}
                className="flex h-8 w-8 items-center justify-center rounded-xl text-zinc-400 transition hover:bg-white/[0.08] hover:text-white"
                aria-label="Mês anterior"
              >
                <ChevronLeft className="h-4 w-4" strokeWidth={2.5} />
              </button>
              <span className="min-w-36 text-center capitalize">
                {selectedPeriodLabel}
              </span>
              <button
                type="button"
                onClick={nextMonth}
                className="flex h-8 w-8 items-center justify-center rounded-xl text-zinc-400 transition hover:bg-white/[0.08] hover:text-white"
                aria-label="Próximo mês"
              >
                <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                setEditingTransaction(null);
                setIsAddIncomeModalOpen(true);
              }}
              className="inline-flex h-11 items-center gap-2 rounded-2xl bg-emerald-400 px-4 text-sm font-bold text-zinc-950 shadow-[0_0_28px_rgba(52,211,153,0.16)] transition hover:bg-emerald-300 hover:shadow-[0_0_36px_rgba(52,211,153,0.26)] focus:outline-none focus:ring-4 focus:ring-emerald-500/30"
            >
              <Plus className="h-4 w-4" strokeWidth={2.5} />
              Nova Receita
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingTransaction(null);
                setIsAddTransactionModalOpen(true);
              }}
              className="inline-flex h-11 items-center gap-2 rounded-2xl bg-brand-500 px-4 text-sm font-bold text-slate-950 shadow-[0_0_28px_rgba(16,185,129,0.14)] transition hover:bg-brand-400 hover:shadow-[0_0_36px_rgba(16,185,129,0.24)] focus:outline-none focus:ring-4 focus:ring-brand-500/30"
            >
              <Plus className="h-4 w-4" strokeWidth={2.5} />
              Nova Transação
            </button>
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
              className="inline-flex h-11 items-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.055] px-4 text-sm font-bold text-zinc-100 transition hover:border-brand-500/30 hover:bg-brand-500/10 focus:outline-none focus:ring-4 focus:ring-brand-500/20"
            >
              <Plus className="h-4 w-4" strokeWidth={2.5} />
              Novo Cartão
            </button>
          </div>
          <WalletSlider cards={cards} transactions={transactions} />
        </div>
        <TransactionFeed
          cards={cards}
          transactions={transactions}
          onEdit={handleEditTransaction}
        />
      </section>

      <AddCardModal
        isOpen={isAddCardModalOpen}
        onClose={() => setIsAddCardModalOpen(false)}
      />
      <AddIncomeModal
        isOpen={isAddIncomeModalOpen}
        onClose={handleCloseIncomeModal}
        editingTransaction={
          editingTransaction?.type === "income" ? editingTransaction : null
        }
      />
      <AddTransactionModal
        isOpen={isAddTransactionModalOpen}
        onClose={handleCloseTransactionModal}
        editingTransaction={
          editingTransaction && editingTransaction.type !== "income"
            ? editingTransaction
            : null
        }
      />
    </div>
  );
}
