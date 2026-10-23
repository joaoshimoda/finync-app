import assert from "node:assert/strict";
import test from "node:test";

import {
  compareByRelevantDate,
  escapeLikePattern,
  matchesAmount,
  parseAmountQuery,
  rankByScore,
  scoreMatch,
} from "../lib/globalSearch.ts";

test("acha palavras em qualquer ordem, sem acento nem caixa", () => {
  assert.ok(scoreMatch("sao joao", "Farmácia São João") > 0);
  assert.ok(scoreMatch("joao farmacia", "Farmácia São João") > 0);
  assert.equal(scoreMatch("mercado", "Farmácia São João"), 0);
});

test("usa o contexto extra, como a categoria", () => {
  assert.ok(scoreMatch("saude", "Drogasil", "Saúde Nubank") > 0);
});

test("prefere o que começa com o termo", () => {
  const ranked = rankByScore(
    ["Supermercado Dia", "Mercado Livre", "Mercado"],
    (item) => scoreMatch("mercado", item),
    3,
  );

  assert.deepEqual(ranked, ["Mercado", "Mercado Livre", "Supermercado Dia"]);
});

test("entende valores digitados", () => {
  assert.equal(parseAmountQuery("45"), 45);
  assert.equal(parseAmountQuery("45,90"), 45.9);
  assert.equal(parseAmountQuery("R$ 1.234,56"), 1234.56);
  assert.equal(parseAmountQuery("ifood"), null);
  assert.equal(matchesAmount("45", 45.9), true);
  assert.equal(matchesAmount("45,90", 45.9), true);
  assert.equal(matchesAmount("45,90", 45), false);
});

test("protege curingas do LIKE", () => {
  assert.equal(escapeLikePattern("100%_ok"), String.raw`100\%\_ok`);
});

test("mostra antes o que já aconteceu, do mais novo ao mais antigo", () => {
  const dates = ["2027-01-05", "2026-09-05", "2026-10-05", "2026-11-05"];

  assert.deepEqual(
    dates.sort((left, right) => compareByRelevantDate(left, right, "2026-10-23")),
    ["2026-10-05", "2026-09-05", "2026-11-05", "2027-01-05"],
  );
});
