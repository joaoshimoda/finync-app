"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Pencil,
  PlusCircle,
  Search,
  SearchX,
  Trash2,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import { RecurringDeleteDialog } from "@/components/finance/RecurringDeleteDialog";
import { TransactionDescription } from "@/components/finance/TransactionDescription";
import { MobileTransactionItem } from "@/components/finance/MobileTransactionItem";
import { AddIncomeModal } from "@/components/modals/AddIncomeModal";
import { AddTransactionModal } from "@/components/modals/AddTransactionModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent } from "@/components/ui/dialog";
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
import { getCardSignedAmount, isCardCreditAdjustment } from "@/lib/cardCredits";
import { supabase } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";
import { isTransactionInSelectedCompetence } from "@/lib/transactionPeriod";
import { getTransactionStatusPresentation } from "@/lib/transactionStatus";
import { useFinanceStore, type Transaction } from "@/store/useFinanceStore";

type TypeFilter = "all" | "income" | "expense" | "fixed";

const brlFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

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

function getTransactionOrigin(
  transaction: Transaction,
  cards: ReturnType<typeof useFinanceStore.getState>["cards"],
) {
  if (transaction.type === "income") return "Receita";
  if (
    transaction.is_recurring &&
    (transaction.type === "card" || Boolean(transaction.cardId))
  ) {
    return "Assinatura";
  }
  if (transaction.type === "fixed") {
    return transaction.is_recurring ? "Gasto Fixo" : "Débito/PIX";
  }

  return (
    cards.find((card) => card.id === transaction.cardId)?.name ?? "Cartão"
  );
}

