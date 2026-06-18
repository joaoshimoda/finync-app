"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Plus, Repeat } from "lucide-react";

import { AddTransactionModal } from "@/components/modals/AddTransactionModal";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getDateOnlyParts } from "@/lib/dateUtils";
import { useFinanceStore } from "@/store/useFinanceStore";

const brlFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export default function FixedExpensesPage() {
  const [isNewFixedModalOpen, setIsNewFixedModalOpen] = useState(false);

  const transactions = useFinanceStore((state) => state.transactions);
  const fetchTransactions = useFinanceStore((state) => state.fetchTransactions);
  const currentMonth = useFinanceStore((state) => state.currentMonth);
  const currentYear = useFinanceStore((state) => state.currentYear);

  useEffect(() => {
    void fetchTransactions();
  }, [fetchTransactions]);

  const fixedTransactions = useMemo(() => {
    return transactions.filter((transaction) => {
      const transactionDate = getDateOnlyParts(transaction.date);

      return (
        transaction.type === "fixed" &&
        transactionDate.month === currentMonth &&
        transactionDate.year === currentYear
      );
    });
  }, [currentMonth, currentYear, transactions]);

  const monthlyFixedCost = fixedTransactions.reduce(
    (total, transaction) => total + transaction.amount,
    0,
  );
  const annualProjection = monthlyFixedCost * 12;

  return (
    <>
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-brand-300">
              Gestão recorrente
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-white">
              Contas Fixas
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-zinc-400">
              Centralize assinaturas, mensalidades e despesas que se repetem.
            </p>
          </div>

          <Button
            type="button"
            onClick={() => setIsNewFixedModalOpen(true)}
            className="bg-brand-500 text-zinc-950 hover:bg-brand-400"
          >
            <Plus />
            Nova Conta
          </Button>
        </header>

        <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Card className="border-white/[0.08] bg-white/[0.035]">
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardDescription>Custo Fixo Mensal</CardDescription>
                <CardTitle className="mt-2 text-3xl">
                  {brlFormatter.format(monthlyFixedCost)}
                </CardTitle>
              </div>
              <div className="flex size-11 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-200">
                <CalendarDays className="size-5" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-zinc-400">
                Soma das contas fixas no mês selecionado.
              </p>
            </CardContent>
          </Card>

          <Card className="border-white/[0.08] bg-white/[0.035]">
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardDescription>Projeção Anual</CardDescription>
                <CardTitle className="mt-2 text-3xl">
                  {brlFormatter.format(annualProjection)}
                </CardTitle>
              </div>
              <div className="flex size-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-200">
                <Repeat className="size-5" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-zinc-400">
                Estimativa baseada no custo fixo mensal multiplicado por 12.
              </p>
            </CardContent>
          </Card>
        </section>

        <Card className="border-dashed border-white/[0.12] bg-white/[0.025]">
          <CardContent className="flex min-h-48 items-center justify-center p-8">
            <p className="text-sm text-zinc-400">Carregando contas fixas...</p>
          </CardContent>
        </Card>
      </main>

      <AddTransactionModal
        isOpen={isNewFixedModalOpen}
        onClose={() => setIsNewFixedModalOpen(false)}
      />
    </>
  );
}
