"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CreditCard,
  ReceiptText,
  Tag,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import {
  getDateOnlyParts,
  getLocalTodayDateOnly,
  normalizeDateOnly,
  toDateOnly,
} from "@/lib/dateUtils";
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
import { Switch } from "@/components/ui/switch";
import {
  useFinanceStore,
  type CreateTransactionInput,
  type Transaction,
} from "@/store/useFinanceStore";

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingTransaction?: Transaction | null;
  mode?: "expense" | "fixed";
}

type ExpenseTransactionType = "fixed" | "card";

const categories = [
  "Alimentação",
  "Transporte",
  "Moradia",
  "Lazer",
  "Saúde",
  "Educação",
  "Outros",
];

function addMonthsToDateOnly(date: string, monthsToAdd: number) {
  const { day, month, year } = getDateOnlyParts(date);
  const monthIndex = month - 1 + monthsToAdd;
  const nextYear = year + Math.floor(monthIndex / 12);
  const nextMonth = (monthIndex % 12) + 1;
  const lastDayOfNextMonth = new Date(nextYear, nextMonth, 0).getDate();

  return toDateOnly(nextYear, nextMonth, Math.min(day, lastDayOfNextMonth));
}

function splitAmountIntoInstallments(totalAmount: number, installments: number) {
  const totalCents = Math.round(totalAmount * 100);
  const baseCents = Math.floor(totalCents / installments);
  const remainder = totalCents % installments;

  return Array.from({ length: installments }, (_, index) => {
    const cents = baseCents + (index < remainder ? 1 : 0);

    return Number((cents / 100).toFixed(2));
  });
}

export function AddTransactionModal({
  isOpen,
  onClose,
  editingTransaction = null,
  mode = "expense",
}: AddTransactionModalProps) {
  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <TransactionModalContent
        key={`${mode}-${editingTransaction?.id ?? "new-transaction"}`}
        editingTransaction={editingTransaction}
        onClose={onClose}
        mode={mode}
      />
    </Dialog>
  );
}

