"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";

import { reportAppError } from "@/lib/errorMonitoring";
import {
  useFinanceStore,
  type UpdateUserPreferencesInput,
} from "@/store/useFinanceStore";

export function usePreferenceUpdater() {
  const updatePreferences = useFinanceStore((state) => state.updatePreferences);
  const [isSaving, setIsSaving] = useState(false);

  const update = useCallback(
    async (updates: UpdateUserPreferencesInput) => {
      setIsSaving(true);

      try {
        await updatePreferences(updates);
      } catch (error) {
        void reportAppError(error, {
          source: "SUPABASE",
          context: { operation: "Salvar preferências" },
        });
        toast.error("Não foi possível sincronizar a preferência.");
      } finally {
        setIsSaving(false);
      }
    },
    [updatePreferences],
  );

  return { update, isSaving };
}
