export const MONTH_NAMES_PT_BR = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
] as const;

export type MonthNamePtBr = (typeof MONTH_NAMES_PT_BR)[number];
export type ViewMode = "total" | "atual";
export type SortColumn = "valor" | "dia" | "despesa";
export type SortDirection = 1 | -1;

export interface TagLike {
  id?: string;
  label: string;
  cor?: string;
  color?: string;
  icone?: string;
  icon?: string;
}

export interface IncomeEntry {
  id: string;
  label: string;
  value: number;
}

export interface FixedExpense {
  dia?: number;
  despesa?: string;
  valor?: number;
  situacao?: string;
  dono?: string;
  tags?: string[];
  obs?: string;
  recorrente?: boolean;
}

export interface CardExpense {
  data?: number;
  despesa?: string;
  parcela?: number;
  nParcelas?: number;
  cartao?: string;
  valor?: number;
  situacao?: string;
  dono?: string;
  tags?: string[];
  obs?: string;
  splitWith?: string[];
  assinaturaDireta?: boolean;
}

export interface MonthData {
  gastos_fixos?: FixedExpense[];
  [cardKey: `cartao_${string}`]: CardExpense[] | undefined;
}

export type FinanceData = Record<string, MonthData>;
export type IncomeData = Record<string, IncomeEntry[]>;

export interface CardCalculation {
  euTotal: number;
  euConf: number;
  euPend: number;
  euPago: number;
  euAtual: number;
  displayed?: number;
  depMap: Record<
    string,
    { total: number; conf: number; pend: number; pago: number; atual: number }
  >;
}

export interface MonthCalculation {
  fixosTotal: number;
  fixosPago: number;
  fixosAberto: number;
  cartoes: Record<string, CardCalculation & { displayed: number }>;
  nubank: CardCalculation & { displayed: number };
  itau: CardCalculation & { displayed: number };
  meuTotal: number;
  renda: number;
  saldo: number;
}

export interface ParsedInvoiceTransaction {
  data: number;
  despesa: string;
  valor: number;
  parcela: 1;
  nParcelas: 1;
  situacao: "CONFIRMADO";
  dono: "eu";
}

interface BankImportProfile {
  detect: (line: string) => boolean;
  parse: (parts: string[]) => { dia: number; despesa: string; valor: number };
}

const DATE_REGEX = /^(\d{1,2})[/-](\d{1,2})(?:[/-]\d{2,4})?/;
const FREE_TEXT_VALUE_REGEX =
  /(?:R\$\s*)?(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})\s*$/i;

