"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Ban,
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
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  formatDateOnlyBR,
  getLocalTodayDateOnly,
  normalizeDateOnly,
} from "@/lib/dateUtils";
import {
  getTransactionStatusPresentation,
  isFutureCardSubscription,
} from "@/lib/transactionStatus";
import { isTransactionInSelectedCompetence } from "@/lib/transactionPeriod";
import { cn } from "@/lib/utils";
import { useFinanceStore, type Transaction } from "@/store/useFinanceStore";

const brlFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function getDayDifference(dateOnly: string) {
  const today = new Date(`${getLocalTodayDateOnly()}T00:00:00`);
  const target = new Date(`${normalizeDateOnly(dateOnly)}T00:00:00`);

  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

function getSubscriptionChargeLabel(transaction: Transaction) {
  if (transaction.status === "paid") return "Fatura liquidada";

  const dayDifference = getDayDifference(transaction.date);

  if (dayDifference > 0) {
    return `Cai em ${dayDifference} ${dayDifference === 1 ? "dia" : "dias"}`;
  }

  if (dayDifference === 0) return "Cai hoje";

  return "Já caiu na fatura";
}

function getDueStatusLabel(dateOnly: string) {
  const dayDifference = getDayDifference(dateOnly);

  if (dayDifference === 0) return "Vence hoje";
  if (dayDifference < 0) {
    return `Atrasado ${Math.abs(dayDifference)} ${
      Math.abs(dayDifference) === 1 ? "dia" : "dias"
    }`;
  }

  return `Vence em ${dayDifference} ${dayDifference === 1 ? "dia" : "dias"}`;
}

type RecurringTab = "fixed" | "subscriptions";

interface SubscriptionGroup {
  id: string;
  representative: Transaction;
  transactions: Transaction[];
  nextCharge: Transaction;
  projectedTotal: number;
  paidCount: number;
  openCount: number;
}

function isInSelectedMonth(
  transaction: Transaction,
  month: number,
  year: number,
) {
  return isTransactionInSelectedCompetence(transaction, month, year);
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

  const subscriptionGroups = useMemo<SubscriptionGroup[]>(() => {
    const selectedGroupIds = new Set(
      subscriptionTransactions.map(
        (transaction) => transaction.groupId ?? transaction.id,
      ),
    );
    const groups = new Map<string, Transaction[]>();

    transactions
      .filter(
        (transaction) =>
          transaction.type === "card" &&
          transaction.is_recurring === true &&
          selectedGroupIds.has(transaction.groupId ?? transaction.id),
      )
      .forEach((transaction) => {
        const groupId = transaction.groupId ?? transaction.id;
        const currentGroup = groups.get(groupId) ?? [];

        groups.set(groupId, [...currentGroup, transaction]);
      });

    return Array.from(groups.entries())
      .map(([groupId, groupTransactions]) => {
        const sortedTransactions = [...groupTransactions].sort((left, right) =>
          normalizeDateOnly(left.date).localeCompare(normalizeDateOnly(right.date)),
        );
        const representative =
          sortedTransactions.find((transaction) =>
            isInSelectedMonth(transaction, currentMonth, currentYear),
          ) ?? sortedTransactions[0];
        const nextCharge =
          sortedTransactions.find(
            (transaction) =>
              transaction.status !== "paid" &&
              normalizeDateOnly(transaction.date) >= getLocalTodayDateOnly(),
          ) ??
          sortedTransactions.find((transaction) => transaction.status !== "paid") ??
          representative;

        return {
          id: groupId,
          representative,
          transactions: sortedTransactions,
          nextCharge,
          projectedTotal: sortedTransactions.reduce(
            (total, transaction) => total + transaction.amount,
            0,
          ),
          paidCount: sortedTransactions.filter(
            (transaction) => transaction.status === "paid",
          ).length,
          openCount: sortedTransactions.filter(
            (transaction) => transaction.status !== "paid",
          ).length,
        };
      })
      .sort((left, right) =>
        normalizeDateOnly(left.nextCharge.date).localeCompare(
          normalizeDateOnly(right.nextCharge.date),
        ),
      );
  }, [currentMonth, currentYear, subscriptionTransactions, transactions]);

  const activeTransactions = useMemo(
    () => (activeTab === "fixed" ? fixedTransactions : subscriptionTransactions),
    [activeTab, fixedTransactions, subscriptionTransactions],
  );
  const pendingTransactions = useMemo(
    () =>
      activeTransactions.filter(
        (transaction) =>
          transaction.status !== "paid" &&
          !isFutureCardSubscription(transaction),
      ),
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
      fixedTransactions.reduce(
        (summary, transaction) => {
          summary.totalAmount += transaction.amount;

          if (transaction.status === "paid") {
            summary.paidAmount += transaction.amount;
          }

          return summary;
        },
        { paidAmount: 0, totalAmount: 0 },
      ),
    [fixedTransactions],
  );
  const totalAmount = fixedSummary.totalAmount;
  const paidAmount = fixedSummary.paidAmount;
  const fixedPendingTransactions = useMemo(
    () =>
      fixedTransactions
        .filter((transaction) => transaction.status !== "paid")
        .sort((left, right) =>
          normalizeDateOnly(left.date).localeCompare(normalizeDateOnly(right.date)),
        ),
    [fixedTransactions],
  );
  const fixedPaidTransactions = useMemo(
    () =>
      fixedTransactions
        .filter((transaction) => transaction.status === "paid")
        .sort((left, right) =>
          normalizeDateOnly(right.date).localeCompare(normalizeDateOnly(left.date)),
        ),
    [fixedTransactions],
  );
  const nextFixedDue = fixedPendingTransactions[0] ?? null;
  const pendingAmount = fixedPendingTransactions.reduce(
    (total, transaction) => total + transaction.amount,
    0,
  );
  const paidProgress =
    totalAmount > 0 ? Math.min((paidAmount / totalAmount) * 100, 100) : 0;
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
    if (isFutureCardSubscription(transaction)) {
      toast.error("Essa assinatura ainda não caiu na fatura.");
      return;
    }

    const nextStatus =
      transaction.status === "paid"
        ? transaction.type === "card"
          ? "confirmed"
          : "pending"
        : "paid";

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
      toast.success(
        transaction.type === "card" && transaction.is_recurring
          ? "Assinatura cancelada. Histórico preservado."
          : "Lançamento atual e próximos removidos.",
      );
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

  function renderFixedList(items: Transaction[]) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950">
        <div className="grid gap-3 p-3 md:hidden">
          {items.length ? (
            items.map((transaction) => {
              const isPaid = transaction.status === "paid";
              const statusPresentation =
                getTransactionStatusPresentation(transaction);

              return (
                <div
                  key={transaction.id}
                  className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <TransactionDescription transaction={transaction} />
                      <p className="mt-1 text-xs text-zinc-500">
                        Conta fixa • {formatDateOnlyBR(transaction.date)}
                      </p>
                    </div>
                    <strong className="shrink-0 text-sm text-zinc-100">
                      {brlFormatter.format(transaction.amount)}
                    </strong>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3 border-t border-zinc-800 pt-3">
                    <div>
                      <button
                        type="button"
                        onClick={() => void togglePaymentStatus(transaction)}
                        className="cursor-pointer"
                      >
                        <Badge
                          variant="outline"
                          className={statusPresentation.className}
                        >
                          {statusPresentation.label}
                        </Badge>
                      </button>
                      <p className="mt-1 text-xs text-zinc-500">
                        {isPaid ? "Pago" : "Aguardando baixa"}
                      </p>
                    </div>
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
                        aria-label="Editar conta fixa"
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
                          aria-label="Excluir conta fixa"
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
              Nenhuma conta fixa neste período.
            </div>
          )}
        </div>

        <Table className="hidden min-w-[820px] md:table">
          <TableHeader>
            <TableRow className="border-zinc-800 bg-zinc-900/60 hover:bg-zinc-900/60">
              <TableHead className="w-12 px-4">
                <Checkbox
                  aria-label="Selecionar todas as contas fixas pendentes"
                  checked={allPendingSelected}
                  disabled={!pendingTransactions.length}
                  onCheckedChange={toggleAllPending}
                  className="border-zinc-600"
                />
              </TableHead>
              <TableHead>Conta fixa</TableHead>
              <TableHead>Origem</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="w-24 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length ? (
              items.map((transaction) => {
                const isPaid = transaction.status === "paid";
                const statusPresentation =
                  getTransactionStatusPresentation(transaction);

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
                    <TableCell>
                      <div className="font-medium text-zinc-100">
                        <TransactionDescription transaction={transaction} />
                      </div>
                      <p className="mt-1 text-xs text-zinc-500">
                        {transaction.category || "Sem categoria"}
                      </p>
                    </TableCell>
                    <TableCell className="text-zinc-400">Conta fixa</TableCell>
                    <TableCell>
                      <p className="text-sm text-zinc-300">
                        {formatDateOnlyBR(transaction.date)}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {isPaid ? "Pago" : "Aguardando baixa"}
                      </p>
                    </TableCell>
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => void togglePaymentStatus(transaction)}
                        className="cursor-pointer"
                      >
                        <Badge
                          variant="outline"
                          className={statusPresentation.className}
                        >
                          {statusPresentation.label}
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
                          aria-label="Editar conta fixa"
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
                            aria-label="Excluir conta fixa"
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
                <TableCell colSpan={7} className="h-48 text-center">
                  <div className="flex flex-col items-center justify-center gap-3 text-zinc-500">
                    <CalendarX className="size-7" strokeWidth={1.6} />
                    <span>Nenhuma conta fixa neste período.</span>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    );
  }

  function renderSubscriptionList(groups: SubscriptionGroup[]) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950">
        <div className="grid gap-3 p-3 md:hidden">
          {groups.length ? (
            groups.map((group) => {
              const transaction = group.representative;
              const isPaid = group.nextCharge.status === "paid";
              const isFutureSubscription = isFutureCardSubscription(group.nextCharge);
              const statusPresentation =
                getTransactionStatusPresentation(group.nextCharge);

              return (
                <div
                  key={group.id}
                  className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <TransactionDescription transaction={transaction} />
                      <p className="mt-1 text-xs text-zinc-500">
                        {getCardName(transaction.cardId)} • próxima:{" "}
                        {formatDateOnlyBR(group.nextCharge.date)}
                      </p>
                    </div>
                    <strong className="shrink-0 text-sm text-zinc-100">
                      {brlFormatter.format(transaction.amount)}
                    </strong>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 border-t border-zinc-800 pt-3 text-xs">
                    <div>
                      <p className="text-zinc-500">Projetado</p>
                      <p className="mt-1 font-medium text-zinc-200">
                        {brlFormatter.format(group.projectedTotal)}
                      </p>
                    </div>
                    <div>
                      <p className="text-zinc-500">Cobranças</p>
                      <p className="mt-1 font-medium text-zinc-200">
                        {group.openCount} abertas • {group.paidCount} pagas
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3 border-t border-zinc-800 pt-3">
                    <div>
                      <Badge
                        variant="outline"
                        className={statusPresentation.className}
                      >
                        {statusPresentation.label}
                      </Badge>
                      <p className="mt-1 text-xs text-zinc-500">
                        {getSubscriptionChargeLabel(group.nextCharge)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Checkbox
                        aria-label={`Selecionar ${transaction.description}`}
                        checked={effectiveSelectedIds.includes(transaction.id)}
                        disabled={isPaid || isFutureSubscription}
                        onCheckedChange={() => toggleSelection(transaction.id)}
                        className="mr-2 size-5 border-zinc-600"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-11 rounded-xl text-zinc-400"
                        onClick={() => openEditModal(transaction)}
                        aria-label="Editar assinatura"
                      >
                        <Pencil className="size-5" />
                      </Button>
                      <RecurringDeleteDialog
                        transaction={transaction}
                        onDeleteSingle={(item) => handleDeleteTransaction(item.id)}
                        onDeleteFuture={handleDeleteFutureTransactions}
                        mode="cancelSubscription"
                      >
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-11 rounded-xl text-zinc-400 hover:text-red-300"
                          aria-label="Cancelar assinatura"
                        >
                          <Ban className="size-5" />
                        </Button>
                      </RecurringDeleteDialog>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex min-h-44 flex-col items-center justify-center gap-3 text-center text-sm text-zinc-500">
              <CreditCard className="size-7" />
              Nenhuma assinatura neste período.
            </div>
          )}
        </div>

        <Table className="hidden min-w-[820px] md:table">
          <TableHeader>
            <TableRow className="border-zinc-800 bg-zinc-900/60 hover:bg-zinc-900/60">
              <TableHead className="w-12 px-4">
                <Checkbox
                  aria-label="Selecionar todas as assinaturas cobradas"
                  checked={allPendingSelected}
                  disabled={!pendingTransactions.length}
                  onCheckedChange={toggleAllPending}
                  className="border-zinc-600"
                />
              </TableHead>
              <TableHead>Assinatura</TableHead>
              <TableHead>Cartão</TableHead>
              <TableHead>Próxima cobrança</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Mensal</TableHead>
              <TableHead className="text-right">Projetado</TableHead>
              <TableHead className="w-24 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {groups.length ? (
              groups.map((group) => {
                const transaction = group.representative;
                const isPaid = group.nextCharge.status === "paid";
                const isFutureSubscription = isFutureCardSubscription(group.nextCharge);
                const statusPresentation =
                  getTransactionStatusPresentation(group.nextCharge);

                return (
                  <TableRow
                    key={group.id}
                    className="border-zinc-800 transition-colors hover:bg-zinc-900/50"
                  >
                    <TableCell className="px-4">
                      <Checkbox
                        aria-label={`Selecionar ${transaction.description}`}
                        checked={effectiveSelectedIds.includes(transaction.id)}
                        disabled={isPaid || isFutureSubscription}
                        onCheckedChange={() => toggleSelection(transaction.id)}
                        className="border-zinc-600"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-zinc-100">
                        <TransactionDescription transaction={transaction} />
                      </div>
                      <p className="mt-1 text-xs text-zinc-500">
                        {transaction.category || "Sem categoria"}
                      </p>
                    </TableCell>
                    <TableCell className="text-zinc-400">
                      {getCardName(transaction.cardId)}
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-zinc-300">
                        {formatDateOnlyBR(group.nextCharge.date)}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {getSubscriptionChargeLabel(group.nextCharge)}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={statusPresentation.className}
                      >
                        {statusPresentation.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-zinc-100">
                      {brlFormatter.format(transaction.amount)}
                    </TableCell>
                    <TableCell className="text-right">
                      <p className="font-medium text-zinc-100">
                        {brlFormatter.format(group.projectedTotal)}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {group.openCount} abertas • {group.paidCount} pagas
                      </p>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Editar assinatura"
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
                          mode="cancelSubscription"
                        >
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Cancelar assinatura"
                            className="text-zinc-500 hover:bg-red-950 hover:text-red-300"
                          >
                            <Ban />
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
                    <CreditCard className="size-7" strokeWidth={1.6} />
                    <span>Nenhuma assinatura neste período.</span>
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

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-zinc-500">Contas pagas</p>
              <Check className="size-4 text-emerald-300" />
            </div>
            <strong className="mt-3 block text-2xl font-semibold text-zinc-100">
              {brlFormatter.format(paidAmount)}
              <span className="text-sm font-medium text-zinc-500">
                {" "}/ {brlFormatter.format(totalAmount)}
              </span>
            </strong>
            <Progress value={paidProgress} className="mt-3 h-2" />
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-zinc-500">Próximo vencimento</p>
              <CalendarDays className="size-4 text-zinc-400" />
            </div>
            {nextFixedDue ? (
              <>
                <strong className="mt-3 block truncate text-2xl font-semibold text-zinc-100">
                  {brlFormatter.format(nextFixedDue.amount)}
                </strong>
                <p className="mt-1 truncate text-sm text-zinc-400">
                  {nextFixedDue.description}
                </p>
                <p
                  className={cn(
                    "mt-2 text-xs font-medium",
                    getDayDifference(nextFixedDue.date) < 0
                      ? "text-red-300"
                      : getDayDifference(nextFixedDue.date) === 0
                        ? "text-orange-300"
                        : "text-zinc-500",
                  )}
                >
                  {getDueStatusLabel(nextFixedDue.date)}
                </p>
              </>
            ) : (
              <div className="mt-3">
                <strong className="block text-2xl font-semibold text-emerald-300">
                  Tudo em dia
                </strong>
                <p className="mt-1 text-sm text-zinc-500">
                  Nenhuma conta fixa pendente.
                </p>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-zinc-500">Pendentes</p>
              <ReceiptText className="size-4 text-amber-300" />
            </div>
            <strong className="mt-3 block text-2xl font-semibold text-amber-300">
              {brlFormatter.format(pendingAmount)}
            </strong>
            <p className="mt-1 text-sm text-zinc-500">
              {fixedPendingTransactions.length}{" "}
              {fixedPendingTransactions.length === 1 ? "conta aberta" : "contas abertas"}
            </p>
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
                  {subscriptionGroups.length}
                </span>
              </TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-2 text-sm text-zinc-500">
              <CalendarDays className="size-4" />
              {currentMonth.toString().padStart(2, "0")}/{currentYear}
            </div>
          </div>

          <TabsContent value="fixed" className="mt-5 space-y-5">
            <section className="space-y-3">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-zinc-100">
                    Pendentes
                  </h2>
                  <p className="mt-1 text-sm text-zinc-500">
                    Contas que ainda exigem baixa manual neste mês.
                  </p>
                </div>
                <Badge variant="outline" className="border-amber-500/30 text-amber-300">
                  {fixedPendingTransactions.length}
                </Badge>
              </div>
              {renderFixedList(fixedPendingTransactions)}
            </section>

            <section className="space-y-3">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-zinc-100">
                    Pagas
                  </h2>
                  <p className="mt-1 text-sm text-zinc-500">
                    Histórico de contas fixas já baixadas no período.
                  </p>
                </div>
                <Badge variant="outline" className="border-emerald-500/30 text-emerald-300">
                  {fixedPaidTransactions.length}
                </Badge>
              </div>
              {renderFixedList(fixedPaidTransactions)}
            </section>
          </TabsContent>
          <TabsContent value="subscriptions" className="mt-5">
            {renderSubscriptionList(subscriptionGroups)}
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
            Marcar {effectiveSelectedIds.length} como pago
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
