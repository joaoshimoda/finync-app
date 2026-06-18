"use client";

import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  CalendarDays,
  CreditCard,
  PlusCircle,
  QrCode,
  ReceiptText,
  TrendingUp,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { AnimatedMonthSelector } from "@/components/finance/AnimatedMonthSelector";
import { AddCardModal } from "@/components/modals/AddCardModal";
import { AddIncomeModal } from "@/components/modals/AddIncomeModal";
import { AddTransactionModal } from "@/components/modals/AddTransactionModal";
import { TransactionDescription } from "@/components/finance/TransactionDescription";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getCardGradient } from "@/lib/cardUtils";
import { formatDateOnlyBR, getDateOnlyParts } from "@/lib/dateUtils";
import { cn } from "@/lib/utils";
import {
  useFinanceStore,
  type Card as FinanceCard,
  type Transaction,
} from "@/store/useFinanceStore";

const brlFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const typeLabel: Record<string, string> = {
  card: "Cartão",
  fixed: "Fixo",
  income: "Receita",
};

function isSameSelectedMonth(
  transaction: Transaction,
  currentMonth: number,
  currentYear: number,
) {
  const transactionDate = getDateOnlyParts(transaction.date);

  return (
    transactionDate.month === currentMonth && transactionDate.year === currentYear
  );
}

function sortByRecentDate(left: Transaction, right: Transaction) {
  return right.date.localeCompare(left.date);
}

function getCardInvoiceTotal(card: FinanceCard, transactions: Transaction[]) {
  const totalCard = transactions
    .filter(
      (transaction) => {
        const dbCardId =
          (transaction as Transaction & { card_id?: string | null }).card_id ??
          transaction.cardId;

        return transaction.type === "card" && dbCardId === card.id;
      },
    )
    .reduce((total, transaction) => total + transaction.amount, 0);

  return totalCard;
}