export default function TransactionsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [isAddIncomeModalOpen, setIsAddIncomeModalOpen] = useState(false);
  const [isAddTransactionModalOpen, setIsAddTransactionModalOpen] =
    useState(false);
  const [editingTransaction, setEditingTransaction] =
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
      const matchesSearch =
        !normalizedSearch ||
        transaction.description.toLowerCase().includes(normalizedSearch);
      const matchesCategory =
        categoryFilter === "all" || transaction.category === categoryFilter;
      const matchesType =
        typeFilter === "all" ||
        (typeFilter === "income" && transaction.type === "income") ||
        (typeFilter === "expense" && transaction.type !== "income") ||
        (typeFilter === "fixed" && transaction.type === "fixed");

      return matchesSearch && matchesCategory && matchesType;
    });
  }, [categoryFilter, monthlyTransactions, searchTerm, typeFilter]);

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

  const handleCloseIncomeModal = useCallback(() => {
    setIsAddIncomeModalOpen(false);
    setEditingTransaction(null);
  }, []);

  const handleCloseTransactionModal = useCallback(() => {
    setIsAddTransactionModalOpen(false);
    setEditingTransaction(null);
  }, []);

  const handleEditTransaction = useCallback((transaction: Transaction) => {
    setEditingTransaction(transaction);

    if (transaction.type === "income") {
      setIsAddIncomeModalOpen(true);
      return;
    }

    setIsAddTransactionModalOpen(true);
  }, []);

  const handleDeleteTransaction = useCallback(async (transactionId: string) => {
    try {
      await deleteTransaction(transactionId);
      toast.success("Movimentação excluída.");
      setDeleteTarget(null);
    } catch (error) {
      console.error("Erro ao excluir movimentação:", error);
      toast.error("Não foi possível excluir agora.");
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
      console.error("Erro ao excluir transações em massa:", error);
      toast.error("Não foi possível excluir as transações selecionadas.");
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
    <div className="flex w-full flex-col gap-6 md:gap-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            Transações
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Analise entradas, saídas, recorrências e compras parceladas do
            período selecionado.
          </p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              aria-label="Criar nova transação"
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
                setEditingTransaction(null);
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
                setEditingTransaction(null);
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

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-3 lg:gap-4">
        <div className="min-h-28 rounded-2xl border border-border/50 bg-card/80 p-4 shadow-none transition-colors hover:bg-accent/10 md:p-5">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">Total de Entradas</p>
            <ArrowUpRight className="size-4 text-emerald-400" />
          </div>
          <strong className="mt-3 block text-xl font-semibold tracking-normal text-emerald-400 lg:text-2xl">
            {brlFormatter.format(summary.totalIncome)}
          </strong>
        </div>

        <div className="min-h-28 rounded-2xl border border-border/50 bg-card/80 p-4 shadow-none transition-colors hover:bg-accent/10 md:p-5">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">Total de Saídas</p>
            <ArrowDownRight className="size-4 text-red-400" />
          </div>
          <strong className="mt-3 block text-xl font-semibold tracking-normal text-red-300 lg:text-2xl">
            {brlFormatter.format(summary.totalExpense)}
          </strong>
        </div>

        <div className="col-span-2 min-h-28 rounded-2xl border border-border/50 bg-card/80 p-4 shadow-none transition-colors hover:bg-accent/10 lg:col-span-1 md:p-5">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">Saldo Líquido</p>
            <Wallet className="size-4 text-brand-300" />
          </div>
          <strong
            className={cn(
              "mt-3 block text-xl font-semibold tracking-normal lg:text-2xl",
              summary.netBalance >= 0 ? "text-foreground" : "text-red-300",
            )}
          >
            {brlFormatter.format(summary.netBalance)}
          </strong>
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-border bg-muted/20 p-3.5 md:p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="grid flex-1 grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="relative col-span-2 lg:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar por descrição"
              className="h-11 pl-9"
            />
          </div>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="h-11 w-full">
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
            <SelectTrigger className="h-11 w-full">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              <SelectItem value="income">Receita</SelectItem>
              <SelectItem value="expense">Despesa</SelectItem>
              <SelectItem value="fixed">Fixo</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex h-11 w-full items-center rounded-lg border border-border bg-card lg:w-auto">
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
      </section>

      <section className="overflow-hidden rounded-xl border border-border bg-card">
        {selectedIds.length > 0 ? (
          <div className="flex flex-col gap-3 border-b border-border bg-zinc-900/80 p-4 sm:flex-row sm:items-center sm:justify-between">
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
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={isBulkSubmitting}
                onClick={() => void handleBulkDelete()}
              >
                Excluir em Massa
              </Button>
            </div>
          </div>
        ) : null}
        <div className="space-y-2 p-3 md:hidden">
          {filteredTransactions.length ? (
            filteredTransactions.map((transaction) => {
              const categoryLabel =
                transaction.category || getTransactionFallbackLabel(transaction);
              const isPositive =
                transaction.type === "income" ||
                isCardCreditAdjustment(transaction);

              return (
                <div key={transaction.id} className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedIds.includes(transaction.id)}
                    onCheckedChange={(checked) =>
                      toggleTransactionSelection(transaction.id, checked)
                    }
                    aria-label={`Selecionar ${transaction.description}`}
                    className="size-5 shrink-0 border-zinc-600"
                  />
                  <MobileTransactionItem
                    className="min-w-0 flex-1"
                    title={<TransactionDescription transaction={transaction} />}
                    category={categoryLabel}
                    date={formatDateOnlyBR(transaction.date)}
                    amount={`${isPositive ? "+" : "-"}${brlFormatter.format(transaction.amount)}`}
                    positive={isPositive}
                    trailing={
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-10 rounded-xl"
                            aria-label="Ações da transação"
                          >
                            <MoreHorizontal className="size-5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52 p-2">
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
                    }
                  />
                </div>
              );
            })
          ) : (
            <div className="flex min-h-44 flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
              <SearchX className="size-7" />
              Nenhuma transação encontrada para os filtros selecionados.
            </div>
          )}
        </div>

        <Table className="hidden min-w-[760px] md:table lg:min-w-full">
          <TableHeader className="bg-muted/30">
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
              filteredTransactions.map((transaction) => {
                const originLabel = getTransactionOrigin(transaction, cards);
                const categoryLabel =
                  transaction.category || getTransactionFallbackLabel(transaction);
                const dependentId = getDependentId(transaction);
                const dependentName = dependentId
                  ? dependents.find((dependent) => dependent.id === dependentId)
                      ?.name
                  : null;
                const statusPresentation =
                  getTransactionStatusPresentation(transaction);

                return (
                  <TableRow
                    key={transaction.id}
                    className="transition-colors hover:bg-muted/30"
                  >
                    <TableCell className="py-4">
                      <Checkbox
                        checked={selectedIds.includes(transaction.id)}
                        onCheckedChange={(checked) =>
                          toggleTransactionSelection(transaction.id, checked)
                        }
                        aria-label="Selecionar transação"
                      />
                    </TableCell>
                    <TableCell className="py-4 text-muted-foreground">
                      {formatDateOnlyBR(transaction.date)}
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex flex-wrap items-center gap-2 font-medium text-foreground">
                        <TransactionDescription transaction={transaction} />
                        {dependentName ? (
                          <Badge className="rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800">
                            {dependentName}
                          </Badge>
                        ) : null}
                        {transaction.is_recurring &&
                        transaction.type === "card" ? (
                          <Badge
                            variant="outline"
                            className={cn(
                              "rounded-lg",
                              statusPresentation.className,
                            )}
                          >
                            {statusPresentation.label}
                          </Badge>
                        ) : null}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground lg:hidden">
                        {categoryLabel}
                      </div>
                    </TableCell>
                    <TableCell className="hidden py-4 lg:table-cell">
                      <Badge variant="outline" className="rounded-lg">
                        {categoryLabel}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden py-4 text-muted-foreground lg:table-cell">
                      {originLabel}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "py-4 text-right font-medium",
                        transaction.type === "income" ||
                          isCardCreditAdjustment(transaction)
                          ? "text-emerald-500"
                          : "text-red-300",
                      )}
                    >
                      {transaction.type === "income" ||
                      isCardCreditAdjustment(transaction)
                        ? "+"
                        : "-"}
                      {brlFormatter.format(transaction.amount)}
                    </TableCell>
                    <TableCell className="py-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Ações da transação"
                            className="ml-auto cursor-pointer"
                          >
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
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
                  </TableRow>
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
        <Dialog
          open={Boolean(deleteTarget)}
          onOpenChange={(open) => {
            if (!open) setDeleteTarget(null);
          }}
        >
          <DialogContent className="p-6 lg:max-w-md">
            <div className="flex flex-col gap-6">
              <div className="space-y-2">
                <h2 className="text-xl font-semibold tracking-tight">
                  Excluir transação?
                </h2>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Esta ação remove o lançamento da sua lista e não pode ser
                  desfeita.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <Button
                  type="button"
                  variant="destructive"
                  className="h-11 w-full cursor-pointer"
                  onClick={() => handleDeleteTransaction(deleteTarget.id)}
                >
                  Excluir transação
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-11 w-full cursor-pointer hover:bg-zinc-800"
                  onClick={() => setDeleteTarget(null)}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      ) : null}

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
