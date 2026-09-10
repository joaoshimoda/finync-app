"use client";

import { FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  CreditCard,
  Landmark,
  Layers3,
  ReceiptText,
  Save,
  Tag,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { normalizeDateOnly } from "@/lib/dateUtils";
import { parseCurrencyValue } from "@/lib/financeUtils";
import { cn } from "@/lib/utils";
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
}

function FieldLabel({
  icon: Icon,
  children,
}: {
  icon: typeof CalendarDays;
  children: ReactNode;
}) {
  return (
    <span className="mb-2 flex items-center gap-2 text-xs font-medium text-zinc-400">
      <Icon className="size-3.5 text-zinc-600" />
      {children}
    </span>
  );
}

function SectionHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-zinc-100">{title}</h3>
      <p className="mt-1 text-xs leading-5 text-zinc-500">{description}</p>
    </div>
  );
}

export function TransactionEditSheet({
  transaction,
  open,
  onOpenChange,
}: TransactionEditSheetProps) {
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

  function buildPayload(): UpdateTransactionInput | null {
    const normalizedDescription = description.trim();
    const parsedAmount = parseCurrencyValue(amount);

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

    return {
      description: normalizedDescription,
      amount: parsedAmount,
      date: normalizeDateOnly(date),
      category,
      type: isIncome ? "income" : origin,
      status: activeTransaction.status,
      cardId: !isIncome && origin === "card" ? cardId : null,
      dependentId: isIncome ? null : dependentId || null,
      dependentIds: isIncome
        ? activeTransaction.dependentIds
        : [dependentId || "eu"],
      is_recurring: activeTransaction.is_recurring,
      notes: activeTransaction.notes,
    };
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

      await fetchTransactions();
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
      <SheetContent className="max-w-none sm:w-[560px] sm:max-w-[560px]">
        <SheetHeader className="border-b border-white/[0.07] bg-zinc-950/95 px-5 py-5 pr-16 backdrop-blur-xl sm:px-7">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "flex size-8 items-center justify-center rounded-lg",
                isIncome
                  ? "bg-emerald-400/10 text-emerald-300"
                  : "bg-rose-400/10 text-rose-300",
              )}
            >
              {isIncome ? (
                <ArrowUpRight className="size-4" />
              ) : (
                <ArrowDownRight className="size-4" />
              )}
            </span>
            <Badge
              variant="outline"
              className="border-white/[0.08] bg-white/[0.035] text-zinc-400"
            >
              {isIncome ? "Receita" : "Despesa"}
            </Badge>
            {installmentsTotal > 1 ? (
              <Badge
                variant="outline"
                className="border-violet-400/15 bg-violet-400/[0.07] text-violet-300"
              >
                {installmentNumber}/{installmentsTotal}
              </Badge>
            ) : null}
          </div>
          <SheetTitle className="mt-2 text-2xl">Editar movimentação</SheetTitle>
          <SheetDescription>
            Altere somente o necessário. Nenhuma informação é salva até a confirmação.
          </SheetDescription>
        </SheetHeader>

        <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
          <div className="min-h-0 flex-1 space-y-7 overflow-y-auto px-5 py-6 [scrollbar-width:thin] [scrollbar-color:#3f3f46_transparent] sm:px-7">
            <fieldset
              disabled={Boolean(pendingPayload)}
              className="space-y-7 disabled:opacity-50"
            >
              <section className="rounded-xl border border-white/[0.07] bg-zinc-900/45 p-4 sm:p-5">
                <FieldLabel icon={ReceiptText}>Valor</FieldLabel>
                <div className="relative">
                  <span className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 text-lg font-medium text-zinc-600">
                    R$
                  </span>
                  <Input
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    inputMode="decimal"
                    className={cn(
                      "h-14 rounded-none border-0 border-b border-white/[0.08] bg-transparent pl-9 pr-0 text-3xl font-semibold tracking-tight shadow-none focus-visible:border-emerald-500/50 focus-visible:ring-0",
                      isIncome ? "text-emerald-300" : "text-zinc-50",
                    )}
                    aria-label="Valor"
                    required
                  />
                </div>
              </section>

              <section className="space-y-4">
                <SectionHeading
                  title="Informações principais"
                  description="Identifique o lançamento e sua competência."
                />
                <label className="block">
                  <FieldLabel icon={ReceiptText}>Descrição</FieldLabel>
                  <Input
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    className="h-12 border-white/[0.08] bg-zinc-900/45 px-4"
                    required
                  />
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <FieldLabel icon={CalendarDays}>Data</FieldLabel>
                    <Input
                      value={date}
                      onChange={(event) => setDate(event.target.value)}
                      type="date"
                      className="h-12 border-white/[0.08] bg-zinc-900/45 [color-scheme:dark]"
                      required
                    />
                  </label>
                  <div>
                    <FieldLabel icon={Tag}>Categoria</FieldLabel>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger className="h-12 border-white/[0.08] bg-zinc-900/45">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableCategories.map((item) => (
                          <SelectItem key={item.id} value={item.label}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </section>

              {!isIncome ? (
                <section className="space-y-4 border-t border-white/[0.07] pt-6">
                  <SectionHeading
                    title="Origem e responsável"
                    description="Defina de onde saiu o dinheiro e a quem pertence o gasto."
                  />
                  <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/[0.07] bg-zinc-900/35 p-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setOrigin("fixed");
                        setCardId("");
                      }}
                      className={cn(
                        "flex min-h-12 items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors",
                        origin === "fixed"
                          ? "bg-zinc-100 text-zinc-950"
                          : "text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-200",
                      )}
                    >
                      <Landmark className="size-4" />
                      Débito / PIX
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrigin("card")}
                      className={cn(
                        "flex min-h-12 items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors",
                        origin === "card"
                          ? "bg-zinc-100 text-zinc-950"
                          : "text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-200",
                      )}
                    >
                      <CreditCard className="size-4" />
                      Cartão
                    </button>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    {origin === "card" ? (
                      <div>
                        <FieldLabel icon={CreditCard}>Cartão utilizado</FieldLabel>
                        <Select value={cardId} onValueChange={setCardId}>
                          <SelectTrigger className="h-12 border-white/[0.08] bg-zinc-900/45">
                            <SelectValue placeholder="Selecione" />
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
                    ) : (
                      <div className="hidden sm:block" />
                    )}
                    <div>
                      <FieldLabel icon={UserRound}>Responsável</FieldLabel>
                      <Select
                        value={dependentId || "__personal__"}
                        onValueChange={(value) =>
                          setDependentId(value === "__personal__" ? "" : value)
                        }
                      >
                        <SelectTrigger className="h-12 border-white/[0.08] bg-zinc-900/45">
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
                    </div>
                  </div>
                </section>
              ) : null}

              {transaction.is_recurring || installmentsTotal > 1 ? (
                <section className="flex gap-3 rounded-xl border border-violet-400/15 bg-violet-400/[0.055] p-4">
                  <Layers3 className="mt-0.5 size-4 shrink-0 text-violet-300" />
                  <div>
                    <p className="text-sm font-medium text-zinc-200">
                      {installmentsTotal > 1
                        ? `Parcela ${installmentNumber} de ${installmentsTotal}`
                        : "Lançamento recorrente"}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-zinc-500">
                      Ao salvar, você poderá escolher se a alteração afeta apenas este item ou também o restante do grupo.
                    </p>
                  </div>
                </section>
              ) : null}
            </fieldset>

            {pendingPayload ? (
              <section className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.055] p-4">
                <SectionHeading
                  title="Onde aplicar a alteração?"
                  description="Escolha quais lançamentos receberão a mudança. As demais datas serão preservadas."
                />
                <div className="mt-4 grid gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 justify-start border-white/[0.09] bg-transparent"
                    disabled={isSubmitting}
                    onClick={() => void persist(pendingPayload, "single")}
                  >
                    Somente esta movimentação
                  </Button>
                  <Button
                    type="button"
                    className="h-11 justify-start bg-emerald-600 text-white hover:bg-emerald-700"
                    disabled={isSubmitting}
                    onClick={() => void persist(pendingPayload, "future")}
                  >
                    Esta e as próximas
                  </Button>
                  {installmentsTotal > 1 ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 justify-start border-white/[0.09] bg-transparent"
                      disabled={isSubmitting}
                      onClick={() => void persist(pendingPayload, "all")}
                    >
                      Todas as parcelas
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-10 text-zinc-500"
                    disabled={isSubmitting}
                    onClick={() => setPendingPayload(null)}
                  >
                    Voltar aos campos
                  </Button>
                </div>
              </section>
            ) : null}
          </div>

          <footer className="flex gap-3 border-t border-white/[0.07] bg-zinc-950/95 px-5 py-4 backdrop-blur-xl sm:px-7">
            <Button
              type="button"
              variant="ghost"
              className="h-11 flex-1 text-zinc-400"
              disabled={isSubmitting}
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="h-11 flex-[1.4] bg-emerald-600 text-white hover:bg-emerald-700"
              disabled={isSubmitting || Boolean(pendingPayload)}
            >
              <Save className="size-4" />
              {isSubmitting
                ? "Salvando..."
                : requiresScope
                  ? "Revisar mudanças"
                  : "Salvar alterações"}
            </Button>
          </footer>
        </form>
      </SheetContent>
    </Sheet>
  );
}
