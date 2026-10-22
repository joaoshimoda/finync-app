"use client";

import { motion } from "framer-motion";

import {
  DashboardSectionHeader,
  dashboardEase,
  dashboardPanelClassName,
  usePrivateCurrency,
} from "@/components/dashboard/shared";
import type { useDashboardData } from "@/components/dashboard/useDashboardData";
import type { CategoryBudgetStatus } from "@/lib/categoryBudgets";
import { cn } from "@/lib/utils";

type DashboardData = ReturnType<typeof useDashboardData>;

const categoryBarClassNames = [
  "bg-emerald-400",
  "bg-sky-400",
  "bg-violet-400",
  "bg-amber-400",
  "bg-zinc-500",
];

const budgetBarClassNames: Record<CategoryBudgetStatus, string> = {
  on_track: "bg-emerald-400",
  attention: "bg-amber-400",
  exceeded: "bg-rose-400",
};

const budgetTextClassNames: Record<CategoryBudgetStatus, string> = {
  on_track: "text-zinc-500",
  attention: "text-amber-300",
  exceeded: "text-rose-300",
};

export function CategorySpending({
  categories,
  budgetHealth,
  limit,
}: {
  categories: DashboardData["categorySpending"];
  budgetHealth: DashboardData["budgetHealth"];
  limit: number;
}) {
  const formatPrivateCurrency = usePrivateCurrency();
  const actionLabel = budgetHealth.total
    ? budgetHealth.attention > 0
      ? `${budgetHealth.attention} ${budgetHealth.attention === 1 ? "alerta" : "alertas"}`
      : "Orçamentos"
    : "Definir limites";

  return (
    <section
      aria-labelledby="dashboard-categories-title"
      className={cn(dashboardPanelClassName, "min-w-0 p-5 sm:p-6")}
    >
      <DashboardSectionHeader
        id="dashboard-categories-title"
        title="Gastos por categoria"
        href="/dashboard/orcamentos"
        actionLabel={actionLabel}
        actionTone={budgetHealth.attention > 0 ? "warning" : "default"}
      />
      {categories.length ? (
        <ul className="mt-5 space-y-5">
          {categories.slice(0, limit).map((category, index) => (
            <li key={category.label}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate text-sm text-zinc-300">
                  {category.label}
                </span>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-zinc-100">
                  {formatPrivateCurrency(category.amount)}
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-800/80">
                <motion.div
                  className={cn(
                    "h-full rounded-full",
                    category.budget
                      ? budgetBarClassNames[category.budget.status]
                      : categoryBarClassNames[
                          index % categoryBarClassNames.length
                        ],
                  )}
                  initial={{ width: 0 }}
                  animate={{
                    width: `${category.budget ? category.budget.progress : category.percentage}%`,
                  }}
                  transition={{
                    duration: 0.7,
                    delay: 0.2 + index * 0.05,
                    ease: dashboardEase,
                  }}
                />
              </div>
              {category.budget && (
                <p
                  className={cn(
                    "mt-1.5 text-xs",
                    budgetTextClassNames[category.budget.status],
                  )}
                >
                  {category.budget.percentage.toFixed(0)}% do limite
                  {category.budget.status === "exceeded"
                    ? ` · passou ${formatPrivateCurrency(category.budget.exceededBy)}`
                    : ` · restam ${formatPrivateCurrency(category.budget.available)}`}
                </p>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-5 text-sm text-zinc-500">
          Sem despesas pessoais neste período.
        </p>
      )}
    </section>
  );
}
