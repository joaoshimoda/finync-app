"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CreditCard, Nfc, Plus, RotateCcw } from "lucide-react";

import {
  DashboardSectionHeader,
  dashboardEase,
  dashboardPanelClassName,
  dashboardReveal,
  usePrivateCurrency,
} from "@/components/dashboard/shared";
import type { CardSpendingSummary } from "@/components/dashboard/useDashboardData";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { formatDateOnlyBR } from "@/lib/dateUtils";
import { cn } from "@/lib/utils";
import type { CardInvoice } from "@/store/useFinanceStore";

const walletCardWidthClassName =
  "w-[min(calc(100vw-5.25rem),20rem)] max-w-full shrink-0 sm:w-80";

const walletCardSizeClassName = `aspect-[1.586/1] h-auto ${walletCardWidthClassName}`;

const cardFlipTransition = { duration: 0.2, ease: dashboardEase };

function getCardGradientClassName(cardName: string, cardColor?: string) {
  const normalizedColor = cardColor?.toLowerCase();
  if (normalizedColor === "#18181b")
    return "bg-gradient-to-br from-zinc-700 via-zinc-900 to-black";
  if (normalizedColor === "#6d28d9")
    return "bg-gradient-to-br from-violet-500 via-violet-700 to-purple-950";
  if (normalizedColor === "#1d4ed8")
    return "bg-gradient-to-br from-blue-500 via-blue-700 to-blue-950";
  if (normalizedColor === "#ea580c")
    return "bg-gradient-to-br from-orange-400 via-orange-600 to-orange-950";
  if (normalizedColor === "#047857")
    return "bg-gradient-to-br from-emerald-500 via-emerald-700 to-emerald-950";
  if (normalizedColor === "#be123c")
    return "bg-gradient-to-br from-rose-500 via-rose-700 to-rose-950";

  const name = cardName.toLowerCase();
  if (name.includes("nubank"))
    return "bg-gradient-to-br from-fuchsia-950 via-purple-950 to-black";
  if (name.includes("itaú") || name.includes("itau"))
    return "bg-gradient-to-br from-zinc-700 via-zinc-900 to-black";
  if (name.includes("inter"))
    return "bg-gradient-to-br from-orange-800 via-orange-950 to-black";
  if (name.includes("bradesco"))
    return "bg-gradient-to-br from-rose-900 via-zinc-950 to-black";
  return "bg-gradient-to-br from-slate-700 via-zinc-900 to-black";
}

function getCardDueLabel(cardSummary: CardSpendingSummary) {
  if (cardSummary.dueDate) {
    return `Vence ${formatDateOnlyBR(cardSummary.dueDate).slice(0, 5)}`;
  }

  return cardSummary.dueDay
    ? `Vence dia ${cardSummary.dueDay}`
    : "Sem vencimento";
}

