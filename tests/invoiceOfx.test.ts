import assert from "node:assert/strict";
import test from "node:test";

import {
  decodeOfxBytes,
  isOfxContent,
  parseOfx,
  parseOfxDate,
} from "../lib/invoiceOfx.ts";
import { mapPdfTransaction } from "../lib/invoiceImport.ts";

const sgmlCardStatement = `OFXHEADER:100
DATA:OFXSGML
VERSION:102
ENCODING:USASCII
CHARSET:1252

<OFX>
<CREDITCARDMSGSRSV1>
<CCSTMTTRNRS>
<CCSTMTRS>
<CURDEF>BRL
<BANKTRANLIST>
<DTSTART>20261001000000[-3:BRT]
<DTEND>20261031000000[-3:BRT]
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20261005000000[-3:BRT]
<TRNAMT>-89.90
<FITID>abc-1
<MEMO>Mercado Livre - Parcela 2/5
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20261007
<TRNAMT>-1.234,56
<FITID>abc-2
<NAME>POSTO SHELL
<MEMO>POSTO SHELL SAO PAULO BR
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20261010120000
<TRNAMT>500.00
<FITID>abc-3
<MEMO>Pagamento recebido
</BANKTRANLIST>
</CCSTMTRS>
</CCSTMTTRNRS>
</CREDITCARDMSGSRSV1>
</OFX>`;

test("parseOfx reads unclosed SGML card statements", () => {
  const result = parseOfx(sgmlCardStatement);

  assert.equal(result.kind, "card");
  assert.deepEqual(result.transactions, [
    {
      amount: 89.9,
      date: "2026-10-05",
      description: "Mercado Livre - Parcela 2/5",
      fitId: "abc-1",
      isCredit: false,
    },
    {
      amount: 1234.56,
      date: "2026-10-07",
      description: "POSTO SHELL SAO PAULO BR",
      fitId: "abc-2",
      isCredit: false,
    },
    {
      amount: 500,
      date: "2026-10-10",
      description: "Pagamento recebido",
      fitId: "abc-3",
      isCredit: true,
    },
  ]);
});

test("parseOfx reads XML statements with closed tags and entities", () => {
  const result = parseOfx(`<?xml version="1.0"?>
<?OFX OFXHEADER="200" VERSION="211"?>
<OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS><BANKTRANLIST>
<STMTTRN><TRNTYPE>DEBIT</TRNTYPE><DTPOSTED>20260930</DTPOSTED><TRNAMT>-42.00</TRNAMT><NAME>Padaria</NAME><MEMO>P&amp;B Lanches</MEMO></STMTTRN>
</BANKTRANLIST></STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>`);

  assert.equal(result.kind, "bank");
  assert.equal(result.transactions.length, 1);
  assert.equal(result.transactions[0].description, "Padaria - P&B Lanches");
  assert.equal(result.transactions[0].date, "2026-09-30");
});

test("parseOfx rejects files that are not OFX", () => {
  assert.equal(isOfxContent("date,title,amount\n2026-10-01,Loja,10"), false);
  assert.throws(() => parseOfx("date,title,amount"), /OFX válido/);
});

test("parseOfxDate ignores time and timezone", () => {
  assert.equal(parseOfxDate("20261231235959.000[-3:BRT]"), "2026-12-31");
  assert.equal(parseOfxDate("20261340"), null);
  assert.equal(parseOfxDate(null), null);
});

test("decodeOfxBytes falls back to Windows-1252", () => {
  assert.equal(decodeOfxBytes(new TextEncoder().encode("Açaí")), "Açaí");
  assert.equal(decodeOfxBytes(new Uint8Array([0x41, 0xe7, 0x61, 0xed])), "Açaí");
});

test("OFX transactions flow through the shared import mapping", () => {
  const [installment, , payment] = parseOfx(sgmlCardStatement).transactions;
  const mapped = mapPdfTransaction(installment, {});

  assert.equal(mapped?.description, "Mercado Livre");
  assert.equal(mapped?.installmentNumber, 2);
  assert.equal(mapped?.installmentsTotal, 5);
  assert.equal(mapped?.type, "expense");
  assert.equal(mapPdfTransaction(payment, {})?.requiresReview, true);
});
