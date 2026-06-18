"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { CalendarDays, CreditCard, DollarSign, ReceiptText, Save } from "lucide-react";
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
import { Label } from "@/components/ui/label";
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
  const fetchCards = useFinanceStore((state) => state.fetchCards);
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
      isFixedMode || editingTransaction?.type !== "card" ? "fixed" : "card",
    );
  const [selectedCardId, setSelectedCardId] = useState(
    editingTransaction?.cardId ?? "",
  );
  const [isInstallmentPurchase, setIsInstallmentPurchase] = useState(false);
  const [installmentCount, setInstallmentCount] = useState("2");
  const [isRecurring, setIsRecurring] = useState(
    isFixedMode ? true : editingTransaction?.is_recurring ?? false,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    void fetchCards();
  }, [fetchCards]);

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
      owner: "eu",
      dependentIds: ["eu"],
      tagIds: [],
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
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
      <DialogHeader>
        <div className="flex items-center gap-2 text-sm font-medium text-brand-300">
          <ReceiptText className="size-4" />
          Lançamento
        </div>
        <DialogTitle>
          {editingTransaction
            ? "Editar transação"
            : isFixedMode
              ? "Nova conta fixa"
              : "Nova transação"}
        </DialogTitle>
        <DialogDescription>
          {isFixedMode
            ? "Projete uma despesa recorrente para os próximos 12 meses."
            : "Registre saídas por débito, PIX ou cartão de crédito."}
        </DialogDescription>
      </DialogHeader>

      <form className="grid grid-cols-2 gap-4" onSubmit={handleSubmit}>
        <div className="col-span-2">
          <Label htmlFor="transaction-amount" className="justify-center">
            Valor (R$)
          </Label>
          <div className="relative mt-2">
            <DollarSign className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="transaction-amount"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              className="h-16 px-12 text-center text-3xl font-bold"
              required
            />
          </div>
        </div>

        <div className="col-span-2">
          <Label htmlFor="transaction-description">Descrição</Label>
          <Input
            id="transaction-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            type="text"
            placeholder="Ex: Mercado, assinatura, transporte"
            className="mt-2"
            required
          />
        </div>

        <div>
          <Label htmlFor="transaction-date">
            <CalendarDays className="size-4 text-muted-foreground" />
            Data
          </Label>
          <Input
            id="transaction-date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            type="date"
            className="mt-2 [color-scheme:dark]"
            required
          />
        </div>

        <div>
          <Label>Categoria</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="mt-2">
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

        <div className="col-span-2 grid grid-cols-2 gap-4">
          <div>
            <Label>
              <CreditCard className="size-4 text-muted-foreground" />
              Tipo
            </Label>
            <Select
              value={transactionType}
              disabled={isFixedMode}
              onValueChange={(value) => {
                const nextType = value as ExpenseTransactionType;

                setTransactionType(nextType);
                if (nextType !== "card") {
                  setSelectedCardId("");
                  setIsInstallmentPurchase(false);
                }
              }}
            >
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fixed">
                  {isFixedMode ? "Gasto Fixo" : "Débito/PIX"}
                </SelectItem>
                <SelectItem value="card">Cartão de Crédito</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="col-span-2 space-y-4 rounded-xl border border-border bg-muted/30 p-4">
          {transactionType === "card" ? (
            <>
              <div>
                <Label>Cartão</Label>
                <Select
                  value={selectedCardId}
                  onValueChange={setSelectedCardId}
                  disabled={!cards.length}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Selecione um cartão" />
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

              {!editingTransaction ? (
                <>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm font-medium text-foreground">
                      Compra parcelada?
                    </span>
                    <Switch
                      checked={isInstallmentPurchase}
                      onCheckedChange={(checked) => {
                        setIsInstallmentPurchase(checked);
                        if (checked) {
                          setIsRecurring(false);
                        }
                      }}
                    />
                  </div>

                  {isInstallmentPurchase ? (
                    <div className="animate-in fade-in-0 slide-in-from-top-1 duration-150">
                      <Label htmlFor="installments">Quantidade de Parcelas</Label>
                      <Input
                        id="installments"
                        value={installmentCount}
                        onChange={(event) => setInstallmentCount(event.target.value)}
                        type="number"
                        min={2}
                        step={1}
                        className="mt-2"
                      />
                    </div>
                  ) : null}

                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm font-medium text-foreground">
                      Assinatura mensal no cartão?
                    </span>
                    <Switch
                      checked={isRecurring}
                      onCheckedChange={(checked) => {
                        setIsRecurring(checked);
                        if (checked) {
                          setIsInstallmentPurchase(false);
                        }
                      }}
                    />
                  </div>
                </>
              ) : null}
            </>
          ) : null}

          {transactionType === "fixed" && !isFixedMode ? (
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-medium text-foreground">
                Gasto fixo recorrente?
              </span>
              <Switch checked={isRecurring} onCheckedChange={setIsRecurring} />
            </div>
          ) : null}
        </div>

        <div className="col-span-2 flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting} className="gap-2">
            <Save className="size-4" />
            {isSubmitting ? "Salvando..." : "Salvar transação"}
          </Button>
        </div>
      </form>
    </DialogContent>
  );
}
