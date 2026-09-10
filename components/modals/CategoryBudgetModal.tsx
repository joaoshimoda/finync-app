"use client";

import { FormEvent, useMemo, useState } from "react";
import { Gauge } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
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
  useFinanceStore,
  type CategoryBudget,
} from "@/store/useFinanceStore";

type CategoryBudgetModalProps = {
  budget: CategoryBudget | null;
  competenceMonth: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CategoryBudgetModal({
  budget,
  competenceMonth,
  open,
  onOpenChange,
}: CategoryBudgetModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open ? (
        <CategoryBudgetForm
          key={budget?.id ?? `new:${competenceMonth}`}
          budget={budget}
          competenceMonth={competenceMonth}
          onClose={() => onOpenChange(false)}
        />
      ) : null}
    </Dialog>
  );
}

function CategoryBudgetForm({
  budget,
  competenceMonth,
  onClose,
}: {
  budget: CategoryBudget | null;
  competenceMonth: string;
  onClose: () => void;
}) {
  const categories = useFinanceStore((state) => state.categories);
  const upsertCategoryBudget = useFinanceStore(
    (state) => state.upsertCategoryBudget,
  );
  const categoryBudgets = useFinanceStore((state) => state.categoryBudgets);
  const [categoryId, setCategoryId] = useState(budget?.categoryId ?? "");
  const [amount, setAmount] = useState(budget?.amount.toFixed(2) ?? "");
  const [alertThreshold, setAlertThreshold] = useState(
    String(budget?.alertThresholdPercent ?? 80),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const availableCategories = useMemo(
    () => {
      const budgetedCategoryIds = new Set(
        categoryBudgets.map((item) => item.categoryId),
      );

      return categories.filter(
        (category) =>
          category.kind === "expense" &&
          !category.id.startsWith("default-") &&
          (category.id === budget?.categoryId ||
            !budgetedCategoryIds.has(category.id)),
      );
    },
    [budget?.categoryId, categoryBudgets, categories],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    const parsedAmount = Number(amount.replace(",", "."));
    const parsedThreshold = Number(alertThreshold);

    if (!categoryId) {
      toast.error("Selecione uma categoria.");
      return;
    }

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
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
        amount: parsedAmount,
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

  return (
    <DialogContent className="border-zinc-800 bg-zinc-950 text-zinc-50 sm:max-w-md">
      <DialogHeader>
        <div className="mb-1 flex size-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
          <Gauge className="size-5" />
        </div>
        <DialogTitle>
          {budget ? "Editar orçamento" : "Novo orçamento"}
        </DialogTitle>
        <DialogDescription>
          Defina quanto pretende gastar nesta categoria durante o mês.
        </DialogDescription>
      </DialogHeader>

      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label>Categoria</Label>
          <Select
            value={categoryId}
            onValueChange={setCategoryId}
            disabled={isSubmitting || Boolean(budget)}
          >
            <SelectTrigger className="h-11 border-zinc-700 bg-zinc-900">
              <SelectValue placeholder="Selecione uma categoria" />
            </SelectTrigger>
            <SelectContent>
              {availableCategories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!availableCategories.length && !budget ? (
            <p className="text-xs text-zinc-500">
              Todas as categorias já possuem orçamento neste mês.
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="budget-amount">Limite mensal</Label>
          <Input
            id="budget-amount"
            type="number"
            inputMode="decimal"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="0,00"
            className="h-14 border-zinc-700 bg-zinc-900 text-2xl font-semibold"
            disabled={isSubmitting}
            required
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="budget-threshold">Avisar ao atingir</Label>
            <span className="text-xs text-zinc-500">1% a 100%</span>
          </div>
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
              className="h-11 border-zinc-700 bg-zinc-900 pr-10"
              disabled={isSubmitting}
              required
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500">
              %
            </span>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            className="bg-emerald-600 text-white hover:bg-emerald-700"
            disabled={
              isSubmitting || (!availableCategories.length && !budget)
            }
          >
            {isSubmitting ? "Salvando..." : "Salvar orçamento"}
          </Button>
        </div>
      </form>
    </DialogContent>
  );
}
