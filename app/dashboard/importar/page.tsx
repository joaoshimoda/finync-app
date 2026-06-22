"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FileSpreadsheet, Split, UploadCloud, X } from "lucide-react";
import Papa from "papaparse";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
  owner: "me" | "dependent";
};

type CsvRow = Record<string, unknown>;
type SplitMode = "mine" | "dependent" | "split";

const brlFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const ignoredPaymentIndicators = ["pagamento", "pagamento recebido", "pagamento de fatura"];
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
const defaultExpenseCategories = [
  "Alimentação",
  "Transporte",
  "Moradia",
  "Lazer",
  "Saúde",
  "Educação",
  "Outros",
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

function parseAmount(value: string) {
  const rawAmount = String(value || "");
  const isNegative = rawAmount.includes("-");
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
  const amount = getCsvCell(row, ["amount", "valor", "preco", "preço", "total"], 2);
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

  const brDateMatch = normalizedValue.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
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

function shouldIgnoreImportedRow(description: string) {
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
  if (shouldIgnoreImportedRow(description)) return [];

  const parsedAmount = parseAmount(amount);
  const baseDate = parseCsvDate(date);
  const {
    cleanDescription,
    installmentNumber,
    installmentsTotal,
  } = parseInstallment(description || "Sem descrição");
  const isCredit = parsedAmount.isNegative;
  const finalDescription = cleanDescription || "Sem descrição";

  return [
    {
      date: baseDate,
      description: finalDescription,
      amount: Math.abs(parsedAmount.amount),
      category: isCredit
        ? CARD_CREDIT_ADJUSTMENT_CATEGORY
        : findHistoricalCategory(finalDescription, categoryDictionary),
      dependentId: null,
      type: isCredit ? "credit" : "expense",
      projectFutureInstallments:
        !isCredit && installmentNumber < installmentsTotal,
      referenceMonthOffset: 0,
      installmentNumber: isCredit ? 1 : installmentNumber,
      installmentsTotal: isCredit ? 1 : installmentsTotal,
      owner: "me",
    },
  ];
}

export default function ImportarPage() {
  const cards = useFinanceStore((state) => state.cards);
  const dependents = useFinanceStore((state) => state.dependents);
  const fetchCards = useFinanceStore((state) => state.fetchCards);
  const fetchDependents = useFinanceStore((state) => state.fetchDependents);
  const [parsedData, setParsedData] = useState<ParsedTransaction[]>([]);
  const [historicalCategoryMap, setHistoricalCategoryMap] = useState<
    Record<string, string>
  >({});
  const [fileName, setFileName] = useState("");
  const [parseError, setParseError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [splitDialogIndex, setSplitDialogIndex] = useState<number | null>(null);
  const [splitMode, setSplitMode] = useState<SplitMode>("mine");
  const [splitDependentId, setSplitDependentId] = useState("");
  const [splitUserAmount, setSplitUserAmount] = useState("");
  const referenceMonthOptions = useMemo(() => getReferenceMonthOptions(), []);
  const [referenceMonth, setReferenceMonth] = useState("");
  const [selectedCardId, setSelectedCardId] = useState("");

  useEffect(() => {
    void fetchCards();
    void fetchDependents();
  }, [fetchCards, fetchDependents]);

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
              ? transaction.category.trim()
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
  const effectiveReferenceMonth = referenceMonth ||
    (effectiveSelectedCard
      ? getCardInvoiceMonthStart(
          getLocalTodayDateOnly(),
          effectiveSelectedCard.closingDay,
        )
      : getMonthStartFromReference(getLocalTodayDateOnly()));

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];

    if (!file) return;

    setParseError("");
    setFileName(file.name);

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
        setParseError("Não foi possível ler o CSV. Verifique o arquivo e tente novamente.");
      },
    });
  }, [historicalCategoryMap]);

  const { getInputProps, getRootProps, isDragActive, isDragReject } =
    useDropzone({
      accept: {
        "text/csv": [".csv"],
        "application/vnd.ms-excel": [".csv"],
      },
      maxFiles: 1,
      multiple: false,
      onDrop,
    });

  const previewRows = parsedData;
  const categoryOptions = useMemo(() => {
    const categories = new Set(defaultExpenseCategories);

    Object.values(historicalCategoryMap).forEach((category) => {
      if (category) categories.add(category);
    });

    parsedData.forEach((transaction) => {
      if (transaction.category) categories.add(transaction.category);
    });

    return Array.from(categories).sort((left, right) =>
      left.localeCompare(right, "pt-BR"),
    );
  }, [historicalCategoryMap, parsedData]);
  const selectedSplitTransaction =
    splitDialogIndex === null ? null : parsedData[splitDialogIndex] ?? null;
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
      value.replace(/[^0-9,.]/g, "").replace(/\./g, "").replace(",", "."),
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

  function resetImport() {
    setParsedData([]);
    setFileName("");
    setParseError("");
    setIsSubmitting(false);
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

      const monthStart = getMonthStartFromReference(effectiveReferenceMonth);
      const rowsToImport = parsedData.flatMap(getRowsForImport);
      const formattedData = rowsToImport.map((transaction) => {
        const dependent = transaction.dependentId
          ? dependents.find((item) => item.id === transaction.dependentId)
          : null;
        const owner = dependent?.name ?? "eu";

        return {
          user_id: user.id,
          card_id: effectiveSelectedCardId,
          dependent_id: transaction.dependentId ?? null,
          month_start: addMonthsToDateOnly(
            monthStart,
            transaction.referenceMonthOffset,
          ),
          type: "card",
          description: transaction.description,
          category:
            transaction.type === "credit"
              ? CARD_CREDIT_ADJUSTMENT_CATEGORY
              : transaction.category || null,
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
      });

      const { error } = await supabase.from("transactions").insert(formattedData);

      if (error) throw error;

      toast.success(`${formattedData.length} transações importadas com sucesso!`);
      resetImport();
    } catch (error) {
      console.error("Erro ao importar CSV:", error);
      toast.error("Não foi possível importar as transações.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex w-full flex-col gap-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-50">
          Importar Fatura
        </h1>
        <p className="text-sm text-zinc-400">
          Envie um CSV de cartão ou banco para revisar as transações antes de importar.
        </p>
      </header>

      {!parsedData.length ? (
        <Card
          {...getRootProps()}
          className={cn(
            "cursor-pointer border-dashed border-zinc-700 bg-zinc-900/50 shadow-none transition-colors hover:border-emerald-500/70 hover:bg-zinc-900/70",
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
              Arraste sua fatura CSV aqui
            </h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-zinc-400">
              Suporta exportações do Nubank, Itaú, bancos digitais e planilhas CSV.
            </p>
            <Button type="button" className="mt-8 bg-emerald-600 text-white hover:bg-emerald-700">
              Selecionar arquivo
            </Button>
            {parseError ? (
              <p className="mt-4 text-sm text-red-300">{parseError}</p>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-zinc-800/80 bg-zinc-900/50 shadow-none">
          <CardHeader className="flex flex-col gap-4 border-b border-zinc-800/80 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="size-5 text-emerald-300" />
                Pré-visualização da fatura
              </CardTitle>
              <CardDescription>
                {fileName} · {parsedData.length} transações encontradas.
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="ghost"
              className="gap-2 text-zinc-300 hover:text-white"
              onClick={resetImport}
              disabled={isSubmitting}
            >
              <X className="size-4" />
              Importar outro arquivo
            </Button>
          </CardHeader>

          <CardContent className="p-0">
            <div className="grid gap-4 border-b border-zinc-800/80 p-4 sm:grid-cols-2">
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                  Mês de Referência
                </p>
                <Select
                  value={effectiveReferenceMonth}
                  onValueChange={setReferenceMonth}
                >
                  <SelectTrigger className="border-zinc-700 bg-zinc-900 text-zinc-100">
                    <SelectValue placeholder="Selecione a competência" />
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
            </div>

            <div className="overflow-hidden">
              <Table className="w-full table-fixed text-xs">
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="w-[64px] px-3">Data</TableHead>
                    <TableHead className="w-[26%] px-3">Descrição</TableHead>
                    <TableHead className="w-[150px] px-3">Categoria</TableHead>
                    <TableHead className="w-[88px] px-3">Tipo</TableHead>
                    <TableHead className="w-[104px] px-3">Dono</TableHead>
                    <TableHead className="w-[120px] px-3">Parcelas</TableHead>
                    <TableHead className="w-[104px] px-3 text-right">Valor</TableHead>
                    <TableHead className="w-10 px-2" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewRows.map((transaction, index) => (
                    <TableRow key={`${transaction.description}-${index}`}>
                      <TableCell className="px-3 text-zinc-400">
                        {formatPreviewDate(transaction.date)}
                      </TableCell>
                      <TableCell className="truncate px-3 font-medium text-zinc-100">
                        <span title={transaction.description}>
                          {transaction.description}
                        </span>
                      </TableCell>
                      <TableCell className="px-3">
                        {transaction.type === "credit" ? (
                          <span className="block truncate text-xs text-zinc-400">
                            {CARD_CREDIT_ADJUSTMENT_CATEGORY}
                          </span>
                        ) : (
                          <Select
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
                      <TableCell className="px-2 text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="text-zinc-400 hover:text-white"
                          onClick={() => openSplitDialog(index)}
                          disabled={transaction.type === "credit"}
                          aria-label="Dividir ou atribuir gasto"
                        >
                          <Split className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-col gap-3 border-t border-zinc-800/80 p-4 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={resetImport}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                className="bg-emerald-600 text-white hover:bg-emerald-700"
                onClick={() => void handleImport()}
                disabled={isSubmitting || !effectiveSelectedCardId}
              >
                {isSubmitting
                  ? "Importando..."
                  : `Importar ${parsedData.length} Transações`}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
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
              Defina de quem é essa compra sem alterar o total da fatura do cartão.
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
                  ["split", "Dividir Gasto", "Rachar entre você e um dependente"],
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
                      onChange={(event) => setSplitUserAmount(event.target.value)}
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
