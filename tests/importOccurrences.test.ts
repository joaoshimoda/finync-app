import assert from "node:assert/strict";
import test from "node:test";

import {
  addOccurrenceSignatures,
  getOccurrenceSignatureSet,
} from "../lib/importOccurrences.ts";

type Row = { description: string; amount: number };
const signature = (row: Row) => `${row.description}|${row.amount}`;

test("preserva compras idênticas do mesmo arquivo como ocorrências diferentes", () => {
  const rows = addOccurrenceSignatures(
    [
      { description: "Uber", amount: 25 },
      { description: "Uber", amount: 25 },
    ],
    signature,
  );

  assert.deepEqual(
    rows.map((row) => row.import_signature),
    ["Uber|25|occ:1", "Uber|25|occ:2"],
  );
});

test("reimportação reconhece somente a quantidade de ocorrências já existente", () => {
  const existing = getOccurrenceSignatureSet(
    [{ description: "Uber", amount: 25 }],
    signature,
  );
  const incoming = addOccurrenceSignatures(
    [
      { description: "Uber", amount: 25 },
      { description: "Uber", amount: 25 },
    ],
    signature,
  );

  assert.equal(existing.has(incoming[0].import_signature), true);
  assert.equal(existing.has(incoming[1].import_signature), false);
});
