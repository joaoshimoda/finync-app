import { CARD_CREDIT_ADJUSTMENT_CATEGORY } from "./cardCredits.ts";
import {
  getDateOnlyParts,
  getLocalTodayDateOnly,
  normalizeDateOnly,
  toDateOnly,
} from "./dateUtils.ts";
import type {
  PdfInvoiceBank,
  PdfInvoiceTransaction,
  PdfRejectedInvoiceLine,
} from "./invoicePdf.ts";

/* Pure helpers for importing a card invoice (CSV, PDF or OFX) or a bank
   account statement (OFX or CSV): parsing rows, installments, categories
   from history and the signatures used to spot duplicates. Kept free of
   React and Supabase so they can be tested. */

/* "card" imports an invoice into a card; "account" imports a bank
   statement, where entries land in the month of their own date. */
export type ImportMode = "card" | "account";

/* One line of a statement or invoice, already read from the file. */
export type StatementTransaction = {
  amount: number;
  date: string;
  description: string;
  isCredit: boolean;
};

/* In "card" mode a credit is a refund; in "account" mode it is money in. */
export type ParsedTransaction = {
  date: string;
  description: string;
  amount: number;
  category?: string | null;
  dependentId?: string | null;
  type: "credit" | "expense";
  projectFutureInstallments: boolean;
  referenceMonthOffset: number;
  installmentNumber: number;
  installmentsTotal: number;
  groupId?: string | null;
  owner: "me" | "dependent";
  requiresReview?: boolean;
  /* Why the line was flagged or left out, shown on its badge. */
  reviewReason?: string;
  reviewStatus?: "approved" | "ignored";
};

export type CsvRow = Record<string, unknown>;
export type SplitMode = "mine" | "dependent" | "split";
export type PdfReviewLine = Omit<PdfRejectedInvoiceLine, "amount" | "date"> & {
  amount: string;
  date: string;
  id: string;
};
export type PdfImportAudit = {
  bank: PdfInvoiceBank;
  ocrConfidence: number | null;
  recognizedCount: number;
  rejectedLines: PdfReviewLine[];
  totalPages: number;
  usedOcr: boolean;
};
export type ImportResultSummary = {
  mode: ImportMode;
  cardName: string;
  creditsCount: number;
  ignoredDuplicateCount: number;
  importedCount: number;
  invoiceMonthLabel: string;
  possibleDuplicateCount: number;
  reviewedCount: number;
  sourceLineCount: number;
};
export type ExistingImportTransaction = {
  import_signature: string | null;
  month_start: string | null;
  transaction_date: string | null;
  day: number | null;
  description: string | null;
  amount: number | string | null;
  installment_number: number | null;
  installments_total: number | null;
  dependent_id: string | null;
  notes: string | null;
};
export type PreparedImportTransaction = {
  sourceIndex: number;
  import_signature: string;
  card_id: string | null;
  dependent_id: string | null;
  group_id: string | null;
  month_start: string;
  transaction_date: string;
  type: "card" | "income" | "fixed";
  description: string;
  category: string;
  amount: number;
  day: number;
  status: "CONFIRMADO";
  owner: string;
  installment_number: number;
  installments_total: number;
  notes: string;
  recurring: false;
  direct_subscription: false;
  split_with: string[];
};

export const ignoredPaymentIndicators = [
  "pagamento",
  "pagamento recebido",
  "pagamento de fatura",
];
export const installmentPattern =
  /(?:\s*-\s*Parcela\s*|\s*-\s*|\s*\()?(\d{1,2})\/(\d{1,2})\)?$/i;
