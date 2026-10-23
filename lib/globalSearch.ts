/* Matching and ranking for the global search: words in any order, accents
   and case ignored, better scores for matches at the start of the text, and
   amounts typed as numbers ("45", "45,90") matched against values. */

export function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/* 0 when there is no match; higher is better. `text` is the main label,
   `extra` adds searchable context (category, card, keywords). */
export function scoreMatch(query: string, text: string, extra = "") {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return 0;

  const label = normalizeSearchText(text);
  const haystack = `${label} ${normalizeSearchText(extra)}`;
  const tokens = normalizedQuery.split(" ");

  if (!tokens.every((token) => haystack.includes(token))) return 0;
  if (label === normalizedQuery) return 100;
  if (label.startsWith(normalizedQuery)) return 85;
  if (label.split(" ").some((word) => word.startsWith(tokens[0]))) return 65;
  if (label.includes(normalizedQuery)) return 50;
  return 30;
}

/* "45", "45,9", "1.234,56" or "R$ 45" read as an amount; null otherwise. */
export function parseAmountQuery(query: string) {
  const cleaned = query.replace(/r\$\s*/i, "").trim();
  if (!/^\d{1,3}(\.\d{3})*(,\d{1,2})?$|^\d+([.,]\d{1,2})?$/.test(cleaned)) return null;

  const normalized = cleaned.includes(",")
    ? cleaned.replace(/\./g, "").replace(",", ".")
    : cleaned;
  const value = Number(normalized);
  return Number.isFinite(value) && value > 0 ? value : null;
}

/* An amount query matches the exact value, or any value in the same whole
   number when no cents were typed ("45" finds 45,90). */
export function matchesAmount(query: string, amount: number) {
  const value = parseAmountQuery(query);
  if (value === null) return false;
  const hasCents = /[.,]\d{1,2}$/.test(query.trim());
  return hasCents ? Math.abs(amount - value) < 0.005 : Math.floor(amount) === Math.floor(value);
}

/* Escapes the wildcards of a SQL LIKE pattern. */
export function escapeLikePattern(value: string) {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}

export function rankByScore<T>(items: T[], getScore: (item: T) => number, limit: number) {
  return items
    .map((item) => ({ item, score: getScore(item) }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)
    .map((entry) => entry.item);
}

/* For equal scores: what already happened, newest first, then what is
   still ahead, soonest first. Dates are YYYY-MM-DD. */
export function compareByRelevantDate(left: string, right: string, today: string) {
  const leftIsFuture = left > today;
  const rightIsFuture = right > today;
  if (leftIsFuture !== rightIsFuture) return leftIsFuture ? 1 : -1;
  return leftIsFuture ? left.localeCompare(right) : right.localeCompare(left);
}
