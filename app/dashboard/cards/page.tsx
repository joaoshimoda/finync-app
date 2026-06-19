"use client";

import { KeyboardEvent, useEffect, useMemo, useState } from "react";
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

function FlippableManagedCard({
  card,
  invoiceTotal,
  isSelected,
  onSelect,
  onKeyDown,
  onEdit,
  onDelete,
  onPayInvoice,
}: {
  card: FinanceCard;
  invoiceTotal: number;
  isSelected: boolean;
  onSelect: (cardId: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>, cardId: string) => void;
  onEdit: (card: FinanceCard) => void;
  onDelete: (card: FinanceCard) => void;
  onPayInvoice: (cardId: string) => void;
}) {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div className="h-[176px] w-full perspective-[1000px] lg:w-[280px]">
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

          <div className="relative mt-4 flex items-end justify-between gap-3">
            <CreditCard className="size-5 text-white/70" />
            <div className="text-right">
              <p className="text-xs font-medium uppercase text-white/60">
                Fatura projetada
              </p>
              <strong className="mt-1 block text-lg font-bold tracking-normal">
                {brlFormatter.format(invoiceTotal)}
              </strong>
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
              <strong className="mt-1 block text-2xl font-bold text-white">
                {brlFormatter.format(invoiceTotal)}
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
          <div className="relative grid grid-cols-2 gap-2">
            <Button
              type="button"
              size="sm"
              className="col-span-2 h-8 bg-white text-zinc-950 hover:bg-white/90"
              onClick={() => onPayInvoice(card.id)}
            >
              Pagar Fatura
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 border-white/25 bg-white/10 text-white hover:bg-white/20 hover:text-white"
              onClick={() => onEdit(card)}
            >
              <Edit3 className="size-4" />
              Editar
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 border-white/25 bg-white/10 text-white hover:bg-red-500/30 hover:text-white"
              onClick={() => onDelete(card)}
            >
              <Trash2 className="size-4" />
              Excluir
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

  async function handleDeleteCard() {
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
    <div className="flex w-full flex-col gap-4">
      <div className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">
            Meus Cartões
          </h1>
          <p className="text-sm text-muted-foreground lg:text-base">
            Gerencie cartões, limites, fechamento e vencimento.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            onClick={openCreateModal}
            className="h-12 gap-2 bg-emerald-600 px-6 text-base font-semibold text-white hover:bg-emerald-700"
          >
            <PlusCircle className="size-5" />
            Adicionar Cartão
          </Button>
        </div>
      </div>

      <section className="space-y-2">
        <Carousel opts={{ dragFree: true }} className="w-full">
          <CarouselContent className="-ml-4 px-2 pt-2 pb-6">
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
                <CarouselItem
                  key={card.id}
                  className="basis-full pl-4 lg:basis-auto"
                >
                  <FlippableManagedCard
                    card={card}
                    invoiceTotal={invoiceTotal}
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
          <CarouselPrevious className="absolute -left-12 z-50 hidden bg-background/80 lg:-left-16 lg:inline-flex" />
          <CarouselNext className="absolute -right-12 z-50 hidden bg-background/80 lg:-right-16 lg:inline-flex" />
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
          <Table className="min-w-[560px] lg:min-w-full">
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
                    <TableCell className="hidden lg:table-cell">
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
