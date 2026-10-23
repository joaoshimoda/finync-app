/* Parses an amount typed by the user in a form, the Brazilian way: comma is
   the decimal separator and dots group thousands ("6.500,00", "6.500").
   A lone dot followed by one or two digits is still read as a decimal
   ("12.5", "1234.56"), since that is how a number field or a paste from
   another app usually arrives. Returns NaN when nothing numeric was typed.

   Imported files use `parseCurrencyValue`, whose rules match bank exports. */
export function parseMoneyInput(raw: string | number | null | undefined) {
  if (typeof raw === "number") return raw;
  if (raw === null || raw === undefined) return Number.NaN;

  const cleaned = raw.replace(/[^\d,.-]/g, "");
  if (!/\d/.test(cleaned)) return Number.NaN;

  const isNegative = cleaned.startsWith("-");
  const unsigned = cleaned.replace(/-/g, "");
  const lastComma = unsigned.lastIndexOf(",");
  const lastDot = unsigned.lastIndexOf(".");
  let normalized: string;

  if (lastComma >= 0 && lastDot >= 0) {
    const decimalIndex = Math.max(lastComma, lastDot);
    normalized = `${unsigned.slice(0, decimalIndex).replace(/[.,]/g, "")}.${unsigned.slice(decimalIndex + 1)}`;
  } else if (lastComma >= 0) {
    normalized = `${unsigned.slice(0, lastComma).replace(/,/g, "")}.${unsigned.slice(lastComma + 1)}`;
  } else if (lastDot >= 0) {
    const isThousandsGrouping = /^[1-9]\d{0,2}(\.\d{3})+$/.test(unsigned);
    normalized = isThousandsGrouping
      ? unsigned.replace(/\./g, "")
      : `${unsigned.slice(0, lastDot).replace(/\./g, "")}.${unsigned.slice(lastDot + 1)}`;
  } else {
    normalized = unsigned;
  }

  const value = Number(normalized);
  if (!Number.isFinite(value)) return Number.NaN;

  return isNegative ? -value : value;
}
