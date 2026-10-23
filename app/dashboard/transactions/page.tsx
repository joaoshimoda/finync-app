"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MotionConfig, motion } from "framer-motion";
import {
  ArrowDownRight,
  ArrowUpRight,
  CheckSquare,
  CircleAlert,
  PlusCircle,
  SearchX,
} from "lucide-react";
import { toast } from "sonner";

import {
  dashboardPanelClassName,
  dashboardReveal,
  dashboardStagger,
  usePrivateCurrency,
} from "@/components/dashboard/shared";
import { AnimatedMonthSelector } from "@/components/finance/AnimatedMonthSelector";
import { AnimatedNumber } from "@/components/finance/AnimatedNumber";
import { RecurringDeleteDialog } from "@/components/finance/RecurringDeleteDialog";
import { TransactionDetailSheet } from "@/components/finance/TransactionDetailSheet";
import { TransactionEditSheet } from "@/components/finance/TransactionEditSheet";
import { useFocusRequest } from "@/components/layout/DashboardActionsProvider";
import { AddIncomeModal } from "@/components/modals/AddIncomeModal";
import { AddTransactionModal } from "@/components/modals/AddTransactionModal";
import { BulkActionBar } from "@/components/transactions/BulkActionBar";
import { TransactionRow } from "@/components/transactions/TransactionRow";
import { TransactionsToolbar } from "@/components/transactions/TransactionsToolbar";
import {
  getDependentId,
  getOriginKind,
  getOriginLabel,
  getTransactionCardId,
  groupTransactions,
  type GroupOption,
  type OriginFilter,
  type SortOption,
  type TypeFilter,
} from "@/components/transactions/transactionList";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getCardSignedAmount, isCardCreditAdjustment } from "@/lib/cardCredits";
import { reportAppError } from "@/lib/errorMonitoring";
import { supabase } from "@/lib/supabaseClient";
import { isTransactionInSelectedCompetence } from "@/lib/transactionPeriod";
import { getDateOnlyParts } from "@/lib/dateUtils";
import { cn } from "@/lib/utils";
import { useFinanceStore, type Transaction } from "@/store/useFinanceStore";

type IntegrityReviewFilter = "missing-category" | "unknown-category";

const viewStorageKey = "finync:transactions-view";
const sortValues: SortOption[] = [
  "recent",
  "oldest",
  "highest",
  "lowest",
  "alpha",
];
const groupValues: GroupOption[] = ["date", "category", "none"];

const monthFormatter = new Intl.DateTimeFormat("pt-BR", { month: "long" });

function readStoredView(): { sort: SortOption; group: GroupOption } {
  const fallback = {
    sort: "recent" as SortOption,
    group: "date" as GroupOption,
  };

  if (typeof window === "undefined") return fallback;

  try {
    const stored = JSON.parse(
      window.localStorage.getItem(viewStorageKey) ?? "{}",
    );

    return {
      sort: sortValues.includes(stored.sort) ? stored.sort : fallback.sort,
      group: groupValues.includes(stored.group) ? stored.group : fallback.group,
    };
  } catch {
    return fallback;
  }
}

export default function TransactionsPage() {
  return (
    <Suspense fallback={<div className="min-h-[60vh]" />}>
      <TransactionsPageContent />
    </Suspense>
  );
}

