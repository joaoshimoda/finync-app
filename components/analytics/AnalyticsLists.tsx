"use client";

import { motion } from "framer-motion";
import { CircleAlert, CircleCheck, Info, type LucideIcon } from "lucide-react";

import {
  DeltaBadge,
  analyticsColors,
} from "@/components/analytics/AnalyticsPrimitives";
import type {
  AnalyticsInsight,
  CategoryInsight,
} from "@/components/analytics/analyticsData";
import { dashboardEase } from "@/components/dashboard/shared";
import { formatDateOnlyBR } from "@/lib/dateUtils";
import type { AggregatedExpenseEntry } from "@/lib/financeAggregation";
import { cn } from "@/lib/utils";

type Formatter = (value: number) => string;

function EmptyState({ children }: { children: string }) {
  return (
    <div className="flex h-full min-h-32 items-center justify-center rounded-xl border border-dashed border-white/[0.08] px-6 text-center text-sm text-zinc-500">
      {children}
    </div>
  );
}

export function CategoryRanking({
  categories,
  formatValue,
}: {
  categories: CategoryInsight[];
  formatValue: Formatter;
}) {
  if (!categories.length) {
    return <EmptyState>Sem despesas neste mês.</EmptyState>;
  }

  const largest = Math.max(...categories.map((category) => category.amount));

  return (
    <ol className="space-y-4">
      {categories.map((category, index) => (
        <li key={category.name}>
          <div className="flex items-center gap-3">
            <span className="w-5 shrink-0 text-xs font-semibold tabular-nums text-zinc-600">
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-3">
                <span className="truncate text-sm font-medium text-zinc-200">
                  {category.name}
                </span>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-zinc-50">
                  {formatValue(category.amount)}
                </span>
              </div>
              <div className="mt-2 flex items-center gap-3">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-800/80">
                  <motion.div
                    className="h-full rounded-full"
                    style={{
                      backgroundColor: analyticsColors.primary,
                      opacity: 1 - index * 0.1,
                    }}
                    initial={{ width: 0 }}
                    animate={{ width: `${(category.amount / largest) * 100}%` }}
                    transition={{
                      duration: 0.8,
                      delay: 0.1 + index * 0.06,
                      ease: dashboardEase,
                    }}
                  />
                </div>
                <span className="w-10 shrink-0 text-right text-xs tabular-nums text-zinc-500">
                  {category.share.toFixed(0)}%
                </span>
                <span className="flex w-16 shrink-0 justify-end">
                  <DeltaBadge delta={category.delta} goodWhen="down" />
                </span>
              </div>
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function TopExpenses({
  expenses,
  total,
  formatValue,
}: {
  expenses: AggregatedExpenseEntry[];
  total: number;
  formatValue: Formatter;
}) {
  if (!expenses.length) {
    return <EmptyState>Sem despesas neste mês.</EmptyState>;
  }

  return (
    <ol className="space-y-1">
      {expenses.map((expense, index) => (
        <motion.li
          key={expense.id}
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.1 + index * 0.05 }}
          className="flex items-center gap-3 rounded-lg px-1 py-2"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-orange-500/10 text-xs font-semibold tabular-nums text-orange-300">
            {index + 1}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-zinc-200">
              {expense.description || "Sem descrição"}
            </span>
            <span className="block truncate text-xs text-zinc-500">
              {expense.category?.trim() || "Sem categoria"} ·{" "}
              {formatDateOnlyBR(expense.date)}
            </span>
          </span>
          <span className="shrink-0 text-right">
            <span className="block text-sm font-semibold tabular-nums text-zinc-50">
              {formatValue(expense.signedAmount)}
            </span>
            <span className="block text-[11px] tabular-nums text-zinc-600">
              {total > 0
                ? ((expense.signedAmount / total) * 100).toFixed(0)
                : 0}
              % do mês
            </span>
          </span>
        </motion.li>
      ))}
    </ol>
  );
}

const insightStyles: Record<
  AnalyticsInsight["tone"],
  { icon: LucideIcon; className: string }
> = {
  positive: {
    icon: CircleCheck,
    className: "bg-emerald-500/10 text-emerald-300",
  },
  negative: {
    icon: CircleAlert,
    className: "bg-orange-500/10 text-orange-300",
  },
  neutral: { icon: Info, className: "bg-sky-500/10 text-sky-300" },
};

export function InsightsList({ insights }: { insights: AnalyticsInsight[] }) {
  if (!insights.length) {
    return (
      <EmptyState>
        Registre receitas e despesas para receber uma leitura do seu mês.
      </EmptyState>
    );
  }

  return (
    <ul className="space-y-3">
      {insights.map((insight, index) => {
        const style = insightStyles[insight.tone];
        const Icon = style.icon;

        return (
          <motion.li
            key={insight.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.35,
              delay: 0.15 + index * 0.07,
              ease: dashboardEase,
            }}
            className="flex gap-3 rounded-xl bg-white/[0.02] p-3 ring-1 ring-inset ring-white/[0.05]"
          >
            <span
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-lg",
                style.className,
              )}
            >
              <Icon className="size-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium text-zinc-100">
                {insight.title}
              </span>
              <span className="mt-0.5 block text-xs leading-5 text-zinc-500">
                {insight.description}
              </span>
            </span>
          </motion.li>
        );
      })}
    </ul>
  );
}
