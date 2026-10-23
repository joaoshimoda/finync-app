"use client";

import { motion } from "framer-motion";
import dynamic from "next/dynamic";

import {
  dashboardEase,
  dashboardPanelClassName,
  dashboardReveal,
  formatShortMonth,
  usePrivateCurrency,
} from "@/components/dashboard/shared";
import type { useDashboardData } from "@/components/dashboard/useDashboardData";
import { AnimatedNumber } from "@/components/finance/AnimatedNumber";
import { cn } from "@/lib/utils";

type DashboardData = ReturnType<typeof useDashboardData>;

/* Recharts loads in its own chunk; the parent box already has a fixed
   height, so the empty placeholder keeps the layout still. */
const BalanceTimelineChart = dynamic(
  () =>
    import("@/components/finance/BalanceTimelineChart").then(
      (module) => module.BalanceTimelineChart,
    ),
  { ssr: false, loading: () => <div aria-hidden className="size-full" /> },
);

type BalanceOverviewProps = Pick<
  DashboardData,
  | "balanceTimeline"
  | "dailyAllowance"
  | "displayMonth"
  | "incomeAllocation"
  | "isFetching"
  | "monthlyBalances"
  | "personalExpenseTotal"
  | "savingsRate"
  | "selectedMonthName"
>;

export function BalanceOverview({
  balanceTimeline,
  dailyAllowance,
  displayMonth,
  incomeAllocation,
  isFetching,
  monthlyBalances,
  personalExpenseTotal,
  savingsRate,
  selectedMonthName,
}: BalanceOverviewProps) {
  const formatPrivateCurrency = usePrivateCurrency();
  const isNegative = monthlyBalances.projectedBalance < 0;
  const message =
    monthlyBalances.totalIncome <= 0
      ? "Registre suas receitas para ver quanto deve sobrar no fim do mês."
      : isNegative
        ? `Seus gastos previstos passam da sua renda em ${formatPrivateCurrency(Math.abs(monthlyBalances.projectedBalance))}.`
        : `É o que deve restar depois de todos os gastos previstos para ${selectedMonthName}.`;
  const stats = [
    {
      label: "Receitas",
      value: formatPrivateCurrency(monthlyBalances.totalIncome),
      hint: selectedMonthName,
      className: "text-emerald-300",
    },
    {
      label: "Gastos previstos",
      value: formatPrivateCurrency(personalExpenseTotal),
      hint: "pessoais",
      className: "text-zinc-50",
    },
    dailyAllowance
      ? {
          label: "Pode gastar",
          value: formatPrivateCurrency(dailyAllowance.amount),
          hint:
            dailyAllowance.days === 1
              ? "hoje"
              : `por dia · ${dailyAllowance.days} dias`,
          className: "text-zinc-50",
        }
      : {
          label: "A pagar",
          value: formatPrivateCurrency(monthlyBalances.totalPendingObligations),
          hint: "em aberto",
          className: "text-zinc-50",
        },
  ];

  return (
    <motion.section
      variants={dashboardReveal}
      aria-labelledby="dashboard-balance-title"
      className={cn(
        dashboardPanelClassName,
        "relative overflow-hidden transition-opacity duration-300",
        isFetching && "opacity-70",
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-56 bg-gradient-to-b to-transparent",
          isNegative ? "from-rose-500/[0.07]" : "from-emerald-500/[0.07]",
        )}
      />

      <div className="relative grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="flex flex-col gap-5 p-5 sm:gap-6 sm:p-7">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2
                id="dashboard-balance-title"
                className="text-sm font-medium text-zinc-400"
              >
                Sobra no fim do mês
              </h2>
              {monthlyBalances.totalIncome > 0 && (
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums",
                    savingsRate < 0
                      ? "bg-rose-500/10 text-rose-300"
                      : "bg-emerald-500/10 text-emerald-300",
                  )}
                >
                  {savingsRate.toFixed(0)}% da renda
                </span>
              )}
            </div>
            <AnimatedNumber
              value={monthlyBalances.projectedBalance}
              format={formatPrivateCurrency}
              className={cn(
                "mt-2 block text-[clamp(2.25rem,5vw,3.25rem)] font-semibold leading-none tracking-[-0.035em] tabular-nums",
                isNegative ? "text-rose-400" : "text-zinc-50",
              )}
            />
            <p
              className={cn(
                "mt-3 text-sm leading-6",
                isNegative ? "text-rose-300/90" : "text-zinc-500",
              )}
            >
              {message}
            </p>
          </div>

          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {stats.map((stat, index) => (
              <div
                key={stat.label}
                className={cn(
                  "min-w-0 rounded-xl bg-white/[0.03] px-3.5 py-3 ring-1 ring-inset ring-white/[0.06]",
                  index === 2 && "col-span-2 sm:col-span-1",
                )}
              >
                <dt className="truncate text-xs text-zinc-500">{stat.label}</dt>
                <dd
                  className={cn(
                    "mt-1 truncate text-base font-semibold tabular-nums",
                    stat.className,
                  )}
                >
                  {stat.value}
                </dd>
                <dd className="truncate text-[11px] text-zinc-600">
                  {stat.hint}
                </dd>
              </div>
            ))}
          </dl>

          <div className="lg:mt-auto">
            <div className="flex h-1.5 gap-1 overflow-hidden rounded-full bg-zinc-800/80">
              {incomeAllocation.map((segment) => (
                <motion.div
                  key={segment.key}
                  className={cn("h-full rounded-full", segment.barClassName)}
                  initial={{ width: 0 }}
                  animate={{ width: `${segment.percentage}%` }}
                  transition={{
                    duration: 0.8,
                    ease: dashboardEase,
                    delay: 0.15,
                  }}
                />
              ))}
            </div>
            <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
              {incomeAllocation.map((segment) => (
                <div
                  key={segment.key}
                  className="flex items-center gap-1.5 text-xs"
                >
                  <span
                    className={cn(
                      "size-2 shrink-0 rounded-full",
                      segment.barClassName,
                    )}
                  />
                  <dt className="text-zinc-500">{segment.label}</dt>
                  <dd className="font-medium tabular-nums text-zinc-200">
                    {formatPrivateCurrency(segment.amount)}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        <div className="flex min-w-0 flex-col border-t border-white/[0.06] p-5 sm:p-7 lg:border-l lg:border-t-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-medium text-zinc-300">
              Saldo ao longo do mês
            </h3>
            <div className="flex items-center gap-4 text-xs text-zinc-500">
              <span className="flex items-center gap-1.5">
                <span className="h-0.5 w-4 rounded-full bg-emerald-400" />
                Realizado
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-4 border-t-2 border-dashed border-emerald-400/60" />
                Previsto
              </span>
            </div>
          </div>
          <div className="mt-2 h-44 sm:h-56 lg:h-auto lg:min-h-60 lg:flex-1">
            <BalanceTimelineChart
              points={balanceTimeline.points}
              todayDay={balanceTimeline.todayDay}
              monthShortLabel={formatShortMonth(displayMonth)}
              formatValue={formatPrivateCurrency}
            />
          </div>
        </div>
      </div>
    </motion.section>
  );
}
