import { toDateOnly } from "./dateUtils.ts";
import { parseAmount } from "./invoiceImport.ts";

/* Reads OFX statements, the structured export most Brazilian banks offer.
   Handles both OFX 1.x (SGML, tags often left unclosed) and 2.x (XML).
   Pure and offline: the file never leaves the device. */

export type OfxInvoiceTransaction = {
  amount: number;
  date: string;
  description: string;
  fitId: string | null;
  isCredit: boolean;
};

export type OfxInvoiceResult = {
  /* "card" for credit card statements (CCSTMTRS), "bank" for accounts. */
  kind: "card" | "bank";
  transactions: OfxInvoiceTransaction[];
};

/* OFX 1.x files usually declare CHARSET:1252, but some banks send UTF-8
   anyway. Strict UTF-8 first, Windows-1252 when that fails. */
export function decodeOfxBytes(bytes: ArrayBuffer | Uint8Array) {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder("windows-1252").decode(bytes);
  }
}

export function isOfxContent(text: string) {
  return /OFXHEADER\s*:|<\?OFX\b|<OFX>/i.test(text.slice(0, 2048));
}

function decodeEntities(value: string) {
  return value
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&");
}

function getTagValue(block: string, tag: string) {
  const match = block.match(new RegExp(`<${tag}>([^<\\r\\n]*)`, "i"));
  const value = match ? decodeEntities(match[1]).replace(/\s+/g, " ").trim() : "";

  return value || null;
}

/* DTPOSTED is YYYYMMDD[HHMMSS[.XXX]][[offset:TZ]]; the day is what matters. */
export function parseOfxDate(value: string | null) {
  const match = value?.match(/^(\d{4})(\d{2})(\d{2})/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  return toDateOnly(year, month, day);
}

/* Banks fill NAME and MEMO differently: some leave one empty, some repeat
   the same text, some truncate NAME to 32 characters and keep the full
   text in MEMO. Prefer the longer one, and join them when they differ. */
function getDescription(block: string) {
  const name = getTagValue(block, "NAME");
  const memo = getTagValue(block, "MEMO");

  if (!name) return memo;
  if (!memo) return name;

  const normalizedName = name.toLowerCase();
  const normalizedMemo = memo.toLowerCase();

  if (normalizedMemo.includes(normalizedName)) return memo;
  if (normalizedName.includes(normalizedMemo)) return name;

  return `${name} - ${memo}`;
}

export function parseOfx(text: string): OfxInvoiceResult {
  if (!isOfxContent(text)) {
    throw new Error("O arquivo não parece ser um OFX válido.");
  }

  const kind = /<CCSTMTRS>/i.test(text) ? "card" : "bank";
  const transactions: OfxInvoiceTransaction[] = [];

  /* Each <STMTTRN> runs until its closing tag, or until the next one or the
     end of the list when the SGML variant leaves it open. */
  for (const chunk of text.split(/<STMTTRN>/i).slice(1)) {
    const block = chunk.split(/<\/STMTTRN>|<\/BANKTRANLIST>/i)[0];
    const date = parseOfxDate(getTagValue(block, "DTPOSTED"));
    const rawAmount = getTagValue(block, "TRNAMT");

    if (!date || !rawAmount) continue;

    const { amount, isNegative } = parseAmount(rawAmount);
    if (!amount) continue;

    /* OFX amounts are from the account's point of view: purchases come
       negative, payments and refunds positive. */
    transactions.push({
      amount,
      date,
      description: getDescription(block) ?? "Sem descrição",
      fitId: getTagValue(block, "FITID"),
      isCredit: !isNegative,
    });
  }

  return { kind, transactions };
}
