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
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
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
import {
  formatDateOnlyBR,
  getDateOnlyParts,
  normalizeDateOnly,
  toDateOnly,
} from "@/lib/dateUtils";
import { cn } from "@/lib/utils";
import {
  useFinanceStore,
  type Transaction,
} from "@/store/useFinanceStore";
import { toast } from "sonner";

const brlFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const typeLabel: Record<string, string> = {
  card: "Cartão",
  fixed: "Débito/PIX",
  income: "Receita",
};

function getTransactionFallbackLabel(transaction: Transaction) {
  if (transaction.type === "fixed" && transaction.is_recurring) return "Fixo";

  return typeLabel[transaction.type];
}

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
  const payCardInvoice = useFinanceStore((state) => state.payCardInvoice);
  const currentMonth = useFinanceStore((state) => state.currentMonth);
  const currentYear = useFinanceStore((state) => state.currentYear);
  const fetchedMonth = useFinanceStore((state) => state.fetchedMonth);
  const fetchedYear = useFinanceStore((state) => state.fetchedYear);
  const isFetching = useFinanceStore((state) => state.isFetching);
  const nextMonth = useFinanceStore((state) => state.nextMonth);
  const prevMonth = useFinanceStore((state) => state.prevMonth);

  const displayMonth = isFetching ? fetchedMonth : currentMonth;
  const displayYear = isFetching ? fetchedYear : currentYear;
  const todayDate = useMemo(() => {
    const today = new Date();

    return toDateOnly(
      today.getFullYear(),
      today.getMonth() + 1,
      today.getDate(),
    );
  }, []);

  const monthlyTransactions = useMemo(
    () =>
      transactions.filter((transaction) =>
        isSameSelectedMonth(transaction, displayMonth, displayYear),
      ),
    [displayMonth, displayYear, transactions],
  );

  const monthlyBalances = useMemo(() => {
    const totals = monthlyTransactions.reduce(
      (acc, transaction) => {
        if (transaction.type === "income") {
          acc.totalIncome += transaction.amount;
          return acc;
        }

        if (transaction.type === "card") {
          acc.creditCardProjected += transaction.amount;

          if (normalizeDateOnly(transaction.date) <= todayDate) {
            acc.creditCardUntilToday += transaction.amount;
          }

          if (transaction.status !== "paid") {
            acc.pendingObligations += transaction.amount;
          }

          return acc;
        }

        acc.nonCardTotal += transaction.amount;

        if (transaction.status !== "paid") {
          acc.nonCardPending += transaction.amount;
          acc.pendingObligations += transaction.amount;
        }

        return acc;
      },
      {
        creditCardProjected: 0,
        creditCardUntilToday: 0,
        nonCardTotal: 0,
        nonCardPending: 0,
        pendingObligations: 0,
        totalIncome: 0,
      },
    );

    return {
      ...totals,
      availableBalance:
        totals.totalIncome - totals.nonCardTotal - totals.creditCardUntilToday,
      projectedBalance:
        totals.totalIncome - totals.nonCardTotal - totals.creditCardProjected,
      totalPendingObligations: totals.pendingObligations,
    };
  }, [monthlyTransactions, todayDate]);

  const recentTransactions = useMemo(
    () => [...monthlyTransactions].sort(sortByRecentDate).slice(0, 10),
    [monthlyTransactions],
  );

  const cardSpendingSummaries = cards.map((card) => ({
    id: card.id,
    name: card.name,
    gradient: getCardGradient(card.name),
    ...monthlyTransactions
      .filter((transaction) => {
        const dbCardId =
          (transaction as Transaction & { card_id?: string | null }).card_id ??
          transaction.cardId;

        return transaction.type === "card" && dbCardId === card.id;
      })
      .reduce(
        (totals, transaction) => {
          totals.projected += transaction.amount;

          if (normalizeDateOnly(transaction.date) <= todayDate) {
            totals.current += transaction.amount;
          }

          return totals;
        },
        { current: 0, projected: 0 },
      ),
  }));

  const fixedSpendingTotal = monthlyTransactions
    .filter(
      (transaction) =>
        transaction.type === "fixed" && transaction.is_recurring === true,
    )
    .reduce((total, transaction) => total + transaction.amount, 0);

  const debitPixSpendingTotal = monthlyTransactions
    .filter((transaction) => {
      const dbCardId =
        (transaction as Transaction & { card_id?: string | null }).card_id ??
        transaction.cardId;

      return (
        transaction.type === "fixed" &&
        transaction.is_recurring !== true &&
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

  async function handlePayInvoiceClick(cardId: string) {
    try {
      await payCardInvoice(cardId);
      toast.success("Fatura liquidada!");
      await fetchTransactions();
    } catch (error) {
      console.error("Erro ao liquidar fatura:", error);
      toast.error("Não foi possível liquidar a fatura.");
    }
  }

  return (
    <div className="flex w-full flex-col gap-8">
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
            <DropdownMenuContent align="end" className="w-80 p-2">
              <DropdownMenuItem
                className="cursor-pointer gap-4 rounded-xl p-3"
                onClick={() => {
                  setEditingTransaction(null);
                  setIsAddTransactionModalOpen(true);
                }}
              >
                <div className="rounded-full bg-red-500/10 p-2.5 text-red-500">
                  <ArrowDown className="size-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-base font-medium">Nova Despesa</span>
                  <span className="text-xs text-muted-foreground">
                    Registre um gasto, pix ou boleto
                  </span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer gap-4 rounded-xl p-3"
                onClick={() => {
                  setEditingTransaction(null);
                  setIsAddIncomeModalOpen(true);
                }}
              >
                <div className="rounded-full bg-green-500/10 p-2.5 text-green-500">
                  <ArrowUp className="size-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-base font-medium">Nova Receita</span>
                  <span className="text-xs text-muted-foreground">
                    Adicione seu salário ou entrada
                  </span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer gap-4 rounded-xl p-3"
                onClick={() => setIsAddCardModalOpen(true)}
              >
                <div className="rounded-full bg-purple-500/10 p-2.5 text-purple-500">
                  <CreditCard className="size-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-base font-medium">Novo Cartão</span>
                  <span className="text-xs text-muted-foreground">
                    Cadastre um cartão de crédito
                  </span>
                </div>
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

      <section>
        <div className="mb-8 flex flex-wrap gap-4">
          <Card className="w-full flex-none rounded-lg border-border bg-card p-6 shadow-none sm:w-[240px] md:w-[260px] lg:w-[250px] xl:w-[260px]">
            <CardHeader className="p-0">
              <CardDescription>Saldo Disponível Total</CardDescription>
              <CardTitle className="text-4xl tracking-normal">
                {brlFormatter.format(monthlyBalances.projectedBalance)}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-2 p-0 pt-5 text-sm text-muted-foreground">
              <ReceiptText className="size-4 text-brand-300" />
              Após todos os compromissos do mês
            </CardContent>
          </Card>

          <Card className="w-full flex-none rounded-lg border-border bg-card p-6 shadow-none sm:w-[240px] md:w-[260px] lg:w-[250px] xl:w-[260px]">
            <CardHeader className="p-0">
              <CardDescription>Receitas</CardDescription>
              <CardTitle className="text-4xl tracking-normal text-emerald-300">
                {brlFormatter.format(monthlyBalances.totalIncome)}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-2 p-0 pt-5 text-sm text-muted-foreground">
              <TrendingUp className="size-4 text-emerald-300" />
              Entradas registradas no mês
            </CardContent>
          </Card>

          <Card className="w-full flex-none rounded-lg border-border bg-card shadow-none sm:w-[240px] md:w-[260px] lg:w-[250px] xl:w-[260px]">
            <CardHeader>
              <CardDescription>Fatura Atual</CardDescription>
              <CardTitle className="text-2xl tracking-normal text-red-300">
                {brlFormatter.format(monthlyBalances.creditCardUntilToday)}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
              <CreditCard className="size-4 text-red-300" />
              Cartão lançado até hoje
            </CardContent>
          </Card>

          <Card className="w-full flex-none rounded-lg border-border bg-card shadow-none sm:w-[240px] md:w-[260px] lg:w-[250px] xl:w-[260px]">
            <CardHeader>
              <CardDescription>Fatura Total</CardDescription>
              <CardTitle className="text-2xl tracking-normal text-amber-200">
                {brlFormatter.format(monthlyBalances.creditCardProjected)}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
              <CreditCard className="size-4 text-amber-200" />
              Total projetado do cartão no mês
            </CardContent>
          </Card>

          <Card className="w-full flex-none rounded-lg border-border bg-card shadow-none sm:w-[240px] md:w-[260px] lg:w-[250px] xl:w-[260px]">
            <CardHeader>
              <CardDescription>Gastos Totais Pendentes</CardDescription>
              <CardTitle className="text-2xl tracking-normal text-orange-300">
                {brlFormatter.format(monthlyBalances.totalPendingObligations)}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
              <ReceiptText className="size-4 text-orange-300" />
              Pendências manuais e fatura do cartão
            </CardContent>
          </Card>
        </div>
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

        <div className="flex flex-nowrap gap-6 overflow-x-auto overflow-y-hidden pb-4 snap-x snap-mandatory scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {cardSpendingSummaries.map((cardSummary) => (
            <div
              key={cardSummary.id}
              className={cn(
                "relative h-[200px] w-full max-w-[340px] flex-none shrink-0 snap-start overflow-hidden rounded-2xl p-5 text-white shadow-lg",
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
                  Fatura atual
                </p>
                <strong className="mt-1 block text-3xl font-bold tracking-normal text-white">
                  {brlFormatter.format(cardSummary.current)}
                </strong>
                <p className="mt-1 text-sm text-white/70">
                  Projetado: {brlFormatter.format(cardSummary.projected)}
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="mt-3 h-8 border-white/25 bg-white/10 px-3 text-xs text-white hover:bg-white/20 hover:text-white"
                  onClick={() => handlePayInvoiceClick(cardSummary.id)}
                >
                  Pagar Fatura
                </Button>
              </div>
            </div>
          ))}

          <div className="relative h-[200px] w-full max-w-[340px] flex-none shrink-0 snap-start overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 p-5 text-white shadow-lg">
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
              <strong className="mt-1 block text-3xl font-bold tracking-normal text-white">
                {brlFormatter.format(fixedSpendingTotal)}
              </strong>
            </div>
          </div>

          <div className="relative h-[200px] w-full max-w-[340px] flex-none shrink-0 snap-start overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 p-5 text-white shadow-lg">
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
              <strong className="mt-1 block text-3xl font-bold tracking-normal text-white">
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
                <TableHead className="hidden lg:table-cell">Origem</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentTransactions.length ? (
                recentTransactions.map((transaction) => {
                  const originLabel =
                    transaction.type === "card"
                      ? cards.find((card) => card.id === transaction.cardId)
                          ?.name ?? "Crédito"
                      : getTransactionFallbackLabel(transaction);

                  return (
                    <TableRow
                      key={transaction.id}
                      className="hover:bg-muted/35"
                    >
                      <TableCell className="text-muted-foreground">
                        {formatDateOnlyBR(transaction.date)}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-foreground">
                          <TransactionDescription transaction={transaction} />
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground md:hidden">
                          {transaction.category || getTransactionFallbackLabel(transaction)}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant="outline" className="rounded-lg">
                          {transaction.category || getTransactionFallbackLabel(transaction)}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground lg:table-cell">
                        {originLabel}
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
                  );
                })
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={5}
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
