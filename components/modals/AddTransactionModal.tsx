"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarDays,
  Check,
  CreditCard,
  Landmark,
  Layers3,
  Repeat2,
  Tag,
  UserRound,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";

import { getLocalTodayDateOnly, normalizeDateOnly } from "@/lib/dateUtils";
import { getInstallmentInvoiceMonthStart } from "@/lib/cardBilling";
import {
  addMonthsToDateOnly,
  splitAmountIntoInstallments,
  splitInstallmentsByOwner,
} from "@/lib/transactionProjection";
import { parseMoneyInput } from "@/lib/moneyInput";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import { CategoryGlyph } from "@/components/finance/categoryIcons";
import {
  AmountInput,
  CardPicker,
  Field,
  FieldLabel,
  GroupScopeChooser,
  ModalBody,
  ModalFooter,
  ModalShell,
  ModalStage,
  MobileSteps,
  OptionGroup,
  OptionRow,
  PrimaryButton,
  SecondaryButton,
  Segmented,
  StageAmount,
  accentSwitchClassName,
  fieldClassName,
  selectTriggerClassName,
} from "@/components/modals/ModalKit";
import {
  TransactionLivePreview,
  parsePreviewAmount,
} from "@/components/modals/TransactionLivePreview";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
  type UpdateTransactionInput,
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

const MAX_INSTALLMENTS = 48;

/* Editing keeps the item's place in its installment plan and its notes;
   the create payload always describes a single new entry. */
