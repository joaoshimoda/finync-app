"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  CreditCard,
  Landmark,
  Layers3,
  Repeat2,
  Save,
  Tag,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import { CategoryGlyph } from "@/components/finance/categoryIcons";
import {
  AmountInput,
  CardPicker,
  Field,
  GroupScopeChooser,
  ModalNote,
  PrimaryButton,
  SecondaryButton,
  Segmented,
  fieldClassName,
  getStageBackground,
  selectTriggerClassName,
} from "@/components/modals/ModalKit";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { normalizeDateOnly } from "@/lib/dateUtils";
import { parseCurrencyValue } from "@/lib/financeUtils";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import {
  useFinanceStore,
  type Transaction,
  type UpdateTransactionInput,
} from "@/store/useFinanceStore";

type ExpenseOrigin = "fixed" | "card";
type GroupEditScope = "single" | "future" | "all";

interface TransactionEditSheetProps {
  transaction: Transaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => Promise<void> | void;
}

export function TransactionEditSheet({
  transaction,
  open,
  onOpenChange,
  onSaved,
}: TransactionEditSheetProps) {
  const { currencySymbol } = useCurrencyFormatter();
  const cards = useFinanceStore((state) => state.cards);
  const dependents = useFinanceStore((state) => state.dependents);
  const categories = useFinanceStore((state) => state.categories);
  const fetchCards = useFinanceStore((state) => state.fetchCards);
  const fetchCategories = useFinanceStore((state) => state.fetchCategories);
  const fetchDependents = useFinanceStore((state) => state.fetchDependents);
  const fetchTransactions = useFinanceStore((state) => state.fetchTransactions);
  const updateTransaction = useFinanceStore((state) => state.updateTransaction);
  const updateTransactionGroup = useFinanceStore(
    (state) => state.updateTransactionGroup,
  );

  const [description, setDescription] = useState(transaction?.description ?? "");
  const [amount, setAmount] = useState(
    transaction ? String(transaction.amount).replace(".", ",") : "",
  );
  const [date, setDate] = useState(
    transaction ? normalizeDateOnly(transaction.date) : "",
  );
  const [category, setCategory] = useState(transaction?.category ?? "Outros");
  const [origin, setOrigin] = useState<ExpenseOrigin>(
    transaction?.type === "card" ? "card" : "fixed",
  );
  const [cardId, setCardId] = useState(transaction?.cardId ?? "");
  const [dependentId, setDependentId] = useState(
    transaction?.dependentId ?? "",
  );
  const [pendingPayload, setPendingPayload] =
    useState<UpdateTransactionInput | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !transaction) return;

    void Promise.all([fetchCards(), fetchCategories(), fetchDependents()]);
  }, [
    fetchCards,
    fetchCategories,
    fetchDependents,
    open,
    transaction,
  ]);

  const availableCategories = useMemo(
    () =>
      categories.filter((item) =>
        transaction?.type === "income"
          ? item.kind === "income"
          : item.kind === "expense",
      ),
    [categories, transaction?.type],
  );

  if (!transaction) return null;

  const activeTransaction = transaction;
  const isIncome = activeTransaction.type === "income";
  const installmentsTotal =
    activeTransaction.installmentsTotal ?? activeTransaction.installments ?? 1;
  const installmentNumber =
    activeTransaction.installmentNumber ??
    activeTransaction.current_installment ??
    1;
  const requiresScope =
    Boolean(activeTransaction.groupId) &&
    (activeTransaction.is_recurring === true || installmentsTotal > 1);
  const accent = isIncome ? "emerald" : "rose";
  const inputClassName = fieldClassName(accent);
  const triggerClassName = selectTriggerClassName(accent);

  function buildPayload(): UpdateTransactionInput | null {
    const normalizedDescription = description.trim();
    const parsedAmount = parseCurrencyValue(amount);
    const normalizedDate = normalizeDateOnly(date);
    const nextType = isIncome ? "income" : origin;
    const nextCardId = !isIncome && origin === "card" ? cardId : null;
    const nextDependentId = isIncome ? null : dependentId || null;

    if (!normalizedDescription) {
      toast.error("Informe uma descrição.");
      return null;
    }

    if (!parsedAmount) {
      toast.error("Informe um valor maior que zero.");
      return null;
    }

    if (!date) {
      toast.error("Informe a data do lançamento.");
      return null;
    }

    if (!isIncome && origin === "card" && !cardId) {
      toast.error("Selecione o cartão utilizado.");
      return null;
    }

    const payload: UpdateTransactionInput = {};

    if (normalizedDescription !== activeTransaction.description) {
      payload.description = normalizedDescription;
    }

    if (parsedAmount !== activeTransaction.amount) {
      payload.amount = parsedAmount;
    }

    if (normalizedDate !== normalizeDateOnly(activeTransaction.date)) {
      payload.date = normalizedDate;
    }

    if (category !== activeTransaction.category) {
      payload.category = category;
    }

    if (nextType !== activeTransaction.type) {
      payload.type = nextType;
      payload.cardId = nextCardId;
    } else if ((nextCardId ?? null) !== (activeTransaction.cardId ?? null)) {
      payload.cardId = nextCardId;
    }

    if (
      (nextDependentId ?? null) !==
      (activeTransaction.dependentId ?? null)
    ) {
      payload.dependentId = nextDependentId;
      payload.dependentIds = isIncome ? ["eu"] : [nextDependentId || "eu"];
    }

    if (!Object.keys(payload).length) {
      toast.info("Nenhuma alteração para salvar.");
      return null;
    }

    return payload;
  }

  async function persist(payload: UpdateTransactionInput, scope: GroupEditScope) {
    setIsSubmitting(true);

    try {
      if (scope !== "single" && activeTransaction.groupId) {
        await updateTransactionGroup(
          activeTransaction.groupId,
          activeTransaction.date,
          payload,
          scope,
        );
      } else {
        await updateTransaction(activeTransaction.id, payload);
      }

      if (onSaved) {
        await onSaved();
      } else {
        await fetchTransactions();
      }
      toast.success(
        scope === "all"
          ? "Todo o grupo foi atualizado."
          : scope === "future"
            ? "Este lançamento e os próximos foram atualizados."
            : "Movimentação atualizada.",
      );
      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao atualizar movimentação:", error);
      toast.error("Não foi possível salvar a alteração.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    const payload = buildPayload();
    if (!payload) return;

    if (requiresScope) {
      setPendingPayload(payload);
      return;
    }

    void persist(payload, "single");
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="max-w-none sm:w-[540px] sm:max-w-[540px]">
        <header
          className="relative shrink-0 border-b border-white/[0.06] px-5 pb-5 pt-6 sm:px-7"
          style={{ background: getStageBackground(accent) }}
        >
          <div className="flex flex-wrap items-center gap-2 pr-12">
            <span className="flex items-center gap-1.5 rounded-full bg-black/25 px-2.5 py-1 text-xs font-medium text-white/80 ring-1 ring-inset ring-white/10">
              {isIncome ? (
                <ArrowUpRight className="size-3.5" />
              ) : (
                <ArrowDownRight className="size-3.5" />
              )}
              {isIncome ? "Receita" : "Despesa"}
            </span>
            {installmentsTotal > 1 ? (
              <span className="rounded-full bg-black/25 px-2.5 py-1 text-xs font-medium tabular-nums text-white/80 ring-1 ring-inset ring-white/10">
                Parcela {installmentNumber} de {installmentsTotal}
              </span>
            ) : transaction.is_recurring ? (
              <span className="flex items-center gap-1.5 rounded-full bg-black/25 px-2.5 py-1 text-xs font-medium text-white/80 ring-1 ring-inset ring-white/10">
                <Repeat2 className="size-3.5" />
                Recorrente
              </span>
            ) : null}
          </div>
          <SheetTitle className="mt-3 truncate pr-0 text-2xl tracking-[-0.02em] text-white">
            {pendingPayload ? "Onde aplicar?" : "Editar lançamento"}
          </SheetTitle>
          <SheetDescription className="mt-1 text-[13px] leading-5 text-white/60">
            {pendingPayload
              ? "Este lançamento faz parte de um grupo."
              : "Nada é salvo até você confirmar."}
          </SheetDescription>
        </header>

        <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 [scrollbar-width:thin] [scrollbar-color:#3f3f46_transparent] sm:px-7">
            {pendingPayload ? (
              <GroupScopeChooser
                title="Até onde vale a alteração?"
                description="Escolha quais lançamentos recebem a mudança. As datas dos outros meses são preservadas."
                disabled={isSubmitting}
                onSelect={(scope: GroupEditScope) => void persist(pendingPayload, scope)}
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
                  ...(installmentsTotal > 1
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
              <fieldset disabled={isSubmitting} className="min-w-0 space-y-6">
                <AmountInput
                  id="edit-transaction-amount"
                  label="Valor"
                  accent={accent}
                  currencySymbol={currencySymbol}
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  inputMode="decimal"
                  required
                />

                <Field label="Descrição" htmlFor="edit-transaction-description">
                  <Input
                    id="edit-transaction-description"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    autoComplete="off"
                    className={inputClassName}
                    required
                  />
                </Field>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Data" htmlFor="edit-transaction-date" icon={CalendarDays}>
                    <Input
                      id="edit-transaction-date"
                      value={date}
                      onChange={(event) => setDate(event.target.value)}
                      type="date"
                      className={inputClassName}
                      required
                    />
                  </Field>
                  <Field label="Categoria" htmlFor="edit-transaction-category" icon={Tag}>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger id="edit-transaction-category" className={triggerClassName}>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableCategories.map((item) => (
                          <SelectItem key={item.id} value={item.label}>
                            <CategoryGlyph name={item.icon} className="size-4 text-zinc-400" />
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>

                {!isIncome ? (
                  <div className="space-y-5 border-t border-white/[0.06] pt-6">
                    <Field label="Forma de pagamento">
                      <Segmented
                        label="Forma de pagamento"
                        value={origin}
                        onChange={(value) => {
                          setOrigin(value);
                          if (value === "fixed") setCardId("");
                        }}
                        options={[
                          { value: "fixed", label: "PIX ou débito", icon: Landmark },
                          { value: "card", label: "Cartão", icon: CreditCard },
                        ]}
                      />
                    </Field>

                    {origin === "card" ? (
                      <Field label="Cartão utilizado">
                        <CardPicker
                          cards={cards}
                          value={cardId}
                          onChange={setCardId}
                          accent={accent}
                        />
                      </Field>
                    ) : null}

                    <Field label="De quem é o gasto" htmlFor="edit-transaction-owner" icon={UserRound}>
                      <Select
                        value={dependentId || "__personal__"}
                        onValueChange={(value) =>
                          setDependentId(value === "__personal__" ? "" : value)
                        }
                      >
                        <SelectTrigger id="edit-transaction-owner" className={triggerClassName}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__personal__">Gasto pessoal</SelectItem>
                          {dependents.map((dependent) => (
                            <SelectItem key={dependent.id} value={dependent.id}>
                              {dependent.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>
                ) : null}

                {transaction.is_recurring || installmentsTotal > 1 ? (
                  <ModalNote
                    icon={Layers3}
                    title={
                      installmentsTotal > 1
                        ? `Parcela ${installmentNumber} de ${installmentsTotal}`
                        : "Lançamento recorrente"
                    }
                  >
                    Ao salvar, você escolhe se a mudança vale só para este
                    lançamento ou também para os outros do grupo.
                  </ModalNote>
                ) : null}
              </fieldset>
            )}
          </div>

          <footer className="flex shrink-0 gap-2 border-t border-white/[0.06] px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-7">
            {pendingPayload ? (
              <SecondaryButton
                disabled={isSubmitting}
                onClick={() => setPendingPayload(null)}
                className="md:flex-1"
              >
                Voltar aos campos
              </SecondaryButton>
            ) : (
              <>
                <SecondaryButton
                  disabled={isSubmitting}
                  onClick={() => onOpenChange(false)}
                  className="md:flex-1"
                >
                  Cancelar
                </SecondaryButton>
                <PrimaryButton
                  type="submit"
                  accent={accent}
                  icon={Save}
                  loading={isSubmitting}
                  loadingLabel="Salvando..."
                  disabled={isSubmitting}
                  className="md:flex-[1.4]"
                >
                  {requiresScope ? "Revisar mudanças" : "Salvar alterações"}
                </PrimaryButton>
              </>
            )}
          </footer>
        </form>
      </SheetContent>
    </Sheet>
  );
}
