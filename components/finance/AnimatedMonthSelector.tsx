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
    <div className="flex h-9 w-max items-center gap-1 rounded-lg border border-white/[0.08] bg-zinc-900/70 p-1 shadow-lg shadow-black/15 backdrop-blur-xl">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onPreviousMonth}
        aria-label="Mês anterior"
        className="size-7 shrink-0 rounded-md text-zinc-500 hover:bg-white/[0.06] hover:text-emerald-300"
      >
        <ChevronLeft className="size-4" />
      </Button>
      <div
        className={`min-w-32 whitespace-nowrap px-2 text-center text-sm font-medium text-zinc-200 transition-opacity ${isLoading ? "opacity-60" : "opacity-100"}`}
      >
        {label}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onNextMonth}
        aria-label="Próximo mês"
        className="size-7 shrink-0 rounded-md text-zinc-500 hover:bg-white/[0.06] hover:text-emerald-300"
      >
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}