export const monthLabels = [
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
];
export function normalizeKey(value: string) {
  return value
    .replace(/^\uFEFF/, "")
    .replace(/^["']|["']$/g, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function normalizeDescriptionForCategory(value: string) {
  return normalizeKey(value)
    .replace(/\s*\(\d{1,2}\/\d{1,2}\)\s*$/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function findHistoricalCategory(
  description: string,
  categoryDictionary: Record<string, string>,
) {
  const normalizedDescription = normalizeDescriptionForCategory(description);

  if (!normalizedDescription) return null;
  if (categoryDictionary[normalizedDescription]) {
    return categoryDictionary[normalizedDescription];
  }

  const similarEntry = Object.entries(categoryDictionary).find(([key]) => {
    if (key.length < 4 || normalizedDescription.length < 4) return false;

    return (
      key.includes(normalizedDescription) || normalizedDescription.includes(key)
    );
  });

  return similarEntry?.[1] ?? null;
}

export function normalizeImportedExpenseCategory(category: string | null) {
  const normalizedCategory = category ? normalizeKey(category) : "";

  if (
    !normalizedCategory ||
    normalizedCategory === "cartao" ||
    normalizedCategory.includes("credito") ||
    normalizedCategory.includes("estorno")
  ) {
    return "Outros";
  }

  return category?.trim() || "Outros";
}

export function toImportAmountCents(amount: number | string | null | undefined) {
  const numericAmount =
    typeof amount === "string"
      ? Number(amount.replace(",", "."))
      : Number(amount);

  return Number.isFinite(numericAmount) ? Math.round(numericAmount * 100) : 0;
}

export function getImportSignature(transaction: {
  month_start?: string | null;
  transaction_date?: string | null;
  day?: number | null;
  description?: string | null;
  amount?: number | string | null;
  installment_number?: number | null;
  installments_total?: number | null;
}) {
  const monthStart = transaction.month_start
    ? normalizeDateOnly(transaction.month_start)
    : "";
  const transactionDay =
    transaction.day ??
    (transaction.transaction_date
      ? getDateOnlyParts(normalizeDateOnly(transaction.transaction_date)).day
      : "");

  return [
    monthStart,
    transactionDay,
    normalizeDescriptionForCategory(transaction.description ?? ""),
    toImportAmountCents(transaction.amount),
    transaction.installment_number ?? 1,
    transaction.installments_total ?? 1,
  ].join("|");
}

export function getLooseImportSignature(transaction: {
  month_start?: string | null;
  transaction_date?: string | null;
  day?: number | null;
  description?: string | null;
  amount?: number | string | null;
}) {
  const monthStart = transaction.month_start
    ? normalizeDateOnly(transaction.month_start)
    : "";
  const transactionDay =
    transaction.day ??
    (transaction.transaction_date
      ? getDateOnlyParts(normalizeDateOnly(transaction.transaction_date)).day
      : "");

  return [
    monthStart,
    transactionDay,
    normalizeDescriptionForCategory(transaction.description ?? ""),
    toImportAmountCents(transaction.amount),
  ].join("|");
}

export function getCrossMonthImportSignature(transaction: {
  transaction_date?: string | null;
  day?: number | null;
  description?: string | null;
  amount?: number | string | null;
}) {
  const transactionDay =
    transaction.day ??
    (transaction.transaction_date
      ? getDateOnlyParts(normalizeDateOnly(transaction.transaction_date)).day
      : "");

  return [
    transactionDay,
    normalizeDescriptionForCategory(transaction.description ?? ""),
    toImportAmountCents(transaction.amount),
  ].join("|");
}

export function parseAmount(value: string) {
  const rawAmount = String(value || "");
  const isNegative =
    rawAmount.includes("-") || /^\s*\(.*\)\s*$/.test(rawAmount);
  const digits = rawAmount.replace(/[^0-9,.]/g, "");
  /* The last separator is the decimal one when both appear ("1.234,56",
     "1,234.56"). A lone dot is decimal only with one or two digits after
     it ("312.45" from Nubank), otherwise it groups thousands ("1.500"). */
  const lastComma = digits.lastIndexOf(",");
  const lastDot = digits.lastIndexOf(".");
  const decimalIndex =
    lastComma >= 0 && lastDot >= 0
      ? Math.max(lastComma, lastDot)
      : lastComma >= 0
        ? lastComma
        : /\.\d{1,2}$/.test(digits)
          ? lastDot
          : -1;
  const cleanAmount =
    decimalIndex >= 0
      ? `${digits.slice(0, decimalIndex).replace(/[^0-9]/g, "")}.${digits.slice(decimalIndex + 1).replace(/[^0-9]/g, "")}`
      : digits.replace(/[^0-9]/g, "");
  const numericValue = parseFloat(cleanAmount) || 0;

  return {
    amount: numericValue,
    isNegative,
  };
}

export function getCsvCell(row: CsvRow, keys: string[], fallbackIndex: number) {
  const normalizedEntries = Object.entries(row)
    .filter(([key]) => key !== "__parsed_extra")
    .map(([key, value]) => ({
      key: normalizeKey(key),
      value,
    }));
  const normalizedKeys = keys.map(normalizeKey);
  const match = normalizedEntries.find((entry) =>
    normalizedKeys.includes(entry.key),
  );

  if (
    match?.value !== undefined &&
    match.value !== null &&
    String(match.value).trim()
  ) {
    return String(match.value);
  }

  const fallbackValue = normalizedEntries[fallbackIndex]?.value;

  return fallbackValue === undefined || fallbackValue === null
    ? ""
    : String(fallbackValue);
}

export function getCsvAmountCell(row: CsvRow) {
  const amount = getCsvCell(
    row,
    ["amount", "valor", "preco", "preço", "total"],
    2,
  );
  const parsedExtra = row.__parsed_extra;

  if (
    Array.isArray(parsedExtra) &&
    parsedExtra.length > 0 &&
    amount &&
    !amount.includes(",") &&
    /^\s*\d{1,2}\s*$/.test(String(parsedExtra[0]))
  ) {
    return `${amount},${parsedExtra[0]}`;
  }

  return amount;
}

export function parseCsvDate(value: string) {
  const normalizedValue = value.trim();

  if (!normalizedValue || normalizedValue === "-") {
    return getLocalTodayDateOnly();
  }

  if (/^\d{4}-\d{2}-\d{2}/.test(normalizedValue)) {
    return normalizeDateOnly(normalizedValue);
  }

  const brDateMatch = normalizedValue.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/,
  );
  if (brDateMatch) {
    const day = Number(brDateMatch[1]);
    const month = Number(brDateMatch[2]);
    const year = Number(
      brDateMatch[3].length === 2 ? `20${brDateMatch[3]}` : brDateMatch[3],
    );

    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      return toDateOnly(year, month, day);
    }
  }

  return normalizeDateOnly(normalizedValue);
}

export function addMonths(year: number, month: number, offset: number) {
  const date = new Date(year, month - 1 + offset, 1);

  return {
    month: date.getMonth() + 1,
    year: date.getFullYear(),
  };
}

export function getLastDayOfMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

export function addMonthsToDateOnly(dateOnly: string, offset: number) {
  const { day, month, year } = getDateOnlyParts(dateOnly);
  const target = addMonths(year, month, offset);
  const safeDay = Math.min(day, getLastDayOfMonth(target.year, target.month));

  return toDateOnly(target.year, target.month, safeDay);
}

export function parseInstallment(description: string) {
  const match = description.match(installmentPattern);

  if (!match) {
    return {
      cleanDescription: description.trim(),
      installmentNumber: 1,
      installmentsTotal: 1,
    };
  }

  const installmentNumber = Number(match[1]);
  const installmentsTotal = Number(match[2]);

  if (
    !Number.isInteger(installmentNumber) ||
    !Number.isInteger(installmentsTotal) ||
    installmentNumber < 1 ||
    installmentsTotal < 1 ||
    installmentNumber > installmentsTotal
  ) {
    return {
      cleanDescription: description.trim(),
      installmentNumber: 1,
      installmentsTotal: 1,
    };
  }

  return {
    cleanDescription: description.replace(installmentPattern, "").trim(),
    installmentNumber,
    installmentsTotal,
  };
}

export function shouldIgnoreImportedRow(description: string, isCredit: boolean) {
  if (isCredit) return false;

  const normalizedDescription = normalizeKey(description);

  return ignoredPaymentIndicators.some((indicator) =>
    normalizedDescription.includes(normalizeKey(indicator)),
  );
}

export function isAmbiguousPaymentCredit(description: string, isCredit: boolean) {
  if (!isCredit) return false;

  const normalizedDescription = normalizeKey(description);

  return ignoredPaymentIndicators.some((indicator) =>
    normalizedDescription.includes(normalizeKey(indicator)),
  );
}

export function getMonthStartFromReference(referenceMonth: string) {
  const { month, year } = getDateOnlyParts(referenceMonth);

  return toDateOnly(year, month, 1);
}

export function formatPreviewDate(dateOnly: string) {
  const { day, month } = getDateOnlyParts(dateOnly);

  return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}`;
}

export function formatInvoiceMonthLabel(monthStart: string) {
  const { month, year } = getDateOnlyParts(monthStart);

  return `${monthLabels[month - 1]} / ${year}`;
}

export function getReferenceMonthOptions() {
  const { month, year } = getDateOnlyParts(getLocalTodayDateOnly());

  return Array.from({ length: 6 }, (_, index) => {
    const item = addMonths(year, month, index - 2);
    const value = toDateOnly(item.year, item.month, 1);

    return {
      value,
      label: `${monthLabels[item.month - 1]} / ${item.year}`,
    };
  });
}

export function mapCsvRow(
  row: CsvRow,
  categoryDictionary: Record<string, string>,
): ParsedTransaction[] {
  const date = getCsvCell(row, ["date", "data"], 0).trim();
  const description = getCsvCell(
    row,
    ["title", "description", "descricao", "descrição", "estabelecimento"],
    1,
  ).trim();
  const amount = getCsvAmountCell(row).trim();

  if (!date && !description && !amount) return [];

  const parsedAmount = parseAmount(amount);
  if (shouldIgnoreImportedRow(description, parsedAmount.isNegative)) return [];

  const baseDate = parseCsvDate(date);
  const { cleanDescription, installmentNumber, installmentsTotal } =
    parseInstallment(description || "Sem descrição");
  const isCredit = parsedAmount.isNegative;
  const finalDescription = cleanDescription || "Sem descrição";
  const requiresReview = isAmbiguousPaymentCredit(finalDescription, isCredit);

  return [
    {
      date: baseDate,
      description: finalDescription,
      amount: Math.abs(parsedAmount.amount),
      category: isCredit
        ? CARD_CREDIT_ADJUSTMENT_CATEGORY
        : normalizeImportedExpenseCategory(
            findHistoricalCategory(finalDescription, categoryDictionary),
          ),
      dependentId: null,
      type: isCredit ? "credit" : "expense",
      projectFutureInstallments:
        !isCredit && installmentNumber < installmentsTotal,
      referenceMonthOffset: 0,
      installmentNumber: isCredit ? 1 : installmentNumber,
      installmentsTotal: isCredit ? 1 : installmentsTotal,
      owner: "me",
      requiresReview,
    },
  ];
}

export function mapPdfTransaction(
  transaction: PdfInvoiceTransaction | StatementTransaction,
  categoryDictionary: Record<string, string>,
): ParsedTransaction | null {
  if (shouldIgnoreImportedRow(transaction.description, transaction.isCredit)) {
    return null;
  }

  const { cleanDescription, installmentNumber, installmentsTotal } =
    parseInstallment(transaction.description);
  const isCredit = transaction.isCredit;
  const finalDescription = cleanDescription || "Sem descrição";

  return {
    date: transaction.date,
    description: finalDescription,
    amount: transaction.amount,
    category: isCredit
      ? CARD_CREDIT_ADJUSTMENT_CATEGORY
      : normalizeImportedExpenseCategory(
          findHistoricalCategory(finalDescription, categoryDictionary),
        ),
    dependentId: null,
    type: isCredit ? "credit" : "expense",
    projectFutureInstallments:
      !isCredit && installmentNumber < installmentsTotal,
    referenceMonthOffset: 0,
    installmentNumber: isCredit ? 1 : installmentNumber,
    installmentsTotal: isCredit ? 1 : installmentsTotal,
    owner: "me",
    requiresReview: isAmbiguousPaymentCredit(finalDescription, isCredit),
  };
}

export function parseCurrencyInput(value: string) {
  const numericValue = Number(
    value
      .replace(/[^0-9,.]/g, "")
      .replace(/\./g, "")
      .replace(",", "."),
  );

  return Number.isFinite(numericValue) ? numericValue : 0;
}

/* One parsed line becomes one row, or one row per remaining installment
   when future installments are projected. */
export function getRowsForImport(
  transaction: ParsedTransaction,
  createId: () => string = () => crypto.randomUUID(),
) {
  if (transaction.type === "credit") {
    return [transaction];
  }

  const groupId =
    transaction.installmentsTotal > 1
      ? (transaction.groupId ?? createId())
      : transaction.groupId;

  if (
    !transaction.projectFutureInstallments ||
    transaction.installmentNumber >= transaction.installmentsTotal
  ) {
    return [{ ...transaction, groupId }];
  }

  const remainingInstallments =
    transaction.installmentsTotal - transaction.installmentNumber + 1;
  const baseDescription = transaction.description.replace(
    /\s*\(\d{1,2}\/\d{1,2}\)$/,
    "",
  );

  return Array.from({ length: remainingInstallments }, (_, index) => {
    const installmentNumber = transaction.installmentNumber + index;

    return {
      ...transaction,
      date: addMonthsToDateOnly(transaction.date, index),
      description: baseDescription,
      groupId,
      installmentNumber,
      referenceMonthOffset: index,
    };
  });
}

/* Bank statements ---------------------------------------------------------- */

/* Paying the card bill moves money that the invoice import already counts,
   purchase by purchase. Importing it as well would count it twice. */
const cardBillPaymentIndicators = [
  "pagamento de fatura",
  "pagamento fatura",
  "pagto fatura",
  "pgto fatura",
  "pag fatura",
  "fatura cartao",
  "fatura do cartao",
  "pagamento cartao",
  "pagamento de cartao",
  "pgto cartao",
  "cartao de credito",
];
/* Money moved between the user's own accounts or investments: neither an
   expense nor income, so the user decides. */
const internalMovementIndicators = [
  "transferencia entre contas",
  "mesma titularidade",
  "aplicacao",
  "resgate",
  "rdb",
  "cdb",
  "lci",
  "lca",
  "poupanca",
  "tesouro direto",
  "investimento",
];
const salaryIndicators = ["salario", "folha de pagamento", "proventos"];

function hasIndicator(description: string, indicators: string[]) {
  const text = ` ${normalizeDescriptionForCategory(description)} `;

  return indicators.some((indicator) => text.includes(` ${indicator} `));
}

export function isCardBillPayment(description: string) {
  return hasIndicator(description, cardBillPaymentIndicators);
}

export function isInternalMovement(description: string) {
  return hasIndicator(description, internalMovementIndicators);
}

/* Bank CSVs are from the account's point of view, the opposite of card
   CSVs: negative amounts are money out. */
export function getCsvStatementTransaction(
  row: CsvRow,
): StatementTransaction | null {
  const date = getCsvCell(row, ["date", "data", "data lancamento"], 0).trim();
  const description = getCsvCell(
    row,
    ["title", "description", "descricao", "descrição", "historico", "histórico", "lancamento"],
    1,
  ).trim();
  const amount = getCsvAmountCell(row).trim();

  if (!date || !amount) return null;

  const parsedAmount = parseAmount(amount);
  if (!parsedAmount.amount) return null;

  return {
    amount: parsedAmount.amount,
    date: parseCsvDate(date),
    description,
    isCredit: !parsedAmount.isNegative,
  };
}

/* Money in becomes income, money out a debit/Pix expense. Card bill
   payments start ignored and internal movements wait for review. */
export function mapStatementTransaction(
  transaction: StatementTransaction,
  expenseCategoryDictionary: Record<string, string>,
  incomeCategoryDictionary: Record<string, string>,
): ParsedTransaction {
  const description = transaction.description.trim() || "Sem descrição";
  const isCredit = transaction.isCredit;
  const isBillPayment = !isCredit && isCardBillPayment(description);
  const isInternal = !isBillPayment && isInternalMovement(description);

  return {
    date: transaction.date,
    description,
    amount: transaction.amount,
    category: isCredit
      ? (findHistoricalCategory(description, incomeCategoryDictionary) ??
        (hasIndicator(description, salaryIndicators) ? "Salário" : "Outras Receitas"))
      : normalizeImportedExpenseCategory(
          findHistoricalCategory(description, expenseCategoryDictionary),
        ),
    dependentId: null,
    type: isCredit ? "credit" : "expense",
    projectFutureInstallments: false,
    referenceMonthOffset: 0,
    installmentNumber: 1,
    installmentsTotal: 1,
    owner: "me",
    requiresReview: isInternal,
    reviewReason: isBillPayment
      ? "Pagamento de fatura"
      : isInternal
        ? "Transferência ou investimento? Confira"
        : undefined,
    reviewStatus: isBillPayment ? "ignored" : undefined,
  };
}

/* A statement goes entirely into the month the user picks. Until they pick
   one, suggest the month most of its lines fall in; on a tie, the later
   one, since a statement exported mid-cycle usually ends in the month it
   is about. */
export function getSuggestedStatementMonth(dates: string[]) {
  const counts = new Map<string, number>();

  dates.forEach((date) => {
    const monthStart = getMonthStartFromReference(date);
    counts.set(monthStart, (counts.get(monthStart) ?? 0) + 1);
  });

  let suggestion: string | null = null;
  let bestCount = 0;

  Array.from(counts.keys())
    .sort()
    .forEach((monthStart) => {
      const count = counts.get(monthStart) ?? 0;
      if (count >= bestCount) {
        suggestion = monthStart;
        bestCount = count;
      }
    });

  return suggestion;
}
