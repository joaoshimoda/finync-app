"use client";

import { useEffect, useState } from "react";

import { escapeLikePattern, normalizeSearchText } from "@/lib/globalSearch";
import { reportAppError } from "@/lib/errorMonitoring";
import { supabase } from "@/lib/supabaseClient";

export interface SearchTransaction {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
  type: "income" | "fixed" | "card";
  cardId: string | null;
  dependentId: string | null;
  monthStart: string;
  isRecurring: boolean;
  groupId: string | null;
  notes: string | null;
}

const DEBOUNCE_MS = 300;
const LIMIT = 30;

/* Read-only lookup by description across the whole history, for what is
   outside the months the store keeps loaded. Waits for a pause in typing
   and only runs from two characters on. */
export function useHistorySearch(query: string, enabled: boolean) {
  const term = normalizeSearchText(query);
  const isActive = enabled && term.length >= 2;
  const [state, setState] = useState<{
    term: string;
    results: SearchTransaction[];
    isLoading: boolean;
  }>({ term: "", results: [], isLoading: false });

  useEffect(() => {
    if (!isActive) return;

    let isCancelled = false;
    const timeoutId = window.setTimeout(async () => {
      setState((current) => ({ ...current, isLoading: true }));

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user || isCancelled) return;

        const { data, error } = await supabase
          .from("transactions")
          .select(
            "id, description, amount, transaction_date, category, type, card_id, dependent_id, month_start, recurring, group_id, notes",
          )
          .eq("user_id", user.id)
          .ilike("description", `%${escapeLikePattern(query.trim())}%`)
          .order("month_start", { ascending: false })
          .order("day", { ascending: false })
          .limit(LIMIT);

        if (error) throw error;
        if (isCancelled) return;

        setState({
          term,
          isLoading: false,
          results: (data ?? []).map((row) => ({
            id: row.id,
            description: row.description,
            amount: Number(row.amount),
            date: row.transaction_date,
            category: row.category ?? "",
            type: row.type as SearchTransaction["type"],
            cardId: row.card_id,
            dependentId: row.dependent_id,
            monthStart: row.month_start,
            isRecurring: row.recurring,
            groupId: row.group_id,
            notes: row.notes,
          })),
        });
      } catch (error) {
        void reportAppError(error, {
          source: "SUPABASE",
          context: { operation: "Buscar lançamentos no histórico" },
        });
        if (!isCancelled) setState({ term, results: [], isLoading: false });
      }
    }, DEBOUNCE_MS);

    return () => {
      isCancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [isActive, query, term]);

  return {
    results: isActive && state.term === term ? state.results : [],
    isLoading: isActive && (state.isLoading || state.term !== term),
  };
}
