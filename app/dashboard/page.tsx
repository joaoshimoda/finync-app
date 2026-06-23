"use client";

import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  CalendarDays,
  ChevronRight,
  CreditCard,
  Inbox,
  PlusCircle,
  QrCode,
  ReceiptText,
  RotateCcw,
  TrendingUp,
  UserRound,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AnimatedMonthSelector } from "@/components/finance/AnimatedMonthSelector";
import { AddCardModal } from "@/components/modals/AddCardModal";
import { AddIncomeModal } from "@/components/modals/AddIncomeModal";
import { AddTransactionModal } from "@/components/modals/AddTransactionModal";
import { TransactionDescription } from "@/components/finance/TransactionDescription";
import { MobileTransactionItem } from "@/components/finance/MobileTransactionItem";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  calculateAvailableCardLimit,
  calculateCardDebt,
  getCardSignedAmount,
  isCardCreditAdjustment,
} from "@/lib/cardCredits";
import { isPendingVariableIncome } from "@/lib/incomeRecurrence";
import { cn } from "@/lib/utils";
import { isTransactionInSelectedPeriod } from "@/lib/transactionPeriod";
import { aggregatePeriodExpenses } from "@/lib/financeAggregation";
import {
  useFinanceStore,
  type Transaction,
} from "@/store/useFinanceStore";
import { toast } from "sonner";

const brlFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const hiddenCurrencyLabel = "R$ ••••";

function formatSensitiveCurrency(value: number, hideValue: boolean) {
  return hideValue ? hiddenCurrencyLabel : brlFormatter.format(value);
}

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
  return isTransactionInSelectedPeriod(
    transaction,
    currentMonth,
    currentYear,
  );
}

function isSameSelectedInvoiceCycle(
  transaction: Transaction,
  currentMonth: number,
  currentYear: number,
) {
  const billingDate = getDateOnlyParts(
    transaction.billingMonthStart ?? transaction.date,
  );

  return (
    transaction.type === "card" &&
    billingDate.month === currentMonth &&
    billingDate.year === currentYear
  );
}

function sortByRecentDate(left: Transaction, right: Transaction) {
  const dateOrder = right.date.localeCompare(left.date);

  if (dateOrder !== 0) return dateOrder;

  return (right.createdAt ?? "").localeCompare(left.createdAt ?? "");
}

function hasDependent(transaction: Transaction) {
  return Boolean(
    (transaction as Transaction & { dependent_id?: string | null })
      .dependent_id ?? transaction.dependentId,
  );
}

function calculatePendingExpenses(
  calendarTransactions: Transaction[],
  invoiceTransactions: Transaction[],
  excludeDependents = false,
) {
  const pendingCalendarExpenses = calendarTransactions
    .filter(
      (transaction) =>
        transaction.type === "fixed" &&
        transaction.status !== "paid" &&
        (!excludeDependents || !hasDependent(transaction)),
    )
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  const pendingCardExpenses = invoiceTransactions
    .filter(
      (transaction) =>
        transaction.status !== "paid" &&
        (!excludeDependents || !hasDependent(transaction)),
    )
    .reduce(
      (sum, transaction) => sum + getCardSignedAmount(transaction),
      0,
    );

  return Math.max(pendingCalendarExpenses, 0) + Math.max(pendingCardExpenses, 0);
}

interface CardSpendingSummary {
  id: string;
  name: string;
  closingDay?: number;
  dueDay?: number;
  accentClassName: string;
  availableLimit: number;
  current: number;
  debtTotal: number;
  limitAmount: number;
  limitUsage: number;
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
  const hideBalancesByDefault = useFinanceStore(
    (state) => state.hideBalancesByDefault,
  );

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
              {formatSensitiveCurrency(
                cardSummary.current,
                hideBalancesByDefault,
              )}
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
              Limite disponível
            </p>
            <strong className="mt-1 block text-2xl font-bold text-foreground">
              {formatSensitiveCurrency(
                cardSummary.availableLimit,
                hideBalancesByDefault,
              )}
            </strong>
            <p className="mt-1 text-xs text-muted-foreground">
              Devedor:{" "}
              {formatSensitiveCurrency(
                cardSummary.debtTotal,
                hideBalancesByDefault,
              )}
            </p>
            {cardSummary.limitAmount > 0 ? (
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-emerald-500"
                  style={{ width: `${cardSummary.limitUsage}%` }}
                />
              </div>
            ) : null}
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
  const [variableIncomeValues, setVariableIncomeValues] = useState<
    Record<string, string>
  >({});

