import { getDateOnlyParts, toDateOnly } from "@/lib/dateUtils";
import {
  aggregatePeriodExpenses,
  type AggregatedExpenseEntry,
  type ExpenseAggregationEntry,
} from "@/lib/financeAggregation";

export type AnalyticsRange = 3 | 6 | 12;

export type AnalyticsTransactionRow = {
  id: string;
  card_id: string | null;
  dependent_id: string | null;
  month_start: string;
  transaction_date: string | null;
  type: string;
  description: string;
  category: string | null;
  amount: number | string | null;
  day: number;
  notes: string | null;
};

export interface MonthSummary {
  monthStart: string;
  label: string;
  income: number;
  expense: number;
  fixed: number;
  card: number;
  net: number;
  savingsRate: number;
  entries: AggregatedExpenseEntry[];
}

export interface CategoryInsight {
  name: string;
  amount: number;
  share: number;
  previousAmount: number;
  delta: number | null;
}

export interface PacePoint {
  day: number;
  current: number | null;
  previous: number | null;
}

export interface WeekdayPoint {
  weekday: string;
  shortLabel: string;
  amount: number;
  share: number;
}

export interface HealthScore {
  score: number;
  label: string;
  tone: "excellent" | "good" | "attention" | "critical";
  components: Array<{
    label: string;
    points: number;
    max: number;
    detail: string;
  }>;
}

export interface AnalyticsInsight {
  id: string;
  tone: "positive" | "negative" | "neutral";
  title: string;
  description: string;
}

/** Months fetched on top of the widest range so the first visible month has a predecessor. */
export const ANALYTICS_HISTORY_MONTHS = 13;