function TransactionsPageContent() {
  const formatPrivateCurrency = usePrivateCurrency();
  const router = useRouter();
  const searchParams = useSearchParams();
  const reviewParam = searchParams.get("review");
  const integrityReview: IntegrityReviewFilter | null =
    reviewParam === "missing-category" || reviewParam === "unknown-category"
      ? reviewParam
      : null;
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [originFilter, setOriginFilter] = useState<OriginFilter>("all");
  const [cardFilter, setCardFilter] = useState("all");
  const [view, setView] = useState(readStoredView);
  const [isAddIncomeModalOpen, setIsAddIncomeModalOpen] = useState(false);
  const [isAddTransactionModalOpen, setIsAddTransactionModalOpen] =
    useState(false);
  const [detailTransaction, setDetailTransaction] =
    useState<Transaction | null>(null);
  const [sheetEditingTransaction, setSheetEditingTransaction] =
    useState<Transaction | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);

  const cards = useFinanceStore((state) => state.cards);
  const dependents = useFinanceStore((state) => state.dependents);
  const storedCategories = useFinanceStore((state) => state.categories);
  const transactions = useFinanceStore((state) => state.transactions);
  const isFetching = useFinanceStore((state) => state.isFetching);
  const fetchTransactions = useFinanceStore((state) => state.fetchTransactions);
  const deleteTransaction = useFinanceStore((state) => state.deleteTransaction);
  const deleteTransactionGroup = useFinanceStore(
    (state) => state.deleteTransactionGroup,
  );
  const updateTransactionCategories = useFinanceStore(
    (state) => state.updateTransactionCategories,
  );
  const currentMonth = useFinanceStore((state) => state.currentMonth);
  const currentYear = useFinanceStore((state) => state.currentYear);
  const nextMonth = useFinanceStore((state) => state.nextMonth);
  const prevMonth = useFinanceStore((state) => state.prevMonth);
  const goToMonth = useFinanceStore((state) => state.goToMonth);
  const [pendingOpenId, setPendingOpenId] = useState<string | null>(null);

  /* From the global search: jump to the month, filter and open the item. */
  useFocusRequest("transaction", (target) => {
    const { month, year } = getDateOnlyParts(target.monthStart);
    goToMonth(month, year);
    setCategoryFilter("all");
    setTypeFilter("all");
    setSearchTerm(target.query);
    setPendingOpenId(target.id);
  });
  useFocusRequest("search", (target) => {
    setCategoryFilter("all");
    setSearchTerm(target.query);
  });
  useFocusRequest("category", (target) => {
    setSearchTerm("");
    setCategoryFilter(target.label);
  });

  useEffect(() => {
    if (!pendingOpenId || isFetching) return;
    const target = transactions.find((transaction) => transaction.id === pendingOpenId);
    if (!target) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- open the searched item once its month has loaded
    setDetailTransaction(target);
    setPendingOpenId(null);
  }, [isFetching, pendingOpenId, transactions]);

  const refreshDisplayedTransactions = useCallback(
    () => fetchTransactions({ includeAllMonths: Boolean(integrityReview) }),
    [fetchTransactions, integrityReview],
  );

  useEffect(() => {
    void refreshDisplayedTransactions();
  }, [currentMonth, currentYear, refreshDisplayedTransactions]);

  useEffect(() => {
    try {
      window.localStorage.setItem(viewStorageKey, JSON.stringify(view));
    } catch {
      // The chosen view only lasts for this visit when storage is unavailable.
    }
  }, [view]);

  const selectedMonthName = monthFormatter.format(
    new Date(currentYear, currentMonth - 1, 1),
  );

  const displayedTransactions = useMemo(() => {
    if (!integrityReview) {
      return transactions.filter((transaction) =>
        isTransactionInSelectedCompetence(
          transaction,
          currentMonth,
          currentYear,
        ),
      );
    }

    const registeredExpenseCategories = new Set(
      storedCategories
        .filter(
          (category) => category.kind === "expense" && !category.isDefault,
        )
        .map((category) => category.label.trim().toLocaleLowerCase("pt-BR")),
    );

    return transactions.filter((transaction) => {
      if (transaction.type === "income") return false;

      const category = transaction.category?.trim();

      if (integrityReview === "missing-category") return !category;
      if (!category || isCardCreditAdjustment(transaction)) return false;

      return !registeredExpenseCategories.has(
        category.toLocaleLowerCase("pt-BR"),
      );
    });
  }, [
    currentMonth,
    currentYear,
    integrityReview,
    storedCategories,
    transactions,
  ]);

  const activeCategories = useMemo(
    () =>
      Array.from(
        new Set(
          displayedTransactions
            .map((transaction) => transaction.category?.trim())
            .filter((category): category is string => Boolean(category)),
        ),
      ).sort((left, right) => left.localeCompare(right, "pt-BR")),
    [displayedTransactions],
  );

  const assignableCategories = useMemo(
    () =>
      Array.from(
        new Set([
          ...storedCategories.map((category) => category.label),
          ...activeCategories,
        ]),
      ).sort((left, right) => left.localeCompare(right, "pt-BR")),
    [activeCategories, storedCategories],
  );

  const dependentNamesById = useMemo(
    () =>
      new Map(dependents.map((dependent) => [dependent.id, dependent.name])),
    [dependents],
  );

  const filteredTransactions = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLocaleLowerCase("pt-BR");

    return displayedTransactions.filter((transaction) => {
      const originKind = getOriginKind(transaction);
      const matchesSearch =
        !normalizedSearch ||
        [
          transaction.description,
          transaction.category,
          getOriginLabel(transaction, cards),
        ].some((value) =>
          value?.toLocaleLowerCase("pt-BR").includes(normalizedSearch),
        );
      const matchesCategory =
        categoryFilter === "all" || transaction.category === categoryFilter;
      const matchesType =
        typeFilter === "all" ||
        (typeFilter === "income" && transaction.type === "income") ||
        (typeFilter === "expense" && transaction.type !== "income") ||
        (typeFilter === "fixed" && transaction.type === "fixed");
      const matchesOrigin =
        originFilter === "all" || originKind === originFilter;
      const matchesCard =
        originFilter !== "card" ||
        cardFilter === "all" ||
        getTransactionCardId(transaction) === cardFilter;

      return (
        matchesSearch &&
        matchesCategory &&
        matchesType &&
        matchesOrigin &&
        matchesCard
      );
    });
  }, [
    cardFilter,
    cards,
    categoryFilter,
    displayedTransactions,
    originFilter,
    searchTerm,
    typeFilter,
  ]);

  const groups = useMemo(
    () => groupTransactions(filteredTransactions, view.sort, view.group),
    [filteredTransactions, view.group, view.sort],
  );

  const summary = useMemo(() => {
    const totalIncome = filteredTransactions
      .filter((transaction) => transaction.type === "income")
      .reduce((total, transaction) => total + transaction.amount, 0);
    const totalExpense = filteredTransactions
      .filter(
        (transaction) =>
          transaction.type !== "income" && !getDependentId(transaction),
      )
      .reduce(
        (total, transaction) =>
          total +
          (transaction.type === "card"
            ? getCardSignedAmount(transaction)
            : transaction.amount),
        0,
      );

    return {
      totalIncome,
      totalExpense,
      netBalance: totalIncome - totalExpense,
    };
  }, [filteredTransactions]);

  const visibleIds = useMemo(
    () => filteredTransactions.map((transaction) => transaction.id),
    [filteredTransactions],
  );
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const isSelecting = isSelectionMode || selectedIds.length > 0;
  const areAllVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIdSet.has(id));

  const clearFilters = useCallback(() => {
    setSearchTerm("");
    setCategoryFilter("all");
    setTypeFilter("all");
    setOriginFilter("all");
    setCardFilter("all");
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds([]);
    setIsSelectionMode(false);
  }, []);

  const handleExitIntegrityReview = useCallback(() => {
    clearSelection();
    clearFilters();
    router.replace("/dashboard/transactions");
  }, [clearFilters, clearSelection, router]);

  const handleEditTransaction = useCallback((transaction: Transaction) => {
    setDetailTransaction(null);
    setSheetEditingTransaction(transaction);
  }, []);

  const toggleTransactionSelection = useCallback(
    (transactionId: string, checked: boolean) => {
      setSelectedIds((currentIds) =>
        checked
          ? currentIds.includes(transactionId)
            ? currentIds
            : [...currentIds, transactionId]
          : currentIds.filter((id) => id !== transactionId),
      );
    },
    [],
  );

  const toggleSelectAllVisible = useCallback(() => {
    setSelectedIds((currentIds) =>
      areAllVisibleSelected
        ? currentIds.filter((id) => !visibleIds.includes(id))
        : Array.from(new Set([...currentIds, ...visibleIds])),
    );
  }, [areAllVisibleSelected, visibleIds]);

  const handleDeleteTransaction = useCallback(
    async (transactionId: string) => {
      try {
        await deleteTransaction(transactionId);
        toast.success("Movimentação excluída.");
        setDeleteTarget(null);
        setDetailTransaction((current) =>
          current?.id === transactionId ? null : current,
        );
      } catch (error) {
        console.error("Erro ao excluir movimentação:", error);
        toast.error("Não foi possível excluir agora.");
        throw error;
      }
    },
    [deleteTransaction],
  );

  const handleDeleteFutureTransactions = useCallback(
    async (transaction: Transaction) => {
      if (!transaction.groupId) return;

      try {
        await deleteTransactionGroup(transaction.groupId, transaction.date);
        toast.success("Recorrência atual e próximas excluídas.");
        setDeleteTarget(null);
      } catch (error) {
        console.error("Erro ao excluir recorrência:", error);
        toast.error("Não foi possível excluir a recorrência agora.");
        throw error;
      }
    },
    [deleteTransactionGroup],
  );

  const handleBulkDelete = useCallback(async () => {
    if (!selectedIds.length) return;

    setIsBulkSubmitting(true);

    try {
      const { error } = await supabase
        .from("transactions")
        .delete()
        .in("id", selectedIds);

      if (error) throw error;

      toast.success(
        `${selectedIds.length} ${selectedIds.length === 1 ? "transação excluída" : "transações excluídas"}.`,
      );
      clearSelection();
      await refreshDisplayedTransactions();
    } catch (error) {
      void reportAppError(error, {
        source: "SUPABASE",
        context: { operation: "Excluir transações em massa" },
      });
      toast.error("Não foi possível excluir as transações selecionadas.");
      throw error;
    } finally {
      setIsBulkSubmitting(false);
    }
  }, [clearSelection, refreshDisplayedTransactions, selectedIds]);

  const handleBulkCategory = useCallback(
    async (category: string) => {
      if (!selectedIds.length) return;

      setIsBulkSubmitting(true);

      try {
        await updateTransactionCategories(selectedIds, category);
        toast.success("Categoria atualizada nas transações selecionadas.");
        clearSelection();
        await refreshDisplayedTransactions();
      } catch (error) {
        console.error("Erro ao atualizar categoria em massa:", error);
        toast.error("Não foi possível atualizar a categoria agora.");
      } finally {
        setIsBulkSubmitting(false);
      }
    },
    [
      clearSelection,
      refreshDisplayedTransactions,
      selectedIds,
      updateTransactionCategories,
    ],
  );

  const summaryStats = [
    {
      label: "Entradas",
      value: summary.totalIncome,
      icon: ArrowUpRight,
      iconClassName: "bg-emerald-500/10 text-emerald-300",
      valueClassName: "text-emerald-300",
    },
    {
      label: "Saídas pessoais",
      value: summary.totalExpense,
      icon: ArrowDownRight,
      iconClassName: "bg-rose-500/10 text-rose-300",
      valueClassName: "text-zinc-50",
    },
    {
      label: "Saldo",
      value: summary.netBalance,
      icon: null,
      iconClassName: "",
      valueClassName: summary.netBalance < 0 ? "text-rose-400" : "text-zinc-50",
    },
  ];
  const resultLabel = `${filteredTransactions.length} ${filteredTransactions.length === 1 ? "movimentação" : "movimentações"}`;
  const firstUpcomingGroupKey =
    view.group === "date" && view.sort !== "oldest"
      ? groups.find((group) => group.hint === "Previsto")?.key
      : undefined;

  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        variants={dashboardStagger}
        initial="hidden"
        animate="visible"
        className="flex w-full flex-col gap-5 pb-24 sm:gap-6 md:pb-4"
      >
        <motion.header
          variants={dashboardReveal}
          className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"
        >
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-[-0.03em] text-zinc-50 sm:text-3xl">
              Transações
            </h1>
            <p className="mt-1 text-sm text-zinc-400">
              {integrityReview
                ? "Revisão de todo o histórico."
                : `${resultLabel} em ${selectedMonthName}.`}
            </p>
          </div>

          <div className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2 sm:flex sm:w-auto">
            {integrityReview ? (
              <span className="flex h-11 items-center justify-center rounded-lg bg-amber-400/[0.08] px-4 text-sm text-amber-200 ring-1 ring-inset ring-amber-400/20">
                Todo o histórico
              </span>
            ) : (
              <div className="min-w-0 sm:shrink-0">
                <AnimatedMonthSelector
                  currentMonth={currentMonth}
                  currentYear={currentYear}
                  onPreviousMonth={prevMonth}
                  onNextMonth={nextMonth}
                  isLoading={isFetching}
                />
              </div>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  aria-label="Criar nova transação"
                  data-tour="transactions-add"
                  className="h-11 gap-2 rounded-lg bg-emerald-400 px-4 text-sm font-semibold text-zinc-950 hover:bg-emerald-300 sm:px-5"
                >
                  <PlusCircle className="size-5" />
                  <span className="hidden min-[420px]:inline">Nova</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-[calc(100vw-2rem)] max-w-72 p-2"
              >
                <DropdownMenuItem
                  className="cursor-pointer gap-4 rounded-xl p-3"
                  onClick={() => setIsAddIncomeModalOpen(true)}
                >
                  <div className="rounded-full bg-emerald-500/10 p-2.5 text-emerald-400">
                    <ArrowUpRight className="size-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium">Receita</span>
                    <span className="text-xs text-muted-foreground">
                      Registrar nova entrada
                    </span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer gap-4 rounded-xl p-3"
                  onClick={() => setIsAddTransactionModalOpen(true)}
                >
                  <div className="rounded-full bg-rose-500/10 p-2.5 text-rose-400">
                    <ArrowDownRight className="size-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium">Despesa</span>
                    <span className="text-xs text-muted-foreground">
                      Registrar novo gasto
                    </span>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </motion.header>

        {integrityReview && (
          <motion.section
            variants={dashboardReveal}
            className="flex flex-col gap-4 rounded-2xl border border-amber-400/15 bg-amber-400/[0.05] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
          >
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-400/10 text-amber-300">
                <CircleAlert className="size-5" />
              </span>
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-zinc-100">
                  {integrityReview === "missing-category"
                    ? "Transações sem categoria"
                    : "Categorias fora do cadastro"}
                </h2>
                <p className="mt-1 text-xs leading-5 text-zinc-400 sm:text-sm">
                  {integrityReview === "missing-category"
                    ? "Exibindo somente lançamentos sem categoria em todo o histórico."
                    : "Exibindo categorias gravadas nas transações que não existem mais no seu cadastro."}
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              className="h-10 shrink-0 border-zinc-700 bg-zinc-950"
              onClick={handleExitIntegrityReview}
            >
              Voltar ao mês atual
            </Button>
          </motion.section>
        )}

        <motion.section
          variants={dashboardReveal}
          aria-label="Resumo das movimentações filtradas"
          className={cn(
            dashboardPanelClassName,
            "grid grid-cols-2 divide-white/[0.06] sm:grid-cols-3 sm:divide-x",
          )}
        >
          {summaryStats.map((stat, index) => {
            const Icon = stat.icon;

            return (
              <div
                key={stat.label}
                className={cn(
                  "flex min-w-0 items-center gap-3 p-4 sm:p-5",
                  index === 2 &&
                    "col-span-2 border-t border-white/[0.06] sm:col-span-1 sm:border-t-0",
                )}
              >
                {Icon && (
                  <span
                    className={cn(
                      "hidden size-10 shrink-0 items-center justify-center rounded-xl sm:flex",
                      stat.iconClassName,
                    )}
                  >
                    <Icon className="size-4" />
                  </span>
                )}
                <div className="min-w-0">
                  <p className="truncate text-xs text-zinc-500">{stat.label}</p>
                  <AnimatedNumber
                    value={stat.value}
                    format={formatPrivateCurrency}
                    className={cn(
                      "mt-0.5 block truncate text-lg font-semibold tabular-nums sm:text-xl",
                      stat.valueClassName,
                    )}
                  />
                </div>
              </div>
            );
          })}
        </motion.section>

        <motion.section
          variants={dashboardReveal}
          aria-label="Lista de transações"
          className={cn(dashboardPanelClassName, "min-w-0 p-3 sm:p-5")}
        >
          <div className="px-1 pt-1 sm:px-0 sm:pt-0">
            <TransactionsToolbar
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              typeFilter={typeFilter}
              onTypeChange={setTypeFilter}
              categoryFilter={categoryFilter}
              onCategoryChange={setCategoryFilter}
              originFilter={originFilter}
              onOriginChange={(value) => {
                setOriginFilter(value);
                if (value !== "card") setCardFilter("all");
              }}
              cardFilter={cardFilter}
              onCardChange={setCardFilter}
              sort={view.sort}
              onSortChange={(sort) =>
                setView((current) => ({ ...current, sort }))
              }
              group={view.group}
              onGroupChange={(group) =>
                setView((current) => ({ ...current, group }))
              }
              categories={activeCategories}
              cards={cards}
              onClearFilters={clearFilters}
            />
          </div>

          <div className="mt-5 flex items-center justify-between gap-3 px-1 sm:px-0">
            <p className="text-xs font-medium text-zinc-500">{resultLabel}</p>
            {filteredTransactions.length > 0 &&
              (isSelecting ? (
                <div className="flex items-center gap-3 text-xs font-medium">
                  <button
                    type="button"
                    onClick={toggleSelectAllVisible}
                    className="text-emerald-300 transition-colors hover:text-emerald-200"
                  >
                    {areAllVisibleSelected
                      ? "Desmarcar todas"
                      : "Selecionar todas"}
                  </button>
                  <button
                    type="button"
                    onClick={clearSelection}
                    className="text-zinc-400 transition-colors hover:text-zinc-100"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsSelectionMode(true)}
                  className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 transition-colors hover:text-zinc-100"
                >
                  <CheckSquare className="size-3.5" />
                  Selecionar
                </button>
              ))}
          </div>

          <div
            className={cn(
              "mt-2 transition-opacity duration-300",
              isFetching && "pointer-events-none opacity-60",
            )}
          >
            {groups.length ? (
              <div className="space-y-4">
                {groups.map((group, groupIndex) => (
                  <motion.section
                    key={`${view.group}-${view.sort}-${group.key}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.3,
                      delay: Math.min(groupIndex * 0.04, 0.24),
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    aria-label={group.label}
                  >
                    {group.key === firstUpcomingGroupKey && (
                      <div className="mb-3 mt-6 flex items-center gap-3 px-1 sm:px-3">
                        <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-500">
                          Próximos lançamentos
                        </span>
                        <span className="h-px flex-1 bg-white/[0.06]" />
                      </div>
                    )}
                    {view.group !== "none" && (
                      <div className="px-1 pb-1 sm:px-3">
                        <div className="flex items-baseline justify-between gap-3">
                          <h3 className="flex min-w-0 items-center gap-2 text-xs font-medium text-zinc-400">
                            <span className="truncate">{group.label}</span>
                            {group.hint && (
                              <span
                                className={cn(
                                  "shrink-0 rounded-full px-1.5 py-px text-[10px]",
                                  group.hint === "Previsto"
                                    ? "bg-amber-500/10 text-amber-300"
                                    : "bg-zinc-800 text-zinc-500",
                                )}
                              >
                                {group.hint}
                              </span>
                            )}
                          </h3>
                          <span
                            className={cn(
                              "shrink-0 text-xs font-medium tabular-nums",
                              group.total > 0
                                ? "text-emerald-300"
                                : "text-zinc-500",
                            )}
                          >
                            {group.total > 0 ? "+" : group.total < 0 ? "-" : ""}
                            {formatPrivateCurrency(Math.abs(group.total))}
                          </span>
                        </div>
                        {group.share !== undefined && (
                          <div className="mt-2 h-1 overflow-hidden rounded-full bg-zinc-800/80">
                            <motion.div
                              className="h-full rounded-full bg-emerald-400/70"
                              initial={{ width: 0 }}
                              animate={{ width: `${group.share}%` }}
                              transition={{
                                duration: 0.6,
                                ease: [0.22, 1, 0.36, 1],
                              }}
                            />
                          </div>
                        )}
                      </div>
                    )}
                    <ul>
                      {group.transactions.map((transaction) => {
                        const dependentId = getDependentId(transaction);

                        return (
                          <TransactionRow
                            key={transaction.id}
                            transaction={transaction}
                            originLabel={getOriginLabel(transaction, cards)}
                            dependentName={
                              dependentId
                                ? dependentNamesById.get(dependentId)
                                : null
                            }
                            showDate={view.group !== "date"}
                            showCategory={view.group !== "category"}
                            isSelected={selectedIdSet.has(transaction.id)}
                            isSelecting={isSelecting}
                            formatAmount={formatPrivateCurrency}
                            onOpen={setDetailTransaction}
                            onEdit={handleEditTransaction}
                            onDelete={setDeleteTarget}
                            onToggleSelect={toggleTransactionSelection}
                          />
                        );
                      })}
                    </ul>
                  </motion.section>
                ))}
              </div>
            ) : (
              <div className="flex min-h-56 flex-col items-center justify-center gap-3 text-center">
                <span className="flex size-12 items-center justify-center rounded-full bg-zinc-800/80 text-zinc-500">
                  <SearchX className="size-5" />
                </span>
                <div>
                  <p className="text-sm font-medium text-zinc-200">
                    Nenhuma transação encontrada
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {displayedTransactions.length
                      ? "Tente ajustar a busca ou os filtros."
                      : `Nada lançado em ${selectedMonthName} ainda.`}
                  </p>
                </div>
                {displayedTransactions.length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={clearFilters}
                    className="border-white/[0.1] bg-zinc-950"
                  >
                    Limpar filtros
                  </Button>
                )}
              </div>
            )}
          </div>
        </motion.section>
      </motion.div>

      <BulkActionBar
        selectedCount={selectedIds.length}
        categories={assignableCategories}
        isSubmitting={isBulkSubmitting}
        onAssignCategory={(category) => void handleBulkCategory(category)}
        onDelete={handleBulkDelete}
        onClear={clearSelection}
      />

      <TransactionDetailSheet
        transaction={detailTransaction}
        transactions={transactions}
        cardName={
          detailTransaction
            ? cards.find(
                (card) => card.id === getTransactionCardId(detailTransaction),
              )?.name
            : null
        }
        dependentName={
          detailTransaction
            ? dependentNamesById.get(getDependentId(detailTransaction) ?? "")
            : null
        }
        open={Boolean(detailTransaction)}
        onOpenChange={(open) => {
          if (!open) setDetailTransaction(null);
        }}
        onEdit={handleEditTransaction}
      />

      <TransactionEditSheet
        key={sheetEditingTransaction?.id ?? "closed-transaction-editor"}
        transaction={sheetEditingTransaction}
        open={Boolean(sheetEditingTransaction)}
        onSaved={refreshDisplayedTransactions}
        onOpenChange={(open) => {
          if (!open) setSheetEditingTransaction(null);
        }}
      />

      {deleteTarget?.groupId ? (
        <RecurringDeleteDialog
          transaction={deleteTarget}
          open={Boolean(deleteTarget)}
          onOpenChange={(open) => {
            if (!open) setDeleteTarget(null);
          }}
          onDeleteSingle={(item) => handleDeleteTransaction(item.id)}
          onDeleteFuture={handleDeleteFutureTransactions}
        />
      ) : null}

      {deleteTarget && !deleteTarget.groupId ? (
        <ConfirmDialog
          open={Boolean(deleteTarget)}
          onOpenChange={(open) => {
            if (!open) setDeleteTarget(null);
          }}
          title="Excluir transação?"
          description="Esta ação remove o lançamento permanentemente e não pode ser desfeita."
          confirmLabel="Excluir transação"
          loadingLabel="Excluindo..."
          details={deleteTarget.description}
          onConfirm={() => handleDeleteTransaction(deleteTarget.id)}
        />
      ) : null}

      <AddIncomeModal
        isOpen={isAddIncomeModalOpen}
        onClose={() => setIsAddIncomeModalOpen(false)}
        onSelectExpense={() => {
          setIsAddIncomeModalOpen(false);
          setIsAddTransactionModalOpen(true);
        }}
      />
      <AddTransactionModal
        isOpen={isAddTransactionModalOpen}
        onClose={() => setIsAddTransactionModalOpen(false)}
        onSelectIncome={() => {
          setIsAddTransactionModalOpen(false);
          setIsAddIncomeModalOpen(true);
        }}
      />
    </MotionConfig>
  );
}
