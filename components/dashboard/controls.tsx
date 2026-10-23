"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { Search, X, type LucideIcon } from "lucide-react";

import { dashboardEase, usePrivateCurrency } from "@/components/dashboard/shared";
import { AnimatedNumber } from "@/components/finance/AnimatedNumber";
import { cn } from "@/lib/utils";

/* Shared building blocks of the dashboard pages: filter pills, segmented
   switches, search, progress rings and summary tiles. One look everywhere,
   one place to change it. */

const chipTones = {
  emerald: "border-emerald-400/40 bg-emerald-400/10 text-emerald-200",
  violet: "border-violet-400/40 bg-violet-400/10 text-violet-200",
} as const;

export function FilterChip({
  active,
  onClick,
  count,
  disabled,
  tone = "emerald",
  attention = false,
  children,
}: {
  active: boolean;
  onClick: () => void;
  count?: number | string;
  disabled?: boolean;
  tone?: keyof typeof chipTones;
  /* Draws the eye to a filter that needs action, like rows to review. */
  attention?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      disabled={disabled}
      className={cn(
        "shrink-0 rounded-full border px-3 py-1 text-xs transition-colors disabled:opacity-40",
        active
          ? chipTones[tone]
          : attention
            ? "border-amber-400/30 text-amber-200 hover:bg-amber-400/10"
            : "border-white/[0.08] text-zinc-400 hover:text-zinc-100 disabled:hover:text-zinc-400",
      )}
    >
      {children}
      {count !== undefined && <span className="ml-1.5 tabular-nums text-zinc-500">{count}</span>}
    </button>
  );
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  size = "sm",
  className,
  itemClassName,
}: {
  options: ReadonlyArray<{ id: T; label: ReactNode }>;
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  size?: "sm" | "md";
  className?: string;
  itemClassName?: string;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn("flex rounded-lg border border-white/[0.07] bg-zinc-900/50 p-0.5", className)}
    >
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange(option.id)}
          aria-pressed={value === option.id}
          className={cn(
            "rounded-md transition-colors",
            size === "md" ? "px-3 py-1.5 text-sm" : "px-2.5 py-1 text-xs",
            value === option.id
              ? "bg-white/[0.08] text-zinc-100"
              : "text-zinc-500 hover:text-zinc-200",
            itemClassName,
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function SearchField({
  value,
  onChange,
  placeholder,
  ariaLabel = placeholder,
  className,
  inputClassName,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  ariaLabel?: string;
  className?: string;
  inputClassName?: string;
}) {
  return (
    <label className={cn("relative flex items-center", className)}>
      <Search className="pointer-events-none absolute left-3 size-4 text-zinc-500" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className={cn(
          "h-9 w-full rounded-lg border border-white/[0.07] bg-zinc-900/50 pr-8 pl-9 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-emerald-400/40 [&::-webkit-search-cancel-button]:hidden",
          inputClassName,
        )}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Limpar busca"
          className="absolute right-2 rounded p-0.5 text-zinc-500 hover:text-zinc-200"
        >
          <X className="size-3.5" />
        </button>
      )}
    </label>
  );
}

const RING_RADIUS = 52;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

/* Circular progress (0–100) with the content in the middle. `marker` puts
   a tick at a fraction of the circle, e.g. how far into the month we are. */
export function ProgressRing({
  progress,
  stroke,
  marker = null,
  className = "size-32",
  children,
}: {
  progress: number;
  stroke: string;
  marker?: number | null;
  className?: string;
  children: ReactNode;
}) {
  const markerAngle = marker === null ? null : marker * 2 * Math.PI - Math.PI / 2;

  return (
    <div className={cn("relative shrink-0", className)}>
      <svg viewBox="0 0 128 128" className="size-full -rotate-90">
        <circle cx="64" cy="64" r={RING_RADIUS} fill="none" className="stroke-zinc-800" strokeWidth="10" />
        <motion.circle
          cx="64"
          cy="64"
          r={RING_RADIUS}
          fill="none"
          stroke={stroke}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={RING_CIRCUMFERENCE}
          initial={{ strokeDashoffset: RING_CIRCUMFERENCE }}
          animate={{
            strokeDashoffset: RING_CIRCUMFERENCE * (1 - Math.min(Math.max(progress, 0), 100) / 100),
          }}
          transition={{ duration: 1, ease: dashboardEase }}
        />
      </svg>
      {markerAngle !== null && (
        <span
          aria-hidden
          className="absolute h-3.5 w-0.5 rounded-full bg-zinc-100"
          style={{
            left: `calc(50% + ${Math.cos(markerAngle) * 40.6}% - 1px)`,
            top: `calc(50% + ${Math.sin(markerAngle) * 40.6}% - 7px)`,
            transform: `rotate(${markerAngle + Math.PI / 2}rad)`,
          }}
        />
      )}
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

/* One cell of the summary strip at the top of most pages. */
export function StatTile({
  icon: Icon,
  label,
  value,
  valueClassName = "text-zinc-50",
  progress,
  children,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  valueClassName?: string;
  /* 0–100 bar under the value; omit to hide it. */
  progress?: number | null;
  children?: ReactNode;
}) {
  const formatValue = usePrivateCurrency();

  return (
    <div className="flex min-w-0 items-start gap-3 p-4 sm:p-5">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.04] text-zinc-400 ring-1 ring-inset ring-white/[0.06]">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs text-zinc-500">{label}</p>
        <AnimatedNumber
          value={value}
          format={formatValue}
          className={cn("mt-0.5 block truncate text-xl font-semibold tabular-nums", valueClassName)}
        />
        {progress !== undefined && progress !== null && (
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-zinc-800">
            <motion.div
              className="h-full rounded-full bg-emerald-400"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
              transition={{ duration: 0.8, ease: dashboardEase }}
            />
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

/* Short hint line under a StatTile value. */
export function StatHint({ className, children }: { className?: string; children: ReactNode }) {
  return <p className={cn("mt-1.5 truncate text-xs text-zinc-500", className)}>{children}</p>;
}
