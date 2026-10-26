"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { parseCsvStatement } from "@/lib/invoiceCsv";
import {
  addMonthsToDateOnly,
  applyCleanNames,
  applyLearnedNames,
  formatInvoiceMonthLabel,
  getSuggestedStatementMonth,
  getCrossMonthImportSignature,
  getImportNote,
  getImportSignatureForSource,
  getLooseImportSignature,
  getMonthStartFromReference,
  getOriginalDescriptionFromNote,
  getReferenceMonthOptions,
  getRowsForImport,
  mapPdfTransaction,
  mapStatementTransaction,
  normalizeDescriptionForCategory,
  normalizeImportedExpenseCategory,
  orientCardTransactions,
  renameTransaction,
  type ExistingImportTransaction,
  type ImportMode,
  type ImportResultSummary,
  type ParsedTransaction,
  type PdfImportAudit,
  type PdfReviewLine,
  type PreparedImportTransaction,
  type StatementTransaction,
} from "@/lib/invoiceImport";
import { decodeOfxBytes, parseOfx } from "@/lib/invoiceOfx";
import {
  extractPdfInvoice,
  PdfPasswordError,
  type PdfOcrProgress,
} from "@/lib/invoicePdf";
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

/* State and rules of the import, for a card invoice (CSV/PDF/OFX) or a
   bank statement (OFX/CSV): reading the file, the preview the user edits,
   duplicate detection against what is already saved and the final insert.
   The page only renders what this returns. */
