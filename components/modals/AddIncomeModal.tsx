"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  CalendarDays,
  Check,
  ReceiptText,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { TransactionLivePreview } from "@/components/modals/TransactionLivePreview";
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
import { Switch } from "@/components/ui/switch";
import { getLocalTodayDateOnly, normalizeDateOnly } from "@/lib/dateUtils";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import {
  RECURRING_INCOME_NOTE,
  VARIABLE_INCOME_NOTE,
  isVariableIncome,
} from "@/lib/incomeRecurrence";
import { addMonthsToDateOnly } from "@/lib/transactionProjection";
import { cn } from "@/lib/utils";
import {
  useFinanceStore,
  type CreateTransactionInput,
  type Transaction,
} from "@/store/useFinanceStore";

interface AddIncomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectExpense?: () => void;
  editingTransaction?: Transaction | null;
}

type GroupEditScope = "single" | "future" | "all";

export function AddIncomeModal({
  isOpen,
  onClose,
  onSelectExpense,
  editingTransaction = null,
}: AddIncomeModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      {isOpen ? (
        <IncomeModalContent
          key={editingTransaction?.id ?? "new-income"}
          editingTransaction={editingTransaction}
          onClose={onClose}
          onSelectExpense={onSelectExpense}
        />
      ) : null}
    </Dialog>
  );
}

