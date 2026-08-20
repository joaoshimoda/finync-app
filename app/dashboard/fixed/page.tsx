"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CalendarX,
  Check,
  CreditCard,
  Loader2,
  Pencil,
  PlusCircle,
  ReceiptText,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { RecurringDeleteDialog } from "@/components/finance/RecurringDeleteDialog";
import { TransactionDescription } from "@/components/finance/TransactionDescription";
import { MobileTransactionItem } from "@/components/finance/MobileTransactionItem";
import { AddTransactionModal } from "@/components/modals/AddTransactionModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDateOnlyBR } from "@/lib/dateUtils";
import { isTransactionInSelectedPeriod } from "@/lib/transactionPeriod";
import { useFinanceStore, type Transaction } from "@/store/useFinanceStore";

const brlFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

type RecurringTab = "fixed" | "subscriptions";

function isInSelectedMonth(
  transaction: Transaction,
  month: number,
  year: number,
) {
  return isTransactionInSelectedPeriod(transaction, month, year);
}

export default function FixedExpensesPage() {
  const [activeTab, setActiveTab] = useState<RecurringTab>("fixed");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isPayingSelected, setIsPayingSelected] = useState(false);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);

  const cards = useFinanceStore((state) => state.cards);
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

  const fixedTransactions = useMemo(
    () =>
      transactions.filter(
        (transaction) =>
          transaction.type === "fixed" &&
          transaction.is_recurring === true &&
          isInSelectedMonth(transaction, currentMonth, currentYear),
      ),
    [currentMonth, currentYear, transactions],
  );

  const subscriptionTransactions = useMemo(
    () =>
      transactions.filter(
        (transaction) =>
          transaction.type === "card" &&
          transaction.is_recurring === true &&
          isInSelectedMonth(transaction, currentMonth, currentYear),
      ),
    [currentMonth, currentYear, transactions],
  );

  const activeTransactions = useMemo(
    () => (activeTab === "fixed" ? fixedTransactions : subscriptionTransactions),
    [activeTab, fixedTransactions, subscriptionTransactions],
  );
  const pendingTransactions = useMemo(
    () =>
      activeTransactions.filter((transaction) => transaction.status !== "paid"),
    [activeTransactions],
  );
  const activePendingIds = useMemo(
    () => new Set(pendingTransactions.map((transaction) => transaction.id)),
    [pendingTransactions],
  );
  const effectiveSelectedIds = useMemo(
    () => selectedIds.filter((id) => activePendingIds.has(id)),
    [activePendingIds, selectedIds],
  );
  const fixedSummary = useMemo(
    () =>
      activeTransactions.reduce(
        (summary, transaction) => {
          summary.totalAmount += transaction.amount;

          if (transaction.status === "paid") {
            summary.paidAmount += transaction.amount;
          }

          return summary;
        },
        { paidAmount: 0, totalAmount: 0 },
      ),
    [activeTransactions],
  );
  const totalAmount = fixedSummary.totalAmount;
  const paidAmount = fixedSummary.paidAmount;
  const pendingAmount = totalAmount - paidAmount;
  const allPendingSelected = useMemo(
    () =>
      pendingTransactions.length > 0 &&
      pendingTransactions.every((transaction) =>
        effectiveSelectedIds.includes(transaction.id),
      ),
    [effectiveSelectedIds, pendingTransactions],
  );

  const toggleSelection = useCallback((transactionId: string) => {
    setSelectedIds((currentIds) =>
      currentIds.includes(transactionId)
        ? currentIds.filter((id) => id !== transactionId)
        : [...currentIds, transactionId],
    );
  }, []);

  const toggleAllPending = useCallback(() => {
    setSelectedIds(
      allPendingSelected
        ? []
        : pendingTransactions.map((transaction) => transaction.id),
    );
  }, [allPendingSelected, pendingTransactions]);

  const paySelectedTransactions = useCallback(async () => {
    if (!effectiveSelectedIds.length || isPayingSelected) return;

    setIsPayingSelected(true);

    try {
      await Promise.all(
        effectiveSelectedIds.map((transactionId) =>
          updateTransaction(transactionId, { status: "paid" }),
        ),
      );

      toast.success(
        `${effectiveSelectedIds.length} ${effectiveSelectedIds.length === 1 ? "lançamento pago" : "lançamentos pagos"}.`,
      );
      setSelectedIds([]);
    } catch (error) {
      console.error("Erro ao pagar lançamentos selecionados:", error);
      toast.error("Não foi possível concluir todos os pagamentos.");
      await fetchTransactions();
    } finally {
      setIsPayingSelected(false);
    }
  }, [
    effectiveSelectedIds,
    fetchTransactions,
    isPayingSelected,
    updateTransaction,
  ]);

  const togglePaymentStatus = useCallback(async (transaction: Transaction) => {
    const nextStatus = transaction.status === "paid" ? "pending" : "paid";

    try {
      await updateTransaction(transaction.id, { status: nextStatus });
      setSelectedIds((currentIds) =>
        currentIds.filter((id) => id !== transaction.id),
      );
      toast.success(
        nextStatus === "paid"
          ? "Lançamento marcado como pago."
          : "Lançamento marcado como pendente.",
      );
    } catch (error) {
      console.error("Erro ao atualizar pagamento:", error);
      toast.error("Não foi possível atualizar o pagamento.");
    }
  }, [updateTransaction]);

  const handleDeleteTransaction = useCallback(async (transactionId: string) => {
    try {
      await deleteTransaction(transactionId);
      setSelectedIds((currentIds) =>
        currentIds.filter((id) => id !== transactionId),
      );
      toast.success("Lançamento removido.");
    } catch (error) {
      console.error("Erro ao remover lançamento:", error);
      toast.error("Não foi possível remover agora.");
    }
  }, [deleteTransaction]);

  const handleDeleteFutureTransactions = useCallback(async (transaction: Transaction) => {
    if (!transaction.groupId) return;

    try {
      await deleteTransactionGroup(transaction.groupId, transaction.date);
      setSelectedIds([]);
      toast.success("Lançamento atual e próximos removidos.");
    } catch (error) {
      console.error("Erro ao remover recorrência:", error);
      toast.error("Não foi possível remover a recorrência agora.");
    }
  }, [deleteTransactionGroup]);

  function openCreateModal() {
    setEditingTransaction(null);
    setIsTransactionModalOpen(true);
  }

  function openEditModal(transaction: Transaction) {
    setEditingTransaction(transaction);
    setIsTransactionModalOpen(true);
  }

  function closeTransactionModal() {
    setIsTransactionModalOpen(false);
    setEditingTransaction(null);
  }

  function getCardName(cardId?: string | null) {
    return cards.find((card) => card.id === cardId)?.name ?? "Cartão";
  }

  function renderTransactionTable(items: Transaction[]) {
    return (
      <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
        <div className="space-y-2 p-3 md:hidden">
          {items.length ? (
            items.map((transaction) => {
              const isPaid = transaction.status === "paid";

              return (
                <div
                  key={transaction.id}
                  className="rounded-2xl border border-zinc-800 bg-zinc-900/55 p-3"
                >
                  <MobileTransactionItem
                    className="min-h-16 rounded-none border-0 bg-transparent p-0"
                    title={<TransactionDescription transaction={transaction} />}
                    category={transaction.category || "Sem categoria"}
                    date={formatDateOnlyBR(transaction.date)}
                    amount={`-${brlFormatter.format(transaction.amount)}`}
                  />
                  <div className="mt-3 flex items-center justify-between border-t border-zinc-800 pt-3">
                    <button
                      type="button"
                      onClick={() => void togglePaymentStatus(transaction)}
                      className="min-h-10 cursor-pointer"
                    >
                      <Badge
                        variant="outline"
                        className={
                          isPaid
                            ? "border-emerald-800 bg-emerald-950 text-emerald-300"
                            : "border-amber-800 bg-amber-950 text-amber-300"
                        }
                      >
                        {isPaid ? "Pago" : "Pendente"}
                      </Badge>
                    </button>
                    <div className="flex items-center gap-1">
                      <Checkbox
                        aria-label={`Selecionar ${transaction.description}`}
                        checked={effectiveSelectedIds.includes(transaction.id)}
                        disabled={isPaid}
                        onCheckedChange={() => toggleSelection(transaction.id)}
                        className="mr-2 size-5 border-zinc-600"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-11 rounded-xl text-zinc-400"
                        onClick={() => openEditModal(transaction)}
                        aria-label="Editar lançamento"
                      >
                        <Pencil className="size-5" />
                      </Button>
                      <RecurringDeleteDialog
                        transaction={transaction}
                        onDeleteSingle={(item) => handleDeleteTransaction(item.id)}
                        onDeleteFuture={handleDeleteFutureTransactions}
                      >
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-11 rounded-xl text-zinc-400 hover:text-red-300"
                          aria-label="Excluir lançamento"
                        >
                          <Trash2 className="size-5" />
                        </Button>
                      </RecurringDeleteDialog>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex min-h-44 flex-col items-center justify-center gap-3 text-center text-sm text-zinc-500">
              <CalendarX className="size-7" />
              Nenhum lançamento recorrente neste período.
            </div>
          )}
        </div>

        <Table className="hidden min-w-[820px] md:table">
          <TableHeader>
            <TableRow className="border-zinc-800 bg-zinc-900/60 hover:bg-zinc-900/60">
              <TableHead className="w-12 px-4">
                <Checkbox
                  aria-label="Selecionar todos os pendentes"
                  checked={allPendingSelected}
                  disabled={!pendingTransactions.length}
                  onCheckedChange={toggleAllPending}
                  className="border-zinc-600"
                />
              </TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Origem</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="w-24 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length ? (
              items.map((transaction) => {
                const isPaid = transaction.status === "paid";

                return (
                  <TableRow
                    key={transaction.id}
                    className="border-zinc-800 transition-colors hover:bg-zinc-900/50"
                  >
                    <TableCell className="px-4">
                      <Checkbox
                        aria-label={`Selecionar ${transaction.description}`}
                        checked={effectiveSelectedIds.includes(transaction.id)}
                        disabled={isPaid}
                        onCheckedChange={() => toggleSelection(transaction.id)}
                        className="border-zinc-600"
                      />
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-zinc-400">
                      {formatDateOnlyBR(transaction.date)}
                    </TableCell>
                    <TableCell className="font-medium text-zinc-100">
                      <TransactionDescription transaction={transaction} />
                    </TableCell>
                    <TableCell className="text-zinc-400">
                      {transaction.category || "Sem categoria"}
                    </TableCell>
                    <TableCell className="text-zinc-400">
                      {transaction.type === "card"
                        ? getCardName(transaction.cardId)
                        : "Conta fixa"}
                    </TableCell>
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => void togglePaymentStatus(transaction)}
                        className="cursor-pointer"
                      >
                        <Badge
                          variant="outline"
                          className={
                            isPaid
                              ? "border-emerald-800 bg-emerald-950 text-emerald-300"
                              : "border-amber-800 bg-amber-950 text-amber-300"
                          }
                        >
                          {isPaid ? "Pago" : "Pendente"}
                        </Badge>
                      </button>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-zinc-100">
                      {brlFormatter.format(transaction.amount)}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Editar lançamento"
                          className="text-zinc-500 hover:bg-zinc-800 hover:text-zinc-100"
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
                            size="icon-sm"
                            aria-label="Excluir lançamento"
                            className="text-zinc-500 hover:bg-red-950 hover:text-red-300"
                          >
                            <Trash2 />
                          </Button>
                        </RecurringDeleteDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow className="border-zinc-800 hover:bg-transparent">
                <TableCell colSpan={8} className="h-48 text-center">
                  <div className="flex flex-col items-center justify-center gap-3 text-zinc-500">
                    <CalendarX className="size-7" strokeWidth={1.6} />
                    <span>Nenhum lançamento recorrente neste período.</span>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <>
      <div className="flex w-full flex-col gap-6 md:gap-8">
        <header className="flex items-start justify-between gap-4">
          <div className="max-w-2xl">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-50 md:text-3xl">
              Contas e assinaturas
            </h1>
            <p className="mt-3 text-sm leading-6 text-zinc-400">
              Acompanhe vencimentos recorrentes e faça baixas individuais ou em
              massa.
            </p>
          </div>

          <Button
            type="button"
            aria-label="Criar nova recorrência"
            onClick={openCreateModal}
            className="h-11 gap-2 bg-emerald-600 px-3.5 text-sm font-semibold text-white hover:bg-emerald-700 md:h-12 md:px-6 md:text-base"
          >
            <PlusCircle className="size-5" />
            <span className="hidden min-[410px]:inline">Nova Recorrência</span>
          </Button>
        </header>

        <section className="grid grid-cols-2 overflow-hidden rounded-2xl border border-zinc-800 sm:grid-cols-3">
          <div className="col-span-2 border-b border-zinc-800 px-4 py-5 sm:col-span-1 sm:border-b-0 sm:border-r sm:px-6">
            <p className="text-sm text-zinc-500">Total do período</p>
            <strong className="mt-2 block text-2xl font-semibold text-zinc-100">
              {brlFormatter.format(totalAmount)}
            </strong>
          </div>
          <div className="border-r border-zinc-800 px-4 py-5 sm:px-6">
            <p className="text-sm text-zinc-500">Pago</p>
            <strong className="mt-2 block text-2xl font-semibold text-emerald-300">
              {brlFormatter.format(paidAmount)}
            </strong>
          </div>
          <div className="px-4 py-5 sm:px-6">
            <p className="text-sm text-zinc-500">Pendente</p>
            <strong className="mt-2 block text-2xl font-semibold text-amber-300">
              {brlFormatter.format(pendingAmount)}
            </strong>
          </div>
        </section>

        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            setActiveTab(value as RecurringTab);
            setSelectedIds([]);
          }}
          className="w-full"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <TabsList className="grid w-full grid-cols-2 border border-zinc-800 bg-zinc-950 p-1 sm:w-96">
              <TabsTrigger value="fixed" className="gap-2">
                <ReceiptText className="size-4" />
                Contas Fixas
                <span className="text-xs text-zinc-500">
                  {fixedTransactions.length}
                </span>
              </TabsTrigger>
              <TabsTrigger value="subscriptions" className="gap-2">
                <CreditCard className="size-4" />
                Assinaturas
                <span className="text-xs text-zinc-500">
                  {subscriptionTransactions.length}
                </span>
              </TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-2 text-sm text-zinc-500">
              <CalendarDays className="size-4" />
              {currentMonth.toString().padStart(2, "0")}/{currentYear}
            </div>
          </div>

          <TabsContent value="fixed" className="mt-5">
            {renderTransactionTable(fixedTransactions)}
          </TabsContent>
          <TabsContent value="subscriptions" className="mt-5">
            {renderTransactionTable(subscriptionTransactions)}
          </TabsContent>
        </Tabs>
      </div>

      {effectiveSelectedIds.length > 0 ? (
        <div className="fixed bottom-24 right-4 z-50 lg:bottom-8 lg:right-8">
          <Button
            type="button"
            variant="default"
            size="default"
            disabled={isPayingSelected}
            onClick={() => void paySelectedTransactions()}
          >
            {isPayingSelected ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Check className="size-4" />
            )}
            Pagar {effectiveSelectedIds.length} selecionado
            {effectiveSelectedIds.length === 1 ? "" : "s"}
          </Button>
        </div>
      ) : null}

      <AddTransactionModal
        isOpen={isTransactionModalOpen}
        onClose={closeTransactionModal}
        editingTransaction={editingTransaction}
        mode={editingTransaction?.type === "card" ? "expense" : "fixed"}
      />
    </>
  );
}
