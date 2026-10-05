import assert from "node:assert/strict";
import test from "node:test";

import type { Tables } from "../lib/database.types.ts";
import { canRevertAuditLog } from "../lib/auditReversion.ts";

type AuditLog = Tables<"audit_logs">;

function createLog(overrides: Partial<AuditLog> = {}): AuditLog {
  return {
    action: "UPDATE",
    actor_id: "user-id",
    after_data: { id: "entity-id", group_id: null, split_group_id: null },
    before_data: { id: "entity-id", group_id: null, split_group_id: null },
    changed_fields: ["category"],
    created_at: "2026-10-05T12:00:00.000Z",
    entity_id: "entity-id",
    entity_type: "transactions",
    id: "log-id",
    origin: "USER",
    reversal_log_id: null,
    reverted_at: null,
    reverted_by: null,
    reverts_log_id: null,
    user_id: "user-id",
    ...overrides,
  };
}

test("allows a standalone transaction update", () => {
  assert.equal(canRevertAuditLog(createLog()), true);
});

test("blocks grouped and split transactions", () => {
  assert.equal(
    canRevertAuditLog(
      createLog({ after_data: { group_id: "group-id", split_group_id: null } }),
    ),
    false,
  );
  assert.equal(
    canRevertAuditLog(
      createLog({ after_data: { group_id: null, split_group_id: "split-id" } }),
    ),
    false,
  );
});

test("allows budget deletion but blocks card deletion", () => {
  assert.equal(
    canRevertAuditLog(
      createLog({ action: "DELETE", entity_type: "category_budgets" }),
    ),
    true,
  );
  assert.equal(
    canRevertAuditLog(createLog({ action: "DELETE", entity_type: "cards" })),
    false,
  );
});

test("only allows presentation-only category edits", () => {
  assert.equal(
    canRevertAuditLog(
      createLog({ entity_type: "categories", changed_fields: ["icon", "color"] }),
    ),
    true,
  );
  assert.equal(
    canRevertAuditLog(
      createLog({ entity_type: "categories", changed_fields: ["label"] }),
    ),
    false,
  );
});

test("blocks automatic, reverted, and reversal events", () => {
  assert.equal(canRevertAuditLog(createLog({ origin: "SYSTEM" })), false);
  assert.equal(
    canRevertAuditLog(createLog({ reverted_at: "2026-10-05T12:05:00.000Z" })),
    false,
  );
  assert.equal(
    canRevertAuditLog(createLog({ reverts_log_id: "previous-log-id" })),
    false,
  );
});
