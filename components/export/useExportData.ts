"use client";

import { useCallback, useEffect, useState } from "react";

import { parseFinyncBackup, type FinyncBackup } from "@/lib/backupExport";
import { reportAppError } from "@/lib/errorMonitoring";
import { supabase } from "@/lib/supabaseClient";

const LAST_BACKUP_KEY = "finync:last-backup-at";

export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

/* Reads the full snapshot once per visit (the same read-only RPC the page
   always used) and keeps it in memory, so every report and preview after
   the first one is instant and consistent. */
export function useExportData() {
  const [backup, setBackup] = useState<FinyncBackup | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastBackupAt, setLastBackupAt] = useState<Date | null>(null);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(LAST_BACKUP_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- read once from browser storage after mount
      if (stored) setLastBackupAt(new Date(stored));
    } catch {
      /* Storage can be unavailable (private mode); the reminder just hides. */
    }
  }, []);

  const loadBackup = useCallback(async () => {
    if (backup) return backup;
    setIsLoading(true);

    try {
      const { data, error } = await supabase.rpc("finync_export_backup");
      if (error) throw error;

      const parsed = data ? parseFinyncBackup(data) : null;
      if (!parsed) throw new Error("Formato de backup inválido.");

      setBackup(parsed);
      return parsed;
    } catch (error) {
      void reportAppError(error, {
        source: "SUPABASE",
        context: { operation: "Exportar dados" },
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [backup]);

  const markBackupDone = useCallback((date: Date) => {
    setLastBackupAt(date);
    try {
      window.localStorage.setItem(LAST_BACKUP_KEY, date.toISOString());
    } catch {
      /* Not critical: only powers the reminder on this device. */
    }
  }, []);

  return { backup, isLoading, loadBackup, lastBackupAt, markBackupDone };
}

export type ExportData = ReturnType<typeof useExportData>;
