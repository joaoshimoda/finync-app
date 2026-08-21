"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  FileSpreadsheet,
  ListChecks,
  Split,
  Tags,
  UploadCloud,
  X,
} from "lucide-react";
import Papa from "papaparse";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { MobileTransactionItem } from "@/components/finance/MobileTransactionItem";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CARD_CREDIT_ADJUSTMENT_CATEGORY,
  CARD_CREDIT_ADJUSTMENT_NOTE,
} from "@/lib/cardCredits";
import { getCardInvoiceMonthStart } from "@/lib/cardBilling";
import {
  getDateOnlyParts,
  getLocalTodayDateOnly,
  normalizeDateOnly,
  toDateOnly,
} from "@/lib/dateUtils";
import { supabase } from "@/lib/supabaseClient";
import {
  addOccurrenceSignatures,
  getOccurrenceSignatureSet,
} from "@/lib/importOccurrences";
import {
  extractPdfInvoice,
  type PdfInvoiceBank,
  type PdfInvoiceTransaction,
  type PdfRejectedInvoiceLine,
} from "@/lib/invoicePdf";
import { cn } from "@/lib/utils";
import { useFinanceStore } from "@/store/useFinanceStore";

type ParsedTransaction = {
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
  reviewStatus?: "approved" | "ignored";
};