export function useInvoiceImport() {
  const cards = useFinanceStore((state) => state.cards);
  const dependents = useFinanceStore((state) => state.dependents);
  const categories = useFinanceStore((state) => state.categories);
  const fetchCards = useFinanceStore((state) => state.fetchCards);
  const fetchDependents = useFinanceStore((state) => state.fetchDependents);
  const fetchCategories = useFinanceStore((state) => state.fetchCategories);

  const [mode, setMode] = useState<ImportMode>("card");
  const [parsedData, setParsedData] = useState<ParsedTransaction[]>([]);
  const [historicalCategoryMap, setHistoricalCategoryMap] = useState<
    Record<string, string>
  >({});
  const [historicalIncomeCategoryMap, setHistoricalIncomeCategoryMap] =
    useState<Record<string, string>>({});
  /* A locked PDF waiting for its password. */
  const [pdfPasswordRequest, setPdfPasswordRequest] = useState<{
    file: File;
    incorrect: boolean;
  } | null>(null);
  /* Bank text -> the name the user gave it in an earlier import. */
  const [learnedNames, setLearnedNames] = useState<Record<string, string>>({});
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
  const baseReferenceMonthOptions = useMemo(() => getReferenceMonthOptions(), []);
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
        .select("description, category, type, notes, created_at, month_start, day")
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

      const nextCategoryMap: Record<string, string> = {};
      const nextIncomeCategoryMap: Record<string, string> = {};
      const nextLearnedNames: Record<string, string> = {};

      (data ?? []).forEach((transaction) => {
        const isIncome = transaction.type === "income";
        const description =
          typeof transaction.description === "string"
            ? transaction.description
            : "";
        const category =
          typeof transaction.category === "string"
            ? isIncome
              ? transaction.category.trim()
              : normalizeImportedExpenseCategory(transaction.category)
            : "";
        const target = isIncome ? nextIncomeCategoryMap : nextCategoryMap;
        const originalDescription = getOriginalDescriptionFromNote(
          typeof transaction.notes === "string" ? transaction.notes : null,
        );
        const originalKey = originalDescription
          ? normalizeDescriptionForCategory(originalDescription)
          : "";

        /* A renamed line teaches its category under both names. */
        [normalizeDescriptionForCategory(description), originalKey].forEach((key) => {
          if (key && category && !target[key]) target[key] = category;
        });

        if (originalKey && description && !nextLearnedNames[originalKey]) {
          nextLearnedNames[originalKey] = description;
        }
      });

      if (isMounted) {
        setHistoricalCategoryMap(nextCategoryMap);
        setHistoricalIncomeCategoryMap(nextIncomeCategoryMap);
        setLearnedNames(nextLearnedNames);
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
  /* Until the user picks a month: a card suggests its current invoice, a
     statement the month most of its lines fall in. */
  const suggestedStatementMonth = useMemo(
    () => getSuggestedStatementMonth(parsedData.map((row) => row.date)),
    [parsedData],
  );
  const effectiveReferenceMonth =
    referenceMonth ||
    (mode === "account"
      ? (suggestedStatementMonth ??
        getMonthStartFromReference(getLocalTodayDateOnly()))
      : effectiveSelectedCard
        ? getCardInvoiceMonthStart(
            getLocalTodayDateOnly(),
            effectiveSelectedCard.closingDay,
          )
        : getMonthStartFromReference(getLocalTodayDateOnly()));
  /* An older statement can suggest a month outside the default window. */
  const referenceMonthOptions = baseReferenceMonthOptions.some(
    (option) => option.value === effectiveReferenceMonth,
  )
    ? baseReferenceMonthOptions
    : [
        ...baseReferenceMonthOptions,
        {
          value: effectiveReferenceMonth,
          label: formatInvoiceMonthLabel(effectiveReferenceMonth),
        },
      ].sort((left, right) => left.value.localeCompare(right.value));
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
    : mode === "account"
      ? "Lendo seu extrato..."
      : "Lendo sua fatura...";

  /* Categories the user has, so the offline guess never invents one. While
     they load, the guess falls back to the default list. */
  const knownCategories = useMemo(
    () => (categories.length ? categories.map((category) => category.label) : undefined),
    [categories],
  );

  /* Card invoices and bank statements read the same lines differently. */
  const mapStatementRows = useCallback(
    (transactions: StatementTransaction[], targetMode: ImportMode) =>
      targetMode === "account"
        ? transactions.map((transaction) =>
            mapStatementTransaction(
              transaction,
              historicalCategoryMap,
              historicalIncomeCategoryMap,
              knownCategories,
            ),
          )
        : transactions
            .map((transaction) =>
              mapPdfTransaction(transaction, historicalCategoryMap, knownCategories),
            )
            .filter((transaction): transaction is ParsedTransaction =>
              Boolean(transaction),
            ),
    [historicalCategoryMap, historicalIncomeCategoryMap, knownCategories],
  );

  /* Names the user gave before win; the rest get a cleaner name. */
  const loadRows = useCallback(
    (rows: ParsedTransaction[]) =>
      setParsedData(applyCleanNames(applyLearnedNames(rows, learnedNames))),
    [learnedNames],
  );

  const readFile = useCallback(
    async (file: File, options?: { pdfPassword?: string }) => {
      setParseError("");
      setLastImportSummary(null);
      setFileName(file.name);
      setPdfAudit(null);
      setPdfPasswordRequest(null);

      const isPdf =
        file.type === "application/pdf" ||
        file.name.toLowerCase().endsWith(".pdf");

      if (isPdf && mode === "account") {
        setParsedData([]);
        setParseError(
          "Para o extrato da conta, use o arquivo OFX ou CSV que o banco exporta.",
        );
        return;
      }

      if (isPdf) {
        setIsParsingFile(true);
        const abortController = new AbortController();
        pdfAbortControllerRef.current = abortController;

        try {
          const result = await extractPdfInvoice(file, effectiveReferenceMonth, {
            onProgress: setOcrProgress,
            password: options?.pdfPassword,
            signal: abortController.signal,
          });
          const rows = mapStatementRows(result.transactions, "card");

          loadRows(rows);
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
              "O PDF foi lido, mas não encontramos transações. Confira o mês da fatura ou tente o OFX ou CSV do banco.",
            );
          }
        } catch (error) {
          setParsedData([]);

          /* Many banks lock the invoice with part of the CPF; ask for it. */
          if (error instanceof PdfPasswordError) {
            setPdfPasswordRequest({ file, incorrect: error.incorrect });
            return;
          }

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

      const isOfx =
        file.type === "application/x-ofx" ||
        /\.(ofx|qfx)$/i.test(file.name);

      if (isOfx) {
        setIsParsingFile(true);

        try {
          const result = parseOfx(decodeOfxBytes(await file.arrayBuffer()));
          /* The OFX says whether it is a card or an account statement, so
             it overrides the mode picked before the upload. */
          const fileMode: ImportMode = result.kind === "card" ? "card" : "account";

          if (fileMode === "card" && !cards.length) {
            setParsedData([]);
            setParseError(
              "Esse OFX é de uma fatura de cartão. Cadastre o cartão antes de importar.",
            );
            return;
          }

          if (fileMode !== mode) {
            setMode(fileMode);
            toast.info(
              fileMode === "account"
                ? "Esse arquivo é um extrato da conta. Mudamos para importar extrato."
                : "Esse arquivo é uma fatura de cartão. Mudamos para importar fatura.",
            );
          }

          const rows = mapStatementRows(
            fileMode === "card"
              ? orientCardTransactions(result.transactions, false)
              : result.transactions,
            fileMode,
          );

          loadRows(rows);

          if (!rows.length) {
            setParseError("O OFX foi lido, mas não encontramos transações.");
          }
        } catch (error) {
          setParsedData([]);
          setParseError(
            error instanceof Error
              ? error.message
              : "Não foi possível ler o OFX. Verifique o arquivo e tente novamente.",
          );
        } finally {
          setIsParsingFile(false);
        }

        return;
      }

      try {
        /* Read as bytes so files saved in Windows-1252 keep their accents. */
        const { transactions, hasExplicitDirection } = parseCsvStatement(
          decodeOfxBytes(await file.arrayBuffer()),
          getDateOnlyParts(effectiveReferenceMonth).year,
        );
        const rows = mapStatementRows(
          mode === "card" && !hasExplicitDirection
            ? orientCardTransactions(transactions, true)
            : transactions,
          mode,
        );

        loadRows(rows);

        if (!rows.length) {
          setParseError(
            "Não encontramos transações nesse arquivo. Confira se ele tem colunas de data e valor.",
          );
        }
      } catch {
        setParsedData([]);
        setParseError(
          "Não foi possível ler o CSV. Verifique o arquivo e tente novamente.",
        );
      }
    },
    [cards.length, effectiveReferenceMonth, loadRows, mapStatementRows, mode],
  );

  const cancelParsing = useCallback(() => {
    pdfAbortControllerRef.current?.abort();
  }, []);

  /* The password stays only in memory, for this one read. */
  const submitPdfPassword = useCallback(
    (password: string) => {
      if (pdfPasswordRequest && password) {
        void readFile(pdfPasswordRequest.file, { pdfPassword: password });
      }
    },
    [pdfPasswordRequest, readFile],
  );
  const cancelPdfPassword = useCallback(() => {
    setPdfPasswordRequest(null);
    setFileName("");
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

        const isCredit = transaction.type === "credit";
        const expenseCategory = normalizeImportedExpenseCategory(
          transaction.category ?? null,
        );
        const sharedFields = {
          sourceIndex,
          dependent_id: transaction.dependentId ?? null,
          transaction_date: transaction.date,
          description: transaction.description,
          amount: transaction.amount,
          day: getDateOnlyParts(transaction.date).day,
          status: "CONFIRMADO" as const,
          owner,
          recurring: false as const,
          direct_subscription: false as const,
          split_with: [dependent?.id ?? "eu"],
        };
        /* Both land in the month the user picked: the invoice's, or the
           one the whole statement belongs to. */
        const preparedTransaction: Omit<
          PreparedImportTransaction,
          "import_signature"
        > =
          mode === "account"
            ? {
                ...sharedFields,
                card_id: null,
                group_id: null,
                month_start: monthStart,
                type: isCredit ? "income" : "fixed",
                category: isCredit
                  ? transaction.category?.trim() || "Outras Receitas"
                  : expenseCategory,
                installment_number: 1,
                installments_total: 1,
                notes: getImportNote(fileName, transaction),
              }
            : {
                ...sharedFields,
                card_id: effectiveSelectedCardId,
                group_id: transaction.groupId ?? null,
                month_start: addMonthsToDateOnly(
                  monthStart,
                  transaction.referenceMonthOffset,
                ),
                type: "card",
                category: isCredit ? CARD_CREDIT_ADJUSTMENT_CATEGORY : expenseCategory,
                installment_number: transaction.installmentNumber,
                installments_total: transaction.installmentsTotal,
                notes: isCredit
                  ? `${CARD_CREDIT_ADJUSTMENT_NOTE} ${getImportNote(fileName, transaction)}`
                  : getImportNote(fileName, transaction),
              };

        return {
          ...preparedTransaction,
          import_signature: getImportSignatureForSource(
            preparedTransaction,
            transaction.originalDescription,
          ),
        };
      });
    });

    /* The base signature already uses the name from the file. */
    return addOccurrenceSignatures(baseRows, (row) => row.import_signature);
  }, [
    dependents,
    effectiveReferenceMonth,
    effectiveSelectedCardId,
    fileName,
    mode,
    parsedData,
  ]);

  useEffect(() => {
    let isMounted = true;

    async function fetchExistingImportSignatures() {
      if (
        !preparedImportRows.length ||
        (mode === "card" && !effectiveSelectedCardId)
      ) {
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
        const baseQuery = supabase
          .from("transactions")
          .select(
            "import_signature, month_start, transaction_date, day, description, amount, installment_number, installments_total, dependent_id, notes",
          )
          .eq("user_id", user.id)
          .in("month_start", invoiceMonthsWithAdjacent);
        const { data, error } = await (mode === "account"
          ? baseQuery.is("card_id", null).in("type", ["income", "fixed"])
          : baseQuery.eq("card_id", effectiveSelectedCardId));

        if (error) throw error;

        if (isMounted) {
          const fetchedRows = (data ?? []) as ExistingImportTransaction[];
          /* Renamed lines are compared under the name they had in the file
             as well as the one they were saved with. */
          const existingRows = fetchedRows.flatMap((row) => {
            const original = getOriginalDescriptionFromNote(row.notes);
            return original ? [row, { ...row, description: original }] : [row];
          });
          const previouslyImportedRows = fetchedRows.filter((row) =>
            row.notes?.includes("Importado de"),
          );
          const occurrenceSignatures = getOccurrenceSignatureSet(
            previouslyImportedRows,
            (row) =>
              getImportSignatureForSource(
                row,
                getOriginalDescriptionFromNote(row.notes) ?? undefined,
              ),
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
  }, [effectiveSelectedCardId, mode, preparedImportRows]);

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
      const originalDescription =
        parsedData[transaction.sourceIndex]?.originalDescription;
      const comparable = originalDescription
        ? [transaction, { ...transaction, description: originalDescription }]
        : [transaction];
      const isDuplicate = existingImportSignatures.has(signature);
      const isPossibleDuplicate =
        !isDuplicate &&
        comparable.some(
          (row) =>
            existingLooseImportSignatures.has(getLooseImportSignature(row)) ||
            existingCrossMonthImportSignatures.has(getCrossMonthImportSignature(row)),
        );

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
    parsedData,
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

  const incomeCategoryOptions = useMemo(() => {
    const categoryLabels = new Set(
      categories
        .filter((category) => category.kind === "income")
        .map((category) => category.label),
    );

    Object.values(historicalIncomeCategoryMap).forEach((category) => {
      categoryLabels.add(category);
    });

    if (mode === "account") {
      parsedData.forEach((transaction) => {
        if (transaction.category && transaction.type === "credit") {
          categoryLabels.add(transaction.category);
        }
      });
    }

    categoryLabels.add("Outras Receitas");

    return Array.from(categoryLabels).sort((left, right) =>
      left.localeCompare(right, "pt-BR"),
    );
  }, [categories, historicalIncomeCategoryMap, mode, parsedData]);

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

  /* Card refunds keep their fixed category. On a statement, income takes
     only income categories and debits only expense ones, so a bulk edit
     over mixed rows changes just the side the category belongs to. */
  const setCategory = useCallback(
    (indexes: number[], category: string | null) => {
      const isIncomeCategory =
        category !== null && incomeCategoryOptions.includes(category);

      updateRows(indexes, (row) => {
        if (row.type === "credit" && mode === "card") return row;
        if (category !== null && (row.type === "credit") !== isIncomeCategory) {
          return row;
        }

        return { ...row, category };
      });
    },
    [incomeCategoryOptions, mode, updateRows],
  );

  /* Other expense rows with the same merchant, to offer the same category. */
  const getSimilarIndexes = useCallback(
    (index: number) => {
      const source = parsedData[index];
      if (!source) return [];
      /* Matched by the bank's text, so it still works after a rename. */
      const getKey = (row: ParsedTransaction) =>
        normalizeDescriptionForCategory(row.originalDescription ?? row.description);
      const key = getKey(source);

      return parsedData.flatMap((row, rowIndex) =>
        rowIndex !== index &&
        row.type === source.type &&
        row.reviewStatus !== "ignored" &&
        getKey(row) === key
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

  /* An empty name goes back to the one in the file. */
  const renameRows = useCallback(
    (indexes: number[], description: string) =>
      updateRows(indexes, (row) => renameTransaction(row, description)),
    [updateRows],
  );

  /* Fixes what the file got wrong: name, date, value, kind, category and
     installments. A card refund carries no category or installments. */
  const editRow = useCallback(
    (
      index: number,
      patch: {
        description: string;
        date: string;
        amount: number;
        type: ParsedTransaction["type"];
        category: string | null;
        installmentNumber: number;
        installmentsTotal: number;
      },
    ) =>
      updateRows([index], (row) => {
        const isCardRefund = patch.type === "credit" && mode === "card";
        const isSingle = isCardRefund || mode === "account";
        const installmentsTotal = isSingle ? 1 : Math.max(patch.installmentsTotal, 1);
        const installmentNumber = isSingle
          ? 1
          : Math.min(Math.max(patch.installmentNumber, 1), installmentsTotal);

        return {
          ...renameTransaction(row, patch.description),
          date: patch.date,
          amount: patch.amount,
          type: patch.type,
          category: isCardRefund ? CARD_CREDIT_ADJUSTMENT_CATEGORY : patch.category,
          installmentNumber,
          installmentsTotal,
          projectFutureInstallments:
            installmentNumber < installmentsTotal &&
            (row.installmentsTotal === installmentsTotal
              ? row.projectFutureInstallments
              : true),
          dependentId: isCardRefund ? null : row.dependentId,
          owner: isCardRefund ? "me" : row.owner,
        };
      }),
    [mode, updateRows],
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
  const referenceMonthLabel = formatInvoiceMonthLabel(effectiveReferenceMonth);
  /* "Nubank · fatura de novembro / 2026" or "Extrato da conta · lançado em outubro / 2026". */
  const importTargetLabel =
    mode === "account"
      ? `Extrato da conta · lançado em ${referenceMonthLabel.toLocaleLowerCase("pt-BR")}`
      : `${selectedCardName} · fatura de ${referenceMonthLabel.toLocaleLowerCase("pt-BR")}`;

  const handleImport = useCallback(async () => {
    if (!parsedData.length) return;

    if (mode === "card" && !effectiveSelectedCardId) {
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
        toast.info(
          mode === "account"
            ? "Todos os lançamentos desse extrato já existem."
            : "Todos os lançamentos dessa fatura já existem.",
        );
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
        mode,
        cardName: mode === "account" ? "Extrato da conta" : selectedCardName,
        creditsCount: summary.creditsCount,
        ignoredDuplicateCount,
        importedCount,
        invoiceMonthLabel: referenceMonthLabel,
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
        context: {
          operation: mode === "account" ? "Importar extrato" : "Importar fatura",
        },
      });
      toast.error("Não foi possível importar as transações.");
    } finally {
      setIsSubmitting(false);
    }
  }, [
    effectiveSelectedCardId,
    importDuplicateState,
    mode,
    parsedData.length,
    resetImport,
    rows,
    referenceMonthLabel,
    selectedCardName,
    summary.creditsCount,
    summary.possibleDuplicateCount,
  ]);

  return {
    mode,
    /* Switching discards the file and month picked for the other mode. */
    setMode: (nextMode: ImportMode) => {
      if (nextMode === mode) return;
      setMode(nextMode);
      setReferenceMonth("");
      resetImport();
    },
    importTargetLabel,
    cards,
    dependents,
    categoryOptions,
    incomeCategoryOptions,
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
    pdfPasswordRequest,
    submitPdfPassword,
    cancelPdfPassword,
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
    renameRows,
    editRow,
    splitRow,
    updateRejectedPdfLine,
    discardRejectedPdfLine,
    addCorrectedPdfLine,
    resetImport,
    handleImport,
  };
}

export type InvoiceImport = ReturnType<typeof useInvoiceImport>;
