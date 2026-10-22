"use client";

import { KeyboardEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  CreditCard,
  Edit3,
  Gauge,
  ListFilter,
  PlusCircle,
  Receipt,
  RotateCcw,
  Search,
  Trash2,
  UsersRound,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { AddCardModal } from "@/components/modals/AddCardModal";
import { PayInvoiceModal } from "@/components/modals/PayInvoiceModal";
import { TransactionDescription } from "@/components/finance/TransactionDescription";
import { MobileTransactionItem } from "@/components/finance/MobileTransactionItem";
import { AnimatedMonthSelector } from "@/components/finance/AnimatedMonthSelector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getCardGradient } from "@/lib/cardUtils";
import { getCardInvoiceCycle } from "@/lib/cardBilling";
import {
  formatDateOnlyBR,
  getLocalTodayDateOnly,
  toDateOnly,
} from "@/lib/dateUtils";
import {
  calculateCardDebt,
  getCardSignedAmount,
  isCardCreditAdjustment,
  shouldCountCardCharge,
} from "@/lib/cardCredits";
import { cn } from "@/lib/utils";
import { isTransactionInSelectedCompetence } from "@/lib/transactionPeriod";
import { getTransactionStatusPresentation } from "@/lib/transactionStatus";
import {
  useFinanceStore,
  type Card as FinanceCard,
  type CardInvoice,
  type Dependent,
  type Transaction,
} from "@/store/useFinanceStore";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";

interface InvoiceBreakdown {
  personal: number;
  dependents: Array<{
    id: string;
    name: string;
    total: number;
  }>;
}

type TransactionViewFilter =
  | "all"
  | "purchase"
  | "subscription"
  | "installment"
  | "last-installment"
  | "scheduled"
  | "dependent"
  | "credit";

function getInstallmentProgress(transaction: Transaction) {
  const current =
    transaction.installmentNumber ?? transaction.current_installment ?? 1;
  const total = transaction.installmentsTotal ?? transaction.installments ?? 1;

  return { current, total };
}

function getInvoiceBreakdown(
  transactions: Transaction[],
  dependents: Dependent[],
): InvoiceBreakdown {
  const dependentTotals = new Map<string, number>();
  let personal = 0;

  transactions.forEach((transaction) => {
    const amount = getCardSignedAmount(transaction);

    if (!transaction.dependentId) {
      personal += amount;
      return;
    }

    dependentTotals.set(
      transaction.dependentId,
      (dependentTotals.get(transaction.dependentId) ?? 0) + amount,
    );
  });

  return {
    personal,
    dependents: [...dependentTotals.entries()]
      .map(([dependentId, total]) => ({
        id: dependentId,
        name:
          dependents.find((dependent) => dependent.id === dependentId)?.name ??
          "Dependente",
        total,
      }))
      .sort((left, right) => right.total - left.total),
  };
}

function TopCategories({ transactions }: { transactions: Transaction[] }) {
  const hideBalancesByDefault = useFinanceStore(
    (state) => state.hideBalancesByDefault,
  );
  const { formatCurrency, hiddenCurrencyLabel } = useCurrencyFormatter();
  const formatPrivateCurrency = (value: number) =>
    hideBalancesByDefault ? hiddenCurrencyLabel : formatCurrency(value);
  const categories = useMemo(() => {
    const totals = new Map<string, number>();

    transactions.forEach((transaction) => {
      if (isCardCreditAdjustment(transaction)) return;

      const amount = getCardSignedAmount(transaction);
      if (amount <= 0) return;

      const category = transaction.category?.trim() || "Outros";
      totals.set(category, (totals.get(category) ?? 0) + amount);
    });

    return Array.from(totals, ([name, total]) => ({ name, total }))
      .filter((category) => category.total > 0)
      .sort((left, right) => right.total - left.total)
      .slice(0, 5);
  }, [transactions]);

  return (
    <section className="mb-3 min-w-0 border-b border-border/50 pb-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium text-foreground">
          Gastos por categoria
        </h3>
        <span className="text-xs text-muted-foreground">
          {categories.length} {categories.length === 1 ? "categoria" : "categorias"}
        </span>
      </div>

      {categories.length ? (
        <div className="mt-2 flex min-w-0 flex-row items-center gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {categories.map((category) => (
            <div
              key={category.name}
              className="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border border-zinc-800 bg-zinc-900/80 px-3 py-1.5 text-xs"
            >
              <span className="text-zinc-400">{category.name}</span>
              <strong className="font-medium text-zinc-100">
                {formatPrivateCurrency(category.total)}
              </strong>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">
          Nenhum gasto categorizado nesta fatura.
        </p>
      )}
    </section>
  );
}

function FlippableManagedCard({
  card,
  availableLimit,
  invoiceTotal,
  invoiceBreakdown,
  limitUsage,
  isSelected,
  onSelect,
  onKeyDown,
  onEdit,
  onDelete,
  onPayInvoice,
  invoiceMonthStart,
  invoice,
}: {
  card: FinanceCard;
  availableLimit: number;
  invoiceTotal: number;
  invoiceBreakdown: InvoiceBreakdown;
  limitUsage: number;
  isSelected: boolean;
  onSelect: (cardId: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>, cardId: string) => void;
  onEdit: (card: FinanceCard) => void;
  onDelete: (card: FinanceCard) => void;
  onPayInvoice: (invoice: CardInvoice, cardName: string) => void;
  invoiceMonthStart: string;
  invoice?: CardInvoice;
}) {
  const [isFlipped, setIsFlipped] = useState(false);
  const hideBalancesByDefault = useFinanceStore(
    (state) => state.hideBalancesByDefault,
  );
  const { formatCurrency, hiddenCurrencyLabel } = useCurrencyFormatter();
  const formatPrivateCurrency = (value: number) =>
    hideBalancesByDefault ? hiddenCurrencyLabel : formatCurrency(value);
  const fallbackCycle = getCardInvoiceCycle(invoiceMonthStart, card.closingDay);
  const invoiceCycle = invoice
    ? { startDate: invoice.cycleStart, endDate: invoice.cycleEnd }
    : fallbackCycle;
  const cycleLabel = `${formatDateOnlyBR(invoiceCycle.startDate)} - ${formatDateOnlyBR(invoiceCycle.endDate)}`;
  const invoiceStatusLabel = invoice
    ? {
        open: "Aberta",
        closed: "Fechada",
        partially_paid: "Parcialmente paga",
        paid: "Paga",
      }[invoice.status]
    : "Sem lançamentos";

  return (
    <div className="aspect-[1.586/1] h-auto min-h-[205px] w-full max-w-[360px] perspective-[1000px]">
      <div
        className={cn(
          "relative h-full w-full transition-all duration-500 [transform-style:preserve-3d]",
          isFlipped && "[transform:rotateY(180deg)]",
        )}
      >
        <div
          role="button"
          tabIndex={0}
          onClick={() => onSelect(card.id)}
          onKeyDown={(event) => onKeyDown(event, card.id)}
          className={cn(
            "absolute inset-0 cursor-pointer overflow-hidden rounded-xl border p-4 text-left text-white shadow-lg shadow-black/20 transition-colors sm:p-5 [backface-visibility:hidden]",
            getCardGradient(card.name, card.color),
            isSelected
              ? "border-emerald-300/55 ring-2 ring-emerald-400/15"
              : "border-white/10 hover:border-white/25",
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="mb-4 h-7 w-10 rounded-md border border-white/25 bg-white/20 shadow-inner" />
              <h2 className="max-w-48 truncate text-base font-semibold text-white">
                {card.name}
              </h2>
            </div>

            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setIsFlipped(true);
              }}
              className="inline-flex size-9 items-center justify-center rounded-lg border border-white/15 bg-black/10 text-white/70 transition hover:bg-white/15 hover:text-white"
              aria-label={`Virar cartão ${card.name}`}
            >
              <RotateCcw className="size-4" />
            </button>
          </div>

          <div className="mt-7 flex items-end justify-between gap-3">
            <div className="space-y-1 text-[11px] text-white/60">
              <p>{cycleLabel}</p>
              <p>
                {invoice?.dueDate
                  ? `Vence ${formatDateOnlyBR(invoice.dueDate)}`
                  : card.dueDay
                    ? `Vence dia ${card.dueDay}`
                    : "Sem vencimento"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-medium uppercase tracking-wide text-white/55">
                Disponível
              </p>
              <strong className="mt-1 block text-xl font-semibold tracking-normal">
                {formatPrivateCurrency(availableLimit)}
              </strong>
              {card.limitAmount ? (
                <p className="mt-1 text-[11px] text-white/55">
                  {limitUsage.toFixed(0)}% usado
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <div
          className={cn(
            "absolute inset-0 flex flex-col justify-between overflow-hidden rounded-xl border border-emerald-300/55 p-4 text-white shadow-lg shadow-black/20 sm:p-5 [backface-visibility:hidden] [transform:rotateY(180deg)]",
            getCardGradient(card.name, card.color),
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wide text-white/60">
                Fatura atual · {invoiceStatusLabel}
              </p>
              <strong className="mt-1 block text-2xl font-semibold text-white">
                {formatPrivateCurrency(invoiceTotal)}
              </strong>
            </div>
            <Button
              type="button"
              size="icon-sm"
              variant="outline"
              className="size-9 border-white/20 bg-black/10 text-white hover:bg-white/15 hover:text-white"
              onClick={() => setIsFlipped(false)}
              aria-label="Voltar para frente do cartão"
            >
              <X className="size-4" />
            </Button>
          </div>

          <div className="max-h-[70px] space-y-1 overflow-y-auto pr-1 text-xs [scrollbar-color:rgba(255,255,255,0.25)_transparent] [scrollbar-width:thin]">
            <div className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-black/10 px-2.5 py-1.5">
              <span className="text-white/65">Minha parte</span>
              <strong className="font-semibold text-white">
                {formatPrivateCurrency(invoiceBreakdown.personal)}
              </strong>
            </div>
            {invoiceBreakdown.dependents.map((dependent) => (
              <div
                key={dependent.id}
                className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-black/10 px-2.5 py-1.5"
              >
                <span className="truncate text-white/65">{dependent.name}</span>
                <strong className="shrink-0 font-semibold text-white">
                  {formatPrivateCurrency(dependent.total)}
                </strong>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              className="h-9 flex-1 bg-white text-zinc-950 hover:bg-zinc-100"
              disabled={
                !invoice ||
                invoice.status === "paid" ||
                invoice.totalAmount <= invoice.paidAmount
              }
              onClick={() => invoice && onPayInvoice(invoice, card.name)}
            >
              {invoice?.status === "paid" ? "Fatura paga" : "Pagar Fatura"}
            </Button>
            <Button
              type="button"
              size="icon-sm"
              variant="outline"
              className="size-9 border-white/20 bg-black/10 text-white hover:bg-white/15 hover:text-white"
              onClick={() => onEdit(card)}
              aria-label={`Editar ${card.name}`}
            >
              <Edit3 className="size-4" />
            </Button>
            <Button
              type="button"
              size="icon-sm"
              variant="outline"
              className="size-9 border-white/20 bg-black/10 text-white hover:bg-rose-500/25 hover:text-white"
              onClick={() => onDelete(card)}
              aria-label={`Excluir ${card.name}`}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CardsPage() {
  const [isAddCardModalOpen, setIsAddCardModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<FinanceCard | null>(null);
  const [deleteTargetCard, setDeleteTargetCard] = useState<FinanceCard | null>(
    null,
  );
  const [isDeletingCard, setIsDeletingCard] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [paymentTarget, setPaymentTarget] = useState<{
    invoice: CardInvoice;
    cardName: string;
  } | null>(null);
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [transactionSearch, setTransactionSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [transactionViewFilter, setTransactionViewFilter] =
    useState<TransactionViewFilter>("all");

  const cards = useFinanceStore((state) => state.cards);
  const cardInvoices = useFinanceStore((state) => state.cardInvoices);
  const dependents = useFinanceStore((state) => state.dependents);
  const transactions = useFinanceStore((state) => state.transactions);
  const fetchTransactions = useFinanceStore((state) => state.fetchTransactions);
  const fetchDependents = useFinanceStore((state) => state.fetchDependents);
  const deleteCard = useFinanceStore((state) => state.deleteCard);
  const currentMonth = useFinanceStore((state) => state.currentMonth);
  const currentYear = useFinanceStore((state) => state.currentYear);
  const isFetching = useFinanceStore((state) => state.isFetching);
  const nextMonth = useFinanceStore((state) => state.nextMonth);
  const prevMonth = useFinanceStore((state) => state.prevMonth);
  const hideBalancesByDefault = useFinanceStore(
    (state) => state.hideBalancesByDefault,
  );
  const { formatCurrency, hiddenCurrencyLabel } = useCurrencyFormatter();
  const formatPrivateCurrency = (value: number) =>
    hideBalancesByDefault ? hiddenCurrencyLabel : formatCurrency(value);

  useEffect(() => {
    void fetchTransactions();
    void fetchDependents();
  }, [currentMonth, currentYear, fetchDependents, fetchTransactions]);

  const monthlyTransactions = useMemo(
    () =>
      transactions.filter((transaction) =>
        isTransactionInSelectedCompetence(
          transaction,
          currentMonth,
          currentYear,
        ),
      ),
    [currentMonth, currentYear, transactions],
  );

  const selectedCard = useMemo(
    () => cards.find((card) => card.id === selectedCardId) ?? cards[0] ?? null,
    [cards, selectedCardId],
  );

  const selectedInvoiceMonthStart = toDateOnly(
    currentYear,
    currentMonth,
    1,
  );
  const selectedInvoice = useMemo(
    () =>
      cardInvoices.find(
        (invoice) =>
          invoice.cardId === selectedCard?.id &&
          invoice.billingMonthStart === selectedInvoiceMonthStart,
      ),
    [cardInvoices, selectedCard?.id, selectedInvoiceMonthStart],
  );

  const selectedCardTransactions = useMemo(
    () =>
      selectedCard
        ? monthlyTransactions
            .filter((transaction) => transaction.cardId === selectedCard.id)
            .sort((left, right) => right.date.localeCompare(left.date))
        : [],
    [monthlyTransactions, selectedCard],
  );

  const transactionCategoryOptions = useMemo(
    () =>
      Array.from(
        new Set(
          selectedCardTransactions.map(
            (transaction) => transaction.category?.trim() || "Sem categoria",
          ),
        ),
      ).sort((left, right) => left.localeCompare(right, "pt-BR")),
    [selectedCardTransactions],
  );

  const filteredSelectedCardTransactions = useMemo(() => {
    const normalizedSearch = transactionSearch.trim().toLocaleLowerCase("pt-BR");
    const today = getLocalTodayDateOnly();

    return selectedCardTransactions.filter((transaction) => {
      const dependentName = transaction.dependentId
        ? dependents.find((dependent) => dependent.id === transaction.dependentId)
            ?.name
        : "";
      const category = transaction.category?.trim() || "Sem categoria";
      const { current, total } = getInstallmentProgress(transaction);
      const matchesSearch =
        !normalizedSearch ||
        [transaction.description, category, dependentName]
          .filter(Boolean)
          .some((value) =>
            value?.toLocaleLowerCase("pt-BR").includes(normalizedSearch),
          );
      const matchesCategory =
        categoryFilter === "all" || category === categoryFilter;

      let matchesView = true;
      if (transactionViewFilter === "purchase") {
        matchesView =
          !transaction.is_recurring &&
          total <= 1 &&
          !isCardCreditAdjustment(transaction);
      } else if (transactionViewFilter === "subscription") {
        matchesView = transaction.is_recurring === true;
      } else if (transactionViewFilter === "installment") {
        matchesView = total > 1;
      } else if (transactionViewFilter === "last-installment") {
        matchesView = total > 1 && current === total;
      } else if (transactionViewFilter === "scheduled") {
        matchesView = !shouldCountCardCharge(transaction, today);
      } else if (transactionViewFilter === "dependent") {
        matchesView = Boolean(transaction.dependentId);
      } else if (transactionViewFilter === "credit") {
        matchesView = Boolean(isCardCreditAdjustment(transaction));
      }

      return matchesSearch && matchesCategory && matchesView;
    });
  }, [
    categoryFilter,
    dependents,
    selectedCardTransactions,
    transactionSearch,
    transactionViewFilter,
  ]);

  const hasActiveTransactionFilters =
    transactionSearch.trim().length > 0 ||
    categoryFilter !== "all" ||
    transactionViewFilter !== "all";

  const selectedChargeableCardTransactions = useMemo(() => {
    const today = getLocalTodayDateOnly();

    return selectedCardTransactions.filter((transaction) =>
      shouldCountCardCharge(transaction, today),
    );
  }, [selectedCardTransactions]);

  const selectedInvoiceTotal = useMemo(
    () =>
      selectedInvoice?.postedAmount ??
      selectedChargeableCardTransactions.reduce(
        (total, transaction) => total + getCardSignedAmount(transaction),
        0,
      ),
    [selectedChargeableCardTransactions, selectedInvoice?.postedAmount],
  );
  const selectedProjectedInvoiceTotal = useMemo(
    () =>
      selectedInvoice?.totalAmount ??
      selectedCardTransactions.reduce(
        (total, transaction) => total + getCardSignedAmount(transaction),
        0,
      ),
    [selectedCardTransactions, selectedInvoice?.totalAmount],
  );
  const selectedInvoiceSummary = useMemo(() => {
    const today = getLocalTodayDateOnly();
    const total = selectedCardTransactions.reduce(
      (sum, transaction) => sum + getCardSignedAmount(transaction),
      0,
    );
    const postedTransactions = selectedCardTransactions.filter((transaction) =>
      shouldCountCardCharge(transaction, today),
    );
    const scheduledTransactions = selectedCardTransactions.filter(
      (transaction) => !shouldCountCardCharge(transaction, today),
    );
    const posted = postedTransactions.reduce(
      (sum, transaction) => sum + getCardSignedAmount(transaction),
      0,
    );
    const scheduled = scheduledTransactions.reduce(
      (sum, transaction) => sum + getCardSignedAmount(transaction),
      0,
    );
    const paid = selectedInvoice?.paidAmount ?? 0;
    const open = Math.max(total - paid, 0);
    const dependentsTotal = selectedCardTransactions
      .filter((transaction) => transaction.dependentId)
      .reduce((sum, transaction) => sum + getCardSignedAmount(transaction), 0);
    const personalTotal = selectedCardTransactions
      .filter((transaction) => !transaction.dependentId)
      .reduce((sum, transaction) => sum + getCardSignedAmount(transaction), 0);
    const subscriptionsTotal = selectedCardTransactions
      .filter((transaction) => transaction.is_recurring === true)
      .reduce((sum, transaction) => sum + getCardSignedAmount(transaction), 0);
    const installmentsTotal = selectedCardTransactions
      .filter((transaction) => {
        const installments =
          transaction.installmentsTotal ?? transaction.installments ?? 1;

        return installments > 1;
      })
      .reduce((sum, transaction) => sum + getCardSignedAmount(transaction), 0);

    return {
      dependentsTotal,
      installmentsTotal,
      open: selectedInvoice
        ? Math.max(selectedInvoice.totalAmount - selectedInvoice.paidAmount, 0)
        : open,
      paid,
      personalTotal,
      posted: selectedInvoice?.postedAmount ?? posted,
      scheduled,
      subscriptionsTotal,
      total: selectedInvoice?.totalAmount ?? total,
    };
  }, [selectedCardTransactions, selectedInvoice]);
  const selectedInvoiceCycle = useMemo(
    () =>
      selectedInvoice
        ? {
            startDate: selectedInvoice.cycleStart,
            endDate: selectedInvoice.cycleEnd,
          }
        : getCardInvoiceCycle(
            selectedInvoiceMonthStart,
            selectedCard?.closingDay,
          ),
    [selectedCard?.closingDay, selectedInvoice, selectedInvoiceMonthStart],
  );
  const selectedLimit = selectedCard?.limitAmount ?? 0;
  const selectedDebtTotal = useMemo(
    () =>
      selectedCard
        ? calculateCardDebt(
            transactions,
            selectedCard.id,
            cardInvoices
              .filter(
                (invoice) =>
                  invoice.cardId === selectedCard.id &&
                  transactions.some(
                    (transaction) => transaction.invoiceId === invoice.id,
                  ),
              )
              .reduce((sum, invoice) => sum + invoice.paidAmount, 0),
          )
        : 0,
    [cardInvoices, selectedCard, transactions],
  );
  const selectedUsage = useMemo(
    () =>
      selectedLimit > 0
        ? Math.min((selectedDebtTotal / selectedLimit) * 100, 100)
        : 0,
    [selectedDebtTotal, selectedLimit],
  );

  const cardInvoiceSummaries = useMemo(() => {
    const today = getLocalTodayDateOnly();

    return new Map(
      cards.map((card) => {
        const persistedInvoice = cardInvoices.find(
          (invoice) =>
            invoice.cardId === card.id &&
            invoice.billingMonthStart === selectedInvoiceMonthStart,
        );
        const cardTransactions = monthlyTransactions.filter(
          (transaction) => transaction.cardId === card.id,
        );
        const currentInvoiceTransactions = cardTransactions.filter(
          (transaction) => shouldCountCardCharge(transaction, today),
        );
        const fallbackInvoiceTotal = currentInvoiceTransactions.reduce(
          (total, transaction) => total + getCardSignedAmount(transaction),
          0,
        );
        const debtTotal = calculateCardDebt(
          transactions,
          card.id,
          cardInvoices
            .filter(
              (invoice) =>
                invoice.cardId === card.id &&
                transactions.some(
                  (transaction) => transaction.invoiceId === invoice.id,
                ),
            )
            .reduce((sum, invoice) => sum + invoice.paidAmount, 0),
        );
        const limitAmount = card.limitAmount ?? 0;

        return [
          card.id,
          {
            debtTotal,
            invoiceBreakdown: getInvoiceBreakdown(
              currentInvoiceTransactions,
              dependents,
            ),
            invoice: persistedInvoice,
            invoiceTotal:
              persistedInvoice?.postedAmount ?? fallbackInvoiceTotal,
            limitUsage:
              limitAmount > 0
                ? Math.min((debtTotal / limitAmount) * 100, 100)
                : 0,
          },
        ] as const;
      }),
    );
  }, [
    cardInvoices,
    cards,
    dependents,
    monthlyTransactions,
    selectedInvoiceMonthStart,
    transactions,
  ]);

  const resetTransactionFilters = useCallback(() => {
    setTransactionSearch("");
    setCategoryFilter("all");
    setTransactionViewFilter("all");
  }, []);

  useEffect(() => {
    if (!carouselApi) return;

    const syncSelectedCard = () => {
      const card = cards[carouselApi.selectedScrollSnap()];
      if (card) {
        setSelectedCardId(card.id);
        resetTransactionFilters();
      }
    };

    carouselApi.on("select", syncSelectedCard);
    carouselApi.on("reInit", syncSelectedCard);

    return () => {
      carouselApi.off("select", syncSelectedCard);
      carouselApi.off("reInit", syncSelectedCard);
    };
  }, [cards, carouselApi, resetTransactionFilters]);

  const handleSelectCard = useCallback(
    (cardId: string) => {
      setSelectedCardId(cardId);
      resetTransactionFilters();
      const cardIndex = cards.findIndex((card) => card.id === cardId);
      if (cardIndex >= 0) carouselApi?.scrollTo(cardIndex);
    },
    [cards, carouselApi, resetTransactionFilters],
  );

  const handlePreviousMonth = useCallback(() => {
    resetTransactionFilters();
    prevMonth();
  }, [prevMonth, resetTransactionFilters]);

  const handleNextMonth = useCallback(() => {
    resetTransactionFilters();
    nextMonth();
  }, [nextMonth, resetTransactionFilters]);

  const openCreateModal = useCallback(() => {
    setEditingCard(null);
    setIsAddCardModalOpen(true);
  }, []);

  const openEditModal = useCallback((card: FinanceCard) => {
    setEditingCard(card);
    setIsAddCardModalOpen(true);
  }, []);

  const closeCardModal = useCallback(() => {
    setIsAddCardModalOpen(false);
    setEditingCard(null);
  }, []);

  const handleCardKeyDown = useCallback((
    event: KeyboardEvent<HTMLDivElement>,
    cardId: string,
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setSelectedCardId(cardId);
    }
  }, []);

  const handleDeleteCard = useCallback(async () => {
    if (!deleteTargetCard || isDeletingCard) return;

    setIsDeletingCard(true);

    try {
      await deleteCard(deleteTargetCard.id);
      if (selectedCardId === deleteTargetCard.id) {
        setSelectedCardId(null);
      }
      setDeleteTargetCard(null);
      toast.success("Cartão removido.");
    } catch (error) {
      console.error("Erro ao remover cartão:", error);
      toast.error(
        error instanceof Error ? error.message : "Erro ao remover cartão.",
      );
      throw error;
    } finally {
      setIsDeletingCard(false);
    }
  }, [deleteCard, deleteTargetCard, isDeletingCard, selectedCardId]);

  const handlePayInvoiceClick = useCallback(
    (invoice: CardInvoice, cardName: string) => {
      setPaymentTarget({ invoice, cardName });
    },
    [],
  );

  return (
    <div className="flex w-full flex-col gap-6 md:gap-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-400">
            Crédito
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-zinc-50 md:text-3xl">
            Cartões e faturas
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            Limites, ciclos e cobranças em uma única leitura.
          </p>
        </div>

        <div className="flex flex-col gap-2 min-[460px]:flex-row min-[460px]:items-center">
          <AnimatedMonthSelector
            currentMonth={currentMonth}
            currentYear={currentYear}
            onPreviousMonth={handlePreviousMonth}
            onNextMonth={handleNextMonth}
            isLoading={isFetching}
          />
          <Button
            type="button"
            aria-label="Adicionar cartão"
            data-tour="cards-add"
            onClick={openCreateModal}
            className="h-11 gap-2 bg-emerald-600 px-4 font-semibold text-white hover:bg-emerald-700"
          >
            <PlusCircle className="size-4" />
            <span className="hidden min-[410px]:inline">Novo cartão</span>
          </Button>
        </div>
      </header>

      {cards.length ? (
        <section className="grid min-w-0 overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-900/45 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
          <div className="min-w-0 border-b border-zinc-800/80 p-4 sm:p-5 lg:border-b-0 lg:border-r">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-zinc-200">Sua carteira</p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {cards.length} {cards.length === 1 ? "cartão" : "cartões"}
                </p>
              </div>
            </div>

            <Carousel
              opts={{ align: "start", dragFree: true }}
              setApi={setCarouselApi}
              className="mt-4 min-w-0 w-full"
            >
              <CarouselContent className="-ml-2 py-1">
                {cards.map((card) => {
                  const limitAmount = card.limitAmount ?? 0;
                  const cardSummary = cardInvoiceSummaries.get(card.id) ?? {
                    debtTotal: 0,
                    invoiceBreakdown: { personal: 0, dependents: [] },
                    invoice: undefined,
                    invoiceTotal: 0,
                    limitUsage: 0,
                  };

                  return (
                    <CarouselItem key={card.id} className="basis-full pl-2">
                      <div className="flex justify-center">
                        <FlippableManagedCard
                          card={card}
                          availableLimit={Math.max(
                            limitAmount - cardSummary.debtTotal,
                            0,
                          )}
                          invoiceTotal={cardSummary.invoiceTotal}
                          invoiceBreakdown={cardSummary.invoiceBreakdown}
                          limitUsage={cardSummary.limitUsage}
                          isSelected={selectedCard?.id === card.id}
                          onSelect={handleSelectCard}
                          onKeyDown={handleCardKeyDown}
                          onEdit={openEditModal}
                          onDelete={setDeleteTargetCard}
                          onPayInvoice={handlePayInvoiceClick}
                          invoiceMonthStart={selectedInvoiceMonthStart}
                          invoice={cardSummary.invoice}
                        />
                      </div>
                    </CarouselItem>
                  );
                })}
              </CarouselContent>
              <CarouselPrevious
                variant="secondary"
                className="-top-10 left-auto right-12 hidden size-10 translate-y-0 border border-emerald-300/40 bg-emerald-600 text-white shadow-md shadow-black/30 hover:bg-emerald-500 hover:text-white disabled:border-zinc-700 disabled:bg-zinc-800 disabled:text-zinc-500 [&_svg]:size-5 sm:inline-flex"
              />
              <CarouselNext
                variant="secondary"
                className="-top-10 right-0 hidden size-10 translate-y-0 border border-emerald-300/40 bg-emerald-600 text-white shadow-md shadow-black/30 hover:bg-emerald-500 hover:text-white disabled:border-zinc-700 disabled:bg-zinc-800 disabled:text-zinc-500 [&_svg]:size-5 sm:inline-flex"
              />
            </Carousel>
          </div>

          <div className="min-w-0 p-4 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-lg font-semibold text-zinc-100">
                    {selectedCard?.name}
                  </h2>
                  {selectedInvoice ? (
                    <Badge variant="outline" className="border-zinc-700 text-zinc-400">
                      {{
                        open: "Aberta",
                        closed: "Fechada",
                        partially_paid: "Parcialmente paga",
                        paid: "Paga",
                      }[selectedInvoice.status]}
                    </Badge>
                  ) : null}
                </div>
                <p className="mt-1 text-xs text-zinc-500">
                  {formatDateOnlyBR(selectedInvoiceCycle.startDate)} -{" "}
                  {formatDateOnlyBR(selectedInvoiceCycle.endDate)}
                  {selectedInvoice?.dueDate
                    ? ` · vence ${formatDateOnlyBR(selectedInvoice.dueDate)}`
                    : selectedCard?.dueDay
                      ? ` · vence dia ${selectedCard.dueDay}`
                      : ""}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 border-zinc-700"
                disabled={!selectedCard}
                onClick={() => selectedCard && openEditModal(selectedCard)}
              >
                <Edit3 className="size-4" />
                Editar
              </Button>
            </div>

            <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                  Fatura lançada
                </p>
                <p className="mt-1 text-3xl font-semibold tracking-tight text-zinc-50">
                  {formatPrivateCurrency(selectedInvoiceTotal)}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  Projeção de fechamento: {formatPrivateCurrency(selectedProjectedInvoiceTotal)}
                </p>
              </div>
              <Button
                type="button"
                className="h-10 bg-emerald-600 px-5 font-semibold text-white hover:bg-emerald-700"
                disabled={
                  !selectedCard ||
                  !selectedInvoice ||
                  selectedInvoice.status === "paid" ||
                  selectedInvoice.totalAmount <= selectedInvoice.paidAmount
                }
                onClick={() => {
                  if (selectedInvoice && selectedCard) {
                    handlePayInvoiceClick(selectedInvoice, selectedCard.name);
                  }
                }}
              >
                {selectedInvoice?.status === "paid" ? "Fatura paga" : "Pagar fatura"}
              </Button>
            </div>

            <div className="mt-6 grid grid-cols-1 divide-y divide-zinc-800 border-y border-zinc-800 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              {[
                {
                  icon: CalendarClock,
                  label: "Em aberto",
                  value: selectedInvoiceSummary.open,
                  tone: "text-amber-300",
                },
                {
                  icon: Gauge,
                  label: "Minha parte",
                  value: selectedInvoiceSummary.personalTotal,
                  tone: "text-zinc-100",
                },
                {
                  icon: UsersRound,
                  label: "Dependentes",
                  value: selectedInvoiceSummary.dependentsTotal,
                  tone: "text-zinc-100",
                },
              ].map((item) => {
                const Icon = item.icon;

                return (
                  <div key={item.label} className="flex items-center gap-3 py-3 sm:px-4 sm:first:pl-0">
                    <Icon className="size-4 shrink-0 text-zinc-600" />
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-wide text-zinc-500">
                        {item.label}
                      </p>
                      <strong className={cn("mt-0.5 block truncate text-sm font-semibold", item.tone)}>
                        {formatPrivateCurrency(item.value)}
                      </strong>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500">
                <span>Uso do limite</span>
                <span>
                  {selectedLimit > 0
                    ? `${formatPrivateCurrency(selectedDebtTotal)} de ${formatPrivateCurrency(selectedLimit)} · ${selectedUsage.toFixed(0)}%`
                    : "Limite não informado"}
                </span>
              </div>
              <Progress value={selectedUsage} className="mt-2 h-1.5" />
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {[
                  ["Assinaturas", selectedInvoiceSummary.subscriptionsTotal],
                  ["Parcelas", selectedInvoiceSummary.installmentsTotal],
                  ["Agendado", selectedInvoiceSummary.scheduled],
                  ["Pago", selectedInvoiceSummary.paid],
                ].map(([label, value]) => (
                  <span
                    key={label}
                    className="shrink-0 rounded-lg border border-zinc-800 bg-zinc-950/40 px-2.5 py-1.5 text-xs text-zinc-500"
                  >
                    {label} ·{" "}
                    <strong className="font-medium text-zinc-300">
                      {formatPrivateCurrency(Number(value))}
                    </strong>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 bg-zinc-900/30 px-6 text-center">
          <span className="flex size-11 items-center justify-center rounded-lg bg-zinc-900 text-zinc-500">
            <CreditCard className="size-5" />
          </span>
          <h2 className="mt-4 text-base font-semibold text-zinc-200">
            Nenhum cartão cadastrado
          </h2>
          <p className="mt-1 max-w-sm text-sm text-zinc-500">
            Adicione seu primeiro cartão para acompanhar ciclos, limites e faturas.
          </p>
          <Button
            type="button"
            onClick={openCreateModal}
            className="mt-5 bg-emerald-600 text-white hover:bg-emerald-700"
          >
            <PlusCircle className="size-4" />
            Novo cartão
          </Button>
        </section>
      )}

      <Card className="min-w-0 rounded-xl border border-zinc-800/80 bg-zinc-900/45 py-0 shadow-none">
        <CardHeader className="flex flex-row items-center justify-between gap-4 border-b border-zinc-800/80 px-4 py-4 sm:px-5">
          <div className="min-w-0">
            <CardDescription>Movimentações da fatura</CardDescription>
            <CardTitle className="mt-1 truncate text-base tracking-normal sm:text-lg">
              {selectedCard?.name ?? "Compras do cartão"}
            </CardTitle>
          </div>
          <Badge variant="outline" className="shrink-0 border-zinc-800 text-zinc-500">
            {hasActiveTransactionFilters
              ? `${filteredSelectedCardTransactions.length} de ${selectedCardTransactions.length}`
              : `${selectedCardTransactions.length} lançamentos`}
          </Badge>
        </CardHeader>

        <CardContent className="px-4 pb-4 pt-3 sm:px-5 sm:pb-5">
          <TopCategories transactions={selectedCardTransactions} />

          <div className="mb-4 grid gap-2 md:grid-cols-[minmax(220px,1fr)_minmax(170px,0.55fr)_minmax(180px,0.6fr)_auto]">
            <div className="relative min-w-0">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-600" />
              <Input
                value={transactionSearch}
                onChange={(event) => setTransactionSearch(event.target.value)}
                placeholder="Buscar lançamento"
                aria-label="Buscar transações do cartão"
                className="h-10 border-zinc-800 bg-zinc-950/45 pl-9"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-10 w-full border-zinc-800 bg-zinc-950/45">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                {transactionCategoryOptions.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={transactionViewFilter}
              onValueChange={(value) =>
                setTransactionViewFilter(value as TransactionViewFilter)
              }
            >
              <SelectTrigger className="h-10 w-full border-zinc-800 bg-zinc-950/45">
                <ListFilter className="size-4 text-zinc-600" />
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os lançamentos</SelectItem>
                <SelectItem value="purchase">Compras avulsas</SelectItem>
                <SelectItem value="subscription">Assinaturas</SelectItem>
                <SelectItem value="installment">Compras parceladas</SelectItem>
                <SelectItem value="last-installment">Última parcela</SelectItem>
                <SelectItem value="scheduled">Cobranças agendadas</SelectItem>
                <SelectItem value="dependent">Gastos de dependentes</SelectItem>
                <SelectItem value="credit">Créditos e estornos</SelectItem>
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={!hasActiveTransactionFilters}
              onClick={() => {
                setTransactionSearch("");
                setCategoryFilter("all");
                setTransactionViewFilter("all");
              }}
              aria-label="Limpar filtros da fatura"
              title="Limpar filtros"
              className="size-10 text-zinc-500"
            >
              <X className="size-4" />
            </Button>
          </div>

          <div className="space-y-2 md:hidden">
            {filteredSelectedCardTransactions.length ? (
              filteredSelectedCardTransactions.map((transaction) => {
                const isPositive = isCardCreditAdjustment(transaction);

                return (
                  <MobileTransactionItem
                    key={transaction.id}
                    title={<TransactionDescription transaction={transaction} />}
                    category={transaction.category || "Sem categoria"}
                    date={formatDateOnlyBR(transaction.date)}
                    amount={`${isPositive ? "+" : "-"}${formatPrivateCurrency(transaction.amount)}`}
                    positive={isPositive}
                  />
                );
              })
            ) : (
              <div className="flex min-h-40 flex-col items-center justify-center text-center text-sm text-muted-foreground">
                <Receipt className="mb-3 size-8" />
                {hasActiveTransactionFilters
                  ? "Nenhum lançamento corresponde aos filtros."
                  : "Nenhuma transação deste cartão no mês atual."}
              </div>
            )}
          </div>

          <Table className="hidden min-w-[560px] md:table lg:min-w-full">
            <TableHeader className="bg-muted/30">
              <TableRow className="hover:bg-transparent">
                <TableHead>Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="hidden lg:table-cell">Categoria</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSelectedCardTransactions.length ? (
                filteredSelectedCardTransactions.map((transaction) => {
                  const statusPresentation =
                    getTransactionStatusPresentation(transaction);
                  const {
                    current: installmentNumber,
                    total: installmentsTotal,
                  } = getInstallmentProgress(transaction);
                  const isLastInstallment =
                    installmentsTotal > 1 &&
                    installmentNumber === installmentsTotal;
                  const isInstallment = installmentsTotal > 1;
                  const isScheduledCharge = !shouldCountCardCharge(
                    transaction,
                    getLocalTodayDateOnly(),
                  );
                  const dependent = transaction.dependentId
                    ? dependents.find(
                        (item) => item.id === transaction.dependentId,
                      )
                    : null;

                  return (
                    <TableRow
                      key={transaction.id}
                      className={cn(
                        "hover:bg-muted/35",
                        isScheduledCharge && "opacity-70",
                        isLastInstallment &&
                          "bg-emerald-950/20 hover:bg-emerald-950/30",
                      )}
                    >
                      <TableCell className="text-muted-foreground">
                        {formatDateOnlyBR(transaction.date)}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="flex min-w-0 items-center gap-2 font-medium text-foreground">
                            <span className="min-w-0 truncate">
                              <TransactionDescription transaction={transaction} />
                            </span>
                            {isLastInstallment ? (
                              <Badge className="shrink-0 border border-emerald-800 bg-emerald-950 px-1.5 py-0 text-[10px] text-emerald-300 hover:bg-emerald-950">
                                Última
                              </Badge>
                            ) : null}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-500">
                            <span>
                              {transaction.is_recurring
                                ? "Assinatura"
                                : "Compra"}
                            </span>
                            {isInstallment ? (
                              <>
                                <span>•</span>
                                <span>
                                  Parcela {installmentNumber}/{installmentsTotal}
                                </span>
                              </>
                            ) : null}
                            {dependent ? (
                              <>
                                <span>•</span>
                                <span>{dependent.name}</span>
                              </>
                            ) : null}
                            {transaction.is_recurring ? (
                              <>
                                <span>•</span>
                                <span className={statusPresentation.className}>
                                  {statusPresentation.label}
                                </span>
                              </>
                            ) : isScheduledCharge ? (
                              <>
                                <span>•</span>
                                <span>Agendada</span>
                              </>
                            ) : null}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <span className="text-sm text-zinc-400">
                          {transaction.category || "Sem categoria"}
                        </span>
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right font-medium",
                          isCardCreditAdjustment(transaction)
                            ? "text-emerald-400"
                            : "text-red-300",
                        )}
                      >
                        {isCardCreditAdjustment(transaction) ? "+" : "-"}
                        {formatPrivateCurrency(transaction.amount)}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow className="hover:bg-transparent">
                  <TableCell
                    colSpan={4}
                    className="text-center"
                  >
                    <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                      <Receipt className="mb-4 h-10 w-10 text-muted-foreground/50" />
                      <span>
                        {hasActiveTransactionFilters
                          ? "Nenhum lançamento corresponde aos filtros."
                          : "Nenhuma transação deste cartão no mês atual."}
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AddCardModal
        isOpen={isAddCardModalOpen}
        onClose={closeCardModal}
        editingCard={editingCard}
      />

      <PayInvoiceModal
        open={Boolean(paymentTarget)}
        invoice={paymentTarget?.invoice ?? null}
        cardName={paymentTarget?.cardName}
        onOpenChange={(open) => {
          if (!open) setPaymentTarget(null);
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteTargetCard)}
        onOpenChange={(open) => {
          if (!open && !isDeletingCard) setDeleteTargetCard(null);
        }}
        title="Excluir cartão?"
        description="O cartão, suas faturas e todas as transações vinculadas serão excluídos permanentemente."
        confirmLabel="Sim, excluir cartão"
        loadingLabel="Excluindo..."
        details={deleteTargetCard?.name}
        onConfirm={handleDeleteCard}
      />
    </div>
  );
}

