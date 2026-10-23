import type { Json, Tables } from "./database.types.ts";

/* Pure helpers for the activity page: collapsing bursts of identical
   actions (an invoice import creates dozens of rows in seconds), bucketing
   by day and matching a search. */

type AuditLog = Tables<"audit_logs">;

/* Consecutive logs this close together, with the same action on the same
   kind of record, read as one event. */
export const BURST_WINDOW_MS = 2 * 60 * 1000;
export const BURST_MIN_SIZE = 3;

export type ActivityItem =
  | { kind: "single"; log: AuditLog }
  | { kind: "burst"; id: string; logs: AuditLog[] };

export function toSnapshot(value: Json | null): Record<string, Json | undefined> {
  if (!value || Array.isArray(value) || typeof value !== "object") return {};
  return value;
}

export function getLogName(log: AuditLog) {
  const snapshot = toSnapshot(log.after_data ?? log.before_data);
  const name = snapshot.description ?? snapshot.name ?? snapshot.label;
  return typeof name === "string" && name.trim() ? name.trim() : null;
}

/* Logs must be newest first, as the page loads them. */
export function groupBursts(logs: AuditLog[]): ActivityItem[] {
  const items: ActivityItem[] = [];
  let run: AuditLog[] = [];

  const flush = () => {
    if (run.length >= BURST_MIN_SIZE) {
      items.push({ kind: "burst", id: `burst-${run[0].id}`, logs: run });
    } else {
      run.forEach((log) => items.push({ kind: "single", log }));
    }
    run = [];
  };

  logs.forEach((log) => {
    const previous = run[run.length - 1];
    const continues =
      previous &&
      previous.action === log.action &&
      previous.entity_type === log.entity_type &&
      previous.origin === log.origin &&
      !log.reverts_log_id &&
      !previous.reverts_log_id &&
      Math.abs(new Date(previous.created_at).getTime() - new Date(log.created_at).getTime()) <=
        BURST_WINDOW_MS;

    if (!continues) flush();
    run.push(log);
  });
  flush();

  return items;
}

export function getDayKey(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

/* Events per local day for the last `days` days, oldest first. */
export function countByDay(logs: AuditLog[], days: number, now = new Date()) {
  const counts = new Map<string, number>();
  logs.forEach((log) => {
    const key = getDayKey(log.created_at);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });

  return Array.from({ length: days }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1 - index));
    const key = getDayKey(date);
    return { key, date, count: counts.get(key) ?? 0 };
  });
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLocaleLowerCase("pt-BR");
}

export function matchesSearch(log: AuditLog, query: string) {
  const term = normalize(query.trim());
  if (!term) return true;

  const before = toSnapshot(log.before_data);
  const after = toSnapshot(log.after_data);
  return [before, after].some((snapshot) =>
    ["description", "name", "label", "category"].some((field) => {
      const value = snapshot[field];
      return typeof value === "string" && normalize(value).includes(term);
    }),
  );
}
