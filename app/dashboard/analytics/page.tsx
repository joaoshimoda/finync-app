"use client";

import { useEffect, useState } from "react";
import { ReceiptText, type LucideIcon } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
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
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  formatDateOnlyBR,
  getDateOnlyParts,
  getLocalTodayDateOnly,
  toDateOnly,
} from "@/lib/dateUtils";
import { isCardCreditAdjustment } from "@/lib/cardCredits";
import { supabase } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";

const brlFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
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
  month_start: string;
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

const categoryColors = [
  "#10b981",
  "#38bdf8",
  "#a3e635",
  "#f59e0b",
  "#f87171",
  "#c084fc",
];

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
  const labels = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

  return labels[month - 1] ?? monthStart.slice(5, 7);
}

function getMonthStartRange() {
  const { month, year } = getDateOnlyParts(getLocalTodayDateOnly());
  const firstMonth = addMonths(year, month, -5);
  const nextMonth = addMonths(year, month, 1);

  return {
    currentMonthStart: toDateOnly(year, month, 1),
    startDate: toDateOnly(firstMonth.year, firstMonth.month, 1),
    endDate: toDateOnly(nextMonth.year, nextMonth.month, 1),
  };
}

function createEmptyMonthlyEvolution() {
  const { month, year } = getDateOnlyParts(getLocalTodayDateOnly());

  return Array.from({ length: 6 }, (_, index) => {
    const itemMonth = addMonths(year, month, index - 5);
    const monthStart = toDateOnly(itemMonth.year, itemMonth.month, 1);

    return {
      month: getMonthLabel(monthStart),
      monthStart,
      receitas: 0,
      gastos: 0,
    };
  });
}

function buildAnalyticsData(rows: TransactionRow[]): AnalyticsData {
  const monthlyEvolution = createEmptyMonthlyEvolution();
  const monthlyMap = new Map(
    monthlyEvolution.map((item) => [item.monthStart, item]),
  );
  const { currentMonthStart } = getMonthStartRange();
  const categoryTotals = new Map<string, number>();
  const currentMonthExpenses: TransactionRow[] = [];

  for (const row of rows) {
    const amount = toAmount(row.amount);
    const signedAmount = isCardCreditAdjustment({
      category: row.category,
      notes: row.notes,
      type: row.type,
    })
      ? -amount
      : amount;
    const monthItem = monthlyMap.get(row.month_start);

    if (!monthItem) continue;

    if (row.type === "income") {
      monthItem.receitas += amount;
      continue;
    }

    monthItem.gastos += signedAmount;

    if (row.month_start === currentMonthStart && signedAmount > 0) {
      currentMonthExpenses.push(row);
      const category = row.category?.trim() || "Sem categoria";
      categoryTotals.set(category, (categoryTotals.get(category) ?? 0) + signedAmount);
    }
  }

  const currentMonth = monthlyMap.get(currentMonthStart);
  const previousMonth = monthlyEvolution.at(-2);
  const categoryDistribution = Array.from(categoryTotals.entries())
    .sort((left, right) => right[1] - left[1])
    .map(([name, value], index) => ({
      name,
      value,
      color: categoryColors[index % categoryColors.length],
    }));
  const expenseComposition = monthlyEvolution.map((item) => {
    const monthRows = rows.filter((row) => row.month_start === item.monthStart);

    return {
      month: item.month,
      fixed: monthRows
        .filter((row) => row.type === "fixed")
        .reduce((sum, row) => sum + toAmount(row.amount), 0),
      variable: monthRows
        .filter((row) => row.type === "card")
        .reduce(
          (sum, row) =>
            sum +
            (isCardCreditAdjustment(row)
              ? -toAmount(row.amount)
              : toAmount(row.amount)),
          0,
        ),
    };
  });
  const topExpenses = currentMonthExpenses
    .sort((left, right) => toAmount(right.amount) - toAmount(left.amount))
    .slice(0, 5)
    .map((expense) => ({
      name: expense.description,
      date: formatDateOnlyBR(
        toDateOnly(
          getDateOnlyParts(expense.month_start).year,
          getDateOnlyParts(expense.month_start).month,
          expense.day,
        ),
      ),
      amount: toAmount(expense.amount),
      icon: ReceiptText,
    }));

  return {
    monthlyEvolution,
    categoryDistribution,
    expenseComposition,
    topExpenses,
    totalIncome: currentMonth?.receitas ?? 0,
    totalExpense: currentMonth?.gastos ?? 0,
    previousExpense: previousMonth?.gastos ?? 0,
  };
}