function IncomeModalContent({
  editingTransaction,
  onClose,
  onSelectExpense,
}: {
  editingTransaction: Transaction | null;
  onClose: () => void;
  onSelectExpense?: () => void;
}) {
  const { currencySymbol } = useCurrencyFormatter();
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
    editingTransaction
      ? String(editingTransaction.amount).replace(".", ",")
      : "",
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
  const [mobileStep, setMobileStep] = useState<1 | 2>(1);
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

    if (
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 767px)").matches &&
      mobileStep === 1
    ) {
      setMobileStep(2);
      return;
    }

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
      }

      if (editingTransaction) {
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

  const lineInputClassName =
    "h-9 rounded-none border-0 border-b border-zinc-700 bg-transparent px-0 text-zinc-100 shadow-none placeholder:text-zinc-600 focus-visible:border-emerald-500 focus-visible:ring-0 dark:bg-transparent";
  const pillFieldClassName =
    "h-10 rounded-full border-zinc-700 bg-transparent px-3 text-zinc-100 shadow-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 dark:bg-transparent [@media_(max-height:_700px)_and_(max-width:_767px)]:h-9";

  return (
    <DialogContent
      data-tour="income-modal"
      showCloseButton={false}
      onOpenAutoFocus={(event) => {
        event.preventDefault();
        window.requestAnimationFrame(() => {
          document.getElementById("income-amount")?.focus();
        });
      }}
      className="inset-x-0 bottom-0 left-0 top-auto flex max-h-[94dvh] w-full max-w-none translate-x-0 translate-y-0 overflow-hidden rounded-b-none rounded-t-xl border border-b-0 border-zinc-800 bg-zinc-950 p-0 text-zinc-50 shadow-2xl md:left-1/2 md:top-1/2 md:h-[560px] md:max-h-[90dvh] md:max-w-[920px] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-xl md:border-b"
    >
      <form
        className="grid min-h-0 w-full md:grid-cols-[44%_56%]"
        onSubmit={handleSubmit}
      >
        <aside className="relative flex min-h-44 flex-col overflow-hidden bg-emerald-600 p-5 text-white md:min-h-0 md:p-8 [@media_(max-height:_700px)_and_(max-width:_767px)]:min-h-32 [@media_(max-height:_700px)_and_(max-width:_767px)]:p-4">
          <div className="pointer-events-none absolute inset-y-0 right-0 w-24 border-l border-white/10 bg-black/5 [transform:skewX(-10deg)_translateX(45%)]" />
          <div className="pointer-events-none absolute bottom-0 left-0 h-px w-full bg-white/10" />

          <button
            type="button"
            aria-label="Fechar"
            onClick={onClose}
            className="absolute right-5 top-5 z-10 flex size-10 items-center justify-center rounded-full text-white/75 transition-colors hover:bg-black/10 hover:text-white md:right-7 md:top-7"
          >
            <X className="size-5" />
          </button>

          <div className="relative z-10">
            <p className="text-[10px] font-bold uppercase text-white/65">
              Lançamento
            </p>
            <div className="mt-5 hidden size-10 items-center justify-center rounded-lg bg-white/15 md:flex">
              <ArrowUpRight className="size-5" />
            </div>
            <DialogTitle className="mt-3 max-w-xs text-2xl font-semibold leading-tight text-white md:mt-5 md:text-4xl [@media_(max-height:_700px)_and_(max-width:_767px)]:mt-1 [@media_(max-height:_700px)_and_(max-width:_767px)]:text-xl">
              {editingTransaction ? "Editar receita." : "Nova receita."}
            </DialogTitle>
            <DialogDescription className="mt-2 max-w-[250px] text-xs leading-5 text-white/80 md:mt-3 [@media_(max-height:_700px)_and_(max-width:_767px)]:hidden">
              Registre uma entrada e acompanhe a evolução do seu dinheiro.
            </DialogDescription>
          </div>

          <TransactionLivePreview
            type="income"
            amount={amount}
            description={description}
            category={category}
            origin={
              repeatMonthly
                ? isVariableValue
                  ? "Receita variável"
                  : "Receita recorrente"
                : "Receita avulsa"
            }
            owner="Entrada pessoal"
            date={date}
            recurring={repeatMonthly}
          />

          <div className="relative z-10 mt-auto flex items-end justify-between gap-3 pt-4 md:block [@media_(max-height:_700px)_and_(max-width:_767px)]:pt-2">
            <p className="mb-2 text-[10px] font-bold uppercase text-white/60">
              Tipo de lançamento
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={!onSelectExpense || Boolean(editingTransaction)}
                onClick={onSelectExpense}
                className="h-8 rounded-full bg-white/10 px-4 text-xs font-semibold text-white transition-colors hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Despesa
              </button>
              <button
                type="button"
                className="h-8 rounded-full bg-white px-4 text-xs font-semibold text-emerald-700"
              >
                Receita
              </button>
            </div>
          </div>
        </aside>

        <section className="flex min-h-0 flex-col bg-zinc-950">
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 [scrollbar-width:thin] md:px-7 md:py-6 [@media_(max-height:_700px)_and_(max-width:_767px)]:py-3">
            {pendingRecurringUpdate ? (
              <div className="flex h-full items-center">
                <section className="w-full border-y border-zinc-800 py-5">
                  <p className="text-base font-semibold text-zinc-50">
                    Onde aplicar as mudanças?
                  </p>
                  <p className="mt-1 text-sm text-zinc-400">
                    Escolha quais receitas deste grupo devem ser atualizadas.
                  </p>
                  <div className="mt-5 grid gap-2 sm:grid-cols-3">
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={isSubmitting}
                      onClick={() => void saveGroupedUpdate("single")}
                    >
                      Somente esta
                    </Button>
                    <Button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => void saveGroupedUpdate("future")}
                      className="bg-emerald-600 text-white hover:bg-emerald-700"
                    >
                      Esta e as próximas
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isSubmitting}
                      onClick={() => void saveGroupedUpdate("all")}
                      className="border-zinc-700"
                    >
                      Todas
                    </Button>
                  </div>
                </section>
              </div>
            ) : (
              <fieldset disabled={isSubmitting} className="h-full">
                <div
                  className={cn(
                    "space-y-4 md:block",
                    mobileStep !== 1 && "hidden",
                  )}
                >
                  <div className="flex items-center justify-between md:hidden">
                    <p className="text-[10px] font-bold uppercase text-zinc-500">
                      Dados principais
                    </p>
                    <span className="text-xs text-zinc-600">1 / 2</span>
                  </div>
                  <div className="space-y-1">
                    <Label
                      htmlFor="income-amount"
                      className="text-[10px] font-bold uppercase text-zinc-500"
                    >
                      Valor da receita
                    </Label>
                    <div className="flex items-center border-b border-zinc-700">
                      <span className="shrink-0 text-xs font-semibold text-emerald-400">
                        {currencySymbol}
                      </span>
                      <Input
                        id="income-amount"
                        value={amount}
                        onChange={(event) => setAmount(event.target.value)}
                        inputMode="decimal"
                        placeholder="0,00"
                        className="h-10 rounded-none border-0 bg-transparent px-2 text-base font-medium shadow-none focus-visible:ring-0 dark:bg-transparent"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label
                      htmlFor="income-description"
                      className="text-sm font-medium text-zinc-300"
                    >
                      De onde veio?
                    </Label>
                    <Input
                      id="income-description"
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                      placeholder="Ex.: Salário, projeto..."
                      className={lineInputClassName}
                      required
                    />
                  </div>
                </div>

                <div
                  className={cn(
                    "space-y-5 md:mt-5 md:block md:border-t md:border-zinc-800 md:pt-5",
                    mobileStep !== 2 && "hidden",
                  )}
                >
                  <div className="flex items-center justify-between md:hidden">
                    <p className="text-[10px] font-bold uppercase text-zinc-500">
                      Organização
                    </p>
                    <span className="text-xs text-zinc-600">2 / 2</span>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label
                        htmlFor="income-date"
                        className="flex items-center gap-2 text-[10px] font-bold uppercase text-zinc-500"
                      >
                        <CalendarDays className="size-3.5" />
                        Data
                      </Label>
                      <Input
                        id="income-date"
                        value={date}
                        onChange={(event) => setDate(event.target.value)}
                        type="date"
                        className={cn(pillFieldClassName, "[color-scheme:dark]")}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2 text-[10px] font-bold uppercase text-zinc-500">
                        <ReceiptText className="size-3.5" />
                        Categoria
                      </Label>
                      <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger className={pillFieldClassName}>
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

                  <div className="grid gap-2 border-t border-zinc-800 pt-4 sm:grid-cols-2">
                    <div className="flex min-h-14 items-center justify-between gap-3">
                      <span>
                        <span className="block text-xs font-semibold text-zinc-100">
                          Repetir mensalmente
                        </span>
                        <span className="block text-[10px] text-zinc-500">
                          Projetar por 12 meses
                        </span>
                      </span>
                      <Switch
                        id="income-repeat-monthly"
                        checked={repeatMonthly}
                        onCheckedChange={setRepeatMonthly}
                      />
                    </div>
                    <div className="flex min-h-14 items-center justify-between gap-3">
                      <span>
                        <span className="block text-xs font-semibold text-zinc-100">
                          Valor variável
                        </span>
                        <span className="block text-[10px] text-zinc-500">
                          Confirmar a cada mês
                        </span>
                      </span>
                      <Switch
                        id="income-variable-value"
                        checked={isVariableValue}
                        onCheckedChange={(checked) => {
                          setIsVariableValue(checked);
                          if (checked) setRepeatMonthly(true);
                        }}
                      />
                    </div>
                  </div>
                </div>
              </fieldset>
            )}
          </div>

          <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-zinc-900 px-5 py-3 md:border-0 md:px-7 md:pb-6 md:pt-2">
            {pendingRecurringUpdate ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setPendingRecurringUpdate(null)}
                className="text-zinc-400"
              >
                Voltar aos campos
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={isSubmitting}
                  onClick={mobileStep === 2 ? () => setMobileStep(1) : onClose}
                  className="h-10 flex-1 text-zinc-400 hover:text-white md:flex-none"
                >
                  <span className="md:hidden">
                    {mobileStep === 2 ? "Voltar" : "Cancelar"}
                  </span>
                  <span className="hidden md:inline">Cancelar</span>
                </Button>
                {mobileStep === 1 ? (
                  <Button
                    type="button"
                    onClick={() => setMobileStep(2)}
                    className="h-10 flex-[1.35] rounded-full bg-emerald-600 px-6 font-semibold text-white hover:bg-emerald-700 md:hidden"
                  >
                    Continuar
                  </Button>
                ) : null}
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className={cn(
                    "h-10 flex-[1.35] rounded-full bg-emerald-600 px-6 font-semibold text-white hover:bg-emerald-700 md:flex-none",
                    mobileStep === 1 && "hidden md:inline-flex",
                  )}
                >
                  <Check className="size-4" />
                  {isSubmitting
                    ? "Salvando..."
                    : editingTransaction?.groupId &&
                        editingTransaction.is_recurring
                      ? "Revisar mudanças"
                      : "Salvar receita"}
                </Button>
              </>
            )}
          </footer>
        </section>
      </form>
    </DialogContent>
  );
}
