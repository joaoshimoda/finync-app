"use client";

import { Check } from "lucide-react";

import {
  DashboardSectionHeader,
  dashboardPanelClassName,
  formatShortMonth,
  usePrivateCurrency,
} from "@/components/dashboard/shared";
import type { UpcomingDue } from "@/components/dashboard/useDashboardData";
import { getDateOnlyParts } from "@/lib/dateUtils";
import { cn } from "@/lib/utils";
import type { CardInvoice } from "@/store/useFinanceStore";

function getDueLabel(daysUntil: number) {
  if (daysUntil < -1) return `Venceu há ${Math.abs(daysUntil)} dias`;
  if (daysUntil === -1) return "Venceu ontem";
  if (daysUntil === 0) return "Vence hoje";
  if (daysUntil === 1) return "Vence amanhã";
  return `Vence em ${daysUntil} dias`;
}

function getDueToneClassName(daysUntil: number) {
  if (daysUntil < 0) return "rose";
  if (daysUntil <= 2) return "amber";
  return "neutral";
}

export function UpcomingDues({
  dues,
  limit,
  onPayInvoice,
}: {
  dues: UpcomingDue[];
  limit: number;
  onPayInvoice: (invoice: CardInvoice, cardName: string) => void;
}) {
  const formatPrivateCurrency = usePrivateCurrency();
  const visibleDues = dues.slice(0, limit);
  const hiddenCount = dues.length - visibleDues.length;

  return (
    <section
      aria-labelledby="dashboard-upcoming-title"
      className={cn(
        dashboardPanelClassName,
        "flex min-w-0 flex-col p-5 sm:p-6",
      )}
    >
      <DashboardSectionHeader
        id="dashboard-upcoming-title"
        title="Próximos vencimentos"
        href="/dashboard/fixed"
        actionLabel="Ver contas"
      />
      {visibleDues.length ? (
        <ul className="-mx-2 mt-4 space-y-1">
          {visibleDues.map((due) => {
            const { day, month } = getDateOnlyParts(due.date);
            const tone = getDueToneClassName(due.daysUntil);

            return (
              <li
                key={due.id}
                className="flex items-center gap-4 rounded-xl px-2 py-2"
              >
                <span
                  className={cn(
                    "flex size-11 shrink-0 flex-col items-center justify-center rounded-xl leading-none",
                    tone === "rose" && "bg-rose-500/10 text-rose-300",
                    tone === "amber" && "bg-amber-500/10 text-amber-200",
                    tone === "neutral" && "bg-zinc-800/80 text-zinc-300",
                  )}
                >
                  <span className="text-base font-semibold tabular-nums">
                    {day}
                  </span>
                  <span className="mt-0.5 text-[10px] uppercase tracking-wide opacity-70">
                    {formatShortMonth(month)}
                  </span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-zinc-200">
                    {due.label}
                  </span>
                  <span
                    className={cn(
                      "block text-xs",
                      tone === "rose" && "text-rose-400",
                      tone === "amber" && "text-amber-300",
                      tone === "neutral" && "text-zinc-500",
                    )}
                  >
                    {getDueLabel(due.daysUntil)}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-sm font-semibold tabular-nums text-zinc-100">
                    {formatPrivateCurrency(due.amount)}
                  </span>
                  {due.invoice && (
                    <button
                      type="button"
                      onClick={() =>
                        due.invoice &&
                        onPayInvoice(due.invoice, due.cardName ?? "")
                      }
                      className="text-xs font-medium text-emerald-300 transition-colors hover:text-emerald-200"
                    >
                      Pagar
                    </button>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-8 text-center">
          <span className="flex size-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-300">
            <Check className="size-5" />
          </span>
          <p className="text-sm font-medium text-zinc-200">Tudo em dia</p>
          <p className="text-xs text-zinc-500">Nada pendente neste mês.</p>
        </div>
      )}
      {hiddenCount > 0 && (
        <p className="mt-3 text-xs text-zinc-500">
          +{hiddenCount} {hiddenCount === 1 ? "outro" : "outros"} neste mês
        </p>
      )}
    </section>
  );
}
