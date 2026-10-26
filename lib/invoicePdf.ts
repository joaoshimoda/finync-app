export type PdfInvoiceBank =
  | "nubank"
  | "inter"
  | "bradesco"
  | "itau"
  | "santander"
  | "bb"
  | "caixa"
  | "c6"
  | "xp"
  | "btg"
  | "picpay"
  | "mercadopago"
  | "generic";

/* Thrown when the PDF needs a password, so the screen can ask for it. */
export class PdfPasswordError extends Error {
  readonly incorrect: boolean;

  constructor(incorrect: boolean) {
    super(
      incorrect
        ? "Senha incorreta. Confira e tente de novo."
        : "Este PDF é protegido por senha.",
    );
    this.name = "PdfPasswordError";
    this.incorrect = incorrect;
  }
}

export type PdfOcrProgress = {
  page: number;
  progress: number;
  stage: "loading" | "rendering" | "recognizing";
  totalPages: number;
};

export type PdfInvoiceTransaction = {
  amount: number;
  date: string;
  description: string;
  isCredit: boolean;
};

export type PdfInvoiceResult = {
  bank: PdfInvoiceBank;
  ocrConfidence: number | null;
  rejectedLines: PdfRejectedInvoiceLine[];
  totalPages: number;
  transactions: PdfInvoiceTransaction[];
  usedOcr: boolean;
};

export type PdfRejectedInvoiceLine = {
  amount: number | null;
  date: string | null;
  description: string;
  isCredit: boolean;
  raw: string;
  reason: string;
};

type PositionedTextItem = {
  str: string;
  x: number;
  y: number;
};

let pdfJsPromise: Promise<typeof import("pdfjs-dist")> | null = null;

async function getPdfJs() {
  pdfJsPromise ??= import("pdfjs-dist").then((pdfjs) => {
    if (!pdfjs.GlobalWorkerOptions.workerPort) {
      pdfjs.GlobalWorkerOptions.workerPort = new Worker(
        new URL("pdfjs-dist/build/pdf.worker.mjs", import.meta.url),
        { type: "module" },
      );
    }

    return pdfjs;
  });

  return pdfJsPromise;
}

const monthNumbers: Record<string, number> = {
  jan: 1,
  janeiro: 1,
  fev: 2,
  fevereiro: 2,
  mar: 3,
  marco: 3,
  abr: 4,
  abril: 4,
  mai: 5,
  maio: 5,
  jun: 6,
  junho: 6,
  jul: 7,
  julho: 7,
  ago: 8,
  agosto: 8,
  set: 9,
  setembro: 9,
  out: 10,
  outubro: 10,
  nov: 11,
  novembro: 11,
  dez: 12,
  dezembro: 12,
};

const ignoredLineIndicators = [
  "compras nacionais",
  "data descricao valor",
  "data estabelecimento valor",
  "encargos e servicos",
  "limite disponivel",
  "limite total",
  "melhor dia de compra",
  "pagamento recebido",
  "pagamento de fatura",
  "pagamento efetuado",
  "pagamento minimo",
  "resumo da fatura",
  "saldo anterior",
  "saldo devedor",
  "saldo em aberto",
  "total da fatura",
  "total a pagar",
  "total de compras",
  "total dos lancamentos",
  "total de pagamentos",
  "valor da fatura",
  "valor minimo",
  "vencimento",
];

const monthNamePattern =
  "jan(?:eiro)?|fev(?:ereiro)?|mar(?:co|ço)?|abr(?:il)?|mai(?:o)?|jun(?:ho)?|jul(?:ho)?|ago(?:sto)?|set(?:embro)?|out(?:ubro)?|nov(?:embro)?|dez(?:embro)?";
