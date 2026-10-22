"use client";

import {
  DashboardSectionHeader,
  dashboardPanelClassName,
  usePrivateCurrency,
} from "@/components/dashboard/shared";
import type { useDashboardData } from "@/components/dashboard/useDashboardData";
import { cn } from "@/lib/utils";

type DashboardData = ReturnType<typeof useDashboardData>;

function getInitials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "?"
  );
}

export function DependentsSummary({
  dependents,
}: {
  dependents: DashboardData["dependentSpendingSummaries"];
}) {
  const formatPrivateCurrency = usePrivateCurrency();

  return (
    <section
      aria-labelledby="dashboard-dependents-title"
      className={cn(dashboardPanelClassName, "min-w-0 p-5 sm:p-6")}
    >
      <DashboardSectionHeader
        id="dashboard-dependents-title"
        title="Dependentes"
        href="/dashboard/dependentes"
        actionLabel="Ver"
      />
      <ul className="mt-4 space-y-4">
        {dependents.map((dependent) => (
          <li key={dependent.id} className="flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-cyan-500/10 text-xs font-semibold text-cyan-300">
              {getInitials(dependent.name)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-zinc-200">
                {dependent.name}
              </span>
              <span className="block truncate text-xs text-zinc-500">
                Gastou {formatPrivateCurrency(dependent.total)}
              </span>
            </span>
            {dependent.outstanding > 0 ? (
              <span className="shrink-0 text-right">
                <span className="block text-sm font-semibold tabular-nums text-zinc-100">
                  {formatPrivateCurrency(dependent.outstanding)}
                </span>
                <span className="block text-xs text-zinc-500">a receber</span>
              </span>
            ) : (
              <span className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-300">
                Quitado
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
