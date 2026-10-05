"use client";

import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  CalendarDays,
  CreditCard,
  Eye,
  EyeOff,
  Inbox,
  PlusCircle,
  QrCode,
  ReceiptText,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserRound,
  Wallet,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import { AnimatedMonthSelector } from "@/components/finance/AnimatedMonthSelector";
import { AddCardModal } from "@/components/modals/AddCardModal";
import { AddIncomeModal } from "@/components/modals/AddIncomeModal";
import { AddTransactionModal } from "@/components/modals/AddTransactionModal";
import { PayInvoiceModal } from "@/components/modals/PayInvoiceModal";
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
  toDateOnly,
} from "@/lib/dateUtils";
import {
  getCardSignedAmount,
  isCardCreditAdjustment,
  shouldCountCardCharge,
} from "@/lib/cardCredits";
import { isPendingVariableIncome } from "@/lib/incomeRecurrence";
import { cn } from "@/lib/utils";
import {
  isCardTransactionInSelectedInvoiceMonth,
  isTransactionInSelectedCompetence,
} from "@/lib/transactionPeriod";
import { aggregatePeriodExpenses } from "@/lib/financeAggregation";
import { getCardInvoiceCycle } from "@/lib/cardBilling";
import { getDependentSettlementSummary } from "@/lib/dependentSettlements";
import {
  getCategoryBudgetMetrics,
  getCategoryBudgetSpent,
} from "@/lib/categoryBudgets";
import {
  useFinanceStore,
  type CardInvoice,
  type CardInvoiceStatus,
  type Transaction,
} from "@/store/useFinanceStore";
import { toast } from "sonner";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";

const dashboardReveal = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0 },
};

const dashboardSurfaceClassName =
  "gap-0 border border-white/[0.08] bg-zinc-900/55 py-0 shadow-[0_18px_55px_rgba(0,0,0,0.18)] backdrop-blur-xl transition-colors hover:border-white/[0.13]";

const walletCardSizeClassName =
  "aspect-[1.586/1] h-auto w-[min(82vw,20rem)] max-w-full shrink-0 sm:w-[19rem] lg:w-[17.25rem] xl:w-80 2xl:w-[21rem]";

function getResponsiveTransactionLimit() {
  if (typeof window === "undefined") return 3;

  if (window.innerWidth >= 1920 || window.innerHeight >= 1000) return 6;
  if (window.innerWidth >= 1440 || window.innerHeight >= 850) return 5;

  return 3;
}