type CsvRow = Record<string, unknown>;
type SplitMode = "mine" | "dependent" | "split";
type PdfReviewLine = Omit<PdfRejectedInvoiceLine, "amount" | "date"> & {
  amount: string;
  date: string;
  id: string;
};
type PdfImportAudit = {
  bank: PdfInvoiceBank;
  recognizedCount: number;
  rejectedLines: PdfReviewLine[];
  totalPages: number;
};
type ImportResultSummary = {
  cardName: string;
  creditsCount: number;
  ignoredDuplicateCount: number;
  importedCount: number;
  invoiceMonthLabel: string;
  possibleDuplicateCount: number;
  reviewedCount: number;
  sourceLineCount: number;
};
type ExistingImportTransaction = {
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
type PreparedImportTransaction = {
  sourceIndex: number;
  import_signature: string;
  card_id: string;
  dependent_id: string | null;
  group_id: string | null;
  month_start: string;
  transaction_date: string;
  type: "card";
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

const brlFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const pdfBankLabels: Record<PdfInvoiceBank, string> = {
  generic: "Formato genérico",
  inter: "Banco Inter",
  nubank: "Nubank",
};

const ignoredPaymentIndicators = [
  "pagamento",
  "pagamento recebido",
  "pagamento de fatura",
];
const installmentPattern =
  /(?:\s*-\s*Parcela\s*|\s*-\s*|\s*\()?(\d{1,2})\/(\d{1,2})\)?$/i;
const monthLabels = [
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
function normalizeKey(value: string) {
  return value
    .replace(/^\uFEFF/, "")
    .replace(/^["']|["']$/g, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function normalizeDescriptionForCategory(value: string) {
  return normalizeKey(value)
    .replace(/\s*\(\d{1,2}\/\d{1,2}\)\s*$/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findHistoricalCategory(
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

function normalizeImportedExpenseCategory(category: string | null) {
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

function toImportAmountCents(amount: number | string | null | undefined) {
  const numericAmount =
    typeof amount === "string"
      ? Number(amount.replace(",", "."))
      : Number(amount);

  return Number.isFinite(numericAmount) ? Math.round(numericAmount * 100) : 0;
}

function getImportSignature(transaction: {
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

function getLooseImportSignature(transaction: {
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

function getCrossMonthImportSignature(transaction: {
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

function parseAmount(value: string) {
  const rawAmount = String(value || "");
  const isNegative =
    rawAmount.includes("-") || /^\s*\(.*\)\s*$/.test(rawAmount);
  let cleanAmount = rawAmount.replace(/[^0-9,]/g, "");
  cleanAmount = cleanAmount.replace(",", ".");
  const numericValue = parseFloat(cleanAmount) || 0;

  return {
    amount: numericValue,
    isNegative,
  };
}

function getCsvCell(row: CsvRow, keys: string[], fallbackIndex: number) {
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

function getCsvAmountCell(row: CsvRow) {
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

function parseCsvDate(value: string) {
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

function addMonths(year: number, month: number, offset: number) {
  const date = new Date(year, month - 1 + offset, 1);

  return {
    month: date.getMonth() + 1,
    year: date.getFullYear(),
  };
}

function getLastDayOfMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function addMonthsToDateOnly(dateOnly: string, offset: number) {
  const { day, month, year } = getDateOnlyParts(dateOnly);
  const target = addMonths(year, month, offset);
  const safeDay = Math.min(day, getLastDayOfMonth(target.year, target.month));

  return toDateOnly(target.year, target.month, safeDay);
}

function parseInstallment(description: string) {
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

function shouldIgnoreImportedRow(description: string, isCredit: boolean) {
  if (isCredit) return false;

  const normalizedDescription = normalizeKey(description);

  return ignoredPaymentIndicators.some((indicator) =>
    normalizedDescription.includes(normalizeKey(indicator)),
  );
}

function isAmbiguousPaymentCredit(description: string, isCredit: boolean) {
  if (!isCredit) return false;

  const normalizedDescription = normalizeKey(description);

  return ignoredPaymentIndicators.some((indicator) =>
    normalizedDescription.includes(normalizeKey(indicator)),
  );
}

function getMonthStartFromReference(referenceMonth: string) {
  const { month, year } = getDateOnlyParts(referenceMonth);

  return toDateOnly(year, month, 1);
}

function formatPreviewDate(dateOnly: string) {
  const { day, month } = getDateOnlyParts(dateOnly);

  return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}`;
}

function formatInvoiceMonthLabel(monthStart: string) {
  const { month, year } = getDateOnlyParts(monthStart);

  return `${monthLabels[month - 1]} / ${year}`;
}

function getReferenceMonthOptions() {
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

function mapCsvRow(
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

function mapPdfTransaction(
  transaction: PdfInvoiceTransaction,
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

export default function ImportarPage() {
  const cards = useFinanceStore((state) => state.cards);
  const dependents = useFinanceStore((state) => state.dependents);
  const categories = useFinanceStore((state) => state.categories);
  const fetchCards = useFinanceStore((state) => state.fetchCards);
  const fetchDependents = useFinanceStore((state) => state.fetchDependents);
  const fetchCategories = useFinanceStore((state) => state.fetchCategories);
  const [parsedData, setParsedData] = useState<ParsedTransaction[]>([]);
  const [historicalCategoryMap, setHistoricalCategoryMap] = useState<
    Record<string, string>
  >({});
  const [fileName, setFileName] = useState("");
  const [parseError, setParseError] = useState("");
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [pdfAudit, setPdfAudit] = useState<PdfImportAudit | null>(null);
  const [pdfReviewLineId, setPdfReviewLineId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [splitDialogIndex, setSplitDialogIndex] = useState<number | null>(null);
  const [splitMode, setSplitMode] = useState<SplitMode>("mine");
  const [splitDependentId, setSplitDependentId] = useState("");
  const [splitUserAmount, setSplitUserAmount] = useState("");
  const [existingImportSignatures, setExistingImportSignatures] = useState<
    Set<string>
  >(new Set());
  const [existingLooseImportSignatures, setExistingLooseImportSignatures] =
    useState<Set<string>>(new Set());
  const [
    existingCrossMonthImportSignatures,
    setExistingCrossMonthImportSignatures,
  ] = useState<Set<string>>(new Set());
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);
  const [lastImportSummary, setLastImportSummary] =
    useState<ImportResultSummary | null>(null);
  const referenceMonthOptions = useMemo(() => getReferenceMonthOptions(), []);
  const [referenceMonth, setReferenceMonth] = useState("");
  const [selectedCardId, setSelectedCardId] = useState("");

  useEffect(() => {
    void fetchCards();
    void fetchDependents();
    void fetchCategories();
  }, [fetchCards, fetchCategories, fetchDependents]);

  useEffect(() => {
    let isMounted = true;

    async function fetchHistoricalCategories() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) return;

      const { data, error } = await supabase
        .from("transactions")
        .select("description, category, created_at, month_start, day")
        .eq("user_id", user.id)
        .not("category", "is", null)
        .order("month_start", { ascending: false })
        .order("day", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(1000);

      if (error) {
        console.error("Erro ao buscar histórico de categorias:", error);
        return;
      }

      const nextCategoryMap = (data ?? []).reduce<Record<string, string>>(
        (acc, transaction) => {
          const description =
            typeof transaction.description === "string"
              ? transaction.description
              : "";
          const category =
            typeof transaction.category === "string"
              ? normalizeImportedExpenseCategory(transaction.category)
              : "";
          const key = normalizeDescriptionForCategory(description);

          if (key && category && !acc[key]) {
            acc[key] = category;
          }

          return acc;
        },
        {},
      );

      if (isMounted) {
        setHistoricalCategoryMap(nextCategoryMap);
      }
    }

    void fetchHistoricalCategories();

    return () => {
      isMounted = false;
    };
  }, []);

  const effectiveSelectedCardId = selectedCardId || cards[0]?.id || "";
  const effectiveSelectedCard = cards.find(
    (card) => card.id === effectiveSelectedCardId,
  );
  const effectiveReferenceMonth =
    referenceMonth ||
    (effectiveSelectedCard
      ? getCardInvoiceMonthStart(
          getLocalTodayDateOnly(),
          effectiveSelectedCard.closingDay,
        )
      : getMonthStartFromReference(getLocalTodayDateOnly()));

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];

      if (!file) return;

      setParseError("");
      setLastImportSummary(null);
      setFileName(file.name);
      setPdfAudit(null);

      const isPdf =
        file.type === "application/pdf" ||
        file.name.toLowerCase().endsWith(".pdf");

      if (isPdf) {
        setIsParsingFile(true);

        try {
          const result = await extractPdfInvoice(file, effectiveReferenceMonth);
          const rows = result.transactions
            .map((transaction) =>
              mapPdfTransaction(transaction, historicalCategoryMap),
            )
            .filter((transaction): transaction is ParsedTransaction =>
              Boolean(transaction),
            );

          setParsedData(rows);
          setPdfAudit({
            bank: result.bank,
            recognizedCount: rows.length,
            rejectedLines: result.rejectedLines.map((line, index) => ({
              ...line,
              amount: line.amount ? String(line.amount) : "",
              date: line.date ?? "",
              id: `${index}-${line.raw}`,
            })),
            totalPages: result.totalPages,
          });

          if (!rows.length) {
            setParseError(
              "O PDF foi lido, mas não encontramos transações. Confira o mês da fatura ou tente o CSV do banco.",
            );
          }
        } catch (error) {
          setParsedData([]);
          setParseError(
            error instanceof Error
              ? error.message
              : "Não foi possível ler o PDF. Verifique o arquivo e tente novamente.",
          );
        } finally {
          setIsParsingFile(false);
        }

        return;
      }

      Papa.parse<CsvRow>(file, {
        header: true,
        skipEmptyLines: true,
        delimitersToGuess: [",", ";", "\t", "|"],
        transformHeader: (header) => normalizeKey(header),
        complete: (result) => {
          const rows = result.data.flatMap((row) =>
            mapCsvRow(row, historicalCategoryMap),
          );

          setParsedData(rows);

          if (!rows.length) {
            setParseError("Não encontramos transações válidas nesse arquivo.");
          }
        },
        error: () => {
          setParsedData([]);
          setParseError(
            "Não foi possível ler o CSV. Verifique o arquivo e tente novamente.",
          );
        },
      });
    },
    [effectiveReferenceMonth, historicalCategoryMap],
  );

  const { getInputProps, getRootProps, isDragActive, isDragReject } =
    useDropzone({
      accept: {
        "application/pdf": [".pdf"],
        "text/csv": [".csv"],
        "application/vnd.ms-excel": [".csv"],
      },
      disabled: !effectiveSelectedCardId || isParsingFile,
      maxFiles: 1,
      multiple: false,
      onDrop,
    });

  const previewRows = useMemo(() => {
    const monthStart = getMonthStartFromReference(effectiveReferenceMonth);

    return parsedData.map((transaction) => ({
      ...transaction,
      invoiceMonthStart: addMonthsToDateOnly(
        monthStart,
        transaction.referenceMonthOffset,
      ),
    }));
  }, [effectiveReferenceMonth, parsedData]);
  const preparedImportRows = useMemo<PreparedImportTransaction[]>(() => {
    const monthStart = getMonthStartFromReference(effectiveReferenceMonth);

    const baseRows = parsedData.flatMap((sourceTransaction, sourceIndex) => {
      if (sourceTransaction.reviewStatus === "ignored") return [];

      return getRowsForImport(sourceTransaction).map((transaction) => {
        const dependent = transaction.dependentId
          ? dependents.find((item) => item.id === transaction.dependentId)
          : null;
        const owner = dependent?.name ?? "eu";

        const preparedTransaction: Omit<
          PreparedImportTransaction,
          "import_signature"
        > = {
          sourceIndex,
          card_id: effectiveSelectedCardId,
          dependent_id: transaction.dependentId ?? null,
          group_id: transaction.groupId ?? null,
          month_start: addMonthsToDateOnly(
            monthStart,
            transaction.referenceMonthOffset,
          ),
          transaction_date: transaction.date,
          type: "card",
          description: transaction.description,
          category:
            transaction.type === "credit"
              ? CARD_CREDIT_ADJUSTMENT_CATEGORY
              : normalizeImportedExpenseCategory(transaction.category ?? null),
          amount: transaction.amount,
          day: getDateOnlyParts(transaction.date).day,
          status: "CONFIRMADO",
          owner,
          installment_number: transaction.installmentNumber,
          installments_total: transaction.installmentsTotal,
          notes:
            transaction.type === "credit"
              ? `${CARD_CREDIT_ADJUSTMENT_NOTE} Importado de ${fileName}`
              : `Importado de ${fileName}`,
          recurring: false,
          direct_subscription: false,
          split_with: [dependent?.id ?? "eu"],
        };

        return {
          ...preparedTransaction,
          import_signature: getImportSignature(preparedTransaction),
        };
      });
    });

    return addOccurrenceSignatures(baseRows, getImportSignature);
  }, [
    dependents,
    effectiveReferenceMonth,
    effectiveSelectedCardId,
    fileName,
    parsedData,
  ]);
  useEffect(() => {
    let isMounted = true;

    async function fetchExistingImportSignatures() {
      if (!preparedImportRows.length || !effectiveSelectedCardId) {
        if (isMounted) {
          setExistingImportSignatures(new Set());
          setExistingLooseImportSignatures(new Set());
          setExistingCrossMonthImportSignatures(new Set());
          setIsCheckingDuplicates(false);
        }
        return;
      }

      setIsCheckingDuplicates(true);

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          if (isMounted) {
            setExistingImportSignatures(new Set());
            setExistingLooseImportSignatures(new Set());
            setExistingCrossMonthImportSignatures(new Set());
          }
          return;
        }

        const invoiceMonths = Array.from(
          new Set(
            preparedImportRows.map((transaction) => transaction.month_start),
          ),
        );
        const invoiceMonthsWithAdjacent = Array.from(
          new Set(
            invoiceMonths.flatMap((monthStart) => [
              addMonthsToDateOnly(monthStart, -1),
              monthStart,
              addMonthsToDateOnly(monthStart, 1),
            ]),
          ),
        );
        const { data, error } = await supabase
          .from("transactions")
          .select(
            "import_signature, month_start, transaction_date, day, description, amount, installment_number, installments_total, dependent_id, notes",
          )
          .eq("user_id", user.id)
          .eq("card_id", effectiveSelectedCardId)
          .in("month_start", invoiceMonthsWithAdjacent);

        if (error) throw error;

        if (isMounted) {
          const existingRows = (data ?? []) as ExistingImportTransaction[];
          const previouslyImportedRows = existingRows.filter((row) =>
            row.notes?.includes("Importado de"),
          );
          const occurrenceSignatures = getOccurrenceSignatureSet(
            previouslyImportedRows,
            getImportSignature,
          );

          setExistingImportSignatures(
            new Set([
              ...occurrenceSignatures,
              ...previouslyImportedRows.flatMap((row) =>
                row.import_signature ? [row.import_signature] : [],
              ),
            ]),
          );
          setExistingLooseImportSignatures(
            new Set(
              existingRows
                .filter(
                  (row) =>
                    row.month_start &&
                    invoiceMonths.includes(normalizeDateOnly(row.month_start)),
                )
                .map(getLooseImportSignature),
            ),
          );
          setExistingCrossMonthImportSignatures(
            new Set(existingRows.map(getCrossMonthImportSignature)),
          );
        }
      } catch (error) {
        console.error("Erro ao verificar duplicidade da importação:", error);
        if (isMounted) {
          setExistingImportSignatures(new Set());
          setExistingLooseImportSignatures(new Set());
          setExistingCrossMonthImportSignatures(new Set());
        }
      } finally {
        if (isMounted) setIsCheckingDuplicates(false);
      }
    }

    void fetchExistingImportSignatures();

    return () => {
      isMounted = false;
    };
  }, [effectiveSelectedCardId, preparedImportRows]);

  const importDuplicateState = useMemo(() => {
    const importableRows: PreparedImportTransaction[] = [];
    const duplicateSourceIndexes = new Set<number>();
    const newSourceIndexes = new Set<number>();
    const partialDuplicateSourceIndexes = new Set<number>();
    const possibleDuplicateSourceIndexes = new Set<number>();
    const sourceStats = new Map<
      number,
      {
        duplicateCount: number;
        importableCount: number;
        possibleDuplicateCount: number;
      }
    >();
    let newCount = 0;
    let duplicateCount = 0;
    let possibleDuplicateCount = 0;

    preparedImportRows.forEach((transaction) => {
      const sourceStat = sourceStats.get(transaction.sourceIndex) ?? {
        duplicateCount: 0,
        importableCount: 0,
        possibleDuplicateCount: 0,
      };
      const signature = transaction.import_signature;
      const looseSignature = getLooseImportSignature(transaction);
      const crossMonthSignature = getCrossMonthImportSignature(transaction);
      const isDuplicate = existingImportSignatures.has(signature);
      const isPossibleDuplicate =
        !isDuplicate &&
        (existingLooseImportSignatures.has(looseSignature) ||
          existingCrossMonthImportSignatures.has(crossMonthSignature));

      if (isDuplicate) {
        sourceStat.duplicateCount += 1;
        duplicateCount += 1;
        sourceStats.set(transaction.sourceIndex, sourceStat);
        return;
      }

      if (isPossibleDuplicate) {
        sourceStat.possibleDuplicateCount += 1;
        possibleDuplicateCount += 1;
      }

      sourceStat.importableCount += 1;
      sourceStats.set(transaction.sourceIndex, sourceStat);
      importableRows.push(transaction);
      newCount += 1;
    });

    sourceStats.forEach((sourceStat, sourceIndex) => {
      if (sourceStat.importableCount > 0) {
        newSourceIndexes.add(sourceIndex);
      }

      if (sourceStat.duplicateCount > 0 && sourceStat.importableCount === 0) {
        duplicateSourceIndexes.add(sourceIndex);
      }

      if (sourceStat.duplicateCount > 0 && sourceStat.importableCount > 0) {
        partialDuplicateSourceIndexes.add(sourceIndex);
      }

      if (sourceStat.possibleDuplicateCount > 0) {
        possibleDuplicateSourceIndexes.add(sourceIndex);
      }
    });

    return {
      duplicateCount,
      duplicateSourceCount: duplicateSourceIndexes.size,
      duplicateSourceIndexes,
      importableRows,
      newCount,
      newSourceCount: newSourceIndexes.size,
      partialDuplicateSourceCount: partialDuplicateSourceIndexes.size,
      partialDuplicateSourceIndexes,
      possibleDuplicateCount,
      possibleDuplicateSourceCount: possibleDuplicateSourceIndexes.size,
      possibleDuplicateSourceIndexes,
    };
  }, [
    existingCrossMonthImportSignatures,
    existingImportSignatures,
    existingLooseImportSignatures,
    preparedImportRows,
  ]);
  const importPreviewSummary = useMemo(() => {
    const duplicateSourceIndexes = importDuplicateState.duplicateSourceIndexes;
    const possibleDuplicateSourceIndexes =
      importDuplicateState.possibleDuplicateSourceIndexes;
    const newRows = previewRows.filter(
      (transaction, index) =>
        transaction.reviewStatus !== "ignored" &&
        !duplicateSourceIndexes.has(index),
    );
    const totalAmount = newRows.reduce(
      (sum, transaction) =>
        sum +
        (transaction.type === "credit"
          ? -transaction.amount
          : transaction.amount),
      0,
    );
    const creditsCount = newRows.filter(
      (transaction) => transaction.type === "credit",
    ).length;
    const uncategorizedCount = newRows.filter(
      (transaction) =>
        transaction.type !== "credit" &&
        normalizeImportedExpenseCategory(transaction.category ?? null) ===
          "Outros",
    ).length;
    const installmentCount = newRows.filter(
      (transaction) =>
        transaction.type !== "credit" && transaction.installmentsTotal > 1,
    ).length;
    const reviewCount = newRows.filter(
      (transaction) => transaction.requiresReview,
    ).length;
    const pendingReviewCount = newRows.filter(
      (transaction, index) =>
        transaction.reviewStatus !== "approved" &&
        (transaction.requiresReview ||
          possibleDuplicateSourceIndexes.has(index)),
    ).length;

    return {
      creditsCount,
      installmentCount,
      pendingReviewCount,
      reviewCount,
      totalAmount,
      uncategorizedCount,
    };
  }, [
    importDuplicateState.duplicateSourceIndexes,
    importDuplicateState.possibleDuplicateSourceIndexes,
    previewRows,
  ]);
  const importButtonLabel = useMemo(() => {
    if (isSubmitting) return "Importando...";
    if (isCheckingDuplicates) return "Verificando...";

    const quantityLabel = `${importDuplicateState.newSourceCount} linha${
      importDuplicateState.newSourceCount === 1 ? "" : "s"
    }`;
    const details = [
      importDuplicateState.duplicateSourceCount > 0
        ? `${importDuplicateState.duplicateSourceCount} duplicadas ignoradas`
        : null,
      importDuplicateState.partialDuplicateSourceCount > 0
        ? `${importDuplicateState.partialDuplicateSourceCount} parciais`
        : null,
      importPreviewSummary.pendingReviewCount > 0
        ? `${importPreviewSummary.pendingReviewCount} revisar`
        : null,
    ].filter(Boolean);

    return details.length
      ? `Importar ${quantityLabel} (${details.join(" · ")})`
      : `Importar ${quantityLabel}`;
  }, [
    importDuplicateState.duplicateSourceCount,
    importDuplicateState.newSourceCount,
    importDuplicateState.partialDuplicateSourceCount,
    importPreviewSummary.pendingReviewCount,
    isCheckingDuplicates,
    isSubmitting,
  ]);
  const categoryOptions = useMemo(() => {
    const categoryLabels = new Set(
      categories
        .filter((category) => category.kind === "expense")
        .map((category) => category.label),
    );

    Object.values(historicalCategoryMap).forEach((category) => {
      categoryLabels.add(normalizeImportedExpenseCategory(category));
    });

    parsedData.forEach((transaction) => {
      if (transaction.category && transaction.type !== "credit") {
        categoryLabels.add(
          normalizeImportedExpenseCategory(transaction.category),
        );
      }
    });

    categoryLabels.add("Outros");

    return Array.from(categoryLabels).sort((left, right) =>
      left.localeCompare(right, "pt-BR"),
    );
  }, [categories, historicalCategoryMap, parsedData]);
  const selectedSplitTransaction =
    splitDialogIndex === null ? null : (parsedData[splitDialogIndex] ?? null);
  const selectedPdfReviewLine =
    pdfAudit?.rejectedLines.find((line) => line.id === pdfReviewLineId) ?? null;
  const selectedPdfReviewIndex = selectedPdfReviewLine
    ? (pdfAudit?.rejectedLines.findIndex(
        (line) => line.id === selectedPdfReviewLine.id,
      ) ?? -1)
    : -1;
  const selectedSplitDependent = dependents.find(
    (dependent) => dependent.id === splitDependentId,
  );

  function getTransactionOwnerLabel(transaction: ParsedTransaction) {
    if (transaction.owner !== "dependent" || !transaction.dependentId) {
      return "Meu gasto";
    }

    return (
      dependents.find((dependent) => dependent.id === transaction.dependentId)
        ?.name ?? "Dependente"
    );
  }

  function openSplitDialog(transactionIndex: number) {
    const transaction = parsedData[transactionIndex];

    if (!transaction) return;

    setSplitDialogIndex(transactionIndex);
    setSplitMode(transaction.owner === "dependent" ? "dependent" : "mine");
    setSplitDependentId(transaction.dependentId ?? dependents[0]?.id ?? "");
    setSplitUserAmount((transaction.amount / 2).toFixed(2).replace(".", ","));
  }

  function closeSplitDialog() {
    setSplitDialogIndex(null);
    setSplitMode("mine");
    setSplitDependentId("");
    setSplitUserAmount("");
  }

  function parseCurrencyInput(value: string) {
    const numericValue = Number(
      value
        .replace(/[^0-9,.]/g, "")
        .replace(/\./g, "")
        .replace(",", "."),
    );

    return Number.isFinite(numericValue) ? numericValue : 0;
  }

  function getRowsForImport(transaction: ParsedTransaction) {
    if (
      transaction.type === "credit" ||
      !transaction.projectFutureInstallments ||
      transaction.installmentNumber >= transaction.installmentsTotal
    ) {
      return [transaction];
    }

    const remainingInstallments =
      transaction.installmentsTotal - transaction.installmentNumber + 1;
    const groupId = transaction.groupId ?? crypto.randomUUID();
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

  function applySplitConfiguration() {
    if (splitDialogIndex === null || !selectedSplitTransaction) return;

    if (splitMode !== "mine" && !splitDependentId) {
      toast.error("Selecione um dependente para continuar.");
      return;
    }

    if (splitMode === "mine") {
      setParsedData((currentRows) =>
        currentRows.map((transaction, index) =>
          index === splitDialogIndex
            ? { ...transaction, dependentId: null, owner: "me" }
            : transaction,
        ),
      );
      closeSplitDialog();
      return;
    }

    if (splitMode === "dependent") {
      setParsedData((currentRows) =>
        currentRows.map((transaction, index) =>
          index === splitDialogIndex
            ? {
                ...transaction,
                dependentId: splitDependentId,
                owner: "dependent",
              }
            : transaction,
        ),
      );
      closeSplitDialog();
      return;
    }

    const userAmount = parseCurrencyInput(splitUserAmount);
    const dependentAmount = Number(
      (selectedSplitTransaction.amount - userAmount).toFixed(2),
    );

    if (
      userAmount <= 0 ||
      dependentAmount <= 0 ||
      userAmount >= selectedSplitTransaction.amount
    ) {
      toast.error("Informe um valor válido para dividir o gasto.");
      return;
    }

    setParsedData((currentRows) =>
      currentRows.flatMap((transaction, index) => {
        if (index !== splitDialogIndex) return [transaction];

        return [
          {
            ...transaction,
            amount: Number(userAmount.toFixed(2)),
            dependentId: null,
            owner: "me" as const,
            projectFutureInstallments: transaction.projectFutureInstallments,
          },
          {
            ...transaction,
            amount: dependentAmount,
            dependentId: splitDependentId,
            owner: "dependent" as const,
            projectFutureInstallments: transaction.projectFutureInstallments,
          },
        ];
      }),
    );
    closeSplitDialog();
  }

  function resetImport(options?: { keepSummary?: boolean }) {
    setParsedData([]);
    setPdfAudit(null);
    setPdfReviewLineId(null);
    setFileName("");
    setParseError("");
    setIsSubmitting(false);
    if (!options?.keepSummary) {
      setLastImportSummary(null);
    }
  }

  function updateRejectedPdfLine(
    id: string,
    field: "amount" | "date" | "description" | "isCredit",
    value: string | boolean,
  ) {
    setPdfAudit((current) =>
      current
        ? {
            ...current,
            rejectedLines: current.rejectedLines.map((line) =>
              line.id === id ? { ...line, [field]: value } : line,
            ),
          }
        : current,
    );
  }

  function discardRejectedPdfLine(id: string) {
    setPdfAudit((current) =>
      current
        ? {
            ...current,
            rejectedLines: current.rejectedLines.filter(
              (line) => line.id !== id,
            ),
          }
        : current,
    );
  }

  function moveAfterPdfReview(id: string) {
    const lines = pdfAudit?.rejectedLines ?? [];
    const currentIndex = lines.findIndex((line) => line.id === id);
    const nextLine = lines[currentIndex + 1] ?? lines[currentIndex - 1];

    setPdfReviewLineId(nextLine?.id ?? null);
  }

  function addCorrectedPdfLine(line: PdfReviewLine) {
    const amount = Number(line.amount.replace(",", "."));

    if (!line.date || !line.description.trim() || !(amount > 0)) {
      toast.error("Preencha data, descrição e um valor maior que zero.");
      return false;
    }

    const transaction = mapPdfTransaction(
      {
        amount,
        date: normalizeDateOnly(line.date),
        description: line.description.trim(),
        isCredit: line.isCredit,
      },
      historicalCategoryMap,
    );

    if (!transaction) {
      toast.error("Essa linha parece ser um pagamento da fatura.");
      return false;
    }

    setParsedData((current) => [...current, transaction]);
    discardRejectedPdfLine(line.id);
    toast.success("Transação adicionada à prévia.");
    return true;
  }

  function removePreviewRow(indexToRemove: number) {
    setParsedData((currentRows) =>
      currentRows.map((transaction, index) =>
        index === indexToRemove
          ? { ...transaction, reviewStatus: "ignored" }
          : transaction,
      ),
    );
  }

  function approvePreviewRow(indexToApprove: number) {
    setParsedData((currentRows) =>
      currentRows.map((transaction, index) =>
        index === indexToApprove
          ? { ...transaction, reviewStatus: "approved" }
          : transaction,
      ),
    );
  }

  async function handleImport() {
    if (!parsedData.length) return;

    if (!effectiveSelectedCardId) {
      toast.error("Selecione um cartão para importar a fatura.");
      return;
    }

    setIsSubmitting(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw userError ?? new Error("Usuário não autenticado.");
      }

      const { error: profileError } = await supabase.from("users").upsert(
        {
          id: user.id,
          email: user.email,
          plan: "free",
        },
        { onConflict: "id" },
      );

      if (profileError) throw profileError;

      const uniqueData = importDuplicateState.importableRows.map(
        ({ sourceIndex, ...transaction }) => {
          void sourceIndex;

          return {
            ...transaction,
            user_id: user.id,
          };
        },
      );
      const duplicateCount = importDuplicateState.duplicateCount;

      if (!uniqueData.length) {
        toast.info("Todos os lançamentos dessa fatura já existem.");
        return;
      }

      const { data: insertedRows, error } = await supabase
        .from("transactions")
        .upsert(uniqueData, {
          ignoreDuplicates: true,
          onConflict: "user_id,card_id,import_signature",
        })
        .select("id");

      if (error) throw error;

      const importedCount = insertedRows?.length ?? uniqueData.length;
      const databaseIgnoredCount = Math.max(
        uniqueData.length - importedCount,
        0,
      );
      const ignoredDuplicateCount = duplicateCount + databaseIgnoredCount;
      const summary: ImportResultSummary = {
        cardName: effectiveSelectedCard?.name ?? "Cartão",
        creditsCount: importPreviewSummary.creditsCount,
        ignoredDuplicateCount,
        importedCount,
        invoiceMonthLabel: formatInvoiceMonthLabel(effectiveReferenceMonth),
        possibleDuplicateCount:
          importDuplicateState.possibleDuplicateSourceCount,
        reviewedCount: Math.max(
          importPreviewSummary.reviewCount -
            importPreviewSummary.pendingReviewCount,
          0,
        ),
        sourceLineCount: importDuplicateState.newSourceCount,
      };

      setLastImportSummary(summary);
      toast.success(
        importedCount > 0
          ? `${importedCount} lançamentos importados.`
          : "Nenhum lançamento novo importado.",
        {
          action: {
            label: "Ver fatura",
            onClick: () => {
              window.location.href = "/dashboard/cards";
            },
          },
          description:
            ignoredDuplicateCount > 0
              ? `${ignoredDuplicateCount} duplicados ignorados.`
              : undefined,
        },
      );
      resetImport({ keepSummary: true });
    } catch (error) {
      console.error("Erro ao importar fatura:", error);
      toast.error("Não foi possível importar as transações.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex w-full flex-col gap-6 md:gap-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-50 md:text-3xl">
          Importar Fatura
        </h1>
        <p className="text-sm text-zinc-400">
          Envie um CSV ou PDF de cartão ou banco para revisar as transações
          antes de importar.
        </p>
      </header>

      <section className="grid gap-3 md:grid-cols-4">
        {[
          {
            title: "Cartão e fatura",
            description: "Defina a competência correta",
            active: parsedData.length > 0,
          },
          {
            title: "Enviar arquivo",
            description: fileName || "Selecione o arquivo",
            active: Boolean(fileName),
          },
          {
            title: "Revisar",
            description: parsedData.length
              ? `${parsedData.length} linhas encontradas`
              : "Aguardando arquivo",
            active: parsedData.length > 0,
          },
          {
            title: "Importar",
            description:
              importDuplicateState.newSourceCount ===
              importDuplicateState.newCount
                ? `${importDuplicateState.newSourceCount} linhas novas`
                : `${importDuplicateState.newSourceCount} linhas novas, ${importDuplicateState.newCount} lançamentos`,
            active: importDuplicateState.newCount > 0,
          },
        ].map((step, index) => (
          <div
            key={step.title}
            className={cn(
              "rounded-xl border p-3",
              step.active
                ? "border-emerald-500/30 bg-emerald-500/10"
                : "border-zinc-800 bg-zinc-950",
            )}
          >
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                  step.active
                    ? "bg-emerald-500 text-zinc-950"
                    : "bg-zinc-900 text-zinc-500",
                )}
              >
                {index + 1}
              </span>
              <p className="truncate text-sm font-medium text-zinc-100">
                {step.title}
              </p>
            </div>
            <p className="mt-2 truncate text-xs text-zinc-500">
              {step.description}
            </p>
          </div>
        ))}
      </section>

      {lastImportSummary && !parsedData.length ? (
        <Card className="border-zinc-800 bg-zinc-950 shadow-none">
          <CardHeader className="flex flex-col gap-4 border-b border-zinc-800/80 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CheckCircle2 className="size-5 text-emerald-300" />
                Importação concluída
              </CardTitle>
              <CardDescription>
                {lastImportSummary.cardName} ·{" "}
                {lastImportSummary.invoiceMonthLabel}
              </CardDescription>
            </div>
            <Button
              asChild
              className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
            >
              <Link href="/dashboard/cards">
                Ver fatura
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
            {[
              {
                label: "Importados",
                value: String(lastImportSummary.importedCount),
                tone: "text-emerald-300",
              },
              {
                label: "Duplicados ignorados",
                value: String(lastImportSummary.ignoredDuplicateCount),
                tone: "text-amber-300",
              },
              {
                label: "Linhas processadas",
                value: String(lastImportSummary.sourceLineCount),
                tone: "text-zinc-100",
              },
              {
                label: "Créditos/estornos",
                value: String(lastImportSummary.creditsCount),
                tone: "text-sky-300",
              },
              {
                label: "Revisados",
                value: String(lastImportSummary.reviewedCount),
                tone: "text-violet-300",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3"
              >
                <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                  {item.label}
                </p>
                <strong className={cn("mt-2 block text-xl", item.tone)}>
                  {item.value}
                </strong>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {pdfAudit ? (
        <div
          className={cn(
            "flex flex-col gap-3 rounded-xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
            pdfAudit.rejectedLines.length
              ? "border-amber-500/25 bg-amber-500/5"
              : "border-emerald-500/20 bg-emerald-500/5",
          )}
        >
          <div className="flex min-w-0 items-center gap-3">
            {pdfAudit.rejectedLines.length ? (
              <AlertTriangle className="size-5 shrink-0 text-amber-300" />
            ) : (
              <CheckCircle2 className="size-5 shrink-0 text-emerald-300" />
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium text-zinc-100">
                {pdfBankLabels[pdfAudit.bank]} · {pdfAudit.totalPages}{" "}
                {pdfAudit.totalPages === 1 ? "página" : "páginas"} ·{" "}
                {pdfAudit.recognizedCount} reconhecidas
              </p>
              <p className="mt-0.5 text-xs text-zinc-500">
                {pdfAudit.rejectedLines.length
                  ? `${pdfAudit.rejectedLines.length} pendência(s) aguardando revisão`
                  : "PDF processado sem pendências"}
              </p>
            </div>
          </div>

          {pdfAudit.rejectedLines.length ? (
            <Button
              type="button"
              variant="outline"
              className="shrink-0 border-amber-500/30 bg-transparent text-amber-200 hover:bg-amber-500/10 hover:text-amber-100"
              onClick={() =>
                setPdfReviewLineId(pdfAudit.rejectedLines[0]?.id ?? null)
              }
            >
              Revisar {pdfAudit.rejectedLines.length} pendência(s)
            </Button>
          ) : null}
        </div>
      ) : null}

      {!parsedData.length ? (
        <section className="grid gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <Card className="border-zinc-800 bg-zinc-950 shadow-none">
            <CardHeader>
              <CardTitle className="text-lg">Configurar importação</CardTitle>
              <CardDescription>
                Escolha o cartão e o mês da fatura antes de enviar o arquivo.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                  Selecionar Cartão
                </p>
                <Select
                  value={effectiveSelectedCardId}
                  onValueChange={(cardId) => {
                    setSelectedCardId(cardId);
                    setReferenceMonth("");
                  }}
                >
                  <SelectTrigger className="border-zinc-700 bg-zinc-900 text-zinc-100">
                    <SelectValue placeholder="Selecione um cartão" />
                  </SelectTrigger>
                  <SelectContent>
                    {cards.length ? (
                      cards.map((card) => (
                        <SelectItem key={card.id} value={card.id}>
                          {card.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="__no_cards__" disabled>
                        Nenhum cartão cadastrado
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                  Mês da fatura
                </p>
                <Select
                  value={effectiveReferenceMonth}
                  onValueChange={setReferenceMonth}
                >
                  <SelectTrigger className="border-zinc-700 bg-zinc-900 text-zinc-100">
                    <SelectValue placeholder="Selecione o mês da fatura" />
                  </SelectTrigger>
                  <SelectContent>
                    {referenceMonthOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3 text-xs leading-5 text-zinc-500">
                Valores negativos do CSV ou PDF serão tratados como
                Crédito/Estorno e abaterão a fatura no preview. PDFs escaneados
                ainda não são compatíveis.
              </div>
            </CardContent>
          </Card>

          <Card
            {...getRootProps()}
            className={cn(
              "cursor-pointer border-dashed border-zinc-700 bg-zinc-900/50 shadow-none transition-colors hover:border-emerald-500/70 hover:bg-zinc-900/70",
              (!effectiveSelectedCardId || isParsingFile) &&
                "pointer-events-none opacity-50",
              isDragActive && "border-emerald-500 bg-emerald-500/5",
              isDragReject && "border-red-500 bg-red-500/5",
            )}
          >
            <input {...getInputProps()} />
            <CardContent className="flex min-h-[360px] flex-col items-center justify-center px-6 py-12 text-center">
              <div className="flex size-16 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-950 text-emerald-300">
                <UploadCloud className="size-8" />
              </div>
              <h2 className="mt-6 text-xl font-semibold text-zinc-50">
                {isParsingFile
                  ? "Lendo sua fatura..."
                  : "Arraste sua fatura CSV ou PDF aqui"}
              </h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-zinc-400">
                {effectiveSelectedCardId
                  ? "PDFs digitais do Nubank e Inter, além de CSVs de bancos e planilhas."
                  : "Cadastre ou selecione um cartão para liberar o upload."}
              </p>
              <Button
                type="button"
                className="mt-8 bg-emerald-600 text-white hover:bg-emerald-700"
              >
                {isParsingFile ? "Processando..." : "Selecionar arquivo"}
              </Button>
              {parseError ? (
                <p className="mt-4 text-sm text-red-300">{parseError}</p>
              ) : null}
            </CardContent>
          </Card>
        </section>
      ) : (
        <Card className="border-zinc-800 bg-zinc-950 shadow-none">
          <CardHeader className="flex flex-col gap-4 border-b border-zinc-800/80 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="size-5 text-emerald-300" />
                Pré-visualização da fatura
              </CardTitle>
              <CardDescription>
                {fileName} · revise categorias, dependentes e parcelas antes de
                confirmar.
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="ghost"
              className="gap-2 text-zinc-300 hover:text-white"
              onClick={() => resetImport()}
              disabled={isSubmitting}
            >
              <X className="size-4" />
              Importar outro arquivo
            </Button>
          </CardHeader>

          <CardContent className="p-0">
            <div className="grid gap-4 border-b border-zinc-800/80 p-4 sm:grid-cols-2">
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Cartão selecionado
                </p>
                <p className="mt-2 text-sm font-medium text-zinc-100">
                  {effectiveSelectedCard?.name ?? "Cartão não encontrado"}
                </p>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Fatura selecionada
                </p>
                <p className="mt-2 text-sm font-medium text-zinc-100">
                  {formatInvoiceMonthLabel(effectiveReferenceMonth)}
                </p>
              </div>
            </div>

            <div className="border-b border-zinc-800/80 p-4">
              <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-10">
                {[
                  {
                    label: "Valor líquido",
                    value: brlFormatter.format(
                      importPreviewSummary.totalAmount,
                    ),
                    icon: FileSpreadsheet,
                    tone:
                      importPreviewSummary.totalAmount < 0
                        ? "text-emerald-300"
                        : "text-zinc-100",
                  },
                  {
                    label: "Linhas novas",
                    value: String(importDuplicateState.newSourceCount),
                    icon: CheckCircle2,
                    tone: "text-emerald-300",
                  },
                  {
                    label: "Lançamentos",
                    value: String(importDuplicateState.newCount),
                    icon: CheckCircle2,
                    tone: "text-emerald-300",
                  },
                  {
                    label: "Linhas duplicadas",
                    value: String(importDuplicateState.duplicateSourceCount),
                    icon: AlertTriangle,
                    tone: "text-amber-300",
                  },
                  {
                    label: "Possíveis duplicados",
                    value: String(
                      importDuplicateState.possibleDuplicateSourceCount,
                    ),
                    icon: AlertTriangle,
                    tone:
                      importDuplicateState.possibleDuplicateSourceCount > 0
                        ? "text-orange-300"
                        : "text-zinc-300",
                  },
                  {
                    label: "Pendentes",
                    value: String(importPreviewSummary.pendingReviewCount),
                    icon: AlertTriangle,
                    tone:
                      importPreviewSummary.pendingReviewCount > 0
                        ? "text-red-300"
                        : "text-zinc-300",
                  },
                  {
                    label: "Créditos",
                    value: String(importPreviewSummary.creditsCount),
                    icon: CreditCard,
                    tone: "text-sky-300",
                  },
                  {
                    label: "Revisar pagamentos",
                    value: String(importPreviewSummary.reviewCount),
                    icon: AlertTriangle,
                    tone:
                      importPreviewSummary.reviewCount > 0
                        ? "text-amber-300"
                        : "text-zinc-300",
                  },
                  {
                    label: "Sem categoria",
                    value: String(importPreviewSummary.uncategorizedCount),
                    icon: Tags,
                    tone: "text-zinc-300",
                  },
                  {
                    label: "Parceladas",
                    value: String(importPreviewSummary.installmentCount),
                    icon: ListChecks,
                    tone: "text-violet-300",
                  },
                ].map((item) => {
                  const Icon = item.icon;

                  return (
                    <div
                      key={item.label}
                      className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                          {item.label}
                        </p>
                        <Icon className="size-3.5 text-zinc-500" />
                      </div>
                      <strong className={cn("mt-2 block text-sm", item.tone)}>
                        {item.value}
                      </strong>
                    </div>
                  );
                })}
              </div>

              {isCheckingDuplicates ? (
                <p className="mt-3 text-xs text-zinc-500">
                  Verificando lançamentos já existentes no banco...
                </p>
              ) : null}
              {importPreviewSummary.pendingReviewCount > 0 ? (
                <p className="mt-3 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs leading-5 text-red-200">
                  Revise {importPreviewSummary.pendingReviewCount} item
                  {importPreviewSummary.pendingReviewCount === 1
                    ? ""
                    : "s"}{" "}
                  antes de importar. Aprove ou ignore cada linha marcada.
                </p>
              ) : null}
              {importPreviewSummary.reviewCount > 0 ? (
                <p className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs leading-5 text-amber-200">
                  Existem pagamentos recebidos no arquivo. Confira se eles são
                  abatimentos desta fatura ou pagamentos da fatura anterior.
                  Remova os que não pertencem a esta competência.
                </p>
              ) : null}
              {importDuplicateState.possibleDuplicateSourceCount > 0 ? (
                <p className="mt-3 rounded-lg border border-orange-500/20 bg-orange-500/10 px-3 py-2 text-xs leading-5 text-orange-200">
                  Existem lançamentos parecidos com transações já importadas,
                  possivelmente vinculadas a dependentes. Revise o responsável
                  antes de importar para evitar duplicidade.
                </p>
              ) : null}
            </div>

            <div className="overflow-hidden">
              <div className="flex flex-col gap-2 border-b border-zinc-800/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-zinc-100">
                    Revisar lançamentos
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    Duplicados serão ignorados. Ajuste categoria e responsável
                    antes de importar.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 text-[11px]">
                  <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-emerald-300">
                    Novo
                  </span>
                  <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-amber-300">
                    Duplicado
                  </span>
                  <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-amber-300">
                    Parcial
                  </span>
                  <span className="rounded-full border border-orange-500/20 bg-orange-500/10 px-2 py-1 text-orange-300">
                    Possível duplicado
                  </span>
                  <span className="rounded-full border border-sky-500/20 bg-sky-500/10 px-2 py-1 text-sky-300">
                    Crédito/Estorno
                  </span>
                </div>
              </div>

              <div className="space-y-3 p-3 md:hidden">
                {previewRows.map((transaction, index) => {
                  const isDuplicate =
                    importDuplicateState.duplicateSourceIndexes.has(index);
                  const isPossibleDuplicate =
                    importDuplicateState.possibleDuplicateSourceIndexes.has(
                      index,
                    );
                  const isPartialDuplicate =
                    importDuplicateState.partialDuplicateSourceIndexes.has(
                      index,
                    );
                  const isIgnored = transaction.reviewStatus === "ignored";
                  const isApproved = transaction.reviewStatus === "approved";
                  const isReviewPending =
                    !isDuplicate &&
                    !isIgnored &&
                    !isApproved &&
                    (transaction.requiresReview || isPossibleDuplicate);

                  return (
                    <div
                      key={`${transaction.description}-${index}`}
                      className={cn(
                        "rounded-2xl border border-zinc-800 bg-zinc-900/50 p-3",
                        (isDuplicate || isIgnored) && "opacity-60",
                        isPossibleDuplicate &&
                          "border-orange-500/30 bg-orange-500/5",
                        isPartialDuplicate &&
                          "border-amber-500/30 bg-amber-500/5",
                        isReviewPending && "border-red-500/30",
                      )}
                    >
                      <MobileTransactionItem
                        className="min-h-16 rounded-none border-0 bg-transparent p-0"
                        title={transaction.description}
                        category={
                          transaction.type === "credit"
                            ? CARD_CREDIT_ADJUSTMENT_CATEGORY
                            : transaction.category || "Sem categoria"
                        }
                        date={formatPreviewDate(transaction.date)}
                        amount={brlFormatter.format(transaction.amount)}
                        positive={transaction.type === "credit"}
                        trailing={
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-11 rounded-xl"
                            onClick={() => openSplitDialog(index)}
                            disabled={
                              transaction.type === "credit" ||
                              isDuplicate ||
                              isIgnored
                            }
                            aria-label="Dividir ou atribuir gasto"
                          >
                            <Split className="size-5" />
                          </Button>
                        }
                      />
                      {isDuplicate ? (
                        <span className="mt-2 inline-flex rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-300">
                          Já existe
                        </span>
                      ) : null}
                      {isPossibleDuplicate ? (
                        <span className="mt-2 ml-2 inline-flex rounded-full border border-orange-500/20 bg-orange-500/10 px-2 py-0.5 text-[11px] font-medium text-orange-300">
                          Possível duplicado
                        </span>
                      ) : null}
                      {transaction.requiresReview ? (
                        <span className="mt-2 ml-2 inline-flex rounded-full border border-sky-500/20 bg-sky-500/10 px-2 py-0.5 text-[11px] font-medium text-sky-300">
                          Revisar pagamento
                        </span>
                      ) : null}
                      {isApproved ? (
                        <span className="mt-2 ml-2 inline-flex rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-300">
                          Aprovado
                        </span>
                      ) : null}
                      {isIgnored ? (
                        <span className="mt-2 ml-2 inline-flex rounded-full border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-[11px] font-medium text-zinc-400">
                          Ignorado
                        </span>
                      ) : null}
                      <div className="mt-3 grid gap-3 border-t border-zinc-800 pt-3">
                        {transaction.type !== "credit" ? (
                          <Select
                            disabled={isDuplicate || isIgnored}
                            value={transaction.category || "__no_category__"}
                            onValueChange={(nextCategory) =>
                              setParsedData((currentRows) =>
                                currentRows.map((item, itemIndex) =>
                                  itemIndex === index
                                    ? {
                                        ...item,
                                        category:
                                          nextCategory === "__no_category__"
                                            ? null
                                            : nextCategory,
                                      }
                                    : item,
                                ),
                              )
                            }
                          >
                            <SelectTrigger className="h-11 border-zinc-700 bg-zinc-950 text-zinc-100">
                              <SelectValue placeholder="Categoria" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__no_category__">
                                Sem categoria
                              </SelectItem>
                              {categoryOptions.map((category) => (
                                <SelectItem key={category} value={category}>
                                  {category}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : null}
                        <div className="flex items-center justify-between text-xs text-zinc-400">
                          <span>{getTransactionOwnerLabel(transaction)}</span>
                          <span>
                            Fatura:{" "}
                            {formatInvoiceMonthLabel(
                              transaction.invoiceMonthStart,
                            )}
                          </span>
                          {transaction.installmentsTotal > 1 &&
                          transaction.type !== "credit" ? (
                            <label className="flex min-h-10 items-center gap-2">
                              <Checkbox
                                className="size-5"
                                disabled={isDuplicate || isIgnored}
                                checked={transaction.projectFutureInstallments}
                                onCheckedChange={(checked) =>
                                  setParsedData((currentRows) =>
                                    currentRows.map((item, itemIndex) =>
                                      itemIndex === index
                                        ? {
                                            ...item,
                                            projectFutureInstallments:
                                              checked === true,
                                          }
                                        : item,
                                    ),
                                  )
                                }
                              />
                              Projetar parcelas
                            </label>
                          ) : null}
                        </div>
                        {isReviewPending ? (
                          <div className="grid gap-2 sm:grid-cols-2">
                            <Button
                              type="button"
                              variant="outline"
                              className="h-10 justify-center border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10"
                              onClick={() => approvePreviewRow(index)}
                            >
                              Importar mesmo assim
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              className="h-10 justify-center text-zinc-400 hover:bg-red-950/40 hover:text-red-300"
                              onClick={() => removePreviewRow(index)}
                            >
                              <X className="size-4" />
                              Ignorar linha
                            </Button>
                          </div>
                        ) : !isIgnored ? (
                          <Button
                            type="button"
                            variant="ghost"
                            className="h-10 justify-center text-zinc-400 hover:bg-red-950/40 hover:text-red-300"
                            onClick={() => removePreviewRow(index)}
                          >
                            <X className="size-4" />
                            Ignorar linha
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>

              <Table className="hidden w-full table-fixed text-xs md:table">
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="w-[64px] px-3">Data</TableHead>
                    <TableHead className="w-[26%] px-3">Descrição</TableHead>
                    <TableHead className="w-[120px] px-3">Fatura</TableHead>
                    <TableHead className="w-[150px] px-3">Categoria</TableHead>
                    <TableHead className="w-[88px] px-3">Tipo</TableHead>
                    <TableHead className="w-[104px] px-3">Dono</TableHead>
                    <TableHead className="w-[120px] px-3">Parcelas</TableHead>
                    <TableHead className="w-[104px] px-3 text-right">
                      Valor
                    </TableHead>
                    <TableHead className="w-20 px-2" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewRows.map((transaction, index) => {
                    const isDuplicate =
                      importDuplicateState.duplicateSourceIndexes.has(index);
                    const isPossibleDuplicate =
                      importDuplicateState.possibleDuplicateSourceIndexes.has(
                        index,
                      );
                    const isPartialDuplicate =
                      importDuplicateState.partialDuplicateSourceIndexes.has(
                        index,
                      );
                    const isIgnored = transaction.reviewStatus === "ignored";
                    const isApproved = transaction.reviewStatus === "approved";
                    const isReviewPending =
                      !isDuplicate &&
                      !isIgnored &&
                      !isApproved &&
                      (transaction.requiresReview || isPossibleDuplicate);

                    return (
                      <TableRow
                        key={`${transaction.description}-${index}`}
                        className={cn(
                          (isDuplicate || isIgnored) && "opacity-60",
                          isPossibleDuplicate && "bg-orange-500/5",
                          isPartialDuplicate && "bg-amber-500/5",
                          isReviewPending && "bg-red-500/5",
                        )}
                      >
                        <TableCell className="px-3 text-zinc-400">
                          {formatPreviewDate(transaction.date)}
                        </TableCell>
                        <TableCell className="truncate px-3 font-medium text-zinc-100">
                          <div className="flex min-w-0 items-center gap-2">
                            <span
                              className="truncate"
                              title={transaction.description}
                            >
                              {transaction.description}
                            </span>
                            {isDuplicate ? (
                              <span className="shrink-0 rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-300">
                                Já existe
                              </span>
                            ) : null}
                            {isPossibleDuplicate ? (
                              <span className="shrink-0 rounded-full border border-orange-500/20 bg-orange-500/10 px-2 py-0.5 text-[10px] font-medium text-orange-300">
                                Possível duplicado
                              </span>
                            ) : null}
                            {transaction.requiresReview ? (
                              <span className="shrink-0 rounded-full border border-sky-500/20 bg-sky-500/10 px-2 py-0.5 text-[10px] font-medium text-sky-300">
                                Revisar
                              </span>
                            ) : null}
                            {isApproved ? (
                              <span className="shrink-0 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
                                Aprovado
                              </span>
                            ) : null}
                            {isIgnored ? (
                              <span className="shrink-0 rounded-full border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-[10px] font-medium text-zinc-400">
                                Ignorado
                              </span>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="truncate px-3 text-zinc-400">
                          {formatInvoiceMonthLabel(
                            transaction.invoiceMonthStart,
                          )}
                        </TableCell>
                        <TableCell className="px-3">
                          {transaction.type === "credit" ? (
                            <span className="block truncate text-xs text-zinc-400">
                              {CARD_CREDIT_ADJUSTMENT_CATEGORY}
                            </span>
                          ) : (
                            <Select
                              disabled={isDuplicate || isIgnored}
                              value={transaction.category || "__no_category__"}
                              onValueChange={(nextCategory) =>
                                setParsedData((currentRows) =>
                                  currentRows.map((item, itemIndex) =>
                                    itemIndex === index
                                      ? {
                                          ...item,
                                          category:
                                            nextCategory === "__no_category__"
                                              ? null
                                              : nextCategory,
                                        }
                                      : item,
                                  ),
                                )
                              }
                            >
                              <SelectTrigger className="h-8 w-full border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-100">
                                <SelectValue placeholder="Categoria" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__no_category__">
                                  Sem categoria
                                </SelectItem>
                                {categoryOptions.map((category) => (
                                  <SelectItem key={category} value={category}>
                                    {category}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </TableCell>
                        <TableCell className="truncate px-3 text-zinc-400">
                          {transaction.type === "credit" ? "Abate" : "Cartão"}
                        </TableCell>
                        <TableCell className="truncate px-3 text-zinc-400">
                          {getTransactionOwnerLabel(transaction)}
                        </TableCell>
                        <TableCell className="px-3 text-zinc-400">
                          {transaction.installmentsTotal > 1 &&
                          transaction.type !== "credit" ? (
                            <label className="flex items-center gap-1.5 text-xs">
                              <Checkbox
                                className="size-4"
                                disabled={isDuplicate || isIgnored}
                                checked={transaction.projectFutureInstallments}
                                onCheckedChange={(checked) =>
                                  setParsedData((currentRows) =>
                                    currentRows.map((item, itemIndex) =>
                                      itemIndex === index
                                        ? {
                                            ...item,
                                            projectFutureInstallments:
                                              checked === true,
                                          }
                                        : item,
                                    ),
                                  )
                                }
                              />
                              <span className="truncate">Projetar</span>
                            </label>
                          ) : (
                            <span className="text-xs text-zinc-600">—</span>
                          )}
                        </TableCell>
                        <TableCell className="px-3 text-right font-medium text-zinc-50">
                          {brlFormatter.format(transaction.amount)}
                        </TableCell>
                        <TableCell className="flex justify-end gap-1 px-2 text-right">
                          {!isIgnored ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              className="text-zinc-400 hover:bg-red-950/40 hover:text-red-300"
                              onClick={() => removePreviewRow(index)}
                              aria-label="Ignorar linha"
                            >
                              <X className="size-4" />
                            </Button>
                          ) : null}
                          {isReviewPending ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              className="text-emerald-300 hover:bg-emerald-500/10 hover:text-emerald-200"
                              onClick={() => approvePreviewRow(index)}
                              aria-label="Importar mesmo assim"
                            >
                              <CheckCircle2 className="size-4" />
                            </Button>
                          ) : null}
                          {transaction.type !== "credit" ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              className="text-zinc-400 hover:text-white"
                              onClick={() => openSplitDialog(index)}
                              disabled={isDuplicate || isIgnored}
                              aria-label="Dividir ou atribuir gasto"
                            >
                              <Split className="size-4" />
                            </Button>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-col gap-3 border-t border-zinc-800/80 p-4 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => resetImport()}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                className="bg-emerald-600 text-white hover:bg-emerald-700"
                onClick={() => void handleImport()}
                disabled={
                  isSubmitting ||
                  isCheckingDuplicates ||
                  !effectiveSelectedCardId ||
                  importPreviewSummary.pendingReviewCount > 0 ||
                  importDuplicateState.newCount === 0
                }
              >
                {importButtonLabel}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      <Dialog
        open={pdfReviewLineId !== null}
        onOpenChange={(open) => {
          if (!open) setPdfReviewLineId(null);
        }}
      >
        <DialogContent className="border border-zinc-800 bg-zinc-950 text-zinc-50 sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Revisar pendência do PDF</DialogTitle>
            <DialogDescription>
              {selectedPdfReviewLine && pdfAudit
                ? `Pendência ${selectedPdfReviewIndex + 1} de ${pdfAudit.rejectedLines.length}`
                : "Confira os dados antes de adicionar à prévia."}
            </DialogDescription>
          </DialogHeader>

          {selectedPdfReviewLine ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
                <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                  Texto encontrado no PDF
                </p>
                <p className="mt-2 break-words font-mono text-xs leading-5 text-zinc-300">
                  {selectedPdfReviewLine.raw}
                </p>
                <p className="mt-2 text-xs text-amber-300">
                  {selectedPdfReviewLine.reason}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-xs font-medium text-zinc-400">Data</p>
                  <Input
                    type="date"
                    value={selectedPdfReviewLine.date}
                    onChange={(event) =>
                      updateRejectedPdfLine(
                        selectedPdfReviewLine.id,
                        "date",
                        event.target.value,
                      )
                    }
                    className="border-zinc-700 bg-zinc-900"
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-medium text-zinc-400">Valor</p>
                  <Input
                    inputMode="decimal"
                    value={selectedPdfReviewLine.amount}
                    onChange={(event) =>
                      updateRejectedPdfLine(
                        selectedPdfReviewLine.id,
                        "amount",
                        event.target.value,
                      )
                    }
                    placeholder="0,00"
                    className="border-zinc-700 bg-zinc-900"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-zinc-400">Descrição</p>
                <Input
                  value={selectedPdfReviewLine.description}
                  onChange={(event) =>
                    updateRejectedPdfLine(
                      selectedPdfReviewLine.id,
                      "description",
                      event.target.value,
                    )
                  }
                  placeholder="Descrição da transação"
                  className="border-zinc-700 bg-zinc-900"
                />
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-zinc-400">Tipo</p>
                <Select
                  value={selectedPdfReviewLine.isCredit ? "credit" : "expense"}
                  onValueChange={(value) =>
                    updateRejectedPdfLine(
                      selectedPdfReviewLine.id,
                      "isCredit",
                      value === "credit",
                    )
                  }
                >
                  <SelectTrigger className="border-zinc-700 bg-zinc-900">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expense">Despesa</SelectItem>
                    <SelectItem value="credit">Crédito/Estorno</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {pdfAudit && pdfAudit.rejectedLines.length > 1 ? (
                <div className="flex items-center justify-between border-t border-zinc-800 pt-3">
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={selectedPdfReviewIndex <= 0}
                    onClick={() =>
                      setPdfReviewLineId(
                        pdfAudit.rejectedLines[selectedPdfReviewIndex - 1]
                          ?.id ?? null,
                      )
                    }
                  >
                    Anterior
                  </Button>
                  <span className="text-xs text-zinc-500">
                    {selectedPdfReviewIndex + 1} de{" "}
                    {pdfAudit.rejectedLines.length}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={
                      selectedPdfReviewIndex >=
                      pdfAudit.rejectedLines.length - 1
                    }
                    onClick={() =>
                      setPdfReviewLineId(
                        pdfAudit.rejectedLines[selectedPdfReviewIndex + 1]
                          ?.id ?? null,
                      )
                    }
                  >
                    Próxima
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}

          <DialogFooter className="border-zinc-800 bg-zinc-900/50 sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setPdfReviewLineId(null)}
            >
              Revisar depois
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={!selectedPdfReviewLine}
                onClick={() => {
                  if (!selectedPdfReviewLine) return;
                  moveAfterPdfReview(selectedPdfReviewLine.id);
                  discardRejectedPdfLine(selectedPdfReviewLine.id);
                }}
              >
                Ignorar
              </Button>
              <Button
                type="button"
                disabled={!selectedPdfReviewLine}
                className="bg-emerald-600 text-white hover:bg-emerald-700"
                onClick={() => {
                  if (!selectedPdfReviewLine) return;
                  if (addCorrectedPdfLine(selectedPdfReviewLine)) {
                    moveAfterPdfReview(selectedPdfReviewLine.id);
                  }
                }}
              >
                Adicionar à prévia
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={splitDialogIndex !== null}
        onOpenChange={(open) => {
          if (!open) closeSplitDialog();
        }}
      >
        <DialogContent className="border border-zinc-800 bg-zinc-950 text-zinc-50 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Dividir ou atribuir gasto</DialogTitle>
            <DialogDescription>
              Defina de quem é essa compra sem alterar o total da fatura do
              cartão.
            </DialogDescription>
          </DialogHeader>

          {selectedSplitTransaction ? (
            <div className="space-y-5">
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                <p className="text-sm font-medium text-zinc-100">
                  {selectedSplitTransaction.description}
                </p>
                <p className="mt-1 text-sm text-zinc-400">
                  {brlFormatter.format(selectedSplitTransaction.amount)}
                </p>
              </div>

              <div className="grid gap-3">
                {[
                  ["mine", "Meu Gasto", "100% atribuído a você"],
                  [
                    "dependent",
                    "Gasto de Dependente",
                    "100% atribuído a um dependente",
                  ],
                  [
                    "split",
                    "Dividir Gasto",
                    "Rachar entre você e um dependente",
                  ],
                ].map(([value, title, description]) => (
                  <button
                    key={value}
                    type="button"
                    className={cn(
                      "rounded-xl border p-3 text-left transition-colors",
                      splitMode === value
                        ? "border-emerald-500 bg-emerald-500/10"
                        : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700",
                    )}
                    onClick={() => setSplitMode(value as SplitMode)}
                  >
                    <span className="block text-sm font-medium text-zinc-100">
                      {title}
                    </span>
                    <span className="mt-1 block text-xs text-zinc-500">
                      {description}
                    </span>
                  </button>
                ))}
              </div>

              {splitMode !== "mine" ? (
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                    Dependente
                  </p>
                  <Select
                    value={splitDependentId}
                    onValueChange={setSplitDependentId}
                  >
                    <SelectTrigger className="border-zinc-700 bg-zinc-900 text-zinc-100">
                      <SelectValue placeholder="Selecione um dependente" />
                    </SelectTrigger>
                    <SelectContent>
                      {dependents.map((dependent) => (
                        <SelectItem key={dependent.id} value={dependent.id}>
                          {dependent.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}

              {splitMode === "split" ? (
                <div className="grid gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                      Sua parte
                    </p>
                    <Input
                      value={splitUserAmount}
                      onChange={(event) =>
                        setSplitUserAmount(event.target.value)
                      }
                      className="border-zinc-700 bg-zinc-900 text-zinc-100"
                      placeholder="0,00"
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                      Parte de {selectedSplitDependent?.name ?? "dependente"}
                    </p>
                    <div className="flex h-9 items-center rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-300">
                      {brlFormatter.format(
                        Math.max(
                          selectedSplitTransaction.amount -
                            parseCurrencyInput(splitUserAmount),
                          0,
                        ),
                      )}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          <DialogFooter className="border-zinc-800 bg-zinc-900/50">
            <Button type="button" variant="ghost" onClick={closeSplitDialog}>
              Cancelar
            </Button>
            <Button
              type="button"
              className="bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={applySplitConfiguration}
            >
              Aplicar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
