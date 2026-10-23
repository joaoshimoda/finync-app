"use client";

import { useCallback } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { Variants } from "framer-motion";

import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import { cn } from "@/lib/utils";
import { useFinanceStore } from "@/store/useFinanceStore";

export const dashboardEase = [0.22, 1, 0.36, 1] as const;

export const dashboardStagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

export const dashboardReveal: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: dashboardEase },
  },
};

/* Glass surface defined in globals.css (.surface-panel). */
export const dashboardPanelClassName = "surface-panel rounded-2xl";

export const shortMonthFormatter = new Intl.DateTimeFormat("pt-BR", {
  month: "short",
});

export function formatShortMonth(month: number) {
  return shortMonthFormatter
    .format(new Date(2000, month - 1, 1))
    .replace(".", "");
}

export function usePrivateCurrency() {
  const hideBalancesByDefault = useFinanceStore(
    (state) => state.hideBalancesByDefault,
  );
  const { formatCurrency, hiddenCurrencyLabel } = useCurrencyFormatter();

  return useCallback(
    (value: number) =>
      hideBalancesByDefault ? hiddenCurrencyLabel : formatCurrency(value),
    [formatCurrency, hiddenCurrencyLabel, hideBalancesByDefault],
  );
}

export function DashboardSectionHeader({
  id,
  title,
  href,
  actionLabel,
  actionTone = "default",
}: {
  id: string;
  title: string;
  href: string;
  actionLabel: string;
  actionTone?: "default" | "warning";
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 id={id} className="text-base font-semibold text-zinc-100">
        {title}
      </h2>
      <Link
        href={href}
        className={cn(
          "group flex shrink-0 items-center gap-1 text-xs font-medium transition-colors",
          actionTone === "warning"
            ? "text-amber-300 hover:text-amber-200"
            : "text-zinc-400 hover:text-zinc-100",
        )}
      >
        {actionLabel}
        <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </div>
  );
}
