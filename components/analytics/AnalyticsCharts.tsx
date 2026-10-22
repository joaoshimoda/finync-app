"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  ChartTooltipCard,
  analyticsColors,
} from "@/components/analytics/AnalyticsPrimitives";
import { cn } from "@/lib/utils";
import type {
  MonthSummary,
  PacePoint,
  WeekdayPoint,
} from "@/components/analytics/analyticsData";

type Formatter = (value: number) => string;

const axisTick = { fill: analyticsColors.axis, fontSize: 11 };

function Frame({
  children,
  height = "h-72",
}: {
  children: React.ReactElement;
  height?: string;
}) {
  return (
    <div className={cn("min-h-0", height)}>
      <ResponsiveContainer
        width="100%"
        height="100%"
        minWidth={1}
        minHeight={1}
        initialDimension={{ width: 600, height: 280 }}
      >
        {children}
      </ResponsiveContainer>
    </div>
  );
}

export function CashFlowChart({
  months,
  formatValue,
  formatCompact,
}: {
  months: MonthSummary[];
  formatValue: Formatter;
  formatCompact: Formatter;
}) {
  return (
    <Frame height="h-64 sm:h-72 lg:h-auto lg:min-h-72 lg:flex-1">
      <ComposedChart
        data={months}
        margin={{ top: 8, right: 4, bottom: 0, left: 0 }}
        barGap={2}
      >
        <CartesianGrid vertical={false} stroke={analyticsColors.grid} />
        <XAxis
          dataKey="label"
          tick={axisTick}
          tickLine={false}
          axisLine={false}
          tickMargin={10}
        />
        <YAxis
          tick={axisTick}
          tickLine={false}
          axisLine={false}
          width={64}
          tickFormatter={(value: number) => formatCompact(value)}
        />
        <ReferenceLine y={0} stroke="rgba(255,255,255,0.12)" />
        <Tooltip
          cursor={{ fill: "rgba(255,255,255,0.03)" }}
          content={({ active, payload }) => {
            const month = payload?.[0]?.payload as MonthSummary | undefined;
            if (!active || !month) return null;

            return (
              <ChartTooltipCard
                title={month.label}
                rows={[
                  {
                    label: "Receitas",
                    value: formatValue(month.income),
                    color: analyticsColors.income,
                  },
                  {
                    label: "Despesas",
                    value: formatValue(month.expense),
                    color: analyticsColors.expense,
                  },
                  {
                    label: "Balanço",
                    value: formatValue(month.net),
                    color: analyticsColors.primary,
                  },
                ]}
              />
            );
          }}
        />
        <Bar
          dataKey="income"
          name="Receitas"
          fill={analyticsColors.income}
          radius={[4, 4, 0, 0]}
          maxBarSize={28}
          animationDuration={800}
        />
        <Bar
          dataKey="expense"
          name="Despesas"
          fill={analyticsColors.expense}
          radius={[4, 4, 0, 0]}
          maxBarSize={28}
          animationDuration={800}
        />
        <Line
          type="monotone"
          dataKey="net"
          name="Balanço"
          stroke={analyticsColors.primary}
          strokeWidth={2}
          dot={{
            r: 3,
            fill: analyticsColors.primary,
            stroke: "#18181b",
            strokeWidth: 2,
          }}
          activeDot={{ r: 5, stroke: "#18181b", strokeWidth: 2 }}
          animationDuration={1000}
        />
      </ComposedChart>
    </Frame>
  );
}

