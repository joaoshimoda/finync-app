"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CalendarX,
  CheckCircle2,
  Pencil,
  Percent,
  PlusCircle,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { RecurringDeleteDialog } from "@/components/finance/RecurringDeleteDialog";
import { TransactionDescription } from "@/components/finance/TransactionDescription";
import { AddTransactionModal } from "@/components/modals/AddTransactionModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getDateOnlyParts, formatDateOnlyBR } from "@/lib/dateUtils";
import { useFinanceStore, type Transaction } from "@/store/useFinanceStore";

const brlFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function toComparableDate(date: string) {
  const { day, month, year } = getDateOnlyParts(date);

  return new Date(year, month - 1, day);
}

export default function FixedExpensesPage() {
  const [isNewFixedModalOpen, setIsNewFixedModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);

  const transactions = useFinanceStore((state) => state.transactions);
  const fetchTransactions = useFinanceStore((state) => state.fetchTransactions);
  const deleteTransaction = useFinanceStore((state) => state.deleteTransaction);
  const deleteTransactionGroup = useFinanceStore(
    (state) => state.deleteTransactionGroup,
  );
  const updateTransaction = useFinanceStore((state) => state.updateTransaction);
  const currentMonth = useFinanceStore((state) => state.currentMonth);
  const currentYear = useFinanceStore((state) => state.currentYear);

  useEffect(() => {
    void fetchTransactions();
  }, [currentMonth, currentYear, fetchTransactions]);

  const fixedTransactions = useMemo(() => {
    return transactions.filter((transaction) => {
      const transactionDate = getDateOnlyParts(transaction.date);

      return (
        transaction.type === "fixed" &&
        transaction.is_recurring === true &&
        transactionDate.month === currentMonth &&
        transactionDate.year === currentYear
      );
    });
  }, [currentMonth, currentYear, transactions]);

  const totalFixed = fixedTransactions.reduce(
    (total, transaction) => total + transaction.amount,
    0,
  );
  const paidFixed = fixedTransactions
    .filter((transaction) => transaction.status === "paid")
    .reduce((total, transaction) => total + transaction.amount, 0);
  const fixedPaymentPercentage =
    totalFixed > 0 ? Math.min((paidFixed / totalFixed) * 100, 100) : 0;
  const totalRevenue = transactions
    .filter((transaction) => {
      const transactionDate = getDateOnlyParts(transaction.date);

      return (
        transaction.type === "income" &&
        transactionDate.month === currentMonth &&
        transactionDate.year === currentYear
      );
    })
    .reduce((total, transaction) => total + transaction.amount, 0);
  const incomeCommitmentPercentage =
    totalRevenue > 0 ? Math.round((totalFixed / totalRevenue) * 100) : 0;
  const today = new Date();
  const todayDateOnly = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const pendingFixedTransactions = fixedTransactions.filter(
    (transaction) => transaction.status !== "paid",
  );
  const overdueTransaction = [...pendingFixedTransactions]
    .filter((transaction) => toComparableDate(transaction.date) < todayDateOnly)
    .sort(
      (left, right) =>
        toComparableDate(right.date).getTime() -
        toComparableDate(left.date).getTime(),
    )[0];
  const upcomingTransaction = [...pendingFixedTransactions]
    .filter((transaction) => toComparableDate(transaction.date) >= todayDateOnly)
    .sort(
      (left, right) =>
        toComparableDate(left.date).getTime() -
        toComparableDate(right.date).getTime(),
    )[0];
  const nextDueTransaction = overdueTransaction ?? upcomingTransaction;
  const nextDueDays = nextDueTransaction
    ? Math.round(
        (toComparableDate(nextDueTransaction.date).getTime() -
          todayDateOnly.getTime()) /
          86_400_000,
      )
    : null;

  async function handleDeleteTransaction(transactionId: string) {
    try {
      await deleteTransaction(transactionId);
      toast.success("Conta fixa removida.");
    } catch (error) {
      console.error("Erro ao remover conta fixa:", error);
      toast.error("Não foi possível remover agora.");
    }
  }

  async function handleDeleteFutureTransactions(transaction: Transaction) {
    if (!transaction.groupId) return;

    try {
      await deleteTransactionGroup(transaction.groupId, transaction.date);
      toast.success("Conta fixa atual e próximas removidas.");
    } catch (error) {
      console.error("Erro ao remover recorrência:", error);
      toast.error("Não foi possível remover a recorrência agora.");
    }
  }

  async function togglePaymentStatus(transaction: Transaction) {
    const nextStatus = transaction.status === "paid" ? "pending" : "paid";

    try {
      await updateTransaction(transaction.id, { status: nextStatus });
      toast.success(
        nextStatus === "paid"
          ? "Conta marcada como paga."
          : "Conta marcada como pendente.",
      );
    } catch (error) {
      console.error("Erro ao atualizar status da conta fixa:", error);
      toast.error("Não foi possível atualizar o status.");
    }
  }

  function openCreateModal() {
    setEditingTransaction(null);
    setIsNewFixedModalOpen(true);
  }

  function openEditModal(transaction: Transaction) {
    setEditingTransaction(transaction);
    setIsNewFixedModalOpen(true);
  }

  function closeTransactionModal() {
    setIsNewFixedModalOpen(false);
    setEditingTransaction(null);
  }

  return (
    <>
      <div className="flex w-full flex-col gap-8">
        <div className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">
              Contas Fixas
            </h1>
            <p className="text-sm text-muted-foreground lg:text-base">
              Centralize assinaturas, mensalidades e despesas que se repetem.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              onClick={openCreateModal}
              className="h-11 cursor-pointer bg-emerald-600 px-5 font-semibold text-white shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-xl"
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Nova Conta
            </Button>
          </div>
        </div>

        <section className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-3">
          <Card className="border border-border/50 bg-white/[0.035] shadow-none transition-colors hover:bg-accent/10">
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardDescription>Contas Pagas</CardDescription>
                <CardTitle className="mt-2 text-xl lg:text-2xl">
                  {brlFormatter.format(paidFixed)}
                </CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  de {brlFormatter.format(totalFixed)}
                </p>
              </div>
              <div className="flex size-11 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-200">
                <CheckCircle2 className="size-5" />
              </div>
            </CardHeader>
            <CardContent>
              <Progress value={fixedPaymentPercentage} className="mt-2 h-2" />
            </CardContent>
          </Card>

          <Card className="border border-border/50 bg-white/[0.035] shadow-none transition-colors hover:bg-accent/10">
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardDescription>Próximo Vencimento</CardDescription>
                <CardTitle className="mt-2 text-xl lg:text-2xl">
                  {nextDueTransaction
                    ? brlFormatter.format(nextDueTransaction.amount)
                    : "Tudo em dia!"}
                </CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  {nextDueTransaction ? (
                    <>
                      {nextDueTransaction.description} ·{" "}
                      {nextDueDays === 0 ? (
                        <span className="font-medium text-orange-500">
                          🚨 Vence hoje!
                        </span>
                      ) : nextDueDays !== null && nextDueDays < 0 ? (
                        <span className="font-bold text-red-500">
                          ⚠️ Atrasado {Math.abs(nextDueDays)} dia
                          {Math.abs(nextDueDays) === 1 ? "" : "s"}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">
                          Vence em {nextDueDays} dia
                          {nextDueDays === 1 ? "" : "s"}
                        </span>
                      )}
                    </>
                  ) : (
                    "Nenhuma conta fixa pendente"
                  )}
                </p>
              </div>
              <div className="flex size-11 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-200">
                <CalendarDays className="size-5" />
              </div>
            </CardHeader>
          </Card>

          <Card className="border border-border/50 bg-white/[0.035] shadow-none transition-colors hover:bg-accent/10">
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardDescription>Comprometimento de Renda</CardDescription>
                <CardTitle className="mt-2 text-xl lg:text-2xl">
                  {totalRevenue > 0 ? `${incomeCommitmentPercentage}%` : "0%"}
                </CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  {totalRevenue > 0
                    ? "Do seu salário é destinado a contas fixas"
                    : "Sem receita registrada no mês"}
                </p>
              </div>
              <div className="flex size-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-200">
                <Percent className="size-5" />
              </div>
            </CardHeader>
          </Card>
        </section>

        <Card className="border-white/[0.08] bg-white/[0.025]">
          <CardHeader className="border-b border-white/[0.08]">
            <CardTitle>Contas do mês</CardTitle>
            <CardDescription>
              Despesas fixas cadastradas para o período selecionado.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="overflow-hidden rounded-md border border-border/50 bg-card">
              <Table className="min-w-[760px] lg:min-w-full">
                <TableHeader className="bg-muted/30">
                  <TableRow className="hover:bg-transparent">
                  <TableHead>Data</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="hidden lg:table-cell">Categoria</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="w-16 text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                {fixedTransactions.length ? (
                  fixedTransactions.map((transaction) => (
                    <TableRow key={transaction.id} className="hover:bg-muted/35">
                      <TableCell className="text-muted-foreground">
                        {formatDateOnlyBR(transaction.date)}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-foreground">
                          <TransactionDescription transaction={transaction} />
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {transaction.category || "Sem categoria"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            transaction.status === "paid"
                              ? "secondary"
                              : "destructive"
                          }
                          className={
                            transaction.status === "paid"
                              ? "cursor-pointer bg-emerald-500 text-white hover:bg-emerald-400"
                              : "cursor-pointer"
                          }
                          onClick={() => togglePaymentStatus(transaction)}
                        >
                          {transaction.status === "paid" ? "Pago" : "Pendente"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium text-red-300">
                        -{brlFormatter.format(transaction.amount)}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label="Editar conta fixa"
                            className="text-muted-foreground hover:text-foreground"
                            onClick={() => openEditModal(transaction)}
                          >
                            <Pencil />
                          </Button>
                          <RecurringDeleteDialog
                            transaction={transaction}
                            onDeleteSingle={(item) =>
                              handleDeleteTransaction(item.id)
                            }
                            onDeleteFuture={handleDeleteFutureTransactions}
                          >
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label="Excluir conta fixa"
                              className="text-muted-foreground hover:text-red-300"
                            >
                              <Trash2 />
                            </Button>
                          </RecurringDeleteDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={6} className="h-32 text-center">
                      <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                        <CalendarX className="mb-4 h-10 w-10 text-muted-foreground/50" />
                        <span>Nenhuma conta fixa neste mês.</span>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <AddTransactionModal
        isOpen={isNewFixedModalOpen}
        onClose={closeTransactionModal}
        editingTransaction={editingTransaction}
        mode="fixed"
      />
    </>
  );
}