function toEditPayload(payload: CreateTransactionInput): UpdateTransactionInput {
  const editPayload: UpdateTransactionInput = { ...payload };
  delete editPayload.installments;
  delete editPayload.current_installment;
  delete editPayload.installmentsTotal;
  delete editPayload.installmentNumber;
  delete editPayload.notes;
  return editPayload;
}
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
  const { formatCurrency, currencySymbol } = useCurrencyFormatter();
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
  const [isSplitExpense, setIsSplitExpense] = useState(false);
  const [dependentShare, setDependentShare] = useState("");
  const [isInstallmentPurchase, setIsInstallmentPurchase] = useState(false);
  const [installmentCount, setInstallmentCount] = useState("2");
  const [isRecurring, setIsRecurring] = useState(
    isFixedMode ? true : (editingTransaction?.is_recurring ?? false),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mobileStep, setMobileStep] = useState<1 | 2>(1);
  const [pendingRecurringUpdate, setPendingRecurringUpdate] =
    useState<UpdateTransactionInput | null>(null);
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

  const selectedDependentName = useMemo(() => {
    const dependentName = dependents.find(
      (dependent) => dependent.id === selectedDependentId,
    )?.name;

    if (!dependentName) return "Gasto pessoal";
    return isSplitExpense ? `Você + ${dependentName}` : dependentName;
  }, [dependents, isSplitExpense, selectedDependentId]);

  const totalAmountPreview = useMemo(
    () => parseMoneyInput(amount),
    [amount],
  );
  const dependentShareAmount = useMemo(
    () => parseMoneyInput(dependentShare),
    [dependentShare],
  );
  const personalShareAmount =
    Number.isFinite(totalAmountPreview) && Number.isFinite(dependentShareAmount)
      ? Math.max(
          Number((totalAmountPreview - dependentShareAmount).toFixed(2)),
          0,
        )
      : 0;

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
    const totalAmount = parseMoneyInput(amount);
    const parsedInstallmentCount = Math.max(Number(installmentCount) || 2, 2);
    const shouldSplitExpense =
      !editingTransaction && isSplitExpense && Boolean(selectedDependentId);

    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      toast.error("Informe um valor maior que zero.");
      return;
    }

    if (
      shouldSplitExpense &&
      (!Number.isFinite(dependentShareAmount) ||
        dependentShareAmount <= 0 ||
        dependentShareAmount >= totalAmount)
    ) {
      toast.error("A parte do dependente deve ser menor que o valor total.");
      return;
    }

    if (
      transactionType === "card" &&
      isInstallmentPurchase &&
      parsedInstallmentCount > MAX_INSTALLMENTS
    ) {
      toast.error(`Parcele em no máximo ${MAX_INSTALLMENTS} vezes.`);
      return;
    }

    if (
      shouldSplitExpense &&
      transactionType === "card" &&
      isInstallmentPurchase &&
      (Math.round(dependentShareAmount * 100) < parsedInstallmentCount ||
        Math.round((totalAmount - dependentShareAmount) * 100) <
          parsedInstallmentCount)
    ) {
      toast.error(
        `Cada parte precisa ter ao menos ${formatCurrency(0.01)} por parcela.`,
      );
      return;
    }

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
      dependentId: shouldSplitExpense ? null : selectedDependentId || null,
      owner: "eu",
      dependentIds: shouldSplitExpense
        ? ["eu", selectedDependentId]
        : [selectedDependentId || "eu"],
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
    const splitGroupId = shouldSplitExpense ? crypto.randomUUID() : null;
    const ownershipShares = shouldSplitExpense
      ? [
          {
            key: "personal",
            amount: personalShareAmount,
            dependentId: null,
          },
          {
            key: "dependent",
            amount: dependentShareAmount,
            dependentId: selectedDependentId,
          },
        ]
      : [
          {
            key: selectedDependentId || "personal",
            amount: totalAmount,
            dependentId: selectedDependentId || null,
          },
        ];

    function withOwnership(
      payload: CreateTransactionInput,
      share: (typeof ownershipShares)[number],
      shareAmount = share.amount,
    ): CreateTransactionInput {
      return {
        ...payload,
        amount: shareAmount,
        dependentId: share.dependentId,
        dependentIds: shouldSplitExpense
          ? ["eu", selectedDependentId]
          : [share.dependentId || "eu"],
        splitGroupId,
      };
    }

    setIsSubmitting(true);

    try {
      if (editingTransaction) {
        if (
          editingTransaction.groupId &&
          (editingTransaction.is_recurring || isEditingInstallment)
        ) {
          setPendingRecurringUpdate(toEditPayload(transactionPayload));
          setIsSubmitting(false);
          return;
        }

        await updateTransaction(
          editingTransaction.id,
          toEditPayload(transactionPayload),
        );
      } else if (shouldCreateCreditCardSubscription) {
        const ownerStreams = ownershipShares.map((share) => ({
          ...share,
          groupId: crypto.randomUUID(),
        }));
        const subscriptionTransactions = Array.from(
          { length: 12 },
          (_, index) => {
            const subscriptionDate = addMonthsToDateOnly(normalizedDate, index);

            return ownerStreams.map((share) =>
              withOwnership(
                {
                  ...transactionPayload,
                  groupId: share.groupId,
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
                },
                share,
              ),
            );
          },
        ).flat();

        await addTransactions(subscriptionTransactions);
      } else if (
        transactionType === "card" &&
        isInstallmentPurchase &&
        parsedInstallmentCount >= 2
      ) {
        const groupIds = {
          personal: crypto.randomUUID(),
          dependent: crypto.randomUUID(),
        };
        const installmentTransactions = shouldSplitExpense
          ? splitInstallmentsByOwner(
              totalAmount,
              dependentShareAmount,
              parsedInstallmentCount,
            ).flatMap((split, index) =>
              ownershipShares.map((share) =>
                withOwnership(
                  {
                    ...transactionPayload,
                    groupId:
                      groupIds[share.key as keyof typeof groupIds] ??
                      groupIds.personal,
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
                  },
                  share,
                  share.key === "dependent"
                    ? split.dependentAmount
                    : split.personalAmount,
                ),
              ),
            )
          : splitAmountIntoInstallments(
              totalAmount,
              parsedInstallmentCount,
            ).map((installmentAmount, index): CreateTransactionInput => ({
              ...transactionPayload,
              groupId: groupIds.personal,
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
            }));

        await addTransactions(installmentTransactions);
      } else if (shouldCreateRecurringProjection) {
        const ownerStreams = ownershipShares.map((share) => ({
          ...share,
          groupId: crypto.randomUUID(),
        }));
        const recurringTransactions = Array.from({ length: 12 }, (_, index) =>
          ownerStreams.map((share) =>
            withOwnership(
              {
                ...transactionPayload,
                groupId: share.groupId,
                date: addMonthsToDateOnly(normalizedDate, index),
                status: "pending",
                is_recurring: true,
              },
              share,
            ),
          ),
        ).flat();

        await addTransactions(recurringTransactions);
      } else {
        const transactions = ownershipShares.map((share) =>
          withOwnership(transactionPayload, share),
        );

        if (transactions.length === 1) {
          await addTransaction(transactions[0]);
        } else {
          await addTransactions(transactions);
        }
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

  const inputClassName = fieldClassName("rose");
  const triggerClassName = selectTriggerClassName("rose");
  const switchClassName = accentSwitchClassName("rose");
  const parsedInstallments = Math.max(Number(installmentCount) || 2, 2);
  const categoryIcon = expenseCategories.find(
    (item) => item.label === category,
  )?.icon;
  const installmentDetail =
    transactionType === "card" && isInstallmentPurchase
      ? `${parsedInstallments}x de ${formatCurrency(
          Math.round((parsePreviewAmount(amount) / parsedInstallments) * 100) /
            100,
        )}`
      : undefined;
  const isReviewingGroup = Boolean(
    editingTransaction?.groupId &&
      (editingTransaction.is_recurring || isEditingInstallment),
  );

  function selectPaymentType(type: ExpenseTransactionType) {
    setTransactionType(type);

    if (type === "fixed") {
      setSelectedCardId("");
      setIsInstallmentPurchase(false);
    }
  }

  return (
    <ModalShell
      tour={isFixedMode ? "recurring-modal" : "transaction-modal"}
      focusId="transaction-amount"
      onSubmit={handleSubmit}
      stage={
        <ModalStage
          accent="rose"
          context={isFixedMode ? "Contas fixas e assinaturas" : "Lançamento"}
          title={
            editingTransaction
              ? isFixedMode
                ? "Editar recorrência"
                : "Editar despesa"
              : isFixedMode
                ? "Nova recorrência"
                : "Nova despesa"
          }
          description={
            isFixedMode
              ? "Uma cobrança que se repete todo mês, como aluguel ou streaming."
              : "Registre um gasto no PIX, débito ou cartão de crédito."
          }
          onClose={onClose}
          compact={
            <StageAmount
              label={isFixedMode ? "Por mês" : "Valor"}
              value={formatCurrency(parsePreviewAmount(amount))}
            />
          }
          footer={
            isFixedMode ? (
              <Segmented
                label="Tipo de recorrência"
                className="bg-black/25"
                value={transactionType}
                onChange={selectPaymentType}
                options={[
                  { value: "fixed", label: "Conta fixa", icon: Landmark },
                  { value: "card", label: "Assinatura", icon: CreditCard },
                ]}
              />
            ) : (
              <Segmented
                label="Tipo de lançamento"
                className="bg-black/25"
                value="expense"
                onChange={(value) => {
                  if (value === "income") onSelectIncome?.();
                }}
                options={[
                  { value: "expense", label: "Despesa", icon: ArrowDownLeft },
                  {
                    value: "income",
                    label: "Receita",
                    icon: ArrowUpRight,
                    disabled: !onSelectIncome || Boolean(editingTransaction),
                  },
                ]}
              />
            )
          }
        >
          <TransactionLivePreview
            type="expense"
            amount={amount}
            description={description}
            category={category}
            categoryIcon={categoryIcon}
            origin={
              transactionType === "card"
                ? selectedCard?.name || "Cartão de crédito"
                : "PIX / Débito"
            }
            owner={selectedDependentName}
            date={date}
            recurring={isFixedMode || isRecurring}
            detail={installmentDetail}
          />
        </ModalStage>
      }
    >
      <ModalBody>
        {pendingRecurringUpdate ? (
          <GroupScopeChooser
            title="Onde aplicar as mudanças?"
            description="Este lançamento faz parte de um grupo. Escolha até onde a alteração vale."
            disabled={isSubmitting}
            onSelect={(scope: GroupEditScope) => void saveGroupedUpdate(scope)}
            options={[
              {
                value: "single",
                label: "Somente este",
                description: "Os outros lançamentos ficam como estão.",
              },
              {
                value: "future",
                label: "Este e os próximos",
                description: "Os meses anteriores não mudam.",
                primary: true,
              },
              ...(isEditingInstallment
                ? [
                    {
                      value: "all" as const,
                      label: "Todas as parcelas",
                      description: "Inclui as parcelas que já passaram.",
                    },
                  ]
                : []),
            ]}
          />
        ) : (
          <fieldset disabled={isSubmitting} className="min-w-0">
            <MobileSteps
              step={mobileStep}
              labels={["O que foi", "Detalhes"]}
              accent="rose"
            />

            <div className={cn("space-y-6 md:block", mobileStep !== 1 && "hidden")}>
              <AmountInput
                id="transaction-amount"
                label={isFixedMode ? "Valor mensal" : "Valor"}
                accent="rose"
                currencySymbol={currencySymbol}
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                inputMode="decimal"
                placeholder="0,00"
                required
              />

              <Field label="Descrição" htmlFor="transaction-description">
                <Input
                  id="transaction-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder={
                    isFixedMode
                      ? "Ex.: Aluguel, internet, Netflix"
                      : "Ex.: Supermercado, farmácia"
                  }
                  autoComplete="off"
                  className={inputClassName}
                  required
                />
              </Field>
            </div>

            <div
              className={cn(
                "space-y-5 md:mt-7 md:block md:border-t md:border-white/[0.06] md:pt-6",
                mobileStep !== 2 && "hidden",
              )}
            >
              {!isFixedMode ? (
                <Field label="Forma de pagamento">
                  <Segmented
                    label="Forma de pagamento"
                    value={transactionType}
                    onChange={selectPaymentType}
                    options={[
                      { value: "fixed", label: "PIX ou débito", icon: Landmark },
                      { value: "card", label: "Cartão", icon: CreditCard },
                    ]}
                  />
                </Field>
              ) : null}

              {transactionType === "card" ? (
                <Field label={isFixedMode ? "Cobrada no cartão" : "Cartão utilizado"}>
                  <CardPicker
                    cards={cards}
                    value={selectedCardId}
                    onChange={setSelectedCardId}
                    accent="rose"
                  />
                </Field>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label={isFixedMode ? "Primeiro vencimento" : "Data"}
                  htmlFor="transaction-date"
                  icon={CalendarDays}
                >
                  <Input
                    id="transaction-date"
                    value={date}
                    onChange={(event) => setDate(event.target.value)}
                    type="date"
                    className={inputClassName}
                    required
                  />
                </Field>

                <Field label="Categoria" htmlFor="transaction-category" icon={Tag}>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger id="transaction-category" className={triggerClassName}>
                      <SelectValue placeholder="Categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {expenseCategories.map((item) => (
                        <SelectItem key={item.id} value={item.label}>
                          <CategoryGlyph name={item.icon} className="size-4 text-zinc-400" />
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <Field label="De quem é o gasto" htmlFor="transaction-owner" icon={UserRound}>
                <Select
                  value={selectedDependentId || "__no_dependent__"}
                  onValueChange={(nextValue) => {
                    const nextDependentId =
                      nextValue === "__no_dependent__" ? "" : nextValue;

                    setSelectedDependentId(nextDependentId);
                    if (!nextDependentId) {
                      setIsSplitExpense(false);
                      setDependentShare("");
                    }
                  }}
                >
                  <SelectTrigger id="transaction-owner" className={triggerClassName}>
                    <SelectValue placeholder="Gasto pessoal" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__no_dependent__">Gasto pessoal</SelectItem>
                    {dependents.map((dependent) => (
                      <SelectItem key={dependent.id} value={dependent.id}>
                        {dependent.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              {(!editingTransaction && selectedDependentId) ||
              showBehaviorSection ||
              isFixedMode ? (
                <OptionGroup>
                  {!editingTransaction && selectedDependentId ? (
                    <OptionRow
                      id="expense-split-toggle"
                      icon={UsersRound}
                      title="Dividir comigo"
                      description="Separe a sua parte da parte do dependente."
                      control={
                        <Switch
                          id="expense-split-toggle"
                          aria-label="Dividir gasto com dependente"
                          className={switchClassName}
                          checked={isSplitExpense}
                          onCheckedChange={(checked) => {
                            setIsSplitExpense(checked);
                            if (!checked) setDependentShare("");
                          }}
                        />
                      }
                    >
                      {isSplitExpense ? (
                        <div className="grid grid-cols-2 gap-3">
                          <Field
                            label={`Parte de ${selectedDependentName.replace("Você + ", "")}`}
                            htmlFor="dependent-share"
                          >
                            <Input
                              id="dependent-share"
                              value={dependentShare}
                              onChange={(event) => setDependentShare(event.target.value)}
                              inputMode="decimal"
                              placeholder="0,00"
                              className={inputClassName}
                            />
                          </Field>
                          <div>
                            <FieldLabel>Sua parte</FieldLabel>
                            <p className="flex h-11 items-center rounded-xl bg-white/[0.02] px-3.5 text-[15px] font-medium tabular-nums text-zinc-200 ring-1 ring-inset ring-white/[0.06]">
                              {formatCurrency(personalShareAmount)}
                            </p>
                          </div>
                        </div>
                      ) : null}
                    </OptionRow>
                  ) : null}

                  {isFixedMode ? (
                    <OptionRow
                      icon={Repeat2}
                      title="Repete todo mês"
                      description="Os próximos 12 meses entram como pendentes."
                    />
                  ) : showBehaviorSection ? (
                    <OptionRow
                      id="recurring-toggle"
                      icon={Repeat2}
                      title={
                        transactionType === "card"
                          ? "Assinatura recorrente"
                          : "Repetir todo mês"
                      }
                      description="Lança o mesmo valor nos próximos 12 meses."
                      control={
                        <Switch
                          id="recurring-toggle"
                          aria-label="Ativar recorrência"
                          className={switchClassName}
                          checked={isRecurring}
                          onCheckedChange={(checked) => {
                            setIsRecurring(checked);
                            if (checked) setIsInstallmentPurchase(false);
                          }}
                        />
                      }
                    />
                  ) : null}

                  {transactionType === "card" && !isFixedMode && !editingTransaction ? (
                    <OptionRow
                      id="installment-toggle"
                      icon={Layers3}
                      title="Compra parcelada"
                      description="Divide o valor entre as próximas faturas."
                      control={
                        <Switch
                          id="installment-toggle"
                          aria-label="Ativar parcelamento"
                          className={switchClassName}
                          checked={isInstallmentPurchase}
                          onCheckedChange={(checked) => {
                            setIsInstallmentPurchase(checked);
                            if (checked) setIsRecurring(false);
                          }}
                        />
                      }
                    >
                      {isInstallmentPurchase ? (
                        <div className="flex items-center justify-between gap-4">
                          <label htmlFor="installments" className="text-[13px] text-zinc-300">
                            Número de parcelas
                            {installmentDetail ? (
                              <span className="block text-xs tabular-nums text-zinc-500">
                                {installmentDetail}
                              </span>
                            ) : null}
                          </label>
                          <Input
                            id="installments"
                            value={installmentCount}
                            onChange={(event) => setInstallmentCount(event.target.value)}
                            type="number"
                            inputMode="numeric"
                            min={2}
                            max={MAX_INSTALLMENTS}
                            step={1}
                            className={cn(inputClassName, "w-24 text-center")}
                          />
                        </div>
                      ) : null}
                    </OptionRow>
                  ) : null}
                </OptionGroup>
              ) : null}
            </div>
          </fieldset>
        )}
      </ModalBody>

      <ModalFooter>
        {pendingRecurringUpdate ? (
          <SecondaryButton onClick={() => setPendingRecurringUpdate(null)}>
            Voltar aos campos
          </SecondaryButton>
        ) : (
          <>
            <SecondaryButton
              disabled={isSubmitting}
              onClick={mobileStep === 2 ? () => setMobileStep(1) : onClose}
            >
              <span className="md:hidden">
                {mobileStep === 2 ? "Voltar" : "Cancelar"}
              </span>
              <span className="hidden md:inline">Cancelar</span>
            </SecondaryButton>

            {mobileStep === 1 ? (
              <PrimaryButton
                type="button"
                accent="rose"
                onClick={() => setMobileStep(2)}
                className="md:hidden"
              >
                Continuar
              </PrimaryButton>
            ) : null}

            <PrimaryButton
              type="submit"
              accent="rose"
              icon={Check}
              loading={isSubmitting}
              loadingLabel="Salvando..."
              disabled={isSubmitting}
              className={cn(mobileStep === 1 && "hidden md:inline-flex")}
            >
              {isReviewingGroup
                ? "Revisar mudanças"
                : isFixedMode
                  ? "Salvar recorrência"
                  : "Salvar despesa"}
            </PrimaryButton>
          </>
        )}
      </ModalFooter>
    </ModalShell>
  );
}
