"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  BellRing,
  Check,
  CircleAlert,
  Gauge,
  Tag,
  Target,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getCategoryBudgetMetrics,
  getCategoryBudgetSpent,
} from "@/lib/categoryBudgets";
import { cn } from "@/lib/utils";
import {
  useFinanceStore,
  type CategoryBudget,
} from "@/store/useFinanceStore";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";

const competenceFormatter = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  year: "numeric",
});

const statusPresentation = {
  on_track: {
    label: "Dentro do planejado",
    icon: Check,
    iconClassName: "text-emerald-200",
  },
  attention: {
    label: "Perto do limite",
    icon: CircleAlert,
    iconClassName: "text-amber-200",
  },
  exceeded: {
    label: "Limite excedido",
    icon: CircleAlert,
    iconClassName: "text-rose-200",
  },
} as const;

type CategoryBudgetModalProps = {
  budget: CategoryBudget | null;
  competenceMonth: string;
  /* Prefill for a new budget, e.g. from "spending without a budget". */
  initialCategoryId?: string;
  initialAmount?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function formatCompetenceMonth(value: string) {
  return competenceFormatter.format(new Date(`${value}T12:00:00`));
}

function parseCompetenceMonth(value: string) {
  const [year, month] = value.split("-").map(Number);
  return { month, year };
}

export function CategoryBudgetModal({
  budget,
  competenceMonth,
  initialCategoryId,
  initialAmount,
  open,
  onOpenChange,
}: CategoryBudgetModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open ? (
        <CategoryBudgetForm
          key={budget?.id ?? `new:${competenceMonth}:${initialCategoryId ?? ""}`}
          budget={budget}
          competenceMonth={competenceMonth}
          initialCategoryId={initialCategoryId}
          initialAmount={initialAmount}
          onClose={() => onOpenChange(false)}
        />
      ) : null}
    </Dialog>
  );
}

