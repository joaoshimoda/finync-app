"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import {
  Check,
  CreditCard,
  Loader2,
  PlusCircle,
  ReceiptText,
  Repeat2,
  Search,
  X,
} from "lucide-react";
import { toast } from "sonner";

import {
  dashboardEase,
  dashboardReveal,
  dashboardStagger,
  usePrivateCurrency,
} from "@/components/dashboard/shared";
import { FixedBillsList } from "@/components/fixed/FixedBillsList";
import { MonthTimeline } from "@/components/fixed/MonthTimeline";
import { RecurringSummary } from "@/components/fixed/RecurringSummary";
import { SubscriptionsGrid } from "@/components/fixed/SubscriptionsGrid";
import { useRecurringData } from "@/components/fixed/useRecurringData";
import { AnimatedMonthSelector } from "@/components/finance/AnimatedMonthSelector";
import { RecurringDeleteDialog } from "@/components/finance/RecurringDeleteDialog";
import { AddTransactionModal } from "@/components/modals/AddTransactionModal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useFinanceStore, type Transaction } from "@/store/useFinanceStore";

type RecurringTab = "fixed" | "subscriptions";
type StatusFilter = "all" | "open" | "paid";

const statusFilters: Array<{ id: StatusFilter; label: string }> = [
  { id: "all", label: "Todas" },
  { id: "open", label: "Em aberto" },
  { id: "paid", label: "Pagas" },
];

