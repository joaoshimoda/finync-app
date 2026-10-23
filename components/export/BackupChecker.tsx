"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useDropzone } from "react-dropzone";
import { CircleAlert, CircleCheck, FileSearch } from "lucide-react";

import {
  dashboardPanelClassName,
  dashboardReveal,
} from "@/components/dashboard/shared";
import { parseFinyncBackup, type FinyncBackup } from "@/lib/backupExport";
import type { Json } from "@/lib/database.types";
import { cn } from "@/lib/utils";

import { BackupCounts } from "./BackupPanel";

type CheckResult =
  | { status: "valid"; fileName: string; backup: FinyncBackup; isOtherAccount: boolean }
  | { status: "invalid"; fileName: string; reason: string };

const generatedFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "long",
  timeStyle: "short",
});

/* Opens a backup file locally and confirms it can be read: version,
   structure and what it contains. Nothing is uploaded or restored. */
export function BackupChecker({ userId }: { userId: string | null }) {
  const [result, setResult] = useState<CheckResult | null>(null);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "application/json": [".json"] },
    maxFiles: 1,
    multiple: false,
    onDrop: async ([file]) => {
      if (!file) return;

      try {
        const backup = parseFinyncBackup(JSON.parse(await file.text()) as Json);
        setResult(
          backup
            ? {
                status: "valid",
                fileName: file.name,
                backup,
                isOtherAccount: Boolean(userId && backup.user_id !== userId),
              }
            : {
                status: "invalid",
                fileName: file.name,
                reason: "O arquivo não tem a estrutura de um backup do Finync.",
              },
        );
      } catch {
        setResult({
          status: "invalid",
          fileName: file.name,
          reason: "Não foi possível ler o arquivo. Ele pode estar corrompido ou incompleto.",
        });
      }
    },
  });

  return (
    <motion.section
      variants={dashboardReveal}
      aria-labelledby="checker-title"
      className={cn(dashboardPanelClassName, "flex flex-col p-5 sm:p-6")}
    >
      <h2 id="checker-title" className="text-base font-semibold text-zinc-100">
        Conferir um backup
      </h2>
      <p className="mt-0.5 text-xs leading-5 text-zinc-500">
        Abra um arquivo de backup para ver se está íntegro e o que ele guarda. A
        leitura acontece só no seu aparelho.
      </p>

      <div
        {...getRootProps()}
        className={cn(
          "mt-4 flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-white/[0.1] px-4 py-4 transition-colors hover:border-emerald-400/40",
          isDragActive && "border-emerald-400 bg-emerald-400/[0.04]",
        )}
      >
        <input {...getInputProps()} />
        <FileSearch className="size-5 shrink-0 text-zinc-500" />
        <p className="text-sm text-zinc-400">
          {isDragActive ? "Pode soltar" : "Arraste o arquivo .json ou clique para escolher"}
        </p>
      </div>

      {result && (
        <div className="mt-4">
          {result.status === "valid" ? (
            <>
              <p className="flex items-start gap-2 text-sm text-emerald-300">
                <CircleCheck className="mt-0.5 size-4 shrink-0" />
                <span className="min-w-0">
                  <span className="block truncate">{result.fileName} está íntegro</span>
                  <span className="block text-xs text-zinc-500">
                    Gerado em {generatedFormatter.format(new Date(result.backup.generated_at))} ·{" "}
                    {result.backup.format_version}
                  </span>
                </span>
              </p>
              {result.isOtherAccount && (
                <p className="mt-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                  Este backup é de outra conta.
                </p>
              )}
              <div className="mt-3">
                <BackupCounts backup={result.backup} />
              </div>
            </>
          ) : (
            <p className="flex items-start gap-2 text-sm text-rose-300">
              <CircleAlert className="mt-0.5 size-4 shrink-0" />
              <span className="min-w-0">
                <span className="block truncate">{result.fileName}</span>
                <span className="block text-xs text-zinc-400">{result.reason}</span>
              </span>
            </p>
          )}
        </div>
      )}

      <p className="mt-auto pt-4 text-[11px] leading-5 text-zinc-600">
        Restaurar um backup dentro do app ainda está no roadmap.
      </p>
    </motion.section>
  );
}
