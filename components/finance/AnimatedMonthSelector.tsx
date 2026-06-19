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
    <div className="mx-auto flex w-full max-w-lg flex-row items-center justify-center gap-3 overflow-hidden rounded-full border border-border/50 bg-muted/30 px-4 py-2 shadow-inner lg:gap-5 lg:px-6 lg:py-1.5">
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
        className="min-w-12 scale-75 cursor-pointer px-2 py-2 text-sm font-medium opacity-40 blur-[1px] transition-all duration-300 ease-in-out hover:scale-90 hover:opacity-80 hover:blur-none lg:text-base"
      >
        {formatShortMonth(previousMonth)}
      </button>

      <div
        className={cn(
          "whitespace-nowrap text-lg font-bold text-primary opacity-100 blur-none transition-all duration-300 ease-in-out lg:text-xl",
          isLoading && "opacity-70",
        )}
      >
        {formatCurrentMonth(currentMonthDate)}
      </div>

      <button
        type="button"
        onClick={onNextMonth}
        className="min-w-12 scale-75 cursor-pointer px-2 py-2 text-sm font-medium opacity-40 blur-[1px] transition-all duration-300 ease-in-out hover:scale-90 hover:opacity-80 hover:blur-none lg:text-base"
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
