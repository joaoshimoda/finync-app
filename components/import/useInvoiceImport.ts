"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Papa from "papaparse";
import { toast } from "sonner";

import {
  CARD_CREDIT_ADJUSTMENT_CATEGORY,
  CARD_CREDIT_ADJUSTMENT_NOTE,
} from "@/lib/cardCredits";
import { getCardInvoiceMonthStart } from "@/lib/cardBilling";
import {
  getDateOnlyParts,
  getLocalTodayDateOnly,
  normalizeDateOnly,
} from "@/lib/dateUtils";
import { reportAppError } from "@/lib/errorMonitoring";
import {
  addOccurrenceSignatures,
  getOccurrenceSignatureSet,
} from "@/lib/importOccurrences";
import {
  addMonthsToDateOnly,
  formatInvoiceMonthLabel,
  getCrossMonthImportSignature,
  getImportSignature,
  getLooseImportSignature,
  getMonthStartFromReference,
  getReferenceMonthOptions,
  getRowsForImport,
  mapCsvRow,
  mapPdfTransaction,
  normalizeDescriptionForCategory,
  normalizeImportedExpenseCategory,
  normalizeKey,
  type CsvRow,
  type ExistingImportTransaction,
  type ImportResultSummary,
  type ParsedTransaction,
  type PdfImportAudit,
  type PdfReviewLine,
  type PreparedImportTransaction,
} from "@/lib/invoiceImport";
import { extractPdfInvoice, type PdfOcrProgress } from "@/lib/invoicePdf";
import { parseMoneyInput } from "@/lib/moneyInput";
import { getSessionUser, supabase } from "@/lib/supabaseClient";
import { useFinanceStore } from "@/store/useFinanceStore";

export type RowState = {
  index: number;
  transaction: ParsedTransaction & { invoiceMonthStart: string };
  isDuplicate: boolean;
  isPartialDuplicate: boolean;
  isPossibleDuplicate: boolean;
  isIgnored: boolean;
  isApproved: boolean;
  isReviewPending: boolean;
  /* Rows that will not be imported and can no longer be edited. */
  isLocked: boolean;
};

/* State and rules of the invoice import: reading CSV/PDF, the preview the
   user edits, duplicate detection against what is already saved and the
   final insert. The page only renders what this returns. */
