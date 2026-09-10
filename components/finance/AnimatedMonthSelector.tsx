"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AnimatedMonthSelectorProps {
  currentMonth: number;
  currentYear: number;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  isLoading?: boolean;
}

const monthFormatter = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  year: "numeric",
});

export function AnimatedMonthSelector({
  currentMonth,
  currentYear,
  onPreviousMonth,
  onNextMonth,
  isLoading = false,
}: AnimatedMonthSelectorProps) {
  const label = monthFormatter
    .format(new Date(currentYear, currentMonth - 1, 1))
    .replace(/^\w/, (letter) => letter.toUpperCase());
  return (
    <div
      data-tour="month-selector"
      className="flex h-11 w-full min-w-0 items-center gap-1 rounded-lg border border-white/[0.08] bg-zinc-900/70 p-1 shadow-lg shadow-black/15 backdrop-blur-xl sm:w-max"
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onPreviousMonth}
        aria-label="Mês anterior"
        className="size-9 shrink-0 rounded-md text-zinc-400 hover:bg-white/[0.06] hover:text-emerald-300"
      >
        <ChevronLeft className="size-5" />
      </Button>
      <div
        className={`min-w-0 flex-1 truncate whitespace-nowrap px-2 text-center text-sm font-semibold text-zinc-100 transition-opacity sm:min-w-36 sm:text-base ${isLoading ? "opacity-60" : "opacity-100"}`}
      >
        {label}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onNextMonth}
        aria-label="Próximo mês"
        className="size-9 shrink-0 rounded-md text-zinc-400 hover:bg-white/[0.06] hover:text-emerald-300"
      >
        <ChevronRight className="size-5" />
      </Button>
    </div>
  );
}
