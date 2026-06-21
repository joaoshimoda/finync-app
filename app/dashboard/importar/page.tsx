"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FileSpreadsheet, UploadCloud, X } from "lucide-react";
import Papa from "papaparse";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  type: "credit" | "expense";
  referenceMonthOffset: number;
  installmentNumber: number;
  installmentsTotal: number;
};

type CsvRow = Record<string, unknown>;

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

function normalizeKey(value: string) {
  return value
    .replace(/^\uFEFF/, "")
    .replace(/^["']|["']$/g, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
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

function mapCsvRow(row: CsvRow): ParsedTransaction[] {
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

  const remainingInstallments =
    isCredit ? 1 : installmentsTotal - installmentNumber + 1;

  return Array.from({ length: remainingInstallments }, (_, index) => ({
    date: addMonthsToDateOnly(baseDate, index),
    description: cleanDescription || "Sem descrição",
    amount: Math.abs(parsedAmount.amount),
    type: isCredit ? "credit" : "expense",
    referenceMonthOffset: index,
    installmentNumber: isCredit ? 1 : installmentNumber + index,
    installmentsTotal: isCredit ? 1 : installmentsTotal,
  }));
}

export default function ImportarPage() {
  const cards = useFinanceStore((state) => state.cards);
  const fetchCards = useFinanceStore((state) => state.fetchCards);
  const [parsedData, setParsedData] = useState<ParsedTransaction[]>([]);
  const [fileName, setFileName] = useState("");
  const [parseError, setParseError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const referenceMonthOptions = useMemo(() => getReferenceMonthOptions(), []);
  const [referenceMonth, setReferenceMonth] = useState(
    () => getMonthStartFromReference(getLocalTodayDateOnly()),
  );
  const [selectedCardId, setSelectedCardId] = useState("");

  useEffect(() => {
    void fetchCards();
  }, [fetchCards]);

  const effectiveSelectedCardId = selectedCardId || cards[0]?.id || "";

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
        const rows = result.data.flatMap(mapCsvRow);

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
  }, []);

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

  const previewRows = useMemo(() => parsedData.slice(0, 20), [parsedData]);

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

      const monthStart = getMonthStartFromReference(referenceMonth);
      const formattedData = parsedData.map((transaction) => ({
        user_id: user.id,
        card_id: effectiveSelectedCardId,
        month_start: addMonthsToDateOnly(monthStart, transaction.referenceMonthOffset),
        type: "card",
        description: transaction.description,
        category:
          transaction.type === "credit"
            ? CARD_CREDIT_ADJUSTMENT_CATEGORY
            : "Importado",
        amount: transaction.amount,
        day: getDateOnlyParts(transaction.date).day,
        status: "CONFIRMADO",
        owner: "eu",
        installment_number: transaction.installmentNumber,
        installments_total: transaction.installmentsTotal,
        notes:
          transaction.type === "credit"
            ? `${CARD_CREDIT_ADJUSTMENT_NOTE} Importado de ${fileName}`
            : `Importado de ${fileName}`,
        recurring: false,
        direct_subscription: false,
        split_with: ["eu"],
      }));

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
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
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
                <Select value={referenceMonth} onValueChange={setReferenceMonth}>
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
                <Select value={effectiveSelectedCardId} onValueChange={setSelectedCardId}>
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
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewRows.map((transaction, index) => (
                    <TableRow key={`${transaction.description}-${index}`}>
                      <TableCell className="text-zinc-400">
                        {transaction.date}
                      </TableCell>
                      <TableCell className="font-medium text-zinc-100">
                        {transaction.description}
                      </TableCell>
                      <TableCell className="text-zinc-400">
                        {transaction.type === "credit" ? "Abatimento" : "Cartão"}
                      </TableCell>
                      <TableCell className="text-right font-medium text-zinc-50">
                        {brlFormatter.format(transaction.amount)}
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
    </div>
  );
}