function useCountUp(
  targetValue: number,
  resetKey: string,
  reduceMotion: boolean,
  duration = 850,
) {
  const [animatedValue, setAnimatedValue] = useState(
    reduceMotion ? targetValue : 0,
  );

  useEffect(() => {
    if (reduceMotion) {
      return;
    }

    const safeTarget = Number.isFinite(targetValue) ? targetValue : 0;
    let animationFrame = 0;
    let startedAt: number | null = null;

    const animate = (timestamp: number) => {
      startedAt ??= timestamp;
      const elapsed = Math.max(timestamp - startedAt, 0);
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress =
        progress < 0.5
          ? 4 * progress * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 3) / 2;
      setAnimatedValue(safeTarget * easedProgress);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [duration, reduceMotion, resetKey, targetValue]);

  return reduceMotion ? targetValue : animatedValue;
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
  return isTransactionInSelectedCompetence(
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
  return isCardTransactionInSelectedInvoiceMonth(
    transaction,
    currentMonth,
    currentYear,
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
  invoices: CardInvoice[],
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

  const pendingCardExpenses = invoices.length
    ? invoices.reduce((sum, invoice) => {
        const outstanding = Math.max(
          invoice.totalAmount - invoice.paidAmount,
          0,
        );

        if (!excludeDependents || outstanding === 0) return sum + outstanding;

        const invoiceEntries = invoiceTransactions.filter(
          (transaction) => transaction.invoiceId === invoice.id,
        );
        const invoiceTotal = invoiceEntries.reduce(
          (total, transaction) => total + getCardSignedAmount(transaction),
          0,
        );
        const personalTotal = invoiceEntries
          .filter((transaction) => !hasDependent(transaction))
          .reduce(
            (total, transaction) => total + getCardSignedAmount(transaction),
            0,
          );
        const personalShare =
          invoiceTotal > 0
            ? Math.min(Math.max(personalTotal / invoiceTotal, 0), 1)
            : 1;

        return sum + outstanding * personalShare;
      }, 0)
    : invoiceTransactions
        .filter(
          (transaction) =>
            !excludeDependents || !hasDependent(transaction),
        )
        .reduce(
          (sum, transaction) => sum + getCardSignedAmount(transaction),
          0,
        );

  return (
    Math.max(pendingCalendarExpenses, 0) + Math.max(pendingCardExpenses, 0)
  );
}

interface CardSpendingSummary {
  id: string;
  name: string;
  color?: string;
  closingDay?: number;
  dueDay?: number;
  dueDate?: string;
  invoiceStatus?: CardInvoiceStatus;
  invoice?: CardInvoice;
  cycleEndDate: string;
  cycleStartDate: string;
  current: number;
  dependentCurrent: number;
  personalCurrent: number;
  projected: number;
}

function getCardGradientClassName(cardName: string, cardColor?: string) {
  const normalizedColor = cardColor?.toLowerCase();
  if (normalizedColor === "#18181b")
    return "bg-gradient-to-br from-zinc-700 via-zinc-900 to-black";
  if (normalizedColor === "#6d28d9")
    return "bg-gradient-to-br from-violet-500 via-violet-700 to-purple-950";
  if (normalizedColor === "#1d4ed8")
    return "bg-gradient-to-br from-blue-500 via-blue-700 to-blue-950";
  if (normalizedColor === "#ea580c")
    return "bg-gradient-to-br from-orange-400 via-orange-600 to-orange-950";
  if (normalizedColor === "#047857")
    return "bg-gradient-to-br from-emerald-500 via-emerald-700 to-emerald-950";
  if (normalizedColor === "#be123c")
    return "bg-gradient-to-br from-rose-500 via-rose-700 to-rose-950";

  const name = cardName.toLowerCase();
  if (name.includes("nubank"))
    return "bg-gradient-to-br from-fuchsia-950 via-purple-950 to-black";
  if (name.includes("itaú") || name.includes("itau"))
    return "bg-gradient-to-br from-zinc-700 via-zinc-900 to-black";
  if (name.includes("inter"))
    return "bg-gradient-to-br from-orange-800 via-orange-950 to-black";
  if (name.includes("bradesco"))
    return "bg-gradient-to-br from-rose-900 via-zinc-950 to-black";
  return "bg-gradient-to-br from-slate-700 via-zinc-900 to-black";
}

function FlippableWalletCard({
  cardSummary,
  onPayInvoice,
}: {
  cardSummary: CardSpendingSummary;
  onPayInvoice: (invoice: CardInvoice, cardName: string) => void;
}) {
  const [isFlipped, setIsFlipped] = useState(false);
  const hideBalancesByDefault = useFinanceStore(
    (state) => state.hideBalancesByDefault,
  );
  const { formatCurrency, hiddenCurrencyLabel } = useCurrencyFormatter();
  const formatPrivateCurrency = (value: number) =>
    hideBalancesByDefault ? hiddenCurrencyLabel : formatCurrency(value);
  const cycleLabel = `${formatDateOnlyBR(cardSummary.cycleStartDate)} - ${formatDateOnlyBR(cardSummary.cycleEndDate)}`;
  const invoiceStatusLabel = cardSummary.invoiceStatus
    ? {
        open: "Aberta",
        closed: "Fechada",
        partially_paid: "Parcialmente paga",
        paid: "Paga",
      }[cardSummary.invoiceStatus]
    : "Sem lançamentos";

  return (
    <div className={cn(walletCardSizeClassName, "perspective-[1000px]")}>
      <div
        className={cn(
          "relative h-full w-full cursor-pointer transition-all duration-500 [transform-style:preserve-3d]",
          isFlipped && "[transform:rotateY(180deg)]",
        )}
      >
        <div
          className={cn(
            "absolute inset-0 flex flex-col overflow-hidden rounded-xl border border-white/[0.1] p-4 text-zinc-100 shadow-xl shadow-black/30 sm:p-5 [backface-visibility:hidden]",
            getCardGradientClassName(cardSummary.name, cardSummary.color),
          )}
          onClick={() => setIsFlipped(true)}
        >
          <div className="relative flex items-center justify-between gap-4">
            <p className="max-w-48 truncate text-sm font-medium text-white">
              {cardSummary.name}
            </p>
            <button
              type="button"
              className="inline-flex size-7 items-center justify-center rounded-full border border-white/10 bg-black/15 text-white/50 transition hover:bg-white/10 hover:text-white"
              onClick={(event) => {
                event.stopPropagation();
                setIsFlipped(true);
              }}
              aria-label={`Virar cartão ${cardSummary.name}`}
            >
              <RotateCcw className="size-4" />
            </button>
          </div>
          <div className="relative mt-3 flex flex-1 flex-col justify-between">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider text-white/55">
                Fatura atual
              </p>
              <strong className="mt-1 block text-2xl font-bold leading-none tracking-tight text-white">
                {formatPrivateCurrency(cardSummary.current)}
              </strong>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-2 text-[10px] text-white/55 sm:text-[11px]">
              <span>{cycleLabel}</span>
              <span className="shrink-0">
                {cardSummary.dueDate
                  ? `Vence ${formatDateOnlyBR(cardSummary.dueDate)}`
                  : cardSummary.dueDay
                    ? `Vence dia ${cardSummary.dueDay}`
                    : "Sem vencimento"}
              </span>
            </div>
          </div>
        </div>

        <div
          className={cn(
            "absolute inset-0 flex flex-col justify-between overflow-hidden rounded-xl border border-white/[0.1] bg-gradient-to-br from-zinc-800 via-zinc-950 to-black p-4 text-zinc-100 shadow-xl shadow-black/30 sm:p-5 [backface-visibility:hidden] [transform:rotateY(180deg)]",
          )}
          onClick={() => setIsFlipped(false)}
        >
          <div className="relative">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <p className="truncate text-xs font-medium text-zinc-200">
                  {cardSummary.name}
                </p>
                <span className="shrink-0 rounded-md bg-white/[0.07] px-1.5 py-0.5 text-[9px] text-zinc-400">
                  {invoiceStatusLabel}
                </span>
              </div>
              <span className="flex items-center gap-1 text-[10px] text-zinc-500">
                <RotateCcw className="size-3" /> Desvirar
              </span>
            </div>
            <div className="mt-2">
              <p className="text-[10px] uppercase tracking-wider text-zinc-500">
                Total lançado
              </p>
              <strong className="mt-0.5 block text-lg font-semibold leading-tight text-zinc-100">
                {formatPrivateCurrency(cardSummary.current)}
              </strong>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-white/[0.07] bg-white/[0.035] px-2.5 py-2">
                <p className="text-[9px] uppercase tracking-wider text-zinc-500">
                  Minha parte
                </p>
                <strong className="mt-0.5 block truncate text-xs font-semibold text-zinc-100">
                  {formatPrivateCurrency(cardSummary.personalCurrent)}
                </strong>
              </div>
              <div className="rounded-lg border border-white/[0.07] bg-white/[0.035] px-2.5 py-2">
                <p className="text-[9px] uppercase tracking-wider text-zinc-500">
                  Dependentes
                </p>
                <strong className="mt-0.5 block truncate text-xs font-semibold text-zinc-100">
                  {formatPrivateCurrency(cardSummary.dependentCurrent)}
                </strong>
              </div>
            </div>
          </div>
          <div className="relative grid gap-2">
            <Button
              type="button"
              className="h-9 w-full bg-emerald-500 text-xs font-semibold text-zinc-950 hover:bg-emerald-400"
              disabled={
                !cardSummary.invoiceStatus ||
                cardSummary.invoiceStatus === "paid" ||
                !cardSummary.invoice ||
                cardSummary.invoice.totalAmount <=
                  cardSummary.invoice.paidAmount
              }
              onClick={(event) => {
                event.stopPropagation();
                if (cardSummary.invoice) {
                  onPayInvoice(cardSummary.invoice, cardSummary.name);
                }
              }}
            >
              {cardSummary.invoiceStatus === "paid"
                ? "Fatura paga"
                : "Pagar Fatura"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const prefersReducedMotion = useReducedMotion();
  const [isAddCardModalOpen, setIsAddCardModalOpen] = useState(false);
  const [isAddIncomeModalOpen, setIsAddIncomeModalOpen] = useState(false);
  const [isAddTransactionModalOpen, setIsAddTransactionModalOpen] =
    useState(false);
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);
  const [paymentTarget, setPaymentTarget] = useState<{
    invoice: CardInvoice;
    cardName: string;
  } | null>(null);
  const [variableIncomeValues, setVariableIncomeValues] = useState<
    Record<string, string>
  >({});
  const [recentTransactionLimit, setRecentTransactionLimit] = useState(3);

  const cards = useFinanceStore((state) => state.cards);
  const cardInvoices = useFinanceStore((state) => state.cardInvoices);
  const categories = useFinanceStore((state) => state.categories);
  const dependents = useFinanceStore((state) => state.dependents);
  const categoryBudgets = useFinanceStore((state) => state.categoryBudgets);
  const dependentSettlements = useFinanceStore(
    (state) => state.dependentSettlements,
  );
  const transactions = useFinanceStore((state) => state.transactions);
  const fetchTransactions = useFinanceStore((state) => state.fetchTransactions);
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
  const toggleHideBalancesByDefault = useFinanceStore(
    (state) => state.toggleHideBalancesByDefault,
  );
  const { formatCurrency, hiddenCurrencyLabel } = useCurrencyFormatter();
  const formatPrivateCurrency = (value: number) =>
    hideBalancesByDefault ? hiddenCurrencyLabel : formatCurrency(value);
  const revealTransition = prefersReducedMotion
    ? { duration: 0 }
    : { duration: 0.45, ease: "easeOut" as const };

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

  const selectedCardInvoices = useMemo(
    () =>
      cardInvoices.filter((invoice) => {
        const { month, year } = getDateOnlyParts(invoice.billingMonthStart);

        return month === displayMonth && year === displayYear;
      }),
    [cardInvoices, displayMonth, displayYear],
  );

  const pendingExpensesTotal = useMemo(
    () =>
      calculatePendingExpenses(
        monthlyTransactions,
        invoiceCycleTransactions,
        selectedCardInvoices,
      ),
    [invoiceCycleTransactions, monthlyTransactions, selectedCardInvoices],
  );

  const personalPendingExpensesTotal = useMemo(
    () =>
      calculatePendingExpenses(
        monthlyTransactions,
        invoiceCycleTransactions,
        selectedCardInvoices,
        true,
      ),
    [invoiceCycleTransactions, monthlyTransactions, selectedCardInvoices],
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
      totals.creditCardProjected += signedAmount;

      if (shouldCountCardCharge(transaction, todayDate)) {
        totals.creditCardUntilToday += signedAmount;
      }

      if (isDependentTransaction) return;

      totals.userCreditCardProjected += signedAmount;

      if (shouldCountCardCharge(transaction, todayDate)) {
        totals.userCreditCardUntilToday += signedAmount;
      }
    });

    const persistedProjected = selectedCardInvoices.reduce(
      (sum, invoice) => sum + invoice.totalAmount,
      0,
    );
    const persistedPosted = selectedCardInvoices.reduce(
      (sum, invoice) => sum + invoice.postedAmount,
      0,
    );
    const persistedOpen = selectedCardInvoices.reduce(
      (sum, invoice) =>
        sum + Math.max(invoice.postedAmount - invoice.paidAmount, 0),
      0,
    );
    const creditCardProjected = selectedCardInvoices.length
      ? persistedProjected
      : totals.creditCardProjected;
    const creditCardUntilToday = selectedCardInvoices.length
      ? persistedPosted
      : totals.creditCardUntilToday;

    return {
      ...totals,
      creditCardProjected,
      creditCardUntilToday,
      creditCardOpenUntilToday: selectedCardInvoices.length
        ? persistedOpen
        : totals.creditCardUntilToday,
      nonCardTotal: personalExpenseTotals.fixed,
      userCreditCardProjected: personalExpenseTotals.card,
      availableBalance:
        totals.totalIncome -
        personalExpenseTotals.fixed -
        totals.userCreditCardUntilToday,
      projectedBalance: totals.totalIncome - personalExpenseTotals.total,
      totalPendingObligations: pendingExpensesTotal,
      personalPendingObligations: personalPendingExpensesTotal,
      dependentPendingObligations: Math.max(
        pendingExpensesTotal - personalPendingExpensesTotal,
        0,
      ),
      dependentCreditCardUntilToday: Math.max(
        creditCardUntilToday - totals.userCreditCardUntilToday,
        0,
      ),
      dependentCreditCardProjected: Math.max(
        creditCardProjected - totals.userCreditCardProjected,
        0,
      ),
    };
  }, [
    invoiceCycleTransactions,
    monthlyTransactions,
    pendingExpensesTotal,
    personalPendingExpensesTotal,
    personalExpenseTotals,
    selectedCardInvoices,
    todayDate,
  ]);

  const kpiAnimationKey = `${displayYear}-${displayMonth}`;
  const animatedProjectedBalance = useCountUp(
    monthlyBalances.projectedBalance,
    kpiAnimationKey,
    Boolean(prefersReducedMotion),
  );
  const animatedPendingObligations = useCountUp(
    monthlyBalances.totalPendingObligations,
    kpiAnimationKey,
    Boolean(prefersReducedMotion),
  );
  const animatedClosingProjection = useCountUp(
    monthlyBalances.creditCardProjected,
    kpiAnimationKey,
    Boolean(prefersReducedMotion),
  );
  const isProjectedBalanceNegative = monthlyBalances.projectedBalance < 0;

  const recentTransactions = useMemo(
    () =>
      [...monthlyTransactions]
        .sort(sortByRecentDate)
        .slice(0, recentTransactionLimit),
    [monthlyTransactions, recentTransactionLimit],
  );

  const personalSpendingDistribution = useMemo(() => {
    const categoryTotals = new Map<string, number>();

    [...monthlyTransactions, ...invoiceCycleTransactions].forEach(
      (transaction) => {
        if (transaction.type === "income" || hasDependent(transaction)) return;
        if (
          transaction.type === "card" &&
          !shouldCountCardCharge(transaction, todayDate)
        ) {
          return;
        }

        const amount =
          transaction.type === "card"
            ? getCardSignedAmount(transaction)
            : transaction.amount;

        if (amount <= 0) return;

        const category = transaction.category?.trim() || "Outros";

        categoryTotals.set(
          category,
          (categoryTotals.get(category) ?? 0) + amount,
        );
      },
    );

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
    const categories =
      consolidatedOtherTotal > 0
        ? [
            ...primaryCategories,
            ["Outros", consolidatedOtherTotal] as [string, number],
          ]
        : primaryCategories;

    return {
      categories: categories.map(([label, amount], index) => ({
        amount,
        color: [
          "bg-emerald-500",
          "bg-blue-500",
          "bg-violet-500",
          "bg-zinc-600",
        ][index],
        hex: ["#34d399", "#60a5fa", "#a78bfa", "#52525b"][index],
        label,
        percentage: total > 0 ? (amount / total) * 100 : 0,
      })),
      savingsRate:
        monthlyBalances.totalIncome > 0
          ? ((monthlyBalances.totalIncome - total) /
              monthlyBalances.totalIncome) *
            100
          : 0,
      total,
    };
  }, [
    invoiceCycleTransactions,
    monthlyBalances.totalIncome,
    monthlyTransactions,
    todayDate,
  ]);

  const pendingVariableIncomes = useMemo(
    () => monthlyTransactions.filter(isPendingVariableIncome),
    [monthlyTransactions],
  );

  const cardSpendingSummaries = useMemo(
    () =>
      cards.map((card) => {
        const cardInvoiceTransactions = invoiceCycleTransactions.filter(
          (transaction) => {
            const dbCardId =
              (transaction as Transaction & { card_id?: string | null })
                .card_id ?? transaction.cardId;

            return transaction.type === "card" && dbCardId === card.id;
          },
        );
        const fallbackInvoiceTotals = cardInvoiceTransactions.reduce(
            (totals, transaction) => {
              const signedAmount = getCardSignedAmount(transaction);

              totals.projected += signedAmount;

              if (shouldCountCardCharge(transaction, todayDate)) {
                totals.current += signedAmount;
              }

              return totals;
            },
            { current: 0, projected: 0 },
          );
        const currentBreakdown = cardInvoiceTransactions
          .filter((transaction) =>
            shouldCountCardCharge(transaction, todayDate),
          )
          .reduce(
            (totals, transaction) => {
              const signedAmount = getCardSignedAmount(transaction);

              if (hasDependent(transaction)) {
                totals.dependents += signedAmount;
              } else {
                totals.personal += signedAmount;
              }

              return totals;
            },
            { dependents: 0, personal: 0 },
          );
        const persistedInvoice = selectedCardInvoices.find(
          (invoice) => invoice.cardId === card.id,
        );
        const fallbackInvoiceCycle = getCardInvoiceCycle(
          toDateOnly(displayYear, displayMonth, 1),
          card.closingDay,
        );

        return {
          id: card.id,
          name: card.name,
          color: card.color,
          closingDay: card.closingDay,
          dueDay: card.dueDay,
          dueDate: persistedInvoice?.dueDate,
          invoice: persistedInvoice,
          invoiceStatus: persistedInvoice?.status,
          cycleEndDate:
            persistedInvoice?.cycleEnd ?? fallbackInvoiceCycle.endDate,
          cycleStartDate:
            persistedInvoice?.cycleStart ?? fallbackInvoiceCycle.startDate,
          current:
            persistedInvoice?.postedAmount ?? fallbackInvoiceTotals.current,
          dependentCurrent: Math.max(currentBreakdown.dependents, 0),
          personalCurrent: Math.max(currentBreakdown.personal, 0),
          projected:
            persistedInvoice?.totalAmount ?? fallbackInvoiceTotals.projected,
        };
      }),
    [
      cards,
      displayMonth,
      displayYear,
      invoiceCycleTransactions,
      selectedCardInvoices,
      todayDate,
    ],
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
            (transaction as Transaction & { card_id?: string | null })
              .card_id ?? transaction.cardId;

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
        .map((dependent) => {
          const dependentTransactions = monthlyTransactions.filter(
            (transaction) => {
              const dependentId =
                (transaction as Transaction & { dependent_id?: string | null })
                  .dependent_id ?? transaction.dependentId;

              return (
                transaction.type !== "income" && dependentId === dependent.id
              );
            },
          );
          const competenceMonth = toDateOnly(displayYear, displayMonth, 1);
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
            total: settlementSummary.obligationTotal,
            received: settlementSummary.settledTotal,
            outstanding: settlementSummary.outstanding,
          };
        })
        .filter((dependent) => dependent.total > 0)
        .sort((left, right) => right.total - left.total),
    [
      dependentSettlements,
      dependents,
      displayMonth,
      displayYear,
      monthlyTransactions,
    ],
  );
  const dependentSpendingTotal = useMemo(
    () =>
      dependentSpendingSummaries.reduce(
        (total, dependent) => total + dependent.total,
        0,
      ),
    [dependentSpendingSummaries],
  );

  useEffect(() => {
    let resizeFrame: number | null = null;

    const updateResponsiveDensity = () => {
      if (resizeFrame !== null) cancelAnimationFrame(resizeFrame);

      resizeFrame = requestAnimationFrame(() => {
        setRecentTransactionLimit(getResponsiveTransactionLimit());
      });
    };

    updateResponsiveDensity();
    window.addEventListener("resize", updateResponsiveDensity);

    return () => {
      if (resizeFrame !== null) cancelAnimationFrame(resizeFrame);
      window.removeEventListener("resize", updateResponsiveDensity);
    };
  }, []);

  useEffect(() => {
    void fetchTransactions();
  }, [currentMonth, currentYear, fetchTransactions]);

  const handleCloseIncomeModal = useCallback(() => {
    setIsAddIncomeModalOpen(false);
    setEditingTransaction(null);
  }, []);

  const handleCloseTransactionModal = useCallback(() => {
    setIsAddTransactionModalOpen(false);
    setEditingTransaction(null);
  }, []);

  const handlePayInvoiceClick = useCallback(
    (invoice: CardInvoice, cardName: string) => {
      setPaymentTarget({ invoice, cardName });
    },
    [],
  );

  const budgetHealth = useMemo(() => {
    const competenceMonth = toDateOnly(displayYear, displayMonth, 1);
    const selectedBudgets = categoryBudgets.filter(
      (budget) => budget.competenceMonth === competenceMonth,
    );
    const statuses = selectedBudgets.map((budget) => {
      const category = categories.find(
        (item) => item.id === budget.categoryId,
      );
      const spent = getCategoryBudgetSpent(
        transactions,
        category?.label ?? "Outros",
        displayMonth,
        displayYear,
      );

      return getCategoryBudgetMetrics(
        budget.amount,
        spent,
        budget.alertThresholdPercent,
      ).status;
    });

    return {
      total: statuses.length,
      attention: statuses.filter((status) => status !== "on_track").length,
    };
  }, [
    categories,
    categoryBudgets,
    displayMonth,
    displayYear,
    transactions,
  ]);

  const handleConfirmVariableIncome = useCallback(
    async (transaction: Transaction) => {
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
    },
    [fetchTransactions, updateTransaction, variableIncomeValues],
  );

  return (
    <div className="relative flex w-full flex-col gap-5 overflow-x-clip pb-2 sm:gap-6 md:min-h-[calc(100dvh-4rem)]">
      <div className="pointer-events-none absolute inset-x-0 -top-40 -z-10 mx-auto h-72 max-w-5xl rounded-full bg-emerald-500/[0.035] blur-3xl" />

      <motion.header
        variants={dashboardReveal}
        initial="hidden"
        animate="visible"
        transition={revealTransition}
        className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between"
      >
        <div>
          <p className="mb-1.5 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.18em] text-emerald-300">
            <span className="size-1.5 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.8)]" />
            Finanças pessoais
          </p>
          <h1 className="text-3xl font-semibold tracking-[-0.04em] text-zinc-50 lg:text-4xl">
            Visão Geral
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Uma leitura clara do seu dinheiro.
          </p>
        </div>

        <div className="grid w-full grid-cols-[minmax(0,1fr)_2.75rem_auto] items-center gap-2 sm:flex sm:w-auto">
          <div className="min-w-0 sm:shrink-0">
            <AnimatedMonthSelector
              currentMonth={currentMonth}
              currentYear={currentYear}
              onPreviousMonth={prevMonth}
              onNextMonth={nextMonth}
              isLoading={isFetching}
            />
          </div>
          <button
            type="button"
            data-tour="dashboard-privacy"
            onClick={toggleHideBalancesByDefault}
            aria-label={
              hideBalancesByDefault ? "Mostrar valores" : "Ocultar valores"
            }
            className="flex size-11 items-center justify-center rounded-lg border border-white/[0.08] bg-zinc-900/70 text-zinc-300 transition hover:-translate-y-0.5 hover:border-emerald-400/30 hover:text-zinc-100"
          >
            {hideBalancesByDefault ? (
              <EyeOff className="size-5" />
            ) : (
              <Eye className="size-5" />
            )}
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                aria-label="Criar novo item"
                data-tour="dashboard-new"
                className="h-11 gap-2 rounded-lg bg-emerald-400 px-5 text-sm font-semibold text-zinc-950 shadow-lg shadow-emerald-500/10 transition hover:-translate-y-0.5 hover:bg-emerald-300"
              >
                <PlusCircle className="size-5" />
                Novo
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-[calc(100vw-2rem)] max-w-80 p-2"
            >
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
      </motion.header>

      <motion.section
        variants={dashboardReveal}
        initial="hidden"
        animate="visible"
        transition={{
          ...revealTransition,
          delay: prefersReducedMotion ? 0 : 0.06,
        }}
        className="grid grid-cols-12 gap-6"
      >
        <Card
          className={cn(
            dashboardSurfaceClassName,
            "relative col-span-12 h-full min-h-0 overflow-hidden rounded-xl lg:col-span-4",
            isProjectedBalanceNegative
              ? "bg-rose-400/[0.045]"
              : "bg-emerald-400/[0.045]",
          )}
        >
          <div className="pointer-events-none absolute inset-x-0 top-12 z-0 h-16 opacity-55">
            <svg
              viewBox="0 0 320 80"
              preserveAspectRatio="none"
              className="size-full"
            >
              <path
                d="M0 62 C28 66 38 47 62 55 S93 41 114 50 S143 32 166 42 S196 33 218 38 S251 17 274 29 S298 12 320 18"
                fill="none"
                stroke={isProjectedBalanceNegative ? "#fb7185" : "#34d399"}
                strokeWidth="1.5"
              />
            </svg>
          </div>
          <CardContent className="relative z-10 flex min-h-44 flex-col p-5 sm:min-h-48 sm:p-6 2xl:min-h-52">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">
                Saldo projetado
              </p>
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  isProjectedBalanceNegative
                    ? "bg-rose-400 shadow-[0_0_12px_rgba(251,113,133,0.75)]"
                    : "bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.8)]",
                )}
              />
            </div>
            <strong
              className={cn(
                "mt-auto block pt-5 text-[clamp(1.75rem,2.4vw,2.5rem)] font-semibold leading-none tracking-tight tabular-nums",
                isProjectedBalanceNegative
                  ? "text-rose-400"
                  : "text-emerald-400",
              )}
            >
              {formatPrivateCurrency(animatedProjectedBalance)}
            </strong>
            <p className="mt-2 text-[11px] text-zinc-500 sm:text-xs">
              Receitas: {formatPrivateCurrency(monthlyBalances.totalIncome)}
            </p>
          </CardContent>
        </Card>

        <Card
          className={cn(
            dashboardSurfaceClassName,
            "col-span-12 h-full min-h-0 rounded-xl lg:col-span-4",
          )}
        >
          <CardContent className="flex min-h-44 flex-col p-5 sm:min-h-48 sm:p-6 2xl:min-h-52">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">
                Compromissos do mês
              </p>
              <ReceiptText className="size-4 text-zinc-600" />
            </div>
            <strong className="mt-auto block pt-5 text-[clamp(1.75rem,2.4vw,2.5rem)] font-semibold leading-none tracking-tight text-zinc-100 tabular-nums">
              {formatPrivateCurrency(animatedPendingObligations)}
            </strong>
            <div className="mt-4 grid grid-cols-2 gap-3 text-[11px] sm:text-xs">
              <div>
                <p className="text-zinc-500">Faturas abertas</p>
                <p className="mt-1 text-zinc-200">
                  {formatPrivateCurrency(
                    monthlyBalances.creditCardOpenUntilToday,
                  )}
                </p>
              </div>
              <div>
                <p className="text-zinc-500">Minha parte</p>
                <p className="mt-1 text-zinc-200">
                  {formatPrivateCurrency(
                    monthlyBalances.personalPendingObligations,
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className={cn(
            dashboardSurfaceClassName,
            "col-span-12 h-full min-h-0 rounded-xl lg:col-span-4",
          )}
        >
          <CardContent className="flex min-h-44 flex-col p-5 sm:min-h-48 sm:p-6 2xl:min-h-52">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">
                Projeção de fechamento
              </p>
              <TrendingUp className="size-4 text-emerald-300" />
            </div>
            <strong className="mt-auto block pt-5 text-[clamp(1.75rem,2.4vw,2.5rem)] font-semibold leading-none tracking-tight text-zinc-100 tabular-nums">
              {formatPrivateCurrency(animatedClosingProjection)}
            </strong>
            <div className="mt-4 flex items-center justify-between gap-3 text-[11px] sm:text-xs">
              <span className="text-zinc-500">Já lançado na fatura</span>
              <span className="text-emerald-300">
                {formatPrivateCurrency(monthlyBalances.creditCardUntilToday)}
              </span>
            </div>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full rounded-full bg-emerald-400 transition-[width] duration-700"
                style={{
                  width: `${monthlyBalances.creditCardProjected > 0 ? Math.min((monthlyBalances.creditCardUntilToday / monthlyBalances.creditCardProjected) * 100, 100) : 0}%`,
                }}
              />
            </div>
          </CardContent>
        </Card>
      </motion.section>

      {pendingVariableIncomes.length ? (
        <motion.div
          variants={dashboardReveal}
          initial="hidden"
          animate="visible"
          transition={{
            ...revealTransition,
            delay: prefersReducedMotion ? 0 : 0.1,
          }}
        >
          <Card className="rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.07] shadow-[0_18px_55px_rgba(0,0,0,0.16)] backdrop-blur-xl">
            <CardHeader className="border-b border-emerald-500/20 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardDescription className="text-emerald-200/80">
                    Confirmação rápida
                  </CardDescription>
                  <CardTitle className="mt-1 text-xl tracking-normal text-emerald-50">
                    Rendas variáveis pendentes neste mês
                  </CardTitle>
                </div>
                <Sparkles className="size-5 text-emerald-300" />
              </div>
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
        </motion.div>
      ) : null}

      <motion.div
        variants={dashboardReveal}
        initial="hidden"
        animate="visible"
        transition={{
          ...revealTransition,
          delay: prefersReducedMotion ? 0 : 0.14,
        }}
        className="grid grid-cols-12 gap-6"
      >
        <div className="col-span-12 min-w-0 lg:col-span-8">
          <Card
            className={cn(
              dashboardSurfaceClassName,
              "h-full overflow-hidden rounded-xl",
            )}
          >
            <CardHeader className="flex flex-col items-stretch justify-between gap-3 border-b border-white/[0.06] p-4 sm:flex-row sm:items-center">
              <div className="flex items-start gap-3">
                <span className="flex size-7 items-center justify-center rounded-lg bg-emerald-400/10 text-emerald-300">
                  <Wallet className="size-4" />
                </span>
                <div>
                  <CardTitle className="text-sm tracking-normal">
                    Minha Carteira
                  </CardTitle>
                  <CardDescription className="mt-0.5 text-[10px]">
                    Faturas e divisão por responsável.
                  </CardDescription>
                </div>
              </div>
              <Button
                type="button"
                onClick={() => setIsAddCardModalOpen(true)}
                className="h-10 w-full gap-2 bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700 sm:w-auto"
              >
                <PlusCircle className="size-4" />
                Adicionar Cartão
              </Button>
            </CardHeader>
            <CardContent className="p-3 sm:p-4">
              <Carousel opts={{ dragFree: true }} className="w-full">
                <CarouselContent className="-ml-3 px-1 py-0.5">
                  {cardSpendingSummaries.map((cardSummary) => (
                    <CarouselItem
                      key={cardSummary.id}
                      className="basis-auto pl-3"
                    >
                      <FlippableWalletCard
                        cardSummary={cardSummary}
                        onPayInvoice={handlePayInvoiceClick}
                      />
                    </CarouselItem>
                  ))}

                  <CarouselItem className="basis-auto pl-3">
                    <div
                      className={cn(
                        walletCardSizeClassName,
                        "relative flex flex-col overflow-hidden rounded-xl border border-white/[0.1] bg-gradient-to-br from-blue-950 via-zinc-950 to-black p-4 text-zinc-100 shadow-xl shadow-black/20 sm:p-5",
                      )}
                    >
                      <div className="relative flex items-center justify-between gap-4">
                        <p className="text-sm font-medium text-white">
                          Gastos Fixos
                        </p>
                        <span className="flex size-7 items-center justify-center rounded-full border border-white/10 bg-black/15">
                          <CalendarDays className="size-3.5 text-blue-300" />
                        </span>
                      </div>
                      <div className="relative mt-3 flex flex-1 flex-col justify-between">
                        <strong className="block text-2xl font-bold leading-none tracking-tight text-white">
                          {formatPrivateCurrency(fixedSpendingTotal)}
                        </strong>
                        <div>
                          <div className="flex items-center justify-between text-xs text-zinc-400">
                            <span>Total do mês</span>
                            <span className="text-[11px] text-zinc-300">
                              Recorrentes
                            </span>
                          </div>
                          <div className="mt-1.5 h-px bg-white/15" />
                        </div>
                      </div>
                    </div>
                  </CarouselItem>

                  <CarouselItem className="basis-auto pl-3">
                    <div
                      className={cn(
                        walletCardSizeClassName,
                        "relative flex flex-col overflow-hidden rounded-xl border border-white/[0.1] bg-gradient-to-br from-emerald-950 via-zinc-950 to-black p-4 text-zinc-100 shadow-xl shadow-black/20 sm:p-5",
                      )}
                    >
                      <div className="relative flex items-center justify-between gap-4">
                        <p className="text-sm font-medium text-white">
                          Débito / Pix
                        </p>
                        <span className="flex size-7 items-center justify-center rounded-full border border-white/10 bg-black/15">
                          <QrCode className="size-3.5 text-emerald-300" />
                        </span>
                      </div>
                      <div className="relative mt-3 flex flex-1 flex-col justify-between">
                        <strong className="block text-2xl font-bold leading-none tracking-tight text-white">
                          {formatPrivateCurrency(debitPixSpendingTotal)}
                        </strong>
                        <div>
                          <div className="flex items-center justify-between text-xs text-zinc-400">
                            <span>Total do mês</span>
                            <span className="text-[11px] text-zinc-300">
                              À vista
                            </span>
                          </div>
                          <div className="mt-1.5 h-px bg-white/15" />
                        </div>
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

        <div className="col-span-12 min-w-0 lg:col-span-4">
          <Card
            className={cn(
              dashboardSurfaceClassName,
              "h-full w-full rounded-xl",
            )}
          >
            <CardHeader className="border-b border-border/50 p-3 2xl:p-4">
              <CardDescription className="text-[10px] 2xl:text-xs">
                Distribuição deste mês
              </CardDescription>
              <CardTitle className="text-sm tracking-normal 2xl:text-base">
                Gastos por Dependente
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-1 items-center p-2 2xl:p-4">
              {dependentSpendingSummaries.length ? (
                <div className="w-full space-y-2 p-2 2xl:space-y-4">
                  {dependentSpendingSummaries.map((dependent, index) => (
                    <div key={dependent.id} className="rounded-xl px-1 py-1">
                      <div className="mb-1 flex items-center justify-between gap-3">
                        <span className="flex min-w-0 items-center gap-2 text-sm font-medium text-zinc-300 2xl:text-base">
                          <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-white/[0.04] text-zinc-500">
                            <UserRound className="size-4" />
                          </span>
                          <span className="truncate">{dependent.name}</span>
                        </span>
                        <strong className="shrink-0 text-xs font-medium text-zinc-400 2xl:text-sm">
                          {formatPrivateCurrency(dependent.total)}
                        </strong>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{
                            width: `${dependentSpendingTotal > 0 ? (dependent.total / dependentSpendingTotal) * 100 : 0}%`,
                          }}
                          transition={{
                            duration: prefersReducedMotion ? 0 : 0.7,
                            delay: prefersReducedMotion ? 0 : index * 0.06,
                          }}
                          className={cn(
                            "h-full rounded-full",
                            [
                              "bg-emerald-400",
                              "bg-blue-400",
                              "bg-violet-400",
                              "bg-zinc-500",
                            ][index % 4],
                          )}
                        />
                      </div>
                      <p className="mt-1.5 truncate text-[10px] text-zinc-500 2xl:text-xs">
                        Recebido {formatPrivateCurrency(dependent.received)} · A
                        receber {formatPrivateCurrency(dependent.outstanding)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-3 rounded-xl border border-dashed border-border/70 px-4 py-3 text-sm text-muted-foreground">
                  <UserRound className="size-5 shrink-0 text-muted-foreground/50" />
                  Nenhum gasto vinculado a dependentes neste período.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </motion.div>
      <motion.section
        variants={dashboardReveal}
        initial="hidden"
        animate="visible"
        transition={{
          ...revealTransition,
          delay: prefersReducedMotion ? 0 : 0.2,
        }}
        className="grid min-h-0 flex-1 grid-cols-12 gap-6"
      >
        <Card
          className={cn(
            dashboardSurfaceClassName,
            "col-span-12 h-full min-w-0 overflow-hidden rounded-xl lg:col-span-8 lg:min-h-[clamp(16.25rem,28vh,22rem)]",
          )}
        >
          <CardHeader className="flex flex-row items-center justify-between gap-3 border-b border-border/50 p-3 2xl:p-5">
            <div>
              <CardTitle className="text-sm font-medium tracking-normal text-foreground 2xl:text-base">
                Movimentações recentes
              </CardTitle>
              <CardDescription className="mt-0.5 text-[10px] 2xl:text-xs">
                Seus lançamentos mais recentes no período.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="hidden rounded-lg lg:inline-flex"
              >
                {monthlyTransactions.length} no mês
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 rounded-md px-2 text-xs font-medium text-emerald-300 transition-all hover:bg-zinc-800/70 hover:text-emerald-200"
                asChild
              >
                <Link href="/dashboard/transactions">Ver todas</Link>
              </Button>
            </div>
          </CardHeader>

          <div className="space-y-2 p-3 md:hidden">
            {recentTransactions.length ? (
              recentTransactions.map((transaction) => {
                const categoryLabel =
                  transaction.category ||
                  getTransactionFallbackLabel(transaction);
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
              "hidden flex-1 overflow-x-auto transition-opacity md:block",
              isFetching && "pointer-events-none opacity-50",
            )}
          >
            <Table className="h-full w-full table-fixed text-xs xl:text-sm [&_td]:h-11 [&_td]:py-1.5 xl:[&_td]:h-12 2xl:[&_td]:h-14 [&_th]:h-8 [&_th]:py-1 2xl:[&_th]:h-10">
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-28">Data</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="w-36 text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentTransactions.length ? (
                  recentTransactions.map((transaction) => {
                    return (
                      <TableRow
                        key={transaction.id}
                        className="hover:bg-muted/35"
                      >
                        <TableCell className="whitespace-nowrap text-zinc-500">
                          {formatDateOnlyBR(transaction.date)}
                        </TableCell>
                        <TableCell className="min-w-0">
                          <div className="truncate font-medium text-zinc-200">
                            <TransactionDescription transaction={transaction} />
                          </div>
                          <div className="mt-0.5 truncate text-[10px] text-zinc-500 2xl:text-xs">
                            {transaction.category ||
                              getTransactionFallbackLabel(transaction)}
                          </div>
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
                      colSpan={3}
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

        <Card
          className={cn(
            dashboardSurfaceClassName,
            "col-span-12 h-full rounded-xl lg:col-span-4 lg:min-h-[clamp(16.25rem,28vh,22rem)]",
          )}
        >
          <CardHeader className="flex flex-row items-start justify-between gap-3 p-3 pb-1 2xl:p-5 2xl:pb-2">
            <div>
              <CardDescription className="text-[10px] 2xl:text-xs">
                Distribuição pessoal
              </CardDescription>
              <CardTitle className="text-sm tracking-normal text-foreground 2xl:text-base">
                Para onde foi seu dinheiro
              </CardTitle>
            </div>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className={cn(
                "h-7 shrink-0 px-2 text-[10px] 2xl:text-xs",
                budgetHealth.attention > 0
                  ? "text-amber-300 hover:text-amber-200"
                  : "text-zinc-400 hover:text-zinc-200",
              )}
            >
              <Link href="/dashboard/orcamentos">
                {budgetHealth.total
                  ? `${budgetHealth.attention} alertas`
                  : "Definir limites"}
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="flex flex-1 items-center p-4 2xl:p-6">
            {personalSpendingDistribution.categories.length ? (
              <div className="grid w-full grid-cols-1 items-center gap-4 sm:grid-cols-[136px_minmax(0,1fr)] lg:grid-cols-1 xl:grid-cols-[136px_minmax(0,1fr)] 2xl:grid-cols-[minmax(12rem,0.9fr)_minmax(0,1.1fr)] 2xl:gap-8">
                <div className="flex justify-center">
                  <div
                    className="relative flex size-28 items-center justify-center sm:size-32 lg:size-28 xl:size-32 2xl:size-[clamp(12rem,10vw,18rem)]"
                    aria-label="Distribuição dos gastos pessoais"
                  >
                    <div className="absolute inset-0 min-h-0 min-w-0">
                      <ResponsiveContainer
                        width="100%"
                        height="100%"
                        minWidth={1}
                        minHeight={1}
                        initialDimension={{ width: 128, height: 128 }}
                      >
                        <PieChart>
                          <Pie
                            data={personalSpendingDistribution.categories}
                            dataKey="amount"
                            nameKey="label"
                            innerRadius="60%"
                            outerRadius="80%"
                            paddingAngle={2}
                            cornerRadius={4}
                            stroke="#18181b"
                            strokeWidth={2}
                            isAnimationActive
                            animationDuration={1200}
                          >
                            {personalSpendingDistribution.categories.map(
                              (category) => (
                                <Cell
                                  key={category.label}
                                  fill={category.hex}
                                />
                              ),
                            )}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#18181b",
                              border: "1px solid #27272a",
                              borderRadius: "8px",
                              color: "#f4f4f5",
                            }}
                            itemStyle={{ color: "#f4f4f5" }}
                            formatter={(value, name) => [
                              formatPrivateCurrency(Number(value)),
                              name,
                            ]}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="relative flex size-[62%] flex-col items-center justify-center rounded-full bg-zinc-950 text-center shadow-inner">
                      <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-zinc-600 2xl:text-xs">
                        Total
                      </span>
                      <strong className="mt-0.5 max-w-[82%] truncate text-xs font-semibold text-zinc-100 2xl:text-[clamp(0.875rem,0.9vw,1.125rem)]">
                        {formatPrivateCurrency(
                          personalSpendingDistribution.total,
                        )}
                      </strong>
                    </div>
                  </div>
                </div>
                <div className="min-w-0 space-y-2.5 px-1 sm:px-0 2xl:space-y-4">
                  {personalSpendingDistribution.categories.map((category) => (
                    <div
                      key={category.label}
                      className="flex items-center justify-between gap-2 text-[11px] xl:text-xs 2xl:text-sm"
                    >
                      <span className="flex min-w-0 items-center gap-2 text-zinc-400">
                        <span
                          className="size-1.5 shrink-0 rounded-full 2xl:size-2"
                          style={{ backgroundColor: category.hex }}
                        />
                        <span className="truncate">{category.label}</span>
                      </span>
                      <span className="shrink-0 font-medium text-zinc-200">
                        {category.percentage.toFixed(0)}%
                      </span>
                    </div>
                  ))}
                  <div className="border-t border-white/[0.06] pt-2 text-[11px] text-zinc-500 xl:text-xs 2xl:pt-3 2xl:text-sm">
                    Economia{" "}
                    <strong className="float-right font-medium text-emerald-300">
                      {personalSpendingDistribution.savingsRate.toFixed(1)}%
                    </strong>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex min-h-36 items-center justify-center rounded-lg border border-dashed border-border text-center text-sm text-muted-foreground">
                Sem despesas pessoais neste período.
              </div>
            )}
          </CardContent>
        </Card>
      </motion.section>

      <motion.footer
        variants={dashboardReveal}
        initial="hidden"
        animate="visible"
        transition={{
          ...revealTransition,
          delay: prefersReducedMotion ? 0 : 0.24,
        }}
        className="hidden items-center gap-2 px-1 text-xs text-zinc-600"
      >
        <ShieldCheck className="size-3.5" />
        Seus dados financeiros permanecem protegidos e privados.
      </motion.footer>

      <AddCardModal
        isOpen={isAddCardModalOpen}
        onClose={() => setIsAddCardModalOpen(false)}
      />
      <AddIncomeModal
        isOpen={isAddIncomeModalOpen}
        onClose={handleCloseIncomeModal}
        onSelectExpense={() => {
          setIsAddIncomeModalOpen(false);
          setIsAddTransactionModalOpen(true);
        }}
        editingTransaction={
          editingTransaction?.type === "income" ? editingTransaction : null
        }
      />
      <AddTransactionModal
        isOpen={isAddTransactionModalOpen}
        onClose={handleCloseTransactionModal}
        onSelectIncome={() => {
          setIsAddTransactionModalOpen(false);
          setIsAddIncomeModalOpen(true);
        }}
        editingTransaction={
          editingTransaction && editingTransaction.type !== "income"
            ? editingTransaction
            : null
        }
      />
      <PayInvoiceModal
        open={Boolean(paymentTarget)}
        invoice={paymentTarget?.invoice ?? null}
        cardName={paymentTarget?.cardName}
        onOpenChange={(open) => {
          if (!open) setPaymentTarget(null);
        }}
      />
    </div>
  );
}