/* "05/10", "05/10/2026", "05.10.26", "05 OUT", "05 de outubro". */
const datePattern = `(\\d{1,2})(?:[/.\\-](\\d{1,2})(?:[/.\\-](\\d{2,4}))?|\\s+(?:de\\s+)?(${monthNamePattern})\\.?)`;
const dateAtStartPattern = new RegExp(`^\\s*${datePattern}\\b[\\s,.-]*`, "i");
/* A trailing "C" marks a credit on several invoices; "D" a debit. */
const amountPattern = String.raw`(?:R\$\s*)?(-?\s*(?:\d{1,3}(?:\.\d{3})*|\d+),\d{2}\s*-?)(?:\s*([DC]))?`;
const amountAtEndPattern = new RegExp(`${amountPattern}\\s*$`, "i");
/* One transaction inside a longer line: date, text, amount. Used to split
   invoices printed in two columns, where a row holds two transactions. */
const embeddedTransactionPattern = new RegExp(
  `(?:^|\\s)${datePattern}\\b(?:(?!\\s${datePattern}\\b).)*?${amountPattern}(?=\\s|$)`,
  "gi",
);

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

const bankSignatures: Array<{ bank: PdfInvoiceBank; terms: string[] }> = [
  { bank: "nubank", terms: ["nubank", "nu pagamentos"] },
  { bank: "inter", terms: ["banco inter", "inter pagamentos", "bancointer"] },
  { bank: "bradesco", terms: ["bradesco", "bradescard"] },
  { bank: "itau", terms: ["itau unibanco", "itaucard", "banco itau", "itau"] },
  { bank: "santander", terms: ["santander"] },
  { bank: "bb", terms: ["banco do brasil", "ourocard"] },
  { bank: "caixa", terms: ["caixa economica", "caixa econômica"] },
  { bank: "c6", terms: ["c6 bank", "banco c6", "c6 carbon"] },
  { bank: "xp", terms: ["xp investimentos", "banco xp", "cartao xp"] },
  { bank: "btg", terms: ["btg pactual"] },
  { bank: "picpay", terms: ["picpay"] },
  { bank: "mercadopago", terms: ["mercado pago", "mercadopago"] },
];

function detectBank(text: string): PdfInvoiceBank {
  const normalized = normalizeText(text);

  return (
    bankSignatures.find((signature) =>
      signature.terms.some((term) => normalized.includes(normalizeText(term))),
    )?.bank ?? "generic"
  );
}

function parseBrazilianAmount(value: string) {
  const isNegative = value.includes("-");
  const amount = Number(
    value
      .replace(/[^\d,.]/g, "")
      .replace(/\./g, "")
      .replace(",", "."),
  );

  return { amount, isNegative };
}