export function SpendingPaceChart({
  points,
  currentDay,
  formatValue,
  formatCompact,
}: {
  points: PacePoint[];
  currentDay: number | null;
  formatValue: Formatter;
  formatCompact: Formatter;
}) {
  const lastDay = points.length;
  const ticks = [1, 8, 15, 22, lastDay].filter(
    (tick, index, list) => tick <= lastDay && list.indexOf(tick) === index,
  );

  return (
    <Frame height="h-60 sm:h-72 lg:h-80">
      <LineChart
        data={points}
        margin={{ top: 16, right: 8, bottom: 0, left: 0 }}
      >
        <CartesianGrid vertical={false} stroke={analyticsColors.grid} />
        <XAxis
          dataKey="day"
          type="number"
          domain={[1, lastDay]}
          ticks={ticks}
          tick={axisTick}
          tickLine={false}
          axisLine={false}
          tickMargin={10}
          tickFormatter={(day: number) => `Dia ${day}`}
        />
        <YAxis
          tick={axisTick}
          tickLine={false}
          axisLine={false}
          width={64}
          tickFormatter={(value: number) => formatCompact(value)}
        />
        {currentDay !== null && currentDay < lastDay && (
          <ReferenceLine
            x={currentDay}
            stroke="rgba(255,255,255,0.16)"
            strokeDasharray="3 4"
            label={{
              value: "Hoje",
              position: "top",
              fill: "#a1a1aa",
              fontSize: 11,
            }}
          />
        )}
        <Tooltip
          cursor={{ stroke: "rgba(255,255,255,0.18)" }}
          content={({ active, payload }) => {
            const point = payload?.[0]?.payload as PacePoint | undefined;
            if (!active || !point) return null;

            return (
              <ChartTooltipCard
                title={`Até o dia ${point.day}`}
                rows={[
                  ...(point.current !== null
                    ? [
                        {
                          label: "Este mês",
                          value: formatValue(point.current),
                          color: analyticsColors.primary,
                        },
                      ]
                    : []),
                  {
                    label: "Mês anterior",
                    value: formatValue(point.previous ?? 0),
                    color: analyticsColors.muted,
                    dashed: true,
                  },
                ]}
              />
            );
          }}
        />
        <Line
          type="monotone"
          dataKey="previous"
          stroke="#71717a"
          strokeWidth={2}
          strokeDasharray="5 5"
          dot={false}
          activeDot={{ r: 4, stroke: "#18181b", strokeWidth: 2 }}
          animationDuration={900}
        />
        <Line
          type="monotone"
          dataKey="current"
          stroke={analyticsColors.primary}
          strokeWidth={2.5}
          dot={false}
          connectNulls={false}
          activeDot={{ r: 5, stroke: "#18181b", strokeWidth: 2 }}
          animationDuration={1100}
        />
      </LineChart>
    </Frame>
  );
}

export function CompositionChart({
  months,
  formatValue,
  formatCompact,
}: {
  months: MonthSummary[];
  formatValue: Formatter;
  formatCompact: Formatter;
}) {
  return (
    <Frame height="h-60">
      <BarChart data={months} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
        <CartesianGrid vertical={false} stroke={analyticsColors.grid} />
        <XAxis
          dataKey="label"
          tick={axisTick}
          tickLine={false}
          axisLine={false}
          tickMargin={10}
        />
        <YAxis
          tick={axisTick}
          tickLine={false}
          axisLine={false}
          width={60}
          tickFormatter={(value: number) => formatCompact(value)}
        />
        <Tooltip
          cursor={{ fill: "rgba(255,255,255,0.03)" }}
          content={({ active, payload }) => {
            const month = payload?.[0]?.payload as MonthSummary | undefined;
            if (!active || !month) return null;

            return (
              <ChartTooltipCard
                title={month.label}
                rows={[
                  {
                    label: "Contas fixas",
                    value: formatValue(month.fixed),
                    color: analyticsColors.primary,
                  },
                  {
                    label: "Cartão",
                    value: formatValue(month.card),
                    color: analyticsColors.expense,
                  },
                ]}
              />
            );
          }}
        />
        <Bar
          dataKey="fixed"
          stackId="composition"
          fill={analyticsColors.primary}
          maxBarSize={30}
          stroke="#18181b"
          strokeWidth={2}
          animationDuration={800}
        />
        <Bar
          dataKey="card"
          stackId="composition"
          fill={analyticsColors.expense}
          radius={[4, 4, 0, 0]}
          maxBarSize={30}
          stroke="#18181b"
          strokeWidth={2}
          animationDuration={800}
        />
      </BarChart>
    </Frame>
  );
}

export function WeekdayChart({
  points,
  formatValue,
}: {
  points: WeekdayPoint[];
  formatValue: Formatter;
}) {
  const maxAmount = Math.max(...points.map((point) => point.amount), 0);

  return (
    <Frame height="h-60">
      <BarChart data={points} margin={{ top: 8, right: 4, bottom: 0, left: 4 }}>
        <XAxis
          dataKey="shortLabel"
          tick={axisTick}
          tickLine={false}
          axisLine={false}
          tickMargin={10}
        />
        <YAxis hide />
        <Tooltip
          cursor={{ fill: "rgba(255,255,255,0.03)" }}
          content={({ active, payload }) => {
            const point = payload?.[0]?.payload as WeekdayPoint | undefined;
            if (!active || !point) return null;

            return (
              <ChartTooltipCard
                title={point.weekday}
                rows={[
                  { label: "Gasto", value: formatValue(point.amount) },
                  { label: "Do período", value: `${point.share.toFixed(0)}%` },
                ]}
              />
            );
          }}
        />
        <Bar
          dataKey="amount"
          radius={[4, 4, 0, 0]}
          maxBarSize={34}
          animationDuration={800}
        >
          {points.map((point) => (
            <Cell
              key={point.weekday}
              fill={analyticsColors.primary}
              fillOpacity={
                point.amount === maxAmount && maxAmount > 0 ? 1 : 0.4
              }
            />
          ))}
        </Bar>
      </BarChart>
    </Frame>
  );
}
