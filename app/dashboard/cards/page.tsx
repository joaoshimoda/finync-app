"use client";

import { KeyboardEvent, useEffect, useMemo, useState } from "react";
import {
  CreditCard,
  Edit3,
  MoreHorizontal,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { AddCardModal } from "@/components/modals/AddCardModal";
import { TransactionDescription } from "@/components/finance/TransactionDescription";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { formatDateOnlyBR, getDateOnlyParts } from "@/lib/dateUtils";
import { cn } from "@/lib/utils";
import {
  useFinanceStore,
  type Card as FinanceCard,
} from "@/store/useFinanceStore";

const brlFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export default function CardsPage() {
  const [isAddCardModalOpen, setIsAddCardModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<FinanceCard | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  const cards = useFinanceStore((state) => state.cards);
  const transactions = useFinanceStore((state) => state.transactions);
  const fetchCards = useFinanceStore((state) => state.fetchCards);
  const fetchTransactions = useFinanceStore((state) => state.fetchTransactions);
  const deleteCard = useFinanceStore((state) => state.deleteCard);
  const payCardInvoice = useFinanceStore((state) => state.payCardInvoice);
  const currentMonth = useFinanceStore((state) => state.currentMonth);
  const currentYear = useFinanceStore((state) => state.currentYear);

  useEffect(() => {
    void fetchCards();
    void fetchTransactions();
  }, [currentMonth, currentYear, fetchCards, fetchTransactions]);

  const monthlyTransactions = useMemo(
    () =>
      transactions.filter((transaction) => {
        const transactionDate = getDateOnlyParts(transaction.date);

        return (
          transactionDate.month === currentMonth &&
          transactionDate.year === currentYear
        );
      }),
    [currentMonth, currentYear, transactions],
  );

  const selectedCard =
    cards.find((card) => card.id === selectedCardId) ?? cards[0] ?? null;

  const selectedCardTransactions = useMemo(
    () =>
      selectedCard
        ? monthlyTransactions
            .filter((transaction) => transaction.cardId === selectedCard.id)
            .sort((left, right) => right.date.localeCompare(left.date))
        : [],
    [monthlyTransactions, selectedCard],
  );

  const selectedInvoiceTotal = selectedCardTransactions.reduce(
    (total, transaction) => total + transaction.amount,
    0,
  );
  const selectedLimit = selectedCard?.limitAmount ?? 0;
  const selectedUsage =
    selectedLimit > 0
      ? Math.min((selectedInvoiceTotal / selectedLimit) * 100, 100)
      : 0;

  function openCreateModal() {
    setEditingCard(null);
    setIsAddCardModalOpen(true);
  }

  function openEditModal(card: FinanceCard) {
    setEditingCard(card);
    setIsAddCardModalOpen(true);
  }

  function closeCardModal() {
    setIsAddCardModalOpen(false);
    setEditingCard(null);
  }

  function handleCardKeyDown(
    event: KeyboardEvent<HTMLDivElement>,
    cardId: string,
  ) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setSelectedCardId(cardId);
    }
  }

  async function handleDeleteCard(cardId: string) {
    try {
      await deleteCard(cardId);
      toast.success("Cartão removido.");
    } catch (error) {
      console.error("Erro ao remover cartão:", error);
      toast.error(
        error instanceof Error ? error.message : "Erro ao remover cartão.",
      );
    }
  }

  async function handlePayInvoiceClick(cardId: string) {
    try {
      await payCardInvoice(cardId);
      toast.success("Fatura liquidada!");
      await fetchTransactions();
    } catch (error) {
      console.error("Erro ao liquidar fatura:", error);
      toast.error("Não foi possível liquidar a fatura.");
    }
  }

  return (
    <div className="flex w-full flex-col gap-8">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Meus Cartões
          </h1>
          <p className="text-muted-foreground">
            Gerencie cartões, limites, fechamento e vencimento.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            onClick={openCreateModal}
            className="h-12 cursor-pointer gap-2 bg-primary px-6 text-base font-semibold text-primary-foreground shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl"
          >
            <Plus className="h-5 w-5" />
            Adicionar Cartão
          </Button>
        </div>
      </div>

      <section className="space-y-4">
        <div className="flex flex-nowrap gap-6 overflow-x-auto overflow-y-hidden p-2 pb-4 snap-x snap-mandatory scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {cards.map((card) => {
              const cardTransactions = monthlyTransactions.filter(
                (transaction) => transaction.cardId === card.id,
              );
              const invoiceTotal = cardTransactions.reduce(
                (total, transaction) => total + transaction.amount,
                0,
              );
              const isSelected = selectedCard?.id === card.id;

              return (
                <div
                  key={card.id}
                  className="w-full max-w-[340px] shrink-0 snap-start overflow-visible"
                >
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedCardId(card.id)}
                    onKeyDown={(event) => handleCardKeyDown(event, card.id)}
                    className={cn(
                      "group relative flex h-[214px] w-full max-w-[340px] shrink-0 cursor-pointer flex-col justify-between overflow-hidden rounded-2xl border-2 p-6 text-left text-white transition-all duration-300 ease-in-out",
                      getCardGradient(card.name),
                      isSelected
                        ? "scale-105 border-white/80 opacity-100 shadow-2xl"
                        : "scale-95 border-transparent opacity-50 shadow-lg hover:opacity-80",
                    )}
                  >
                    <div className="pointer-events-none absolute -right-12 -top-12 size-36 rounded-full bg-white/10" />
                    <div className="pointer-events-none absolute -bottom-14 left-10 size-36 rounded-full bg-black/20" />

                    <div className="relative flex items-start justify-between gap-4">
                      <div>
                        <div className="mb-5 h-8 w-12 rounded-md border border-white/25 bg-gradient-to-br from-white/45 to-white/10 shadow-inner" />
                        <h2 className="max-w-48 truncate text-lg font-semibold text-white">
                          {card.name}
                        </h2>
                        <p className="mt-1 text-xs text-white/65">
                          {card.closingDay
                            ? `Fecha dia ${card.closingDay}`
                            : "Fechamento livre"}
                          {" • "}
                          {card.dueDay
                            ? `Vence dia ${card.dueDay}`
                            : "Sem vencimento"}
                        </p>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            onClick={(event) => event.stopPropagation()}
                            className="inline-flex size-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
                            aria-label={`Ações do cartão ${card.name}`}
                          >
                            <MoreHorizontal className="size-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-36">
                          <DropdownMenuItem
                            onClick={(event) => {
                              event.stopPropagation();
                              openEditModal(card);
                            }}
                          >
                            <Edit3 />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={(event) => {
                              event.stopPropagation();
                              void handleDeleteCard(card.id);
                            }}
                          >
                            <Trash2 />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="relative mt-8 flex items-end justify-between gap-4">
                      <CreditCard className="size-6 text-white/70" />
                      <div className="text-right">
                        <p className="text-xs font-medium uppercase text-white/60">
                          Fatura atual
                        </p>
                        <strong className="mt-1 block text-2xl font-bold tracking-normal">
                          {brlFormatter.format(invoiceTotal)}
                        </strong>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="mt-3 h-8 border-white/25 bg-white/10 px-3 text-xs text-white hover:bg-white/20 hover:text-white"
                          onClick={(event) => {
                            event.stopPropagation();
                            void handlePayInvoiceClick(card.id);
                          }}
                        >
                          Pagar Fatura
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>

        {!cards.length ? (
          <Card className="rounded-lg border-dashed border-border bg-card shadow-none">
            <CardContent className="flex min-h-52 items-center justify-center text-center text-muted-foreground">
              Nenhum cartão cadastrado ainda.
            </CardContent>
          </Card>
        ) : null}
      </section>

      <Card className="rounded-lg border-border bg-card shadow-none">
        <CardHeader className="border-b">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <CardDescription>Visão da fatura</CardDescription>
              <CardTitle className="mt-1 text-2xl tracking-normal">
                {selectedCard?.name ?? "Nenhum cartão selecionado"}
              </CardTitle>
            </div>
            <div className="text-left lg:text-right">
              <p className="text-sm text-muted-foreground">Total do mês</p>
              <p className="mt-1 text-3xl font-bold text-foreground">
                {brlFormatter.format(selectedInvoiceTotal)}
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Limite consumido</span>
              <span>
                {selectedLimit > 0
                  ? `${selectedUsage.toFixed(0)}% de ${brlFormatter.format(selectedLimit)}`
                  : "Sem limite definido"}
              </span>
            </div>
            <Progress value={selectedUsage} className="h-2" />
          </div>
        </CardHeader>

        <CardContent className="pt-4">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="hidden md:table-cell">Categoria</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {selectedCardTransactions.length ? (
                selectedCardTransactions.map((transaction) => (
                  <TableRow key={transaction.id} className="hover:bg-muted/35">
                    <TableCell className="text-muted-foreground">
                      {formatDateOnlyBR(transaction.date)}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-foreground">
                        <TransactionDescription transaction={transaction} />
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant="outline" className="rounded-lg">
                        {transaction.category || "Sem categoria"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium text-red-300">
                      -{brlFormatter.format(transaction.amount)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="h-28 text-center text-muted-foreground"
                  >
                    Nenhuma transação deste cartão no mês atual.
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
    </div>
  );
}