function resolveDate(
  match: RegExpMatchArray,
  referenceMonth: string,
): string | null {
  const [referenceYear, referenceMonthNumber] = referenceMonth
    .slice(0, 10)
    .split("-")
    .map(Number);
  const reference = { month: referenceMonthNumber, year: referenceYear };
  const day = Number(match[1]);
  const numericMonth = match[2] ? Number(match[2]) : null;
  const namedMonth = match[4]
    ? monthNumbers[normalizeText(match[4]).replace("ç", "c")]
    : null;
  const month = numericMonth ?? namedMonth ?? reference.month;
  let year = match[3]
    ? Number(match[3].length === 2 ? `20${match[3]}` : match[3])
    : reference.year;

  if (!match[3]) {
    if (month - reference.month > 6) year -= 1;
    if (reference.month - month > 6) year += 1;
  }

  if (
    !Number.isInteger(day) ||
    !Number.isInteger(month) ||
    day < 1 ||
    day > new Date(year, month, 0).getDate() ||
    month < 1 ||
    month > 12
  ) {
    return null;
  }

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseTransactionLine(
  line: string,
  referenceMonth: string,
): PdfInvoiceTransaction | null {
  const dateMatch = line.match(dateAtStartPattern);
  const amountMatch = line.match(amountAtEndPattern);

  if (!dateMatch || !amountMatch) return null;

  const date = resolveDate(dateMatch, referenceMonth);
  if (!date) return null;

  const description = line
    .slice(dateMatch[0].length, amountMatch.index)
    .replace(/\s+/g, " ")
    .replace(/[·|]+$/g, "")
    .trim();
  const normalizedDescription = normalizeText(description);

  if (
    !description ||
    ignoredLineIndicators.some((indicator) =>
      normalizedDescription.includes(indicator),
    )
  ) {
    return null;
  }

  const parsedAmount = parseBrazilianAmount(amountMatch[1]);
  if (!Number.isFinite(parsedAmount.amount) || parsedAmount.amount <= 0) {
    return null;
  }

  const isCredit =
    parsedAmount.isNegative ||
    amountMatch[2]?.toUpperCase() === "C" ||
    /\b(estorno|credito|crédito|devolucao|devolução|cashback)\b/i.test(description);

  return {
    amount: Math.abs(parsedAmount.amount),
    date,
    description,
    isCredit,
  };
}

function isIgnoredInvoiceLine(line: string) {
  const normalized = normalizeText(line);
  return ignoredLineIndicators.some((indicator) =>
    normalized.includes(indicator),
  );
}

function getRejectedLine(
  line: string,
  referenceMonth: string,
): PdfRejectedInvoiceLine | null {
  if (isIgnoredInvoiceLine(line)) return null;

  const dateMatch = line.match(dateAtStartPattern);
  const amountMatch = line.match(amountAtEndPattern);
  if (!dateMatch && !amountMatch) return null;

  const date = dateMatch ? resolveDate(dateMatch, referenceMonth) : null;
  const parsedAmount = amountMatch
    ? parseBrazilianAmount(amountMatch[1])
    : { amount: Number.NaN, isNegative: false };
  const amount =
    Number.isFinite(parsedAmount.amount) && parsedAmount.amount > 0
      ? Math.abs(parsedAmount.amount)
      : null;
  const descriptionStart = dateMatch?.[0].length ?? 0;
  const descriptionEnd = amountMatch?.index ?? line.length;
  const description = line
    .slice(descriptionStart, descriptionEnd)
    .replace(/\s+/g, " ")
    .trim();
  const missing = [
    !date ? "data" : null,
    !description ? "descrição" : null,
    !amount ? "valor" : null,
  ].filter(Boolean);

  return {
    amount,
    date,
    description,
    isCredit:
      parsedAmount.isNegative ||
      amountMatch?.[2]?.toUpperCase() === "C" ||
      /\b(estorno|credito|crédito|devolucao|devolução|cashback)\b/i.test(description),
    raw: line,
    reason: missing.length
      ? `Não foi possível identificar: ${missing.join(", ")}.`
      : "A linha não corresponde ao formato esperado da fatura.",
  };
}

export function parsePdfInvoiceLines(lines: string[], referenceMonth: string) {
  return analyzePdfInvoiceLines(lines, referenceMonth).transactions;
}

/* A row of a two-column invoice holds two transactions side by side:
   "05/10 LOJA A 10,00 06/10 LOJA B 20,00". Split it into one line each. */
export function splitSideBySideTransactions(line: string) {
  const matches = Array.from(line.matchAll(embeddedTransactionPattern));
  if (matches.length < 2) return [line];

  const covered = matches.reduce((total, match) => total + match[0].trim().length, 0);
  /* Only when the pieces are the whole line, so text between them is not lost. */
  if (covered < line.replace(/\s+/g, " ").trim().length - matches.length * 2) {
    return [line];
  }

  return matches.map((match) => match[0].trim());
}

/* Descriptions that wrap: a line with the date and the start of the text,
   then a line with the rest and the amount. Text PDFs and OCR both do it. */
export function mergeWrappedLines(lines: string[]) {
  const merged: string[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const next = lines[index + 1];

    if (
      next &&
      dateAtStartPattern.test(line) &&
      !amountAtEndPattern.test(line) &&
      !dateAtStartPattern.test(next) &&
      amountAtEndPattern.test(next) &&
      !isIgnoredInvoiceLine(line) &&
      !isIgnoredInvoiceLine(next)
    ) {
      merged.push(`${line} ${next}`);
      index += 1;
      continue;
    }

    merged.push(line);
  }

  return merged;
}

export function analyzePdfInvoiceLines(
  lines: string[],
  referenceMonth: string,
) {
  const transactions: PdfInvoiceTransaction[] = [];
  const rejectedLines: PdfRejectedInvoiceLine[] = [];
  const preparedLines = mergeWrappedLines(lines).flatMap(splitSideBySideTransactions);

  for (const line of preparedLines) {
    const transaction = parseTransactionLine(line, referenceMonth);
    if (transaction) {
      transactions.push(transaction);
      continue;
    }

    const rejected = getRejectedLine(line, referenceMonth);
    if (rejected) rejectedLines.push(rejected);
  }

  return { rejectedLines, transactions };
}

function groupItemsIntoLines(pages: PositionedTextItem[][]) {
  return pages.flatMap((items) => {
    const rows: Array<{ y: number; items: PositionedTextItem[] }> = [];

    for (const item of items) {
      const text = item.str.trim();
      if (!text) continue;

      const row = rows.find((candidate) => Math.abs(candidate.y - item.y) <= 2);
      if (row) {
        row.items.push(item);
      } else {
        rows.push({ y: item.y, items: [item] });
      }
    }

    return rows
      .sort((a, b) => b.y - a.y)
      .map((row) =>
        row.items
          .sort((a, b) => a.x - b.x)
          .map((item) => item.str.trim())
          .filter(Boolean)
          .join(" "),
      );
  });
}

async function extractPositionedTextPages(
  pdf: import("pdfjs-dist").PDFDocumentProxy,
) {
  const pages: PositionedTextItem[][] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    pages.push(
      content.items.flatMap((item) =>
        "str" in item
          ? [
              {
                str: item.str,
                x: item.transform[4],
                y: item.transform[5],
              },
            ]
          : [],
      ),
    );
  }

  return pages;
}