export default function DashboardPage() {
  const [isAddCardModalOpen, setIsAddCardModalOpen] = useState(false);
  const [isAddIncomeModalOpen, setIsAddIncomeModalOpen] = useState(false);
  const [isAddTransactionModalOpen, setIsAddTransactionModalOpen] =
    useState(false);
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);

  const cards = useFinanceStore((state) => state.cards);
  const transactions = useFinanceStore((state) => state.transactions);
  const fetchCards = useFinanceStore((state) => state.fetchCards);
  const fetchTransactions = useFinanceStore((state) => state.fetchTransactions);
  const currentMonth = useFinanceStore((state) => state.currentMonth);
  const currentYear = useFinanceStore((state) => state.currentYear);
  const fetchedMonth = useFinanceStore((state) => state.fetchedMonth);
  const fetchedYear = useFinanceStore((state) => state.fetchedYear);
  const isFetching = useFinanceStore((state) => state.isFetching);
  const nextMonth = useFinanceStore((state) => state.nextMonth);
  const prevMonth = useFinanceStore((state) => state.prevMonth);

  const displayMonth = isFetching ? fetchedMonth : currentMonth;
  const displayYear = isFetching ? fetchedYear : currentYear;

  const monthlyTransactions = useMemo(
    () =>
      transactions.filter((transaction) =>
        isSameSelectedMonth(transaction, displayMonth, displayYear),
      ),
    [displayMonth, displayYear, transactions],
  );

  const monthlyBalances = useMemo(() => {
    const totalIncome = monthlyTransactions
      .filter((transaction) => transaction.type === "income")
      .reduce((total, transaction) => total + transaction.amount, 0);
    const totalOutflow = monthlyTransactions
      .filter((transaction) => transaction.type !== "income")
      .reduce((total, transaction) => total + transaction.amount, 0);

    return {
      projectedBalance: totalIncome - totalOutflow,
      totalIncome,
      totalOutflow,
    };
  }, [monthlyTransactions]);

  const recentTransactions = useMemo(
    () => [...monthlyTransactions].sort(sortByRecentDate).slice(0, 10),
    [monthlyTransactions],
  );

  const pendingOutflow = monthlyTransactions
    .filter(
      (transaction) =>
        transaction.type !== "income" && transaction.status !== "paid",
    )
    .reduce((total, transaction) => total + transaction.amount, 0);

  const cardSpendingSummaries = cards.map((card) => ({
    id: card.id,
    name: card.name,
    total: getCardInvoiceTotal(card, monthlyTransactions),
    gradient: getCardGradient(card.name),
  }));

  const fixedSpendingTotal = monthlyTransactions
    .filter((transaction) => transaction.type === "fixed")
    .reduce((total, transaction) => total + transaction.amount, 0);

  const debitPixSpendingTotal = monthlyTransactions
    .filter((transaction) => {
      const dbCardId =
        (transaction as Transaction & { card_id?: string | null }).card_id ??
        transaction.cardId;

      return (
        transaction.type !== "income" &&
        transaction.type !== "fixed" &&
        transaction.type !== "card" &&
        !dbCardId
      );
    })
    .reduce((total, transaction) => total + transaction.amount, 0);

  useEffect(() => {
    void fetchCards();
    void fetchTransactions();
  }, [currentMonth, currentYear, fetchCards, fetchTransactions]);

  function handleCloseIncomeModal() {
    setIsAddIncomeModalOpen(false);
    setEditingTransaction(null);
  }

  function handleCloseTransactionModal() {
    setIsAddTransactionModalOpen(false);
    setEditingTransaction(null);
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 pb-10">
      <div className="mb-2 flex flex-row items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Visão geral
          </h1>
          <p className="text-muted-foreground">
            Acompanhe saldos, faturas e movimentações do período.
          </p>
        </div>

        <div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="h-12 cursor-pointer gap-2 bg-primary px-6 text-base font-semibold text-primary-foreground shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl">
                <PlusCircle className="h-5 w-5" />
                Novo
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem
                onClick={() => {
                  setEditingTransaction(null);
                  setIsAddTransactionModalOpen(true);
                }}
              >
                <ArrowDown className="size-4 text-red-400" />
                Nova Despesa
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setEditingTransaction(null);
                  setIsAddIncomeModalOpen(true);
                }}
              >
                <ArrowUp className="size-4 text-emerald-400" />
                Nova Receita
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsAddCardModalOpen(true)}>
                <CreditCard className="size-4 text-muted-foreground" />
                Novo Cartão
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="mb-4 flex w-full justify-center border-b border-border/50 py-6">
        <AnimatedMonthSelector
          currentMonth={currentMonth}
          currentYear={currentYear}
          onPreviousMonth={prevMonth}
          onNextMonth={nextMonth}
          isLoading={isFetching}
        />
      </div>

      <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card className="rounded-lg border-border bg-card shadow-none">
          <CardHeader>
            <CardDescription>Saldo projetado</CardDescription>
            <CardTitle className="text-2xl tracking-normal">
              {brlFormatter.format(monthlyBalances.projectedBalance)}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
            <ReceiptText className="size-4 text-brand-300" />
            Fim do mês com gastos e faturas deduzidos
          </CardContent>
        </Card>

        <Card className="rounded-lg border-border bg-card shadow-none">
          <CardHeader>
            <CardDescription>Receitas do mês</CardDescription>
            <CardTitle className="text-2xl tracking-normal text-emerald-300">
              {brlFormatter.format(monthlyBalances.totalIncome)}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
            <TrendingUp className="size-4 text-emerald-300" />
            Entradas registradas no período
          </CardContent>
        </Card>

        <Card className="rounded-lg border-border bg-card shadow-none">
          <CardHeader>
            <CardDescription>Gastos pendentes</CardDescription>
            <CardTitle className="text-2xl tracking-normal text-amber-200">
              {brlFormatter.format(pendingOutflow)}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
            <CreditCard className="size-4 text-amber-200" />
            Fixos, faturas e lançamentos em aberto
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-medium tracking-normal text-foreground">
            Minha Carteira
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Cartões, fixos e pagamentos à vista do período.
          </p>
        </div>

        <div className="-mx-5 grid grid-cols-1 gap-4 overflow-x-auto px-5 pb-2 md:mx-0 md:grid-cols-2 md:px-0 lg:grid-cols-4">
          {cardSpendingSummaries.map((cardSummary) => (
            <div
              key={cardSummary.id}
              className={cn(
                "relative min-h-44 min-w-[17rem] overflow-hidden rounded-2xl p-5 text-white shadow-lg",
                cardSummary.gradient,
              )}
            >
              <div className="pointer-events-none absolute -right-10 -top-10 size-28 rounded-full bg-white/10" />
              <div className="pointer-events-none absolute -bottom-12 left-8 size-28 rounded-full bg-black/20" />
              <div className="relative flex items-start justify-between gap-4">
                <div>
                  <div className="mb-4 h-7 w-10 rounded-md border border-white/25 bg-gradient-to-br from-white/40 to-white/10 shadow-inner" />
                  <p className="max-w-40 truncate text-sm font-medium text-white">
                    {cardSummary.name}
                  </p>
                </div>
                <CreditCard className="size-5 text-white/80" />
              </div>
              <div className="relative mt-10 text-right">
                <p className="text-xs font-medium uppercase text-white/60">
                  Fatura do mês
                </p>
                <strong className="mt-1 block text-2xl font-bold tracking-normal text-white">
                  {brlFormatter.format(cardSummary.total)}
                </strong>
              </div>
            </div>
          ))}

          <div className="relative min-h-44 min-w-[17rem] overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 p-5 text-white shadow-lg">
            <div className="pointer-events-none absolute -right-10 -top-10 size-28 rounded-full bg-white/10" />
            <div className="relative flex items-start justify-between gap-4">
              <div>
                <div className="mb-4 flex size-10 items-center justify-center rounded-xl bg-white/15">
                  <CalendarDays className="size-5 text-white" />
                </div>
                <p className="text-sm font-medium text-white">Gastos Fixos</p>
              </div>
              <ReceiptText className="size-5 text-white/80" />
            </div>
            <div className="relative mt-10 text-right">
              <p className="text-xs font-medium uppercase text-white/60">
                Total do mês
              </p>
              <strong className="mt-1 block text-2xl font-bold tracking-normal text-white">
                {brlFormatter.format(fixedSpendingTotal)}
              </strong>
            </div>
          </div>

          <div className="relative min-h-44 min-w-[17rem] overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 p-5 text-white shadow-lg">
            <div className="pointer-events-none absolute -right-10 -top-10 size-28 rounded-full bg-white/10" />
            <div className="relative flex items-start justify-between gap-4">
              <div>
                <div className="mb-4 flex size-10 items-center justify-center rounded-xl bg-white/15">
                  <QrCode className="size-5 text-white" />
                </div>
                <p className="text-sm font-medium text-white">Débito / Pix</p>
              </div>
              <QrCode className="size-5 text-white/80" />
            </div>
            <div className="relative mt-10 text-right">
              <p className="text-xs font-medium uppercase text-white/60">
                Total do mês
              </p>
              <strong className="mt-1 block text-2xl font-bold tracking-normal text-white">
                {brlFormatter.format(debitPixSpendingTotal)}
              </strong>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-medium tracking-normal text-foreground">
              Movimentações recentes
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Últimos dez lançamentos do período selecionado.
            </p>
          </div>
          <Badge variant="outline" className="hidden rounded-lg sm:inline-flex">
            {monthlyTransactions.length} no mês
          </Badge>
        </div>

        <div
          className={cn(
            "overflow-hidden rounded-lg border border-border bg-card transition-opacity",
            isFetching && "pointer-events-none opacity-50",
          )}
        >
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="hidden md:table-cell">Categoria</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentTransactions.length ? (
                recentTransactions.map((transaction) => (
                  <TableRow key={transaction.id} className="hover:bg-muted/35">
                    <TableCell className="text-muted-foreground">
                      {formatDateOnlyBR(transaction.date)}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-foreground">
                        <TransactionDescription transaction={transaction} />
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground md:hidden">
                        {transaction.category || typeLabel[transaction.type]}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant="outline" className="rounded-lg">
                        {transaction.category || typeLabel[transaction.type]}
                      </Badge>
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right font-medium",
                        transaction.type === "income"
                          ? "text-emerald-300"
                          : "text-red-300",
                      )}
                    >
                      {transaction.type === "income" ? "+" : "-"}
                      {brlFormatter.format(transaction.amount)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="h-28 text-center text-muted-foreground"
                  >
                    Nenhuma movimentação neste período.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <Button variant="outline" asChild>
          <Link href="/dashboard/transactions">Ver todas as movimentações</Link>
        </Button>
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
