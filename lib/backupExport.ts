import type { Json, Tables } from "@/lib/database.types";

export const FINYNC_BACKUP_VERSION = "finync-backup-v1";

export type FinyncBackup = {
  format_version: typeof FINYNC_BACKUP_VERSION;
  generated_at: string;
  user_id: string;
  profile: Tables<"users"> | null;
  data: {
    cards: Tables<"cards">[];
    dependents: Tables<"dependents">[];
    categories: Tables<"categories">[];
    transactions: Tables<"transactions">[];
    card_invoices: Tables<"card_invoices">[];
    invoice_payments: Tables<"invoice_payments">[];
    dependent_settlements: Tables<"dependent_settlements">[];
    category_budgets: Tables<"category_budgets">[];
    audit_logs: Tables<"audit_logs">[];
  };
};

const backupCollections = [
  "cards",
  "dependents",
  "categories",
  "transactions",
  "card_invoices",
  "invoice_payments",
  "dependent_settlements",
  "category_budgets",
  "audit_logs",
] as const;

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function parseFinyncBackup(value: Json): FinyncBackup | null {
  if (!isObject(value) || value.format_version !== FINYNC_BACKUP_VERSION) {
    return null;
  }

  const backupData = value.data;

  if (
    typeof value.generated_at !== "string" ||
    typeof value.user_id !== "string" ||
    !isObject(backupData)
  ) {
    return null;
  }

  if (!backupCollections.every((collection) => Array.isArray(backupData[collection]))) {
    return null;
  }

  return value as unknown as FinyncBackup;
}

function escapeCsvCell(value: string | number | boolean | null | undefined) {
  if (value === null || value === undefined) return "";

  if (typeof value === "number") {
    return value.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      useGrouping: false,
    });
  }

  const rawValue = typeof value === "boolean" ? (value ? "Sim" : "Não") : value;
  const protectedValue = /^[=+\-@\t\r]/.test(rawValue) ? `'${rawValue}` : rawValue;

  if (/[;"\r\n]/.test(protectedValue)) {
    return `"${protectedValue.replaceAll('"', '""')}"`;
  }

  return protectedValue;
}

export function buildTransactionsCsv(backup: FinyncBackup) {
  const cardsById = new Map(backup.data.cards.map((card) => [card.id, card.name]));
  const dependentsById = new Map(
    backup.data.dependents.map((dependent) => [dependent.id, dependent.name]),
  );
  const typeLabels: Record<Tables<"transactions">["type"], string> = {
    income: "Receita",
    fixed: "Débito/PIX",
    card: "Cartão de crédito",
  };
  const headers = [
    "Data",
    "Competência",
    "Descrição",
    "Valor",
    "Tipo",
    "Categoria",
    "Status",
    "Recorrente",
    "Parcela",
    "Cartão",
    "Dependente",
    "Observações",
  ];
  const rows = backup.data.transactions.map((transaction) => [
    transaction.transaction_date,
    transaction.month_start,
    transaction.description,
    transaction.amount,
    typeLabels[transaction.type],
    transaction.category,
    transaction.status,
    transaction.recurring,
    transaction.installments_total > 1
      ? `${transaction.installment_number}/${transaction.installments_total}`
      : "",
    transaction.card_id ? cardsById.get(transaction.card_id) ?? "Cartão removido" : "",
    transaction.dependent_id
      ? dependentsById.get(transaction.dependent_id) ?? "Dependente removido"
      : "",
    transaction.notes,
  ]);

  return `\uFEFF${[headers, ...rows]
    .map((row) => row.map((value) => escapeCsvCell(value)).join(";"))
    .join("\r\n")}`;
}

export function getBackupCounts(backup: FinyncBackup) {
  return backupCollections.reduce<Record<(typeof backupCollections)[number], number>>(
    (counts, collection) => {
      counts[collection] = backup.data[collection].length;
      return counts;
    },
    {
      cards: 0,
      dependents: 0,
      categories: 0,
      transactions: 0,
      card_invoices: 0,
      invoice_payments: 0,
      dependent_settlements: 0,
      category_budgets: 0,
      audit_logs: 0,
    },
  );
}

export function getBackupFilename(extension: "json" | "csv", date: Date) {
  const datePart = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");

  return `finync-backup-${datePart}.${extension}`;
}