export function safeJsonParse<T>(value: string | null | undefined, fallback: T): T {
  try {
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function normalizeText(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function escapeSingleQuotes(value: string): string {
  return value.replace(/'/g, "\\'");
}

export function escapeHtmlAttribute(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function slugifyKey(value: string): string {
  return normalizeText(value).trim().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
}

export function formatCurrency(value: number | null | undefined): string {
  return `R$ ${(value || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatCompactCurrency(value: number | null | undefined): string {
  const numericValue = value || 0;
  const absoluteValue = Math.abs(numericValue);

  if (absoluteValue < 1000) {
    return formatCurrency(numericValue);
  }

  return `R$${numericValue < 0 ? "-" : ""}${(absoluteValue / 1000).toLocaleString(
    "pt-BR",
    {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    },
  )}k`;
}

export const formatMoney = formatCurrency;

export function parseCurrencyValue(raw: unknown): number {
  if (raw === undefined || raw === null) return Number.NaN;

  const value = String(raw).trim();
  if (!value) return Number.NaN;

  let normalized = value.replace(/[^\d,.\-()]/g, "").trim();
  const isNegative =
    normalized.includes("-") || (normalized.includes("(") && normalized.includes(")"));

  normalized = normalized.replace(/[\-()]/g, "");

  const lastComma = normalized.lastIndexOf(",");
  const lastDot = normalized.lastIndexOf(".");

  if (lastComma >= 0 && lastDot >= 0) {
    normalized =
      lastComma > lastDot
        ? normalized.replace(/\./g, "").replace(",", ".")
        : normalized.replace(/,/g, "");
  } else if (lastComma >= 0) {
    normalized = normalized.replace(/\./g, "").replace(",", ".");
  } else {
    normalized = normalized.replace(/,/g, "");
  }

  const parsed = Number.parseFloat(normalized);
  if (Number.isNaN(parsed)) return Number.NaN;

  return isNegative ? -Math.abs(parsed) : parsed;
}

export function parseMonthKey(monthKey: string): { month: MonthNamePtBr; year: number } | null {
  const [monthName, yearText] = String(monthKey || "").split(" ");
  const monthIndex = MONTH_NAMES_PT_BR.indexOf(monthName as MonthNamePtBr);
  const year = Number.parseInt(yearText || "0", 10);

  if (monthIndex < 0 || !year) return null;

  return { month: MONTH_NAMES_PT_BR[monthIndex], year };
}

export function monthAbsoluteIndex(monthKey: string): number | null {
  const parsed = parseMonthKey(monthKey);
  if (!parsed) return null;

  return parsed.year * 12 + MONTH_NAMES_PT_BR.indexOf(parsed.month);
}

export function compareMonthKeys(a: string, b: string): number {
  const absA = monthAbsoluteIndex(a);
  const absB = monthAbsoluteIndex(b);

  if (absA === null && absB === null) return 0;
  if (absA === null) return 1;
  if (absB === null) return -1;

  return absA - absB;
}

export function sortMonthKeys(monthKeys: string[]): string[] {
  return [...monthKeys].sort(compareMonthKeys);
}

export function getPreviousMonthKey(monthKey: string, availableMonthKeys: string[]): string | null {
  const sortedMonths = sortMonthKeys(availableMonthKeys);
  const index = sortedMonths.indexOf(monthKey);

  return index > 0 ? sortedMonths[index - 1] : null;
}

export function buildMonthKey(monthIndex: number, year: number): string {
  const normalizedIndex = ((monthIndex % 12) + 12) % 12;
  const yearOffset = Math.floor(monthIndex / 12);

  return `${MONTH_NAMES_PT_BR[normalizedIndex]} ${year + yearOffset}`;
}

export function getIncome(month: string, income: IncomeData): IncomeEntry[] {
  return income[month] || [{ id: "salario", label: "Salário", value: 0 }];
}

export function totalIncome(month: string, income: IncomeData): number {
  return getIncome(month, income).reduce((sum, entry) => sum + (entry.value || 0), 0);
}

export function isRecurringFixedExpense(expense: FixedExpense | null | undefined): boolean {
  return !(expense && expense.recorrente === false);
}

export function copyRecurringFixedExpenses(expenses: FixedExpense[]): FixedExpense[] {
  return expenses.filter(isRecurringFixedExpense).map((expense) => ({
    ...structuredClone(expense),
    situacao: "EM ABERTO",
  }));
}

export function splitOwners(
  item: Pick<CardExpense, "splitWith" | "dono"> | null | undefined,
  dependentIds: string[] = [],
): string[] {
  const dependentSet = new Set(dependentIds);
  let owners = Array.isArray(item?.splitWith) ? [...item.splitWith] : [item?.dono || "eu"];

  owners = owners.filter((owner, index, allOwners) => owner && allOwners.indexOf(owner) === index);
  owners = owners.filter((owner) => owner === "eu" || dependentSet.has(owner));

  return owners.length ? owners : ["eu"];
}

export function isMineItem(
  item: Pick<CardExpense, "splitWith" | "dono"> | null | undefined,
  dependentIds: string[] = [],
): boolean {
  return splitOwners(item, dependentIds).includes("eu");
}

export function calculateCard(
  transactions: CardExpense[],
  dependentIds: string[] = [],
): CardCalculation {
  const depMap: CardCalculation["depMap"] = {};
  let euTotal = 0;
  let euConf = 0;
  let euPend = 0;
  let euPago = 0;

  transactions.forEach((transaction) => {
    const status = transaction.situacao || "CONFIRMADO";
    const value = transaction.valor || 0;
    const owners = splitOwners(transaction, dependentIds);
    const share = owners.length ? value / owners.length : value;

    owners.forEach((owner) => {
      if (owner === "eu") {
        euTotal += share;
        if (status === "PAGO") euPago += share;
        else if (status === "PENDENTE") euPend += share;
        else euConf += share;
        return;
      }

      depMap[owner] ||= { total: 0, conf: 0, pend: 0, pago: 0, atual: 0 };
      depMap[owner].total += share;

      if (status === "PAGO") depMap[owner].pago += share;
      else if (status === "PENDENTE") depMap[owner].pend += share;
      else depMap[owner].conf += share;

      if (status !== "PENDENTE") depMap[owner].atual += share;
    });
  });

  return {
    euTotal,
    euConf,
    euPend,
    euPago,
    euAtual: euConf + euPago,
    depMap,
  };
}

export function calculateMonth(
  month: string,
  data: FinanceData,
  cardIds: string[],
  income: IncomeData = {},
  viewMode: ViewMode = "total",
  dependentIds: string[] = [],
): MonthCalculation {
  const monthData = data[month] || { gastos_fixos: [] };
  const fixedExpenses = monthData.gastos_fixos || [];
  const fixosTotal = fixedExpenses.reduce((sum, expense) => sum + (expense.valor || 0), 0);
  const fixosPago = fixedExpenses
    .filter((expense) => expense.situacao === "PAGO")
    .reduce((sum, expense) => sum + (expense.valor || 0), 0);

  const cartoes: MonthCalculation["cartoes"] = {};
  let cartoesTotal = 0;

  cardIds.forEach((cardId) => {
    const cardCalculation = calculateCard(monthData[`cartao_${cardId}`] || [], dependentIds);
    const displayed =
      viewMode === "total" ? cardCalculation.euTotal : cardCalculation.euAtual;

    cartoes[cardId] = { ...cardCalculation, displayed };
    cartoesTotal += displayed;
  });

  const renda = totalIncome(month, income);
  const meuTotal = fixosTotal + cartoesTotal;
  const emptyCard = {
    euTotal: 0,
    euConf: 0,
    euPend: 0,
    euPago: 0,
    euAtual: 0,
    displayed: 0,
    depMap: {},
  };

  return {
    fixosTotal,
    fixosPago,
    fixosAberto: fixosTotal - fixosPago,
    cartoes,
    nubank: cartoes.nubank || emptyCard,
    itau: cartoes.itau || emptyCard,
    meuTotal,
    renda,
    saldo: renda - meuTotal,
  };
}

export function calculateCommittedCardAmount(
  startMonth: string,
  cardId: string,
  data: FinanceData,
): number {
  const baseAbsoluteIndex = monthAbsoluteIndex(startMonth);
  if (baseAbsoluteIndex === null) return 0;

  return sortMonthKeys(Object.keys(data)).reduce((total, month) => {
    const absoluteIndex = monthAbsoluteIndex(month);
    if (absoluteIndex === null || absoluteIndex < baseAbsoluteIndex) return total;

    const transactions = data[month]?.[`cartao_${cardId}`] || [];
    const unpaidTotal = transactions
      .filter((transaction) => (transaction.situacao || "CONFIRMADO") !== "PAGO")
      .reduce((sum, transaction) => sum + (transaction.valor || 0), 0);

    return total + unpaidTotal;
  }, 0);
}

export function calculateAvailableLimit(
  month: string,
  cardId: string,
  limit: number,
  data: FinanceData,
): number | null {
  if (!limit) return null;

  return limit - calculateCommittedCardAmount(month, cardId, data);
}

export function calculateContinuingInstallments(
  fromMonthData: MonthData | undefined,
  cardIds: string[],
): Array<CardExpense & { tipo: string }> {
  if (!fromMonthData) return [];

  return cardIds.flatMap((cardId) => {
    const transactions = fromMonthData[`cartao_${cardId}`] || [];

    return transactions
      .filter(
        (transaction) =>
          (transaction.nParcelas || 1) > 1 &&
          (transaction.parcela || 1) < (transaction.nParcelas || 1),
      )
      .map((transaction) => ({
        ...transaction,
        parcela: (transaction.parcela || 1) + 1,
        situacao: "CONFIRMADO",
        tipo: cardId,
      }));
  });
}

export function isLastInstallment(transaction: Pick<CardExpense, "parcela" | "nParcelas">): boolean {
  return !!(
    transaction.nParcelas &&
    transaction.nParcelas > 1 &&
    transaction.parcela === transaction.nParcelas
  );
}

export function sortExpenses<T extends { valor?: number; dia?: number; data?: number; despesa?: string }>(
  expenses: T[],
  column: SortColumn,
  direction: SortDirection = 1,
): T[] {
  return [...expenses].sort((a, b) => {
    const value = (expense: T) => {
      if (column === "valor") return expense.valor || 0;
      if (column === "dia") return expense.dia || expense.data || 0;

      return (expense.despesa || "").toLowerCase();
    };
    const valueA = value(a);
    const valueB = value(b);

    return (valueA > valueB ? 1 : valueA < valueB ? -1 : 0) * direction;
  });
}

export const BANK_IMPORT_PROFILES: Record<string, BankImportProfile> = {
  nubank: {
    detect: (line) => /^\d{4}-\d{2}-\d{2}[,;]/.test(line),
    parse: (parts) => {
      const rawDate = parts[0].trim();
      const match = rawDate.match(/\d{4}-(\d{2})-(\d{2})/);
      const dia = match ? Number.parseInt(match[2], 10) : 5;
      const despesa = parts[1]?.trim() || "";
      const rawValue = parts[2]?.replace(/[R$\s]/g, "").replace(",", ".") || "";
      const valor = Math.abs(Number.parseFloat(rawValue));

      return { dia, despesa, valor };
    },
  },
  inter: {
    detect: (line) => /^\d{2}\/\d{2}\/\d{4}[;,]/.test(line),
    parse: (parts) => {
      const match = parts[0].trim().match(/^(\d{2})\/(\d{2})\/\d{4}/);
      const dia = match ? Number.parseInt(match[1], 10) : 5;
      const despesa = parts[1]?.trim() || "";
      const rawValue = parts[2]?.replace(/[R$\s]/g, "").replace(",", ".") || "";
      const valor = Math.abs(Number.parseFloat(rawValue));

      return { dia, despesa, valor };
    },
  },
  c6: {
    detect: (line) => /^\d{2}\/\d{2}[^/\d][^,;]*[,;]/.test(line),
    parse: (parts) => {
      const match = parts[0].trim().match(/^(\d{2})\/(\d{2})/);
      const dia = match ? Number.parseInt(match[1], 10) : 5;
      const despesa = parts[1]?.trim() || "";
      const rawValue = parts[2]?.replace(/[R$\s]/g, "").replace(",", ".") || "";
      const valor = Math.abs(Number.parseFloat(rawValue));

      return { dia, despesa, valor };
    },
  },
};

export function pickImportAmount(parts: string[]): number {
  const values = (parts || [])
    .map((part) => parseCurrencyValue(part))
    .filter((value) => !Number.isNaN(value) && Math.abs(value) > 0);

  if (!values.length) return Number.NaN;

  const positiveValues = values.map((value) => Math.abs(value)).filter((value) => value > 0);
  if (!positiveValues.length) return Number.NaN;

  return positiveValues.sort((a, b) => b - a)[0];
}

export function parseInvoiceLine(
  line: string,
  forcedProfile: string = "auto",
): ParsedInvoiceTransaction | null {
  const trimmedLine = line.trim();
  if (!trimmedLine || trimmedLine.length < 3) return null;
  if (/^(data|date|descri|title|valor|amount|lançamento)/i.test(trimmedLine)) return null;

  let dia = 5;
  let despesa = "";
  let valor = 0;

  const separator = /[,;|\t]/;
  const parts = trimmedLine.split(separator);
  const profileKey = forcedProfile.toLowerCase();

  for (const [key, profile] of Object.entries(BANK_IMPORT_PROFILES)) {
    if ((profileKey !== "auto" && profileKey !== key) || !profile.detect(trimmedLine)) {
      continue;
    }

    const result = profile.parse(parts);
    if (result.despesa && !Number.isNaN(result.valor) && result.valor > 0) {
      const cleanDescription = result.despesa
        .replace(/^[\s\-*•\d]+/, "")
        .trim()
        .slice(0, 60);

      if (cleanDescription) {
        return {
          data: result.dia,
          despesa: cleanDescription,
          valor: result.valor,
          parcela: 1,
          nParcelas: 1,
          situacao: "CONFIRMADO",
          dono: "eu",
        };
      }
    }

    break;
  }

  if (parts.length >= 3) {
    let valueIndex = -1;

    for (let index = parts.length - 1; index >= 0; index -= 1) {
      const parsedValue = Math.abs(parseCurrencyValue(parts[index]));

      if (!Number.isNaN(parsedValue) && parsedValue > 0) {
        valueIndex = index;
        valor = parsedValue;
        break;
      }
    }

    if ((Number.isNaN(valor) || valor <= 0) && parts.length >= 4) {
      valor = pickImportAmount(parts);
      valueIndex = parts.findIndex((part) => Math.abs(parseCurrencyValue(part)) === valor);
    }

    if (valueIndex >= 0 && !Number.isNaN(valor) && valor > 0) {
      const first = parts[0].trim().replace(/^"|"$/g, "");
      const second = (parts[1] || "").trim().replace(/^"|"$/g, "");

      if (DATE_REGEX.test(first)) {
        dia = Number.parseInt(first.match(DATE_REGEX)?.[1] || "5", 10);
        despesa = parts.filter((_, index) => index > 0 && index !== valueIndex).join(" ").trim();
      } else if (DATE_REGEX.test(second)) {
        dia = Number.parseInt(second.match(DATE_REGEX)?.[1] || "5", 10);
        despesa = parts.filter((_, index) => index !== 1 && index !== valueIndex).join(" ").trim();
      } else {
        despesa = parts.filter((_, index) => index !== valueIndex).join(" ").trim();
      }

      despesa = despesa
        .replace(/\b(d[ée]bito|cr[ée]dito|compra|lançamento|parcela)\b/gi, "")
        .replace(/\s+/g, " ")
        .trim();
    }
  } else if (parts.length === 2) {
    valor = parseCurrencyValue(parts[1].trim());
    if (!Number.isNaN(valor) && valor > 0) despesa = parts[0].trim();
  } else {
    const valueMatch = trimmedLine.match(FREE_TEXT_VALUE_REGEX);
    if (!valueMatch) return null;

    valor = parseCurrencyValue(valueMatch[0]);

    const lineWithoutValue = trimmedLine
      .slice(0, trimmedLine.lastIndexOf(valueMatch[0]))
      .trim();
    const dateMatch = lineWithoutValue.match(DATE_REGEX);

    if (dateMatch) {
      dia = Number.parseInt(dateMatch[1], 10);
      despesa = lineWithoutValue.slice(dateMatch[0].length).trim();
    } else {
      despesa = lineWithoutValue;
    }
  }

  if (!despesa || !valor || valor <= 0) return null;

  despesa = despesa
    .replace(/^[\s\-*•\d]+/, "")
    .replace(/\b(pagamento|saldo anterior|total da fatura|vencimento|cr[eé]dito|d[eé]bito)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);

  if (!despesa) return null;

  return {
    data: dia,
    despesa,
    valor,
    parcela: 1,
    nParcelas: 1,
    situacao: "CONFIRMADO",
    dono: "eu",
  };
}

export function parseInvoiceText(
  text: string,
  forcedProfile: string = "auto",
): ParsedInvoiceTransaction[] {
  return text
    .split(/\r?\n/)
    .map((line) => parseInvoiceLine(line, forcedProfile))
    .filter((transaction): transaction is ParsedInvoiceTransaction => Boolean(transaction));
}

export function formatCalculatorValue(value: string): string {
  if (!value || value === "0") return "0";

  const numericValue = Number.parseFloat(value);
  if (Number.isNaN(numericValue)) return value.replace(".", ",");
  if (value.endsWith(".")) return `${value.slice(0, -1).replace(".", ",")},`;
  if (Number.isInteger(numericValue) && !value.includes(".")) {
    return numericValue.toLocaleString("pt-BR");
  }

  const [integerPart, decimalPart = ""] = value.split(".");
  const formattedInteger = Number.parseInt(integerPart || "0", 10).toLocaleString("pt-BR");

  return `${formattedInteger},${decimalPart}`;
}

export function formatCalculatorExpression(expression: string): string {
  return expression.replace(/\./g, ",");
}
