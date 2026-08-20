"use client";

import { useEffect, useMemo } from "react";
import {
  CreditCard,
  ReceiptText,
  TrendingUp,
  UserRound,
  UsersRound,
} from "lucide-react";

import { DependentManager } from "@/components/settings/DependentManager";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCardSignedAmount, isCardCreditAdjustment } from "@/lib/cardCredits";
import { isTransactionInSelectedCompetence } from "@/lib/transactionPeriod";
import { cn } from "@/lib/utils";
import { useFinanceStore } from "@/store/useFinanceStore";

const brlFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export default function DependentesPage() {
  const dependents = useFinanceStore((state) => state.dependents);
  const transactions = useFinanceStore((state) => state.transactions);
  const currentMonth = useFinanceStore((state) => state.currentMonth);
  const currentYear = useFinanceStore((state) => state.currentYear);
  const fetchTransactions = useFinanceStore((state) => state.fetchTransactions);

  useEffect(() => {
    void fetchTransactions();
  }, [currentMonth, currentYear, fetchTransactions]);

  const dependentSummaries = useMemo(
    () =>
      dependents
        .map((dependent) => {
          const dependentTransactions = transactions.filter(
            (transaction) =>
              transaction.dependentId === dependent.id &&
              transaction.type !== "income" &&
              isTransactionInSelectedCompetence(
                transaction,
                currentMonth,
                currentYear,
              ),
          );
          const total = dependentTransactions.reduce(
            (sum, transaction) =>
              sum +
              (transaction.type === "card"
                ? getCardSignedAmount(transaction)
                : transaction.amount),
            0,
          );
          const cardTotal = dependentTransactions
            .filter((transaction) => transaction.type === "card")
            .reduce(
              (sum, transaction) => sum + getCardSignedAmount(transaction),
              0,
            );
          const fixedTotal = dependentTransactions
            .filter((transaction) => transaction.type !== "card")
            .reduce((sum, transaction) => sum + transaction.amount, 0);
          const biggestExpense = dependentTransactions
            .filter((transaction) => !isCardCreditAdjustment(transaction))
            .sort((left, right) => right.amount - left.amount)[0];

          return {
            ...dependent,
            biggestExpense,
            cardTotal,
            fixedTotal,
            total,
            transactionsCount: dependentTransactions.length,
          };
        })
        .sort((left, right) => right.total - left.total),
    [currentMonth, currentYear, dependents, transactions],
  );

  const totals = useMemo(
    () =>
      dependentSummaries.reduce(
        (acc, dependent) => ({
          card: acc.card + dependent.cardTotal,
          fixed: acc.fixed + dependent.fixedTotal,
          transactions: acc.transactions + dependent.transactionsCount,
          total: acc.total + dependent.total,
        }),
        { card: 0, fixed: 0, total: 0, transactions: 0 },
      ),
    [dependentSummaries],
  );

  return (
    <div className="flex w-full flex-col gap-6 md:gap-8">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Gestão financeira compartilhada
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-white md:text-3xl">
            Dependentes
          </h1>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            Separe gastos de terceiros sem misturar com seu saldo pessoal.
          </p>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          {
            label: "Total vinculado",
            value: brlFormatter.format(totals.total),
            icon: UsersRound,
            tone: "text-zinc-50",
          },
          {
            label: "Cartão",
            value: brlFormatter.format(totals.card),
            icon: CreditCard,
            tone: "text-blue-300",
          },
          {
            label: "Débito/PIX",
            value: brlFormatter.format(totals.fixed),
            icon: ReceiptText,
            tone: "text-emerald-300",
          },
          {
            label: "Lançamentos",
            value: String(totals.transactions),
            icon: TrendingUp,
            tone: "text-amber-300",
          },
        ].map((item) => {
          const Icon = item.icon;

          return (
            <Card
              key={item.label}
              className="rounded-2xl border-zinc-800/80 bg-zinc-950/70 shadow-none"
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                    {item.label}
                  </p>
                  <Icon className="size-4 text-zinc-500" />
                </div>
                <p className={cn("mt-3 text-lg font-semibold", item.tone)}>
                  {item.value}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="xl:col-span-5">
          <DependentManager />
        </div>

        <Card className="border-zinc-800/80 bg-zinc-900/50 shadow-none xl:col-span-7">
          <CardHeader className="border-b border-zinc-800/80">
            <CardTitle>Raio-X por dependente</CardTitle>
            <CardDescription>
              Competência atual: cartão por fatura, débito e fixos por mês civil.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 p-4 md:grid-cols-2">
            {dependentSummaries.length ? (
              dependentSummaries.map((dependent) => (
                <article
                  key={dependent.id}
                  className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-zinc-300">
                        <UserRound className="size-5" />
                      </span>
                      <div className="min-w-0">
                        <h2 className="truncate text-sm font-semibold text-zinc-100">
                          {dependent.name}
                        </h2>
                        <p className="mt-1 text-xs text-zinc-500">
                          {dependent.transactionsCount} lançamento
                          {dependent.transactionsCount === 1 ? "" : "s"}
                        </p>
                      </div>
                    </div>
                    <strong className="shrink-0 text-sm text-zinc-50">
                      {brlFormatter.format(dependent.total)}
                    </strong>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
                      <div className="flex items-center gap-2 text-xs text-zinc-500">
                        <CreditCard className="size-3.5" />
                        Cartão
                      </div>
                      <p className="mt-2 text-sm font-medium text-blue-300">
                        {brlFormatter.format(dependent.cardTotal)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
                      <div className="flex items-center gap-2 text-xs text-zinc-500">
                        <ReceiptText className="size-3.5" />
                        Débito/PIX
                      </div>
                      <p className="mt-2 text-sm font-medium text-emerald-300">
                        {brlFormatter.format(dependent.fixedTotal)}
                      </p>
                    </div>
                  </div>

                  {dependent.biggestExpense ? (
                    <div className="mt-3 flex items-center gap-2 rounded-xl bg-zinc-900/50 px-3 py-2 text-xs text-zinc-400">
                      <TrendingUp className="size-3.5 text-zinc-500" />
                      <span className="min-w-0 flex-1 truncate">
                        Maior gasto: {dependent.biggestExpense.description}
                      </span>
                      <span className="shrink-0 text-zinc-300">
                        {brlFormatter.format(dependent.biggestExpense.amount)}
                      </span>
                    </div>
                  ) : null}
                </article>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-zinc-800 p-6 text-sm leading-6 text-zinc-500 md:col-span-2">
                Nenhum gasto de dependente encontrado no mês atual.
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
