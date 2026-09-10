"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  BadgePercent,
  ReceiptText,
  TrendingDown,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  formatDateOnlyBR,
  getDateOnlyParts,
  toDateOnly,
} from "@/lib/dateUtils";
import { aggregatePeriodExpenses } from "@/lib/financeAggregation";
import { supabase } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";
import { useFinanceStore } from "@/store/useFinanceStore";

const brlFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const compactBrlFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 1,
});

type TopExpense = {
  name: string;
  date: string;
  amount: number;
  icon: LucideIcon;
};

type MonthlyEvolutionPoint = {
  month: string;
  monthStart: string;
  receitas: number;
  gastos: number;
};

type CategoryDistributionPoint = {
  name: string;
  value: number;
  color: string;
};

type ExpenseCompositionPoint = {
  month: string;
  fixed: number;
  variable: number;
};

type TransactionRow = {
  id: string;
  card_id: string | null;
  dependent_id: string | null;
  month_start: string;
  transaction_date: string | null;
  type: "income" | "fixed" | "card" | string;
  description: string;
  category: string | null;
  amount: number | string | null;
  day: number;
  notes: string | null;
};

type AnalyticsData = {
  monthlyEvolution: MonthlyEvolutionPoint[];
  categoryDistribution: CategoryDistributionPoint[];
  expenseComposition: ExpenseCompositionPoint[];
  topExpenses: TopExpense[];
  totalIncome: number;
  totalExpense: number;
  previousExpense: number;
};

type KpiCardProps = {
  title: string;
  value: number;
  helper: string;
  icon: LucideIcon;
  tone: string;
  format: (value: number) => string;
};

const categoryColors = [
  "#10b981",
  "#38bdf8",
  "#a3e635",
  "#f59e0b",
  "#f87171",
  "#c084fc",
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      delayChildren: 0.04,
      staggerChildren: 0.06,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.38, ease: "easeOut" as const },
  },
};

const tooltipContentStyle = {
  backgroundColor: "#18181b",
  border: "1px solid #27272a",
  borderRadius: "8px",
  color: "#f4f4f5",
};

function toAmount(value: number | string | null | undefined) {
  const normalizedValue =
    typeof value === "string" ? value.replace(",", ".") : value;
  const amount = Number(normalizedValue);

  return Number.isFinite(amount) ? amount : 0;
}

function addMonths(year: number, month: number, offset: number) {
  const date = new Date(year, month - 1 + offset, 1);

  return {
    month: date.getMonth() + 1,
    year: date.getFullYear(),
  };
}

function getMonthLabel(monthStart: string) {
  const { month } = getDateOnlyParts(monthStart);
  const labels = [
    "Jan",
    "Fev",
    "Mar",
    "Abr",
    "Mai",
    "Jun",
    "Jul",
    "Ago",
    "Set",
    "Out",
    "Nov",
    "Dez",
  ];

  return labels[month - 1] ?? monthStart.slice(5, 7);
}

function getMonthStartRange(month: number, year: number) {
  const firstMonth = addMonths(year, month, -5);
  const nextMonth = addMonths(year, month, 1);

  return {
    currentMonthStart: toDateOnly(year, month, 1),
    startDate: toDateOnly(firstMonth.year, firstMonth.month, 1),
    endDate: toDateOnly(nextMonth.year, nextMonth.month, 1),
  };
}

function createEmptyMonthlyEvolution(month: number, year: number) {
  return Array.from({ length: 6 }, (_, index) => {
    const itemMonth = addMonths(year, month, index - 5);
    const monthStart = toDateOnly(itemMonth.year, itemMonth.month, 1);

    return {
      month: getMonthLabel(monthStart),
      monthStart,
      receitas: 0 as number,
      gastos: 0 as number,
    };
  });
}

