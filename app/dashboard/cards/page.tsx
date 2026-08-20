"use client";

import { KeyboardEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  CreditCard,
  Edit3,
  PlusCircle,
  Receipt,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { AddCardModal } from "@/components/modals/AddCardModal";
import { TransactionDescription } from "@/components/finance/TransactionDescription";
import { MobileTransactionItem } from "@/components/finance/MobileTransactionItem";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
} from "@/components/ui/carousel";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getCardGradient } from "@/lib/cardUtils";
import {
  formatDateOnlyBR,
  getLocalTodayDateOnly,
} from "@/lib/dateUtils";
import {
  calculateAvailableCardLimit,
  calculateCardDebt,
  getCardSignedAmount,
  isCardCreditAdjustment,
  shouldCountCardCharge,
} from "@/lib/cardCredits";
import { cn } from "@/lib/utils";
import { isTransactionInSelectedPeriod } from "@/lib/transactionPeriod";
import {
  useFinanceStore,
  type Card as FinanceCard,
  type Dependent,
  type Transaction,
} from "@/store/useFinanceStore";

const brlFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const hiddenCurrencyLabel = "R$ ••••";

function formatSensitiveCurrency(value: number, hideValue: boolean) {
  return hideValue ? hiddenCurrencyLabel : brlFormatter.format(value);
}