function TransactionModalContent({
  editingTransaction,
  onClose,
  mode,
}: {
  editingTransaction: Transaction | null;
  onClose: () => void;
  mode: "expense" | "fixed";
}) {
  const cards = useFinanceStore((state) => state.cards);
  const tags = useFinanceStore((state) => state.tags);
  const dependents = useFinanceStore((state) => state.dependents);
  const fetchCards = useFinanceStore((state) => state.fetchCards);
  const fetchTags = useFinanceStore((state) => state.fetchTags);
  const fetchDependents = useFinanceStore((state) => state.fetchDependents);
  const fetchTransactions = useFinanceStore((state) => state.fetchTransactions);
  const authUser = useFinanceStore((state) => state.authUser);
  const addTransaction = useFinanceStore((state) => state.addTransaction);
  const addTransactions = useFinanceStore((state) => state.addTransactions);
  const updateTransaction = useFinanceStore((state) => state.updateTransaction);
  const isFixedMode = mode === "fixed";

  const [description, setDescription] = useState(
    editingTransaction?.description ?? "",
  );
  const [amount, setAmount] = useState(
    editingTransaction ? String(editingTransaction.amount).replace(".", ",") : "",
  );
  const [date, setDate] = useState(
    editingTransaction?.date
      ? normalizeDateOnly(editingTransaction.date)
      : getLocalTodayDateOnly(),
  );
  const [category, setCategory] = useState(
    editingTransaction?.category || categories[0],
  );
  const [transactionType, setTransactionType] =
    useState<ExpenseTransactionType>(
      editingTransaction?.type === "card" ? "card" : "fixed",
    );
  const [selectedCardId, setSelectedCardId] = useState(
    editingTransaction?.cardId ?? "",
  );
  const [selectedTagId, setSelectedTagId] = useState(
    editingTransaction?.tagIds?.[0] ?? "",
  );
  const [selectedDependentId, setSelectedDependentId] = useState(
    editingTransaction?.dependentId ?? "",
  );
  const [isInstallmentPurchase, setIsInstallmentPurchase] = useState(false);
  const [installmentCount, setInstallmentCount] = useState("2");
  const [isRecurring, setIsRecurring] = useState(
    isFixedMode ? true : editingTransaction?.is_recurring ?? false,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    void Promise.all([fetchCards(), fetchTags(), fetchDependents()]);
  }, [fetchCards, fetchDependents, fetchTags]);

  const selectedCard = useMemo(() => {
    if (transactionType !== "card") return null;

    return cards.find((card) => card.id === selectedCardId) ?? null;
  }, [cards, selectedCardId, transactionType]);

  const transactionCardId =
    transactionType === "card" ? selectedCardId || null : null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) return;

    if (!authUser?.id) {
      toast.error("Faça login novamente para salvar a transação.");
      return;
    }

    if (transactionType === "card" && !transactionCardId) {
      toast.error("Selecione um cartão para lançar no crédito.");
      return;
    }

    const normalizedDate = normalizeDateOnly(date);
    const totalAmount = Number(amount.replace(",", ".")) || 0;
    const parsedInstallmentCount = Math.max(Number(installmentCount) || 2, 2);
    const shouldCreateRecurringProjection =
      transactionType === "fixed" && (isFixedMode || isRecurring);
    const shouldCreateCreditCardSubscription =
      transactionType === "card" && isRecurring;
    const baseStatus =
      editingTransaction?.status ??
      (transactionType === "fixed"
        ? shouldCreateRecurringProjection
          ? "pending"
          : "paid"
        : "confirmed");
    const transactionPayload: CreateTransactionInput = {
      description: description.trim(),
      amount: totalAmount,
      date: normalizedDate,
      category,
      type: transactionType,
      status: baseStatus,
      cardId: transactionCardId,
      dependentId: selectedDependentId || null,
      owner: "eu",
      dependentIds: ["eu"],
      tagIds: selectedTagId ? [selectedTagId] : [],
      installments: 1,
      current_installment: 1,
      installmentsTotal: 1,
      installmentNumber: 1,
      is_recurring:
        shouldCreateRecurringProjection || shouldCreateCreditCardSubscription,
      notes: selectedCard
        ? `Cartão: ${selectedCard.name}`
        : isFixedMode
          ? "Gasto fixo"
          : "Débito/PIX",
    };

    setIsSubmitting(true);

    try {
      if (editingTransaction) {
        await updateTransaction(editingTransaction.id, transactionPayload);
      } else if (shouldCreateCreditCardSubscription) {
        const groupId = crypto.randomUUID();
        const subscriptionTransactions = Array.from(
          { length: 12 },
          (_, index): CreateTransactionInput => ({
            ...transactionPayload,
            groupId,
            cardId: transactionCardId,
            date: addMonthsToDateOnly(normalizedDate, index),
            status: "pending",
            installments: 1,
            current_installment: 1,
            installmentsTotal: 1,
            installmentNumber: 1,
            is_recurring: true,
          }),
        );

        await addTransactions(subscriptionTransactions);
      } else if (
        transactionType === "card" &&
        isInstallmentPurchase &&
        parsedInstallmentCount >= 2
      ) {
        const groupId = crypto.randomUUID();
        const installmentAmounts = splitAmountIntoInstallments(
          totalAmount,
          parsedInstallmentCount,
        );
        const installmentTransactions = installmentAmounts.map(
          (installmentAmount, index): CreateTransactionInput => ({
            ...transactionPayload,
            groupId,
            amount: installmentAmount,
            date: addMonthsToDateOnly(normalizedDate, index),
            installments: parsedInstallmentCount,
            current_installment: index + 1,
            installmentsTotal: parsedInstallmentCount,
            installmentNumber: index + 1,
            is_recurring: false,
          }),
        );

        await addTransactions(installmentTransactions);
      } else if (shouldCreateRecurringProjection) {
        const groupId = crypto.randomUUID();
        const recurringTransactions = Array.from(
          { length: 12 },
          (_, index): CreateTransactionInput => ({
            ...transactionPayload,
            groupId,
            date: addMonthsToDateOnly(normalizedDate, index),
            status: "pending",
            is_recurring: true,
          }),
        );

        await addTransactions(recurringTransactions);
      } else {
        await addTransaction(transactionPayload);
      }

      await fetchTransactions();

      toast.success(
        editingTransaction
          ? isFixedMode
            ? "Conta atualizada!"
            : "Transação atualizada com sucesso!"
          : isFixedMode
            ? "Conta adicionada com sucesso!"
            : "Transação adicionada com sucesso!",
      );
      onClose();
    } catch (error) {
      console.error("Erro ao salvar transação:", error);
      toast.error("Erro ao salvar transação.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <DialogContent className="border border-zinc-800 bg-zinc-950 shadow-2xl sm:max-w-3xl">
      <DialogHeader>
        <div className="flex items-center gap-2 text-sm font-medium text-brand-300">
          <ReceiptText className="size-4" />
          Lançamento
        </div>
        <DialogTitle>
          {editingTransaction
            ? "Editar transação"
            : isFixedMode
              ? "Nova recorrência"
              : "Nova transação"}
        </DialogTitle>
        <DialogDescription>
          {isFixedMode
            ? "Projete uma despesa recorrente para os próximos 12 meses."
            : "Registre saídas por débito, PIX ou cartão de crédito."}
        </DialogDescription>
      </DialogHeader>

      <form className="space-y-6" onSubmit={handleSubmit}>
        <section className="space-y-2 text-center">
          <div className="relative mx-auto max-w-sm rounded-lg border border-zinc-800/80 bg-zinc-900/30">
            <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-xl font-semibold text-zinc-400">
              R$
            </span>
            <Input
              id="transaction-amount"
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
            id="transaction-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            type="text"
            placeholder="Descrição da transação"
            className="mx-auto h-10 max-w-md rounded-lg border border-zinc-800/80 bg-zinc-900/30 text-center text-lg text-zinc-100 shadow-none ring-0 placeholder:text-zinc-400 focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            required
          />
        </section>

        <section className="mt-6 grid grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-zinc-400">
                <CalendarDays className="size-3.5" />
                Data
              </div>
              <Input
                id="transaction-date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                type="date"
                className="flex h-10 items-center border border-zinc-700 bg-zinc-900 text-sm text-zinc-200 shadow-none transition-colors [color-scheme:dark] hover:border-zinc-600 focus:border-emerald-500 focus-visible:ring-1 focus-visible:ring-emerald-500 focus-visible:ring-offset-0"
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-zinc-400">
                <CreditCard className="size-3.5" />
                {isFixedMode ? "Método" : "Tipo"}
              </div>
              <Select
                value={transactionType}
                onValueChange={(value) => {
                  const nextType = value as ExpenseTransactionType;

                  setTransactionType(nextType);
                  if (nextType !== "card") {
                    setSelectedCardId("");
                    setIsInstallmentPurchase(false);
                  }
                }}
              >
                <SelectTrigger className="flex h-10 items-center border border-zinc-700 bg-zinc-900 text-sm text-zinc-200 shadow-none transition-colors hover:border-zinc-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:ring-offset-0">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Débito/PIX</SelectItem>
                  <SelectItem value="card">Cartão de Crédito</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {transactionType === "card" ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-zinc-400">
                  <CreditCard className="size-3.5" />
                  Cartão
                </div>
                <Select
                  value={selectedCardId}
                  onValueChange={setSelectedCardId}
                  disabled={!cards.length}
                >
                  <SelectTrigger className="flex h-10 items-center border border-zinc-700 bg-zinc-900 text-sm text-zinc-200 shadow-none transition-colors hover:border-zinc-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:ring-offset-0">
                    <SelectValue placeholder="Selecionar cart?o" />
                  </SelectTrigger>
                  <SelectContent>
                    {cards.map((card) => (
                      <SelectItem key={card.id} value={card.id}>
                        {card.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
          </div>

          <div className="space-y-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-zinc-400">
                <ReceiptText className="size-3.5" />
                Categoria
              </div>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="flex h-10 items-center border border-zinc-700 bg-zinc-900 text-sm text-zinc-200 shadow-none transition-colors hover:border-zinc-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:ring-offset-0">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-zinc-400">
                <Tag className="size-3.5" />
                Tag
              </div>
              <Select
                value={selectedTagId || "__no_tag__"}
                onValueChange={(nextValue) =>
                  setSelectedTagId(nextValue === "__no_tag__" ? "" : nextValue)
                }
              >
                <SelectTrigger className="flex h-10 items-center border border-zinc-700 bg-zinc-900 text-sm text-zinc-200 shadow-none transition-colors hover:border-zinc-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:ring-offset-0">
                  <SelectValue placeholder="Sem tag" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__no_tag__">Sem tag</SelectItem>
                  {tags.map((tag) => (
                    <SelectItem key={tag.id} value={tag.id}>
                      {tag.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-zinc-400">
                <UserRound className="size-3.5" />
                Dependente
              </div>
              <Select
                value={selectedDependentId || "__no_dependent__"}
                onValueChange={(nextValue) =>
                  setSelectedDependentId(
                    nextValue === "__no_dependent__" ? "" : nextValue,
                  )
                }
              >
                <SelectTrigger className="flex h-10 items-center border border-zinc-700 bg-zinc-900 text-sm text-zinc-200 shadow-none transition-colors hover:border-zinc-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:ring-offset-0">
                  <SelectValue placeholder="Sem dependente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__no_dependent__">Sem dependente</SelectItem>
                  {dependents.map((dependent) => (
                    <SelectItem key={dependent.id} value={dependent.id}>
                      {dependent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        {!isFixedMode ? (
          <section className="flex items-center justify-between gap-6 rounded-xl border border-zinc-700 bg-zinc-900/50 p-4">
            <div>
              <p className="text-sm font-medium text-zinc-200">
                {transactionType === "card"
                  ? "Assinatura mensal"
                  : "Gasto fixo recorrente"}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Repete automaticamente nos próximos meses.
              </p>
            </div>
            <Switch
              id="recurring-toggle"
              checked={isRecurring}
              onCheckedChange={(checked) => {
                setIsRecurring(checked);
                if (checked) {
                  setIsInstallmentPurchase(false);
                }
              }}
            />
          </section>
        ) : null}

        {transactionType === "card" && !isFixedMode && !editingTransaction ? (
          <section className="flex items-center justify-between gap-6 rounded-xl border border-zinc-700 bg-zinc-900/50 p-4">
            <div>
              <p className="text-sm font-medium text-zinc-200">
                Compra parcelada?
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Divida o lançamento em parcelas mensais.
              </p>
            </div>
            <Switch
              checked={isInstallmentPurchase}
              onCheckedChange={(checked) => {
                setIsInstallmentPurchase(checked);
                if (checked) {
                  setIsRecurring(false);
                }
              }}
            />
          </section>
        ) : null}

        {transactionType === "card" && isInstallmentPurchase ? (
          <Input
            id="installments"
            value={installmentCount}
            onChange={(event) => setInstallmentCount(event.target.value)}
            type="number"
            min={2}
            step={1}
            placeholder="Quantidade de parcelas"
            className="h-11 border border-zinc-700 bg-zinc-900 transition-colors hover:border-zinc-600 focus-visible:border-emerald-500"
          />
        ) : null}

        <div className="mt-8 flex justify-end gap-3">
          <Button
            type="button"
            variant="ghost"
            disabled={isSubmitting}
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
            {isSubmitting ? "Salvando..." : "Salvar transação"}
          </Button>
        </div>
      </form>
    </DialogContent>
  );
}