function createEmptyAnalyticsData(): AnalyticsData {
  return buildAnalyticsData([]);
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-28 rounded-2xl" />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Skeleton className="h-[280px] rounded-2xl lg:col-span-8" />
        <Skeleton className="h-[280px] rounded-2xl lg:col-span-4" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Skeleton className="h-[280px] rounded-2xl lg:col-span-7" />
        <Skeleton className="h-[280px] rounded-2xl lg:col-span-5" />
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>(() =>
    createEmptyAnalyticsData(),
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
          setAnalyticsData(createEmptyAnalyticsData());
          return;
        }

        const { startDate, endDate } = getMonthStartRange();
        const { data, error } = await supabase
          .from("transactions")
          .select("id, month_start, type, description, category, amount, day, notes")
          .eq("user_id", user.id)
          .gte("month_start", startDate)
          .lt("month_start", endDate)
          .order("month_start", { ascending: true })
          .order("day", { ascending: true })
          .order("created_at", { ascending: false });

        if (error) throw error;

        setAnalyticsData(buildAnalyticsData((data ?? []) as TransactionRow[]));
      } catch (error) {
        console.error("Erro ao carregar analytics:", error);
        setAnalyticsData(createEmptyAnalyticsData());
      } finally {
        setIsLoading(false);
      }
    }

    void fetchAnalyticsData();
  }, []);

  if (isLoading) {
    return <AnalyticsSkeleton />;
  }

  const {
    monthlyEvolution,
    categoryDistribution,
    expenseComposition,
    topExpenses,
    totalIncome,
    totalExpense,
    previousExpense,
  } = analyticsData;
  const expenseDelta =
    previousExpense > 0
      ? ((totalExpense - previousExpense) / previousExpense) * 100
      : 0;
  const committedIncome =
    totalIncome > 0 ? Math.round((totalExpense / totalIncome) * 100) : 0;
  const projectedSavings = totalIncome - totalExpense;
  const isCommittedIncomeHigh = committedIncome > 70;
  const hasCategoryData = categoryDistribution.some(
    (category) => category.value > 0,
  );
  const hasTopExpenses = topExpenses.length > 0;
  const balanceData = [
    { name: "Receitas", value: totalIncome, fill: "#10b981" },
    { name: "Despesas", value: totalExpense, fill: "#71717a" },
  ];

  return (
    <div className="flex h-[calc(100vh-100px)] w-full flex-col gap-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-zinc-50">
          Análise Financeira
        </h1>
        <p className="text-sm text-zinc-400">
          Gráficos, KPIs e indicadores de saúde financeira.
        </p>
      </header>

      <Tabs defaultValue="desempenho" className="min-h-0 w-full">
        <TabsList className="grid w-full grid-cols-2 border border-zinc-800 bg-zinc-900/60 p-1 backdrop-blur sm:w-[360px]">
          <TabsTrigger value="desempenho">Desempenho</TabsTrigger>
          <TabsTrigger value="raio-x">Raio-X</TabsTrigger>
        </TabsList>

        <TabsContent value="desempenho" className="mt-4 space-y-4">
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="border-zinc-800/80 bg-zinc-900/50 shadow-none backdrop-blur">
          <CardHeader className="p-4 pb-2">
            <CardDescription>Despesa Total do Mês</CardDescription>
            <CardTitle className="text-2xl text-zinc-50">
              {brlFormatter.format(totalExpense)}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <span
              className={cn(
                "text-sm font-medium",
                expenseDelta > 0 ? "text-red-300" : "text-emerald-300",
              )}
            >
              {expenseDelta > 0 ? "+" : ""}
              {expenseDelta.toFixed(1)}% vs. mês anterior
            </span>
          </CardContent>
        </Card>

        <Card className="border-zinc-800/80 bg-zinc-900/50 shadow-none backdrop-blur">
          <CardHeader className="p-4 pb-2">
            <CardDescription>Renda Comprometida</CardDescription>
            <CardTitle
              className={cn(
                "text-2xl",
                isCommittedIncomeHigh ? "text-amber-300" : "text-emerald-300",
              )}
            >
              {committedIncome}%
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 p-4 pt-0">
            <Progress
              value={committedIncome}
              className={cn(
                "h-2 bg-zinc-800",
                isCommittedIncomeHigh
                  ? "[&_[data-slot=progress-indicator]]:bg-amber-400"
                  : "[&_[data-slot=progress-indicator]]:bg-emerald-400",
              )}
            />
            <p className="text-xs text-zinc-500">
              Limite saudável recomendado: até 70%.
            </p>
          </CardContent>
        </Card>

        <Card className="border-zinc-800/80 bg-zinc-900/50 shadow-none backdrop-blur">
          <CardHeader className="p-4 pb-2">
            <CardDescription>Projeção de Poupança</CardDescription>
            <CardTitle className="text-2xl text-emerald-300">
              {brlFormatter.format(projectedSavings)}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-xs text-zinc-400">
              Estimativa restante ao fim do mês atual.
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Card className="border-zinc-800/80 bg-zinc-900/50 shadow-none backdrop-blur lg:col-span-8">
          <CardHeader className="p-4 pb-2">
            <CardTitle>Evolução de Gastos vs Receitas</CardTitle>
            <CardDescription>
              Comparativo mensal para leitura rápida de tendência.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] min-h-0 min-w-0 p-3 pt-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
              <AreaChart data={monthlyEvolution}>
                <defs>
                  <linearGradient id="incomeGradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expenseGradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#71717a" stopOpacity={0.22} />
                    <stop offset="95%" stopColor="#71717a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#71717a", fontSize: 12 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#71717a", fontSize: 12 }}
                  tickFormatter={(value) => `R$ ${(Number(value) / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    background: "#09090b",
                    border: "1px solid rgba(63,63,70,0.8)",
                    borderRadius: 12,
                    color: "#fafafa",
                  }}
                  formatter={(value) => brlFormatter.format(Number(value))}
                />
                <Area
                  type="monotone"
                  dataKey="receitas"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#incomeGradient)"
                />
                <Area
                  type="monotone"
                  dataKey="gastos"
                  stroke="#a1a1aa"
                  strokeWidth={2}
                  fill="url(#expenseGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-zinc-800/80 bg-zinc-900/50 shadow-none backdrop-blur lg:col-span-4">
          <CardHeader className="p-4 pb-2">
            <CardTitle>Balanço do Mês</CardTitle>
            <CardDescription>
              Receita total contra despesa total no mês atual.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] min-h-0 min-w-0 p-3 pt-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
              <BarChart data={balanceData}>
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#71717a", fontSize: 12 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#71717a", fontSize: 12 }}
                  tickFormatter={(value) => `R$ ${(Number(value) / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    background: "#09090b",
                    border: "1px solid rgba(63,63,70,0.8)",
                    borderRadius: 12,
                    color: "#fafafa",
                  }}
                  formatter={(value) => brlFormatter.format(Number(value))}
                />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {balanceData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </section>
        </TabsContent>

        <TabsContent value="raio-x" className="mt-4">
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Card className="border-zinc-800/80 bg-zinc-900/50 shadow-none backdrop-blur lg:col-span-4">
          <CardHeader className="p-4 pb-2">
            <CardTitle>Distribuição por Categorias</CardTitle>
            <CardDescription>
              Participação das principais despesas do mês.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] min-h-0 min-w-0 p-3 pt-0">
            {hasCategoryData ? (
              <>
                <ResponsiveContainer width="100%" height="72%" minWidth={1} minHeight={1}>
                  <PieChart>
                    <Pie
                      data={categoryDistribution}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={72}
                      outerRadius={104}
                      paddingAngle={4}
                      stroke="rgba(9,9,11,0.9)"
                      strokeWidth={4}
                    >
                      {categoryDistribution.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "#09090b",
                        border: "1px solid rgba(63,63,70,0.8)",
                        borderRadius: 12,
                        color: "#fafafa",
                      }}
                      formatter={(value) => brlFormatter.format(Number(value))}
                    />
                  </PieChart>
                </ResponsiveContainer>

                <div className="grid grid-cols-2 gap-2">
                  {categoryDistribution.map((category) => (
                    <div key={category.name} className="flex items-center gap-2 text-xs">
                      <span
                        className="size-2 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      <span className="truncate text-zinc-400">{category.name}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-zinc-800/80 text-center text-sm text-zinc-500">
                Nenhum dado registrado neste mês.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-zinc-800/80 bg-zinc-900/50 shadow-none backdrop-blur lg:col-span-4">
          <CardHeader className="p-4 pb-2">
            <CardTitle>Composição de Despesas</CardTitle>
            <CardDescription>
              Comparativo mensal entre contas fixas e gastos variáveis.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] min-h-0 min-w-0 p-3 pt-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
              <BarChart data={expenseComposition}>
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#71717a", fontSize: 12 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#71717a", fontSize: 12 }}
                  tickFormatter={(value) => `R$ ${(Number(value) / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    background: "#09090b",
                    border: "1px solid rgba(63,63,70,0.8)",
                    borderRadius: 12,
                    color: "#fafafa",
                  }}
                  formatter={(value) => brlFormatter.format(Number(value))}
                />
                <Bar
                  dataKey="fixed"
                  name="Contas Fixas"
                  fill="#10b981"
                  radius={[6, 6, 0, 0]}
                />
                <Bar
                  dataKey="variable"
                  name="Gastos Variáveis"
                  fill="#71717a"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-zinc-800/80 bg-zinc-900/50 shadow-none backdrop-blur lg:col-span-4">
          <CardHeader className="p-4 pb-2">
            <CardTitle>Maiores Despesas do Mês</CardTitle>
          <CardDescription>Top 5 transações individuais.</CardDescription>
        </CardHeader>
        <CardContent className="p-3 pt-0">
            {hasTopExpenses ? (
              <div className="space-y-2">
                {topExpenses.map((expense) => {
                  const Icon = expense.icon;

                  return (
                    <div
                      key={expense.name}
                      className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800/70 bg-zinc-950/40 p-3"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-zinc-800/80 text-zinc-300">
                          <Icon className="size-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium text-zinc-100">
                            {expense.name}
                          </p>
                          <p className="mt-1 text-xs text-zinc-500">
                            {expense.date}
                          </p>
                        </div>
                      </div>
                      <p className="shrink-0 text-xs font-medium text-zinc-50">
                        {brlFormatter.format(expense.amount)}
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex h-[300px] items-center justify-center rounded-xl border border-dashed border-zinc-800/80 text-center text-sm text-zinc-500">
                Nenhuma despesa registrada neste mês.
              </div>
            )}
          </CardContent>
        </Card>
      </section>
        </TabsContent>
      </Tabs>
    </div>
  );
}
