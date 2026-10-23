import {
  CircleCheckBig,
  CirclePlus,
  PencilLine,
  RefreshCw,
  Trash2,
  Undo2,
} from "lucide-react";

import { getLogName, toSnapshot } from "@/lib/activityFeed";
import type { Json, Tables } from "@/lib/database.types";

/* Labels, tones and wording for audit log entries. */

export type AuditLog = Tables<"audit_logs">;
export type AuditAction = AuditLog["action"];
export type EntityType = AuditLog["entity_type"];
export type ActivityOrigin = AuditLog["origin"];

export const entityPresentation: Record<
  EntityType,
  { singular: string; plural: string }
> = {
  transactions: { singular: "Transação", plural: "Transações" },
  cards: { singular: "Cartão", plural: "Cartões" },
  dependents: { singular: "Dependente", plural: "Dependentes" },
  categories: { singular: "Categoria", plural: "Categorias" },
  card_invoices: { singular: "Fatura", plural: "Faturas" },
  invoice_payments: {
    singular: "Pagamento de fatura",
    plural: "Pagamentos de fatura",
  },
  dependent_settlements: {
    singular: "Acerto de dependente",
    plural: "Acertos de dependentes",
  },
  category_budgets: { singular: "Orçamento", plural: "Orçamentos" },
  user_preferences: { singular: "Preferência", plural: "Preferências" },
};

export const actionPresentation: Record<
  AuditAction,
  {
    label: string;
    icon: typeof CirclePlus;
    tone: string;
    badge: string;
  }
> = {
  CREATE: {
    label: "Criação",
    icon: CirclePlus,
    tone: "bg-emerald-500/10 text-emerald-400",
    badge: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
  },
  UPDATE: {
    label: "Edição",
    icon: PencilLine,
    tone: "bg-amber-500/10 text-amber-300",
    badge: "border-amber-500/20 bg-amber-500/10 text-amber-300",
  },
  DELETE: {
    label: "Exclusão",
    icon: Trash2,
    tone: "bg-rose-500/10 text-rose-300",
    badge: "border-rose-500/20 bg-rose-500/10 text-rose-300",
  },
};

export const fieldLabels: Record<string, string> = {
  amount: "Valor",
  name: "Nome",
  label: "Nome",
  description: "Descrição",
  category: "Categoria",
  type: "Tipo",
  status: "Status",
  transaction_date: "Data",
  month_start: "Competência",
  billing_month: "Competência da fatura",
  due_date: "Vencimento",
  cycle_start: "Início do ciclo",
  cycle_end: "Fim do ciclo",
  paid_amount: "Valor pago",
  total_amount: "Valor total",
  posted_amount: "Valor lançado",
  limit_amount: "Limite",
  closing_day: "Dia de fechamento",
  due_day: "Dia de vencimento",
  recurring: "Recorrente",
  dependent_id: "Dependente",
  card_id: "Cartão",
  category_id: "Categoria",
  alert_threshold_percent: "Alerta",
  default_currency: "Moeda padrão",
  date_format: "Formato de data",
  hide_balances_by_default: "Ocultar saldos",
  invoice_reminder: "Lembrete de fatura",
  weekly_summary: "Resumo semanal",
  competence_month: "Competência",
  installment_number: "Parcela atual",
  installments_total: "Total de parcelas",
};

export const fieldValueLabels: Record<string, Record<string, string>> = {
  status: {
    PENDENTE: "Pendente",
    PAGO: "Pago",
    CONFIRMADO: "Confirmado",
    OPEN: "Em aberto",
    CLOSED: "Fechada",
    PARTIALLY_PAID: "Paga parcialmente",
    PAID: "Paga",
    CONFIRMED: "Confirmado",
    VOIDED: "Cancelado",
  },
  type: {
    card: "Cartão de crédito",
    fixed: "Débito ou Pix",
    income: "Receita",
  },
  method: {
    PIX: "Pix",
    DEBIT: "Débito",
    TRANSFER: "Transferência",
    CASH: "Dinheiro",
    OTHER: "Outro",
  },
};

export const hiddenChangedFields = new Set([
  "id",
  "user_id",
  "actor_id",
  "created_at",
  "updated_at",
  "import_signature",
  "navigation_preferences",
  "invoice_id",
  "card_id",
  "dependent_id",
  "category_id",
  "group_id",
  "split_group_id",
  "legacy_key",
  "idempotency_key",
  "day",
  "month_label",
  "notes",
  "paid_at",
  "closed_at",
]);