const monthLabels = [
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

const weekdays = [
  { weekday: "Domingo", shortLabel: "Dom" },
  { weekday: "Segunda", shortLabel: "Seg" },
  { weekday: "Terça", shortLabel: "Ter" },
  { weekday: "Quarta", shortLabel: "Qua" },
  { weekday: "Quinta", shortLabel: "Qui" },
  { weekday: "Sexta", shortLabel: "Sex" },
  { weekday: "Sábado", shortLabel: "Sáb" },
];

function toAmount(value: number | string | null | undefined) {
  const normalized =
    typeof value === "string" ? value.replace(",", ".") : value;
  const amount = Number(normalized);

  return Number.isFinite(amount) ? amount : 0;
}

export function addMonths(year: number, month: number, offset: number) {
  const date = new Date(year, month - 1 + offset, 1);

  return { month: date.getMonth() + 1, year: date.getFullYear() };
}

export function getHistoryRange(month: number, year: number) {
  const first = addMonths(year, month, -(ANALYTICS_HISTORY_MONTHS - 1));
  const next = addMonths(year, month, 1);

  return {
    startDate: toDateOnly(first.year, first.month, 1),
    endDate: toDateOnly(next.year, next.month, 1),
  };
}

export function percentChange(current: number, previous: number) {
  if (!previous) return null;

  return ((current - previous) / Math.abs(previous)) * 100;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function toAggregationEntries(rows: AnalyticsTransactionRow[]) {
  return rows
    .filter((row) => row.dependent_id === null)
    .map<ExpenseAggregationEntry>((row) => {
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
}

export function buildMonthSummaries(
  rows: AnalyticsTransactionRow[],
  month: number,
  year: number,
): MonthSummary[] {
  const entries = toAggregationEntries(rows);
  const incomeByMonth = new Map<string, number>();

  rows.forEach((row) => {
    if (row.dependent_id !== null || row.type !== "income") return;
    incomeByMonth.set(
      row.month_start,
      (incomeByMonth.get(row.month_start) ?? 0) + toAmount(row.amount),
    );
  });

  return Array.from({ length: ANALYTICS_HISTORY_MONTHS }, (_, index) => {
    const period = addMonths(
      year,
      month,
      index - (ANALYTICS_HISTORY_MONTHS - 1),
    );
    const monthStart = toDateOnly(period.year, period.month, 1);
    const expenses = aggregatePeriodExpenses(
      entries,
      period.month,
      period.year,
    );
    const income = incomeByMonth.get(monthStart) ?? 0;
    const expense = expenses.total;

    return {
      monthStart,
      label: monthLabels[period.month - 1],
      income,
      expense,
      fixed: expenses.fixed,
      card: expenses.card,
      net: income - expense,
      savingsRate: income > 0 ? ((income - expense) / income) * 100 : 0,
      entries: expenses.entries,
    };
  });
}

function getElapsedDays(monthStart: string, today: Date) {
  const { year, month } = getDateOnlyParts(monthStart);
  const daysInMonth = new Date(year, month, 0).getDate();
  const monthIndex = year * 12 + month;
  const todayIndex = today.getFullYear() * 12 + today.getMonth() + 1;

  if (monthIndex === todayIndex) return today.getDate();
  if (monthIndex < todayIndex) return daysInMonth;

  return daysInMonth;
}

export function getAverageDailyExpense(
  summary: MonthSummary,
  today = new Date(),
) {
  return summary.expense / getElapsedDays(summary.monthStart, today);
}

export function getFixedCommitment(summary: MonthSummary) {
  return summary.income > 0 ? (summary.fixed / summary.income) * 100 : 0;
}

export function buildCategoryInsights(
  current: MonthSummary,
  previous: MonthSummary,
  limit = 6,
): CategoryInsight[] {
  const totalsFor = (summary: MonthSummary) => {
    const totals = new Map<string, number>();

    summary.entries.forEach((entry) => {
      if (entry.signedAmount <= 0) return;
      const name = entry.category?.trim() || "Sem categoria";
      totals.set(name, (totals.get(name) ?? 0) + entry.signedAmount);
    });

    return totals;
  };
  const currentTotals = totalsFor(current);
  const previousTotals = totalsFor(previous);
  const total = [...currentTotals.values()].reduce(
    (sum, value) => sum + value,
    0,
  );
  const sorted = [...currentTotals.entries()].sort(
    (left, right) => right[1] - left[1],
  );
  const visible = sorted.slice(0, limit);
  const rest = sorted.slice(limit);

  if (rest.length) {
    visible.push(["Outras", rest.reduce((sum, [, value]) => sum + value, 0)]);
  }

  return visible.map(([name, amount]) => {
    const previousAmount =
      name === "Outras"
        ? rest.reduce(
            (sum, [restName]) => sum + (previousTotals.get(restName) ?? 0),
            0,
          )
        : (previousTotals.get(name) ?? 0);

    return {
      name,
      amount,
      share: total > 0 ? (amount / total) * 100 : 0,
      previousAmount,
      delta: percentChange(amount, previousAmount),
    };
  });
}

export function buildSpendingPace(
  current: MonthSummary,
  previous: MonthSummary,
  today = new Date(),
): { points: PacePoint[]; currentDay: number | null } {
  const cumulativeFor = (summary: MonthSummary) => {
    const { year, month } = getDateOnlyParts(summary.monthStart);
    const daysInMonth = new Date(year, month, 0).getDate();
    const daily = new Array<number>(daysInMonth + 1).fill(0);

    summary.entries.forEach((entry) => {
      const date = getDateOnlyParts(entry.date);
      const sameMonth = date.year === year && date.month === month;
      const isBefore = date.year * 12 + date.month < year * 12 + month;
      const day = sameMonth ? date.day : isBefore ? 1 : daysInMonth;

      daily[day] += entry.signedAmount;
    });

    let running = 0;

    return daily.slice(1).map((value) => {
      running += value;
      return running;
    });
  };
  const currentSeries = cumulativeFor(current);
  const previousSeries = cumulativeFor(previous);
  const { year, month } = getDateOnlyParts(current.monthStart);
  const monthIndex = year * 12 + month;
  const todayIndex = today.getFullYear() * 12 + today.getMonth() + 1;
  const currentDay =
    monthIndex === todayIndex
      ? today.getDate()
      : monthIndex < todayIndex
        ? currentSeries.length
        : null;
  const length = Math.max(currentSeries.length, previousSeries.length);

  return {
    currentDay,
    points: Array.from({ length }, (_, index) => ({
      day: index + 1,
      current:
        currentDay !== null &&
        index < Math.min(currentDay, currentSeries.length)
          ? currentSeries[index]
          : null,
      previous: previousSeries[index] ?? previousSeries.at(-1) ?? 0,
    })),
  };
}

export function buildWeekdayBreakdown(
  summaries: MonthSummary[],
): WeekdayPoint[] {
  const totals = new Array<number>(7).fill(0);

  summaries.forEach((summary) => {
    summary.entries.forEach((entry) => {
      if (entry.signedAmount <= 0) return;
      const { year, month, day } = getDateOnlyParts(entry.date);
      totals[new Date(year, month - 1, day).getDay()] += entry.signedAmount;
    });
  });

  const total = totals.reduce((sum, value) => sum + value, 0);
  // Monday-first reads more naturally for a work week.
  const order = [1, 2, 3, 4, 5, 6, 0];

  return order.map((index) => ({
    ...weekdays[index],
    amount: totals[index],
    share: total > 0 ? (totals[index] / total) * 100 : 0,
  }));
}

export function buildHealthScore(
  current: MonthSummary,
  recent: MonthSummary[],
): HealthScore {
  const savingsPoints = clamp((current.savingsRate / 30) * 50, 0, 50);
  const fixedCommitment = getFixedCommitment(current);
  const fixedPoints =
    current.income > 0 ? clamp(((100 - fixedCommitment) / 50) * 30, 0, 30) : 0;
  const baseline = recent.length
    ? recent.reduce((sum, summary) => sum + summary.expense, 0) / recent.length
    : 0;
  const trend = baseline > 0 ? (current.expense - baseline) / baseline : 0;
  const trendPoints =
    current.expense === 0 && baseline === 0
      ? 0
      : clamp(20 - (Math.max(trend, 0) / 0.3) * 20, 0, 20);
  const score = Math.round(savingsPoints + fixedPoints + trendPoints);
  const tone =
    score >= 80
      ? "excellent"
      : score >= 60
        ? "good"
        : score >= 40
          ? "attention"
          : "critical";
  const label =
    tone === "excellent"
      ? "Excelente"
      : tone === "good"
        ? "Saudável"
        : tone === "attention"
          ? "Atenção"
          : "Crítica";

  return {
    score,
    label,
    tone,
    components: [
      {
        label: "Poupança",
        points: Math.round(savingsPoints),
        max: 50,
        detail: `${current.savingsRate.toFixed(0)}% da renda (meta 30%)`,
      },
      {
        label: "Contas fixas",
        points: Math.round(fixedPoints),
        max: 30,
        detail: `${fixedCommitment.toFixed(0)}% da renda comprometida`,
      },
      {
        label: "Tendência",
        points: Math.round(trendPoints),
        max: 20,
        detail:
          baseline > 0
            ? `${trend >= 0 ? "+" : ""}${(trend * 100).toFixed(0)}% vs. média recente`
            : "Sem histórico suficiente",
      },
    ],
  };
}

export function buildInsights({
  current,
  previous,
  recent,
  categories,
  pace,
  weekdaysBreakdown,
  formatCurrency,
}: {
  current: MonthSummary;
  previous: MonthSummary;
  recent: MonthSummary[];
  categories: CategoryInsight[];
  pace: ReturnType<typeof buildSpendingPace>;
  weekdaysBreakdown: WeekdayPoint[];
  formatCurrency: (value: number) => string;
}): AnalyticsInsight[] {
  const insights: AnalyticsInsight[] = [];
  const averageSavings = recent.length
    ? recent.reduce((sum, summary) => sum + summary.savingsRate, 0) /
      recent.length
    : 0;

  if (current.income > 0) {
    const diff = current.savingsRate - averageSavings;

    insights.push({
      id: "savings",
      tone:
        current.savingsRate >= 20
          ? "positive"
          : current.savingsRate < 0
            ? "negative"
            : "neutral",
      title: `Você guarda ${current.savingsRate.toFixed(0)}% da renda`,
      description: recent.length
        ? `${Math.abs(diff).toFixed(0)} p.p. ${diff >= 0 ? "acima" : "abaixo"} da sua média dos últimos meses (${averageSavings.toFixed(0)}%).`
        : "Continue registrando para comparar com os próximos meses.",
    });
  }

  const expenseDelta = percentChange(current.expense, previous.expense);

  if (expenseDelta !== null) {
    insights.push({
      id: "expense-delta",
      tone:
        expenseDelta > 5
          ? "negative"
          : expenseDelta < -5
            ? "positive"
            : "neutral",
      title: `Gastos ${expenseDelta >= 0 ? "subiram" : "caíram"} ${Math.abs(expenseDelta).toFixed(0)}%`,
      description: `De ${formatCurrency(previous.expense)} no mês anterior para ${formatCurrency(current.expense)} agora.`,
    });
  }

  const topCategory = categories.find((category) => category.name !== "Outras");

  if (topCategory) {
    insights.push({
      id: "top-category",
      tone: topCategory.share > 40 ? "negative" : "neutral",
      title: `${topCategory.name} lidera com ${topCategory.share.toFixed(0)}%`,
      description: `${formatCurrency(topCategory.amount)} dos seus gastos do mês ficaram nessa categoria.`,
    });
  }

  const biggestRise = categories
    .filter(
      (category) => category.delta !== null && category.previousAmount > 0,
    )
    .sort((left, right) => (right.delta ?? 0) - (left.delta ?? 0))[0];

  if (
    biggestRise &&
    (biggestRise.delta ?? 0) > 15 &&
    biggestRise.name !== topCategory?.name
  ) {
    insights.push({
      id: "category-rise",
      tone: "negative",
      title: `${biggestRise.name} cresceu ${biggestRise.delta?.toFixed(0)}%`,
      description: `Foi a categoria que mais aumentou em relação ao mês anterior.`,
    });
  }

  if (pace.currentDay !== null) {
    const point = pace.points[pace.currentDay - 1];
    const now = point?.current ?? 0;
    const before = point?.previous ?? 0;
    const paceDelta = percentChange(now, before);

    if (paceDelta !== null && pace.currentDay < pace.points.length) {
      insights.push({
        id: "pace",
        tone:
          paceDelta > 10
            ? "negative"
            : paceDelta < -10
              ? "positive"
              : "neutral",
        title: `Ritmo ${paceDelta >= 0 ? "acima" : "abaixo"} do mês passado`,
        description: `Até o dia ${pace.currentDay} você gastou ${formatCurrency(now)}, ${Math.abs(paceDelta).toFixed(0)}% ${paceDelta >= 0 ? "a mais" : "a menos"} que no mesmo ponto.`,
      });
    }
  }

  const busiestDay = [...weekdaysBreakdown].sort(
    (left, right) => right.amount - left.amount,
  )[0];

  if (busiestDay && busiestDay.amount > 0) {
    insights.push({
      id: "weekday",
      tone: "neutral",
      title: `${busiestDay.weekday} é seu dia mais caro`,
      description: `Concentra ${busiestDay.share.toFixed(0)}% dos gastos do período analisado.`,
    });
  }

  const fixedCommitment = getFixedCommitment(current);

  if (current.income > 0 && fixedCommitment >= 50) {
    insights.push({
      id: "fixed",
      tone: "negative",
      title: `Contas fixas usam ${fixedCommitment.toFixed(0)}% da renda`,
      description: "Acima de 50% sobra pouca margem para imprevistos e metas.",
    });
  }

  return insights.slice(0, 5);
}