interface InvoiceBreakdown {
  personal: number;
  dependents: Array<{
    id: string;
    name: string;
    total: number;
  }>;
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
  const formatPrivateCurrency = (value: number) =>
    formatSensitiveCurrency(value, hideBalancesByDefault);
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
  onPayInvoice: (cardId: string) => void;
}) {
  const [isFlipped, setIsFlipped] = useState(false);
  const hideBalancesByDefault = useFinanceStore(
    (state) => state.hideBalancesByDefault,
  );

  return (
    <div className="h-[190px] w-full max-w-[340px] perspective-[1000px] sm:w-[304px]">
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
            "absolute inset-0 cursor-pointer overflow-hidden rounded-2xl border-2 p-4 text-left text-white shadow-lg transition-all duration-300 ease-in-out [backface-visibility:hidden]",
            getCardGradient(card.name),
            isSelected
              ? "border-white/80 opacity-100 shadow-2xl lg:scale-105"
              : "border-transparent opacity-60 hover:opacity-80 lg:scale-95 lg:hover:scale-100",
          )}
        >
          <div className="pointer-events-none absolute -right-10 -top-10 size-28 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -bottom-12 left-8 size-28 rounded-full bg-black/20" />

          <div className="relative flex items-start justify-between gap-4">
            <div>
              <div className="mb-3 h-6 w-9 rounded-md border border-white/25 bg-gradient-to-br from-white/45 to-white/10 shadow-inner" />
              <h2 className="max-w-36 truncate text-sm font-semibold text-white">
                {card.name}
              </h2>
              <p className="mt-1 text-xs text-white/65">
                {card.closingDay ? `Fecha dia ${card.closingDay}` : "Fechamento livre"}
                {" • "}
                {card.dueDay ? `Vence dia ${card.dueDay}` : "Sem vencimento"}
              </p>
            </div>

            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setIsFlipped(true);
              }}
              className="inline-flex size-8 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
              aria-label={`Virar cartão ${card.name}`}
            >
              <RotateCcw className="size-4" />
            </button>
          </div>

          <div className="relative mt-6 flex items-end justify-between gap-3">
            <CreditCard className="size-5 text-white/70" />
            <div className="text-right">
              <p className="text-xs font-medium uppercase text-white/60">
                Limite disponível
              </p>
              <strong className="mt-1 block text-lg font-bold tracking-normal">
                {formatSensitiveCurrency(availableLimit, hideBalancesByDefault)}
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
            "absolute inset-0 flex flex-col justify-between overflow-hidden rounded-2xl border-2 border-white/80 p-4 text-white shadow-2xl [backface-visibility:hidden] [transform:rotateY(180deg)]",
            getCardGradient(card.name),
          )}
        >
          <div className="pointer-events-none absolute -left-10 -top-10 size-28 rounded-full bg-white/10" />
          <div className="relative flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase text-white/60">
                Fatura atual
              </p>
              <strong className="mt-1 block text-xl font-bold text-white">
                {formatSensitiveCurrency(invoiceTotal, hideBalancesByDefault)}
              </strong>
            </div>
            <Button
              type="button"
              size="icon-sm"
              variant="outline"
              className="size-8 border-white/25 bg-white/10 text-white hover:bg-white/20 hover:text-white"
              onClick={() => setIsFlipped(false)}
              aria-label="Voltar para frente do cartão"
            >
              <X className="size-4" />
            </Button>
          </div>

          <div className="relative max-h-[58px] space-y-1 overflow-y-auto pr-1 text-[11px] [scrollbar-color:rgba(255,255,255,0.25)_transparent] [scrollbar-width:thin]">
            <div className="flex items-center justify-between gap-3 rounded-md bg-black/15 px-2 py-1">
              <span className="text-white/65">Meus Gastos</span>
              <strong className="font-semibold text-white">
                {formatSensitiveCurrency(
                  invoiceBreakdown.personal,
                  hideBalancesByDefault,
                )}
              </strong>
            </div>
            {invoiceBreakdown.dependents.map((dependent) => (
              <div
                key={dependent.id}
                className="flex items-center justify-between gap-3 rounded-md bg-black/15 px-2 py-1"
              >
                <span className="truncate text-white/65">{dependent.name}</span>
                <strong className="shrink-0 font-semibold text-white">
                  {formatSensitiveCurrency(
                    dependent.total,
                    hideBalancesByDefault,
                  )}
                </strong>
              </div>
            ))}
          </div>

          <div className="relative flex gap-2">
            <Button
              type="button"
              size="sm"
              className="h-8 flex-1 bg-white text-zinc-950 hover:bg-white/90"
              onClick={() => onPayInvoice(card.id)}
            >
              Pagar Fatura
            </Button>
            <Button
              type="button"
              size="icon-sm"
              variant="outline"
              className="size-8 border-white/25 bg-white/10 text-white hover:bg-white/20 hover:text-white"
              onClick={() => onEdit(card)}
              aria-label={`Editar ${card.name}`}
            >
              <Edit3 className="size-4" />
            </Button>
            <Button
              type="button"
              size="icon-sm"
              variant="outline"
              className="size-8 border-white/25 bg-white/10 text-white hover:bg-red-500/30 hover:text-white"
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

  const cards = useFinanceStore((state) => state.cards);
  const dependents = useFinanceStore((state) => state.dependents);
  const transactions = useFinanceStore((state) => state.transactions);
  const fetchTransactions = useFinanceStore((state) => state.fetchTransactions);
  const deleteCard = useFinanceStore((state) => state.deleteCard);
  const payCardInvoice = useFinanceStore((state) => state.payCardInvoice);
  const currentMonth = useFinanceStore((state) => state.currentMonth);
  const currentYear = useFinanceStore((state) => state.currentYear);
  const hideBalancesByDefault = useFinanceStore(
    (state) => state.hideBalancesByDefault,
  );
  const formatPrivateCurrency = (value: number) =>
    formatSensitiveCurrency(value, hideBalancesByDefault);

  useEffect(() => {
    void fetchTransactions();
  }, [
    currentMonth,
    currentYear,
    fetchTransactions,
  ]);

  const monthlyTransactions = useMemo(
    () =>
      transactions.filter((transaction) =>
        isTransactionInSelectedPeriod(
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

  const selectedCardTransactions = useMemo(
    () =>
      selectedCard
        ? monthlyTransactions
            .filter((transaction) => transaction.cardId === selectedCard.id)
            .sort((left, right) => right.date.localeCompare(left.date))
        : [],
    [monthlyTransactions, selectedCard],
  );

  const selectedChargeableCardTransactions = useMemo(() => {
    const today = getLocalTodayDateOnly();

    return selectedCardTransactions.filter((transaction) =>
      shouldCountCardCharge(transaction, today),
    );
  }, [selectedCardTransactions]);

  const selectedInvoiceTotal = useMemo(
    () =>
      selectedChargeableCardTransactions.reduce(
        (total, transaction) => total + getCardSignedAmount(transaction),
        0,
      ),
    [selectedChargeableCardTransactions],
  );
  const selectedLimit = selectedCard?.limitAmount ?? 0;
  const selectedDebtTotal = useMemo(
    () => (selectedCard ? calculateCardDebt(transactions, selectedCard.id) : 0),
    [selectedCard, transactions],
  );
  const selectedAvailableLimit = useMemo(
    () =>
      selectedCard
        ? calculateAvailableCardLimit(transactions, selectedCard.id, selectedLimit)
        : 0,
    [selectedCard, selectedLimit, transactions],
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
        const cardTransactions = monthlyTransactions.filter(
          (transaction) => transaction.cardId === card.id,
        );
        const currentInvoiceTransactions = cardTransactions.filter(
          (transaction) => shouldCountCardCharge(transaction, today),
        );
        const invoiceTotal = currentInvoiceTransactions.reduce(
          (total, transaction) => total + getCardSignedAmount(transaction),
          0,
        );
        const debtTotal = calculateCardDebt(transactions, card.id);
        const limitAmount = card.limitAmount ?? 0;

        return [
          card.id,
          {
            debtTotal,
            invoiceBreakdown: getInvoiceBreakdown(
              currentInvoiceTransactions,
              dependents,
            ),
            invoiceTotal,
            limitUsage:
              limitAmount > 0
                ? Math.min((debtTotal / limitAmount) * 100, 100)
                : 0,
          },
        ] as const;
      }),
    );
  }, [cards, dependents, monthlyTransactions, transactions]);

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
    } finally {
      setIsDeletingCard(false);
    }
  }, [deleteCard, deleteTargetCard, isDeletingCard, selectedCardId]);

  const handlePayInvoiceClick = useCallback(async (cardId: string) => {
    try {
      await payCardInvoice(cardId);
      toast.success("Fatura liquidada!");
      await fetchTransactions();
    } catch (error) {
      console.error("Erro ao liquidar fatura:", error);
      toast.error("Não foi possível liquidar a fatura.");
    }
  }, [fetchTransactions, payCardInvoice]);

  return (
    <div className="flex w-full flex-col gap-6 md:gap-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            Meus Cartões
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Gerencie cartões, limites, fechamento e vencimento.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            aria-label="Adicionar cartão"
            onClick={openCreateModal}
            className="h-11 gap-2 bg-emerald-600 px-3.5 text-sm font-semibold text-white hover:bg-emerald-700 md:h-12 md:px-6 md:text-base"
          >
            <PlusCircle className="size-5" />
            <span className="hidden min-[410px]:inline">Adicionar Cartão</span>
          </Button>
        </div>
      </div>

      <section className="min-w-0 space-y-4 overflow-visible px-2 py-2 sm:px-4">
        <Carousel opts={{ align: "start", dragFree: true }} className="min-w-0 w-full">
          <CarouselContent className="!ml-0 px-3 py-5 sm:px-4">
            {cards.map((card) => {
              const limitAmount = card.limitAmount ?? 0;
              const cardSummary = cardInvoiceSummaries.get(card.id) ?? {
                debtTotal: 0,
                invoiceBreakdown: { personal: 0, dependents: [] },
                invoiceTotal: 0,
                limitUsage: 0,
              };
              const isSelected = selectedCard?.id === card.id;

              return (
                <CarouselItem
                  key={card.id}
                  className="basis-full !pl-0 pr-4 sm:basis-auto"
                >
                  <FlippableManagedCard
                    card={card}
                    availableLimit={Math.max(limitAmount - cardSummary.debtTotal, 0)}
                    invoiceTotal={cardSummary.invoiceTotal}
                    invoiceBreakdown={cardSummary.invoiceBreakdown}
                    limitUsage={cardSummary.limitUsage}
                    isSelected={isSelected}
                    onSelect={setSelectedCardId}
                    onKeyDown={handleCardKeyDown}
                    onEdit={openEditModal}
                    onDelete={setDeleteTargetCard}
                    onPayInvoice={(cardId) => void handlePayInvoiceClick(cardId)}
                  />
                </CarouselItem>
              );
            })}
          </CarouselContent>
          <CarouselPrevious className="absolute !left-2 z-50 hidden bg-background/90 lg:inline-flex" />
          <CarouselNext className="absolute !right-2 z-50 hidden bg-background/90 lg:inline-flex" />
        </Carousel>

        {!cards.length ? (
          <Card className="rounded-lg border-dashed border-border bg-card shadow-none">
            <CardContent className="flex min-h-52 items-center justify-center text-center text-muted-foreground">
              Nenhum cartão cadastrado ainda.
            </CardContent>
          </Card>
        ) : null}
      </section>

      <Card className="rounded-lg border border-border/50 bg-card shadow-none">
        <CardHeader className="border-b">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <CardDescription>Visão da fatura</CardDescription>
              <CardTitle className="mt-1 text-xl tracking-normal lg:text-2xl">
                {selectedCard?.name ?? "Nenhum cartão selecionado"}
              </CardTitle>
            </div>
            <div className="text-left lg:text-right">
              <p className="text-sm text-muted-foreground">Total do mês</p>
              <p className="mt-1 text-2xl font-bold text-foreground lg:text-3xl">
                {formatPrivateCurrency(selectedInvoiceTotal)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Disponível: {formatPrivateCurrency(selectedAvailableLimit)}
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Limite consumido</span>
              <span>
                {selectedLimit > 0
                  ? `${selectedUsage.toFixed(0)}% de ${formatPrivateCurrency(selectedLimit)}`
                  : "Sem limite definido"}
              </span>
            </div>
            <Progress value={selectedUsage} className="h-2" />
          </div>
        </CardHeader>

        <CardContent className="pt-4">
          <TopCategories transactions={selectedChargeableCardTransactions} />

          <div className="space-y-2 md:hidden">
            {selectedCardTransactions.length ? (
              selectedCardTransactions.map((transaction) => {
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
                Nenhuma transação deste cartão no mês atual.
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
              {selectedCardTransactions.length ? (
                selectedCardTransactions.map((transaction) => {
                  const installmentNumber =
                    transaction.installmentNumber ??
                    transaction.current_installment ??
                    1;
                  const installmentsTotal =
                    transaction.installmentsTotal ??
                    transaction.installments ??
                    1;
                  const isLastInstallment =
                    installmentsTotal > 1 &&
                    installmentNumber === installmentsTotal;
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
                      isLastInstallment &&
                        "bg-emerald-950/20 hover:bg-emerald-950/30",
                    )}
                  >
                    <TableCell className="text-muted-foreground">
                      {formatDateOnlyBR(transaction.date)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-2 font-medium text-foreground">
                        <span>
                          <TransactionDescription transaction={transaction} />
                        </span>
                        {isLastInstallment ? (
                          <Badge className="border border-emerald-800 bg-emerald-950 text-emerald-300 hover:bg-emerald-950">
                            Última!
                          </Badge>
                        ) : null}
                        {dependent ? (
                          <Badge
                            variant="outline"
                            className="border-zinc-700 bg-zinc-900 text-zinc-300"
                          >
                            {dependent.name}
                          </Badge>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <Badge variant="outline" className="rounded-lg">
                        {transaction.category || "Sem categoria"}
                      </Badge>
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
                      <span>Nenhuma transação deste cartão no mês atual.</span>
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

      <AlertDialog
        open={Boolean(deleteTargetCard)}
        onOpenChange={(open) => {
          if (!open && !isDeletingCard) setDeleteTargetCard(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cartão?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente o
              cartão {deleteTargetCard?.name} e todas as transações e faturas
              vinculadas a ele.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button variant="outline" disabled={isDeletingCard}>
                Cancelar
              </Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                variant="destructive"
                disabled={isDeletingCard}
                className="bg-red-600 text-white hover:bg-red-700"
                onClick={() => void handleDeleteCard()}
              >
                {isDeletingCard ? "Excluindo..." : "Sim, excluir cartão"}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