function CategoryBudgetForm({
  budget,
  competenceMonth,
  initialCategoryId,
  initialAmount,
  onClose,
}: {
  budget: CategoryBudget | null;
  competenceMonth: string;
  initialCategoryId?: string;
  initialAmount?: number;
  onClose: () => void;
}) {
  const { formatCurrency, currencySymbol } = useCurrencyFormatter();
  const categories = useFinanceStore((state) => state.categories);
  const transactions = useFinanceStore((state) => state.transactions);
  const categoryBudgets = useFinanceStore((state) => state.categoryBudgets);
  const upsertCategoryBudget = useFinanceStore(
    (state) => state.upsertCategoryBudget,
  );
  const [categoryId, setCategoryId] = useState(
    budget?.categoryId ?? initialCategoryId ?? "",
  );
  const [amount, setAmount] = useState(
    (budget?.amount ?? initialAmount)?.toFixed(2) ?? "",
  );
  const [alertThreshold, setAlertThreshold] = useState(
    String(budget?.alertThresholdPercent ?? 80),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const availableCategories = useMemo(() => {
    const budgetedCategoryIds = new Set(
      categoryBudgets
        .filter((item) => item.competenceMonth === competenceMonth)
        .map((item) => item.categoryId),
    );

    return categories.filter(
      (category) =>
        category.kind === "expense" &&
        !category.id.startsWith("default-") &&
        (category.id === budget?.categoryId ||
          !budgetedCategoryIds.has(category.id)),
    );
  }, [budget?.categoryId, categoryBudgets, categories, competenceMonth]);

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === categoryId),
    [categories, categoryId],
  );
  const previewAmount = Number(amount.replace(",", "."));
  const safePreviewAmount =
    Number.isFinite(previewAmount) && previewAmount > 0 ? previewAmount : 0;
  const parsedThreshold = Number(alertThreshold);
  const safeThreshold =
    Number.isInteger(parsedThreshold) &&
    parsedThreshold >= 1 &&
    parsedThreshold <= 100
      ? parsedThreshold
      : 80;
  const competence = parseCompetenceMonth(competenceMonth);
  const spent = selectedCategory
    ? getCategoryBudgetSpent(
        transactions,
        selectedCategory.label,
        competence.month,
        competence.year,
      )
    : 0;
  const metrics = getCategoryBudgetMetrics(
    safePreviewAmount,
    spent,
    safeThreshold,
  );
  const presentation = statusPresentation[metrics.status];
  const StatusIcon = presentation.icon;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    if (!categoryId) {
      toast.error("Selecione uma categoria.");
      return;
    }

    if (!Number.isFinite(previewAmount) || previewAmount <= 0) {
      toast.error("Informe um limite mensal válido.");
      return;
    }

    if (
      !Number.isInteger(parsedThreshold) ||
      parsedThreshold < 1 ||
      parsedThreshold > 100
    ) {
      toast.error("O alerta deve estar entre 1% e 100%.");
      return;
    }

    setIsSubmitting(true);

    try {
      await upsertCategoryBudget({
        categoryId,
        competenceMonth,
        amount: previewAmount,
        alertThresholdPercent: parsedThreshold,
      });
      toast.success(budget ? "Orçamento atualizado!" : "Orçamento criado!");
      onClose();
    } catch (error) {
      console.error("Erro ao salvar orçamento:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar o orçamento.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const pillFieldClassName =
    "h-11 rounded-full border-zinc-700 bg-transparent px-4 text-zinc-100 shadow-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 dark:bg-transparent";

  return (
    <DialogContent
      data-tour="category-budget-modal"
      showCloseButton={false}
      onOpenAutoFocus={(event) => {
        event.preventDefault();
        window.requestAnimationFrame(() => {
          document.getElementById("budget-amount")?.focus();
        });
      }}
      className="inset-x-0 bottom-0 left-0 top-auto flex max-h-[96dvh] w-full max-w-none translate-x-0 translate-y-0 overflow-hidden rounded-b-none rounded-t-xl border border-b-0 border-zinc-800 bg-zinc-950 p-0 text-zinc-50 shadow-2xl md:left-1/2 md:top-1/2 md:h-[560px] md:max-h-[90dvh] md:max-w-[920px] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-xl md:border-b"
    >
      <form
        className="grid min-h-0 w-full md:grid-cols-[44%_56%]"
        onSubmit={handleSubmit}
      >
        <aside className="relative flex min-h-[230px] flex-col overflow-hidden bg-amber-800 p-5 text-white md:min-h-0 md:p-8 [@media_(max-height:_700px)_and_(max-width:_767px)]:min-h-[202px] [@media_(max-height:_700px)_and_(max-width:_767px)]:p-4">
          <div className="pointer-events-none absolute inset-y-0 right-0 w-28 border-l border-white/10 bg-black/10 [transform:skewX(-10deg)_translateX(45%)]" />
          <div className="pointer-events-none absolute bottom-0 left-0 h-px w-full bg-white/10" />

          <button
            type="button"
            aria-label="Fechar"
            onClick={onClose}
            className="absolute right-5 top-5 z-20 flex size-10 items-center justify-center rounded-full text-white/75 transition-colors hover:bg-black/10 hover:text-white md:right-7 md:top-7"
          >
            <X className="size-5" />
          </button>

          <div className="relative z-10">
            <p className="text-[10px] font-bold uppercase text-white/65">
              Planejamento mensal
            </p>
            <DialogTitle className="mt-2 max-w-[280px] truncate text-2xl font-semibold leading-tight text-white md:mt-4 md:text-4xl [@media_(max-height:_700px)_and_(max-width:_767px)]:text-xl">
              {selectedCategory?.label ||
                (budget ? "Editar orçamento." : "Novo orçamento.")}
            </DialogTitle>
            <DialogDescription className="mt-2 max-w-[275px] text-xs leading-5 text-white/75 [@media_(max-height:_700px)_and_(max-width:_767px)]:hidden">
              Limite pessoal para {formatCompetenceMonth(competenceMonth)}.
              Gastos de dependentes ficam de fora.
            </DialogDescription>
          </div>

          <section className="relative z-10 my-auto md:py-5">
            <div className="flex items-end justify-between gap-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white/15">
                <Target className="size-5" />
              </span>
              <div className="min-w-0 text-right">
                <p className="text-[9px] font-semibold uppercase text-white/60">
                  {metrics.status === "exceeded"
                    ? "Acima do limite"
                    : "Disponível"}
                </p>
                <strong className="mt-1 block truncate text-2xl font-semibold text-white md:text-3xl">
                  {formatCurrency(
                    metrics.status === "exceeded"
                      ? metrics.exceededBy
                      : metrics.available,
                  )}
                </strong>
              </div>
            </div>

            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-black/20">
              <div
                className={cn(
                  "h-full rounded-full transition-[width] duration-300",
                  metrics.status === "exceeded"
                    ? "bg-rose-200"
                    : "bg-white/85",
                )}
                style={{ width: `${metrics.progress}%` }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between gap-3 text-[10px] font-medium text-white/70">
              <span className="flex items-center gap-1.5">
                <StatusIcon
                  className={cn("size-3", presentation.iconClassName)}
                />
                {presentation.label}
              </span>
              <span>{Math.round(metrics.percentage)}% consumido</span>
            </div>

            <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-white/15 pt-3">
              <div>
                <dt className="text-[9px] font-semibold uppercase text-white/55">
                  Consumido
                </dt>
                <dd className="mt-1 truncate text-xs font-semibold text-white">
                  {formatCurrency(spent)}
                </dd>
              </div>
              <div>
                <dt className="text-[9px] font-semibold uppercase text-white/55">
                  Planejado
                </dt>
                <dd className="mt-1 truncate text-xs font-semibold text-white">
                  {formatCurrency(safePreviewAmount)}
                </dd>
              </div>
              <div>
                <dt className="text-[9px] font-semibold uppercase text-white/55">
                  Alerta
                </dt>
                <dd className="mt-1 text-xs font-semibold text-white">
                  {safeThreshold}%
                </dd>
              </div>
            </dl>
          </section>
        </aside>

        <section className="flex min-h-0 flex-col bg-zinc-950">
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 [scrollbar-width:thin] md:px-7 md:py-6">
            <fieldset disabled={isSubmitting} className="space-y-5">
              <div className="space-y-2">
                <Label
                  htmlFor="budget-amount"
                  className="text-[10px] font-bold uppercase text-zinc-500"
                >
                  Limite mensal
                </Label>
                <div className="flex items-center border-b border-zinc-700">
                  <span className="shrink-0 text-xs font-semibold text-amber-400">
                    {currencySymbol}
                  </span>
                  <Input
                    id="budget-amount"
                    type="number"
                    inputMode="decimal"
                    min="0.01"
                    step="0.01"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    placeholder="0,00"
                    className="h-11 appearance-none rounded-none border-0 bg-transparent px-2 text-xl font-semibold shadow-none focus-visible:ring-0 dark:bg-transparent [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 border-t border-zinc-800 pt-5">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-[10px] font-bold uppercase text-zinc-500">
                    <Tag className="size-3.5" />
                    Categoria
                  </Label>
                  <Select
                    value={categoryId}
                    onValueChange={setCategoryId}
                    disabled={Boolean(budget)}
                  >
                    <SelectTrigger className={pillFieldClassName}>
                      <SelectValue placeholder="Selecionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCategories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="budget-threshold"
                    className="flex items-center gap-2 text-[10px] font-bold uppercase text-zinc-500"
                  >
                    <BellRing className="size-3.5" />
                    Avisar ao atingir
                  </Label>
                  <div className="relative">
                    <Input
                      id="budget-threshold"
                      type="number"
                      inputMode="numeric"
                      min="1"
                      max="100"
                      step="1"
                      value={alertThreshold}
                      onChange={(event) => setAlertThreshold(event.target.value)}
                      className={`${pillFieldClassName} appearance-none pr-10 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
                      required
                    />
                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-zinc-500">
                      %
                    </span>
                  </div>
                </div>
              </div>

              <div className="border-t border-zinc-800 pt-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="flex items-center gap-2 text-xs font-semibold text-zinc-300">
                    <Gauge className="size-3.5 text-zinc-500" />
                    Sensibilidade do alerta
                  </p>
                  <span className="text-[10px] text-zinc-600">1% a 100%</span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {[70, 80, 90].map((threshold) => (
                    <button
                      key={threshold}
                      type="button"
                      onClick={() => setAlertThreshold(String(threshold))}
                      className={cn(
                        "h-9 rounded-full border text-xs font-medium transition-colors",
                        safeThreshold === threshold
                          ? "border-amber-500/60 bg-amber-500/10 text-amber-300"
                          : "border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200",
                      )}
                    >
                      {threshold}%
                    </button>
                  ))}
                </div>
                {!availableCategories.length && !budget ? (
                  <p className="mt-3 text-xs text-amber-300">
                    Todas as categorias já possuem orçamento nesta competência.
                  </p>
                ) : (
                  <p className="mt-3 text-xs leading-5 text-zinc-500">
                    Você será avisado antes que o limite mensal seja atingido.
                  </p>
                )}
              </div>
            </fieldset>
          </div>

          <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-zinc-900 px-5 py-3 md:border-0 md:px-7 md:pb-6 md:pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={isSubmitting}
              className="h-10 flex-1 text-zinc-400 hover:text-white md:flex-none"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="h-10 flex-[1.35] rounded-full bg-amber-600 px-6 font-semibold text-white hover:bg-amber-700 md:flex-none"
              disabled={
                isSubmitting || (!availableCategories.length && !budget)
              }
            >
              <Check className="size-4" />
              {isSubmitting ? "Salvando..." : "Salvar orçamento"}
            </Button>
          </footer>
        </section>
      </form>
    </DialogContent>
  );
}
