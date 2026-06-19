"use client";

import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  CalendarDays,
  CreditCard,
  Inbox,
  PlusCircle,
  QrCode,
  ReceiptText,
  RotateCcw,
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
  if (
    transaction.is_recurring &&
    (transaction.type === "card" || Boolean(transaction.cardId))
  ) {
    return "Assinatura";
  }

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

interface CardSpendingSummary {
  id: string;
  name: string;
  closingDay?: number;
  dueDay?: number;
  accentClassName: string;
  current: number;
  projected: number;
}

function getCardAccentClassName(cardName: string) {
  const normalizedName = cardName.toLowerCase();

  if (normalizedName.includes("nubank")) return "border-l-purple-500";
  if (normalizedName.includes("itaú") || normalizedName.includes("itau")) {
    return "border-l-orange-500";
  }
  if (normalizedName.includes("c6") || normalizedName.includes("black")) {
    return "border-l-zinc-500";
  }
  if (
    normalizedName.includes("mercado pago") ||
    normalizedName.includes("mercadopago")
  ) {
    return "border-l-cyan-400";
  }
  if (normalizedName.includes("inter")) return "border-l-orange-400";
  if (normalizedName.includes("bradesco")) return "border-l-red-600";
  if (normalizedName.includes("santander")) return "border-l-red-500";
  if (
    normalizedName.includes("banco do brasil") ||
    normalizedName.includes("bb")
  ) {
    return "border-l-yellow-400";
  }
  if (normalizedName.includes("caixa")) return "border-l-blue-500";

  return "border-l-slate-500";
}

