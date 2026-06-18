"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AnimatedMonthSelectorProps {
  currentMonth: number;
  currentYear: number;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  isLoading?: boolean;
}

const monthShortFormatter = new Intl.DateTimeFormat("pt-BR", {
  month: "short",
});

const monthFullFormatter = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  year: "numeric",
});

function getMonthDate(currentMonth: number, currentYear: number, offset = 0) {
  return new Date(currentYear, currentMonth - 1 + offset, 1);
}

function formatShortMonth(date: Date) {
  return monthShortFormatter
    .format(date)
    .replace(".", "")
    .replace(/^\w/, (letter) => letter.toUpperCase());
}

function formatCurrentMonth(date: Date) {
  return monthFullFormatter
    .format(date)
    .replace(/^\w/, (letter) => letter.toUpperCase());
}

export function AnimatedMonthSelector({
  currentMonth,
  currentYear,
  onPreviousMonth,
  onNextMonth,
  isLoading = false,
}: AnimatedMonthSelectorProps) {
  const previousMonth = getMonthDate(currentMonth, currentYear, -1);
  const currentMonthDate = getMonthDate(currentMonth, currentYear);
  const nextMonth = getMonthDate(currentMonth, currentYear, 1);

  return (
    <div className="mx-auto flex w-full max-w-xl flex-row items-center justify-center gap-6 overflow-hidden rounded-full border border-border/50 bg-muted/30 px-8 py-3 shadow-inner lg:gap-10">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onPreviousMonth}
        aria-label="Mês anterior"
        className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <button
        type="button"
        onClick={onPreviousMonth}
        className="min-w-16 scale-75 cursor-pointer px-3 py-3 text-base font-medium opacity-40 blur-[1px] transition-all duration-300 ease-in-out hover:scale-90 hover:opacity-80 hover:blur-none lg:text-lg"
      >
        {formatShortMonth(previousMonth)}
      </button>

      <div
        className={cn(
          "scale-110 whitespace-nowrap text-2xl font-bold text-primary opacity-100 blur-none transition-all duration-300 ease-in-out",
          isLoading && "opacity-70",
        )}
      >
        {formatCurrentMonth(currentMonthDate)}
      </div>

      <button
        type="button"
        onClick={onNextMonth}
        className="min-w-16 scale-75 cursor-pointer px-3 py-3 text-base font-medium opacity-40 blur-[1px] transition-all duration-300 ease-in-out hover:scale-90 hover:opacity-80 hover:blur-none lg:text-lg"
      >
        {formatShortMonth(nextMonth)}
      </button>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onNextMonth}
        aria-label="Próximo mês"
        className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
