"use client";

import { useId, type ReactNode } from "react";
import { motion } from "framer-motion";
import {
  ArrowDownRight,
  ArrowUpRight,
  Minus,
  type LucideIcon,
} from "lucide-react";

import type { HealthScore } from "@/components/analytics/analyticsData";
import {
  dashboardEase,
  dashboardPanelClassName,
  dashboardReveal,
} from "@/components/dashboard/shared";
import { AnimatedNumber } from "@/components/finance/AnimatedNumber";
import { cn } from "@/lib/utils";

/** Validated against the dark panel surface (lightness band, CVD, contrast). */
export const analyticsColors = {
  income: "#059669",
  expense: "#ea580c",
  primary: "#3b82f6",
  muted: "#52525b",
  grid: "rgba(255,255,255,0.05)",
  axis: "#71717a",
} as const;

export function AnalyticsPanel({
  title,
  description,
  action,
  className,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <motion.section
      variants={dashboardReveal}
      className={cn(
        dashboardPanelClassName,
        "flex min-w-0 flex-col p-5 sm:p-6",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-zinc-100">{title}</h2>
          {description && (
            <p className="mt-0.5 text-xs text-zinc-500">{description}</p>
          )}
        </div>
        {action}
      </div>
      <div className="mt-5 flex min-h-0 flex-1 flex-col">{children}</div>
    </motion.section>
  );
}

export function ChartLegend({
  items,
}: {
  items: Array<{
    label: string;
    color: string;
    dashed?: boolean;
    shape?: "line" | "box";
  }>;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-zinc-400">
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-1.5">
          {item.shape === "box" ? (
            <span
              className="size-2.5 rounded-[3px]"
              style={{ backgroundColor: item.color }}
            />
          ) : (
            <span
              className={cn("w-4 border-t-2", item.dashed && "border-dashed")}
              style={{ borderColor: item.color }}
            />
          )}
          {item.label}
        </span>
      ))}
    </div>
  );
}

export function ChartTooltipCard({
  title,
  rows,
}: {
  title: string;
  rows: Array<{
    label: string;
    value: string;
    color?: string;
    dashed?: boolean;
  }>;
}) {
  return (
    <div className="min-w-40 rounded-lg border border-white/10 bg-zinc-950/95 px-3 py-2.5 shadow-xl">
      <p className="text-[11px] font-medium text-zinc-500">{title}</p>
      <div className="mt-1.5 space-y-1">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between gap-4"
          >
            <span className="flex items-center gap-1.5 text-xs text-zinc-400">
              {row.color && (
                <span
                  className={cn(
                    "w-3 border-t-2",
                    row.dashed && "border-dashed",
                  )}
                  style={{ borderColor: row.color }}
                />
              )}
              {row.label}
            </span>
            <span className="text-sm font-semibold tabular-nums text-zinc-50">
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DeltaBadge({
  delta,
  goodWhen,
  suffix = "%",
}: {
  delta: number | null;
  goodWhen: "up" | "down";
  suffix?: string;
}) {
  if (delta === null || !Number.isFinite(delta)) {
    return <span className="text-[11px] text-zinc-600">sem base anterior</span>;
  }

  const isFlat = Math.abs(delta) < 0.5;
  const isUp = delta > 0;
  const isGood = isFlat ? null : goodWhen === "up" ? isUp : !isUp;
  const Icon = isFlat ? Minus : isUp ? ArrowUpRight : ArrowDownRight;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap rounded-full px-1.5 py-0.5 text-[11px] font-medium tabular-nums",
        isGood === null && "bg-zinc-800 text-zinc-400",
        isGood === true && "bg-emerald-500/10 text-emerald-300",
        isGood === false && "bg-rose-500/10 text-rose-300",
      )}
    >
      <Icon className="size-3" />
      {Math.abs(delta).toFixed(Math.abs(delta) < 10 ? 1 : 0)}
      {suffix}
    </span>
  );
}

function Sparkline({ values, color }: { values: number[]; color: string }) {
  const gradientId = useId().replace(/:/g, "");
  const width = 120;
  const height = 36;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const spread = max - min || 1;
  const points = values.map((value, index) => [
    values.length > 1 ? (index / (values.length - 1)) * width : width / 2,
    height - 3 - ((value - min) / spread) * (height - 6),
  ]);
  const line = points
    .map(([x, y], index) => `${index ? "L" : "M"}${x},${y}`)
    .join(" ");
  const area = `${line} L${width},${height} L0,${height} Z`;
  const last = points.at(-1);

  return (
    <div className="relative h-9 w-full" aria-hidden="true">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="size-full overflow-visible"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.25} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
          <clipPath id={`${gradientId}-reveal`}>
            <motion.rect
              x={0}
              y={-4}
              height={height + 8}
              initial={{ width: 0 }}
              animate={{ width: width + 4 }}
              transition={{ duration: 0.9, ease: dashboardEase }}
            />
          </clipPath>
        </defs>
        <g clipPath={`url(#${gradientId}-reveal)`}>
          <path d={area} fill={`url(#${gradientId})`} />
          <path
            d={line}
            fill="none"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </g>
      </svg>
      {last && (
        <motion.span
          className="absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-zinc-900"
          style={{
            left: `${(last[0] / width) * 100}%`,
            top: `${(last[1] / height) * 100}%`,
            backgroundColor: color,
          }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.8, duration: 0.25 }}
        />
      )}
    </div>
  );
}

