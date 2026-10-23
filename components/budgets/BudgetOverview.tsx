"use client";

import { motion } from "framer-motion";
import { CalendarDays, Gauge, TrendingUp, Wallet } from "lucide-react";

import { ProgressRing } from "@/components/dashboard/controls";
import {
  dashboardPanelClassName,
  dashboardReveal,
  usePrivateCurrency,
} from "@/components/dashboard/shared";
import { AnimatedNumber } from "@/components/finance/AnimatedNumber";
import { cn } from "@/lib/utils";

import type { BudgetsData } from "./useBudgetsData";

export const budgetStatusTone = {
  on_track: {
    label: "Dentro do limite",
    text: "text-emerald-300",
    bar: "bg-emerald-400",
    stroke: "#34d399",
    pill: "bg-emerald-500/10 text-emerald-300",
  },
  attention: {
    label: "Atenção",
    text: "text-amber-300",
    bar: "bg-amber-400",
    stroke: "#fbbf24",
    pill: "bg-amber-500/10 text-amber-300",
  },
  exceeded: {
    label: "Estourado",
    text: "text-rose-300",
    bar: "bg-rose-400",
    stroke: "#fb7185",
    pill: "bg-rose-500/10 text-rose-300",
  },
} as const;

export function BudgetOverview({
  data,
  isFetching,
}: {
  data: BudgetsData;
  isFetching: boolean;
}) {
  const formatValue = usePrivateCurrency();
  const { totals, phase, elapsedDays, daysInMonth, monthProgress } = data;
  const tone = budgetStatusTone[totals.status];
  const pacePercent = Math.round(monthProgress * 100);
  const projectionDelta =
    totals.projected === null ? null : totals.projected - totals.planned;

  const insight =
    phase === "future"
      ? "Este mês ainda não começou. Ajuste os limites com antecedência."
      : phase === "past"
        ? totals.status === "exceeded"
          ? `O mês fechou ${formatValue(totals.exceededBy)} acima do planejado.`
          : `O mês fechou com ${formatValue(totals.available)} de sobra.`
        : totals.percentage <= pacePercent
          ? `Dia ${elapsedDays} de ${daysInMonth}: ${pacePercent}% do mês passou e você usou ${Math.round(totals.percentage)}% do orçamento. Ritmo tranquilo.`
          : `Dia ${elapsedDays} de ${daysInMonth}: ${pacePercent}% do mês passou, mas você já usou ${Math.round(totals.percentage)}% do orçamento. Vale segurar um pouco.`;

  const stats = [
    {
      icon: Wallet,
      label: "Gasto",
      value: totals.spent,
      hint: `de ${formatValue(totals.planned)} planejados`,
      tone: "text-zinc-50",
    },
    {
      icon: Gauge,
      label: totals.status === "exceeded" ? "Acima do limite" : "Disponível",
      value: totals.status === "exceeded" ? totals.exceededBy : totals.available,
      hint:
        totals.dailyAllowance !== null && totals.status !== "exceeded"
          ? `${formatValue(totals.dailyAllowance)} por dia até o fim do mês`
          : phase === "past"
            ? "Mês encerrado"
            : "Para o restante do mês",
      tone: totals.status === "exceeded" ? "text-rose-300" : "text-emerald-300",
    },
    {
      icon: TrendingUp,
      label: "Projeção do mês",
      value: totals.projected ?? totals.spent,
      hint:
        projectionDelta === null
          ? phase === "past"
            ? "Total real do mês"
            : "Disponível no mês corrente"
          : projectionDelta > 0
            ? `${formatValue(projectionDelta)} acima no ritmo atual`
            : `${formatValue(Math.abs(projectionDelta))} abaixo no ritmo atual`,
      tone:
        projectionDelta !== null && projectionDelta > 0
          ? "text-amber-300"
          : "text-zinc-50",
    },
  ];

  return (
    <motion.section
      variants={dashboardReveal}
      aria-label="Resumo do orçamento"
      className={cn(
        dashboardPanelClassName,
        "relative overflow-hidden transition-opacity",
        isFetching && "opacity-70",
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -left-24 size-80 rounded-full opacity-60 blur-2xl"
        style={{
          background: `radial-gradient(closest-side, ${tone.stroke}22, transparent)`,
        }}
      />
      <div className="relative grid gap-6 p-5 sm:p-6 lg:grid-cols-[auto_1fr] lg:items-center lg:gap-10">
        <div className="flex items-center gap-5">
          <ProgressRing
            progress={totals.progress}
            stroke={tone.stroke}
            marker={phase === "current" ? monthProgress : null}
            className="size-36"
          >
            <span className="text-3xl font-semibold tracking-[-0.03em] tabular-nums text-zinc-50">
              {Math.round(totals.percentage)}%
            </span>
            <span className="text-[11px] text-zinc-500">usado</span>
          </ProgressRing>
          <div className="min-w-0 lg:hidden">
            <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", tone.pill)}>
              {tone.label}
            </span>
            <p className="mt-3 text-sm leading-6 text-zinc-400">{insight}</p>
          </div>
        </div>

        <div className="min-w-0">
          <div className="hidden items-start gap-3 lg:flex">
            <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs font-medium", tone.pill)}>
              {tone.label}
            </span>
            <p className="text-sm leading-6 text-zinc-400">{insight}</p>
          </div>

          <div className="grid divide-y divide-white/[0.06] sm:grid-cols-3 sm:gap-4 sm:divide-y-0 lg:mt-5">
            {stats.map((stat) => {
              const Icon = stat.icon;

              return (
                <div
                  key={stat.label}
                  className="grid min-w-0 grid-cols-[1fr_auto] items-baseline gap-x-3 py-3 first:pt-0 sm:block sm:rounded-xl sm:border sm:border-white/[0.06] sm:bg-white/[0.02] sm:p-4 sm:first:pt-4"
                >
                  <p className="flex items-center gap-1.5 text-xs text-zinc-500">
                    <Icon className="size-3.5" />
                    {stat.label}
                  </p>
                  <AnimatedNumber
                    value={stat.value}
                    format={formatValue}
                    className={cn(
                      "block truncate text-right text-lg font-semibold tabular-nums sm:mt-1 sm:text-left sm:text-xl",
                      stat.tone,
                    )}
                  />
                  <p className="col-span-2 mt-0.5 truncate text-xs text-zinc-500 sm:mt-1">
                    {stat.hint}
                  </p>
                </div>
              );
            })}
          </div>

          {phase === "current" && (
            <p className="mt-4 flex items-center gap-2 text-xs text-zinc-500">
              <CalendarDays className="size-3.5" />
              <span className="inline-block h-3 w-0.5 rounded-full bg-zinc-100" />
              marca onde você deveria estar hoje ({pacePercent}% do mês)
            </p>
          )}
        </div>
      </div>
    </motion.section>
  );
}