export default function FixedExpensesPage() {
  const [activeTab, setActiveTab] = useState<RecurringTab>("fixed");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [updatingIds, setUpdatingIds] = useState<string[]>([]);
  const [isPayingSelected, setIsPayingSelected] = useState(false);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);

  const fetchTransactions = useFinanceStore((state) => state.fetchTransactions);
  const deleteTransaction = useFinanceStore((state) => state.deleteTransaction);
  const deleteTransactionGroup = useFinanceStore(
    (state) => state.deleteTransactionGroup,
  );
  const updateTransaction = useFinanceStore((state) => state.updateTransaction);
  const currentMonth = useFinanceStore((state) => state.currentMonth);
  const currentYear = useFinanceStore((state) => state.currentYear);
  const isFetching = useFinanceStore((state) => state.isFetching);
  const nextMonth = useFinanceStore((state) => state.nextMonth);
  const prevMonth = useFinanceStore((state) => state.prevMonth);
  const formatValue = usePrivateCurrency();

  useEffect(() => {
    void fetchTransactions();
  }, [currentMonth, currentYear, fetchTransactions]);

  const data = useRecurringData();

  const visibleBills = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR");

    return data.bills.filter(
      (bill) =>
        (statusFilter === "all" ||
          (statusFilter === "paid") === (bill.group === "paid")) &&
        (!normalizedQuery ||
          `${bill.transaction.description} ${bill.transaction.category}`
            .toLocaleLowerCase("pt-BR")
            .includes(normalizedQuery)),
    );
  }, [data.bills, query, statusFilter]);

  /* Selection only ever holds open bills of the selected month. */
  const effectiveSelectedIds = useMemo(() => {
    const openIds = new Set(data.openBills.map((bill) => bill.transaction.id));
    return selectedIds.filter((id) => openIds.has(id));
  }, [data.openBills, selectedIds]);
  const selectedTotal = data.openBills
    .filter((bill) => effectiveSelectedIds.includes(bill.transaction.id))
    .reduce((total, bill) => total + bill.transaction.amount, 0);

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }, []);

  const selectGroup = useCallback((ids: string[], select: boolean) => {
    setSelectedIds((current) =>
      select
        ? Array.from(new Set([...current, ...ids]))
        : current.filter((id) => !ids.includes(id)),
    );
  }, []);

  const setPaidStatus = useCallback(
    async (ids: string[], status: "paid" | "pending") => {
      await Promise.all(
        ids.map((id) => updateTransaction(id, { status })),
      );
    },
    [updateTransaction],
  );

  const togglePaid = useCallback(
    async (transaction: Transaction) => {
      const nextStatus = transaction.status === "paid" ? "pending" : "paid";

      setUpdatingIds((current) => [...current, transaction.id]);
      try {
        await setPaidStatus([transaction.id], nextStatus);
        setSelectedIds((current) =>
          current.filter((id) => id !== transaction.id),
        );
        toast.success(
          nextStatus === "paid"
            ? `${transaction.description} marcada como paga.`
            : `${transaction.description} voltou para em aberto.`,
          {
            action: {
              label: "Desfazer",
              onClick: () =>
                void setPaidStatus(
                  [transaction.id],
                  nextStatus === "paid" ? "pending" : "paid",
                ).catch(() => toast.error("Não foi possível desfazer.")),
            },
          },
        );
      } catch (error) {
        console.error("Erro ao atualizar pagamento:", error);
        toast.error("Não foi possível atualizar o pagamento.");
      } finally {
        setUpdatingIds((current) =>
          current.filter((id) => id !== transaction.id),
        );
      }
    },
    [setPaidStatus],
  );

  const paySelected = useCallback(async () => {
    if (!effectiveSelectedIds.length || isPayingSelected) return;

    const ids = [...effectiveSelectedIds];
    setIsPayingSelected(true);

    try {
      await setPaidStatus(ids, "paid");
      setSelectedIds([]);
      toast.success(
        `${ids.length} ${ids.length === 1 ? "conta paga" : "contas pagas"}.`,
        {
          action: {
            label: "Desfazer",
            onClick: () =>
              void setPaidStatus(ids, "pending").catch(() =>
                toast.error("Não foi possível desfazer."),
              ),
          },
        },
      );
    } catch (error) {
      console.error("Erro ao pagar contas selecionadas:", error);
      toast.error("Não foi possível concluir todos os pagamentos.");
      await fetchTransactions();
    } finally {
      setIsPayingSelected(false);
    }
  }, [effectiveSelectedIds, fetchTransactions, isPayingSelected, setPaidStatus]);

  const handleDeleteSingle = useCallback(
    async (transaction: Transaction) => {
      try {
        await deleteTransaction(transaction.id);
        toast.success("Lançamento removido.");
      } catch (error) {
        console.error("Erro ao remover lançamento:", error);
        toast.error("Não foi possível remover agora.");
        throw error;
      }
    },
    [deleteTransaction],
  );

  const handleDeleteFuture = useCallback(
    async (transaction: Transaction) => {
      if (!transaction.groupId) return;

      try {
        await deleteTransactionGroup(transaction.groupId, transaction.date);
        setSelectedIds([]);
        toast.success(
          transaction.type === "card"
            ? "Assinatura cancelada. Histórico preservado."
            : "Lançamento atual e próximos removidos.",
        );
      } catch (error) {
        console.error("Erro ao remover recorrência:", error);
        toast.error("Não foi possível remover a recorrência agora.");
        throw error;
      }
    },
    [deleteTransactionGroup],
  );

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

  const tabs: Array<{
    id: RecurringTab;
    label: string;
    icon: typeof ReceiptText;
    count: number;
    total: number;
  }> = [
    {
      id: "fixed",
      label: "Contas fixas",
      icon: ReceiptText,
      count: data.bills.length,
      total: data.totals.fixed,
    },
    {
      id: "subscriptions",
      label: "Assinaturas",
      icon: CreditCard,
      count: data.subscriptions.length,
      total: data.totals.subscriptions,
    },
  ];

  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        variants={dashboardStagger}
        initial="hidden"
        animate="visible"
        className="flex w-full flex-col gap-5 pb-4 sm:gap-6"
      >
        <motion.header
          variants={dashboardReveal}
          className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"
        >
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-emerald-300">
              <Repeat2 className="size-3.5" />
              Recorrências
            </p>
            <h1 className="mt-1.5 text-2xl font-semibold tracking-[-0.03em] text-zinc-50 sm:text-3xl">
              Contas fixas e assinaturas
            </h1>
            <p className="mt-1 text-sm text-zinc-400">
              O que se repete todo mês, com vencimentos e cobranças no
              calendário.
            </p>
          </div>
          <div className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2 sm:flex sm:w-auto">
            <div className="min-w-0 sm:shrink-0">
              <AnimatedMonthSelector
                currentMonth={currentMonth}
                currentYear={currentYear}
                onPreviousMonth={prevMonth}
                onNextMonth={nextMonth}
                isLoading={isFetching}
              />
            </div>
            <Button
              type="button"
              aria-label="Criar nova recorrência"
              data-tour="recurrence-add"
              onClick={openCreateModal}
              className="h-11 gap-2 rounded-lg bg-emerald-400 px-4 font-semibold text-zinc-950 hover:bg-emerald-300 sm:px-5"
            >
              <PlusCircle className="size-5" />
              <span className="hidden min-[420px]:inline">Nova recorrência</span>
            </Button>
          </div>
        </motion.header>

        <RecurringSummary data={data} isFetching={isFetching} />

        <motion.div variants={dashboardReveal}>
          <MonthTimeline data={data} month={currentMonth} year={currentYear} />
        </motion.div>

        <motion.section
          variants={dashboardReveal}
          aria-label="Lista de recorrências"
          className={cn(
            "flex flex-col gap-4 transition-opacity",
            isFetching && "opacity-70",
          )}
        >
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div
              role="tablist"
              aria-label="Tipo de recorrência"
              className="grid grid-cols-2 gap-1 rounded-xl border border-white/[0.07] bg-zinc-900/50 p-1 lg:w-[26rem]"
            >
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setSelectedIds([]);
                    }}
                    className={cn(
                      "relative flex min-w-0 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                      isActive ? "text-zinc-50" : "text-zinc-400 hover:text-zinc-200",
                    )}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="recurring-tab"
                        className="absolute inset-0 rounded-lg bg-white/[0.08] ring-1 ring-inset ring-white/[0.06]"
                        transition={{ duration: 0.3, ease: dashboardEase }}
                      />
                    )}
                    <Icon
                      className={cn(
                        "relative size-4 shrink-0",
                        isActive &&
                          (tab.id === "fixed" ? "text-emerald-300" : "text-violet-300"),
                      )}
                    />
                    <span className="relative truncate font-medium">{tab.label}</span>
                    <span className="relative hidden text-xs tabular-nums text-zinc-500 min-[400px]:inline">
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              {activeTab === "fixed" && (
                <div
                  role="group"
                  aria-label="Filtrar por situação"
                  className="flex rounded-lg border border-white/[0.07] bg-zinc-900/50 p-0.5"
                >
                  {statusFilters.map((filter) => (
                    <button
                      key={filter.id}
                      type="button"
                      onClick={() => setStatusFilter(filter.id)}
                      aria-pressed={statusFilter === filter.id}
                      className={cn(
                        "flex-1 rounded-md px-3 py-1.5 text-xs transition-colors sm:flex-none",
                        statusFilter === filter.id
                          ? "bg-white/[0.08] text-zinc-100"
                          : "text-zinc-500 hover:text-zinc-200",
                      )}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              )}
              <label className="relative flex items-center">
                <Search className="pointer-events-none absolute left-3 size-4 text-zinc-500" />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={
                    activeTab === "fixed" ? "Buscar conta" : "Buscar assinatura"
                  }
                  aria-label="Buscar"
                  className="h-9 w-full rounded-lg border border-white/[0.07] bg-zinc-900/50 pr-8 pl-9 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-emerald-400/40 sm:w-56 [&::-webkit-search-cancel-button]:hidden"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    aria-label="Limpar busca"
                    className="absolute right-2 rounded p-0.5 text-zinc-500 hover:text-zinc-200"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </label>
            </div>
          </div>

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.25, ease: dashboardEase }}
            >
              {activeTab === "fixed" ? (
                <FixedBillsList
                  bills={visibleBills}
                  selectedIds={effectiveSelectedIds}
                  updatingIds={updatingIds}
                  isFiltered={
                    data.bills.length > 0 &&
                    (Boolean(query.trim()) || statusFilter !== "all")
                  }
                  onToggleSelect={toggleSelection}
                  onSelectGroup={selectGroup}
                  onTogglePaid={(transaction) => void togglePaid(transaction)}
                  onEdit={openEditModal}
                  onDelete={setDeleteTarget}
                  onCreate={openCreateModal}
                />
              ) : (
                <SubscriptionsGrid
                  subscriptions={data.subscriptions}
                  total={data.totals.subscriptions}
                  query={query}
                  onEdit={openEditModal}
                  onCancel={setDeleteTarget}
                  onCreate={openCreateModal}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </motion.section>
      </motion.div>

      <AnimatePresence>
        {effectiveSelectedIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.3, ease: dashboardEase }}
            className="fixed inset-x-4 bottom-24 z-50 mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-white/[0.1] bg-zinc-900/95 p-2 pl-4 shadow-2xl shadow-black/40 backdrop-blur-xl lg:bottom-6"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-zinc-100">
                {effectiveSelectedIds.length}{" "}
                {effectiveSelectedIds.length === 1 ? "selecionada" : "selecionadas"}
              </p>
              <p className="truncate text-xs tabular-nums text-zinc-500">
                {formatValue(selectedTotal)}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Limpar seleção"
              onClick={() => setSelectedIds([])}
              className="size-9 text-zinc-400 hover:text-zinc-100"
            >
              <X className="size-4" />
            </Button>
            <Button
              type="button"
              disabled={isPayingSelected}
              onClick={() => void paySelected()}
              className="h-9 gap-2 rounded-lg bg-emerald-400 px-4 font-semibold text-zinc-950 hover:bg-emerald-300"
            >
              {isPayingSelected ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Check className="size-4" />
              )}
              <span className="sm:hidden">Pagar</span>
              <span className="hidden sm:inline">Marcar como pagas</span>
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {deleteTarget && (
        <RecurringDeleteDialog
          transaction={deleteTarget}
          open
          onOpenChange={(open) => {
            if (!open) setDeleteTarget(null);
          }}
          onDeleteSingle={handleDeleteSingle}
          onDeleteFuture={handleDeleteFuture}
          mode={deleteTarget.type === "card" ? "cancelSubscription" : "delete"}
        />
      )}

      <AddTransactionModal
        isOpen={isTransactionModalOpen}
        onClose={closeTransactionModal}
        editingTransaction={editingTransaction}
        mode={editingTransaction?.type === "card" ? "expense" : "fixed"}
      />
    </MotionConfig>
  );
}
