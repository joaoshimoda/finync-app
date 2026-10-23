"use client";

import { useEffect, useMemo, useState } from "react";
import { MotionConfig, motion } from "framer-motion";
import { CopyPlus, Loader2, PlusCircle, Target } from "lucide-react";
import { toast } from "sonner";

import { BudgetCards } from "@/components/budgets/BudgetCards";
import { BudgetOverview } from "@/components/budgets/BudgetOverview";
import { UnbudgetedSpending } from "@/components/budgets/UnbudgetedSpending";
import { useBudgetsData, type BudgetRow } from "@/components/budgets/useBudgetsData";
import {
  dashboardPanelClassName,
  dashboardReveal,
  dashboardStagger,
} from "@/components/dashboard/shared";
import { AnimatedMonthSelector } from "@/components/finance/AnimatedMonthSelector";
import { CategoryBudgetModal } from "@/components/modals/CategoryBudgetModal";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { CategoryBudgetStatus } from "@/lib/categoryBudgets";
import { cn } from "@/lib/utils";
import { useFinanceStore, type CategoryBudget } from "@/store/useFinanceStore";

type StatusFilter = "all" | CategoryBudgetStatus;
type SortKey = "usage" | "amount" | "name";

const sortOptions: Array<{ id: SortKey; label: string }> = [
  { id: "usage", label: "Mais usado" },
  { id: "amount", label: "Maior limite" },
  { id: "name", label: "A–Z" },
];

const monthFormatter = new Intl.DateTimeFormat("pt-BR", { month: "long" });

