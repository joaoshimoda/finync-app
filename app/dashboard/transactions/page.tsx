"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Eye,
  Landmark,
  MoreHorizontal,
  Pencil,
  PlusCircle,
  Search,
  SearchX,
  SlidersHorizontal,
  Tag,
  Trash2,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import { RecurringDeleteDialog } from "@/components/finance/RecurringDeleteDialog";
import { TransactionDescription } from "@/components/finance/TransactionDescription";
import { TransactionDetailSheet } from "@/components/finance/TransactionDetailSheet";
import { TransactionEditSheet } from "@/components/finance/TransactionEditSheet";
import { AddIncomeModal } from "@/components/modals/AddIncomeModal";
import { AddTransactionModal } from "@/components/modals/AddTransactionModal";
import { PRODUCT_TOUR_PREVIEW_EVENTS } from "@/components/onboarding/tourSteps";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateOnlyBR } from "@/lib/dateUtils";
import { reportAppError } from "@/lib/errorMonitoring";
import { getCardSignedAmount, isCardCreditAdjustment } from "@/lib/cardCredits";
import { supabase } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";
import { isTransactionInSelectedCompetence } from "@/lib/transactionPeriod";
import { useFinanceStore, type Transaction } from "@/store/useFinanceStore";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";

type TypeFilter = "all" | "income" | "expense" | "fixed";
type OriginFilter = "all" | "card" | "debit-pix";
type TransactionOrigin = Exclude<OriginFilter, "all"> | "income";

const monthFormatter = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  year: "numeric",
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

