"use client";

import {
  AnimatePresence,
  motion,
  useInView,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";
import { useEffect, useId, useRef, useState, type PointerEvent } from "react";

import { cn } from "@/lib/utils";

export const ease = [0.22, 1, 0.36, 1] as const;

export const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const compactBrl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 1,
});

/* Counts up to `value` the first time it scrolls into view, then springs to
   any later value. Screen readers get the final number only. */
export function CountUp({
  value,
  format = (current) => brl.format(current),
  className,
}: {
  value: number;
  format?: (value: number) => string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduceMotion = useReducedMotion();
  const spring = useSpring(0, { stiffness: 70, damping: 20 });
  const text = useTransform(spring, (current) => format(current));

  useEffect(() => {
    if (!inView) return;
    if (reduceMotion) spring.jump(value);
    else spring.set(value);
  }, [inView, reduceMotion, spring, value]);

  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      <motion.span aria-hidden>{text}</motion.span>
      <span className="sr-only">{format(value)}</span>
    </span>
  );
}

type Point = { x: number; y: number };

// Monotone cubic interpolation (Fritsch–Carlson): smooth, never overshoots,
// so a balance curve can't dip below a value it never reached.
function monotonePath(points: Point[]) {
  const n = points.length;
  if (n < 2) return "";
  const dx: number[] = [];
  const slope: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx.push(points[i + 1].x - points[i].x);
    slope.push((points[i + 1].y - points[i].y) / dx[i]);
  }
  const tangent = [slope[0]];
  for (let i = 1; i < n - 1; i++) {
    tangent.push(slope[i - 1] * slope[i] <= 0 ? 0 : (slope[i - 1] + slope[i]) / 2);
  }
  tangent.push(slope[n - 2]);
  for (let i = 0; i < n - 1; i++) {
    if (slope[i] === 0) {
      tangent[i] = 0;
      tangent[i + 1] = 0;
      continue;
    }
    const a = tangent[i] / slope[i];
    const b = tangent[i + 1] / slope[i];
    const h = a * a + b * b;
    if (h > 9) {
      const t = 3 / Math.sqrt(h);
      tangent[i] = t * a * slope[i];
      tangent[i + 1] = t * b * slope[i];
    }
  }
  let d = `M${points[0].x},${points[0].y}`;
  for (let i = 0; i < n - 1; i++) {
    const third = dx[i] / 3;
    d += ` C${points[i].x + third},${points[i].y + third * tangent[i]} ${points[i + 1].x - third},${points[i + 1].y - third * tangent[i + 1]} ${points[i + 1].x},${points[i + 1].y}`;
  }
  return d;
}

export const balanceSeries = [
  { day: 1, value: 1250 },
  { day: 3, value: 1080.4 },
  { day: 5, value: 7650.4, note: "Salário" },
  { day: 7, value: 7318.9 },
  { day: 10, value: 5182.3, note: "Fatura paga" },
  { day: 12, value: 4961.2 },
  { day: 15, value: 4709.8 },
  { day: 17, value: 4388.5 },
  { day: 20, value: 4176.1 },
  { day: 22, value: 3989.7 },
  { day: 25, value: 3871.3 },
  { day: 27, value: 3640.2 },
  { day: 29, value: 3561.8 },
  { day: 31, value: 3482.1 },
];

const AREA_W = 600;
const AREA_H = 200;
const AREA_MAX = 8000;