  const cards = useFinanceStore((state) => state.cards);
  const dependents = useFinanceStore((state) => state.dependents);
  const transactions = useFinanceStore((state) => state.transactions);
  const fetchCards = useFinanceStore((state) => state.fetchCards);
  const fetchDependents = useFinanceStore((state) => state.fetchDependents);
  const fetchTransactions = useFinanceStore((state) => state.fetchTransactions);
  const payCardInvoice = useFinanceStore((state) => state.payCardInvoice);
  const updateTransaction = useFinanceStore((state) => state.updateTransaction);
  const currentMonth = useFinanceStore((state) => state.currentMonth);
  const currentYear = useFinanceStore((state) => state.currentYear);
  const fetchedMonth = useFinanceStore((state) => state.fetchedMonth);
  const fetchedYear = useFinanceStore((state) => state.fetchedYear);
  const isFetching = useFinanceStore((state) => state.isFetching);
  const nextMonth = useFinanceStore((state) => state.nextMonth);
  const prevMonth = useFinanceStore((state) => state.prevMonth);
  const hideBalancesByDefault = useFinanceStore(
    (state) => state.hideBalancesByDefault,
  );
  const formatPrivateCurrency = (value: number) =>
    formatSensitiveCurrency(value, hideBalancesByDefault);

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

  const invoiceCycleTransactions = useMemo(
    () =>
      transactions.filter((transaction) =>
        isSameSelectedInvoiceCycle(transaction, displayMonth, displayYear),
      ),
    [displayMonth, displayYear, transactions],
  );

  const pendingExpensesTotal = useMemo(
    () =>
      calculatePendingExpenses(
        monthlyTransactions,
        invoiceCycleTransactions,
      ),
    [invoiceCycleTransactions, monthlyTransactions],
  );

  const personalPendingExpensesTotal = useMemo(
    () =>
      calculatePendingExpenses(
        monthlyTransactions,
        invoiceCycleTransactions,
        true,
      ),
    [invoiceCycleTransactions, monthlyTransactions],
  );

  const personalExpenseTotals = useMemo(
    () =>
      aggregatePeriodExpenses(transactions, displayMonth, displayYear, {
        excludeDependents: true,
      }),
    [displayMonth, displayYear, transactions],
  );

  const monthlyBalances = useMemo(() => {
    const totals = monthlyTransactions.reduce(
      (acc, transaction) => {
        const isDependentTransaction = hasDependent(transaction);

        if (transaction.type === "income") {
          if (isPendingVariableIncome(transaction)) {
            return acc;
          }

          acc.totalIncome += transaction.amount;
          return acc;
        }

        if (transaction.type === "card") return acc;

        if (isDependentTransaction) {
          return acc;
        }

        return acc;
      },
      {
        creditCardProjected: 0,
        creditCardUntilToday: 0,
        nonCardTotal: 0,
        totalIncome: 0,
        userCreditCardProjected: 0,
        userCreditCardUntilToday: 0,
      },
    );

    invoiceCycleTransactions.forEach((transaction) => {
      const signedAmount = getCardSignedAmount(transaction);
      const isDependentTransaction = hasDependent(transaction);
      const isAlreadyInOpenInvoice =
        transaction.is_recurring !== true ||
        normalizeDateOnly(transaction.date) <= todayDate;

      totals.creditCardProjected += signedAmount;

      if (isAlreadyInOpenInvoice) {
        totals.creditCardUntilToday += signedAmount;
      }

      if (isDependentTransaction) return;

      totals.userCreditCardProjected += signedAmount;

      if (isAlreadyInOpenInvoice) {
        totals.userCreditCardUntilToday += signedAmount;
      }

    });

    return {
      ...totals,
      nonCardTotal: personalExpenseTotals.fixed,
      userCreditCardProjected: personalExpenseTotals.card,
      availableBalance:
        totals.totalIncome -
        personalExpenseTotals.fixed -
        totals.userCreditCardUntilToday,
      projectedBalance:
        totals.totalIncome - personalExpenseTotals.total,
      totalPendingObligations: pendingExpensesTotal,
      personalPendingObligations: personalPendingExpensesTotal,
      dependentPendingObligations: Math.max(
        pendingExpensesTotal - personalPendingExpensesTotal,
        0,
      ),
      dependentCreditCardUntilToday: Math.max(
        totals.creditCardUntilToday - totals.userCreditCardUntilToday,
        0,
      ),
    };
  }, [
    invoiceCycleTransactions,
    monthlyTransactions,
    pendingExpensesTotal,
    personalPendingExpensesTotal,
    personalExpenseTotals,
    todayDate,
  ]);

