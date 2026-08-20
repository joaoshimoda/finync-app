import assert from "node:assert/strict";
import test from "node:test";

import { getSafeInternalRedirect } from "../lib/safeRedirect.ts";

test("mantém caminhos internos com query e hash", () => {
  assert.equal(
    getSafeInternalRedirect("/atualizar-senha?token=abc#form"),
    "/atualizar-senha?token=abc#form",
  );
});

test("bloqueia URLs absolutas e URLs relativas a protocolo", () => {
  assert.equal(getSafeInternalRedirect("https://example.com/phishing"), "/dashboard");
  assert.equal(getSafeInternalRedirect("//example.com/phishing"), "/dashboard");
});

test("usa fallback para destino vazio ou relativo", () => {
  assert.equal(getSafeInternalRedirect(null), "/dashboard");
  assert.equal(getSafeInternalRedirect("dashboard"), "/dashboard");
});
