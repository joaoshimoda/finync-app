"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowUp, CalendarDays, ReceiptText } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getDateOnlyParts,
  getLocalTodayDateOnly,
  normalizeDateOnly,
  toDateOnly,
} from "@/lib/dateUtils";
import {
  RECURRING_INCOME_NOTE,
  VARIABLE_INCOME_NOTE,
  isVariableIncome,
} from "@/lib/incomeRecurrence";
import {
  useFinanceStore,
  type CreateTransactionInput,
  type Transaction,
} from "@/store/useFinanceStore";
import { Switch } from "@/components/ui/switch";

interface AddIncomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingTransaction?: Transaction | null;
}

type GroupEditScope = "single" | "future" | "all";

function addMonthsToDateOnly(date: string, monthsToAdd: number) {
  const { day, month, year } = getDateOnlyParts(date);
  const monthIndex = month - 1 + monthsToAdd;
  const nextYear = year + Math.floor(monthIndex / 12);
  const nextMonth = (monthIndex % 12) + 1;
  const lastDayOfNextMonth = new Date(nextYear, nextMonth, 0).getDate();

  return toDateOnly(nextYear, nextMonth, Math.min(day, lastDayOfNextMonth));
}

export function AddIncomeModal({
  isOpen,
  onClose,
  editingTransaction = null,
}: AddIncomeModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      {isOpen ? (
        <IncomeModalContent
          key={editingTransaction?.id ?? "new-income"}
          editingTransaction={editingTransaction}
          onClose={onClose}
        />
      ) : null}
    </Dialog>
  );
}

