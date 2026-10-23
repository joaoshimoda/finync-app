"use client";

import { useTheme } from "@/hooks/useTheme";

/* Neutral chart colours per theme. Recharts writes colours into SVG
   attributes, where CSS variables are unreliable, so they are picked here.
   `panel` matches the card behind the chart (used to ring data points). */
const tones = {
  dark: {
    panel: "#18181b",
    grid: "rgba(255,255,255,0.05)",
    reference: "rgba(255,255,255,0.12)",
    referenceStrong: "rgba(255,255,255,0.16)",
    cursor: "rgba(255,255,255,0.18)",
    cursorFill: "rgba(255,255,255,0.03)",
    tick: "#71717a",
    tickStrong: "#a1a1aa",
  },
  light: {
    panel: "#ffffff",
    grid: "rgba(9,9,11,0.07)",
    reference: "rgba(9,9,11,0.16)",
    referenceStrong: "rgba(9,9,11,0.22)",
    cursor: "rgba(9,9,11,0.2)",
    cursorFill: "rgba(9,9,11,0.04)",
    tick: "#71717a",
    tickStrong: "#52525b",
  },
} as const;

export function useChartTones() {
  return tones[useTheme().resolvedTheme];
}