export function useInvoiceImport() {
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
  const [ocrProgress, setOcrProgress] = useState<PdfOcrProgress | null>(null);
  const pdfAbortControllerRef = useRef<AbortController | null>(null);
  const [pdfAudit, setPdfAudit] = useState<PdfImportAudit | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
      const user = await getSessionUser();

      if (!user) return;

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
        void reportAppError(error, {
          source: "SUPABASE",
          context: { operation: "Buscar histórico de categorias" },
        });
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
  const ocrProgressPercent = ocrProgress?.totalPages
    ? Math.round(
        ((ocrProgress.page -
          1 +
          (ocrProgress.stage === "recognizing" ? ocrProgress.progress : 0)) /
          ocrProgress.totalPages) *
          100,
      )
    : 0;
  const ocrProgressLabel = ocrProgress
    ? ocrProgress.stage === "loading"
      ? "Preparando reconhecimento de texto..."
      : ocrProgress.stage === "rendering"
        ? `Preparando página ${ocrProgress.page} de ${ocrProgress.totalPages}...`
        : `Reconhecendo página ${ocrProgress.page} de ${ocrProgress.totalPages}...`
    : "Lendo sua fatura...";

  const readFile = useCallback(
    async (file: File) => {
      setParseError("");
      setLastImportSummary(null);
      setFileName(file.name);
      setPdfAudit(null);

      const isPdf =
        file.type === "application/pdf" ||
        file.name.toLowerCase().endsWith(".pdf");

      if (isPdf) {
        setIsParsingFile(true);
        const abortController = new AbortController();
        pdfAbortControllerRef.current = abortController;

        try {
          const result = await extractPdfInvoice(file, effectiveReferenceMonth, {
            onProgress: setOcrProgress,
            signal: abortController.signal,
          });
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
            ocrConfidence: result.ocrConfidence,
            recognizedCount: rows.length,
            rejectedLines: result.rejectedLines.map((line, index) => ({
              ...line,
              amount: line.amount ? String(line.amount) : "",
              date: line.date ?? "",
              id: `${index}-${line.raw}`,
            })),
            totalPages: result.totalPages,
            usedOcr: result.usedOcr,
          });

          if (!rows.length && !result.rejectedLines.length) {
            setParseError(
              "O PDF foi lido, mas não encontramos transações. Confira o mês da fatura ou tente o CSV do banco.",
            );
          }
        } catch (error) {
          setParsedData([]);
          setParseError(
            error instanceof DOMException && error.name === "AbortError"
              ? "Leitura do PDF cancelada."
              : error instanceof Error
                ? error.message
                : "Não foi possível ler o PDF. Verifique o arquivo e tente novamente.",
          );
        } finally {
          setIsParsingFile(false);
          setOcrProgress(null);
          pdfAbortControllerRef.current = null;
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

  const cancelParsing = useCallback(() => {
    pdfAbortControllerRef.current?.abort();
  }, []);

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
        const user = await getSessionUser();

        if (!user) {
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
        void reportAppError(error, {
          source: "SUPABASE",
          context: { operation: "Verificar duplicidade da importação" },
        });
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
      }

      sourceStat.importableCount += 1;
      sourceStats.set(transaction.sourceIndex, sourceStat);
      importableRows.push(transaction);
      newCount += 1;
    });

    sourceStats.forEach((sourceStat, sourceIndex) => {
      if (sourceStat.importableCount > 0) newSourceIndexes.add(sourceIndex);
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
      duplicateSourceIndexes,
      importableRows,
      newCount,
      newSourceCount: newSourceIndexes.size,
      partialDuplicateSourceIndexes,
      possibleDuplicateSourceIndexes,
    };
  }, [
    existingCrossMonthImportSignatures,
    existingImportSignatures,
    existingLooseImportSignatures,
    preparedImportRows,
  ]);

  const rows = useMemo<RowState[]>(
    () =>
      previewRows.map((transaction, index) => {
        const isDuplicate = importDuplicateState.duplicateSourceIndexes.has(index);
        const isPossibleDuplicate =
          importDuplicateState.possibleDuplicateSourceIndexes.has(index);
        const isIgnored = transaction.reviewStatus === "ignored";
        const isApproved = transaction.reviewStatus === "approved";

        return {
          index,
          transaction,
          isDuplicate,
          isPartialDuplicate:
            importDuplicateState.partialDuplicateSourceIndexes.has(index),
          isPossibleDuplicate,
          isIgnored,
          isApproved,
          isReviewPending:
            !isDuplicate &&
            !isIgnored &&
            !isApproved &&
            Boolean(transaction.requiresReview || isPossibleDuplicate),
          isLocked: isDuplicate || isIgnored,
        };
      }),
    [importDuplicateState, previewRows],
  );

  const summary = useMemo(() => {
    const active = rows.filter((row) => !row.isLocked);
    const expenses = active.filter((row) => row.transaction.type !== "credit");
    const byCategory = new Map<string, number>();
    const byOwner = new Map<string, number>();

    expenses.forEach(({ transaction }) => {
      const category = normalizeImportedExpenseCategory(transaction.category ?? null);
      byCategory.set(category, (byCategory.get(category) ?? 0) + transaction.amount);
      const owner =
        transaction.owner === "dependent" && transaction.dependentId
          ? (dependents.find((item) => item.id === transaction.dependentId)?.name ??
            "Dependente")
          : "Você";
      byOwner.set(owner, (byOwner.get(owner) ?? 0) + transaction.amount);
    });

    const toSorted = (map: Map<string, number>) =>
      Array.from(map.entries())
        .map(([name, amount]) => ({ name, amount }))
        .sort((left, right) => right.amount - left.amount);

    return {
      totalAmount: active.reduce(
        (sum, { transaction }) =>
          sum + (transaction.type === "credit" ? -transaction.amount : transaction.amount),
        0,
      ),
      expensesAmount: expenses.reduce((sum, row) => sum + row.transaction.amount, 0),
      creditsAmount: active
        .filter((row) => row.transaction.type === "credit")
        .reduce((sum, row) => sum + row.transaction.amount, 0),
      creditsCount: active.filter((row) => row.transaction.type === "credit").length,
      uncategorizedCount: expenses.filter(
        (row) =>
          normalizeImportedExpenseCategory(row.transaction.category ?? null) === "Outros",
      ).length,
      installmentCount: expenses.filter((row) => row.transaction.installmentsTotal > 1)
        .length,
      reviewCount: active.filter((row) => row.transaction.requiresReview).length,
      pendingReviewCount: rows.filter((row) => row.isReviewPending).length,
      duplicateCount: rows.filter((row) => row.isDuplicate).length,
      ignoredCount: rows.filter((row) => row.isIgnored).length,
      possibleDuplicateCount: rows.filter((row) => row.isPossibleDuplicate).length,
      newSourceCount: importDuplicateState.newSourceCount,
      newCount: importDuplicateState.newCount,
      byCategory: toSorted(byCategory),
      byOwner: toSorted(byOwner),
    };
  }, [dependents, importDuplicateState, rows]);

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
        categoryLabels.add(normalizeImportedExpenseCategory(transaction.category));
      }
    });

    categoryLabels.add("Outros");

    return Array.from(categoryLabels).sort((left, right) =>
      left.localeCompare(right, "pt-BR"),
    );
  }, [categories, historicalCategoryMap, parsedData]);

  /* Editing ---------------------------------------------------------------- */

  const updateRows = useCallback(
    (indexes: number[], patch: (row: ParsedTransaction) => ParsedTransaction) => {
      const targets = new Set(indexes);
      setParsedData((current) =>
        current.map((row, index) => (targets.has(index) ? patch(row) : row)),
      );
    },
    [],
  );

  const setCategory = useCallback(
    (indexes: number[], category: string | null) =>
      updateRows(indexes, (row) =>
        row.type === "credit" ? row : { ...row, category },
      ),
    [updateRows],
  );

  /* Other expense rows with the same merchant, to offer the same category. */
  const getSimilarIndexes = useCallback(
    (index: number) => {
      const source = parsedData[index];
      if (!source) return [];
      const key = normalizeDescriptionForCategory(source.description);

      return parsedData.flatMap((row, rowIndex) =>
        rowIndex !== index &&
        row.type !== "credit" &&
        row.reviewStatus !== "ignored" &&
        normalizeDescriptionForCategory(row.description) === key
          ? [rowIndex]
          : [],
      );
    },
    [parsedData],
  );

  const setOwner = useCallback(
    (indexes: number[], dependentId: string | null) =>
      updateRows(indexes, (row) =>
        row.type === "credit"
          ? row
          : {
              ...row,
              dependentId,
              owner: dependentId ? "dependent" : "me",
            },
      ),
    [updateRows],
  );

  const setReviewStatus = useCallback(
    (indexes: number[], reviewStatus: "approved" | "ignored" | undefined) =>
      updateRows(indexes, (row) => ({ ...row, reviewStatus })),
    [updateRows],
  );

  const setProjectInstallments = useCallback(
    (index: number, value: boolean) =>
      updateRows([index], (row) => ({ ...row, projectFutureInstallments: value })),
    [updateRows],
  );

  /* Splits one line into the user's part and a dependent's part. */
  const splitRow = useCallback(
    (index: number, userAmount: number, dependentId: string) => {
      const source = parsedData[index];
      if (!source) return false;

      const dependentAmount = Number((source.amount - userAmount).toFixed(2));

      if (userAmount <= 0 || dependentAmount <= 0 || userAmount >= source.amount) {
        toast.error("Informe um valor válido para dividir o gasto.");
        return false;
      }

      setParsedData((current) =>
        current.flatMap((row, rowIndex) =>
          rowIndex !== index
            ? [row]
            : [
                {
                  ...row,
                  amount: Number(userAmount.toFixed(2)),
                  dependentId: null,
                  owner: "me" as const,
                },
                {
                  ...row,
                  amount: dependentAmount,
                  dependentId,
                  owner: "dependent" as const,
                },
              ],
        ),
      );
      return true;
    },
    [parsedData],
  );

  /* PDF lines the reader could not parse ---------------------------------- */

  const updateRejectedPdfLine = useCallback(
    (
      id: string,
      field: "amount" | "date" | "description" | "isCredit",
      value: string | boolean,
    ) => {
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
    },
    [],
  );

  const discardRejectedPdfLine = useCallback((id: string) => {
    setPdfAudit((current) =>
      current
        ? {
            ...current,
            rejectedLines: current.rejectedLines.filter((line) => line.id !== id),
          }
        : current,
    );
  }, []);

  const addCorrectedPdfLine = useCallback(
    (line: PdfReviewLine) => {
      const amount = parseMoneyInput(line.amount);

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
    },
    [discardRejectedPdfLine, historicalCategoryMap],
  );

  /* Lifecycle --------------------------------------------------------------- */

  const resetImport = useCallback((options?: { keepSummary?: boolean }) => {
    setParsedData([]);
    setPdfAudit(null);
    setFileName("");
    setParseError("");
    setIsSubmitting(false);
    if (!options?.keepSummary) setLastImportSummary(null);
  }, []);

  const selectedCardName = effectiveSelectedCard?.name ?? "Cartão";

  const handleImport = useCallback(async () => {
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
      const databaseIgnoredCount = Math.max(uniqueData.length - importedCount, 0);
      const ignoredDuplicateCount = duplicateCount + databaseIgnoredCount;

      setLastImportSummary({
        cardName: selectedCardName,
        creditsCount: summary.creditsCount,
        ignoredDuplicateCount,
        importedCount,
        invoiceMonthLabel: formatInvoiceMonthLabel(effectiveReferenceMonth),
        possibleDuplicateCount: summary.possibleDuplicateCount,
        reviewedCount: rows.filter(
          (row) => row.isApproved && (row.transaction.requiresReview || row.isPossibleDuplicate),
        ).length,
        sourceLineCount: importDuplicateState.newSourceCount,
      });
      toast.success(
        importedCount > 0
          ? `${importedCount} lançamentos importados.`
          : "Nenhum lançamento novo importado.",
        {
          description:
            ignoredDuplicateCount > 0
              ? `${ignoredDuplicateCount} duplicados ignorados.`
              : undefined,
        },
      );
      resetImport({ keepSummary: true });
    } catch (error) {
      void reportAppError(error, {
        source: "SUPABASE",
        severity: "CRITICAL",
        context: { operation: "Importar fatura" },
      });
      toast.error("Não foi possível importar as transações.");
    } finally {
      setIsSubmitting(false);
    }
  }, [
    effectiveReferenceMonth,
    effectiveSelectedCardId,
    importDuplicateState,
    parsedData.length,
    resetImport,
    rows,
    selectedCardName,
    summary.creditsCount,
    summary.possibleDuplicateCount,
  ]);

  return {
    cards,
    dependents,
    categoryOptions,
    referenceMonthOptions,
    selectedCard: effectiveSelectedCard ?? null,
    selectedCardId: effectiveSelectedCardId,
    setSelectedCardId: (cardId: string) => {
      setSelectedCardId(cardId);
      setReferenceMonth("");
    },
    referenceMonth: effectiveReferenceMonth,
    setReferenceMonth,
    fileName,
    parseError,
    isParsingFile,
    ocrProgress,
    ocrProgressPercent,
    ocrProgressLabel,
    readFile,
    cancelParsing,
    pdfAudit,
    rows,
    summary,
    isCheckingDuplicates,
    isSubmitting,
    lastImportSummary,
    /* A PDF whose lines all failed still opens the review, so they can be
       fixed one by one. */
    hasPreview: parsedData.length > 0 || Boolean(pdfAudit?.rejectedLines.length),
    setCategory,
    getSimilarIndexes,
    setOwner,
    setReviewStatus,
    setProjectInstallments,
    splitRow,
    updateRejectedPdfLine,
    discardRejectedPdfLine,
    addCorrectedPdfLine,
    resetImport,
    handleImport,
  };
}

export type InvoiceImport = ReturnType<typeof useInvoiceImport>;
