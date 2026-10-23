"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  ChevronDown,
  CircleAlert,
  Loader2,
  ShieldAlert,
} from "lucide-react";

import {
  dashboardEase,
  dashboardPanelClassName,
  usePrivateCurrency,
} from "@/components/dashboard/shared";
import { Button } from "@/components/ui/button";
import { getAffectedRecords, healthCheckInfo } from "@/lib/dataHealth";
import { formatDateOnlyBR } from "@/lib/dateUtils";
import { cn } from "@/lib/utils";

import { RestoreCategoryFix, SetCategoryFix } from "./HealthFixes";
import type { DataHealthCheck, HealthData } from "./useHealthData";

const PREVIEW_LIMIT = 8;

/* Rows the transactions page can filter to directly. */
const reviewRoutes: Partial<Record<string, string>> = {
  transactions_without_category: "/dashboard/transactions?review=missing-category",
  transactions_with_unknown_category: "/dashboard/transactions?review=unknown-category",
};

export const severityPresentation = {
  critical: { label: "Crítico", icon: ShieldAlert, tone: "bg-rose-500/10 text-rose-300", bar: "bg-rose-400" },
  error: { label: "Erro", icon: CircleAlert, tone: "bg-orange-500/10 text-orange-300", bar: "bg-orange-400" },
  warning: { label: "Atenção", icon: AlertTriangle, tone: "bg-amber-500/10 text-amber-300", bar: "bg-amber-400" },
} as const;

function getSeverity(severity: string) {
  return severityPresentation[severity as keyof typeof severityPresentation] ?? severityPresentation.warning;
}

export function IssueCard({ check, health }: { check: DataHealthCheck; health: HealthData }) {
  const formatValue = usePrivateCurrency();
  const [isOpen, setIsOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const severity = getSeverity(check.severity);
  const Icon = severity.icon;
  const info = healthCheckInfo[check.check_key];
  const records = health.backup ? getAffectedRecords(check.check_key, health.backup) : null;
  const visible = records ? (showAll ? records : records.slice(0, PREVIEW_LIMIT)) : [];

  /* Opening a card, or a refresh after a fix, reloads the details. */
  const { backup, loadDetails } = health;
  useEffect(() => {
    if (!isOpen || backup || loadFailed) return;
    loadDetails().catch(() => setLoadFailed(true));
  }, [backup, isOpen, loadDetails, loadFailed]);

  function toggle() {
    setIsOpen((open) => !open);
  }

  return (
    <motion.li
      layout="position"
      className={cn(dashboardPanelClassName, "relative overflow-hidden")}
    >
      <span aria-hidden className={cn("absolute inset-y-0 left-0 w-0.5", severity.bar)} />
      <button
        type="button"
        onClick={toggle}
        aria-expanded={isOpen}
        className="flex w-full items-start gap-4 p-4 text-left sm:p-5"
      >
        <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", severity.tone)}>
          <Icon className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-zinc-100">{check.title}</span>
            <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", severity.tone)}>
              {severity.label}
            </span>
          </span>
          <span className="mt-1 block text-sm leading-6 text-zinc-500">
            {info?.why ?? check.description}
          </span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1">
          <span className="text-lg font-semibold tabular-nums text-zinc-100">{check.issue_count}</span>
          <ChevronDown className={cn("size-4 text-zinc-500 transition-transform", isOpen && "rotate-180")} />
        </span>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: dashboardEase }}
            className="overflow-hidden"
          >
            <div className="border-t border-white/[0.06] px-4 pt-4 pb-5 sm:px-5">
              {info && (
                <p className="text-xs text-zinc-400">
                  <span className="font-medium text-zinc-300">Como resolver: </span>
                  {info.howToFix}
                </p>
              )}

              {records === null ? (
                <div className="mt-4 flex items-center gap-2 text-sm text-zinc-500">
                  {loadFailed ? (
                    <>
                      Não foi possível carregar os registros.
                      <button
                        type="button"
                        onClick={() => setLoadFailed(false)}
                        className="text-zinc-300 underline-offset-2 hover:underline"
                      >
                        Tentar de novo
                      </button>
                    </>
                  ) : (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Buscando os registros afetados...
                    </>
                  )}
                </div>
              ) : (
                <>
                  {info?.fix === "set-category" && records.length > 0 && (
                    <SetCategoryFix records={records} health={health} />
                  )}
                  {info?.fix === "restore-category" && records.length > 0 && (
                    <RestoreCategoryFix records={records} health={health} />
                  )}

                  {records.length > 0 ? (
                    <ul className="mt-4 divide-y divide-white/[0.04] overflow-hidden rounded-xl border border-white/[0.06]">
                      {visible.map((record) => (
                        <li key={record.id} className="flex items-center gap-3 px-3 py-2.5 text-sm">
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-zinc-200">{record.title}</span>
                            <span className="block truncate text-xs text-zinc-500">
                              {record.date ? `${formatDateOnlyBR(record.date)} · ` : ""}
                              {record.detail}
                            </span>
                          </span>
                          {record.expected !== undefined && record.actual !== undefined ? (
                            <span className="shrink-0 text-right text-xs tabular-nums">
                              <span className="block text-zinc-400">
                                Guardado {formatValue(record.actual)}
                              </span>
                              <span className="block text-emerald-300">
                                Certo {formatValue(record.expected)}
                              </span>
                            </span>
                          ) : record.amount !== null ? (
                            <span className="shrink-0 font-medium tabular-nums text-zinc-100">
                              {formatValue(record.amount)}
                            </span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-4 text-sm text-zinc-500">
                      Nenhum registro encontrado agora. Verifique de novo para atualizar a contagem.
                    </p>
                  )}

                  {records.length > PREVIEW_LIMIT && (
                    <button
                      type="button"
                      onClick={() => setShowAll((current) => !current)}
                      className="mt-2 text-xs text-zinc-400 hover:text-zinc-100"
                    >
                      {showAll ? "Mostrar menos" : `Mostrar todos os ${records.length}`}
                    </button>
                  )}
                </>
              )}

              <Button
                asChild
                variant="ghost"
                className="mt-4 h-9 gap-1.5 px-3 text-zinc-300 hover:bg-white/[0.06] hover:text-zinc-50"
              >
                <Link href={reviewRoutes[check.check_key] ?? check.action_route}>
                  Abrir na tela
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  );
}
