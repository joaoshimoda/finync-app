"use client";

import { FormEvent, useMemo, useState } from "react";
import { BellRing, Check, CircleAlert, Gauge, Tag } from "lucide-react";
import { toast } from "sonner";

import { CategoryGlyph } from "@/components/finance/categoryIcons";
import {
  AmountInput,
  Field,
  ModalBody,
  ModalFooter,
  ModalNote,
  ModalShell,
  ModalStage,
  PrimaryButton,
  SecondaryButton,
  Segmented,
  StageAmount,
  StageFacts,
  StageMeter,
  fieldClassName,
  selectTriggerClassName,
} from "@/components/modals/ModalKit";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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

  const triggerClassName = selectTriggerClassName("amber");
  const inputClassName = fieldClassName("amber");
  const isExceeded = metrics.status === "exceeded";
  const hasNoCategoryLeft = !availableCategories.length && !budget;

  return (
    <ModalShell
      tour="category-budget-modal"
      focusId="budget-amount"
      size="md"
      onSubmit={handleSubmit}
      stage={
        <ModalStage
          accent="amber"
          context={`Orçamento de ${formatCompetenceMonth(competenceMonth)}`}
          title={
            selectedCategory?.label ||
            (budget ? "Editar orçamento" : "Novo orçamento")
          }
          description="Um teto para os seus gastos pessoais nesta categoria. Gastos de dependentes ficam de fora."
          onClose={onClose}
          compact={
            <StageAmount
              label={isExceeded ? "Acima do limite" : "Disponível"}
              value={formatCurrency(isExceeded ? metrics.exceededBy : metrics.available)}
            />
          }
        >
          <div>
            <p className="text-[13px] text-white/60">
              {isExceeded ? "Acima do limite" : "Ainda disponível"}
            </p>
            <p
              className={cn(
                "mt-1 truncate text-[40px] font-semibold leading-none tabular-nums tracking-[-0.03em]",
                isExceeded ? "text-rose-200" : "text-white",
              )}
            >
              {formatCurrency(isExceeded ? metrics.exceededBy : metrics.available)}
            </p>
            <div className="mt-6">
              <StageMeter
                value={metrics.progress}
                tone={
                  isExceeded
                    ? "bg-rose-300"
                    : metrics.status === "attention"
                      ? "bg-amber-300"
                      : "bg-white"
                }
              />
              <div className="mt-2 flex items-center justify-between gap-3 text-[13px] text-white/60">
                <span className="flex items-center gap-1.5">
                  <StatusIcon className={cn("size-3.5", presentation.iconClassName)} />
                  {presentation.label}
                </span>
                <span>{Math.round(metrics.percentage)}% usado</span>
              </div>
            </div>
            <div className="mt-6">
              <StageFacts
                items={[
                  { label: "Gasto até agora", value: formatCurrency(spent) },
                  { label: "Limite", value: formatCurrency(safePreviewAmount) },
                  { label: "Aviso em", value: `${safeThreshold}%` },
                ]}
              />
            </div>
          </div>
        </ModalStage>
      }
    >
      <ModalBody>
        <fieldset disabled={isSubmitting} className="min-w-0 space-y-6">
          <AmountInput
            id="budget-amount"
            label="Limite mensal"
            accent="amber"
            currencySymbol={currencySymbol}
            type="number"
            inputMode="decimal"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="0,00"
            required
          />

          <Field label="Categoria" htmlFor="budget-category" icon={Tag}>
            <Select
              value={categoryId}
              onValueChange={setCategoryId}
              disabled={Boolean(budget)}
            >
              <SelectTrigger id="budget-category" className={triggerClassName}>
                <SelectValue placeholder="Escolha uma categoria" />
              </SelectTrigger>
              <SelectContent>
                {availableCategories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    <CategoryGlyph name={category.icon} className="size-4 text-zinc-400" />
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Avisar quando chegar a" htmlFor="budget-threshold" icon={BellRing}>
            <div className="flex gap-2">
              <Segmented
                label="Sugestões de aviso"
                className="flex-1"
                value={String(safeThreshold)}
                onChange={setAlertThreshold}
                options={[70, 80, 90].map((threshold) => ({
                  value: String(threshold),
                  label: `${threshold}%`,
                }))}
              />
              <div className="relative w-24 shrink-0">
                <Input
                  id="budget-threshold"
                  type="number"
                  inputMode="numeric"
                  min="1"
                  max="100"
                  step="1"
                  aria-label="Percentual personalizado"
                  value={alertThreshold}
                  onChange={(event) => setAlertThreshold(event.target.value)}
                  className={cn(inputClassName, "pr-8 text-center")}
                  required
                />
                <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[13px] text-zinc-500">
                  %
                </span>
              </div>
            </div>
          </Field>

          {hasNoCategoryLeft ? (
            <ModalNote icon={CircleAlert} tone="warning">
              Todas as categorias já têm orçamento neste mês.
            </ModalNote>
          ) : (
            <ModalNote icon={Gauge}>
              Você recebe um aviso ao atingir {safeThreshold}% do limite, antes
              de estourar o orçamento.
            </ModalNote>
          )}
        </fieldset>
      </ModalBody>

      <ModalFooter>
        <SecondaryButton onClick={onClose} disabled={isSubmitting}>
          Cancelar
        </SecondaryButton>
        <PrimaryButton
          type="submit"
          accent="amber"
          icon={Check}
          loading={isSubmitting}
          loadingLabel="Salvando..."
          disabled={isSubmitting || hasNoCategoryLeft}
        >
          Salvar orçamento
        </PrimaryButton>
      </ModalFooter>
    </ModalShell>
  );
}