export default function OrcamentosPage() {
  const currentMonth = useFinanceStore((state) => state.currentMonth);
  const currentYear = useFinanceStore((state) => state.currentYear);
  const fetchedMonth = useFinanceStore((state) => state.fetchedMonth);
  const fetchedYear = useFinanceStore((state) => state.fetchedYear);
  const isFetching = useFinanceStore((state) => state.isFetching);
  const nextMonth = useFinanceStore((state) => state.nextMonth);
  const prevMonth = useFinanceStore((state) => state.prevMonth);
  const fetchTransactions = useFinanceStore((state) => state.fetchTransactions);
  const deleteCategoryBudget = useFinanceStore(
    (state) => state.deleteCategoryBudget,
  );
  const copyPreviousMonthBudgets = useFinanceStore(
    (state) => state.copyPreviousMonthBudgets,
  );

  const [modal, setModal] = useState<{
    budget: CategoryBudget | null;
    categoryId?: string;
    amount?: number;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BudgetRow | null>(null);
  const [isCopying, setIsCopying] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("usage");

  /* Keep showing the loaded month while the next one is fetched. */
  const displayMonth = isFetching ? fetchedMonth : currentMonth;
  const displayYear = isFetching ? fetchedYear : currentYear;

  useEffect(() => {
    void fetchTransactions();
  }, [currentMonth, currentYear, fetchTransactions]);

  const data = useBudgetsData(displayMonth, displayYear);
  const previousMonthLabel = monthFormatter.format(
    new Date(displayYear, displayMonth - 2, 1),
  );
  const pace = data.phase === "current" ? data.monthProgress : null;

  const visibleRows = useMemo(
    () =>
      data.rows
        .filter((row) => statusFilter === "all" || row.status === statusFilter)
        .sort((left, right) => {
          if (sortKey === "amount") return right.amount - left.amount;
          if (sortKey === "name") {
            return left.categoryLabel.localeCompare(right.categoryLabel, "pt-BR");
          }
          return right.percentage - left.percentage;
        }),
    [data.rows, sortKey, statusFilter],
  );

  const filters: Array<{ id: StatusFilter; label: string; count: number }> = [
    { id: "all", label: "Todos", count: data.rows.length },
    { id: "exceeded", label: "Estourados", count: data.totals.counts.exceeded },
    { id: "attention", label: "Atenção", count: data.totals.counts.attention },
    { id: "on_track", label: "Dentro do limite", count: data.totals.counts.on_track },
  ];

  async function handleCopyPrevious() {
    if (isCopying) return;
    setIsCopying(true);

    try {
      const copied = await copyPreviousMonthBudgets(data.competenceMonth);
      if (copied) {
        toast.success(
          `${copied} ${copied === 1 ? "orçamento copiado" : "orçamentos copiados"} de ${previousMonthLabel}.`,
        );
      } else {
        toast.info(`Nada novo para copiar de ${previousMonthLabel}.`);
      }
    } catch (error) {
      console.error("Erro ao copiar orçamentos:", error);
      toast.error("Não foi possível copiar os orçamentos.");
    } finally {
      setIsCopying(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;

    try {
      await deleteCategoryBudget(deleteTarget.id);
      setDeleteTarget(null);
      toast.success("Orçamento removido.");
    } catch (error) {
      console.error("Erro ao remover orçamento:", error);
      toast.error("Não foi possível remover o orçamento.");
      throw error;
    }
  }

  const copyButton = (
    <Button
      type="button"
      variant="outline"
      disabled={isCopying}
      onClick={() => void handleCopyPrevious()}
      aria-label={`Copiar orçamentos de ${previousMonthLabel}`}
      className="h-11 gap-2 rounded-lg border-white/[0.08] bg-zinc-900/70 px-3 text-zinc-300 hover:bg-white/[0.06] hover:text-zinc-50 sm:px-4"
    >
      {isCopying ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <CopyPlus className="size-4" />
      )}
      <span className="hidden xl:inline">Copiar de {previousMonthLabel}</span>
    </Button>
  );

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
              <Target className="size-3.5" />
              Planejamento
            </p>
            <h1 className="mt-1.5 text-2xl font-semibold tracking-[-0.03em] text-zinc-50 sm:text-3xl">
              Orçamentos
            </h1>
            <p className="mt-1 text-sm text-zinc-400">
              Limites por categoria para o seu gasto pessoal. Compras de
              dependentes ficam de fora.
            </p>
          </div>
          <div className="grid w-full grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 sm:flex sm:w-auto">
            <div className="min-w-0 sm:shrink-0">
              <AnimatedMonthSelector
                currentMonth={currentMonth}
                currentYear={currentYear}
                onPreviousMonth={prevMonth}
                onNextMonth={nextMonth}
                isLoading={isFetching}
              />
            </div>
            {copyButton}
            <Button
              type="button"
              data-tour="budgets-add"
              onClick={() => setModal({ budget: null })}
              aria-label="Novo orçamento"
              className="h-11 gap-2 rounded-lg bg-emerald-400 px-4 font-semibold text-zinc-950 hover:bg-emerald-300 sm:px-5"
            >
              <PlusCircle className="size-5" />
              <span className="hidden min-[420px]:inline">Novo orçamento</span>
            </Button>
          </div>
        </motion.header>

        {data.rows.length ? (
          <>
            <BudgetOverview data={data} isFetching={isFetching} />

            <motion.section
              variants={dashboardReveal}
              aria-label="Orçamentos por categoria"
              className={cn(
                "flex flex-col gap-4 transition-opacity",
                isFetching && "opacity-70",
              )}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div
                  role="group"
                  aria-label="Filtrar por situação"
                  className="flex flex-wrap gap-1.5"
                >
                  {filters.map((filter) => (
                    <button
                      key={filter.id}
                      type="button"
                      onClick={() => setStatusFilter(filter.id)}
                      aria-pressed={statusFilter === filter.id}
                      disabled={filter.id !== "all" && filter.count === 0}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-xs transition-colors disabled:opacity-40",
                        statusFilter === filter.id
                          ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200"
                          : "border-white/[0.08] text-zinc-400 hover:text-zinc-100 disabled:hover:text-zinc-400",
                      )}
                    >
                      {filter.label}
                      <span className="ml-1.5 tabular-nums text-zinc-500">
                        {filter.count}
                      </span>
                    </button>
                  ))}
                </div>
                <div
                  role="group"
                  aria-label="Ordenar"
                  className="flex self-start rounded-lg border border-white/[0.07] bg-zinc-900/50 p-0.5 sm:self-auto"
                >
                  {sortOptions.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setSortKey(option.id)}
                      aria-pressed={sortKey === option.id}
                      className={cn(
                        "rounded-md px-2.5 py-1 text-xs transition-colors",
                        sortKey === option.id
                          ? "bg-white/[0.08] text-zinc-100"
                          : "text-zinc-500 hover:text-zinc-200",
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <BudgetCards
                rows={visibleRows}
                pace={pace}
                onEdit={(row) => setModal({ budget: row })}
                onDelete={setDeleteTarget}
              />
            </motion.section>
          </>
        ) : (
          <motion.section
            variants={dashboardReveal}
            className={cn(
              dashboardPanelClassName,
              "flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center",
            )}
          >
            <span className="flex size-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-300">
              <Target className="size-6" />
            </span>
            <h2 className="mt-5 text-lg font-semibold text-zinc-100">
              Nenhum orçamento neste mês
            </h2>
            <p className="mt-1.5 max-w-md text-sm leading-6 text-zinc-500">
              Defina um limite para as categorias que mais pesam. O consumo é
              atualizado sozinho conforme você lança gastos.
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                onClick={() => setModal({ budget: null })}
                className="h-11 gap-2 bg-emerald-400 px-6 font-semibold text-zinc-950 hover:bg-emerald-300"
              >
                <PlusCircle className="size-5" />
                Criar orçamento
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={isCopying}
                onClick={() => void handleCopyPrevious()}
                className="h-11 gap-2 border-white/[0.08] bg-transparent px-5 text-zinc-300 hover:bg-white/[0.06] hover:text-zinc-50"
              >
                {isCopying ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <CopyPlus className="size-4" />
                )}
                Copiar de {previousMonthLabel}
              </Button>
            </div>
          </motion.section>
        )}

        <UnbudgetedSpending
          items={data.unbudgeted}
          total={data.totals.unbudgetedSpent}
          onCreate={(categoryId, amount) =>
            setModal({ budget: null, categoryId, amount })
          }
        />
      </motion.div>

      <CategoryBudgetModal
        budget={modal?.budget ?? null}
        initialCategoryId={modal?.categoryId}
        initialAmount={modal?.amount}
        competenceMonth={data.competenceMonth}
        open={Boolean(modal)}
        onOpenChange={(open) => {
          if (!open) setModal(null);
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Excluir orçamento?"
        description="O limite será removido só deste mês. Os lançamentos continuam iguais."
        confirmLabel="Excluir orçamento"
        loadingLabel="Excluindo..."
        details={deleteTarget?.categoryLabel}
        onConfirm={handleDelete}
      />
    </MotionConfig>
  );
}
