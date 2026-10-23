"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useId } from "react";

import { cn } from "@/lib/utils";

import { ease } from "./charts";

type Point = readonly [number, number];

const WIDTH = 1440;
const HEIGHT = 720;

/* Balance climbing left to right, with the small dips of a real month. */
const balance: Point[] = [
  [0, 560], [130, 520], [250, 548], [370, 468], [490, 492], [610, 404],
  [730, 430], [850, 344], [970, 372], [1090, 286], [1210, 300], [1330, 214],
  [1440, 176],
];

/* Spending trend: flatter and below the balance, drawn dashed. */
const spending: Point[] = [
  [0, 630], [160, 606], [320, 618], [480, 580], [640, 594], [800, 556],
  [960, 566], [1120, 528], [1280, 540], [1440, 504],
];

const markers = [3, 7, 11];
const rules = [160, 280, 400, 520, 640];
const bars = Array.from({ length: 36 }, (_, index) => {
  const height = 26 + ((index * 37) % 23) * 3 + index * 1.4;
  return { x: index * 40 + 12, height };
});

/* Catmull-Rom through the points, emitted as cubic Béziers. */
function smoothPath(points: Point[]) {
  return points.reduce((path, [x, y], index) => {
    if (index === 0) return `M${x},${y}`;
    const previous = points[index - 2] ?? points[index - 1];
    const start = points[index - 1];
    const next = points[index + 1] ?? [x, y];
    const c1x = start[0] + (x - previous[0]) / 6;
    const c1y = start[1] + (y - previous[1]) / 6;
    const c2x = x - (next[0] - start[0]) / 6;
    const c2y = y - (next[1] - start[1]) / 6;
    return `${path} C${c1x},${c1y} ${c2x},${c2y} ${x},${y}`;
  }, "");
}

const balancePath = smoothPath(balance);
const spendingPath = smoothPath(spending);
const areaPath = `${balancePath} L${WIDTH},${HEIGHT} L0,${HEIGHT} Z`;

const palette = {
  light: {
    rule: "rgb(18 38 26 / 0.07)",
    bar: "rgb(44 96 60 / 0.07)",
    line: "rgb(44 96 60 / 0.42)",
    area: "rgb(44 96 60)",
    spending: "rgb(149 88 10 / 0.3)",
    dot: "#f8faf7",
  },
  dark: {
    rule: "rgb(238 242 236 / 0.06)",
    bar: "rgb(159 212 173 / 0.06)",
    line: "rgb(159 212 173 / 0.4)",
    area: "rgb(159 212 173)",
    spending: "rgb(242 226 194 / 0.25)",
    dot: "#12261a",
  },
};

/* Faint balance chart behind the hero, the dependents band and the CTA:
   ledger rules, a volume strip, the balance curve and a dashed spending
   trend. Decorative only; the caller places it and sets the fade mask. */
export function LedgerBackdrop({
  tone = "light",
  className,
}: {
  tone?: "light" | "dark";
  className?: string;
}) {
  const id = useId();
  const reduceMotion = useReducedMotion();
  const colors = palette[tone];
  const draw = reduceMotion
    ? {}
    : {
        initial: { pathLength: 0 },
        whileInView: { pathLength: 1 },
        viewport: { once: true },
      };

  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="xMidYMax slice"
      className={cn("pointer-events-none absolute", className)}
    >
      <defs>
        <linearGradient id={`${id}-area`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={colors.area} stopOpacity="0.14" />
          <stop offset="70%" stopColor={colors.area} stopOpacity="0" />
        </linearGradient>
      </defs>

      {rules.map((y) => (
        <line
          key={y}
          x1="0"
          x2={WIDTH}
          y1={y}
          y2={y}
          stroke={colors.rule}
          strokeDasharray="2 7"
        />
      ))}

      {bars.map(({ x, height }) => (
        <rect
          key={x}
          x={x}
          y={HEIGHT - height}
          width="16"
          height={height}
          rx="3"
          fill={colors.bar}
        />
      ))}

      <motion.path
        d={areaPath}
        fill={`url(#${id}-area)`}
        initial={reduceMotion ? false : { opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.6, delay: 0.9, ease }}
      />
      <motion.path
        d={spendingPath}
        fill="none"
        stroke={colors.spending}
        strokeWidth="1.25"
        strokeDasharray="5 7"
        {...draw}
        transition={{ duration: 2.4, delay: 0.5, ease }}
      />
      <motion.path
        d={balancePath}
        fill="none"
        stroke={colors.line}
        strokeWidth="1.75"
        strokeLinecap="round"
        {...draw}
        transition={{ duration: 2.2, delay: 0.3, ease }}
      />

      {markers.map((index, order) => {
        const [cx, cy] = balance[index];
        return (
          <motion.g
            key={index}
            initial={reduceMotion ? false : { opacity: 0, scale: 0.4 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 1 + order * 0.45, ease }}
            style={{ transformOrigin: `${cx}px ${cy}px` }}
          >
            <circle cx={cx} cy={cy} r="11" fill={colors.area} fillOpacity="0.08" />
            <circle cx={cx} cy={cy} r="4" fill={colors.dot} stroke={colors.line} strokeWidth="1.5" />
          </motion.g>
        );
      })}
    </svg>
  );
}
