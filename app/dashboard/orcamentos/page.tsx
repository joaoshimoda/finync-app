"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CircleAlert,
  CircleCheck,
  Gauge,
  Pencil,
  PlusCircle,
  Tag,
  Trash2,
  WalletCards,
} from "lucide-react";
import { toast } from "sonner";

import { AnimatedMonthSelector } from "@/components/finance/AnimatedMonthSelector";
import { CategoryBudgetModal } from "@/components/modals/CategoryBudgetModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Progress } from "@/components/ui/progress";
import {
  getCategoryBudgetMetrics,
  getCategoryBudgetSpent,
} from "@/lib/categoryBudgets";
import { toDateOnly } from "@/lib/dateUtils";
import { cn } from "@/lib/utils";
import {
  useFinanceStore,
  type CategoryBudget,
} from "@/store/useFinanceStore";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const hiddenCurrencyLabel = "R$ ••••";

const statusPresentation = {
  on_track: {
    label: "Dentro do limite",
    badge: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300",
    progress: "[&_[data-slot=progress-indicator]]:bg-emerald-400",
  },
  attention: {
    label: "Atenção",
    badge: "border-amber-500/25 bg-amber-500/10 text-amber-300",
    progress: "[&_[data-slot=progress-indicator]]:bg-amber-400",
  },
  exceeded: {
    label: "Limite excedido",
    badge: "border-rose-500/25 bg-rose-500/10 text-rose-300",
    progress: "[&_[data-slot=progress-indicator]]:bg-rose-400",
  },
} as const;