  const recentTransactions = useMemo(
    () => [...monthlyTransactions].sort(sortByRecentDate).slice(0, 10),
    [monthlyTransactions],
  );

  const personalSpendingDistribution = useMemo(() => {
    const categoryTotals = new Map<string, number>();

    monthlyTransactions.forEach((transaction) => {
      if (transaction.type === "income" || hasDependent(transaction)) return;

      const amount =
        transaction.type === "card"
          ? getCardSignedAmount(transaction)
          : transaction.amount;

      if (amount <= 0) return;

      const category = transaction.category?.trim() || "Outros";

      categoryTotals.set(category, (categoryTotals.get(category) ?? 0) + amount);
    });

    const sortedCategories = [...categoryTotals.entries()].sort(
      (left, right) => right[1] - left[1],
    );
    const total = sortedCategories.reduce((sum, [, amount]) => sum + amount, 0);
    const explicitOtherTotal = categoryTotals.get("Outros") ?? 0;
    const categorizedExpenses = sortedCategories.filter(
      ([label]) => label !== "Outros",
    );
    const primaryCategories = categorizedExpenses.slice(0, 3);
    const remainingTotal = categorizedExpenses
      .slice(3)
      .reduce((sum, [, amount]) => sum + amount, 0);
    const consolidatedOtherTotal = explicitOtherTotal + remainingTotal;
    const categories = consolidatedOtherTotal > 0
      ? [
          ...primaryCategories,
          ["Outros", consolidatedOtherTotal] as [string, number],
        ]
      : primaryCategories;

    return {
      categories: categories.map(([label, amount], index) => ({
        amount,
        color: ["bg-emerald-500", "bg-blue-500", "bg-violet-500", "bg-zinc-600"][index],
        label,
        percentage: total > 0 ? (amount / total) * 100 : 0,
      })),
      savingsRate:
        monthlyBalances.totalIncome > 0
          ? ((monthlyBalances.totalIncome - total) / monthlyBalances.totalIncome) * 100
          : 0,
      total,
    };
  }, [monthlyBalances.totalIncome, monthlyTransactions]);

  const pendingVariableIncomes = useMemo(
    () => monthlyTransactions.filter(isPendingVariableIncome),
    [monthlyTransactions],
  );

  const cardSpendingSummaries = useMemo(
    () =>
      cards.map((card) => {
        const debtTotal = calculateCardDebt(transactions, card.id);
        const limitAmount = card.limitAmount ?? 0;
        const invoiceTotals = invoiceCycleTransactions
          .filter((transaction) => {
            const dbCardId =
              (transaction as Transaction & { card_id?: string | null })
                .card_id ?? transaction.cardId;

            return transaction.type === "card" && dbCardId === card.id;
          })
          .reduce(
            (totals, transaction) => {
              const signedAmount = getCardSignedAmount(transaction);

              totals.projected += signedAmount;

              if (
                transaction.is_recurring !== true ||
                normalizeDateOnly(transaction.date) <= todayDate
              ) {
                totals.current += signedAmount;
              }

              return totals;
            },
            { current: 0, projected: 0 },
          );

        return {
          id: card.id,
          name: card.name,
          closingDay: card.closingDay,
          dueDay: card.dueDay,
          accentClassName: getCardAccentClassName(card.name),
          availableLimit: calculateAvailableCardLimit(
            transactions,
            card.id,
            limitAmount,
          ),
          debtTotal,
          limitAmount,
          limitUsage:
            limitAmount > 0 ? Math.min((debtTotal / limitAmount) * 100, 100) : 0,
          ...invoiceTotals,
        };
      }),
    [cards, invoiceCycleTransactions, todayDate, transactions],
  );

  const fixedSpendingTotal = useMemo(
    () =>
      monthlyTransactions
        .filter(
          (transaction) =>
            transaction.type === "fixed" &&
            transaction.is_recurring === true &&
            !hasDependent(transaction),
        )
        .reduce((total, transaction) => total + transaction.amount, 0),
    [monthlyTransactions],
  );

