"use client";

import { motion } from "framer-motion";
import { Download, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import {
  dashboardPanelClassName,
  dashboardReveal,
} from "@/components/dashboard/shared";
import { Button } from "@/components/ui/button";
import {
  getBackupCounts,
  getBackupFilename,
  type FinyncBackup,
} from "@/lib/backupExport";
import { cn } from "@/lib/utils";

import { downloadFile, type ExportData } from "./useExportData";

const REMIND_AFTER_DAYS = 30;

export const collectionLabels: Record<keyof ReturnType<typeof getBackupCounts>, string> = {
  transactions: "Lançamentos",
  cards: "Cartões",
  card_invoices: "Faturas",
  invoice_payments: "Pagamentos de fatura",
  dependents: "Dependentes",
  dependent_settlements: "Acertos",
  categories: "Categorias",
  category_budgets: "Orçamentos",
  audit_logs: "Registros de histórico",
};

export function BackupCounts({ backup }: { backup: FinyncBackup }) {
  const counts = getBackupCounts(backup);

  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.06] sm:grid-cols-3">
      {(Object.keys(collectionLabels) as Array<keyof typeof collectionLabels>).map((key) => (
        <div key={key} className="bg-zinc-950/80 px-3 py-2.5">
          <dd className="text-base font-semibold tabular-nums text-zinc-100">
            {counts[key].toLocaleString("pt-BR")}
          </dd>
          <dt className="text-[11px] text-zinc-500">{collectionLabels[key]}</dt>
        </div>
      ))}
    </dl>
  );
}

function getDaysSince(date: Date) {
  return Math.floor((Date.now() - date.getTime()) / 86_400_000);
}

export function BackupPanel({ data }: { data: ExportData }) {
  const { backup, isLoading, loadBackup, lastBackupAt, markBackupDone } = data;
  const daysSince = lastBackupAt ? getDaysSince(lastBackupAt) : null;
  const isOverdue = daysSince === null || daysSince >= REMIND_AFTER_DAYS;

  async function handleBackup() {
    try {
      const snapshot = await loadBackup();
      const generatedAt = new Date();

      downloadFile(
        JSON.stringify(snapshot, null, 2),
        getBackupFilename("json", generatedAt),
        "application/json;charset=utf-8",
      );
      markBackupDone(generatedAt);
      toast.success("Backup completo baixado.");
    } catch {
      toast.error("Não foi possível gerar o backup.");
    }
  }

  return (
    <motion.section
      variants={dashboardReveal}
      aria-labelledby="backup-title"
      className={cn(dashboardPanelClassName, "relative overflow-hidden")}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -left-24 size-80 rounded-full bg-[radial-gradient(closest-side,rgba(52,211,153,0.12),transparent)]"
      />
      <div className="relative grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-center lg:gap-10">
        <div>
          <span className="flex size-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-300">
            <ShieldCheck className="size-5" />
          </span>
          <h2 id="backup-title" className="mt-4 text-xl font-semibold tracking-[-0.02em] text-zinc-50">
            Backup completo
          </h2>
          <p className="mt-1.5 max-w-md text-sm leading-6 text-zinc-400">
            Uma cópia de tudo: cadastros, lançamentos, faturas, pagamentos,
            acertos, orçamentos e histórico, num arquivo JSON versionado.
          </p>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button
              type="button"
              onClick={() => void handleBackup()}
              disabled={isLoading}
              className="h-11 gap-2 bg-emerald-400 px-6 font-semibold text-zinc-950 hover:bg-emerald-300"
            >
              {isLoading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
              {isLoading ? "Gerando..." : "Baixar backup"}
            </Button>
            <p className={cn("text-xs", isOverdue ? "text-amber-300" : "text-zinc-500")}>
              {daysSince === null
                ? "Nenhum backup feito neste aparelho ainda."
                : daysSince === 0
                  ? "Último backup: hoje."
                  : `Último backup: há ${daysSince} ${daysSince === 1 ? "dia" : "dias"}.`}
              {isOverdue && daysSince !== null && " Vale fazer um novo."}
            </p>
          </div>
        </div>

        <div>
          {backup ? (
            <>
              <p className="mb-2 text-xs font-medium text-zinc-400">O que está na sua conta</p>
              <BackupCounts backup={backup} />
            </>
          ) : (
            <ul className="grid gap-2 text-sm text-zinc-400 sm:grid-cols-2">
              {[
                "Mantém os vínculos entre faturas, compras e dependentes",
                "Lido de uma vez só, sem dados pela metade",
                "Fica só no seu aparelho, nada vai para terceiros",
                "Sem senhas ou tokens no arquivo",
              ].map((item) => (
                <li
                  key={item}
                  className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-xs leading-5"
                >
                  {item}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </motion.section>
  );
}