function WalletCard({
  cardSummary,
  onPayInvoice,
}: {
  cardSummary: CardSpendingSummary;
  onPayInvoice: (invoice: CardInvoice, cardName: string) => void;
}) {
  const [isFlipped, setIsFlipped] = useState(false);
  const formatPrivateCurrency = usePrivateCurrency();
  const canPayInvoice = Boolean(
    cardSummary.invoice &&
    cardSummary.invoiceStatus !== "paid" &&
    cardSummary.invoice.totalAmount > cardSummary.invoice.paidAmount,
  );
  const visibleDependents = cardSummary.dependentBreakdown.slice(0, 2);
  const hiddenDependentsCount =
    cardSummary.dependentBreakdown.length - visibleDependents.length;

  // The card only carries a 3D transform while it turns; at rest the
  // transform is "none", which keeps the text sharp.
  return (
    <div className={cn(walletCardSizeClassName, "perspective-[1200px]")}>
      <AnimatePresence mode="wait" initial={false}>
        {isFlipped ? (
          <motion.div
            key="back"
            initial={{ rotateY: -90 }}
            animate={{ rotateY: 0 }}
            exit={{ rotateY: 90 }}
            transition={cardFlipTransition}
            className="relative flex size-full flex-col overflow-hidden rounded-2xl bg-zinc-900 p-4 text-zinc-100 shadow-lg shadow-black/30 ring-1 ring-inset ring-white/10 sm:p-5"
          >
            <span
              className={cn(
                "pointer-events-none absolute inset-x-0 top-0 h-1",
                getCardGradientClassName(cardSummary.name, cardSummary.color),
              )}
            />
            <div className="flex items-center justify-between gap-3">
              <p className="truncate text-sm font-semibold">
                {cardSummary.name}
              </p>
              <button
                type="button"
                onClick={() => setIsFlipped(false)}
                className="flex shrink-0 items-center gap-1 rounded-full bg-white/[0.06] px-2.5 py-0.5 text-[11px] font-medium text-zinc-300 transition-colors hover:bg-white/[0.1] hover:text-white"
              >
                <RotateCcw className="size-3" />
                Voltar
              </button>
            </div>

            <dl className="mt-2 grid grid-cols-2 gap-3">
              <div className="min-w-0">
                <dt className="text-[11px] text-zinc-500">Fatura atual</dt>
                <dd className="truncate text-base font-semibold tabular-nums">
                  {formatPrivateCurrency(cardSummary.current)}
                </dd>
              </div>
              <div className="min-w-0">
                <dt className="text-[11px] text-zinc-500">Sua parte</dt>
                <dd className="truncate text-base font-semibold tabular-nums">
                  {formatPrivateCurrency(cardSummary.personalCurrent)}
                </dd>
              </div>
            </dl>

            <div className="mt-2 border-t border-white/[0.06] pt-2 text-xs">
              {visibleDependents.length ? (
                <ul className="space-y-1">
                  {visibleDependents.map((dependent) => (
                    <li
                      key={dependent.id}
                      className="flex items-center justify-between gap-3"
                    >
                      <span className="flex min-w-0 items-center gap-1.5 text-zinc-400">
                        <span className="size-1.5 shrink-0 rounded-full bg-cyan-400" />
                        <span className="truncate">{dependent.name} deve</span>
                      </span>
                      <span className="shrink-0 font-medium tabular-nums text-zinc-100">
                        {formatPrivateCurrency(dependent.amount)}
                      </span>
                    </li>
                  ))}
                  {hiddenDependentsCount > 0 && (
                    <li className="text-zinc-500">
                      +{hiddenDependentsCount}{" "}
                      {hiddenDependentsCount === 1
                        ? "dependente"
                        : "dependentes"}
                    </li>
                  )}
                </ul>
              ) : (
                <p className="text-zinc-500">Nenhum gasto de dependentes.</p>
              )}
            </div>

            <div className="min-h-2 flex-1" />
            <Button
              type="button"
              disabled={!canPayInvoice}
              onClick={() => {
                if (cardSummary.invoice) {
                  onPayInvoice(cardSummary.invoice, cardSummary.name);
                }
              }}
              className="h-8 w-full shrink-0 bg-emerald-400 text-xs font-semibold text-zinc-950 hover:bg-emerald-300"
            >
              {cardSummary.invoiceStatus === "paid"
                ? "Fatura paga"
                : "Pagar fatura"}
            </Button>
          </motion.div>
        ) : (
          <motion.button
            key="front"
            type="button"
            onClick={() => setIsFlipped(true)}
            aria-label={`Ver detalhes do cartão ${cardSummary.name}`}
            initial={{ rotateY: -90 }}
            animate={{ rotateY: 0 }}
            exit={{ rotateY: 90 }}
            transition={cardFlipTransition}
            className={cn(
              "group relative flex size-full flex-col overflow-hidden rounded-2xl p-5 text-left text-white shadow-lg shadow-black/30 outline-none ring-1 ring-inset ring-white/15 focus-visible:ring-2 focus-visible:ring-white/70",
              getCardGradientClassName(cardSummary.name, cardSummary.color),
            )}
          >
            <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.16)_0%,transparent_42%)]" />
            <span className="relative flex items-center justify-between gap-3">
              <span className="flex min-w-0 items-center gap-2">
                <span className="truncate text-[15px] font-semibold tracking-tight">
                  {cardSummary.name}
                </span>
                <Nfc className="size-4 shrink-0 text-white/60" />
              </span>
              <span className="flex shrink-0 items-center gap-1 rounded-full bg-black/25 px-2.5 py-1 text-[11px] font-medium text-white/90 transition-colors group-hover:bg-black/40">
                <RotateCcw className="size-3 transition-transform duration-300 group-hover:-rotate-180" />
                Detalhes
              </span>
            </span>
            <span className="relative mt-4 block h-7 w-10 rounded-md bg-gradient-to-br from-amber-100/90 via-amber-300/80 to-amber-500/70 shadow-inner" />
            <span className="relative mt-auto flex items-end justify-between gap-3">
              <span className="min-w-0">
                <span className="block text-[11px] font-medium uppercase tracking-[0.12em] text-white/65">
                  Fatura atual
                </span>
                <span className="mt-1 block truncate text-2xl font-semibold leading-none tracking-tight tabular-nums">
                  {formatPrivateCurrency(cardSummary.current)}
                </span>
              </span>
              <span className="shrink-0 text-right text-xs font-medium text-white/80">
                {getCardDueLabel(cardSummary)}
              </span>
            </span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

export function CardsSection({
  cardSummaries,
  onAddCard,
  onPayInvoice,
}: {
  cardSummaries: CardSpendingSummary[];
  onAddCard: () => void;
  onPayInvoice: (invoice: CardInvoice, cardName: string) => void;
}) {
  return (
    <motion.section
      variants={dashboardReveal}
      aria-labelledby="dashboard-cards-title"
      className={cn(
        dashboardPanelClassName,
        "min-w-0 overflow-hidden p-5 sm:p-6",
      )}
    >
      <DashboardSectionHeader
        id="dashboard-cards-title"
        title="Cartões"
        href="/dashboard/cards"
        actionLabel="Gerenciar"
      />
      {cardSummaries.length ? (
        <Carousel
          opts={{ dragFree: true, align: "start" }}
          className="mt-5 min-w-0"
        >
          <CarouselContent className="-ml-4 py-1 pl-1">
            {cardSummaries.map((cardSummary) => (
              <CarouselItem key={cardSummary.id} className="basis-auto pl-4">
                <WalletCard
                  cardSummary={cardSummary}
                  onPayInvoice={onPayInvoice}
                />
              </CarouselItem>
            ))}
            <CarouselItem className="basis-auto pl-4">
              <button
                type="button"
                onClick={onAddCard}
                className={cn(
                  walletCardSizeClassName,
                  "group flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/[0.1] text-zinc-500 transition-colors hover:border-emerald-400/40 hover:text-emerald-300",
                )}
              >
                <span className="flex size-10 items-center justify-center rounded-full border border-current transition-transform duration-300 group-hover:scale-110">
                  <Plus className="size-5" />
                </span>
                <span className="text-sm font-medium">Adicionar cartão</span>
              </button>
            </CarouselItem>
          </CarouselContent>
          {cardSummaries.length > 2 && (
            <div className="mt-4 hidden items-center gap-2 sm:flex">
              <CarouselPrevious className="static left-auto top-auto translate-y-0 border-white/[0.08] bg-zinc-950" />
              <CarouselNext className="static right-auto top-auto translate-y-0 border-white/[0.08] bg-zinc-950" />
            </div>
          )}
        </Carousel>
      ) : (
        <div className="mt-5 flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-white/[0.1] px-6 py-10 text-center">
          <span className="flex size-11 items-center justify-center rounded-full bg-violet-500/10 text-violet-300">
            <CreditCard className="size-5" />
          </span>
          <div>
            <p className="text-sm font-medium text-zinc-200">
              Nenhum cartão cadastrado
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Cadastre um cartão para acompanhar suas faturas.
            </p>
          </div>
          <Button
            type="button"
            onClick={onAddCard}
            className="mt-1 bg-emerald-400 font-semibold text-zinc-950 hover:bg-emerald-300"
          >
            <Plus className="size-4" />
            Adicionar cartão
          </Button>
        </div>
      )}
    </motion.section>
  );
}
