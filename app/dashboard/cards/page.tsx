"use client";

import { useCallback, useEffect, useState } from "react";
import { MotionConfig, motion } from "framer-motion";
import {
  CalendarClock,
  CreditCard,
  Gauge,
  PlusCircle,
  Receipt,
} from "lucide-react";
import { toast } from "sonner";

import {
  CategoriesPanel,
  InstallmentsPanel,
  InvoicePanel,
  LimitPanel,
  SubscriptionsPanel,
} from "@/components/cards/CardDetailPanels";
import { CardsWallet } from "@/components/cards/CardsWallet";
import { InvoiceTransactions } from "@/components/cards/InvoiceTransactions";
import { useCardsData } from "@/components/cards/useCardsData";
import { StatHint, StatTile } from "@/components/dashboard/controls";
import {
  dashboardEase,
  dashboardPanelClassName,
  dashboardReveal,
  dashboardStagger,
  usePrivateCurrency,
} from "@/components/dashboard/shared";
import { AnimatedMonthSelector } from "@/components/finance/AnimatedMonthSelector";
import { useFocusRequest } from "@/components/layout/DashboardActionsProvider";
import { AddCardModal } from "@/components/modals/AddCardModal";
import { PayInvoiceModal } from "@/components/modals/PayInvoiceModal";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { formatDateOnlyBR } from "@/lib/dateUtils";
import { cn } from "@/lib/utils";
import {
  useFinanceStore,
  type Card as FinanceCard,
  type CardInvoice,
} from "@/store/useFinanceStore";

const monthFormatter = new Intl.DateTimeFormat("pt-BR", { month: "long" });

function getDueCountdown(daysUntil: number) {
  if (daysUntil < 0) return `venceu há ${Math.abs(daysUntil)} dias`;
  if (daysUntil === 0) return "vence hoje";
  if (daysUntil === 1) return "vence amanhã";
  return `em ${daysUntil} dias`;
}