function buildAnalyticsData(
  rows: TransactionRow[],
  selectedMonth: number,
  selectedYear: number,
): AnalyticsData {
  const baseTimeline = createEmptyMonthlyEvolution(selectedMonth, selectedYear);
  const personalRows = rows.filter((row) => row.dependent_id === null);
  const { currentMonthStart } = getMonthStartRange(
    selectedMonth,
    selectedYear,
  );
  const aggregationEntries = personalRows.map((row) => {
    const period = getDateOnlyParts(row.month_start);

    return {
      id: row.id,
      type: row.type,
      date:
        row.transaction_date ??
        toDateOnly(period.year, period.month, row.day || 1),
      billingMonthStart: row.type === "card" ? row.month_start : undefined,
      amount: toAmount(row.amount),
      description: row.description,
      category: row.category,
      notes: row.notes,
    };
  });
  const monthlyEvolution = baseTimeline.map((item) => {
    const period = getDateOnlyParts(item.monthStart);
    const expenses = aggregatePeriodExpenses(
      aggregationEntries,
      period.month,
      period.year,
    );
    const income = personalRows
      .filter(
        (row) =>
          row.type === "income" && row.month_start === item.monthStart,
      )
      .reduce((sum, row) => sum + toAmount(row.amount), 0);

    return {
      month: item.month,
      monthStart: item.monthStart,
      receitas: Number(income) || 0,
      gastos: Number(expenses.total) || 0,
    };
  });
  const currentExpenses = aggregatePeriodExpenses(
    aggregationEntries,
    selectedMonth,
    selectedYear,
  );
  const previousPeriod = getDateOnlyParts(
    monthlyEvolution.at(-2)?.monthStart ?? currentMonthStart,
  );
  const previousExpenses = aggregatePeriodExpenses(
    aggregationEntries,
    previousPeriod.month,
    previousPeriod.year,
  );
  const categoryTotals = new Map<string, number>();

  currentExpenses.entries.forEach((entry) => {
    if (entry.signedAmount <= 0) return;

    const category = entry.category?.trim() || "Sem categoria";
    categoryTotals.set(
      category,
      (categoryTotals.get(category) ?? 0) + entry.signedAmount,
    );
  });

  const categoryDistribution = Array.from(categoryTotals.entries())
    .sort((left, right) => right[1] - left[1])
    .map(([name, value], index) => ({
      name,
      value: Number(value) || 0,
      color: categoryColors[index % categoryColors.length],
    }));
  const expenseComposition = monthlyEvolution.map((item) => {
    const period = getDateOnlyParts(item.monthStart);
    const expenses = aggregatePeriodExpenses(
      aggregationEntries,
      period.month,
      period.year,
    );

    return {
      month: item.month,
      fixed: Number(expenses.fixed) || 0,
      variable: Number(expenses.card) || 0,
    };
  });
  const topExpenses = [...currentExpenses.entries]
    .filter((expense) => expense.signedAmount > 0)
    .sort((left, right) => right.signedAmount - left.signedAmount)
    .slice(0, 5)
    .map((expense) => ({
      name: expense.description || "Sem descrição",
      date: formatDateOnlyBR(expense.date),
      amount: expense.signedAmount,
      icon: ReceiptText,
    }));
  const currentMonthData = monthlyEvolution.find(
    (item) => item.monthStart === currentMonthStart,
  );

  return {
    monthlyEvolution,
    categoryDistribution,
    expenseComposition,
    topExpenses,
    totalIncome: Number(currentMonthData?.receitas) || 0,
    totalExpense: Number(currentExpenses.total) || 0,
    previousExpense: Number(previousExpenses.total) || 0,
  };
}

function createEmptyAnalyticsData(month: number, year: number): AnalyticsData {
  return buildAnalyticsData([], month, year);
}

function useCountUp(target: number, duration = 900) {
  const shouldReduceMotion = useReducedMotion();
  const [value, setValue] = useState(shouldReduceMotion ? target : 0);

  useEffect(() => {
    if (shouldReduceMotion) {
      return;
    }

    let animationFrame = 0;
    const startedAt = performance.now();

    const animate = (timestamp: number) => {
      const progress = Math.min((timestamp - startedAt) / duration, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3);

      setValue(target * easedProgress);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrame);
  }, [duration, shouldReduceMotion, target]);

  return shouldReduceMotion ? target : value;
}