  const debitPixSpendingTotal = useMemo(
    () =>
      monthlyTransactions
        .filter((transaction) => {
          const dbCardId =
            (transaction as Transaction & { card_id?: string | null }).card_id ??
            transaction.cardId;

          return (
            transaction.type === "fixed" &&
            transaction.is_recurring !== true &&
            !dbCardId &&
            !hasDependent(transaction)
          );
        })
        .reduce((total, transaction) => total + transaction.amount, 0),
    [monthlyTransactions],
  );

  const dependentSpendingSummaries = useMemo(
    () =>
      dependents
        .map((dependent) => ({
          ...dependent,
          total: monthlyTransactions
            .filter((transaction) => {
              const dependentId =
                (transaction as Transaction & { dependent_id?: string | null })
                  .dependent_id ?? transaction.dependentId;

              return (
                transaction.type !== "income" && dependentId === dependent.id
              );
            })
            .reduce((sum, transaction) => sum + transaction.amount, 0),
        }))
        .filter((dependent) => dependent.total > 0)
        .sort((left, right) => right.total - left.total),
    [dependents, monthlyTransactions],
  );

  useEffect(() => {
    void fetchCards();
    void fetchDependents();
    void fetchTransactions();
  }, [currentMonth, currentYear, fetchCards, fetchDependents, fetchTransactions]);

  const handleCloseIncomeModal = useCallback(() => {
    setIsAddIncomeModalOpen(false);
    setEditingTransaction(null);
  }, []);

  const handleCloseTransactionModal = useCallback(() => {
    setIsAddTransactionModalOpen(false);
    setEditingTransaction(null);
  }, []);

  const handlePayInvoiceClick = useCallback(async (cardId: string) => {
    try {
      await payCardInvoice(cardId);
      toast.success("Fatura liquidada!");
      await fetchTransactions();
    } catch (error) {
      console.error("Erro ao liquidar fatura:", error);
      toast.error("Não foi possível liquidar a fatura.");
    }
  }, [fetchTransactions, payCardInvoice]);

  const handleConfirmVariableIncome = useCallback(async (transaction: Transaction) => {
    const nextAmount = Number(
      (variableIncomeValues[transaction.id] || "")
        .replace(/\./g, "")
        .replace(",", "."),
    );

    if (!Number.isFinite(nextAmount) || nextAmount <= 0) {
      toast.error("Informe um valor válido para confirmar a renda.");
      return;
    }

    try {
      await updateTransaction(transaction.id, {
        amount: nextAmount,
        status: "confirmed",
      });
      setVariableIncomeValues((currentValues) => {
        const nextValues = { ...currentValues };
        delete nextValues[transaction.id];
        return nextValues;
      });
      await fetchTransactions();
      toast.success("Renda variável confirmada!");
    } catch (error) {
      console.error("Erro ao confirmar renda variável:", error);
      toast.error("Não foi possível confirmar essa renda agora.");
    }
  }, [fetchTransactions, updateTransaction, variableIncomeValues]);

