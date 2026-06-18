"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import { RecurringDeleteDialog } from "@/components/finance/RecurringDeleteDialog";
import { TransactionDescription } from "@/components/finance/TransactionDescription";
import { AddIncomeModal } from "@/components/modals/AddIncomeModal";
import { AddTransactionModal } from "@/components/modals/AddTransactionModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  formatDateOnlyBR,
  getDateOnlyParts,
} from "@/lib/dateUtils";
import { cn } from "@/lib/utils";
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
  if (transaction.type === "fixed" && transaction.is_recurring) return "Fixo";

  return typeLabel[transaction.type];
}

function sortByRecentDate(left: Transaction, right: Transaction) {
  return right.date.localeCompare(left.date);
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

function getTransactionOrigin(
  transaction: Transaction,
  cards: ReturnType<typeof useFinanceStore.getState>["cards"],
) {
  if (transaction.type === "income") return "Receita";
  if (transaction.type === "fixed") return "Débito/PIX";

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

  const cards = useFinanceStore((state) => state.cards);
  const transactions = useFinanceStore((state) => state.transactions);
  const fetchCards = useFinanceStore((state) => state.fetchCards);
  const fetchTransactions = useFinanceStore((state) => state.fetchTransactions);
  const deleteTransaction = useFinanceStore((state) => state.deleteTransaction);
  const deleteTransactionGroup = useFinanceStore(
    (state) => state.deleteTransactionGroup,
  );
  const currentMonth = useFinanceStore((state) => state.currentMonth);
  const currentYear = useFinanceStore((state) => state.currentYear);
  const nextMonth = useFinanceStore((state) => state.nextMonth);
  const prevMonth = useFinanceStore((state) => state.prevMonth);

  useEffect(() => {
    void fetchCards();
    void fetchTransactions();
  }, [currentMonth, currentYear, fetchCards, fetchTransactions]);

  const selectedPeriodLabel = monthFormatter.format(
    new Date(currentYear, currentMonth - 1, 1),
  );

  const monthlyTransactions = useMemo(
    () =>
      transactions
        .filter((transaction) =>
          isSameSelectedMonth(transaction, currentMonth, currentYear),
        )
        .sort(sortByRecentDate),
    [currentMonth, currentYear, transactions],
  );

  const categories = useMemo(() => {
    const uniqueCategories = new Set(
      monthlyTransactions
        .map((transaction) => transaction.category)
        .filter(Boolean),
    );

    return Array.from(uniqueCategories).sort((left, right) =>
      left.localeCompare(right, "pt-BR"),
    );
  }, [monthlyTransactions]);

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

  const summary = useMemo(() => {
    const totalIncome = filteredTransactions
      .filter((transaction) => transaction.type === "income")
      .reduce((total, transaction) => total + transaction.amount, 0);
    const totalExpense = filteredTransactions
      .filter((transaction) => transaction.type !== "income")
      .reduce((total, transaction) => total + transaction.amount, 0);

    return {
      totalIncome,
      totalExpense,
      netBalance: totalIncome - totalExpense,
    };
  }, [filteredTransactions]);

  function handleCloseIncomeModal() {
    setIsAddIncomeModalOpen(false);
    setEditingTransaction(null);
  }

  function handleCloseTransactionModal() {
    setIsAddTransactionModalOpen(false);
    setEditingTransaction(null);
  }

  function handleEditTransaction(transaction: Transaction) {
    setEditingTransaction(transaction);

    if (transaction.type === "income") {
      setIsAddIncomeModalOpen(true);
      return;
    }

    setIsAddTransactionModalOpen(true);
  }

  async function handleDeleteTransaction(transactionId: string) {
    try {
      await deleteTransaction(transactionId);
      toast.success("Movimentação excluída.");
      setDeleteTarget(null);
    } catch (error) {
      console.error("Erro ao excluir movimentação:", error);
      toast.error("Não foi possível excluir agora.");
    }
  }

  async function handleDeleteFutureTransactions(transaction: Transaction) {
    if (!transaction.groupId) return;

    try {
      await deleteTransactionGroup(transaction.groupId, transaction.date);
      toast.success("Recorrência atual e próximas excluídas.");
      setDeleteTarget(null);
    } catch (error) {
      console.error("Erro ao excluir recorrência:", error);
      toast.error("Não foi possível excluir a recorrência agora.");
    }
  }

  return (
    <div className="flex w-full flex-col gap-8">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            Transações
          </h1>
          <p className="text-sm text-muted-foreground md:text-base">
            Analise entradas, saídas, recorrências e compras parceladas do
            período selecionado.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            className="h-10 cursor-pointer gap-2 px-4 py-2"
            onClick={() => {
              setEditingTransaction(null);
              setIsAddIncomeModalOpen(true);
            }}
          >
            <ArrowUpRight className="h-4 w-4" />
            Nova receita
          </Button>
          <Button
            type="button"
            className="h-12 cursor-pointer gap-2 bg-primary px-6 text-base font-semibold text-primary-foreground shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl"
            onClick={() => {
              setEditingTransaction(null);
              setIsAddTransactionModalOpen(true);
            }}
          >
            <Plus className="h-5 w-5" />
            Nova despesa
          </Button>
        </div>
      </div>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card/80 p-5">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">Total de Entradas</p>
            <ArrowUpRight className="size-4 text-emerald-400" />
          </div>
          <strong className="mt-3 block text-xl font-semibold tracking-normal text-emerald-400 md:text-2xl">
            {brlFormatter.format(summary.totalIncome)}
          </strong>
        </div>

        <div className="rounded-xl border border-border bg-card/80 p-5">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">Total de Saídas</p>
            <ArrowDownRight className="size-4 text-red-400" />
          </div>
          <strong className="mt-3 block text-xl font-semibold tracking-normal text-red-300 md:text-2xl">
            {brlFormatter.format(summary.totalExpense)}
          </strong>
        </div>

        <div className="rounded-xl border border-border bg-card/80 p-5">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">Saldo Líquido</p>
            <Wallet className="size-4 text-brand-300" />
          </div>
          <strong
            className={cn(
              "mt-3 block text-xl font-semibold tracking-normal md:text-2xl",
              summary.netBalance >= 0 ? "text-foreground" : "text-red-300",
            )}
          >
            {brlFormatter.format(summary.netBalance)}
          </strong>
        </div>
      </section>

      <section className="flex flex-col gap-4 rounded-xl border border-border bg-muted/20 p-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="grid flex-1 grid-cols-1 gap-3 md:grid-cols-3 lg:grid-cols-4">
          <div className="relative lg:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar por descrição"
              className="pl-9"
            />
          </div>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas categorias</SelectItem>
              {categories.map((category) => (
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
            <SelectTrigger>
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

        <div className="flex h-11 w-full items-center rounded-lg border border-border bg-card sm:w-auto">
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
          <span className="flex flex-1 items-center justify-center gap-2 px-3 text-center text-sm font-medium capitalize text-foreground sm:flex-none">
            <CalendarDays className="size-4 text-muted-foreground" />
            {selectedPeriodLabel}
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
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow className="hover:bg-transparent">
              <TableHead>Data</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead className="hidden md:table-cell">Categoria</TableHead>
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

                return (
                  <TableRow
                    key={transaction.id}
                    className="transition-colors hover:bg-muted/30"
                  >
                    <TableCell className="py-4 text-muted-foreground">
                      {formatDateOnlyBR(transaction.date)}
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="font-medium text-foreground">
                        <TransactionDescription transaction={transaction} />
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground md:hidden">
                        {categoryLabel}
                      </div>
                    </TableCell>
                    <TableCell className="hidden py-4 md:table-cell">
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
                        transaction.type === "income"
                          ? "text-emerald-500"
                          : "text-red-300",
                      )}
                    >
                      {transaction.type === "income" ? "+" : "-"}
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
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-36 text-center text-muted-foreground"
                >
                  Nenhuma transação encontrada para os filtros selecionados.
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
          <DialogContent className="p-6 sm:max-w-md">
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
