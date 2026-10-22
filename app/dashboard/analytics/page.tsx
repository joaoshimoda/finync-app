"use client";

import { useCallback, useEffect, useState } from "react";
import { MotionConfig, motion } from "framer-motion";
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarClock,
  Lock,
  PiggyBank,
  Scale,
  Sparkles,
} from "lucide-react";

import {
  CashFlowChart,
  CompositionChart,
  SpendingPaceChart,
  WeekdayChart,
} from "@/components/analytics/AnalyticsCharts";
import {
  CategoryRanking,
  InsightsList,
  TopExpenses,
} from "@/components/analytics/AnalyticsLists";
import {
  AnalyticsPanel,
  ChartLegend,
  HealthScoreCard,
  KpiCard,
  analyticsColors,
} from "@/components/analytics/AnalyticsPrimitives";
import {
  getAverageDailyExpense,
  getFixedCommitment,
  percentChange,
  type AnalyticsRange,
} from "@/components/analytics/analyticsData";
import { useAnalyticsData } from "@/components/analytics/useAnalyticsData";
import {
  dashboardReveal,
  dashboardStagger,
  usePrivateCurrency,
} from "@/components/dashboard/shared";
import { AnimatedMonthSelector } from "@/components/finance/AnimatedMonthSelector";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import { cn } from "@/lib/utils";
import { useFinanceStore } from "@/store/useFinanceStore";

const rangeOptions: AnalyticsRange[] = [3, 6, 12];
const rangeStorageKey = "finync:analytics-range";

function readStoredRange(): AnalyticsRange {
  if (typeof window === "undefined") return 6;

  try {
    const stored = Number(window.localStorage.getItem(rangeStorageKey));

    return rangeOptions.includes(stored as AnalyticsRange)
      ? (stored as AnalyticsRange)
      : 6;
  } catch {
    return 6;
  }
}

function formatPercent(value: number) {
  return `${value.toFixed(1).replace(".", ",")}%`;
}