  return (
    <div className="flex w-full flex-col gap-6 md:gap-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            Visão geral
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Acompanhe saldos, faturas e movimentações do período.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button aria-label="Criar novo item" className="h-11 gap-2 bg-emerald-600 px-3.5 text-sm font-semibold text-white hover:bg-emerald-700 md:h-12 md:px-6 md:text-base">
                <PlusCircle className="size-5" />
                <span className="hidden min-[380px]:inline">Novo</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[calc(100vw-2rem)] max-w-80 p-2">
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

      <div className="flex justify-center border-y border-border/50 py-4 md:py-5">
        <AnimatedMonthSelector
          currentMonth={currentMonth}
          currentYear={currentYear}
          onPreviousMonth={prevMonth}
          onNextMonth={nextMonth}
          isLoading={isFetching}
        />
      </div>

      <section>
        <div className="mb-4">
          <p className="text-xs font-medium uppercase text-muted-foreground">
            Resumo do mês
          </p>
          <h2 className="mt-1 text-xl font-semibold text-foreground">
            Seu dinheiro em um olhar
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
          <Card className="col-span-2 min-h-28 rounded-2xl border border-border/50 bg-zinc-950 p-4 text-zinc-50 shadow-none xl:col-span-1">
            <CardHeader className="p-0">
              <CardDescription className="text-zinc-400">
                Saldo Disponível Total
              </CardDescription>
              <CardTitle className="mt-3 text-base font-semibold tracking-tight sm:text-xl">
                {formatPrivateCurrency(monthlyBalances.projectedBalance)}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-2 p-0 pt-3 text-xs text-zinc-500">
              <ReceiptText className="size-4 text-emerald-400" />
              Após compromissos do mês, ignorando gastos de dependentes.
            </CardContent>
          </Card>

          <Card className="min-h-32 rounded-2xl border border-border/50 bg-card p-3.5 shadow-none transition-colors hover:bg-accent/10 sm:p-4">
            <CardHeader className="p-0">
              <CardDescription>Receitas do Mês</CardDescription>
              <CardTitle className="mt-3 text-base tracking-normal text-emerald-300 sm:text-xl">
                {formatPrivateCurrency(monthlyBalances.totalIncome)}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-2 p-0 pt-4 text-xs text-muted-foreground">
              <TrendingUp className="size-4 text-emerald-300" />
              Entradas registradas
            </CardContent>
          </Card>

          <Card className="min-h-32 rounded-2xl border border-border/50 bg-card p-3.5 shadow-none transition-colors hover:bg-accent/10 sm:p-4">
            <CardHeader className="p-0">
              <CardDescription>Faturas em Aberto</CardDescription>
              <CardTitle className="mt-3 text-base tracking-normal text-violet-300 sm:text-xl">
                {formatPrivateCurrency(monthlyBalances.creditCardUntilToday)}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 pt-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <CreditCard className="size-4 shrink-0 text-violet-300" />
                Total consolidado no dia de hoje
              </div>
              <p className="mt-2 text-[10px] leading-4 text-zinc-500 sm:text-xs">
                Meu: {formatPrivateCurrency(monthlyBalances.userCreditCardUntilToday)}
                <span className="mx-1">•</span>
                Dependentes: {formatPrivateCurrency(monthlyBalances.dependentCreditCardUntilToday)}
              </p>
            </CardContent>
          </Card>

          <Card className="min-h-32 rounded-2xl border border-border/50 bg-card p-3.5 shadow-none transition-colors hover:bg-accent/10 sm:p-4">
            <CardHeader className="p-0">
              <CardDescription>Projeção de Fechamento</CardDescription>
              <CardTitle className="mt-3 text-base tracking-normal text-blue-300 sm:text-xl">
                {formatPrivateCurrency(monthlyBalances.creditCardProjected)}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-2 p-0 pt-4 text-xs text-muted-foreground">
              <CreditCard className="size-4 text-blue-300" />
              Faturas atuais + lançamentos futuros
            </CardContent>
          </Card>

          <Card className="min-h-32 rounded-2xl border border-border/50 bg-card p-3.5 shadow-none transition-colors hover:bg-accent/10 sm:p-4">
            <CardHeader className="p-0">
              <CardDescription>Gastos Pendentes</CardDescription>
              <CardTitle className="mt-3 text-base tracking-normal text-orange-300 sm:text-xl">
                {formatPrivateCurrency(monthlyBalances.totalPendingObligations)}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 pt-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <ReceiptText className="size-4 shrink-0 text-orange-300" />
                Faturas e contas em aberto
              </div>
              <p className="mt-2 text-[10px] leading-4 text-zinc-500 sm:text-xs">
                Meu: {formatPrivateCurrency(monthlyBalances.personalPendingObligations)}
                <span className="mx-1">•</span>
                Dependentes: {formatPrivateCurrency(monthlyBalances.dependentPendingObligations)}
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {pendingVariableIncomes.length ? (
        <Card className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 shadow-none">
          <CardHeader className="border-b border-emerald-500/20 p-5">
            <CardDescription className="text-emerald-200/80">
              Confirmação rápida
            </CardDescription>
            <CardTitle className="text-xl tracking-normal text-emerald-50">
              Rendas variáveis pendentes neste mês
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 p-4">
            {pendingVariableIncomes.map((income) => (
              <div
                key={income.id}
                className="grid gap-3 rounded-xl border border-emerald-500/20 bg-zinc-950/60 p-3 md:grid-cols-[1fr_180px_auto]"
              >
                <div>
                  <p className="text-sm font-medium text-zinc-50">
                    {income.description}
                  </p>
                  <p className="mt-1 text-xs text-zinc-400">
                    Valor estimado: {formatPrivateCurrency(income.amount)}
                  </p>
                </div>
                <Input
                  value={variableIncomeValues[income.id] ?? ""}
                  onChange={(event) =>
                    setVariableIncomeValues((currentValues) => ({
                      ...currentValues,
                      [income.id]: event.target.value,
                    }))
                  }
                  inputMode="decimal"
                  placeholder="Valor final"
                  className="border-emerald-500/30 bg-zinc-950 text-zinc-50 placeholder:text-zinc-500"
                />
                <Button
                  type="button"
                  className="bg-emerald-600 font-semibold text-white hover:bg-emerald-700"
                  onClick={() => void handleConfirmVariableIncome(income)}
                >
                  Confirmar
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
        <div className="min-w-0">
          <Card className="overflow-hidden rounded-xl border border-border/50 bg-card shadow-none">
            <CardHeader className="flex flex-col gap-4 border-b border-border/50 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-xl tracking-normal">Minha Carteira</CardTitle>
                <CardDescription className="mt-1">
                  Cartões, fixos e pagamentos à vista do período.
                </CardDescription>
              </div>
              <Button
                type="button"
                onClick={() => setIsAddCardModalOpen(true)}
                className="h-10 gap-2 bg-emerald-600 px-4 font-semibold text-white hover:bg-emerald-700"
              >
                <PlusCircle className="size-4" />
                Adicionar Cartão
              </Button>
            </CardHeader>
            <CardContent className="p-4">
              <Carousel opts={{ dragFree: true }} className="w-full">
                <CarouselContent className="-ml-4 px-2 pt-1 pb-3">
                  {cardSpendingSummaries.map((cardSummary) => (
                    <CarouselItem
                      key={cardSummary.id}
                      className="basis-full pl-4 lg:basis-auto"
                    >
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
                          <p className="text-xs font-medium text-foreground">
                            Gastos Fixos
                          </p>
                        </div>
                        <ReceiptText className="size-4 text-blue-300" />
                      </div>
                      <div className="relative mt-6 text-right">
                        <p className="text-xs font-medium uppercase text-muted-foreground">
                          Total do mês
                        </p>
                        <strong className="mt-1 block text-xl font-bold tracking-normal text-foreground">
                          {formatPrivateCurrency(fixedSpendingTotal)}
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
                          <p className="text-xs font-medium text-foreground">
                            Débito / Pix
                          </p>
                        </div>
                        <QrCode className="size-4 text-emerald-300" />
                      </div>
                      <div className="relative mt-6 text-right">
                        <p className="text-xs font-medium uppercase text-muted-foreground">
                          Total do mês
                        </p>
                        <strong className="mt-1 block text-xl font-bold tracking-normal text-foreground">
                          {formatPrivateCurrency(debitPixSpendingTotal)}
                        </strong>
                      </div>
                    </div>
                  </CarouselItem>
                </CarouselContent>
                <CarouselPrevious className="absolute -left-12 z-50 hidden bg-background/80 lg:-left-16 lg:inline-flex" />
                <CarouselNext className="absolute -right-12 z-50 hidden bg-background/80 lg:-right-16 lg:inline-flex" />
              </Carousel>
            </CardContent>
          </Card>
        </div>

        <div className="min-w-0">
          <Card className="w-full rounded-xl border border-border/50 bg-card shadow-none">
            <CardHeader className="border-b border-border/50 p-5">
              <CardDescription>Valores a receber</CardDescription>
              <CardTitle className="text-xl tracking-normal">
                Gastos por Dependente
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              {dependentSpendingSummaries.length ? (
                <div>
                  {dependentSpendingSummaries.map((dependent) => (
                    <div
                      key={dependent.id}
                      className="flex items-center justify-between gap-3 border-b border-zinc-100 p-3 last:border-0 dark:border-zinc-800"
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
                          <UserRound className="size-4" />
                        </span>
                        <span className="min-w-0 truncate text-sm font-medium text-foreground">
                          {dependent.name}
                        </span>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <strong className="text-sm font-semibold text-foreground">
                          {formatPrivateCurrency(dependent.total)}
                        </strong>
                        <ChevronRight className="size-4 text-muted-foreground" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/70 px-4 py-4 text-center text-sm text-muted-foreground">
                  <UserRound className="mb-3 size-8 text-muted-foreground/50" />
                  Nenhum gasto vinculado a dependentes neste período.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <Card className="min-w-0 overflow-hidden rounded-xl border border-border/50 bg-card shadow-none">
          <CardHeader className="flex flex-row items-center justify-between gap-4 border-b border-border/50 p-5">
            <div>
              <CardTitle className="text-lg font-medium tracking-normal text-foreground">
                Movimentações recentes
              </CardTitle>
              <CardDescription className="mt-1">
                Últimos dez lançamentos do período selecionado.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="hidden rounded-lg lg:inline-flex">
                {monthlyTransactions.length} no mês
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                className="rounded-md px-3 py-1.5 text-sm font-medium text-zinc-300 transition-all hover:bg-zinc-800/70 hover:text-white"
                asChild
              >
                <Link href="/dashboard/transactions">
                  Ver todas
                </Link>
              </Button>
            </div>
          </CardHeader>

          <div className="space-y-2 p-3 md:hidden">
            {recentTransactions.length ? (
              recentTransactions.map((transaction) => {
                const categoryLabel =
                  transaction.category || getTransactionFallbackLabel(transaction);
                const isPositive =
                  transaction.type === "income" ||
                  isCardCreditAdjustment(transaction);

                return (
                  <MobileTransactionItem
                    key={transaction.id}
                    title={<TransactionDescription transaction={transaction} />}
                    category={categoryLabel}
                    date={formatDateOnlyBR(transaction.date)}
                    amount={`${isPositive ? "+" : "-"}${formatPrivateCurrency(transaction.amount)}`}
                    positive={isPositive}
                  />
                );
              })
            ) : (
              <div className="flex min-h-36 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
                <Inbox className="size-7" />
                Nenhuma movimentação neste período.
              </div>
            )}
          </div>

          <div
            className={cn(
              "hidden overflow-x-auto transition-opacity md:block",
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
                          transaction.type === "income" ||
                            isCardCreditAdjustment(transaction)
                            ? "text-emerald-300"
                            : "text-red-300",
                        )}
                      >
                        {transaction.type === "income" ||
                        isCardCreditAdjustment(transaction)
                          ? "+"
                          : "-"}
                        {formatPrivateCurrency(transaction.amount)}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow className="hover:bg-transparent">
                  <TableCell
                    colSpan={5}
                    className="text-center text-muted-foreground"
                  >
                    <div className="flex flex-col items-center justify-center gap-2 py-6">
                      <Inbox className="size-7 text-muted-foreground/60" />
                      <span>Nenhuma movimentação neste período.</span>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
            </Table>
          </div>
        </Card>

        <Card className="rounded-xl border border-border/50 bg-card shadow-none">
          <CardHeader className="p-5 pb-2">
            <CardDescription>Distribuição pessoal</CardDescription>
            <CardTitle className="text-lg tracking-normal text-foreground">
              Para onde foi seu dinheiro
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 p-5">
            {personalSpendingDistribution.categories.length ? (
              personalSpendingDistribution.categories.map((category) => (
                <div key={category.label}>
                  <div className="mb-2 flex items-center justify-between gap-3 text-xs">
                    <span className="truncate text-muted-foreground">
                      {category.label}
                    </span>
                    <span className="font-medium text-foreground">
                      {category.percentage.toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn("h-full rounded-full", category.color)}
                      style={{ width: `${category.percentage}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="flex min-h-36 items-center justify-center rounded-lg border border-dashed border-border text-center text-sm text-muted-foreground">
                Sem despesas pessoais neste período.
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 border-t border-border/50 pt-4">
              <div>
                <ArrowDown className="size-4 text-red-300" />
                <p className="mt-2 text-xs text-muted-foreground">Saídas</p>
                <strong className="text-sm text-foreground">
                  {formatPrivateCurrency(personalSpendingDistribution.total)}
                </strong>
              </div>
              <div>
                <ArrowUp className="size-4 text-emerald-300" />
                <p className="mt-2 text-xs text-muted-foreground">Economia</p>
                <strong className="text-sm text-emerald-300">
                  {personalSpendingDistribution.savingsRate.toFixed(1)}%
                </strong>
              </div>
            </div>
          </CardContent>
        </Card>
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