export default function CardsPage() {
  const [isAddCardModalOpen, setIsAddCardModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<FinanceCard | null>(null);
  const [deleteTargetCard, setDeleteTargetCard] = useState<FinanceCard | null>(
    null,
  );
  const [isDeletingCard, setIsDeletingCard] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  useFocusRequest("card", (target) => setSelectedCardId(target.id));
  const [paymentTarget, setPaymentTarget] = useState<{
    invoice: CardInvoice;
    cardName: string;
  } | null>(null);

  const fetchTransactions = useFinanceStore((state) => state.fetchTransactions);
  const fetchDependents = useFinanceStore((state) => state.fetchDependents);
  const deleteCard = useFinanceStore((state) => state.deleteCard);
  const currentMonth = useFinanceStore((state) => state.currentMonth);
  const currentYear = useFinanceStore((state) => state.currentYear);
  const isFetching = useFinanceStore((state) => state.isFetching);
  const nextMonth = useFinanceStore((state) => state.nextMonth);
  const prevMonth = useFinanceStore((state) => state.prevMonth);
  const formatValue = usePrivateCurrency();

  useEffect(() => {
    void fetchTransactions();
    void fetchDependents();
  }, [currentMonth, currentYear, fetchDependents, fetchTransactions]);

  const { overviews, portfolio, selected } = useCardsData(selectedCardId);
  const monthLabel = monthFormatter.format(
    new Date(currentYear, currentMonth - 1, 1),
  );

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

  const handleDeleteCard = useCallback(async () => {
    if (!deleteTargetCard || isDeletingCard) return;

    setIsDeletingCard(true);

    try {
      await deleteCard(deleteTargetCard.id);
      if (selectedCardId === deleteTargetCard.id) setSelectedCardId(null);
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

  const summaryTiles = [
    {
      label: `Faturas de ${monthLabel}`,
      icon: Receipt,
      value: portfolio.invoicesTotal,
      hint: `Previsto ${formatValue(portfolio.projectedTotal)}`,
    },
    {
      label: "Limite disponível",
      icon: Gauge,
      value: portfolio.totalAvailable,
      hint:
        portfolio.totalLimit > 0
          ? `${portfolio.limitUsage.toFixed(0)}% de ${formatValue(portfolio.totalLimit)} em uso`
          : "Nenhum limite informado",
      progress: portfolio.totalLimit > 0 ? portfolio.limitUsage : null,
    },
    {
      label: "Próximo vencimento",
      icon: CalendarClock,
      value: portfolio.nextDue?.amount ?? 0,
      hint: portfolio.nextDue
        ? `${portfolio.nextDue.name} · ${formatDateOnlyBR(portfolio.nextDue.dueDate).slice(0, 5)} · ${getDueCountdown(portfolio.nextDue.daysUntil)}`
        : "Nenhuma fatura em aberto",
    },
  ];

  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        variants={dashboardStagger}
        initial="hidden"
        animate="visible"
        className="flex w-full flex-col gap-5 pb-4 sm:gap-6"
      >
        <motion.header
          variants={dashboardReveal}
          className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"
        >
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-emerald-300">
              <CreditCard className="size-3.5" />
              Crédito
            </p>
            <h1 className="mt-1.5 text-2xl font-semibold tracking-[-0.03em] text-zinc-50 sm:text-3xl">
              Cartões e faturas
            </h1>
            <p className="mt-1 text-sm text-zinc-400">
              {overviews.length
                ? `${overviews.length} ${overviews.length === 1 ? "cartão" : "cartões"} · faturas de ${monthLabel}`
                : "Cadastre seus cartões para acompanhar limites e faturas."}
            </p>
          </div>
          <div className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2 sm:flex sm:w-auto">
            <div className="min-w-0 sm:shrink-0">
              <AnimatedMonthSelector
                currentMonth={currentMonth}
                currentYear={currentYear}
                onPreviousMonth={prevMonth}
                onNextMonth={nextMonth}
                isLoading={isFetching}
              />
            </div>
            <Button
              type="button"
              onClick={openCreateModal}
              aria-label="Adicionar cartão"
              className="h-11 gap-2 rounded-lg bg-emerald-400 px-4 font-semibold text-zinc-950 hover:bg-emerald-300 sm:px-5"
            >
              <PlusCircle className="size-5" />
              <span className="hidden min-[420px]:inline">Novo cartão</span>
            </Button>
          </div>
        </motion.header>

        {overviews.length && selected ? (
          <>
            <motion.section
              variants={dashboardReveal}
              aria-label="Resumo da carteira"
              className={cn(
                dashboardPanelClassName,
                "grid divide-y divide-white/[0.06] transition-opacity sm:grid-cols-3 sm:divide-x sm:divide-y-0",
                isFetching && "opacity-70",
              )}
            >
              {summaryTiles.map((tile) => (
                <StatTile
                  key={tile.label}
                  icon={tile.icon}
                  label={tile.label}
                  value={tile.value}
                  progress={"progress" in tile ? tile.progress : undefined}
                >
                  <StatHint>{tile.hint}</StatHint>
                </StatTile>
              ))}
            </motion.section>

            <CardsWallet
              overviews={overviews}
              selectedCardId={selected.card.id}
              onSelect={setSelectedCardId}
              onAddCard={openCreateModal}
            />

            <motion.div
              key={`${selected.card.id}-${currentYear}-${currentMonth}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: dashboardEase }}
              className={cn(
                "flex flex-col gap-5 transition-opacity sm:gap-6",
                isFetching && "opacity-70",
              )}
            >
              <motion.div
                variants={dashboardStagger}
                initial="hidden"
                animate="visible"
                className="grid gap-5 sm:gap-6 lg:grid-cols-12"
              >
                <InvoicePanel
                  selected={selected}
                  monthLabel={monthLabel}
                  onPay={() =>
                    selected.invoice &&
                    setPaymentTarget({
                      invoice: selected.invoice,
                      cardName: selected.card.name,
                    })
                  }
                  onEdit={() => openEditModal(selected.card)}
                  onDelete={() => setDeleteTargetCard(selected.card)}
                />
                <LimitPanel
                  selected={selected}
                  onEdit={() => openEditModal(selected.card)}
                />
              </motion.div>

              <motion.div
                variants={dashboardStagger}
                initial="hidden"
                animate="visible"
                className="grid items-start gap-5 sm:gap-6 lg:grid-cols-12"
              >
                <div className="min-w-0 lg:col-span-7 xl:col-span-8">
                  <InvoiceTransactions
                    key={`${selected.card.id}-${currentYear}-${currentMonth}`}
                    transactions={selected.transactions}
                    dependentNames={selected.dependentNames}
                  />
                </div>
                <motion.div
                  variants={dashboardStagger}
                  className="grid min-w-0 gap-5 sm:gap-6 lg:col-span-5 xl:col-span-4"
                >
                  <InstallmentsPanel selected={selected} />
                  <SubscriptionsPanel selected={selected} />
                  <CategoriesPanel selected={selected} />
                </motion.div>
              </motion.div>
            </motion.div>
          </>
        ) : (
          <motion.section
            variants={dashboardReveal}
            className={cn(
              dashboardPanelClassName,
              "flex min-h-80 flex-col items-center justify-center px-6 py-12 text-center",
            )}
          >
            <span className="flex size-14 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-300">
              <CreditCard className="size-6" />
            </span>
            <h2 className="mt-5 text-lg font-semibold text-zinc-100">
              Nenhum cartão cadastrado
            </h2>
            <p className="mt-1.5 max-w-sm text-sm leading-6 text-zinc-500">
              Adicione seu primeiro cartão para acompanhar faturas, limite,
              parcelamentos e assinaturas em um só lugar.
            </p>
            <Button
              type="button"
              data-tour="cards-add"
              onClick={openCreateModal}
              className="mt-6 h-11 gap-2 bg-emerald-400 px-6 font-semibold text-zinc-950 hover:bg-emerald-300"
            >
              <PlusCircle className="size-5" />
              Adicionar cartão
            </Button>
          </motion.section>
        )}
      </motion.div>

      <AddCardModal
        isOpen={isAddCardModalOpen}
        onClose={closeCardModal}
        editingCard={editingCard}
        onDelete={(card) => {
          closeCardModal();
          setDeleteTargetCard(card);
        }}
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
    </MotionConfig>
  );
}