export function BalanceAreaChart({ className }: { className?: string }) {
  const gradientId = useId();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const [active, setActive] = useState<number | null>(null);

  const points = balanceSeries.map((entry) => ({
    x: ((entry.day - 1) / 30) * AREA_W,
    y: AREA_H - (entry.value / AREA_MAX) * AREA_H,
  }));
  const line = monotonePath(points);
  const area = `${line} L${AREA_W},${AREA_H} L0,${AREA_H} Z`;

  function handlePointer(event: PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / rect.width;
    const day = 1 + ratio * 30;
    let nearest = 0;
    balanceSeries.forEach((entry, index) => {
      if (Math.abs(entry.day - day) < Math.abs(balanceSeries[nearest].day - day)) {
        nearest = index;
      }
    });
    setActive(nearest);
  }

  const activeEntry = active === null ? null : balanceSeries[active];
  const activePoint = active === null ? null : points[active];

  return (
    <div ref={ref} className={cn("relative", className)}>
      <div className="pointer-events-none absolute inset-y-0 left-0 flex flex-col justify-between text-[10px] text-muted-foreground tabular-nums">
        <span>R$ 8 mil</span>
        <span>R$ 4 mil</span>
        <span className="opacity-0">0</span>
      </div>
      <div
        className="relative ml-12 h-full touch-pan-y"
        onPointerMove={handlePointer}
        onPointerDown={handlePointer}
        onPointerLeave={() => setActive(null)}
        role="img"
        aria-label="Saldo da conta em outubro: começa em R$ 1.250, sobe para R$ 7.650 com o salário no dia 5 e termina o mês em R$ 3.482,10."
      >
        <svg
          viewBox={`0 0 ${AREA_W} ${AREA_H}`}
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full overflow-visible"
        >
          <defs>
            {/* Reveal by clipping: pathLength can't be used with non-scaling strokes. */}
            <clipPath id={`${gradientId}-reveal`}>
              <motion.rect
                x="-4"
                y="-4"
                height={AREA_H + 8}
                initial={{ width: 0 }}
                animate={inView ? { width: AREA_W + 8 } : undefined}
                transition={{ duration: 1.6, ease }}
              />
            </clipPath>
            <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--viz-1)" stopOpacity="0.22" />
              <stop offset="100%" stopColor="var(--viz-1)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0, 0.5, 1].map((ratio) => (
            <line
              key={ratio}
              x1="0"
              x2={AREA_W}
              y1={AREA_H * ratio}
              y2={AREA_H * ratio}
              stroke="var(--border)"
              strokeDasharray={ratio === 1 ? undefined : "3 5"}
              vectorEffect="non-scaling-stroke"
            />
          ))}
          <path
            d={area}
            fill={`url(#${gradientId})`}
            clipPath={`url(#${gradientId}-reveal)`}
          />
          <path
            d={line}
            fill="none"
            stroke="var(--viz-1)"
            strokeWidth="2"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            clipPath={`url(#${gradientId}-reveal)`}
          />
          {activePoint ? (
            <line
              x1={activePoint.x}
              x2={activePoint.x}
              y1="0"
              y2={AREA_H}
              stroke="var(--muted-foreground)"
              strokeOpacity="0.4"
              vectorEffect="non-scaling-stroke"
            />
          ) : null}
        </svg>

        {activeEntry && activePoint ? (
          <>
            <span
              className="pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-ledger-sheet bg-viz-1"
              style={{
                left: `${(activePoint.x / AREA_W) * 100}%`,
                top: `${(activePoint.y / AREA_H) * 100}%`,
              }}
            />
            <div
              className="pointer-events-none absolute z-10 rounded-lg border border-border bg-ledger-sheet px-2.5 py-1.5 text-[11px] whitespace-nowrap shadow-lg shadow-black/5"
              style={{
                left: `${(activePoint.x / AREA_W) * 100}%`,
                top: `${(activePoint.y / AREA_H) * 100}%`,
                // Near the top the tooltip would cover the panel title, so it drops below the point.
                transform: `translate(${activePoint.x > AREA_W * 0.7 ? "-100%" : activePoint.x < AREA_W * 0.15 ? "0" : "-50%"}, ${activePoint.y < AREA_H * 0.4 ? "12px" : "calc(-100% - 12px)"})`,
              }}
            >
              <span className="block text-muted-foreground">
                {activeEntry.day} out{activeEntry.note ? ` · ${activeEntry.note}` : ""}
              </span>
              <span className="block font-semibold tabular-nums">
                {brl.format(activeEntry.value)}
              </span>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

export const categorySpend = [
  { name: "Mercado", value: 1284.6, color: "var(--viz-1)" },
  { name: "Transporte", value: 612.3, color: "var(--viz-2)" },
  { name: "Lazer", value: 457.2, color: "var(--viz-3)" },
  { name: "Assinaturas", value: 289.7, color: "var(--viz-4)" },
];

const categoryTotal = categorySpend.reduce((sum, entry) => sum + entry.value, 0);
const donutGap = 0.012;
const donutSegments = categorySpend.map((entry, index) => ({
  ...entry,
  fraction: entry.value / categoryTotal,
  start:
    categorySpend.slice(0, index).reduce((sum, item) => sum + item.value, 0) /
    categoryTotal,
}));

export function CategoryDonut({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const [active, setActive] = useState<number | null>(null);
  const segments = donutSegments;
  const total = categoryTotal;
  const focus = active === null ? null : segments[active];

  return (
    <div ref={ref} className={cn("flex items-center gap-5", className)}>
      <div className="relative size-[112px] shrink-0">
        <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden>
          <circle cx="50" cy="50" r="40" fill="none" stroke="var(--border)" strokeWidth="12" opacity="0.5" />
          {segments.map((segment, index) => (
            <motion.circle
              key={segment.name}
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke={segment.color}
              strokeWidth={active === index ? 14 : 12}
              style={{ rotate: segment.start * 360, originX: "50%", originY: "50%" }}
              initial={{ pathLength: 0 }}
              animate={inView ? { pathLength: segment.fraction - donutGap } : undefined}
              transition={{ duration: 1, delay: 0.2 + index * 0.12, ease }}
              opacity={active === null || active === index ? 1 : 0.35}
              className="cursor-pointer transition-[opacity,stroke-width]"
              onPointerEnter={() => setActive(index)}
              onPointerLeave={() => setActive(null)}
            />
          ))}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-[10px] text-muted-foreground">
            {focus ? focus.name : "Total"}
          </span>
          <span className="text-[13px] font-semibold tabular-nums">
            {compactBrl.format(focus ? focus.value : total)}
          </span>
        </div>
      </div>
      <ul className="grid min-w-0 flex-1 gap-1.5 text-[12px]">
        {segments.map((segment, index) => (
          <li
            key={segment.name}
            onPointerEnter={() => setActive(index)}
            onPointerLeave={() => setActive(null)}
            className={cn(
              "flex items-center justify-between gap-3 rounded-md px-1.5 py-0.5 transition-colors",
              active === index && "bg-secondary",
            )}
          >
            <span className="flex min-w-0 items-center gap-2">
              <span className="size-2 shrink-0 rounded-[3px]" style={{ background: segment.color }} />
              <span className="truncate">{segment.name}</span>
            </span>
            <span className="shrink-0 text-muted-foreground tabular-nums">
              {Math.round(segment.fraction * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export const upcomingInvoices = [
  { month: "nov", value: 2386.4 },
  { month: "dez", value: 1942.1 },
  { month: "jan", value: 1688.5 },
  { month: "fev", value: 1210.8 },
  { month: "mar", value: 803.6 },
  { month: "abr", value: 389.9 },
];

export function InstallmentBars({
  className,
  barClassName,
}: {
  className?: string;
  barClassName?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(...upcomingInvoices.map((entry) => entry.value));

  return (
    <div ref={ref} className={cn("flex h-full flex-col", className)}>
      <div className="relative flex min-h-0 flex-1 items-end gap-2 border-b border-border">
        {upcomingInvoices.map((entry, index) => (
          <div
            key={entry.month}
            className="relative flex h-full flex-1 cursor-default items-end justify-center"
            onPointerEnter={() => setActive(index)}
            onPointerLeave={() => setActive(null)}
          >
            <AnimatePresence>
              {active === index ? (
                <motion.span
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  transition={{ duration: 0.15 }}
                  className="pointer-events-none absolute z-10 rounded-md border border-border bg-ledger-sheet px-2 py-1 text-[11px] font-medium whitespace-nowrap tabular-nums shadow-md shadow-black/5"
                  // Tall bars keep the label inside the plot instead of over the title.
                  style={
                    entry.value / max > 0.7
                      ? { top: `calc(${100 - (entry.value / max) * 100}% + 6px)` }
                      : { bottom: `calc(${(entry.value / max) * 100}% + 6px)` }
                  }
                >
                  {brl.format(entry.value)}
                </motion.span>
              ) : null}
            </AnimatePresence>
            <motion.div
              className={cn(
                "w-full max-w-7 origin-bottom rounded-t-[4px] bg-viz-1 transition-opacity",
                active !== null && active !== index && "opacity-40",
                barClassName,
              )}
              style={{ height: `${(entry.value / max) * 100}%` }}
              initial={{ scaleY: 0 }}
              animate={inView ? { scaleY: 1 } : undefined}
              transition={{ duration: 0.8, delay: 0.15 + index * 0.08, ease }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-2 text-[11px] text-muted-foreground">
        {upcomingInvoices.map((entry) => (
          <span key={entry.month} className="flex-1 text-center">
            {entry.month}
          </span>
        ))}
      </div>
      {/* sr-only goes on a wrapper: tables ignore overflow clipping, so the caption would leak. */}
      <div className="sr-only">
        <table>
          <caption>Valor já comprometido em parcelas nas próximas faturas</caption>
          <tbody>
            {upcomingInvoices.map((entry) => (
              <tr key={entry.month}>
                <th scope="row">{entry.month}</th>
                <td>{brl.format(entry.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export const budgets = [
  { name: "Mercado", spent: 1284.6, limit: 1500 },
  { name: "Transporte", spent: 612.3, limit: 600 },
  { name: "Lazer", spent: 457.2, limit: 800 },
];

export function BudgetBars({ className }: { className?: string }) {
  const ref = useRef<HTMLUListElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <ul ref={ref} className={cn("grid gap-4", className)}>
      {budgets.map((budget, index) => {
        const ratio = budget.spent / budget.limit;
        const over = ratio > 1;
        return (
          <li key={budget.name}>
            <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-[13px]">
              <span className="font-medium">{budget.name}</span>
              <span className="text-muted-foreground tabular-nums">
                {brl.format(budget.spent)}{" "}
                <span className="opacity-70">de {brl.format(budget.limit)}</span>
              </span>
            </div>
            <div
              className="h-2 overflow-hidden rounded-full bg-secondary"
              role="img"
              aria-label={`${budget.name}: ${Math.round(ratio * 100)}% do orçamento usado${over ? ", acima do limite" : ""}`}
            >
              <motion.div
                className={cn(
                  "h-full origin-left rounded-full",
                  over ? "bg-ledger-amber" : "bg-primary",
                )}
                style={{ width: `${Math.min(ratio, 1) * 100}%` }}
                initial={{ scaleX: 0 }}
                animate={inView ? { scaleX: 1 } : undefined}
                transition={{ duration: 1, delay: 0.1 + index * 0.12, ease }}
              />
            </div>
            {over ? (
              <p className="mt-1.5 text-[12px] text-ledger-amber">
                {brl.format(budget.spent - budget.limit)} acima do previsto
              </p>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

export function Sparkline({
  values,
  className,
}: {
  values: number[];
  className?: string;
}) {
  const clipId = useId();
  const ref = useRef<SVGSVGElement>(null);
  const inView = useInView(ref, { once: true });
  const max = Math.max(...values);
  const min = Math.min(...values);
  const points = values.map((value, index) => ({
    x: (index / (values.length - 1)) * 100,
    y: 28 - ((value - min) / (max - min || 1)) * 24,
  }));

  return (
    <svg
      ref={ref}
      viewBox="0 0 100 32"
      preserveAspectRatio="none"
      className={cn("h-8 w-full overflow-visible", className)}
      aria-hidden
    >
      <clipPath id={clipId}>
        <motion.rect
          x="-2"
          y="-2"
          height="36"
          initial={{ width: 0 }}
          animate={inView ? { width: 104 } : undefined}
          transition={{ duration: 1.2, ease }}
        />
      </clipPath>
      <path
        d={monotonePath(points)}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        clipPath={`url(#${clipId})`}
      />
    </svg>
  );
}