async function renderPdfPageAsDataUrl(
  pdf: import("pdfjs-dist").PDFDocumentProxy,
  pageNumber: number,
) {
  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale: 2 });
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { alpha: false });

  if (!context) {
    throw new Error("O navegador não conseguiu preparar a página para OCR.");
  }

  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  await page.render({ canvas, canvasContext: context, viewport }).promise;

  return canvas.toDataURL("image/png");
}

function throwIfCancelled(signal?: AbortSignal) {
  if (signal?.aborted) {
    throw new DOMException("Processamento cancelado.", "AbortError");
  }
}

function mergeOcrLines(text: string) {
  const sourceLines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const line of sourceLines) {
    if (dateAtStartPattern.test(line)) {
      if (current) lines.push(current);
      current = line;
    } else if (current) {
      current = `${current} ${line}`;
    } else {
      lines.push(line);
    }

    if (current && amountAtEndPattern.test(current)) {
      lines.push(current);
      current = "";
    }
  }

  if (current) lines.push(current);
  return lines;
}

export function parseOcrInvoiceText(text: string, referenceMonth: string) {
  return analyzePdfInvoiceLines(mergeOcrLines(text), referenceMonth);
}

async function extractPdfInvoiceWithOcr(
  data: Uint8Array,
  referenceMonth: string,
  options?: {
    onProgress?: (progress: PdfOcrProgress) => void;
    password?: string;
    signal?: AbortSignal;
  },
): Promise<PdfInvoiceResult> {
  const { createWorker } = await import("tesseract.js");
  const pdfjs = await getPdfJs();

  throwIfCancelled(options?.signal);
  options?.onProgress?.({
    page: 0,
    progress: 0,
    stage: "loading",
    totalPages: 0,
  });

  const loadingTask = pdfjs.getDocument({
    data: data.slice(),
    password: options?.password || undefined,
    useSystemFonts: true,
  });
  const pdf = await loadingTask.promise;

  if (pdf.numPages > 15) {
    throw new Error(
      "O PDF possui mais de 15 páginas. Para proteger o desempenho do aparelho, use o CSV ou divida o arquivo.",
    );
  }

  let activePage = 1;
  const worker = await createWorker("por", undefined, {
    logger: (message) => {
      if (message.status === "recognizing text") {
        options?.onProgress?.({
          page: activePage,
          progress: message.progress,
          stage: "recognizing",
          totalPages: pdf.numPages,
        });
      }
    },
  });
  const cancelWorker = () => void worker.terminate();
  options?.signal?.addEventListener("abort", cancelWorker, { once: true });

  try {
    const pageTexts: string[] = [];
    const confidences: number[] = [];

    for (let page = 1; page <= pdf.numPages; page += 1) {
      throwIfCancelled(options?.signal);
      activePage = page;
      options?.onProgress?.({
        page,
        progress: 0,
        stage: "rendering",
        totalPages: pdf.numPages,
      });
      const image = await renderPdfPageAsDataUrl(pdf, page);
      throwIfCancelled(options?.signal);
      const result = await worker.recognize(image);
      pageTexts.push(result.data.text);
      confidences.push(result.data.confidence);
    }

    const text = pageTexts.join("\n");
    const { rejectedLines, transactions } = parseOcrInvoiceText(
      text,
      referenceMonth,
    );

    if (!transactions.length && !rejectedLines.length) {
      throw new Error(
        "O OCR leu o PDF, mas não encontrou lançamentos reconhecíveis. Tente exportar a fatura em CSV.",
      );
    }

    return {
      bank: detectBank(text),
      ocrConfidence: confidences.length
        ? confidences.reduce((total, confidence) => total + confidence, 0) /
          confidences.length
        : null,
      rejectedLines,
      totalPages: pdf.numPages,
      transactions,
      usedOcr: true,
    };
  } catch (error) {
    if (options?.signal?.aborted) {
      throw new DOMException("Processamento cancelado.", "AbortError");
    }
    throw error;
  } finally {
    options?.signal?.removeEventListener("abort", cancelWorker);
    await worker.terminate().catch(() => undefined);
    await loadingTask.destroy().catch(() => undefined);
  }
}

