import assert from "node:assert/strict";
import test from "node:test";

import type { Tables } from "../lib/database.types.ts";
import {
  countByDay,
  getLogName,
  groupBursts,
  matchesSearch,
} from "../lib/activityFeed.ts";

type AuditLog = Tables<"audit_logs">;
let sequence = 0;

function log(overrides: Partial<AuditLog> = {}): AuditLog {
  sequence += 1;
  return {
    action: "CREATE",
    actor_id: "user-id",
    after_data: { description: `Compra ${sequence}`, category: "Lazer" },
    before_data: null,
    changed_fields: [],
    created_at: "2026-10-20T12:00:00.000Z",
    entity_id: `entity-${sequence}`,
    entity_type: "transactions",
    id: `log-${sequence}`,
    origin: "USER",
    reversal_log_id: null,
    reverted_at: null,
    reverted_by: null,
    reverts_log_id: null,
    user_id: "user-id",
    ...overrides,
  };
}

test("junta criações em sequência numa rajada", () => {
  const items = groupBursts([
    log({ created_at: "2026-10-20T12:05:00.000Z" }),
    log({ created_at: "2026-10-20T12:04:30.000Z" }),
    log({ created_at: "2026-10-20T12:04:00.000Z" }),
    log({ created_at: "2026-10-20T12:03:00.000Z", action: "UPDATE" }),
    log({ created_at: "2026-10-20T10:00:00.000Z" }),
  ]);

  assert.deepEqual(
    items.map((item) => (item.kind === "burst" ? `burst:${item.logs.length}` : "single")),
    ["burst:3", "single", "single"],
  );
});

test("não junta poucos eventos nem eventos distantes", () => {
  const items = groupBursts([
    log({ created_at: "2026-10-20T12:00:00.000Z" }),
    log({ created_at: "2026-10-20T11:00:00.000Z" }),
    log({ created_at: "2026-10-20T10:00:00.000Z" }),
  ]);

  assert.ok(items.every((item) => item.kind === "single"));
});

test("conta eventos por dia local", () => {
  const now = new Date(2026, 9, 20, 18);
  const days = countByDay(
    [log({ created_at: new Date(2026, 9, 20, 9).toISOString() }), log({ created_at: new Date(2026, 9, 18, 9).toISOString() })],
    3,
    now,
  );

  assert.deepEqual(
    days.map((day) => day.count),
    [1, 0, 1],
  );
});

test("busca ignora acentos e olha nome e categoria", () => {
  const item = log({ after_data: { description: "Farmácia São João", category: "Saúde" } });

  assert.equal(matchesSearch(item, "farmacia"), true);
  assert.equal(matchesSearch(item, "saude"), true);
  assert.equal(matchesSearch(item, "mercado"), false);
  assert.equal(getLogName(item), "Farmácia São João");
});