export function KpiCard({
  label,
  value,
  format,
  icon: Icon,
  delta,
  deltaSuffix,
  goodWhen,
  trend,
  trendColor,
  caption,
  valueClassName,
}: {
  label: string;
  value: number;
  format: (value: number) => string;
  icon: LucideIcon;
  delta: number | null;
  deltaSuffix?: string;
  goodWhen: "up" | "down";
  trend: number[];
  trendColor: string;
  caption: string;
  valueClassName?: string;
}) {
  return (
    <motion.div
      variants={dashboardReveal}
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className={cn(
        dashboardPanelClassName,
        "flex min-w-0 flex-col gap-2.5 p-3.5 transition-colors hover:border-white/[0.12] sm:gap-3 sm:p-5",
      )}
    >
      <span className="flex min-w-0 items-center gap-2 text-xs font-medium text-zinc-400">
        <Icon className="size-3.5 shrink-0 text-zinc-500" />
        <span className="truncate">{label}</span>
      </span>
      <AnimatedNumber
        value={value}
        format={format}
        className={cn(
          "block truncate text-xl font-semibold tracking-tight tabular-nums text-zinc-50 sm:text-2xl",
          valueClassName,
        )}
      />
      <div className="mt-auto">
        <Sparkline values={trend} color={trendColor} />
        <div className="mt-2 flex items-center justify-between gap-2">
          <p className="min-w-0 truncate text-[11px] text-zinc-600">
            {caption}
          </p>
          <DeltaBadge delta={delta} goodWhen={goodWhen} suffix={deltaSuffix} />
        </div>
      </div>
    </motion.div>
  );
}

const healthToneStyles: Record<
  HealthScore["tone"],
  { color: string; text: string }
> = {
  excellent: { color: "#059669", text: "text-emerald-300" },
  good: { color: "#3b82f6", text: "text-sky-300" },
  attention: { color: "#c98500", text: "text-amber-300" },
  critical: { color: "#d03b3b", text: "text-rose-300" },
};

export function HealthScoreCard({
  health,
  hasData,
}: {
  health: HealthScore;
  hasData: boolean;
}) {
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const arc = circumference * 0.75;
  const style = healthToneStyles[health.tone];
  const progress = hasData ? health.score / 100 : 0;

  return (
    <motion.section
      variants={dashboardReveal}
      aria-labelledby="analytics-health-title"
      className={cn(
        dashboardPanelClassName,
        "relative flex flex-col overflow-hidden p-5 sm:p-6",
      )}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-40 opacity-60"
        style={{
          background: `radial-gradient(60% 100% at 50% 0%, ${style.color}22, transparent)`,
        }}
      />
      <div className="relative flex items-center justify-between gap-3">
        <h2
          id="analytics-health-title"
          className="text-base font-semibold text-zinc-100"
        >
          Saúde financeira
        </h2>
        <span
          className={cn(
            "rounded-full bg-white/[0.05] px-2 py-0.5 text-xs font-medium",
            style.text,
          )}
        >
          {hasData ? health.label : "Sem dados"}
        </span>
      </div>

      <div className="relative mx-auto mt-4 size-44">
        <svg
          viewBox="0 0 160 160"
          className="size-full -rotate-[225deg]"
          aria-hidden="true"
        >
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            className="stroke-white/[0.06]"
            strokeWidth={12}
            strokeLinecap="round"
            strokeDasharray={`${arc} ${circumference}`}
          />
          <motion.circle
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke={style.color}
            strokeWidth={12}
            strokeLinecap="round"
            strokeDasharray={`${arc} ${circumference}`}
            initial={{ strokeDashoffset: arc }}
            animate={{ strokeDashoffset: arc * (1 - progress) }}
            transition={{ duration: 1.2, ease: dashboardEase, delay: 0.2 }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <AnimatedNumber
            value={hasData ? health.score : 0}
            format={(value) => Math.round(value).toString()}
            className="text-5xl font-semibold tracking-tight tabular-nums text-zinc-50"
          />
          <span className="mt-0.5 text-xs text-zinc-500">de 100</span>
        </div>
      </div>

      <dl className="relative mt-2 space-y-3">
        {health.components.map((component, index) => (
          <div key={component.label}>
            <div className="flex items-baseline justify-between gap-3 text-xs">
              <dt className="font-medium text-zinc-300">{component.label}</dt>
              <dd className="tabular-nums text-zinc-500">
                <span className="font-semibold text-zinc-200">
                  {component.points}
                </span>
                /{component.max}
              </dd>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-zinc-800/80">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: style.color }}
                initial={{ width: 0 }}
                animate={{
                  width: `${(component.points / component.max) * 100}%`,
                }}
                transition={{
                  duration: 0.8,
                  ease: dashboardEase,
                  delay: 0.4 + index * 0.1,
                }}
              />
            </div>
            <p className="mt-1 text-[11px] text-zinc-600">{component.detail}</p>
          </div>
        ))}
      </dl>
    </motion.section>
  );
}
