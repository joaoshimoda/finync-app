"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";

import { AnalyticsPanel } from "@/components/analytics/AnalyticsPrimitives";
import { dashboardEase, usePrivateCurrency } from "@/components/dashboard/shared";
import { cn } from "@/lib/utils";

import type { RecurringData } from "./useRecurringData";

const BAR_HEIGHT = 64;

const monthFormatter = new Intl.DateTimeFormat("pt-BR", { month: "long" });

/* Day-by-day view of the month: one column per day, the bar stacks fixed
   bills (emerald) and subscription charges (violet). The caption below
   explains the focused day, so it also works on touch screens. */
export function MonthTimeline({
  data,
  month,
  year,
}: {
  data: RecurringData;
  month: number;
  year: number;
}) {
  const formatValue = usePrivateCurrency();
  const { timeline, todayDay } = data;
  const busyDays = timeline.filter((day) => day.items.length > 0);
  const defaultDay = useMemo(
    () =>
      busyDays.find((day) => todayDay === null || day.day >= todayDay)?.day ??
      busyDays[0]?.day ??
      null,
    [busyDays, todayDay],
  );
  const [focusedDay, setFocusedDay] = useState<number | null>(null);
  const activeDay = timeline.find((day) => day.day === (focusedDay ?? defaultDay));
  const largest = Math.max(
    ...timeline.map((day) => day.fixedAmount + day.subscriptionAmount),
    1,
  );
  const monthLabel = monthFormatter.format(new Date(year, month - 1, 1));
  /* Axis labels by priority (focused day, today, then every fifth day),
     skipping any that would sit within two columns of one already shown. */
  const labeledDays = useMemo(() => {
    const candidates = [
      activeDay?.items.length ? activeDay.day : null,
      todayDay,
      1,
      ...timeline.filter((day) => day.day % 5 === 0).map((day) => day.day),
      timeline.length,
    ];
    return candidates.reduce<number[]>((shown, day) => {
      if (day !== null && shown.every((other) => Math.abs(other - day) > 2)) {
        shown.push(day);
      }
      return shown;
    }, []);
  }, [activeDay, timeline, todayDay]);

  return (
    <AnalyticsPanel
      title="Calendário do mês"
      description={
        busyDays.length
          ? `${busyDays.length} ${busyDays.length === 1 ? "dia com cobrança" : "dias com cobrança"} em ${monthLabel}`
          : `Nenhuma cobrança recorrente em ${monthLabel}`
      }
      action={
        <div className="flex items-center gap-3 text-xs text-zinc-400">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-[3px] bg-emerald-400" />
            Contas
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-[3px] bg-violet-400" />
            Assinaturas
          </span>
        </div>
      }
    >
      <div
        className="flex items-end gap-[2px] sm:gap-1"
        style={{ height: BAR_HEIGHT + 22 }}
        onMouseLeave={() => setFocusedDay(null)}
      >
        {timeline.map((day, index) => {
          const total = day.fixedAmount + day.subscriptionAmount;
          /* Square-root scale: rent should not flatten a R$ 15 charge. */
          const height =
            total > 0 ? Math.max(Math.sqrt(total / largest) * BAR_HEIGHT, 6) : 0;
          const fixedHeight = total > 0 ? (day.fixedAmount / total) * height : 0;
          const isPast = todayDay !== null && day.day < todayDay;
          const isToday = day.day === todayDay;
          const isActive = activeDay?.day === day.day && total > 0;
          const showLabel = labeledDays.includes(day.day);

          return (
            <button
              key={day.day}
              type="button"
              disabled={total === 0}
              onMouseEnter={() => total > 0 && setFocusedDay(day.day)}
              onFocus={() => setFocusedDay(day.day)}
              onClick={() => setFocusedDay(day.day)}
              aria-label={
                total > 0
                  ? `Dia ${day.day}: ${day.items.length} ${day.items.length === 1 ? "cobrança" : "cobranças"}`
                  : `Dia ${day.day}: sem cobranças`
              }
              className="group relative flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 disabled:cursor-default"
            >
              <span
                className={cn(
                  "relative flex w-full max-w-4 flex-col-reverse overflow-hidden rounded-[3px] transition-opacity",
                  isPast && !isActive && "opacity-50",
                  "group-hover:opacity-100",
                )}
                style={{ height: total > 0 ? height : 2 }}
              >
                {total > 0 ? (
                  <>
                    <motion.span
                      className="block w-full bg-emerald-400"
                      initial={{ height: 0 }}
                      animate={{ height: fixedHeight }}
                      transition={{ duration: 0.6, delay: index * 0.012, ease: dashboardEase }}
                    />
                    <motion.span
                      className="block w-full bg-violet-400"
                      initial={{ height: 0 }}
                      animate={{ height: height - fixedHeight }}
                      transition={{ duration: 0.6, delay: index * 0.012, ease: dashboardEase }}
                    />
                  </>
                ) : (
                  <span className="block h-full w-full bg-zinc-800" />
                )}
              </span>
              <span
                className={cn(
                  "h-3.5 text-[10px] leading-none tabular-nums",
                  isToday
                    ? "font-semibold text-emerald-300"
                    : isActive
                      ? "font-semibold text-zinc-100"
                      : "text-zinc-500",
                  !showLabel && "invisible",
                )}
              >
                {day.day}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 min-h-[3.25rem] border-t border-white/[0.06] pt-3">
        {activeDay && activeDay.items.length > 0 ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-4">
            <p className="shrink-0 text-xs font-medium text-zinc-300">
              Dia {activeDay.day}
              {activeDay.day === todayDay && (
                <span className="ml-1.5 text-emerald-300">· hoje</span>
              )}
            </p>
            <ul className="flex min-w-0 flex-wrap gap-1.5">
              {activeDay.items.map((item) => (
                <li
                  key={`${item.kind}-${item.id}`}
                  className={cn(
                    "flex max-w-full items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.03] py-1 pr-2.5 pl-2 text-xs",
                    item.paid && "opacity-60",
                  )}
                >
                  <span
                    className={cn(
                      "size-1.5 shrink-0 rounded-full",
                      item.kind === "fixed" ? "bg-emerald-400" : "bg-violet-400",
                    )}
                  />
                  <span className="truncate text-zinc-300">{item.label}</span>
                  <span className="shrink-0 font-medium tabular-nums text-zinc-100">
                    {formatValue(item.amount)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-xs text-zinc-500">
            Cadastre uma conta fixa ou assinatura para vê-la no calendário.
          </p>
        )}
      </div>
    </AnalyticsPanel>
  );
}