function FlippableWalletCard({
  cardSummary,
  onPayInvoice,
}: {
  cardSummary: CardSpendingSummary;
  onPayInvoice: (cardId: string) => void;
}) {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div className="h-[176px] w-full perspective-[1000px] lg:w-[280px]">
      <div
        className={cn(
          "relative h-full w-full transition-all duration-500 [transform-style:preserve-3d]",
          isFlipped && "[transform:rotateY(180deg)]",
        )}
      >
        <div
          className={cn(
            "absolute inset-0 overflow-hidden rounded-2xl border border-l-4 border-border/50 bg-card p-4 text-foreground shadow-sm [backface-visibility:hidden]",
            cardSummary.accentClassName,
          )}
        >
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <div className="mb-3 h-6 w-9 rounded-md border border-border bg-muted shadow-inner" />
              <p className="max-w-36 truncate text-xs font-medium text-foreground">
                {cardSummary.name}
              </p>
            </div>
            <button
              type="button"
              className="inline-flex size-7 items-center justify-center rounded-full bg-muted text-muted-foreground transition hover:bg-accent hover:text-foreground"
              onClick={() => setIsFlipped(true)}
              aria-label={`Virar cartão ${cardSummary.name}`}
            >
              <RotateCcw className="size-4" />
            </button>
          </div>
          <p className="relative mt-2 text-xs text-muted-foreground">
            {cardSummary.closingDay
              ? `Fecha dia ${cardSummary.closingDay}`
              : "Fechamento livre"}
            {" • "}
            {cardSummary.dueDay
              ? `Vence dia ${cardSummary.dueDay}`
              : "Sem vencimento"}
          </p>
          <div className="relative mt-5 text-right">
            <p className="text-xs font-medium uppercase text-muted-foreground">
              Fatura atual
            </p>
            <strong className="mt-1 block text-xl font-bold tracking-normal text-foreground">
              {brlFormatter.format(cardSummary.current)}
            </strong>
          </div>
        </div>

        <div
          className={cn(
            "absolute inset-0 flex flex-col justify-between overflow-hidden rounded-2xl border border-l-4 border-border/50 bg-card p-4 text-foreground shadow-sm [backface-visibility:hidden] [transform:rotateY(180deg)]",
            cardSummary.accentClassName,
          )}
        >
          <div className="relative">
            <p className="text-xs font-medium uppercase text-muted-foreground">
              Fatura projetada
            </p>
            <strong className="mt-1 block text-2xl font-bold text-foreground">
              {brlFormatter.format(cardSummary.projected)}
            </strong>
          </div>
          <div className="relative grid gap-2">
            <Button
              type="button"
              size="sm"
              className="h-8 bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={() => onPayInvoice(cardSummary.id)}
            >
              Pagar Fatura
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8"
              onClick={() => setIsFlipped(false)}
            >
              Voltar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
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
    closingDay: card.closingDay,
    dueDay: card.dueDay,
    accentClassName: getCardAccentClassName(card.name),
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
    <div className="flex w-full flex-col gap-3 lg:gap-2">
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">
            Visão geral
          </h1>
          <p className="text-sm text-muted-foreground lg:text-base">
            Acompanhe saldos, faturas e movimentações do período.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <AnimatedMonthSelector
            currentMonth={currentMonth}
            currentYear={currentYear}
            onPreviousMonth={prevMonth}
            onNextMonth={nextMonth}
            isLoading={isFetching}
          />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="h-10 cursor-pointer gap-2 bg-emerald-600 px-4 text-sm font-semibold text-white shadow-lg shadow-emerald-950/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-xl">
                <PlusCircle className="h-4 w-4" />
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

      <section>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-2">
          <Card className="w-full rounded-lg border border-border/50 bg-card p-3 shadow-none transition-colors hover:bg-accent/10">
            <CardHeader className="p-0">
              <CardDescription>Saldo Disponível Total</CardDescription>
              <CardTitle className="text-lg tracking-normal lg:text-xl">
                {brlFormatter.format(monthlyBalances.projectedBalance)}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-2 p-0 pt-2 text-xs text-muted-foreground">
              <ReceiptText className="size-4 text-brand-300" />
              Após todos os compromissos do mês
            </CardContent>
          </Card>

          <Card className="w-full rounded-lg border border-border/50 bg-card p-3 shadow-none transition-colors hover:bg-accent/10">
            <CardHeader className="p-0">
              <CardDescription>Receitas</CardDescription>
              <CardTitle className="text-lg tracking-normal text-emerald-300 lg:text-xl">
                {brlFormatter.format(monthlyBalances.totalIncome)}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-2 p-0 pt-2 text-xs text-muted-foreground">
              <TrendingUp className="size-4 text-emerald-300" />
              Entradas registradas no mês
            </CardContent>
          </Card>

          <Card className="w-full rounded-lg border border-border/50 bg-card p-3 shadow-none transition-colors hover:bg-accent/10">
            <CardHeader className="p-0">
              <CardDescription>Faturas do Mês</CardDescription>
              <CardTitle className="text-2xl tracking-normal text-red-300">
                {brlFormatter.format(monthlyBalances.creditCardUntilToday)}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-2 p-0 pt-2 text-xs text-muted-foreground">
              <CreditCard className="size-4 text-red-300" />
              Total projetado: {brlFormatter.format(monthlyBalances.creditCardProjected)}
            </CardContent>
          </Card>

          <Card className="w-full rounded-lg border border-border/50 bg-card p-3 shadow-none transition-colors hover:bg-accent/10">
            <CardHeader className="p-0">
              <CardDescription>Gastos Totais Pendentes</CardDescription>
              <CardTitle className="text-xl tracking-normal text-orange-300">
                {brlFormatter.format(monthlyBalances.totalPendingObligations)}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-2 p-0 pt-2 text-xs text-muted-foreground">
              <ReceiptText className="size-4 text-orange-300" />
              Pendências manuais e fatura do cartão
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="space-y-1">
        <div>
          <h2 className="text-lg font-medium tracking-normal text-foreground">
            Minha Carteira
          </h2>
          <p className="text-sm text-muted-foreground">
            Cartões, fixos e pagamentos à vista do período.
          </p>
        </div>

        <Carousel opts={{ dragFree: true }} className="w-full">
          <CarouselContent className="-ml-4 px-2 pt-2 pb-6">
          {cardSpendingSummaries.map((cardSummary) => (
            <CarouselItem key={cardSummary.id} className="basis-full pl-4 lg:basis-auto">
              <FlippableWalletCard
                cardSummary={cardSummary}
                onPayInvoice={(cardId) => void handlePayInvoiceClick(cardId)}
              />
            </CarouselItem>
          ))}

            <CarouselItem className="basis-full pl-4 lg:basis-auto">
              <div className="relative h-[176px] w-full shrink-0 overflow-hidden rounded-2xl border border-l-4 border-border/50 border-l-blue-500 bg-card p-4 text-foreground shadow-sm lg:w-[280px]">
            <div className="relative flex items-start justify-between gap-4">
              <div>
                <div className="mb-3 flex size-8 items-center justify-center rounded-xl bg-blue-500/10">
                  <CalendarDays className="size-4 text-blue-300" />
                </div>
                <p className="text-xs font-medium text-foreground">Gastos Fixos</p>
              </div>
              <ReceiptText className="size-4 text-blue-300" />
            </div>
            <div className="relative mt-6 text-right">
              <p className="text-xs font-medium uppercase text-muted-foreground">
                Total do mês
              </p>
                  <strong className="mt-1 block text-xl font-bold tracking-normal text-foreground">
                {brlFormatter.format(fixedSpendingTotal)}
              </strong>
            </div>
              </div>
            </CarouselItem>

            <CarouselItem className="basis-full pl-4 lg:basis-auto">
              <div className="relative h-[176px] w-full shrink-0 overflow-hidden rounded-2xl border border-l-4 border-border/50 border-l-emerald-500 bg-card p-4 text-foreground shadow-sm lg:w-[280px]">
            <div className="relative flex items-start justify-between gap-4">
              <div>
                <div className="mb-3 flex size-8 items-center justify-center rounded-xl bg-emerald-500/10">
                  <QrCode className="size-4 text-emerald-300" />
                </div>
                <p className="text-xs font-medium text-foreground">Débito / Pix</p>
              </div>
              <QrCode className="size-4 text-emerald-300" />
            </div>
            <div className="relative mt-6 text-right">
              <p className="text-xs font-medium uppercase text-muted-foreground">
                Total do mês
              </p>
                  <strong className="mt-1 block text-xl font-bold tracking-normal text-foreground">
                {brlFormatter.format(debitPixSpendingTotal)}
              </strong>
            </div>
              </div>
            </CarouselItem>
          </CarouselContent>
          <CarouselPrevious className="absolute -left-12 z-50 hidden bg-background/80 lg:-left-16 lg:inline-flex" />
          <CarouselNext className="absolute -right-12 z-50 hidden bg-background/80 lg:-right-16 lg:inline-flex" />
        </Carousel>
      </section>

      <section className="space-y-1">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-medium tracking-normal text-foreground">
              Movimentações recentes
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Últimos dez lançamentos do período selecionado.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="hidden rounded-lg lg:inline-flex">
              {monthlyTransactions.length} no mês
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              className="text-sm text-muted-foreground hover:text-primary"
              asChild
            >
              <Link href="/dashboard/transactions">
                Ver todas as movimentações
              </Link>
            </Button>
          </div>
        </div>

        <div
          className={cn(
            "overflow-hidden rounded-lg border border-border/50 bg-card transition-opacity",
            isFetching && "pointer-events-none opacity-50",
          )}
        >
          <Table className="min-w-[640px] lg:min-w-full">
            <TableHeader className="bg-muted/30">
              <TableRow className="hover:bg-transparent">
                <TableHead>Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="hidden lg:table-cell">Categoria</TableHead>
                <TableHead className="hidden lg:table-cell">Origem</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentTransactions.length ? (
                recentTransactions.map((transaction) => {
                  const originLabel =
                    transaction.is_recurring &&
                    (transaction.type === "card" || Boolean(transaction.cardId))
                      ? "Assinatura"
                      : transaction.type === "card"
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
                        <div className="mt-1 text-xs text-muted-foreground lg:hidden">
                          {transaction.category || getTransactionFallbackLabel(transaction)}
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
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
                <TableRow className="hover:bg-transparent">
                  <TableCell
                    colSpan={5}
                    className="h-40 text-center text-muted-foreground"
                  >
                    <div className="flex h-full flex-col items-center justify-center gap-2">
                      <Inbox className="size-7 text-muted-foreground/60" />
                      <span>Nenhuma movimentação neste período.</span>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

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
