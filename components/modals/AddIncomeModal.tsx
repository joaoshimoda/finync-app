"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarDays,
  Check,
  ReceiptText,
  Repeat2,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";

import { CategoryGlyph } from "@/components/finance/categoryIcons";
import {
  AmountInput,
  Field,
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
import { getLocalTodayDateOnly, normalizeDateOnly } from "@/lib/dateUtils";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import {
  RECURRING_INCOME_NOTE,
  VARIABLE_INCOME_NOTE,
  isVariableIncome,
} from "@/lib/incomeRecurrence";
import { parseMoneyInput } from "@/lib/moneyInput";
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
  const { currencySymbol, formatCurrency } = useCurrencyFormatter();
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

      /* The store already holds the saved rows; refresh the rest in the
         background so the modal closes as soon as the save is confirmed. */
      void fetchTransactions({ quiet: true });
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

    const parsedAmount = parseMoneyInput(amount);

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast.error("Informe um valor maior que zero.");
      return;
    }

    const incomePayload: CreateTransactionInput = {
      description: description.trim(),
      amount: parsedAmount,
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

      /* The store already holds the saved rows; refresh the rest in the
         background so the modal closes as soon as the save is confirmed. */
      void fetchTransactions({ quiet: true });
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

  const inputClassName = fieldClassName("emerald");
  const triggerClassName = selectTriggerClassName("emerald");
  const switchClassName = accentSwitchClassName("emerald");
  const categoryIcon = incomeCategories.find(
    (item) => item.label === category,
  )?.icon;

  return (
    <ModalShell
      tour="income-modal"
      focusId="income-amount"
      onSubmit={handleSubmit}
      stage={
        <ModalStage
          accent="emerald"
          context="Lançamento"
          title={editingTransaction ? "Editar receita" : "Nova receita"}
          description="Salário, freelas, reembolsos: tudo o que entra na sua conta."
          onClose={onClose}
          compact={
            <StageAmount
              label="Valor"
              value={formatCurrency(parsePreviewAmount(amount))}
            />
          }
          footer={
            <Segmented
              label="Tipo de lançamento"
              className="bg-black/25"
              value="income"
              onChange={(value) => {
                if (value === "expense") onSelectExpense?.();
              }}
              options={[
                {
                  value: "expense",
                  label: "Despesa",
                  icon: ArrowDownLeft,
                  disabled: !onSelectExpense || Boolean(editingTransaction),
                },
                { value: "income", label: "Receita", icon: ArrowUpRight },
              ]}
            />
          }
        >
          <TransactionLivePreview
            type="income"
            amount={amount}
            description={description}
            category={category}
            categoryIcon={categoryIcon}
            origin={
              repeatMonthly
                ? isVariableValue
                  ? "valor variável"
                  : "todo mês"
                : "entrada única"
            }
            owner="Entrada pessoal"
            date={date}
            recurring={repeatMonthly}
          />
        </ModalStage>
      }
    >
      <ModalBody>
        {pendingRecurringUpdate ? (
          <GroupScopeChooser
            title="Onde aplicar as mudanças?"
            description="Esta receita se repete todo mês. Escolha até onde a alteração vale."
            disabled={isSubmitting}
            onSelect={(scope: GroupEditScope) => void saveGroupedUpdate(scope)}
            options={[
              {
                value: "single",
                label: "Somente esta",
                description: "As outras receitas ficam como estão.",
              },
              {
                value: "future",
                label: "Esta e as próximas",
                description: "Os meses anteriores não mudam.",
                primary: true,
              },
              {
                value: "all",
                label: "Todas",
                description: "Inclui os meses que já passaram.",
              },
            ]}
          />
        ) : (
          <fieldset disabled={isSubmitting} className="min-w-0">
            <MobileSteps
              step={mobileStep}
              labels={["O que entrou", "Detalhes"]}
              accent="emerald"
            />

            <div className={cn("space-y-6 md:block", mobileStep !== 1 && "hidden")}>
              <AmountInput
                id="income-amount"
                label="Valor"
                accent="emerald"
                currencySymbol={currencySymbol}
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                inputMode="decimal"
                placeholder="0,00"
                required
              />

              <Field label="Descrição" htmlFor="income-description">
                <Input
                  id="income-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Ex.: Salário, projeto, reembolso"
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
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Data" htmlFor="income-date" icon={CalendarDays}>
                  <Input
                    id="income-date"
                    value={date}
                    onChange={(event) => setDate(event.target.value)}
                    type="date"
                    className={inputClassName}
                    required
                  />
                </Field>
                <Field label="Categoria" htmlFor="income-category" icon={ReceiptText}>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger id="income-category" className={triggerClassName}>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {incomeCategories.map((incomeCategory) => (
                        <SelectItem key={incomeCategory.id} value={incomeCategory.label}>
                          <CategoryGlyph
                            name={incomeCategory.icon}
                            className="size-4 text-zinc-400"
                          />
                          {incomeCategory.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <OptionGroup>
                <OptionRow
                  id="income-repeat-monthly"
                  icon={Repeat2}
                  title="Repetir todo mês"
                  description="Lança a mesma receita nos próximos 12 meses."
                  control={
                    <Switch
                      id="income-repeat-monthly"
                      className={switchClassName}
                      checked={repeatMonthly}
                      onCheckedChange={setRepeatMonthly}
                    />
                  }
                />
                <OptionRow
                  id="income-variable-value"
                  icon={SlidersHorizontal}
                  title="Valor muda todo mês"
                  description="Fica pendente até você confirmar o valor recebido."
                  control={
                    <Switch
                      id="income-variable-value"
                      className={switchClassName}
                      checked={isVariableValue}
                      onCheckedChange={(checked) => {
                        setIsVariableValue(checked);
                        if (checked) setRepeatMonthly(true);
                      }}
                    />
                  }
                />
              </OptionGroup>
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
                accent="emerald"
                onClick={() => setMobileStep(2)}
                className="md:hidden"
              >
                Continuar
              </PrimaryButton>
            ) : null}
            <PrimaryButton
              type="submit"
              accent="emerald"
              icon={Check}
              loading={isSubmitting}
              loadingLabel="Salvando..."
              disabled={isSubmitting}
              className={cn(mobileStep === 1 && "hidden md:inline-flex")}
            >
              {editingTransaction?.groupId && editingTransaction.is_recurring
                ? "Revisar mudanças"
                : "Salvar receita"}
            </PrimaryButton>
          </>
        )}
      </ModalFooter>
    </ModalShell>
  );
}
