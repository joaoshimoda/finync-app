"use client";

import { motion } from "framer-motion";
import { Check, Nfc, Plus } from "lucide-react";

import type { CardOverview } from "@/components/cards/useCardsData";
import { getCardGradientClassName } from "@/components/dashboard/CardsSection";
import {
  dashboardEase,
  dashboardPanelClassName,
  dashboardReveal,
  usePrivateCurrency,
} from "@/components/dashboard/shared";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { formatDateOnlyBR } from "@/lib/dateUtils";
import { cn } from "@/lib/utils";

const cardWidthClassName =
  "w-[min(calc(100vw-5.25rem),20rem)] max-w-full shrink-0 sm:w-80";

function usageTone(usage: number) {
  if (usage >= 90) return "bg-rose-400";
  if (usage >= 70) return "bg-amber-400";
  return "bg-emerald-400";
}

function CardFace({
  overview,
  isSelected,
  onSelect,
}: {
  overview: CardOverview;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const formatValue = usePrivateCurrency();
  const { card } = overview;

  return (
    <div className={cardWidthClassName}>
      <motion.button
        type="button"
        onClick={onSelect}
        aria-pressed={isSelected}
        aria-label={`Selecionar cartão ${card.name}`}
        whileHover={{ y: -4 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: "spring", stiffness: 320, damping: 24 }}
        className={cn(
          "relative flex aspect-[1.586/1] w-full flex-col overflow-hidden rounded-2xl p-5 text-left text-white shadow-lg shadow-black/30 outline-none ring-inset transition-shadow focus-visible:ring-2 focus-visible:ring-white/70",
          getCardGradientClassName(card.name, card.color),
          isSelected
            ? "ring-2 ring-white/70 shadow-xl"
            : "ring-1 ring-white/15",
        )}
      >
        <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.16)_0%,transparent_42%)]" />
        <span className="relative flex items-center justify-between gap-3">
          <span className="flex min-w-0 items-center gap-2">
            <span className="truncate text-[15px] font-semibold tracking-tight">
              {card.name}
            </span>
            <Nfc className="size-4 shrink-0 text-white/60" />
          </span>
          {isSelected && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex size-6 items-center justify-center rounded-full bg-white text-zinc-950"
            >
              <Check className="size-3.5" />
            </motion.span>
          )}
        </span>
        <span className="relative mt-4 block h-7 w-10 rounded-md bg-gradient-to-br from-amber-100/90 via-amber-300/80 to-amber-500/70 shadow-inner" />
        <span className="relative mt-auto flex items-end justify-between gap-3">
          <span className="min-w-0">
            <span className="block text-[11px] font-medium uppercase tracking-[0.12em] text-white/65">
              Fatura atual
            </span>
            <span className="mt-1 block truncate text-2xl font-semibold leading-none tracking-tight tabular-nums">
              {formatValue(overview.invoiceTotal)}
            </span>
          </span>
          <span className="shrink-0 text-right text-xs font-medium text-white/80">
            {overview.dueDate
              ? `Vence ${formatDateOnlyBR(overview.dueDate).slice(0, 5)}`
              : "Sem vencimento"}
          </span>
        </span>
      </motion.button>

      <div className="mt-3 px-1">
        {overview.limitAmount > 0 ? (
          <>
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="text-zinc-500">
                {formatValue(overview.available)}{" "}
                <span className="text-zinc-600">livres</span>
              </span>
              <span className="tabular-nums text-zinc-400">
                {overview.limitUsage.toFixed(0)}%
              </span>
            </div>
            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-zinc-800">
              <motion.div
                className={cn(
                  "h-full rounded-full",
                  usageTone(overview.limitUsage),
                )}
                initial={{ width: 0 }}
                animate={{ width: `${overview.limitUsage}%` }}
                transition={{ duration: 0.8, ease: dashboardEase }}
              />
            </div>
          </>
        ) : (
          <p className="text-xs text-zinc-600">Limite não informado</p>
        )}
      </div>
    </div>
  );
}

export function CardsWallet({
  overviews,
  selectedCardId,
  onSelect,
  onAddCard,
}: {
  overviews: CardOverview[];
  selectedCardId: string | null;
  onSelect: (cardId: string) => void;
  onAddCard: () => void;
}) {
  return (
    <motion.section
      variants={dashboardReveal}
      aria-label="Seus cartões"
      className={cn(
        dashboardPanelClassName,
        "min-w-0 overflow-hidden p-5 sm:p-6",
      )}
    >
      <Carousel opts={{ dragFree: true, align: "start" }} className="min-w-0">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-zinc-100">Carteira</h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              Toque em um cartão para ver a fatura e os detalhes.
            </p>
          </div>
          {overviews.length > 2 && (
            <div className="hidden items-center gap-2 sm:flex">
              <CarouselPrevious className="static left-auto top-auto translate-y-0 border-white/[0.08] bg-zinc-950" />
              <CarouselNext className="static right-auto top-auto translate-y-0 border-white/[0.08] bg-zinc-950" />
            </div>
          )}
        </div>
        <CarouselContent className="-ml-4 mt-5 py-1.5 pl-1">
          {overviews.map((overview) => (
            <CarouselItem key={overview.card.id} className="basis-auto pl-4">
              <CardFace
                overview={overview}
                isSelected={overview.card.id === selectedCardId}
                onSelect={() => onSelect(overview.card.id)}
              />
            </CarouselItem>
          ))}
          <CarouselItem className="basis-auto pl-4">
            <button
              type="button"
              data-tour="cards-add"
              onClick={onAddCard}
              className={cn(
                cardWidthClassName,
                "group flex aspect-[1.586/1] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/[0.1] text-zinc-500 transition-colors hover:border-emerald-400/40 hover:text-emerald-300",
              )}
            >
              <span className="flex size-10 items-center justify-center rounded-full border border-current transition-transform duration-300 group-hover:scale-110">
                <Plus className="size-5" />
              </span>
              <span className="text-sm font-medium">Adicionar cartão</span>
            </button>
          </CarouselItem>
        </CarouselContent>
      </Carousel>
    </motion.section>
  );
}