function AnalyticsSkeleton() {
  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-64 max-w-full" />
        </div>
        <Skeleton className="hidden h-11 w-72 sm:block" />
      </div>
      <div className="grid gap-4 lg:grid-cols-12">
        <Skeleton className="h-96 rounded-2xl lg:col-span-4" />
        <div className="grid grid-cols-2 gap-4 lg:col-span-8 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-40 rounded-2xl" />
          ))}
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-12">
        <Skeleton className="h-96 rounded-2xl lg:col-span-8" />
        <Skeleton className="h-96 rounded-2xl lg:col-span-4" />
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const currentMonth = useFinanceStore((state) => state.currentMonth);
  const currentYear = useFinanceStore((state) => state.currentYear);
  const nextMonth = useFinanceStore((state) => state.nextMonth);
  const prevMonth = useFinanceStore((state) => state.prevMonth);
  const hideBalances = useFinanceStore((state) => state.hideBalancesByDefault);
  const { formatCompactCurrency, hiddenCurrencyLabel } = useCurrencyFormatter();
  const formatValue = usePrivateCurrency();
  const formatCompact = useCallback(
    (value: number) => (hideBalances ? "•••" : formatCompactCurrency(value)),
    [formatCompactCurrency, hideBalances],
  );
  const formatRate = useCallback(
    (value: number) =>
      hideBalances ? hiddenCurrencyLabel : formatPercent(value),
    [hiddenCurrencyLabel, hideBalances],
  );
  const [range, setRange] = useState<AnalyticsRange>(readStoredRange);

  useEffect(() => {
    try {
      window.localStorage.setItem(rangeStorageKey, String(range));
    } catch {
      // The chosen range only lasts for this visit when storage is unavailable.
    }
  }, [range]);

  const data = useAnalyticsData({
    month: currentMonth,
    year: currentYear,
    range,
    formatCurrency: formatValue,
  });

  if (data.isInitialLoading) {
    return <AnalyticsSkeleton />;
  }

  const { current, previous, visibleMonths } = data;
  const monthName = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(new Date(data.loadedYear, data.loadedMonth - 1, 1));
  const trendCaption = `Últimos ${range} meses`;
  const kpis = [
    {
      label: "Receitas",
      icon: ArrowUpRight,
      value: current.income,
      format: formatValue,
      delta: percentChange(current.income, previous.income),
      goodWhen: "up" as const,
      trend: visibleMonths.map((month) => month.income),
      trendColor: analyticsColors.income,
    },
    {
      label: "Despesas",
      icon: ArrowDownRight,
      value: current.expense,
      format: formatValue,
      delta: percentChange(current.expense, previous.expense),
      goodWhen: "down" as const,
      trend: visibleMonths.map((month) => month.expense),
      trendColor: analyticsColors.expense,
    },
    {
      label: "Balanço líquido",
      icon: Scale,
      value: current.net,
      format: formatValue,
      delta: percentChange(current.net, previous.net),
      goodWhen: "up" as const,
      trend: visibleMonths.map((month) => month.net),
      trendColor: analyticsColors.primary,
      valueClassName: current.net < 0 ? "text-rose-400" : undefined,
    },
    {
      label: "Taxa de poupança",
      icon: PiggyBank,
      value: current.savingsRate,
      format: formatRate,
      delta:
        current.income > 0 && previous.income > 0
          ? current.savingsRate - previous.savingsRate
          : null,
      deltaSuffix: " p.p.",
      goodWhen: "up" as const,
      trend: visibleMonths.map((month) => month.savingsRate),
      trendColor: analyticsColors.income,
    },
    {
      label: "Gasto médio por dia",
      icon: CalendarClock,
      value: getAverageDailyExpense(current),
      format: formatValue,
      delta: percentChange(
        getAverageDailyExpense(current),
        getAverageDailyExpense(previous),
      ),
      goodWhen: "down" as const,
      trend: visibleMonths.map((month) => getAverageDailyExpense(month)),
      trendColor: analyticsColors.expense,
    },
    {
      label: "Comprometimento fixo",
      icon: Lock,
      value: getFixedCommitment(current),
      format: formatRate,
      delta:
        current.income > 0 && previous.income > 0
          ? getFixedCommitment(current) - getFixedCommitment(previous)
          : null,
      deltaSuffix: " p.p.",
      goodWhen: "down" as const,
      trend: visibleMonths.map((month) => getFixedCommitment(month)),
      trendColor: analyticsColors.primary,
    },
  ];
  const pacePoint = data.pace.currentDay
    ? data.pace.points[data.pace.currentDay - 1]
    : undefined;
  const spentSoFar = pacePoint?.current ?? 0;
  const paceStats = [
    { label: "Gasto até hoje", value: formatValue(spentSoFar) },
    {
      label: "Mês anterior no mesmo dia",
      value: formatValue(pacePoint?.previous ?? 0),
    },
    {
      label: "Projeção do mês",
      value:
        data.pace.currentDay && data.pace.currentDay < data.pace.points.length
          ? formatValue(
              Math.max(
                (spentSoFar / data.pace.currentDay) * data.pace.points.length,
                current.expense,
              ),
            )
          : formatValue(current.expense),
    },
  ];
  const rangeTotals = visibleMonths.reduce(
    (totals, month) => ({
      income: totals.income + month.income,
      expense: totals.expense + month.expense,
    }),
    { income: 0, expense: 0 },
  );

  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        variants={dashboardStagger}
        initial="hidden"
        animate="visible"
        className={cn(
          "flex w-full flex-col gap-4 pb-4 transition-opacity duration-300 sm:gap-6",
          data.isLoading && "pointer-events-none opacity-60",
        )}
      >
        <motion.header
          variants={dashboardReveal}
          data-tour="analytics-dashboard"
          className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"
        >
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-emerald-300">
              <Sparkles className="size-3.5" />
              Centro de análise
            </p>
            <h1 className="mt-1.5 text-2xl font-semibold tracking-[-0.03em] text-zinc-50 sm:text-3xl">
              Analytics
            </h1>
            <p className="mt-1 text-sm text-zinc-400">
              Seus indicadores pessoais em {monthName}, sem gastos de
              dependentes.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div
              role="radiogroup"
              aria-label="Período dos gráficos"
              className="flex rounded-xl bg-zinc-900/60 p-1 ring-1 ring-inset ring-white/[0.08]"
            >
              {rangeOptions.map((option) => {
                const isActive = option === range;

                return (
                  <button
                    key={option}
                    type="button"
                    role="radio"
                    aria-checked={isActive}
                    onClick={() => setRange(option)}
                    className={cn(
                      "relative h-9 flex-1 rounded-lg px-4 text-xs font-semibold transition-colors sm:flex-none",
                      isActive
                        ? "text-zinc-950"
                        : "text-zinc-400 hover:text-zinc-100",
                    )}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="analytics-range-pill"
                        className="absolute inset-0 rounded-lg bg-emerald-400"
                        transition={{
                          type: "spring",
                          bounce: 0.18,
                          duration: 0.4,
                        }}
                      />
                    )}
                    <span className="relative">{option} meses</span>
                  </button>
                );
              })}
            </div>
            <AnimatedMonthSelector
              currentMonth={currentMonth}
              currentYear={currentYear}
              onPreviousMonth={prevMonth}
              onNextMonth={nextMonth}
              isLoading={data.isLoading}
            />
          </div>
        </motion.header>

        <div className="grid gap-4 sm:gap-6 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <HealthScoreCard health={data.healthScore} hasData={data.hasData} />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:col-span-8 xl:grid-cols-3">
            {kpis.map((kpi) => (
              <KpiCard key={kpi.label} {...kpi} caption={trendCaption} />
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:gap-6 lg:grid-cols-12">
          <AnalyticsPanel
            title="Fluxo de caixa"
            description={`Receitas ${formatValue(rangeTotals.income)} · despesas ${formatValue(rangeTotals.expense)} nos últimos ${range} meses`}
            action={
              <ChartLegend
                items={[
                  {
                    label: "Receitas",
                    color: analyticsColors.income,
                    shape: "box",
                  },
                  {
                    label: "Despesas",
                    color: analyticsColors.expense,
                    shape: "box",
                  },
                  { label: "Balanço", color: analyticsColors.primary },
                ]}
              />
            }
            className="lg:col-span-8"
          >
            <CashFlowChart
              months={visibleMonths}
              formatValue={formatValue}
              formatCompact={formatCompact}
            />
          </AnalyticsPanel>

          <AnalyticsPanel
            title="Leitura do analista"
            description="O que mais chamou atenção no mês"
            className="lg:col-span-4"
          >
            <InsightsList insights={data.insights} />
          </AnalyticsPanel>
        </div>

        <div className="grid gap-4 sm:gap-6 lg:grid-cols-12">
          <AnalyticsPanel
            title="Ritmo de gastos"
            description="Gasto acumulado dia a dia comparado ao mês anterior"
            action={
              <ChartLegend
                items={[
                  { label: "Este mês", color: analyticsColors.primary },
                  { label: "Mês anterior", color: "#71717a", dashed: true },
                ]}
              />
            }
            className="lg:col-span-7"
          >
            <SpendingPaceChart
              points={data.pace.points}
              currentDay={data.pace.currentDay}
              formatValue={formatValue}
              formatCompact={formatCompact}
            />
            <dl className="mt-auto grid grid-cols-3 gap-2 border-t border-white/[0.06] pt-5 sm:gap-4">
              {paceStats.map((stat) => (
                <div key={stat.label} className="min-w-0">
                  <dt className="truncate text-[11px] text-zinc-500 sm:text-xs">
                    {stat.label}
                  </dt>
                  <dd className="mt-1 truncate text-sm font-semibold tabular-nums text-zinc-50 sm:text-base">
                    {stat.value}
                  </dd>
                </div>
              ))}
            </dl>
          </AnalyticsPanel>

          <AnalyticsPanel
            title="Categorias"
            description="Participação nos gastos e variação vs. mês anterior"
            className="lg:col-span-5"
          >
            <CategoryRanking
              categories={data.categories}
              formatValue={formatValue}
            />
          </AnalyticsPanel>
        </div>

        <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
          <AnalyticsPanel
            title="Composição"
            description="Contas fixas vs. cartão por mês"
            action={
              <ChartLegend
                items={[
                  {
                    label: "Fixas",
                    color: analyticsColors.primary,
                    shape: "box",
                  },
                  {
                    label: "Cartão",
                    color: analyticsColors.expense,
                    shape: "box",
                  },
                ]}
              />
            }
          >
            <CompositionChart
              months={visibleMonths}
              formatValue={formatValue}
              formatCompact={formatCompact}
            />
          </AnalyticsPanel>

          <AnalyticsPanel
            title="Dias da semana"
            description={`Onde seus gastos se concentram nos últimos ${range} meses`}
          >
            <WeekdayChart
              points={data.weekdaysBreakdown}
              formatValue={formatValue}
            />
          </AnalyticsPanel>

          <AnalyticsPanel
            title="Maiores despesas"
            description="Os lançamentos que mais pesaram no mês"
          >
            <TopExpenses
              expenses={data.topExpenses}
              total={current.expense}
              formatValue={formatValue}
            />
          </AnalyticsPanel>
        </div>
      </motion.div>
    </MotionConfig>
  );
}
