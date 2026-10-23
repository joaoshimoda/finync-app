import assert from "node:assert/strict";
import test from "node:test";

import { SUPABASE_PAGE_SIZE, fetchAllPages } from "../lib/supabasePaging.ts";

function fakeTable(size: number) {
  const rows = Array.from({ length: size }, (_, index) => index);
  const calls: Array<[number, number]> = [];

  return {
    calls,
    fetchPage: async (from: number, to: number) => {
      calls.push([from, to]);
      return { data: rows.slice(from, to + 1), error: null };
    },
  };
}

test("reads every page past the 1000-row limit", async () => {
  const table = fakeTable(2500);
  const rows = await fetchAllPages(table.fetchPage);

  assert.equal(rows.length, 2500);
  assert.equal(rows[2499], 2499);
  assert.deepEqual(table.calls, [
    [0, SUPABASE_PAGE_SIZE - 1],
    [SUPABASE_PAGE_SIZE, 2 * SUPABASE_PAGE_SIZE - 1],
    [2 * SUPABASE_PAGE_SIZE, 3 * SUPABASE_PAGE_SIZE - 1],
  ]);
});

test("stops after a single short page", async () => {
  const table = fakeTable(12);

  assert.equal((await fetchAllPages(table.fetchPage)).length, 12);
  assert.equal(table.calls.length, 1);
});

test("asks once more when the last page is exactly full", async () => {
  const table = fakeTable(SUPABASE_PAGE_SIZE);

  assert.equal((await fetchAllPages(table.fetchPage)).length, SUPABASE_PAGE_SIZE);
  assert.equal(table.calls.length, 2);
});

test("throws the query error", async () => {
  const failure = new Error("network");

  await assert.rejects(
    fetchAllPages(async () => ({ data: null, error: failure })),
    failure,
  );
});
