"use client";

import { useChartTones } from "@/hooks/useChartTones";
import { useId } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface BalanceTimelinePoint {
  day: number;
  actual: number | null;
  projected: number | null;
}

interface BalanceTimelineChartProps {
  points: BalanceTimelinePoint[];
  todayDay: number | null;
  monthShortLabel: string;
  formatValue: (value: number) => string;
}

const lineColor = "#34d399";

export function BalanceTimelineChart({
  points,
  todayDay,
  monthShortLabel,
  formatValue,
}: BalanceTimelineChartProps) {
  const tones = useChartTones();
  const gradientId = useId().replace(/:/g, "");
  const lastDay = points.length;
  const ticks = [1, 8, 15, 22, lastDay].filter(
    (tick, index, list) => tick <= lastDay && list.indexOf(tick) === index,
  );
  const values = points.flatMap((point) =>
    [point.actual, point.projected].filter(
      (value): value is number => value !== null,
    ),
  );
  const hasNegative = values.some((value) => value < 0);
  const todayPoint = todayDay
    ? points.find((point) => point.day === todayDay)
    : undefined;
  const todayValue = todayPoint?.actual ?? todayPoint?.projected ?? null;

  return (
    <ResponsiveContainer
      width="100%"
      height="100%"
      minWidth={1}
      minHeight={1}
      initialDimension={{ width: 600, height: 220 }}
    >
      <AreaChart
        data={points}
        margin={{ top: 24, right: 8, bottom: 0, left: 8 }}
      >
        <defs>
          <linearGradient
            id={`${gradientId}-actual`}
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop offset="0%" stopColor={lineColor} stopOpacity={0.28} />
            <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
          </linearGradient>
          <linearGradient
            id={`${gradientId}-projected`}
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop offset="0%" stopColor={lineColor} stopOpacity={0.1} />
            <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid
          vertical={false}
          stroke={tones.grid}
          strokeDasharray="0"
        />
        <XAxis
          dataKey="day"
          type="number"
          domain={[1, lastDay]}
          ticks={ticks}
          tickFormatter={(day: number) => `${day} ${monthShortLabel}`}
          tick={{ fill: tones.tick, fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          tickMargin={10}
        />
        <YAxis hide domain={["dataMin", "dataMax"]} />
        {hasNegative && (
          <ReferenceLine
            y={0}
            stroke="rgba(251,113,133,0.4)"
            strokeDasharray="3 4"
          />
        )}
        {todayDay && (
          <ReferenceLine
            x={todayDay}
            stroke={tones.referenceStrong}
            strokeDasharray="3 4"
            label={{
              value: "Hoje",
              position: "top",
              fill: tones.tickStrong,
              fontSize: 11,
            }}
          />
        )}
        <Tooltip
          cursor={{ stroke: tones.cursor, strokeWidth: 1 }}
          content={({ active, payload }) => {
            const point = payload?.[0]?.payload as
              BalanceTimelinePoint | undefined;
            if (!active || !point) return null;

            const value = point.actual ?? point.projected ?? 0;
            const isProjection = point.actual === null;

            return (
              <div className="rounded-lg border border-white/10 bg-zinc-950/95 px-3 py-2 shadow-xl">
                <p className="text-sm font-semibold tabular-nums text-zinc-50">
                  {formatValue(value)}
                </p>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-zinc-400">
                  <span
                    className="h-0.5 w-3 rounded-full"
                    style={{
                      backgroundColor: lineColor,
                      opacity: isProjection ? 0.55 : 1,
                    }}
                  />
                  {point.day} {monthShortLabel} ·{" "}
                  {isProjection ? "previsto" : "realizado"}
                </p>
              </div>
            );
          }}
        />
        <Area
          type="stepAfter"
          dataKey="projected"
          stroke={lineColor}
          strokeOpacity={0.55}
          strokeWidth={2}
          strokeDasharray="5 5"
          fill={`url(#${gradientId}-projected)`}
          connectNulls={false}
          dot={false}
          activeDot={{
            r: 4,
            fill: lineColor,
            stroke: tones.panel,
            strokeWidth: 2,
          }}
          animationDuration={900}
        />
        <Area
          type="stepAfter"
          dataKey="actual"
          stroke={lineColor}
          strokeWidth={2}
          fill={`url(#${gradientId}-actual)`}
          connectNulls={false}
          dot={false}
          activeDot={{
            r: 4,
            fill: lineColor,
            stroke: tones.panel,
            strokeWidth: 2,
          }}
          animationDuration={900}
        />
        {todayDay && todayValue !== null && (
          <ReferenceDot
            x={todayDay}
            y={todayValue}
            r={5}
            fill={lineColor}
            stroke={tones.panel}
            strokeWidth={3}
          />
        )}
      </AreaChart>
    </ResponsiveContainer>
  );
}
