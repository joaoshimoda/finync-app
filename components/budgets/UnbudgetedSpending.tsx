"use client";

import { Plus } from "lucide-react";

import { AnalyticsPanel } from "@/components/analytics/AnalyticsPrimitives";
import { usePrivateCurrency } from "@/components/dashboard/shared";
import { CategoryGlyph } from "@/components/finance/categoryIcons";
import { Button } from "@/components/ui/button";

import type { UnbudgetedCategory } from "./useBudgetsData";

/* A round limit a little above what was spent, as a starting point. */
export function suggestBudgetAmount(spent: number) {
  return Math.max(Math.ceil((spent * 1.1) / 50) * 50, 50);
}

export function UnbudgetedSpending({
  items,
  total,
  onCreate,
}: {
  items: UnbudgetedCategory[];
  total: number;
  onCreate: (categoryId: string, amount: number) => void;
}) {
  const formatValue = usePrivateCurrency();

  if (!items.length) return null;

  return (
    <AnalyticsPanel
      title="Gastos sem orçamento"
      description={`${formatValue(total)} neste mês fora de qualquer limite`}
    >
      <ul className="grid gap-x-8 gap-y-1 md:grid-cols-2">
        {items.map((item) => (
          <li
            key={item.label}
            className="flex items-center gap-3 py-2.5"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] text-zinc-400">
              <CategoryGlyph name={item.categoryIcon ?? undefined} className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-zinc-200">{item.label}</p>
              <p className="text-xs text-zinc-500">
                {item.count} {item.count === 1 ? "lançamento" : "lançamentos"}
              </p>
            </div>
            <span className="shrink-0 text-sm font-semibold tabular-nums text-zinc-100">
              {formatValue(item.spent)}
            </span>
            {item.categoryId ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  onCreate(item.categoryId!, suggestBudgetAmount(item.spent))
                }
                aria-label={`Criar limite para ${item.label}`}
                className="h-8 shrink-0 gap-1 rounded-lg px-2.5 text-xs text-emerald-300 hover:bg-emerald-400/10 hover:text-emerald-200"
              >
                <Plus className="size-3.5" />
                <span className="hidden sm:inline">Limite</span>
              </Button>
            ) : (
              <span className="w-8 shrink-0 sm:w-[4.25rem]" />
            )}
          </li>
        ))}
      </ul>
    </AnalyticsPanel>
  );
}
