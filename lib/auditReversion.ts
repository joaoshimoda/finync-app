import type { Json, Tables } from "@/lib/database.types";

type AuditLog = Tables<"audit_logs">;

const hiddenPreferenceFields = new Set(["navigation_preferences"]);

function toRecord(value: Json | null) {
  if (!value || Array.isArray(value) || typeof value !== "object") return {};
  return value;
}

export function canRevertAuditLog(log: AuditLog) {
  if (
    log.origin !== "USER" ||
    !["UPDATE", "DELETE"].includes(log.action) ||
    log.reverted_at ||
    log.reverts_log_id
  ) {
    return false;
  }

  if (log.entity_type === "transactions") {
    const snapshot = toRecord(log.after_data ?? log.before_data);
    return !snapshot.group_id && !snapshot.split_group_id;
  }

  if (log.entity_type === "category_budgets") return true;

  if (
    log.action === "UPDATE" &&
    ["cards", "dependents", "user_preferences"].includes(log.entity_type)
  ) {
    return true;
  }

  return (
    log.action === "UPDATE" &&
    log.entity_type === "categories" &&
    log.changed_fields.length > 0 &&
    log.changed_fields.every((field) => ["color", "icon"].includes(field))
  );
}

export function isUserFacingAuditLog(log: AuditLog) {
  return !(
    log.entity_type === "user_preferences" &&
    log.action === "UPDATE" &&
    log.changed_fields.length > 0 &&
    log.changed_fields.every((field) => hiddenPreferenceFields.has(field))
  );
}