function KpiCard({
  title,
  value,
  helper,
  icon: Icon,
  tone,
  format,
}: KpiCardProps) {
  const animatedValue = useCountUp(value);

  return (
    <motion.div variants={itemVariants} className="min-w-0 lg:col-span-3">
      <Card className="h-full border-white/5 bg-zinc-900/60 shadow-none backdrop-blur">
        <CardContent className="flex h-full items-center justify-between gap-3 p-4">
          <div className="min-w-0">
            <p className="truncate text-[11px] font-medium uppercase text-zinc-500">
              {title}
            </p>
            <p
              className={cn(
                "mt-1 truncate text-xl font-semibold tracking-tight xl:text-2xl",
                tone,
              )}
            >
              {format(animatedValue)}
            </p>
            <p className="mt-1 truncate text-xs text-zinc-500">{helper}</p>
          </div>
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-white/5 bg-zinc-950/70 text-zinc-400">
            <Icon className="size-4" />
          </span>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function EmptyChart({ children }: { children: string }) {
  return (
    <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-zinc-800 px-6 text-center text-sm text-zinc-500">
      {children}
    </div>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="flex w-full flex-col gap-3 lg:h-[calc(100dvh-4rem)] lg:overflow-hidden">
      <div className="flex shrink-0 items-end justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-44" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        <Skeleton className="hidden h-9 w-36 sm:block" />
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-12 lg:grid-rows-[auto_minmax(220px,1.2fr)_minmax(190px,0.9fr)]">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton
            key={index}
            className="h-24 rounded-xl lg:col-span-3 lg:h-auto"
          />
        ))}
        <Skeleton className="h-[280px] rounded-xl sm:col-span-2 lg:col-span-12 lg:h-auto" />
        <Skeleton className="h-[230px] rounded-xl sm:col-span-2 lg:col-span-5 lg:h-auto" />
        <Skeleton className="h-[230px] rounded-xl sm:col-span-1 lg:col-span-3 lg:h-auto" />
        <Skeleton className="h-[230px] rounded-xl sm:col-span-1 lg:col-span-4 lg:h-auto" />
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const currentMonth = useFinanceStore((state) => state.currentMonth);
  const currentYear = useFinanceStore((state) => state.currentYear);
  const shouldReduceMotion = useReducedMotion();
  const [isLoading, setIsLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>(() =>
    createEmptyAnalyticsData(currentMonth, currentYear),
  );

  useEffect(() => {
    async function fetchAnalyticsData() {
      setIsLoading(true);

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) throw userError;

        if (!user) {
          setAnalyticsData(createEmptyAnalyticsData(currentMonth, currentYear));
          return;
        }

        const { startDate, endDate } = getMonthStartRange(
          currentMonth,
          currentYear,
        );
        const { data, error } = await supabase
          .from("transactions")
          .select(
            "id, card_id, dependent_id, month_start, transaction_date, type, description, category, amount, day, notes",
          )
          .eq("user_id", user.id)
          .is("dependent_id", null)
          .gte("month_start", startDate)
          .lt("month_start", endDate)
          .order("month_start", { ascending: true })
          .order("day", { ascending: true })
          .order("created_at", { ascending: false });

        if (error) throw error;

        setAnalyticsData(
          buildAnalyticsData(
            (data ?? []) as TransactionRow[],
            currentMonth,
            currentYear,
          ),
        );
      } catch (error) {
        console.error("Erro ao carregar analytics:", error);
        setAnalyticsData(createEmptyAnalyticsData(currentMonth, currentYear));
      } finally {
        setIsLoading(false);
      }
    }

    void fetchAnalyticsData();
  }, [currentMonth, currentYear]);

  const {
    monthlyEvolution,
    categoryDistribution,
    expenseComposition,
    topExpenses,
    totalIncome,
    totalExpense,
    previousExpense,
  } = analyticsData;
  const projectedSavings = totalIncome - totalExpense;
  const savingsRate =
    totalIncome > 0 ? (projectedSavings / totalIncome) * 100 : 0;
  const expenseDelta =
    previousExpense > 0
      ? ((totalExpense - previousExpense) / previousExpense) * 100
      : 0;
  const hasFinancialData = totalIncome > 0 || totalExpense > 0;
  const topCategories = useMemo(
    () => categoryDistribution.slice(0, 5),
    [categoryDistribution],
  );
  const expenseMix = useMemo(() => {
    const currentComposition = expenseComposition.at(-1);

    return [
      {
        name: "Contas fixas",
        value: Number(currentComposition?.fixed) || 0,
        color: "#38bdf8",
      },
      {
        name: "Cartão",
        value: Number(currentComposition?.variable) || 0,
        color: "#a78bfa",
      },
    ].filter((item) => item.value > 0);
  }, [expenseComposition]);
  const expenseMixTotal = useMemo(
    () => expenseMix.reduce((sum, item) => sum + item.value, 0),
    [expenseMix],
  );
  const selectedPeriodLabel = useMemo(() => {
    const label = new Intl.DateTimeFormat("pt-BR", {
      month: "long",
      year: "numeric",
    }).format(new Date(currentYear, currentMonth - 1, 1));

    return label.charAt(0).toUpperCase() + label.slice(1);
  }, [currentMonth, currentYear]);
  const expenseHelper =
    previousExpense > 0
      ? (expenseDelta > 0 ? "+" : "") +
        expenseDelta.toFixed(1) +
        "% vs. mês anterior"
      : "Sem base no mês anterior";

  if (isLoading) {
    return <AnalyticsSkeleton />;
  }

  return (
    <div className="flex w-full flex-col gap-3 overflow-x-hidden bg-zinc-950 lg:h-[calc(100dvh-4rem)] lg:overflow-hidden">
      <header
        data-tour="analytics-dashboard"
        className="flex shrink-0 items-end justify-between gap-4"
      >
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase text-emerald-400">
            Centro de comando
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-50 md:text-3xl">
            Analytics
          </h1>
          <p className="mt-1 truncate text-sm text-zinc-500">
            Leitura exclusiva da sua saúde financeira pessoal.
          </p>
        </div>
        <div className="hidden shrink-0 rounded-lg border border-white/5 bg-zinc-900/60 px-3 py-2 text-right backdrop-blur sm:block">
          <p className="text-[10px] uppercase text-zinc-600">Período</p>
          <p className="text-sm font-medium text-zinc-200">
            {selectedPeriodLabel}
          </p>
        </div>
      </header>

      <motion.main
        variants={containerVariants}
        initial={shouldReduceMotion ? false : "hidden"}
        animate="visible"
        className="grid min-h-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-12 lg:grid-rows-[auto_minmax(220px,1.2fr)_minmax(190px,0.9fr)]"
      >
        <KpiCard
          title="Entradas"
          value={totalIncome}
          helper="Receitas pessoais do mês"
          icon={TrendingUp}
          tone="text-emerald-400"
          format={(value) => brlFormatter.format(value)}
        />
        <KpiCard
          title="Saídas"
          value={totalExpense}
          helper={expenseHelper}
          icon={TrendingDown}
          tone="text-rose-400"
          format={(value) => brlFormatter.format(value)}
        />
        <KpiCard
          title="Balanço líquido"
          value={projectedSavings}
          helper="Entradas menos saídas"
          icon={Wallet}
          tone={projectedSavings >= 0 ? "text-zinc-50" : "text-rose-400"}
          format={(value) => brlFormatter.format(value)}
        />
        <KpiCard
          title="Taxa de poupança"
          value={savingsRate}
          helper="Percentual preservado da renda"
          icon={BadgePercent}
          tone={savingsRate >= 0 ? "text-emerald-400" : "text-rose-400"}
          format={(value) => value.toFixed(1) + "%"}
        />

        <motion.div
          variants={itemVariants}
          className="min-h-0 sm:col-span-2 lg:col-span-12"
        >
          <Card className="flex h-[280px] min-h-0 flex-col overflow-hidden border-white/5 bg-zinc-900/60 shadow-none backdrop-blur lg:h-full">
            <CardHeader className="flex shrink-0 flex-row items-start justify-between gap-4 p-4 pb-1">
              <div>
                <CardTitle className="text-sm font-semibold text-zinc-100">
                  Fluxo financeiro
                </CardTitle>
                <CardDescription className="mt-1 text-xs text-zinc-500">
                  Entradas e saídas pessoais nos últimos seis períodos
                </CardDescription>
              </div>
              <div className="flex shrink-0 items-center gap-3 text-[11px] text-zinc-500">
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-emerald-400" />
                  Entradas
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-rose-400" />
                  Saídas
                </span>
              </div>
            </CardHeader>
            <CardContent className="min-h-0 min-w-0 flex-1 p-2 pt-0">
              {hasFinancialData ? (
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                  minWidth={1}
                  minHeight={1}
                >
                  <AreaChart
                    data={monthlyEvolution}
                    margin={{ top: 14, right: 12, bottom: 0, left: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="analyticsIncomeGradient"
                        x1="0"
                        x2="0"
                        y1="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#10b981"
                          stopOpacity={0.34}
                        />
                        <stop
                          offset="95%"
                          stopColor="#10b981"
                          stopOpacity={0}
                        />
                      </linearGradient>
                      <linearGradient
                        id="analyticsExpenseGradient"
                        x1="0"
                        x2="0"
                        y1="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#fb7185"
                          stopOpacity={0.24}
                        />
                        <stop
                          offset="95%"
                          stopColor="#fb7185"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      vertical={false}
                      stroke="#27272a"
                      strokeDasharray="3 6"
                    />
                    <XAxis
                      dataKey="month"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#71717a", fontSize: 11 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      width={62}
                      tick={{ fill: "#71717a", fontSize: 11 }}
                      tickFormatter={(value) =>
                        compactBrlFormatter.format(Number(value))
                      }
                    />
                    <Tooltip
                      cursor={{ stroke: "#3f3f46", strokeDasharray: "4 4" }}
                      contentStyle={tooltipContentStyle}
                      itemStyle={{ color: "#f4f4f5" }}
                      labelStyle={{ color: "#a1a1aa" }}
                      formatter={(value, name) => [
                        brlFormatter.format(Number(value)),
                        name,
                      ]}
                    />
                    <Area
                      type="monotone"
                      dataKey="receitas"
                      name="Entradas"
                      stroke="#34d399"
                      strokeWidth={2}
                      fill="url(#analyticsIncomeGradient)"
                      activeDot={{ r: 4, strokeWidth: 0 }}
                      isAnimationActive
                      animationDuration={1200}
                    />
                    <Area
                      type="monotone"
                      dataKey="gastos"
                      name="Saídas"
                      stroke="#fb7185"
                      strokeWidth={2}
                      fill="url(#analyticsExpenseGradient)"
                      activeDot={{ r: 4, strokeWidth: 0 }}
                      isAnimationActive
                      animationDuration={1200}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart>
                  Registre receitas e despesas para visualizar sua evolução.
                </EmptyChart>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="min-h-0 sm:col-span-2 lg:col-span-5"
        >
          <Card className="flex h-[230px] min-h-0 flex-col overflow-hidden border-white/5 bg-zinc-900/60 shadow-none backdrop-blur lg:h-full">
            <CardHeader className="shrink-0 p-4 pb-1">
              <CardTitle className="text-sm font-semibold text-zinc-100">
                Top categorias
              </CardTitle>
              <CardDescription className="text-xs text-zinc-500">
                Maiores concentrações de gasto no período
              </CardDescription>
            </CardHeader>
            <CardContent className="min-h-0 min-w-0 flex-1 p-2 pt-0">
              {topCategories.length > 0 ? (
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                  minWidth={1}
                  minHeight={1}
                >
                  <BarChart
                    data={topCategories}
                    layout="vertical"
                    margin={{ top: 6, right: 12, bottom: 2, left: 6 }}
                  >
                    <CartesianGrid
                      horizontal={false}
                      stroke="#27272a"
                      strokeDasharray="3 6"
                    />
                    <XAxis type="number" hide />
                    <YAxis
                      type="category"
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      width={88}
                      tick={{ fill: "#a1a1aa", fontSize: 11 }}
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(255, 255, 255, 0.03)" }}
                      contentStyle={tooltipContentStyle}
                      itemStyle={{ color: "#f4f4f5" }}
                      formatter={(value) => [
                        brlFormatter.format(Number(value)),
                        "Total",
                      ]}
                    />
                    <Bar
                      dataKey="value"
                      radius={[0, 5, 5, 0]}
                      barSize={11}
                      isAnimationActive
                      animationDuration={1200}
                    >
                      {topCategories.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart>Nenhuma categoria registrada no mês.</EmptyChart>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="min-h-0 sm:col-span-1 lg:col-span-3"
        >
          <Card className="flex h-[230px] min-h-0 flex-col overflow-hidden border-white/5 bg-zinc-900/60 shadow-none backdrop-blur lg:h-full">
            <CardHeader className="shrink-0 p-4 pb-0">
              <CardTitle className="text-sm font-semibold text-zinc-100">
                Composição
              </CardTitle>
              <CardDescription className="text-xs text-zinc-500">
                Fixos e cartão
              </CardDescription>
            </CardHeader>
            <CardContent className="flex min-h-0 min-w-0 flex-1 flex-col p-2 pt-0">
              {expenseMix.length > 0 ? (
                <>
                  <div className="relative min-h-0 flex-1">
                    <ResponsiveContainer
                      width="100%"
                      height="100%"
                      minWidth={1}
                      minHeight={1}
                    >
                      <PieChart>
                        <Pie
                          data={expenseMix}
                          dataKey="value"
                          nameKey="name"
                          innerRadius="60%"
                          outerRadius="80%"
                          paddingAngle={2}
                          cornerRadius={4}
                          stroke="#18181b"
                          strokeWidth={2}
                          isAnimationActive
                          animationDuration={1200}
                        >
                          {expenseMix.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={tooltipContentStyle}
                          itemStyle={{ color: "#f4f4f5" }}
                          formatter={(value, name) => [
                            brlFormatter.format(Number(value)),
                            name,
                          ]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-[10px] uppercase text-zinc-600">
                        Total
                      </span>
                      <strong className="text-sm font-semibold text-zinc-100">
                        {compactBrlFormatter.format(expenseMixTotal)}
                      </strong>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center justify-center gap-3 pb-1 text-[10px] text-zinc-500">
                    {expenseMix.map((item) => (
                      <span key={item.name} className="flex items-center gap-1.5">
                        <span
                          className="size-1.5 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        {item.name}
                      </span>
                    ))}
                  </div>
                </>
              ) : (
                <EmptyChart>Sem composição de despesas.</EmptyChart>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="min-h-0 sm:col-span-1 lg:col-span-4"
        >
          <Card className="flex h-[230px] min-h-0 flex-col overflow-hidden border-white/5 bg-zinc-900/60 shadow-none backdrop-blur lg:h-full">
            <CardHeader className="shrink-0 p-4 pb-2">
              <CardTitle className="text-sm font-semibold text-zinc-100">
                Maiores despesas
              </CardTitle>
              <CardDescription className="text-xs text-zinc-500">
                Lançamentos que mais pesaram no mês
              </CardDescription>
            </CardHeader>
            <CardContent className="min-h-0 flex-1 overflow-y-auto p-3 pt-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {topExpenses.length > 0 ? (
                <div className="divide-y divide-white/5">
                  {topExpenses.slice(0, 4).map((expense, index) => {
                    const Icon = expense.icon;

                    return (
                      <div
                        key={expense.name + expense.date + index}
                        className="flex items-center justify-between gap-3 py-2 first:pt-0"
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-zinc-950/70 text-zinc-500">
                            <Icon className="size-3.5" />
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-xs font-medium text-zinc-200">
                              {expense.name}
                            </p>
                            <p className="mt-0.5 text-[10px] text-zinc-600">
                              {expense.date}
                            </p>
                          </div>
                        </div>
                        <p className="shrink-0 text-xs font-medium text-rose-300">
                          {brlFormatter.format(expense.amount)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyChart>Nenhuma despesa registrada no mês.</EmptyChart>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.main>
    </div>
  );
}
