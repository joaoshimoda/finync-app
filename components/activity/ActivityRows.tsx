"use client";

import { useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Layers, Undo2 } from "lucide-react";

import { dashboardEase, usePrivateCurrency } from "@/components/dashboard/shared";
import { Button } from "@/components/ui/button";
import { toSnapshot } from "@/lib/activityFeed";
import { cn } from "@/lib/utils";

import {
  actionPresentation,
  activityTimeFormatter,
  entityPresentation,
  fieldLabels,
  formatChangedValue,
  getActivityPresentation,
  getDisplayName,
  hiddenChangedFields,
  type AuditLog,
} from "./activityPresentation";

const INLINE_CHANGES = 3;
const BURST_PREVIEW = 10;

/* Plural nouns that take feminine agreement ("transações criadas"). */
const feminineEntities = new Set(["transactions", "categories", "card_invoices", "user_preferences"]);

function Tag({ className, children }: { className: string; children: ReactNode }) {
  return (
    <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium", className)}>
      {children}
    </span>
  );
}

/* Value and category of a created or deleted transaction, the two things
   people look for first. */
function useRecordSummary(log: AuditLog) {
  const formatValue = usePrivateCurrency();
  if (log.action === "UPDATE") return null;

  const snapshot = toSnapshot(log.after_data ?? log.before_data);
  const parts: string[] = [];
  if (typeof snapshot.amount === "number") parts.push(formatValue(snapshot.amount));
  if (typeof snapshot.category === "string" && snapshot.category) parts.push(snapshot.category);
  return parts.length ? parts.join(" · ") : null;
}

export function ActivityRow({
  log,
  canRevert,
  isReverting,
  onRevert,
  compact = false,
}: {
  log: AuditLog;
  canRevert: boolean;
  isReverting: boolean;
  onRevert: () => void;
  compact?: boolean;
}) {
  const formatValue = usePrivateCurrency();
  const [showAll, setShowAll] = useState(false);
  const activity = getActivityPresentation(log, formatValue);
  const Icon = activity.icon;
  const before = toSnapshot(log.before_data);
  const after = toSnapshot(log.after_data);
  const changes =
    log.action === "UPDATE"
      ? log.changed_fields.filter(
          (field) => !hiddenChangedFields.has(field) && !activity.consumedFields.has(field),
        )
      : [];
  const visibleChanges = showAll ? changes : changes.slice(0, INLINE_CHANGES);
  const summary = useRecordSummary(log);

  return (
    <div className={cn("group flex items-start gap-3", compact ? "py-2.5" : "px-4 py-3.5 sm:px-5")}>
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-lg",
          compact ? "size-7" : "size-9",
          activity.tone,
        )}
      >
        <Icon className={compact ? "size-3.5" : "size-4"} />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <p
            className={cn(
              "min-w-0 truncate font-medium text-zinc-100",
              compact ? "text-xs" : "text-sm",
              log.reverted_at && "text-zinc-500 line-through decoration-zinc-600",
            )}
          >
            {getDisplayName(log)}
          </p>
          {!compact && <Tag className={activity.badge}>{activity.label}</Tag>}
          {log.reverted_at && <Tag className="border-zinc-700 bg-zinc-900 text-zinc-400">Desfeito</Tag>}
          {log.reverts_log_id && (
            <Tag className="border-emerald-500/20 bg-emerald-500/10 text-emerald-300">Reversão</Tag>
          )}
        </div>
        <p className="mt-0.5 truncate text-xs text-zinc-500">
          {!compact && (
            <>
              <time dateTime={log.created_at}>
                {activityTimeFormatter.format(new Date(log.created_at))}
              </time>
              {" · "}
            </>
          )}
          {summary ?? activity.description}
        </p>

        {changes.length > 0 && (
          <ul className="mt-2 flex flex-col gap-1">
            {visibleChanges.map((field) => (
              <li key={field} className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 text-xs">
                <span className="text-zinc-500">{fieldLabels[field] ?? field}</span>
                <span className="min-w-0 break-words text-zinc-500 line-through decoration-zinc-700">
                  {formatChangedValue(field, before[field], formatValue)}
                </span>
                <span aria-hidden className="text-zinc-600">→</span>
                <span className="min-w-0 break-words font-medium text-zinc-200">
                  {formatChangedValue(field, after[field], formatValue)}
                </span>
              </li>
            ))}
            {changes.length > INLINE_CHANGES && (
              <li>
                <button
                  type="button"
                  onClick={() => setShowAll((current) => !current)}
                  className="text-xs text-zinc-500 hover:text-zinc-200"
                >
                  {showAll ? "Mostrar menos" : `+ ${changes.length - INLINE_CHANGES} alterações`}
                </button>
              </li>
            )}
          </ul>
        )}
      </div>

      {canRevert && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRevert}
          disabled={isReverting}
          className={cn(
            "h-8 shrink-0 gap-1.5 rounded-lg px-2.5 text-xs text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-50",
            !compact && "sm:opacity-60 sm:group-hover:opacity-100",
          )}
        >
          <Undo2 className="size-3.5" />
          {log.action === "DELETE" ? "Restaurar" : "Desfazer"}
        </Button>
      )}
    </div>
  );
}