function IncomeModalContent({
  editingTransaction,
  onClose,
}: {
  editingTransaction: Transaction | null;
  onClose: () => void;
}) {
  const authUser = useFinanceStore((state) => state.authUser);
  const categories = useFinanceStore((state) => state.categories);
  const fetchCategories = useFinanceStore((state) => state.fetchCategories);
  const addTransaction = useFinanceStore((state) => state.addTransaction);
  const addTransactions = useFinanceStore((state) => state.addTransactions);
  const fetchTransactions = useFinanceStore((state) => state.fetchTransactions);
  const updateTransaction = useFinanceStore((state) => state.updateTransaction);
  const updateTransactionGroup = useFinanceStore(
    (state) => state.updateTransactionGroup,
  );

  const [amount, setAmount] = useState(
    editingTransaction ? String(editingTransaction.amount).replace(".", ",") : "",
  );
  const [date, setDate] = useState(
    editingTransaction?.date
      ? normalizeDateOnly(editingTransaction.date)
      : getLocalTodayDateOnly(),
  );
  const [description, setDescription] = useState(
    editingTransaction?.description ?? "",
  );
  const [category, setCategory] = useState(
    editingTransaction?.category || "Receita",
  );
  const [repeatMonthly, setRepeatMonthly] = useState(
    editingTransaction?.is_recurring ?? false,
  );
  const [isVariableValue, setIsVariableValue] = useState(
    editingTransaction ? isVariableIncome(editingTransaction) : false,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingRecurringUpdate, setPendingRecurringUpdate] =
    useState<CreateTransactionInput | null>(null);

  const incomeCategories = useMemo(
    () => categories.filter((item) => item.kind === "income"),
    [categories],
  );

  useEffect(() => {
    void fetchCategories();
  }, [fetchCategories]);

  async function saveGroupedUpdate(scope: GroupEditScope) {
    if (!editingTransaction || !pendingRecurringUpdate || isSubmitting) return;

    setIsSubmitting(true);

    try {
      if (
        (scope === "future" || scope === "all") &&
        editingTransaction.groupId
      ) {
        await updateTransactionGroup(
          editingTransaction.groupId,
          editingTransaction.date,
          pendingRecurringUpdate,
          scope,
        );
      } else {
        await updateTransaction(editingTransaction.id, pendingRecurringUpdate);
      }

      await fetchTransactions();
      toast.success(
        scope === "all"
          ? "Todas as receitas da recorrência foram atualizadas."
          : scope === "future"
            ? "Esta receita e as próximas foram atualizadas."
            : "Somente esta receita foi atualizada.",
      );
      onClose();
    } catch (error) {
      console.error("Erro ao atualizar receita recorrente:", error);
      toast.error("Não foi possível atualizar a receita recorrente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) return;

    if (!authUser?.id) {
      toast.error("Faça login novamente para salvar a receita.");
      return;
    }

    const incomePayload: CreateTransactionInput = {
      description: description.trim(),
      amount: Number(amount.replace(",", ".")) || 0,
      date: normalizeDateOnly(date),
      category,
      type: "income" as const,
      status: isVariableValue ? "pending" : "confirmed",
      cardId: null,
      owner: editingTransaction?.owner ?? "eu",
      dependentIds: editingTransaction?.dependentIds?.length
        ? editingTransaction.dependentIds
        : ["eu"],
      is_recurring: repeatMonthly || isVariableValue,
      notes: [
        "Receita",
        repeatMonthly || isVariableValue ? RECURRING_INCOME_NOTE : "",
        isVariableValue ? VARIABLE_INCOME_NOTE : "",
      ]
        .filter(Boolean)
        .join(" "),
    };

    setIsSubmitting(true);

    try {
      if (editingTransaction?.groupId && editingTransaction.is_recurring) {
        setPendingRecurringUpdate(incomePayload);
        setIsSubmitting(false);
        return;
      } else if (editingTransaction) {
        await updateTransaction(editingTransaction.id, incomePayload);
      } else if (repeatMonthly || isVariableValue) {
        const groupId = crypto.randomUUID();
        const recurringIncomes = Array.from(
          { length: 12 },
          (_, index): CreateTransactionInput => ({
            ...incomePayload,
            groupId,
            date: addMonthsToDateOnly(incomePayload.date, index),
            status: isVariableValue ? "pending" : "confirmed",
            is_recurring: true,
          }),
        );

        await addTransactions(recurringIncomes);
      } else {
        await addTransaction(incomePayload);
      }

      await fetchTransactions();

      toast.success(
        editingTransaction
          ? "Receita atualizada com sucesso!"
          : "Receita adicionada com sucesso!",
      );
      onClose();
    } catch (error) {
      console.error("Erro ao salvar receita:", error);
      toast.error("Erro ao salvar receita.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <DialogContent
      data-tour="income-modal"
      data-tour-preview-modal
      className="border border-zinc-800 bg-zinc-950 text-white shadow-2xl sm:max-w-3xl"
    >
      <DialogHeader>
        <div className="flex items-center gap-2 text-sm font-medium text-emerald-300">
          <ArrowUp className="size-4" />
          Entrada
        </div>
        <DialogTitle>
          {editingTransaction ? "Editar receita" : "Nova receita"}
        </DialogTitle>
        <DialogDescription>
          Registre entradas sem vincular a uma fatura de cartão.
        </DialogDescription>
      </DialogHeader>

      <form className="space-y-6" onSubmit={handleSubmit}>
        <section className="space-y-2 text-center">
          <div className="relative mx-auto max-w-sm rounded-lg border border-zinc-800/80 bg-zinc-900/30">
            <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-xl font-semibold text-zinc-400">
              R$
            </span>
            <Input
              id="income-amount"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              className="h-16 border-none bg-transparent px-12 text-center text-4xl font-semibold tracking-tight text-white shadow-none ring-0 placeholder:text-zinc-500 focus-visible:ring-0 focus-visible:ring-offset-0"
              required
            />
          </div>

          <Input
            id="income-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            type="text"
            placeholder="Descrição da receita"
            className="mx-auto h-10 max-w-md rounded-lg border border-zinc-800/80 bg-zinc-900/30 text-center text-lg text-zinc-100 shadow-none ring-0 placeholder:text-zinc-400 focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            required
          />
        </section>

        <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label
              htmlFor="income-repeat-monthly"
              className="flex items-center justify-between gap-4 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3"
            >
              <div>
                <p className="text-sm font-medium text-zinc-100">
                  Repetir mensalmente
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  Projeta esta receita para os próximos meses.
                </p>
              </div>
              <Switch
                id="income-repeat-monthly"
                checked={repeatMonthly}
                onCheckedChange={(checked) => setRepeatMonthly(checked)}
              />
            </label>

            <label
              htmlFor="income-variable-value"
              className="flex items-center justify-between gap-4 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3"
            >
              <div>
                <p className="text-sm font-medium text-zinc-100">
                  Valor Variável
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  Cria confirmações rápidas no Dashboard.
                </p>
              </div>
              <Switch
                id="income-variable-value"
                checked={isVariableValue}
                onCheckedChange={(checked) => {
                  setIsVariableValue(checked);
                  if (checked) setRepeatMonthly(true);
                }}
              />
            </label>
          </div>
        </section>

        <section className="mt-6 grid grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-zinc-400">
                <CalendarDays className="size-3.5" />
                Data da Entrada
              </div>
              <Input
                id="income-date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                type="date"
                className="flex h-10 items-center border border-zinc-700 bg-zinc-900 text-sm text-zinc-200 shadow-none transition-colors [color-scheme:dark] hover:border-zinc-600 focus:border-emerald-500 focus-visible:ring-1 focus-visible:ring-emerald-500 focus-visible:ring-offset-0"
                required
              />
            </div>

          </div>

          <div className="space-y-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-zinc-400">
                <ReceiptText className="size-3.5" />
                Categoria da Receita
              </div>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="flex h-10 items-center border border-zinc-700 bg-zinc-900 text-sm text-zinc-200 shadow-none transition-colors hover:border-zinc-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:ring-offset-0">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {incomeCategories.map((incomeCategory) => (
                    <SelectItem
                      key={incomeCategory.id}
                      value={incomeCategory.label}
                    >
                      {incomeCategory.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>


          </div>
        </section>

        {pendingRecurringUpdate ? (
          <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
            <p className="text-sm font-semibold text-zinc-100">
              Como deseja aplicar esta edição?
            </p>
            <p className="mt-1 text-xs leading-5 text-zinc-500">
              Escolha se a alteração vale somente para esta receita, para as
              próximas ou para todo o histórico da recorrência.
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <Button
                type="button"
                variant="secondary"
                disabled={isSubmitting}
                onClick={() => void saveGroupedUpdate("single")}
                className="h-11 cursor-pointer"
              >
                Somente esta
              </Button>
              <Button
                type="button"
                disabled={isSubmitting}
                onClick={() => void saveGroupedUpdate("future")}
                className="h-11 cursor-pointer bg-emerald-600 font-semibold text-white hover:bg-emerald-700"
              >
                Esta e as próximas
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={() => void saveGroupedUpdate("all")}
                className="h-11 cursor-pointer"
              >
                Todas
              </Button>
            </div>
            <Button
              type="button"
              variant="ghost"
              disabled={isSubmitting}
              onClick={() => setPendingRecurringUpdate(null)}
              className="mt-3 h-10 w-full cursor-pointer text-zinc-400"
            >
              Alterar dados
            </Button>
          </section>
        ) : null}

        <div className="mt-8 flex justify-end gap-3">
          <Button
            type="button"
            variant="ghost"
            disabled={isSubmitting || Boolean(pendingRecurringUpdate)}
            onClick={onClose}
            className="h-11 px-5 text-zinc-400 hover:text-zinc-50"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="h-11 min-w-52 bg-emerald-600 font-semibold text-white hover:bg-emerald-700"
          >
            {isSubmitting
              ? "Salvando..."
              : editingTransaction?.groupId && editingTransaction.is_recurring
                ? "Escolher escopo"
                : "Salvar receita"}
          </Button>
        </div>
      </form>
    </DialogContent>
  );
}
