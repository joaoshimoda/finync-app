"use client";

import dynamic from "next/dynamic";

import { chartHeights } from "@/components/analytics/chartHeights";
import { cn } from "@/lib/utils";

/* Recharts is heavy, so the analytics charts load in their own chunk.
   Until it arrives each chart keeps its exact height, so nothing shifts. */
function placeholder(height: string) {
  function ChartPlaceholder() {
    return <div aria-hidden className={cn("min-h-0", height)} />;
  }

  return ChartPlaceholder;
}

const loadCharts = () => import("@/components/analytics/AnalyticsCharts");

export const CashFlowChart = dynamic(
  () => loadCharts().then((module) => module.CashFlowChart),
  { ssr: false, loading: placeholder(chartHeights.cashFlow) },
);

export const SpendingPaceChart = dynamic(
  () => loadCharts().then((module) => module.SpendingPaceChart),
  { ssr: false, loading: placeholder(chartHeights.spendingPace) },
);

export const CompositionChart = dynamic(
  () => loadCharts().then((module) => module.CompositionChart),
  { ssr: false, loading: placeholder(chartHeights.composition) },
);

export const WeekdayChart = dynamic(
  () => loadCharts().then((module) => module.WeekdayChart),
  { ssr: false, loading: placeholder(chartHeights.weekday) },
);