/* Several identical actions in a row, shown as one line that opens. */
export function BurstRow({
  logs,
  canRevert,
  revertingId,
  onRevert,
}: {
  logs: AuditLog[];
  canRevert: (log: AuditLog) => boolean;
  revertingId: string | null;
  onRevert: (log: AuditLog) => void;
}) {
  const formatValue = usePrivateCurrency();
  const [isOpen, setIsOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const first = logs[logs.length - 1];
  const last = logs[0];
  const action = actionPresentation[last.action];
  const entity = entityPresentation[last.entity_type];
  const Icon = action.icon;
  const total = logs.reduce((sum, log) => {
    const amount = toSnapshot(log.after_data ?? log.before_data).amount;
    return sum + (typeof amount === "number" ? amount : 0);
  }, 0);
  const verb = { CREATE: "criad", UPDATE: "editad", DELETE: "excluíd" }[last.action] +
    (feminineEntities.has(last.entity_type) ? "as" : "os");
  const start = activityTimeFormatter.format(new Date(first.created_at));
  const end = activityTimeFormatter.format(new Date(last.created_at));

  return (
    <div>
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
        className="flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-white/[0.02] sm:px-5"
      >
        <span className={cn("relative flex size-9 shrink-0 items-center justify-center rounded-lg", action.tone)}>
          <Icon className="size-4" />
          <span className="absolute -right-1 -bottom-1 flex size-4 items-center justify-center rounded-full bg-zinc-900 ring-2 ring-zinc-950">
            <Layers className="size-2.5 text-zinc-400" />
          </span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-zinc-100">
              {logs.length} {entity.plural.toLocaleLowerCase("pt-BR")} {verb}
            </span>
            <Tag className={action.badge}>Em lote</Tag>
          </span>
          <span className="mt-0.5 block truncate text-xs text-zinc-500">
            {start === end ? start : `${start} – ${end}`}
            {total > 0 && ` · ${formatValue(total)} no total`}
            {" · "}
            {logs
              .slice(0, 3)
              .map((log) => getDisplayName(log))
              .join(", ")}
            {logs.length > 3 && "…"}
          </span>
        </span>
        <ChevronDown
          className={cn("mt-2 size-4 shrink-0 text-zinc-500 transition-transform", isOpen && "rotate-180")}
        />
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
            <div className="ml-[3.25rem] mr-4 mb-3 divide-y divide-white/[0.04] border-l border-white/[0.08] pl-4 sm:ml-[3.75rem] sm:mr-5">
              {(showAll ? logs : logs.slice(0, BURST_PREVIEW)).map((log) => (
                <ActivityRow
                  key={log.id}
                  log={log}
                  compact
                  canRevert={canRevert(log)}
                  isReverting={revertingId !== null}
                  onRevert={() => onRevert(log)}
                />
              ))}
              {logs.length > BURST_PREVIEW && (
                <button
                  type="button"
                  onClick={() => setShowAll((current) => !current)}
                  className="py-2.5 text-xs text-zinc-400 hover:text-zinc-100"
                >
                  {showAll ? "Mostrar menos" : `Mostrar todos os ${logs.length}`}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
