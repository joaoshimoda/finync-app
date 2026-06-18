"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Plus, Repeat, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { RecurringDeleteDialog } from "@/components/finance/RecurringDeleteDialog";
import { TransactionDescription } from "@/components/finance/TransactionDescription";
import { AddTransactionModal } from "@/components/modals/AddTransactionModal";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

export default function FixedExpensesPage() {
  const [isNewFixedModalOpen, setIsNewFixedModalOpen] = useState(false);

  const transactions = useFinanceStore((state) => state.transactions);
  const fetchTransactions = useFinanceStore((state) => state.fetchTransactions);
  const deleteTransaction = useFinanceStore((state) => state.deleteTransaction);
  const deleteTransactionGroup = useFinanceStore(
    (state) => state.deleteTransactionGroup,
  );
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
        transactionDate.month === currentMonth &&
        transactionDate.year === currentYear
      );
    });
  }, [currentMonth, currentYear, transactions]);

  const monthlyFixedCost = fixedTransactions.reduce(
    (total, transaction) => total + transaction.amount,
    0,
  );
  const annualProjection = monthlyFixedCost * 12;

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

  return (
    <>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 pb-10">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Contas Fixas
            </h1>
            <p className="text-muted-foreground">
              Centralize assinaturas, mensalidades e despesas que se repetem.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              onClick={() => setIsNewFixedModalOpen(true)}
              className="h-12 cursor-pointer gap-2 bg-primary px-6 text-base font-semibold text-primary-foreground shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl"
            >
              <Plus className="h-5 w-5" />
              Nova Conta
            </Button>
          </div>
        </div>

        <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Card className="border-white/[0.08] bg-white/[0.035]">
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardDescription>Custo Fixo Mensal</CardDescription>
                <CardTitle className="mt-2 text-3xl">
                  {brlFormatter.format(monthlyFixedCost)}
                </CardTitle>
              </div>
              <div className="flex size-11 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-200">
                <CalendarDays className="size-5" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-zinc-400">
                Soma das contas fixas no mês selecionado.
              </p>
            </CardContent>
          </Card>

          <Card className="border-white/[0.08] bg-white/[0.035]">
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardDescription>Projeção Anual</CardDescription>
                <CardTitle className="mt-2 text-3xl">
                  {brlFormatter.format(annualProjection)}
                </CardTitle>
              </div>
              <div className="flex size-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-200">
                <Repeat className="size-5" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-zinc-400">
                Estimativa baseada no custo fixo mensal multiplicado por 12.
              </p>
            </CardContent>
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
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Data</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="hidden md:table-cell">Categoria</TableHead>
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
                      <TableCell className="hidden md:table-cell">
                        {transaction.category || "Sem categoria"}
                      </TableCell>
                      <TableCell className="text-right font-medium text-red-300">
                        -{brlFormatter.format(transaction.amount)}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end">
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
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="h-32 text-center text-muted-foreground"
                    >
                      Nenhuma conta fixa neste mês.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <AddTransactionModal
        isOpen={isNewFixedModalOpen}
        onClose={() => setIsNewFixedModalOpen(false)}
        mode="fixed"
      />
    </>
  );
}
