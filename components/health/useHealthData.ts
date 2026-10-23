"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { fetchBackupSnapshot } from "@/components/export/useExportData";
import type { FinyncBackup } from "@/lib/backupExport";
import { healthCheckInfo } from "@/lib/dataHealth";
import type { Database } from "@/lib/database.types";
import { reportAppError } from "@/lib/errorMonitoring";
import { supabase } from "@/lib/supabaseClient";

export type DataHealthCheck =
  Database["public"]["Functions"]["finync_get_data_health"]["Returns"][number];

const severityOrder: Record<string, number> = { critical: 0, error: 1, warning: 2 };

/* Counts come from the database check; the detailed snapshot is loaded only
   when the user opens a problem, and dropped after any fix so the next look
   is fresh. */
export function useHealthData() {
  const [checks, setChecks] = useState<DataHealthCheck[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null);
  const [backup, setBackup] = useState<FinyncBackup | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const pendingBackup = useRef<Promise<FinyncBackup> | null>(null);

  const runChecks = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc("finync_get_data_health");
      if (error) throw error;
      setChecks(data ?? []);
      setLastCheckedAt(new Date());
    } catch (error) {
      void reportAppError(error, {
        source: "SUPABASE",
        context: { operation: "Verificar integridade" },
      });
      toast.error("Não foi possível verificar a integridade dos dados.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void runChecks(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [runChecks]);

  const loadDetails = useCallback(async () => {
    if (backup) return backup;
    if (!pendingBackup.current) {
      setIsLoadingDetails(true);
      pendingBackup.current = fetchBackupSnapshot()
        .then((snapshot) => {
          setBackup(snapshot);
          return snapshot;
        })
        .finally(() => {
          pendingBackup.current = null;
          setIsLoadingDetails(false);
        });
    }
    return pendingBackup.current;
  }, [backup]);

  /* After a fix: recount and forget the stale snapshot. */
  const refresh = useCallback(async () => {
    setBackup(null);
    await runChecks();
  }, [runChecks]);

  const summary = useMemo(() => {
    const failing = checks
      .filter((check) => check.issue_count > 0)
      .sort(
        (left, right) =>
          (severityOrder[left.severity] ?? 3) - (severityOrder[right.severity] ?? 3) ||
          right.issue_count - left.issue_count,
      );
    const passing = checks.filter((check) => check.issue_count === 0);
    const countBy = (severity: string) =>
      failing.filter((check) => check.severity === severity).length;

    return {
      failing,
      passing,
      total: checks.length,
      score: checks.length ? Math.round((passing.length / checks.length) * 100) : 100,
      affectedRecords: failing.reduce((sum, check) => sum + check.issue_count, 0),
      critical: countBy("critical"),
      errors: countBy("error"),
      warnings: countBy("warning"),
      fixable: failing.filter((check) => healthCheckInfo[check.check_key]?.fix).length,
    };
  }, [checks]);

  return {
    checks,
    summary,
    isLoading,
    lastCheckedAt,
    runChecks,
    refresh,
    backup,
    isLoadingDetails,
    loadDetails,
  };
}

export type HealthData = ReturnType<typeof useHealthData>;
