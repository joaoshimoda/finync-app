"use client";

import { useEffect, useMemo, useState } from "react";
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
import { formatDateOnlyBR, getDateOnlyParts } from "@/lib/dateUtils";
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
  const transactionDate = getDateOnlyParts(transaction.date);

  return transactionDate.month === month && transactionDate.year === year;
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
  const fetchCards = useFinanceStore((state) => state.fetchCards);
  const fetchTransactions = useFinanceStore((state) => state.fetchTransactions);
  const deleteTransaction = useFinanceStore((state) => state.deleteTransaction);
  const deleteTransactionGroup = useFinanceStore(
    (state) => state.deleteTransactionGroup,
  );
  const updateTransaction = useFinanceStore((state) => state.updateTransaction);
  const currentMonth = useFinanceStore((state) => state.currentMonth);
  const currentYear = useFinanceStore((state) => state.currentYear);

  useEffect(() => {
    void Promise.all([fetchCards(), fetchTransactions()]);
  }, [currentMonth, currentYear, fetchCards, fetchTransactions]);

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

  const activeTransactions =
    activeTab === "fixed" ? fixedTransactions : subscriptionTransactions;
  const pendingTransactions = activeTransactions.filter(
    (transaction) => transaction.status !== "paid",
  );
  const activePendingIds = new Set(
    pendingTransactions.map((transaction) => transaction.id),
  );
  const effectiveSelectedIds = selectedIds.filter((id) =>
    activePendingIds.has(id),
  );
  const totalAmount = activeTransactions.reduce(
    (total, transaction) => total + transaction.amount,
    0,
  );
  const paidAmount = activeTransactions
    .filter((transaction) => transaction.status === "paid")
    .reduce((total, transaction) => total + transaction.amount, 0);
  const pendingAmount = totalAmount - paidAmount;
  const allPendingSelected =
    pendingTransactions.length > 0 &&
    pendingTransactions.every((transaction) =>
      effectiveSelectedIds.includes(transaction.id),
    );

  function toggleSelection(transactionId: string) {
    setSelectedIds((currentIds) =>
      currentIds.includes(transactionId)
        ? currentIds.filter((id) => id !== transactionId)
        : [...currentIds, transactionId],
    );
  }

  function toggleAllPending() {
    setSelectedIds(
      allPendingSelected
        ? []
        : pendingTransactions.map((transaction) => transaction.id),
    );
  }

  async function paySelectedTransactions() {
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
  }

  async function togglePaymentStatus(transaction: Transaction) {
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
  }

  async function handleDeleteTransaction(transactionId: string) {
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
  }

  async function handleDeleteFutureTransactions(transaction: Transaction) {
    if (!transaction.groupId) return;

    try {
      await deleteTransactionGroup(transaction.groupId, transaction.date);
      setSelectedIds([]);
      toast.success("Lançamento atual e próximos removidos.");
    } catch (error) {
      console.error("Erro ao remover recorrência:", error);
      toast.error("Não foi possível remover a recorrência agora.");
    }
  }

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
      <div className="overflow-x-auto border border-zinc-800 bg-zinc-950">
        <Table className="min-w-[820px]">
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
      <div className="flex w-full flex-col gap-8">
        <header className="flex flex-col items-start justify-between gap-5 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <p className="mb-2 text-sm font-semibold text-zinc-500">
              Compromissos recorrentes
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-50">
              Contas e assinaturas
            </h1>
            <p className="mt-3 text-sm leading-6 text-zinc-400">
              Acompanhe vencimentos recorrentes e faça baixas individuais ou em
              massa.
            </p>
          </div>

          <Button
            type="button"
            onClick={openCreateModal}
            className="h-12 gap-2 bg-emerald-600 px-6 text-base font-semibold text-white hover:bg-emerald-700"
          >
            <PlusCircle className="size-5" />
            Nova Recorrência
          </Button>
        </header>

        <section className="grid grid-cols-1 border-y border-zinc-800 sm:grid-cols-3">
          <div className="px-1 py-5 sm:border-r sm:border-zinc-800 sm:px-6">
            <p className="text-sm text-zinc-500">Total do período</p>
            <strong className="mt-2 block text-2xl font-semibold text-zinc-100">
              {brlFormatter.format(totalAmount)}
            </strong>
          </div>
          <div className="border-t border-zinc-800 px-1 py-5 sm:border-r sm:border-t-0 sm:px-6">
            <p className="text-sm text-zinc-500">Pago</p>
            <strong className="mt-2 block text-2xl font-semibold text-emerald-300">
              {brlFormatter.format(paidAmount)}
            </strong>
          </div>
          <div className="border-t border-zinc-800 px-1 py-5 sm:border-t-0 sm:px-6">
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