export default function OrcamentosPage() {
  const categories = useFinanceStore((state) => state.categories);
  const categoryBudgets = useFinanceStore((state) => state.categoryBudgets);
  const transactions = useFinanceStore((state) => state.transactions);
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
  const hideBalancesByDefault = useFinanceStore(
    (state) => state.hideBalancesByDefault,
  );
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<CategoryBudget | null>(
    null,
  );

  const displayMonth = isFetching ? fetchedMonth : currentMonth;
  const displayYear = isFetching ? fetchedYear : currentYear;
  const competenceMonth = toDateOnly(displayYear, displayMonth, 1);
  const formatCurrency = (value: number) =>
    hideBalancesByDefault ? hiddenCurrencyLabel : currencyFormatter.format(value);

  useEffect(() => {
    void fetchTransactions();
  }, [currentMonth, currentYear, fetchTransactions]);

  const budgetRows = useMemo(
    () =>
      categoryBudgets
        .filter((budget) => budget.competenceMonth === competenceMonth)
        .map((budget) => {
          const category = categories.find(
            (item) => item.id === budget.categoryId,
          );
          const spent = getCategoryBudgetSpent(
            transactions,
            category?.label ?? "Outros",
            displayMonth,
            displayYear,
          );

          return {
            ...budget,
            categoryLabel: category?.label ?? "Categoria removida",
            spent,
            ...getCategoryBudgetMetrics(
              budget.amount,
              spent,
              budget.alertThresholdPercent,
            ),
          };
        })
        .sort((left, right) => right.percentage - left.percentage),
    [
      categories,
      categoryBudgets,
      competenceMonth,
      displayMonth,
      displayYear,
      transactions,
    ],
  );

  const totals = useMemo(
    () =>
      budgetRows.reduce(
        (summary, budget) => ({
          amount: summary.amount + budget.amount,
          spent: summary.spent + budget.spent,
          exceeded: summary.exceeded + (budget.status === "exceeded" ? 1 : 0),
          attention:
            summary.attention + (budget.status === "attention" ? 1 : 0),
        }),
        { amount: 0, spent: 0, exceeded: 0, attention: 0 },
      ),
    [budgetRows],
  );
  const totalMetrics = getCategoryBudgetMetrics(totals.amount, totals.spent);

  function openNewBudget() {
    setEditingBudget(null);
    setIsBudgetModalOpen(true);
  }

  function openEditBudget(budget: CategoryBudget) {
    setEditingBudget(budget);
    setIsBudgetModalOpen(true);
  }

  async function handleDeleteBudget(budgetId: string) {
    try {
      await deleteCategoryBudget(budgetId);
      toast.success("Orçamento removido.");
    } catch (error) {
      console.error("Erro ao remover orçamento:", error);
      toast.error("Não foi possível remover o orçamento.");
      throw error;
    }
  }

  return (
    <div className="flex w-full flex-col gap-6 md:gap-8">
      <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div className="max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-400">
            Planejamento mensal
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-50">
            Orçamentos
          </h1>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            Defina limites por categoria e acompanhe seu consumo pessoal antes
            do fim do mês.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <AnimatedMonthSelector
            currentMonth={currentMonth}
            currentYear={currentYear}
            onPreviousMonth={prevMonth}
            onNextMonth={nextMonth}
            isLoading={isFetching}
          />
          <Button
            type="button"
            data-tour="budgets-add"
            onClick={openNewBudget}
            className="h-11 bg-emerald-600 px-5 font-semibold text-white hover:bg-emerald-700"
          >
            <PlusCircle className="size-5" />
            Novo orçamento
          </Button>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          {
            label: "Planejado",
            value: formatCurrency(totals.amount),
            icon: WalletCards,
            tone: "text-zinc-50",
          },
          {
            label: "Consumido",
            value: formatCurrency(totals.spent),
            icon: Gauge,
            tone: "text-zinc-50",
          },
          {
            label: "Disponível",
            value: formatCurrency(totalMetrics.available),
            icon: CircleCheck,
            tone: "text-emerald-300",
          },
          {
            label: "Precisam de atenção",
            value: String(totals.attention + totals.exceeded),
            icon: CircleAlert,
            tone:
              totals.exceeded > 0 ? "text-rose-300" : "text-amber-300",
          },
        ].map((item) => {
          const Icon = item.icon;

          return (
            <Card
              key={item.label}
              className="rounded-xl border-zinc-800/80 bg-zinc-950/70 shadow-none"
            >
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500 sm:text-xs">
                    {item.label}
                  </p>
                  <Icon className="size-4 text-zinc-500" />
                </div>
                <p className={cn("mt-3 text-lg font-semibold", item.tone)}>
                  {item.value}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <Card className="rounded-xl border-zinc-800/80 bg-zinc-950 shadow-none">
        <CardHeader className="border-b border-zinc-800/80 px-4 py-5 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base">Limites por categoria</CardTitle>
              <CardDescription className="mt-1">
                Dependentes não consomem estes orçamentos.
              </CardDescription>
            </div>
            {budgetRows.length ? (
              <span className="text-sm tabular-nums text-zinc-400">
                {Math.round(totalMetrics.percentage)}%
              </span>
            ) : null}
          </div>
          {budgetRows.length ? (
            <Progress
              value={totalMetrics.progress}
              className={cn(
                "mt-3 h-1.5 bg-zinc-800",
                statusPresentation[totalMetrics.status].progress,
              )}
            />
          ) : null}
        </CardHeader>

        <CardContent className="p-0">
          {budgetRows.length ? (
            <div className="divide-y divide-zinc-800/80">
              {budgetRows.map((budget) => {
                const presentation = statusPresentation[budget.status];

                return (
                  <article
                    key={budget.id}
                    className="grid gap-4 px-4 py-5 transition-colors hover:bg-zinc-900/40 sm:px-6 lg:grid-cols-[minmax(180px,1fr)_minmax(260px,2fr)_auto] lg:items-center"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-zinc-400">
                        <Tag className="size-4" />
                      </span>
                      <div className="min-w-0">
                        <h2 className="truncate text-sm font-semibold text-zinc-100">
                          {budget.categoryLabel}
                        </h2>
                        <Badge
                          variant="outline"
                          className={cn("mt-1 border", presentation.badge)}
                        >
                          {presentation.label}
                        </Badge>
                      </div>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-end justify-between gap-4 text-xs">
                        <span className="text-zinc-500">
                          {formatCurrency(budget.spent)} consumidos
                        </span>
                        <span className="shrink-0 text-zinc-300">
                          de {formatCurrency(budget.amount)}
                        </span>
                      </div>
                      <Progress
                        value={budget.progress}
                        className={cn(
                          "mt-2 h-2 bg-zinc-800",
                          presentation.progress,
                        )}
                      />
                      <div className="mt-2 flex justify-between gap-3 text-[11px]">
                        <span className="text-zinc-500">
                          Alerta em {budget.alertThresholdPercent}%
                        </span>
                        <span
                          className={cn(
                            budget.status === "exceeded"
                              ? "text-rose-300"
                              : "text-zinc-400",
                          )}
                        >
                          {budget.status === "exceeded"
                            ? `${formatCurrency(budget.exceededBy)} acima`
                            : `${formatCurrency(budget.available)} disponíveis`}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-11 text-zinc-400 hover:text-zinc-100"
                        onClick={() => openEditBudget(budget)}
                        aria-label={`Editar orçamento de ${budget.categoryLabel}`}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <ConfirmDialog
                        title="Excluir orçamento?"
                        description={`O limite de ${budget.categoryLabel} será removido apenas desta competência.`}
                        confirmLabel="Excluir orçamento"
                        onConfirm={() => handleDeleteBudget(budget.id)}
                      >
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-11 text-zinc-500 hover:bg-rose-500/10 hover:text-rose-300"
                          aria-label={`Excluir orçamento de ${budget.categoryLabel}`}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </ConfirmDialog>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center px-6 py-14 text-center">
              <span className="flex size-12 items-center justify-center rounded-xl bg-zinc-900 text-zinc-500">
                <Gauge className="size-5" />
              </span>
              <h2 className="mt-4 text-base font-semibold text-zinc-100">
                Nenhum orçamento definido
              </h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-zinc-500">
                Comece pelas categorias que mais pesam no mês. O consumo será
                atualizado automaticamente conforme seus lançamentos.
              </p>
              <Button
                type="button"
                onClick={openNewBudget}
                className="mt-5 h-11 bg-emerald-600 px-5 text-white hover:bg-emerald-700"
              >
                <PlusCircle className="size-5" />
                Criar primeiro orçamento
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <CategoryBudgetModal
        budget={editingBudget}
        competenceMonth={competenceMonth}
        open={isBudgetModalOpen}
        onOpenChange={(open) => {
          setIsBudgetModalOpen(open);
          if (!open) setEditingBudget(null);
        }}
      />
    </div>
  );
}
