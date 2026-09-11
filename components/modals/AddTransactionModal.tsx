"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowDownLeft,
  CalendarDays,
  Check,
  CreditCard,
  Landmark,
  Layers3,
  Repeat2,
  Tag,
  UserRound,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { getLocalTodayDateOnly, normalizeDateOnly } from "@/lib/dateUtils";
import { getInstallmentInvoiceMonthStart } from "@/lib/cardBilling";
import {
  addMonthsToDateOnly,
  splitAmountIntoInstallments,
} from "@/lib/transactionProjection";
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
import { cn } from "@/lib/utils";
import {
  useFinanceStore,
  type CreateTransactionInput,
  type Transaction,
} from "@/store/useFinanceStore";

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectIncome?: () => void;
  editingTransaction?: Transaction | null;
  mode?: "expense" | "fixed";
}

type ExpenseTransactionType = "fixed" | "card";
type GroupEditScope = "single" | "future" | "all";

export function AddTransactionModal({
  isOpen,
  onClose,
  onSelectIncome,
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
        onSelectIncome={onSelectIncome}
        mode={mode}
      />
    </Dialog>
  );
}

function TransactionModalContent({
  editingTransaction,
  onClose,
  onSelectIncome,
  mode,
}: {
  editingTransaction: Transaction | null;
  onClose: () => void;
  onSelectIncome?: () => void;
  mode: "expense" | "fixed";
}) {
  const cards = useFinanceStore((state) => state.cards);
  const dependents = useFinanceStore((state) => state.dependents);
  const categories = useFinanceStore((state) => state.categories);
  const fetchCards = useFinanceStore((state) => state.fetchCards);
  const fetchDependents = useFinanceStore((state) => state.fetchDependents);
  const fetchCategories = useFinanceStore((state) => state.fetchCategories);
  const fetchTransactions = useFinanceStore((state) => state.fetchTransactions);
  const authUser = useFinanceStore((state) => state.authUser);
  const addTransaction = useFinanceStore((state) => state.addTransaction);
  const addTransactions = useFinanceStore((state) => state.addTransactions);
  const updateTransaction = useFinanceStore((state) => state.updateTransaction);
  const updateTransactionGroup = useFinanceStore(
    (state) => state.updateTransactionGroup,
  );
  const isFixedMode = mode === "fixed";

  const [description, setDescription] = useState(
    editingTransaction?.description ?? "",
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
  const [category, setCategory] = useState(
    editingTransaction?.category || "Outros",
  );
  const [transactionType, setTransactionType] =
    useState<ExpenseTransactionType>(
      editingTransaction?.type === "card" ? "card" : "fixed",
    );
  const [selectedCardId, setSelectedCardId] = useState(
    editingTransaction?.cardId ?? "",
  );
  const [selectedDependentId, setSelectedDependentId] = useState(
    editingTransaction?.dependentId ?? "",
  );
  const [isInstallmentPurchase, setIsInstallmentPurchase] = useState(false);
  const [installmentCount, setInstallmentCount] = useState("2");
  const [isRecurring, setIsRecurring] = useState(
    isFixedMode ? true : (editingTransaction?.is_recurring ?? false),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mobileStep, setMobileStep] = useState<1 | 2>(1);
  const [pendingRecurringUpdate, setPendingRecurringUpdate] =
    useState<CreateTransactionInput | null>(null);
  const isEditingInstallment =
    Boolean(editingTransaction?.groupId) &&
    !editingTransaction?.is_recurring &&
    (editingTransaction?.installmentsTotal ??
      editingTransaction?.installments ??
      1) > 1;
  const showBehaviorSection =
    !isFixedMode || (transactionType === "card" && !editingTransaction);

  useEffect(() => {
    void Promise.all([fetchCards(), fetchDependents(), fetchCategories()]);
  }, [fetchCards, fetchCategories, fetchDependents]);

  const expenseCategories = useMemo(
    () => categories.filter((item) => item.kind === "expense"),
    [categories],
  );

  const selectedCard = useMemo(() => {
    if (transactionType !== "card") return null;

    return cards.find((card) => card.id === selectedCardId) ?? null;
  }, [cards, selectedCardId, transactionType]);

  const selectedDependentName = useMemo(
    () =>
      dependents.find((dependent) => dependent.id === selectedDependentId)
        ?.name ?? "Gasto pessoal",
    [dependents, selectedDependentId],
  );

  const transactionCardId =
    transactionType === "card" ? selectedCardId || null : null;

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
          ? "Grupo inteiro atualizado."
          : scope === "future"
            ? "Lançamentos atualizados deste mês em diante."
            : "Lançamento deste mês atualizado.",
      );
      onClose();
    } catch (error) {
      console.error("Erro ao atualizar grupo:", error);
      toast.error("Erro ao atualizar lançamento.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) return;

    if (
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 639px)").matches &&
      mobileStep === 1
    ) {
      setMobileStep(2);
      return;
    }

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
          : "confirmed"
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
      dependentIds: [selectedDependentId || "eu"],
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
        if (
          editingTransaction.groupId &&
          (editingTransaction.is_recurring || isEditingInstallment)
        ) {
          setPendingRecurringUpdate(transactionPayload);
          setIsSubmitting(false);
          return;
        }

        await updateTransaction(editingTransaction.id, transactionPayload);
      } else if (shouldCreateCreditCardSubscription) {
        const groupId = crypto.randomUUID();
        const subscriptionTransactions = Array.from(
          { length: 12 },
          (_, index): CreateTransactionInput => {
            const subscriptionDate = addMonthsToDateOnly(normalizedDate, index);

            return {
              ...transactionPayload,
              groupId,
              cardId: transactionCardId,
              date: subscriptionDate,
              status:
                subscriptionDate <= getLocalTodayDateOnly()
                  ? "confirmed"
                  : "pending",
              installments: 1,
              current_installment: 1,
              installmentsTotal: 1,
              installmentNumber: 1,
              is_recurring: true,
            };
          },
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
            billingMonthStart: getInstallmentInvoiceMonthStart(
              normalizedDate,
              selectedCard?.closingDay,
              index,
            ),
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

  const lineInputClassName =
    "h-9 rounded-none border-0 border-b border-zinc-700 bg-transparent px-0 text-zinc-100 shadow-none placeholder:text-zinc-600 focus-visible:border-rose-500 focus-visible:ring-0 dark:bg-transparent";
  const pillFieldClassName =
    "h-10 rounded-full border-zinc-700 bg-transparent px-3 text-zinc-100 shadow-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500/30 dark:bg-transparent [@media_(max-height:_700px)_and_(max-width:_767px)]:h-9";

  function selectPaymentType(type: ExpenseTransactionType) {
    setTransactionType(type);

    if (type === "fixed") {
      setSelectedCardId("");
      setIsInstallmentPurchase(false);
    }
  }

  return (
    <DialogContent
      data-tour={isFixedMode ? "recurring-modal" : "transaction-modal"}
      data-tour-preview-modal
      showCloseButton={false}
      onOpenAutoFocus={(event) => {
        event.preventDefault();
        window.requestAnimationFrame(() => {
          document.getElementById("transaction-amount")?.focus();
        });
      }}
      className="inset-x-0 bottom-0 left-0 top-auto flex max-h-[94dvh] w-full max-w-none translate-x-0 translate-y-0 overflow-hidden rounded-b-none rounded-t-xl border border-b-0 border-zinc-800 bg-zinc-950 p-0 text-zinc-50 shadow-2xl md:left-1/2 md:top-1/2 md:h-[560px] md:max-h-[90dvh] md:max-w-[920px] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-xl md:border-b"
    >
      <form
        className="grid min-h-0 w-full md:grid-cols-[44%_56%]"
        onSubmit={handleSubmit}
      >
        <aside className="relative flex min-h-44 flex-col overflow-hidden bg-rose-800 p-5 text-white md:min-h-0 md:p-8 [@media_(max-height:_700px)_and_(max-width:_767px)]:min-h-32 [@media_(max-height:_700px)_and_(max-width:_767px)]:p-4">
          <div className="pointer-events-none absolute inset-y-0 right-0 w-28 border-l border-white/10 bg-black/10 [transform:skewX(-10deg)_translateX(45%)]" />
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
              {isFixedMode ? "Recorrência" : "Lançamento"}
            </p>
            <div className="mt-5 hidden size-10 items-center justify-center rounded-lg bg-white/15 md:flex">
              {isFixedMode ? (
                <Repeat2 className="size-5" />
              ) : (
                <ArrowDownLeft className="size-5" />
              )}
            </div>
            <DialogTitle className="mt-3 max-w-xs text-2xl font-semibold leading-tight text-white md:mt-5 md:text-4xl [@media_(max-height:_700px)_and_(max-width:_767px)]:mt-1 [@media_(max-height:_700px)_and_(max-width:_767px)]:text-xl">
              {editingTransaction
                ? isFixedMode
                  ? "Editar recorrência."
                  : "Editar transação."
                : isFixedMode
                  ? "Nova recorrência."
                  : "Nova transação."}
            </DialogTitle>
            <DialogDescription className="mt-2 max-w-[250px] text-xs leading-5 text-white/80 md:mt-3 [@media_(max-height:_700px)_and_(max-width:_767px)]:hidden">
              {isFixedMode
                ? "Organize uma cobrança que se repete ao longo dos meses."
                : "Registre seu movimento e mantenha o controle do seu dinheiro."}
            </DialogDescription>
          </div>

          <TransactionLivePreview
            type="expense"
            amount={amount}
            description={description}
            category={category}
            origin={
              transactionType === "card"
                ? selectedCard?.name || "Cartão de crédito"
                : "PIX / Débito"
            }
            owner={selectedDependentName}
            date={date}
            recurring={isFixedMode || isRecurring}
          />

          <div className="relative z-10 mt-auto flex items-end justify-between gap-3 pt-4 md:block [@media_(max-height:_700px)_and_(max-width:_767px)]:pt-2">
            <p className="mb-2 text-[10px] font-bold uppercase text-white/60">
              {isFixedMode ? "Tipo de recorrência" : "Tipo de lançamento"}
            </p>
            <div className="flex gap-2">
              {isFixedMode ? (
                <>
                  <button
                    type="button"
                    onClick={() => selectPaymentType("fixed")}
                    className={cn(
                      "h-8 rounded-full px-4 text-xs font-semibold transition-colors",
                      transactionType === "fixed"
                        ? "bg-white text-rose-800"
                        : "bg-white/10 text-white hover:bg-white/15",
                    )}
                  >
                    Conta fixa
                  </button>
                  <button
                    type="button"
                    onClick={() => selectPaymentType("card")}
                    className={cn(
                      "h-8 rounded-full px-4 text-xs font-semibold transition-colors",
                      transactionType === "card"
                        ? "bg-white text-rose-800"
                        : "bg-white/10 text-white hover:bg-white/15",
                    )}
                  >
                    Assinatura
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="h-8 rounded-full bg-white px-4 text-xs font-semibold text-rose-800"
                  >
                    Despesa
                  </button>
                  <button
                    type="button"
                    disabled={!onSelectIncome || Boolean(editingTransaction)}
                    onClick={onSelectIncome}
                    className="h-8 rounded-full bg-white/10 px-4 text-xs font-semibold text-white transition-colors hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Receita
                  </button>
                </>
              )}
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
                  <p className="mt-1 text-sm leading-5 text-zinc-400">
                    Escolha quais lançamentos deste grupo devem ser atualizados.
                  </p>
                  <div className="mt-5 grid gap-2 sm:grid-cols-3">
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={isSubmitting}
                      onClick={() => void saveGroupedUpdate("single")}
                    >
                      Somente este
                    </Button>
                    <Button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => void saveGroupedUpdate("future")}
                      className="bg-rose-600 text-white hover:bg-rose-700"
                    >
                      Este e os próximos
                    </Button>
                    {isEditingInstallment ? (
                      <Button
                        type="button"
                        variant="outline"
                        disabled={isSubmitting}
                        onClick={() => void saveGroupedUpdate("all")}
                        className="border-zinc-700"
                      >
                        Todas
                      </Button>
                    ) : null}
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
                      htmlFor="transaction-amount"
                      className="text-[10px] font-bold uppercase text-zinc-500"
                    >
                      Valor da transação
                    </Label>
                    <div className="flex items-center border-b border-zinc-700">
                      <span className="shrink-0 text-xs font-semibold text-rose-400">
                        R$
                      </span>
                      <Input
                        id="transaction-amount"
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
                      htmlFor="transaction-description"
                      className="text-sm font-medium text-zinc-300"
                    >
                      O que foi?
                    </Label>
                    <Input
                      id="transaction-description"
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                      placeholder="Ex.: Supermercado, farmácia..."
                      className={lineInputClassName}
                      required
                    />
                  </div>
                </div>

                <div
                  className={cn(
                    "space-y-4 md:mt-5 md:block md:border-t md:border-zinc-800 md:pt-5",
                    mobileStep !== 2 && "hidden",
                  )}
                >
                  <div className="flex items-center justify-between md:hidden">
                    <p className="text-[10px] font-bold uppercase text-zinc-500">
                      Organização
                    </p>
                    <span className="text-xs text-zinc-600">2 / 2</span>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 [@media_(max-height:_700px)_and_(max-width:_767px)]:gap-3">
                    <div className="space-y-2">
                      <Label
                        htmlFor="transaction-date"
                        className="flex items-center gap-2 text-[10px] font-bold uppercase text-zinc-500"
                      >
                        <CalendarDays className="size-3.5" />
                        Data
                      </Label>
                      <Input
                        id="transaction-date"
                        value={date}
                        onChange={(event) => setDate(event.target.value)}
                        type="date"
                        className={cn(pillFieldClassName, "[color-scheme:dark]")}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="transaction-category"
                        className="flex items-center gap-2 text-[10px] font-bold uppercase text-zinc-500"
                      >
                        <Tag className="size-3.5" />
                        Categoria
                      </Label>
                      <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger
                          id="transaction-category"
                          className={pillFieldClassName}
                        >
                          <SelectValue placeholder="Categoria" />
                        </SelectTrigger>
                        <SelectContent>
                          {expenseCategories.map((item) => (
                            <SelectItem key={item.id} value={item.label}>
                              {item.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="transaction-owner"
                        className="flex items-center gap-2 text-[10px] font-bold uppercase text-zinc-500"
                      >
                        <UserRound className="size-3.5" />
                        Responsável
                      </Label>
                      <Select
                        value={selectedDependentId || "__no_dependent__"}
                        onValueChange={(nextValue) =>
                          setSelectedDependentId(
                            nextValue === "__no_dependent__" ? "" : nextValue,
                          )
                        }
                      >
                        <SelectTrigger
                          id="transaction-owner"
                          className={pillFieldClassName}
                        >
                          <SelectValue placeholder="Gasto pessoal" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__no_dependent__">
                            Gasto pessoal
                          </SelectItem>
                          {dependents.map((dependent) => (
                            <SelectItem key={dependent.id} value={dependent.id}>
                              {dependent.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-2 text-[10px] font-bold uppercase text-zinc-500">
                        <CreditCard className="size-3.5" />
                        Pagamento
                      </Label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => selectPaymentType("fixed")}
                          className={cn(
                            "flex h-10 items-center justify-center gap-2 rounded-full border text-xs font-semibold transition-colors",
                            transactionType === "fixed"
                              ? "border-rose-500 bg-rose-500/10 text-rose-300"
                              : "border-zinc-700 text-zinc-400 hover:text-zinc-200",
                          )}
                        >
                          <Landmark className="size-3.5" />
                          PIX
                        </button>
                        <button
                          type="button"
                          onClick={() => selectPaymentType("card")}
                          className={cn(
                            "flex h-10 items-center justify-center gap-2 rounded-full border text-xs font-semibold transition-colors",
                            transactionType === "card"
                              ? "border-rose-500 bg-rose-500/10 text-rose-300"
                              : "border-zinc-700 text-zinc-400 hover:text-zinc-200",
                          )}
                        >
                          <CreditCard className="size-3.5" />
                          Cartão
                        </button>
                      </div>
                    </div>
                  </div>

                  {transactionType === "card" ? (
                    <div className="space-y-2">
                      <Label
                        htmlFor="transaction-card"
                        className="text-[10px] font-bold uppercase text-zinc-500"
                      >
                        Cartão utilizado
                      </Label>
                      <Select
                        value={selectedCardId}
                        onValueChange={setSelectedCardId}
                        disabled={!cards.length}
                      >
                        <SelectTrigger
                          id="transaction-card"
                          className={pillFieldClassName}
                        >
                          <SelectValue placeholder="Selecionar cartão" />
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

                  {showBehaviorSection || isFixedMode ? (
                    <div className="grid gap-2 border-t border-zinc-800 pt-4 sm:grid-cols-2">
                      {!isFixedMode ? (
                        <div className="flex min-h-12 items-center justify-between gap-3">
                          <span className="flex items-center gap-2.5">
                            <span className="flex size-8 items-center justify-center rounded-full bg-zinc-900 text-zinc-400">
                              <Repeat2 className="size-4" />
                            </span>
                            <span>
                              <span className="block text-xs font-semibold text-zinc-100">
                                {transactionType === "card"
                                  ? "Assinatura recorrente"
                                  : "Transação recorrente"}
                              </span>
                              <span className="block text-[10px] text-zinc-500">
                                Repetir por 12 meses
                              </span>
                            </span>
                          </span>
                          <Switch
                            id="recurring-toggle"
                            aria-label="Ativar recorrência"
                            checked={isRecurring}
                            onCheckedChange={(checked) => {
                              setIsRecurring(checked);
                              if (checked) setIsInstallmentPurchase(false);
                            }}
                          />
                        </div>
                      ) : (
                        <div className="flex min-h-12 items-center gap-2.5">
                          <span className="flex size-8 items-center justify-center rounded-full bg-zinc-900 text-zinc-400">
                            <Repeat2 className="size-4" />
                          </span>
                          <span>
                            <span className="block text-xs font-semibold text-zinc-100">
                              Recorrência mensal
                            </span>
                            <span className="block text-[10px] text-zinc-500">
                              Projeção de 12 meses
                            </span>
                          </span>
                        </div>
                      )}

                      {transactionType === "card" &&
                      !isFixedMode &&
                      !editingTransaction ? (
                        <div className="flex min-h-12 items-center justify-between gap-3">
                          <span className="flex items-center gap-2.5">
                            <span className="flex size-8 items-center justify-center rounded-full bg-zinc-900 text-zinc-400">
                              <Layers3 className="size-4" />
                            </span>
                            <span>
                              <span className="block text-xs font-semibold text-zinc-100">
                                Compra parcelada
                              </span>
                              <span className="block text-[10px] text-zinc-500">
                                Dividir entre faturas
                              </span>
                            </span>
                          </span>
                          <Switch
                            id="installment-toggle"
                            aria-label="Ativar parcelamento"
                            checked={isInstallmentPurchase}
                            onCheckedChange={(checked) => {
                              setIsInstallmentPurchase(checked);
                              if (checked) setIsRecurring(false);
                            }}
                          />
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  {transactionType === "card" && isInstallmentPurchase ? (
                    <div className="flex items-center justify-between gap-4 border-t border-zinc-800 pt-3">
                      <Label htmlFor="installments" className="text-xs text-zinc-300">
                        Número de parcelas
                      </Label>
                      <Input
                        id="installments"
                        value={installmentCount}
                        onChange={(event) => setInstallmentCount(event.target.value)}
                        type="number"
                        min={2}
                        step={1}
                        className="h-9 w-20 rounded-full border-zinc-700 bg-transparent text-center"
                      />
                    </div>
                  ) : null}
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
                    className="h-10 flex-[1.35] rounded-full bg-rose-600 px-6 font-semibold text-white hover:bg-rose-700 md:hidden"
                  >
                    Continuar
                  </Button>
                ) : null}

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className={cn(
                    "h-10 flex-[1.35] rounded-full bg-rose-600 px-6 font-semibold text-white hover:bg-rose-700 md:flex-none",
                    mobileStep === 1 && "hidden md:inline-flex",
                  )}
                >
                  <Check className="size-4" />
                  {isSubmitting
                    ? "Salvando..."
                    : editingTransaction?.groupId &&
                        (editingTransaction.is_recurring || isEditingInstallment)
                      ? "Revisar mudanças"
                      : isFixedMode
                        ? "Salvar recorrência"
                        : "Salvar transação"}
                </Button>
              </>
            )}
          </footer>
        </section>
      </form>
    </DialogContent>
  );
}
