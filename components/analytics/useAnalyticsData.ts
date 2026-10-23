"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

import {
  buildCategoryInsights,
  buildHealthScore,
  buildInsights,
  buildMonthSummaries,
  buildSpendingPace,
  buildWeekdayBreakdown,
  getHistoryRange,
  type AnalyticsRange,
  type AnalyticsTransactionRow,
} from "@/components/analytics/analyticsData";
import { reportAppError } from "@/lib/errorMonitoring";
import { supabase } from "@/lib/supabaseClient";

/* Lets the public demo supply its own history instead of querying Supabase. */
export const AnalyticsRowsContext = createContext<AnalyticsTransactionRow[] | null>(null);

export function useAnalyticsData({
  month,
  year,
  range,
  formatCurrency,
}: {
  month: number;
  year: number;
  range: AnalyticsRange;
  formatCurrency: (value: number) => string;
}) {
  const [loaded, setLoaded] = useState<{
    key: string;
    month: number;
    year: number;
    rows: AnalyticsTransactionRow[];
  } | null>(null);
  const requestKey = `${year}-${month}`;
  const providedRows = useContext(AnalyticsRowsContext);

  useEffect(() => {
    let isCancelled = false;

    async function fetchHistory() {
      if (providedRows) {
        const { startDate, endDate } = getHistoryRange(month, year);
        setLoaded({
          key: requestKey,
          month,
          year,
          rows: providedRows.filter(
            (row) => row.month_start >= startDate && row.month_start < endDate,
          ),
        });
        return;
      }

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) throw userError;

        if (!user) {
          if (!isCancelled)
            setLoaded({ key: requestKey, month, year, rows: [] });
          return;
        }

        const { startDate, endDate } = getHistoryRange(month, year);
        const { data, error } = await supabase
          .from("transactions")
          .select(
            "id, card_id, dependent_id, month_start, transaction_date, type, description, category, amount, day, notes",
          )
          .eq("user_id", user.id)
          .is("dependent_id", null)
          .gte("month_start", startDate)
          .lt("month_start", endDate)
          .order("month_start", { ascending: true })
          .order("day", { ascending: true });

        if (error) throw error;
        if (!isCancelled) {
          setLoaded({
            key: requestKey,
            month,
            year,
            rows: (data ?? []) as AnalyticsTransactionRow[],
          });
        }
      } catch (error) {
        void reportAppError(error, {
          source: "SUPABASE",
          context: { operation: "Carregar analytics" },
        });
        if (!isCancelled) setLoaded({ key: requestKey, month, year, rows: [] });
      }
    }

    void fetchHistory();

    return () => {
      isCancelled = true;
    };
  }, [month, providedRows, requestKey, year]);

  // Until the new month arrives, keep showing the month that is loaded so
  // the numbers never mix old rows with the newly selected period.
  const loadedMonth = loaded?.month ?? month;
  const loadedYear = loaded?.year ?? year;
  const summaries = useMemo(
    () => buildMonthSummaries(loaded?.rows ?? [], loadedMonth, loadedYear),
    [loaded?.rows, loadedMonth, loadedYear],
  );

  return useMemo(() => {
    const current = summaries[summaries.length - 1];
    const previous = summaries[summaries.length - 2];
    const visibleMonths = summaries.slice(-range);
    const recentBeforeCurrent = summaries
      .slice(-(range + 1), -1)
      .filter((summary) => summary.income > 0 || summary.expense > 0);
    const categories = buildCategoryInsights(current, previous);
    const pace = buildSpendingPace(current, previous);
    const weekdaysBreakdown = buildWeekdayBreakdown(visibleMonths);
    const healthScore = buildHealthScore(current, recentBeforeCurrent);
    const insights = buildInsights({
      current,
      previous,
      recent: recentBeforeCurrent,
      categories,
      pace,
      weekdaysBreakdown,
      formatCurrency,
    });
    const topExpenses = [...current.entries]
      .filter((entry) => entry.signedAmount > 0)
      .sort((left, right) => right.signedAmount - left.signedAmount)
      .slice(0, 5);

    return {
      isLoading: loaded?.key !== requestKey,
      isInitialLoading: loaded === null,
      loadedMonth,
      loadedYear,
      hasData: summaries.some(
        (summary) => summary.income > 0 || summary.expense > 0,
      ),
      summaries,
      visibleMonths,
      current,
      previous,
      categories,
      pace,
      weekdaysBreakdown,
      healthScore,
      insights,
      topExpenses,
    };
  }, [
    formatCurrency,
    loaded,
    loadedMonth,
    loadedYear,
    range,
    requestKey,
    summaries,
  ]);
}