export async function extractPdfInvoice(
  file: File,
  referenceMonth: string,
  options?: {
    onProgress?: (progress: PdfOcrProgress) => void;
    password?: string;
    signal?: AbortSignal;
  },
): Promise<PdfInvoiceResult> {
  const pdfjs = await getPdfJs();
  const data = new Uint8Array(await file.arrayBuffer());
  let pdf: import("pdfjs-dist").PDFDocumentProxy;
  const loadingTask = pdfjs.getDocument({
    data: data.slice(),
    password: options?.password || undefined,
    useSystemFonts: true,
  });

  try {
    pdf = await loadingTask.promise;
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : "";
    const name = error instanceof Error ? error.name.toLowerCase() : "";

    if (message.includes("password") || name.includes("password")) {
      /* pdf.js codes: 1 = a password is needed, 2 = the one given is wrong. */
      const code = (error as { code?: number }).code;
      throw new PdfPasswordError(code === 2 || Boolean(options?.password));
    }

    throw error;
  }

  let pdfDestroyed = false;

  try {
    const items = await extractPositionedTextPages(pdf);
    const lines = groupItemsIntoLines(items);
    const text = lines.join("\n");

    if (normalizeText(text).length < 30) {
      await loadingTask.destroy();
      pdfDestroyed = true;
      return await extractPdfInvoiceWithOcr(data, referenceMonth, options);
    }

    const { rejectedLines, transactions } = analyzePdfInvoiceLines(
      lines,
      referenceMonth,
    );

    return {
      bank: detectBank(text),
      ocrConfidence: null,
      rejectedLines,
      totalPages: pdf.numPages,
      transactions,
      usedOcr: false,
    };
  } finally {
    if (!pdfDestroyed) await loadingTask.destroy().catch(() => undefined);
  }
}