function sortByRecentDate(left: Transaction, right: Transaction) {
  const dateOrder = right.date.localeCompare(left.date);

  if (dateOrder !== 0) return dateOrder;

  return (right.createdAt ?? "").localeCompare(left.createdAt ?? "");
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

function getDependentId(transaction: Transaction) {
  return (
    (transaction as Transaction & { dependent_id?: string | null })
      .dependent_id ?? transaction.dependentId
  );
}

function getTransactionCardId(transaction: Transaction) {
  return (
    (transaction as Transaction & { card_id?: string | null }).card_id ??
    transaction.cardId ??
    null
  );
}

function getTransactionOrigin(
  transaction: Transaction,
  cards: ReturnType<typeof useFinanceStore.getState>["cards"],
) {
  if (transaction.type === "income") return "Receita";
  if (transaction.type === "fixed") return "Débito/PIX";

  return (
    cards.find((card) => card.id === getTransactionCardId(transaction))?.name ??
    "Cartão de crédito"
  );
}

function getTransactionOriginFilter(
  transaction: Transaction,
): TransactionOrigin {
  if (transaction.type === "income") return "income";
  if (transaction.type === "card" || Boolean(getTransactionCardId(transaction))) {
    return "card";
  }

  return "debit-pix";
}

function getOriginBadgeClassName(origin: TransactionOrigin) {
  if (origin === "card") {
    return "border-violet-400/15 bg-violet-400/10 text-violet-300";
  }

  if (origin === "income") {
    return "border-emerald-400/15 bg-emerald-400/10 text-emerald-300";
  }

  return "border-sky-400/15 bg-sky-400/10 text-sky-300";
}

export default function TransactionsPage() {
  const { formatCurrency } = useCurrencyFormatter();
  const prefersReducedMotion = useReducedMotion();
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [originFilter, setOriginFilter] = useState<OriginFilter>("all");
  const [cardFilter, setCardFilter] = useState("all");
  const [isAddIncomeModalOpen, setIsAddIncomeModalOpen] = useState(false);
  const [isAddTransactionModalOpen, setIsAddTransactionModalOpen] =
    useState(false);
  const [detailTransaction, setDetailTransaction] =
    useState<Transaction | null>(null);
  const [sheetEditingTransaction, setSheetEditingTransaction] =
    useState<Transaction | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);

  const cards = useFinanceStore((state) => state.cards);
  const dependents = useFinanceStore((state) => state.dependents);
  const storedCategories = useFinanceStore((state) => state.categories);
  const transactions = useFinanceStore((state) => state.transactions);
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

  useEffect(() => {
    void fetchTransactions();
  }, [currentMonth, currentYear, fetchTransactions]);

  const selectedPeriodLabel = monthFormatter.format(
    new Date(currentYear, currentMonth - 1, 1),
  );
  const formattedSelectedPeriodLabel =
    selectedPeriodLabel.charAt(0).toUpperCase() + selectedPeriodLabel.slice(1);

  const monthlyTransactions = useMemo(
    () =>
      transactions
        .filter((transaction) =>
          isSameSelectedMonth(transaction, currentMonth, currentYear),
        )
        .sort(sortByRecentDate),
    [currentMonth, currentYear, transactions],
  );

  const activeCategories = useMemo(() => {
    const uniqueCategories = new Set(
      monthlyTransactions
        .map((transaction) => transaction.category?.trim())
        .filter((category): category is string => Boolean(category)),
    );

    return Array.from(uniqueCategories).sort((left, right) =>
      left.localeCompare(right, "pt-BR"),
    );
  }, [monthlyTransactions]);

  const assignableCategories = useMemo(() => {
    const uniqueCategories = new Set([
      ...storedCategories.map((category) => category.label),
      ...activeCategories,
    ]);

    return Array.from(uniqueCategories).sort((left, right) =>
      left.localeCompare(right, "pt-BR"),
    );
  }, [activeCategories, storedCategories]);

  const filteredTransactions = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return monthlyTransactions.filter((transaction) => {
      const originLabel = getTransactionOrigin(transaction, cards);
      const matchesSearch =
        !normalizedSearch ||
        transaction.description.toLowerCase().includes(normalizedSearch) ||
        transaction.category?.toLowerCase().includes(normalizedSearch) ||
        originLabel.toLowerCase().includes(normalizedSearch);
      const matchesCategory =
        categoryFilter === "all" || transaction.category === categoryFilter;
      const matchesType =
        typeFilter === "all" ||
        (typeFilter === "income" && transaction.type === "income") ||
        (typeFilter === "expense" && transaction.type !== "income") ||
        (typeFilter === "fixed" && transaction.type === "fixed");
      const matchesOrigin =
        originFilter === "all" ||
        getTransactionOriginFilter(transaction) === originFilter;
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
    monthlyTransactions,
    originFilter,
    searchTerm,
    typeFilter,
  ]);

  const visibleTransactionIds = useMemo(
    () => filteredTransactions.map((transaction) => transaction.id),
    [filteredTransactions],
  );

  const selectedVisibleIds = useMemo(
    () => selectedIds.filter((id) => visibleTransactionIds.includes(id)),
    [selectedIds, visibleTransactionIds],
  );

  const isAllVisibleSelected =
    visibleTransactionIds.length > 0 &&
    selectedVisibleIds.length === visibleTransactionIds.length;
  const isSomeVisibleSelected =
    selectedVisibleIds.length > 0 && !isAllVisibleSelected;

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

  const hasActiveFilters =
    searchTerm.trim().length > 0 ||
    categoryFilter !== "all" ||
    typeFilter !== "all" ||
    originFilter !== "all";

  const clearFilters = useCallback(() => {
    setSearchTerm("");
    setCategoryFilter("all");
    setTypeFilter("all");
    setOriginFilter("all");
    setCardFilter("all");
  }, []);

  const handleCloseIncomeModal = useCallback(() => {
    setIsAddIncomeModalOpen(false);
  }, []);

  const handleCloseTransactionModal = useCallback(() => {
    setIsAddTransactionModalOpen(false);
  }, []);

  useEffect(() => {
    function openExpensePreview() {
      setIsAddIncomeModalOpen(false);
      setIsAddTransactionModalOpen(true);
    }

    function openIncomePreview() {
      setIsAddTransactionModalOpen(false);
      setIsAddIncomeModalOpen(true);
    }

    window.addEventListener(
      PRODUCT_TOUR_PREVIEW_EVENTS.expense,
      openExpensePreview,
    );
    window.addEventListener(
      PRODUCT_TOUR_PREVIEW_EVENTS.income,
      openIncomePreview,
    );

    return () => {
      window.removeEventListener(
        PRODUCT_TOUR_PREVIEW_EVENTS.expense,
        openExpensePreview,
      );
      window.removeEventListener(
        PRODUCT_TOUR_PREVIEW_EVENTS.income,
        openIncomePreview,
      );
    };
  }, []);

  const handleEditTransaction = useCallback(
    (transaction: Transaction) => {
      setDetailTransaction(null);
      setSheetEditingTransaction(transaction);
    },
    [],
  );

  const handleOpenTransactionDetail = useCallback(
    (transaction: Transaction) => {
      setDetailTransaction(transaction);
    },
    [],
  );

  const handleDeleteTransaction = useCallback(async (transactionId: string) => {
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
  }, [deleteTransaction]);

  const handleDeleteFutureTransactions = useCallback(async (transaction: Transaction) => {
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
  }, [deleteTransactionGroup]);

  const toggleSelectAllVisible = useCallback((checked: boolean | "indeterminate") => {
    if (checked) {
      setSelectedIds((currentIds) =>
        Array.from(new Set([...currentIds, ...visibleTransactionIds])),
      );
      return;
    }

    setSelectedIds((currentIds) =>
      currentIds.filter((id) => !visibleTransactionIds.includes(id)),
    );
  }, [visibleTransactionIds]);

  const toggleTransactionSelection = useCallback((
    transactionId: string,
    checked: boolean | "indeterminate",
  ) => {
    if (checked) {
      setSelectedIds((currentIds) =>
        currentIds.includes(transactionId)
          ? currentIds
          : [...currentIds, transactionId],
      );
      return;
    }

    setSelectedIds((currentIds) =>
      currentIds.filter((id) => id !== transactionId),
    );
  }, []);

  const handleBulkDelete = useCallback(async () => {
    if (!selectedIds.length) return;

    setIsBulkSubmitting(true);

    try {
      const { error } = await supabase
        .from("transactions")
        .delete()
        .in("id", selectedIds);

      if (error) throw error;

      toast.success(`${selectedIds.length} transações excluídas.`);
      setSelectedIds([]);
      await fetchTransactions();
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
  }, [fetchTransactions, selectedIds]);

  const handleBulkCategory = useCallback(async (category: string) => {
    if (!selectedIds.length) return;

    setIsBulkSubmitting(true);

    try {
      await updateTransactionCategories(selectedIds, category);

      toast.success("Categoria atualizada nas transações selecionadas.");
      setSelectedIds([]);
      await fetchTransactions();
    } catch (error) {
      console.error("Erro ao atualizar categoria em massa:", error);
      toast.error("Não foi possível atualizar a categoria agora.");
    } finally {
      setIsBulkSubmitting(false);
    }
  }, [fetchTransactions, selectedIds, updateTransactionCategories]);

  return (
    <div className="flex w-full flex-col gap-5 pb-4 md:gap-6">
      <div className="flex items-start justify-between gap-4 border-b border-white/[0.06] pb-5">
        <div>
          <p className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-emerald-300">
            Fluxo financeiro
          </p>
          <h1 className="text-2xl font-semibold tracking-[-0.035em] text-zinc-50 md:text-3xl">
            Transações
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-zinc-500">
            Consulte, organize e ajuste todas as movimentações do período.
          </p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              aria-label="Criar nova transação"
              data-tour="transactions-add"
              className="h-11 gap-2 bg-emerald-600 px-3.5 text-sm font-semibold text-white hover:bg-emerald-700 md:h-12 md:px-6 md:text-base"
            >
              <PlusCircle className="size-5" />
              <span className="hidden min-[410px]:inline">Nova Transação</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[calc(100vw-2rem)] max-w-72 p-2">
            <DropdownMenuItem
              className="flex cursor-pointer items-center gap-4 rounded-md p-3 hover:bg-muted"
              onClick={() => {
                setIsAddIncomeModalOpen(true);
              }}
            >
              <div className="rounded-full bg-emerald-500/10 p-2 text-emerald-500">
                <ArrowUpRight className="size-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-medium">Receita</span>
                <span className="text-xs text-muted-foreground">
                  Registrar nova entrada
                </span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="flex cursor-pointer items-center gap-4 rounded-md p-3 hover:bg-muted"
              onClick={() => {
                setIsAddTransactionModalOpen(true);
              }}
            >
              <div className="rounded-full bg-red-500/10 p-2 text-red-500">
                <ArrowDownRight className="size-5" />
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

      <motion.section
        initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: prefersReducedMotion ? 0 : 0.35 }}
        className="grid grid-cols-2 gap-3 lg:grid-cols-3 lg:gap-4"
      >
        <div className="min-h-28 rounded-xl border border-white/[0.07] bg-zinc-900/55 p-4 backdrop-blur-xl md:p-5">
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">
              Entradas
            </p>
            <span className="flex size-8 items-center justify-center rounded-lg bg-emerald-400/10 text-emerald-300">
              <ArrowUpRight className="size-4" />
            </span>
          </div>
          <strong className="mt-4 block text-xl font-semibold tracking-tight text-emerald-400 lg:text-2xl">
            {formatCurrency(summary.totalIncome)}
          </strong>
        </div>

        <div className="min-h-28 rounded-xl border border-white/[0.07] bg-zinc-900/55 p-4 backdrop-blur-xl md:p-5">
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">
              Saídas
            </p>
            <span className="flex size-8 items-center justify-center rounded-lg bg-rose-400/10 text-rose-300">
              <ArrowDownRight className="size-4" />
            </span>
          </div>
          <strong className="mt-4 block text-xl font-semibold tracking-tight text-rose-400 lg:text-2xl">
            {formatCurrency(summary.totalExpense)}
          </strong>
        </div>

        <div className="col-span-2 min-h-28 rounded-xl border border-white/[0.07] bg-zinc-900/55 p-4 backdrop-blur-xl md:p-5 lg:col-span-1">
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">
              Saldo líquido
            </p>
            <span className="flex size-8 items-center justify-center rounded-lg bg-white/[0.05] text-zinc-300">
              <Wallet className="size-4" />
            </span>
          </div>
          <strong
            className={cn(
              "mt-4 block text-xl font-semibold tracking-tight lg:text-2xl",
              summary.netBalance >= 0 ? "text-zinc-100" : "text-rose-400",
            )}
          >
            {formatCurrency(summary.netBalance)}
          </strong>
        </div>
      </motion.section>

      <section className="flex flex-col gap-4 rounded-xl border border-white/[0.07] bg-zinc-900/60 p-4 backdrop-blur-xl xl:flex-row xl:items-center xl:justify-between">
        <div
          className={cn(
            "grid min-w-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-2",
            originFilter === "card"
              ? "xl:grid-cols-[minmax(240px,1.4fr)_repeat(4,minmax(140px,0.7fr))]"
              : "xl:grid-cols-[minmax(260px,1.5fr)_repeat(3,minmax(150px,0.7fr))]",
          )}
        >
          <div className="relative sm:col-span-2 xl:col-span-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar descrição, categoria ou origem"
              className="h-11 border-white/[0.08] bg-zinc-950/65 pl-10 text-zinc-100 placeholder:text-zinc-600"
            />
          </div>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="h-11 w-full border-white/[0.08] bg-zinc-950/65">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas categorias</SelectItem>
              {activeCategories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={typeFilter}
            onValueChange={(value) => setTypeFilter(value as TypeFilter)}
          >
            <SelectTrigger className="h-11 w-full border-white/[0.08] bg-zinc-950/65">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              <SelectItem value="income">Receita</SelectItem>
              <SelectItem value="expense">Despesa</SelectItem>
              <SelectItem value="fixed">Fixo</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={originFilter}
            onValueChange={(value) => {
              const nextOrigin = value as OriginFilter;

              setOriginFilter(nextOrigin);
              if (nextOrigin !== "card") setCardFilter("all");
            }}
          >
            <SelectTrigger className="h-11 w-full border-white/[0.08] bg-zinc-950/65">
              <SelectValue placeholder="Origem" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as origens</SelectItem>
              <SelectItem value="card">Cartões</SelectItem>
              <SelectItem value="debit-pix">Débito / Pix</SelectItem>
            </SelectContent>
          </Select>

          {originFilter === "card" ? (
            <Select value={cardFilter} onValueChange={setCardFilter}>
              <SelectTrigger className="h-11 w-full border-violet-400/15 bg-violet-400/[0.06]">
                <SelectValue placeholder="Selecionar cartão" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os cartões</SelectItem>
                {cards.map((card) => (
                  <SelectItem key={card.id} value={card.id}>
                    {card.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {hasActiveFilters ? (
            <Button
              type="button"
              variant="ghost"
              onClick={clearFilters}
              className="h-11 justify-center text-zinc-400 hover:bg-white/[0.05] hover:text-zinc-100"
            >
              <SlidersHorizontal className="size-4" />
              Limpar filtros
            </Button>
          ) : null}

        <div className="flex h-11 w-full items-center rounded-lg border border-white/[0.08] bg-zinc-950/65 sm:w-auto">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={prevMonth}
            aria-label="Mês anterior"
            className="rounded-r-none"
          >
            <ChevronLeft />
          </Button>
          <span className="flex flex-1 items-center justify-center gap-2 px-3 text-center text-sm font-medium text-foreground lg:flex-none">
            <CalendarDays className="size-4 text-muted-foreground" />
            {formattedSelectedPeriodLabel}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={nextMonth}
            aria-label="Próximo mês"
            className="rounded-l-none"
          >
            <ChevronRight />
          </Button>
        </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-white/[0.07] bg-zinc-900/45 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-4 border-b border-white/[0.06] px-4 py-3.5 md:px-5">
          <div>
            <h2 className="text-sm font-medium text-zinc-100 md:text-base">
              Lançamentos
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              {filteredTransactions.length} movimentações encontradas
            </p>
          </div>
          <Badge
            variant="outline"
            className="border-white/[0.08] bg-zinc-950/50 text-zinc-400"
          >
            {formattedSelectedPeriodLabel}
          </Badge>
        </div>
        {selectedIds.length > 0 ? (
          <div className="flex flex-col gap-3 border-b border-emerald-400/15 bg-emerald-400/[0.06] p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-medium text-zinc-100">
              {selectedIds.length} transações selecionadas
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isBulkSubmitting || !assignableCategories.length}
                  >
                    Definir Categoria
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="max-h-72 w-56 overflow-y-auto">
                  {assignableCategories.map((category) => (
                    <DropdownMenuItem
                      key={category}
                      className="cursor-pointer"
                      onClick={() => void handleBulkCategory(category)}
                    >
                      {category}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <ConfirmDialog
                title="Excluir transações selecionadas?"
                description="Os lançamentos serão removidos permanentemente. Esta ação não altera somente a visualização atual."
                confirmLabel="Excluir selecionadas"
                loadingLabel="Excluindo..."
                details={`${selectedIds.length} ${selectedIds.length === 1 ? "transação selecionada" : "transações selecionadas"}`}
                onConfirm={handleBulkDelete}
              >
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={isBulkSubmitting}
                >
                  Excluir em massa
                </Button>
              </ConfirmDialog>
            </div>
          </div>
        ) : null}
        <div className="space-y-2 p-3 md:hidden">
          {filteredTransactions.length ? (
            filteredTransactions.map((transaction, index) => {
              const categoryLabel =
                transaction.category || getTransactionFallbackLabel(transaction);
              const originLabel = getTransactionOrigin(transaction, cards);
              const originKind = getTransactionOriginFilter(transaction);
              const isPositive =
                transaction.type === "income" ||
                isCardCreditAdjustment(transaction);
              const dependentId = getDependentId(transaction);
              const dependentName = dependentId
                ? dependents.find((dependent) => dependent.id === dependentId)
                    ?.name
                : null;

              return (
                <motion.article
                  key={transaction.id}
                  onClick={() => handleOpenTransactionDetail(transaction)}
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: prefersReducedMotion ? 0 : 0.28,
                    delay: prefersReducedMotion ? 0 : Math.min(index * 0.035, 0.28),
                  }}
                  className="flex min-h-24 cursor-pointer items-center gap-3 rounded-xl border border-white/[0.06] bg-zinc-950/45 p-3 transition-colors hover:bg-zinc-800/50"
                >
                  <Checkbox
                    onClick={(event) => event.stopPropagation()}
                    checked={selectedIds.includes(transaction.id)}
                    onCheckedChange={(checked) =>
                      toggleTransactionSelection(transaction.id, checked)
                    }
                    aria-label={`Selecionar ${transaction.description}`}
                    className="size-5 shrink-0 border-zinc-600"
                  />
                  <span
                    className={cn(
                      "flex size-10 shrink-0 items-center justify-center rounded-lg border",
                      getOriginBadgeClassName(originKind),
                    )}
                  >
                    {originKind === "card" ? (
                      <CreditCard className="size-4" />
                    ) : originKind === "income" ? (
                      <ArrowUpRight className="size-4" />
                    ) : (
                      <Landmark className="size-4" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-zinc-100">
                      <TransactionDescription transaction={transaction} />
                    </div>
                    <p className="mt-1 text-xs text-zinc-500">
                      {formatDateOnlyBR(transaction.date)}
                    </p>
                    <div className="mt-2 flex min-w-0 flex-wrap gap-1.5">
                      <Badge
                        variant="outline"
                        className="max-w-full border-white/[0.07] bg-white/[0.04] text-[10px] text-zinc-400"
                      >
                        <Tag className="size-3" />
                        <span className="truncate">{categoryLabel}</span>
                      </Badge>
                      <Badge
                        variant="outline"
                        className={cn(
                          "max-w-full text-[10px]",
                          getOriginBadgeClassName(originKind),
                        )}
                      >
                        <span className="truncate">{originLabel}</span>
                      </Badge>
                      {dependentName ? (
                        <Badge
                          variant="outline"
                          className="border-amber-400/15 bg-amber-400/10 text-[10px] text-amber-300"
                        >
                          {dependentName}
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <strong
                      className={cn(
                        "text-sm font-semibold tabular-nums",
                        isPositive ? "text-emerald-400" : "text-rose-400",
                      )}
                    >
                      {isPositive ? "+" : "-"}
                      {formatCurrency(transaction.amount)}
                    </strong>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          onClick={(event) => event.stopPropagation()}
                          variant="ghost"
                          size="icon"
                          className="size-9 rounded-lg text-zinc-500 hover:text-zinc-100"
                          aria-label="Ações da transação"
                        >
                          <MoreHorizontal className="size-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="w-52 p-2"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <DropdownMenuItem
                          className="min-h-11 cursor-pointer rounded-lg"
                          onClick={() => handleOpenTransactionDetail(transaction)}
                        >
                          <Eye className="size-4" />
                          Ver detalhes
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="min-h-11 cursor-pointer rounded-lg"
                          onClick={() => handleEditTransaction(transaction)}
                        >
                          <Pencil className="size-4" />
                          Editar transação
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          className="min-h-11 cursor-pointer rounded-lg"
                          onClick={() => setDeleteTarget(transaction)}
                        >
                          <Trash2 className="size-4" />
                          Excluir transação
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </motion.article>
              );
            })
          ) : (
            <div className="flex min-h-44 flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
              <SearchX className="size-7" />
              Nenhuma transação encontrada para os filtros selecionados.
            </div>
          )}
        </div>

        <Table className="hidden min-w-[820px] md:table lg:min-w-full">
          <TableHeader className="bg-zinc-950/55 [&_th]:h-11 [&_th]:text-[10px] [&_th]:font-medium [&_th]:uppercase [&_th]:tracking-[0.14em] [&_th]:text-zinc-500">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-12">
                <Checkbox
                  checked={
                    isAllVisibleSelected ||
                    (isSomeVisibleSelected ? "indeterminate" : false)
                  }
                  onCheckedChange={toggleSelectAllVisible}
                  aria-label="Selecionar todas as transações visíveis"
                />
              </TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead className="hidden lg:table-cell">Categoria</TableHead>
              <TableHead className="hidden lg:table-cell">Origem</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="w-14 text-right" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTransactions.length ? (
              filteredTransactions.map((transaction, index) => {
                const originLabel = getTransactionOrigin(transaction, cards);
                const originKind = getTransactionOriginFilter(transaction);
                const categoryLabel =
                  transaction.category || getTransactionFallbackLabel(transaction);
                const dependentId = getDependentId(transaction);
                const dependentName = dependentId
                  ? dependents.find((dependent) => dependent.id === dependentId)
                      ?.name
                  : null;
                const details = [
                  dependentName,
                  transaction.is_recurring
                    ? transaction.type === "card"
                      ? "Assinatura"
                      : "Recorrente"
                    : null,
                ].filter(Boolean);
                const isPositive =
                  transaction.type === "income" ||
                  isCardCreditAdjustment(transaction);

                return (
                  <motion.tr
                    key={transaction.id}
                    onClick={() => handleOpenTransactionDetail(transaction)}
                    initial={
                      prefersReducedMotion ? false : { opacity: 0, y: 7 }
                    }
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: prefersReducedMotion ? 0 : 0.26,
                      delay: prefersReducedMotion
                        ? 0
                        : Math.min(index * 0.028, 0.3),
                    }}
                    className="cursor-pointer border-b border-white/[0.055] transition-colors hover:bg-zinc-800/50"
                  >
                    <TableCell className="py-4.5">
                      <Checkbox
                        onClick={(event) => event.stopPropagation()}
                        checked={selectedIds.includes(transaction.id)}
                        onCheckedChange={(checked) =>
                          toggleTransactionSelection(transaction.id, checked)
                        }
                        aria-label="Selecionar transação"
                      />
                    </TableCell>
                    <TableCell className="py-4.5 text-sm text-zinc-500">
                      {formatDateOnlyBR(transaction.date)}
                    </TableCell>
                    <TableCell className="py-4.5">
                      <div className="font-medium text-zinc-100">
                        <TransactionDescription transaction={transaction} />
                      </div>
                      {details.length ? (
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {details.map((detail, detailIndex) => (
                            <Badge
                              key={`${transaction.id}-${detailIndex}-${detail}`}
                              variant="outline"
                              className="border-white/[0.07] bg-white/[0.035] text-[10px] text-zinc-500"
                            >
                              {detail}
                            </Badge>
                          ))}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell className="hidden py-4.5 lg:table-cell">
                      <Badge
                        variant="outline"
                        className="max-w-44 border-white/[0.07] bg-white/[0.04] text-zinc-400"
                      >
                        <Tag className="size-3" />
                        <span className="truncate">
                        {categoryLabel}
                        </span>
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden py-4.5 lg:table-cell">
                      <Badge
                        variant="outline"
                        className={cn(
                          "max-w-48",
                          getOriginBadgeClassName(originKind),
                        )}
                      >
                        {originKind === "card" ? (
                          <CreditCard className="size-3" />
                        ) : originKind === "income" ? (
                          <ArrowUpRight className="size-3" />
                        ) : (
                          <Landmark className="size-3" />
                        )}
                        <span className="truncate">{originLabel}</span>
                      </Badge>
                    </TableCell>
                    <TableCell
                      className={cn(
                        "py-4.5 text-right font-semibold tabular-nums",
                        isPositive ? "text-emerald-400" : "text-rose-400",
                      )}
                    >
                      {isPositive ? "+" : "-"}
                      {formatCurrency(transaction.amount)}
                    </TableCell>
                    <TableCell className="py-4.5">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            onClick={(event) => event.stopPropagation()}
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Ações da transação"
                            className="ml-auto cursor-pointer"
                          >
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="w-48"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <DropdownMenuItem
                            className="cursor-pointer"
                            onClick={() => handleOpenTransactionDetail(transaction)}
                          >
                            <Eye className="size-4" />
                            Ver detalhes
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="cursor-pointer"
                            onClick={() => handleEditTransaction(transaction)}
                          >
                            <Pencil className="size-4" />
                            Editar transação
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            className="cursor-pointer"
                            onClick={() => setDeleteTarget(transaction)}
                          >
                            <Trash2 className="size-4" />
                            Excluir transação
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </motion.tr>
                );
              })
            ) : (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={7}
                  className="h-40 text-center text-muted-foreground"
                >
                  <div className="flex h-full flex-col items-center justify-center gap-2">
                    <SearchX className="size-7 text-muted-foreground/60" />
                    <span>
                      Nenhuma transação encontrada para os filtros selecionados.
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </section>

      <TransactionDetailSheet
        transaction={detailTransaction}
        transactions={transactions}
        cardName={
          detailTransaction
            ? cards.find(
                (card) =>
                  card.id === getTransactionCardId(detailTransaction),
              )?.name
            : null
        }
        dependentName={
          detailTransaction
            ? dependents.find(
                (dependent) =>
                  dependent.id === getDependentId(detailTransaction),
              )?.name
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
        onClose={handleCloseIncomeModal}
        onSelectExpense={() => {
          setIsAddIncomeModalOpen(false);
          setIsAddTransactionModalOpen(true);
        }}
      />
      <AddTransactionModal
        isOpen={isAddTransactionModalOpen}
        onClose={handleCloseTransactionModal}
        onSelectIncome={() => {
          setIsAddTransactionModalOpen(false);
          setIsAddIncomeModalOpen(true);
        }}
      />
    </div>
  );
}
