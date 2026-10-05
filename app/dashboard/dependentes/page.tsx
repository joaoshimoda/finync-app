"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  CreditCard,
  HandCoins,
  ReceiptText,
  TrendingUp,
  UserRound,
  UsersRound,
} from "lucide-react";

import { DependentManager } from "@/components/settings/DependentManager";
import { SettleDependentModal } from "@/components/modals/SettleDependentModal";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { getCardSignedAmount, isCardCreditAdjustment } from "@/lib/cardCredits";
import { formatDateOnlyBR, toDateOnly } from "@/lib/dateUtils";
import { getDependentSettlementSummary } from "@/lib/dependentSettlements";
import { isTransactionInSelectedCompetence } from "@/lib/transactionPeriod";
import { cn } from "@/lib/utils";
import { useFinanceStore } from "@/store/useFinanceStore";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";

export default function DependentesPage() {
  const { formatCurrency } = useCurrencyFormatter();
  const dependents = useFinanceStore((state) => state.dependents);
  const transactions = useFinanceStore((state) => state.transactions);
  const dependentSettlements = useFinanceStore(
    (state) => state.dependentSettlements,
  );
  const currentMonth = useFinanceStore((state) => state.currentMonth);
  const currentYear = useFinanceStore((state) => state.currentYear);
  const fetchTransactions = useFinanceStore((state) => state.fetchTransactions);
  const [selectedDependentId, setSelectedDependentId] = useState<string | null>(
    null,
  );
  const [settlementTargetId, setSettlementTargetId] = useState<string | null>(
    null,
  );

  const competenceMonth = toDateOnly(currentYear, currentMonth, 1);

  useEffect(() => {
    void fetchTransactions();
  }, [currentMonth, currentYear, fetchTransactions]);

  const effectiveSelectedDependentId =
    selectedDependentId &&
    dependents.some((dependent) => dependent.id === selectedDependentId)
      ? selectedDependentId
      : (dependents[0]?.id ?? null);

  const monthlyDependentTransactions = useMemo(
    () =>
      transactions
        .filter(
          (transaction) =>
            Boolean(transaction.dependentId) &&
            transaction.type !== "income" &&
            isTransactionInSelectedCompetence(
              transaction,
              currentMonth,
              currentYear,
            ),
        )
        .sort((left, right) => right.date.localeCompare(left.date)),
    [currentMonth, currentYear, transactions],
  );

  const dependentSummaries = useMemo(
    () =>
      dependents
        .map((dependent) => {
          const dependentTransactions = monthlyDependentTransactions.filter(
            (transaction) => transaction.dependentId === dependent.id,
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
          const settlementSummary = getDependentSettlementSummary(
            dependentTransactions,
            dependentSettlements.filter(
              (settlement) =>
                settlement.competenceMonth === competenceMonth,
            ),
            dependent.id,
          );

          return {
            ...dependent,
            biggestExpense,
            cardTotal,
            fixedTotal,
            total,
            ...settlementSummary,
            transactionsCount: dependentTransactions.length,
          };
        })
        .sort((left, right) => right.total - left.total),
    [competenceMonth, dependentSettlements, dependents, monthlyDependentTransactions],
  );

  const totals = useMemo(
    () =>
      dependentSummaries.reduce(
        (acc, dependent) => ({
          card: acc.card + dependent.cardTotal,
          fixed: acc.fixed + dependent.fixedTotal,
          transactions: acc.transactions + dependent.transactionsCount,
          total: acc.total + dependent.total,
          settled: acc.settled + dependent.settledTotal,
          outstanding: acc.outstanding + dependent.outstanding,
        }),
        {
          card: 0,
          fixed: 0,
          total: 0,
          settled: 0,
          outstanding: 0,
          transactions: 0,
        },
      ),
    [dependentSummaries],
  );

  const selectedDependent = useMemo(
    () =>
      dependentSummaries.find(
        (dependent) => dependent.id === effectiveSelectedDependentId,
      ) ?? null,
    [dependentSummaries, effectiveSelectedDependentId],
  );

  const selectedTransactions = useMemo(
    () =>
      effectiveSelectedDependentId
        ? monthlyDependentTransactions.filter(
            (transaction) =>
              transaction.dependentId === effectiveSelectedDependentId,
          )
        : [],
    [monthlyDependentTransactions, effectiveSelectedDependentId],
  );

  const selectedSettlements = useMemo(
    () =>
      effectiveSelectedDependentId
        ? dependentSettlements.filter(
            (settlement) =>
              settlement.dependentId === effectiveSelectedDependentId &&
              settlement.competenceMonth === competenceMonth &&
              settlement.status === "confirmed",
          )
        : [],
    [competenceMonth, dependentSettlements, effectiveSelectedDependentId],
  );

  const settlementTarget =
    dependentSummaries.find(
      (dependent) => dependent.id === settlementTargetId,
    ) ?? null;

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
            value: formatCurrency(totals.total),
            icon: UsersRound,
            tone: "text-zinc-50",
          },
          {
            label: "Recebido",
            value: formatCurrency(totals.settled),
            icon: CheckCircle2,
            tone: "text-emerald-300",
          },
          {
            label: "A receber",
            value: formatCurrency(totals.outstanding),
            icon: HandCoins,
            tone: "text-amber-300",
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
        <div className="xl:col-span-4">
          <DependentManager
            selectedDependentId={effectiveSelectedDependentId}
            onSelectDependent={setSelectedDependentId}
          />
        </div>

        <div className="space-y-6 xl:col-span-8">
          <Card className="border-zinc-800/80 bg-zinc-900/50 shadow-none">
            <CardHeader className="border-b border-zinc-800/80">
              <CardTitle>Raio-X por dependente</CardTitle>
              <CardDescription>
                Competência atual: cartão por fatura, débito e fixos por mês civil.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 p-4 md:grid-cols-2">
              {dependentSummaries.length ? (
                dependentSummaries.map((dependent) => (
                  <div
                    key={dependent.id}
                    className={cn(
                      "rounded-2xl border p-4 transition-colors",
                      effectiveSelectedDependentId === dependent.id
                        ? "border-emerald-500/40 bg-emerald-500/10"
                        : "border-zinc-800 bg-zinc-950/50 hover:bg-zinc-950",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedDependentId(dependent.id)}
                      className="flex w-full items-start justify-between gap-4 text-left"
                    >
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
                        {formatCurrency(dependent.total)}
                      </strong>
                    </button>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
                        <div className="flex items-center gap-2 text-xs text-zinc-500">
                          <CreditCard className="size-3.5" />
                          Cartão
                        </div>
                        <p className="mt-2 text-sm font-medium text-blue-300">
                          {formatCurrency(dependent.cardTotal)}
                        </p>
                      </div>
                      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
                        <div className="flex items-center gap-2 text-xs text-zinc-500">
                          <ReceiptText className="size-3.5" />
                          Débito/PIX
                        </div>
                        <p className="mt-2 text-sm font-medium text-emerald-300">
                          {formatCurrency(dependent.fixedTotal)}
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
                          {formatCurrency(dependent.biggestExpense.amount)}
                        </span>
                      </div>
                    ) : null}

                    <div className="mt-4 border-t border-zinc-800/80 pt-3">
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <span className="text-zinc-500">
                          Recebido: {formatCurrency(dependent.settledTotal)}
                        </span>
                        <strong
                          className={cn(
                            "font-medium",
                            dependent.outstanding > 0
                              ? "text-amber-300"
                              : "text-emerald-300",
                          )}
                        >
                          {dependent.outstanding > 0
                            ? `A receber: ${formatCurrency(dependent.outstanding)}`
                            : "Quitado"}
                        </strong>
                      </div>
                      <Progress
                        value={dependent.progress}
                        className="mt-2 h-1.5 bg-zinc-800"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className="mt-3 w-full border-zinc-700 bg-zinc-950"
                        disabled={dependent.outstanding <= 0}
                        onClick={() => setSettlementTargetId(dependent.id)}
                      >
                        <HandCoins className="size-4" />
                        {dependent.outstanding > 0
                          ? "Registrar acerto"
                          : "Acerto concluído"}
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-zinc-800 p-6 text-sm leading-6 text-zinc-500 md:col-span-2">
                  Nenhum gasto de dependente encontrado no mês atual.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-zinc-800/80 bg-zinc-950 shadow-none">
            <CardHeader className="border-b border-zinc-800/80">
              <CardTitle>
                {selectedDependent
                  ? `Lançamentos de ${selectedDependent.name}`
                  : "Lançamentos"}
              </CardTitle>
              <CardDescription>
                Extrato filtrado do dependente na competência selecionada.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {selectedSettlements.length ? (
                <div className="border-b border-zinc-800 px-4 py-3">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
                    Acertos desta competência
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedSettlements.map((settlement) => (
                      <div
                        key={settlement.id}
                        className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-xs"
                      >
                        <CheckCircle2 className="size-3.5 text-emerald-500" />
                        <span className="text-zinc-500">
                          {formatDateOnlyBR(settlement.settledAt.slice(0, 10))}
                        </span>
                        <strong className="text-zinc-200">
                          {formatCurrency(settlement.amount)}
                        </strong>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              {selectedTransactions.length ? (
                <div className="divide-y divide-zinc-800">
                  {selectedTransactions.map((transaction) => {
                    const isCard = transaction.type === "card";
                    const amount = isCard
                      ? getCardSignedAmount(transaction)
                      : transaction.amount;

                    return (
                      <div
                        key={transaction.id}
                        className="flex items-center justify-between gap-4 px-4 py-4"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-zinc-400">
                            {isCard ? (
                              <CreditCard className="size-4" />
                            ) : (
                              <ReceiptText className="size-4" />
                            )}
                          </span>
                          <div className="min-w-0">
                            <div className="flex min-w-0 items-center gap-2">
                              <p className="truncate text-sm font-medium text-zinc-100">
                                {transaction.description}
                              </p>
                              <Badge
                                variant="outline"
                                className="shrink-0 border-zinc-700 text-[10px] text-zinc-400"
                              >
                                {isCard ? "Cartão" : "Débito/PIX"}
                              </Badge>
                            </div>
                            <p className="mt-1 text-xs text-zinc-500">
                              {transaction.category || "Outros"} •{" "}
                              {formatDateOnlyBR(transaction.date)}
                            </p>
                          </div>
                        </div>
                        <strong className="shrink-0 text-sm text-zinc-50">
                          {formatCurrency(amount)}
                        </strong>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-6 text-sm leading-6 text-zinc-500">
                  {selectedDependent
                    ? "Este dependente não possui lançamentos na competência selecionada."
                    : "Selecione um dependente para visualizar os lançamentos."}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      <SettleDependentModal
        dependent={settlementTarget}
        competenceMonth={competenceMonth}
        obligationTotal={settlementTarget?.obligationTotal ?? 0}
        settledTotal={settlementTarget?.settledTotal ?? 0}
        open={Boolean(settlementTarget)}
        onOpenChange={(open) => {
          if (!open) setSettlementTargetId(null);
        }}
      />
    </div>
  );
}