export const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export const activityDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "2-digit",
  month: "long",
  year: "numeric",
});

export const activityTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
});

export type ActivityPresentation = {
  label: string;
  description: string;
  icon: typeof CirclePlus;
  tone: string;
  badge: string;
  consumedFields: Set<string>;
};

export function getActivityDateLabel(value: string) {
  const formatted = activityDateFormatter.format(new Date(value));
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export function getEffectiveActivityOrigin(log: AuditLog): ActivityOrigin {
  if (log.entity_type === "card_invoices") return "SYSTEM";

  if (log.entity_type === "transactions" && log.action === "UPDATE") {
    const snapshot = toSnapshot(log.after_data ?? log.before_data);
    const isSubscriptionStatusSync =
      snapshot.type === "card" &&
      snapshot.recurring === true &&
      log.changed_fields.length > 0 &&
      log.changed_fields.every((field) => field === "status");

    if (isSubscriptionStatusSync) return "SYSTEM";
  }

  return log.origin as ActivityOrigin;
}

export function getActivityPresentation(
  log: AuditLog,
  formatCurrency: (value: number) => string,
): ActivityPresentation {
  const base = actionPresentation[log.action];
  const entity = entityPresentation[log.entity_type];
  const previousSnapshot = toSnapshot(log.before_data);
  const currentSnapshot = toSnapshot(log.after_data);
  const consumedFields = new Set<string>();

  if (log.entity_type === "card_invoices" && log.action === "UPDATE") {
    log.changed_fields.forEach((field) => consumedFields.add(field));
    const status = currentSnapshot.status;

    if (status === "PAID") {
      return {
        label: "Pagamento",
        description: "Pagamento consolidado na fatura",
        icon: CircleCheckBig,
        tone: "bg-emerald-500/10 text-emerald-400",
        badge: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
        consumedFields,
      };
    }

    if (status === "PARTIALLY_PAID") {
      return {
        label: "Pagamento parcial",
        description: "Pagamento parcial consolidado na fatura",
        icon: CircleCheckBig,
        tone: "bg-emerald-500/10 text-emerald-400",
        badge: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
        consumedFields,
      };
    }

    return {
      label: "Sincronização",
      description: "Total da fatura recalculado automaticamente",
      icon: RefreshCw,
      tone: "bg-zinc-800 text-zinc-400",
      badge: "border-zinc-700 bg-zinc-900 text-zinc-400",
      consumedFields,
    };
  }

  if (log.entity_type === "invoice_payments") {
    const amount = currentSnapshot.amount ?? previousSnapshot.amount;
    const formattedAmount =
      typeof amount === "number" ? ` de ${formatCurrency(amount)}` : "";

    if (log.action === "CREATE") {
      return {
        label: "Pagamento",
        description: `Pagamento${formattedAmount} registrado na fatura`,
        icon: CircleCheckBig,
        tone: "bg-emerald-500/10 text-emerald-400",
        badge: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
        consumedFields,
      };
    }

    if (log.action === "DELETE" || currentSnapshot.status === "VOIDED") {
      consumedFields.add("status");
      return {
        label: "Cancelamento",
        description: `Pagamento${formattedAmount} cancelado`,
        icon: Undo2,
        tone: "bg-amber-500/10 text-amber-300",
        badge: "border-amber-500/20 bg-amber-500/10 text-amber-300",
        consumedFields,
      };
    }
  }

  if (
    log.entity_type === "transactions" &&
    log.action === "UPDATE" &&
    log.changed_fields.includes("status")
  ) {
    consumedFields.add("status");
    const previousStatus = previousSnapshot.status;
    const currentStatus = currentSnapshot.status;
    const transactionType = currentSnapshot.type ?? previousSnapshot.type;
    const isRecurring = currentSnapshot.recurring ?? previousSnapshot.recurring;

    if (currentStatus === "PAGO") {
      return {
        label: "Pagamento",
        description: "Conta marcada como paga",
        icon: CircleCheckBig,
        tone: "bg-emerald-500/10 text-emerald-400",
        badge: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
        consumedFields,
      };
    }

    if (previousStatus === "PAGO" && currentStatus === "PENDENTE") {
      return {
        label: "Reabertura",
        description: "Pagamento desfeito; conta novamente pendente",
        icon: Undo2,
        tone: "bg-amber-500/10 text-amber-300",
        badge: "border-amber-500/20 bg-amber-500/10 text-amber-300",
        consumedFields,
      };
    }

    if (currentStatus === "CONFIRMADO" && transactionType === "income") {
      return {
        label: "Confirmação",
        description: "Receita confirmada",
        icon: CircleCheckBig,
        tone: "bg-emerald-500/10 text-emerald-400",
        badge: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
        consumedFields,
      };
    }

    if (
      currentStatus === "CONFIRMADO" &&
      transactionType === "card" &&
      isRecurring === true
    ) {
      return {
        label: "Cobrança",
        description: "Assinatura lançada na fatura",
        icon: CircleCheckBig,
        tone: "bg-emerald-500/10 text-emerald-400",
        badge: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
        consumedFields,
      };
    }

    const statusLabel =
      typeof currentStatus === "string"
        ? (fieldValueLabels.status[currentStatus] ?? currentStatus)
        : "atualizado";

    return {
      label: "Status",
      description: `Status alterado para ${statusLabel.toLowerCase()}`,
      icon: PencilLine,
      tone: base.tone,
      badge: base.badge,
      consumedFields,
    };
  }

  return {
    ...base,
    description: `${entity.singular} · ${base.label.toLowerCase()}`,
    consumedFields,
  };
}

export function formatChangedValue(
  field: string,
  value: Json | undefined,
  formatCurrency: (value: number) => string,
) {
  if (value === null || value === undefined || value === "") return "Vazio";
  if (typeof value === "boolean") return value ? "Sim" : "Não";

  if (typeof value === "string" && fieldValueLabels[field]?.[value]) {
    return fieldValueLabels[field][value];
  }

  if (
    typeof value === "number" &&
    ["amount", "paid_amount", "posted_amount", "total_amount", "limit_amount"].includes(
      field,
    )
  ) {
    return formatCurrency(value);
  }

  if (
    typeof value === "string" &&
    (field.endsWith("_date") ||
      field.endsWith("_month") ||
      field === "month_start" ||
      field === "cycle_start" ||
      field === "cycle_end")
  ) {
    const parsed = new Date(`${value.slice(0, 10)}T12:00:00Z`);
    if (!Number.isNaN(parsed.getTime())) return dateFormatter.format(parsed);
  }

  if (Array.isArray(value)) return value.map(String).join(", ") || "Vazio";
  if (typeof value === "object") return "Dados estruturados alterados";
  return String(value);
}

export function getReversionErrorMessage(error: unknown) {
  const message =
    error && typeof error === "object" && "message" in error
      ? String(error.message)
      : "";

  if (message.includes("FINYNC_REVERT_STALE")) {
    return "Esse registro recebeu novas alterações e não pode mais ser desfeito por aqui.";
  }
  if (message.includes("FINYNC_REVERT_ALREADY_REVERTED")) {
    return "Essa alteração já foi desfeita.";
  }
  if (message.includes("FINYNC_REVERT_TARGET_MISSING")) {
    return "O registro original não existe mais.";
  }
  if (message.includes("FINYNC_REVERT_TARGET_EXISTS")) {
    return "Já existe um registro ocupando o lugar do item excluído.";
  }
  if (message.includes("FINYNC_REVERT_GROUPED_TRANSACTION")) {
    return "Parcelas, recorrências e gastos divididos precisam ser corrigidos pelo fluxo do grupo.";
  }
  if (message.includes("FINYNC_REVERT_DEPENDENCY_MISSING")) {
    return "Um cartão, dependente ou categoria necessário para restaurar esse registro não existe mais.";
  }
  if (message.includes("FINYNC_REVERT_UNSUPPORTED")) {
    return "Essa operação não pode ser desfeita com segurança.";
  }

  return "Não foi possível desfazer essa alteração.";
}

export function getDisplayName(log: AuditLog) {
  const name = getLogName(log);
  if (name) return name;

  if (log.entity_type === "card_invoices") {
    const billingMonth = toSnapshot(log.after_data ?? log.before_data).billing_month;
    if (typeof billingMonth === "string") {
      return `Fatura de ${dateFormatter.format(new Date(`${billingMonth}T12:00:00Z`))}`;
    }
  }

  return entityPresentation[log.entity_type].singular;
}
