"use client";

import { getSessionUser, supabase } from "@/lib/supabaseClient";
import { fetchAllPages } from "@/lib/supabasePaging";
import { markRecentlyAdded } from "@/lib/recentlyAdded";
import {
  getCardInvoiceMonthStart,
  getCurrentFinancialMonthStart,
} from "@/lib/cardBilling";
import {
  getDateOnlyParts,
  getLocalTodayDateOnly,
  normalizeDateOnly,
  toDateOnly,
} from "@/lib/dateUtils";
import type { User } from "@supabase/supabase-js";
import { create } from "zustand";
import { isTransactionInSelectedCompetence } from "@/lib/transactionPeriod";
import {
  DEFAULT_CATEGORIES,
  isEssentialCategory,
  type CategoryKind,
} from "@/lib/categories";
import type { Json, Tables, TablesUpdate } from "@/lib/database.types";
import {
  fromDbTransactionStatus,
  getCanonicalTransactionStatus,
  toDbTransactionStatus,
  type TransactionStatus,
} from "@/lib/transactionStatus";
import { reportAppError } from "@/lib/errorMonitoring";

export type TransactionType = "income" | "fixed" | "card";
export type { TransactionStatus } from "@/lib/transactionStatus";
export type CardInvoiceStatus =
  | "open"
  | "closed"
  | "partially_paid"
  | "paid";
export type InvoicePaymentMethod =
  | "PIX"
  | "DEBIT"
  | "TRANSFER"
  | "CASH"
  | "OTHER";
export type DependentSettlementMethod =
  | "PIX"
  | "TRANSFER"
  | "CASH"
  | "OTHER";
export type DefaultCurrency = "BRL" | "USD" | "EUR";
export type UserDateFormat = "DD/MM/AAAA" | "MM/DD/AAAA";

export interface NavigationPreferences {
  pinnedHrefs: string[];
  itemOrder: string[];
  collapsedSections: string[];
}

export interface UserPreferences {
  defaultCurrency: DefaultCurrency;
  dateFormat: UserDateFormat;
  hideBalancesByDefault: boolean;
  invoiceReminder: boolean;
  weeklySummary: boolean;
  navigationPreferences: NavigationPreferences;
}

export type UpdateUserPreferencesInput = Partial<UserPreferences>;

export interface Card {
  id: string;
  name: string;
  color?: string;
  emoji?: string;
  closingDay?: number;
  dueDay?: number;
  limitAmount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Dependent {
  id: string;
  name: string;
  createdAt?: string;
}

export interface CardInvoice {
  id: string;
  cardId: string;
  billingMonthStart: string;
  cycleStart: string;
  cycleEnd: string;
  dueDate: string;
  status: CardInvoiceStatus;
  postedAmount: number;
  totalAmount: number;
  paidAmount: number;
  closedAt?: string | null;
  paidAt?: string | null;
}

export interface InvoicePayment {
  id: string;
  invoiceId: string;
  amount: number;
  paidAt: string;
  method: InvoicePaymentMethod;
  status: "confirmed" | "voided";
  source: "manual" | "import" | "migration";
  notes?: string | null;
  createdAt: string;
}

export interface CreateInvoicePaymentInput {
  amount?: number;
  paidAt?: string;
  method?: InvoicePaymentMethod;
  notes?: string;
}

export interface DependentSettlement {
  id: string;
  dependentId: string;
  competenceMonth: string;
  amount: number;
  settledAt: string;
  method: DependentSettlementMethod;
  status: "confirmed" | "voided";
  source: "manual" | "import" | "migration";
  notes?: string | null;
  createdAt: string;
}

export interface CreateDependentSettlementInput {
  dependentId: string;
  competenceMonth: string;
  amount: number;
  settledAt?: string;
  method?: DependentSettlementMethod;
  notes?: string;
}

export interface Category {
  id: string;
  label: string;
  kind: CategoryKind;
  icon: string;
  isDefault?: boolean;
  createdAt?: string;
}

export interface CategoryBudget {
  id: string;
  categoryId: string;
  competenceMonth: string;
  amount: number;
  alertThresholdPercent: number;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertCategoryBudgetInput {
  categoryId: string;
  competenceMonth: string;
  amount: number;
  alertThresholdPercent?: number;
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
  type: TransactionType;
  status: TransactionStatus;
  cardId?: string | null;
  invoiceId?: string | null;
  dependentId?: string | null;
  groupId?: string | null;
  splitGroupId?: string | null;
  owner?: string;
  dependentIds?: string[];
  installments?: number;
  current_installment?: number;
  is_recurring?: boolean;
  installmentNumber?: number;
  installmentsTotal?: number;
  notes?: string;
  billingMonthStart?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type CreateTransactionInput = Omit<
  Transaction,
  "id" | "createdAt" | "updatedAt"
>;
export type UpdateTransactionInput = Partial<CreateTransactionInput>;

export type CreateCardInput = Omit<Card, "id" | "createdAt" | "updatedAt">;
export type UpdateCardInput = Partial<CreateCardInput>;
export type CreateDependentInput = Pick<Dependent, "name">;
export type CreateCategoryInput = Pick<Category, "label" | "kind" | "icon">;
export type UpdateDependentInput = Partial<CreateDependentInput>;
export type UpdateCategoryInput = Partial<CreateCategoryInput>;

type CardRow = Tables<"cards">;
type CardInvoiceRow = Tables<"card_invoices">;
type InvoicePaymentRow = Tables<"invoice_payments">;
type DependentSettlementRow = Tables<"dependent_settlements">;
type TransactionRow = Tables<"transactions">;
type DependentRow = Tables<"dependents">;
type CategoryRow = Tables<"categories">;
type CategoryBudgetRow = Tables<"category_budgets">;
type UserPreferencesRow = Tables<"user_preferences">;

interface FinanceState {
  cards: Card[];
  cardInvoices: CardInvoice[];
  invoicePayments: InvoicePayment[];
  dependentSettlements: DependentSettlement[];
  dependents: Dependent[];
  categories: Category[];
  categoryBudgets: CategoryBudget[];
  transactions: Transaction[];
  authUser: User | null;
  isAuthReady: boolean;
  isLoading: boolean;
  isFetching: boolean;
  hasInitializedFinancialMonth: boolean;
  isPreferencesReady: boolean;
  defaultCurrency: DefaultCurrency;
  dateFormat: UserDateFormat;
  hideBalancesByDefault: boolean;
  invoiceReminder: boolean;
  weeklySummary: boolean;
  navigationPreferences: NavigationPreferences;
  currentMonth: number;
  currentYear: number;
  fetchedMonth: number;
  fetchedYear: number;
  fetchPreferences: () => Promise<void>;
  updatePreferences: (preferences: UpdateUserPreferencesInput) => Promise<void>;
  setHideBalancesByDefault: (hideBalances: boolean) => Promise<void>;
  toggleHideBalancesByDefault: () => Promise<void>;
  updateAuthUser: (user: User) => void;
  initializeAuth: () => () => void;
  nextMonth: () => void;
  prevMonth: () => void;
  goToMonth: (month: number, year: number) => void;
  fetchCards: () => Promise<void>;
  fetchCardInvoices: () => Promise<void>;
  fetchInvoicePayments: (invoiceIds?: string[]) => Promise<void>;
  fetchDependentSettlements: () => Promise<void>;
  fetchDependents: () => Promise<void>;
  fetchCategories: () => Promise<void>;
  fetchCategoryBudgets: () => Promise<void>;
  addCategory: (category: CreateCategoryInput) => Promise<void>;
  editCategory: (
    categoryId: string,
    category: UpdateCategoryInput,
  ) => Promise<void>;
  deleteCategory: (categoryId: string) => Promise<void>;
  upsertCategoryBudget: (
    budget: UpsertCategoryBudgetInput,
  ) => Promise<CategoryBudget>;
  deleteCategoryBudget: (budgetId: string) => Promise<void>;
  copyPreviousMonthBudgets: (competenceMonth: string) => Promise<number>;
  addDependent: (dependent: CreateDependentInput) => Promise<void>;
  editDependent: (
    dependentId: string,
    dependent: UpdateDependentInput,
  ) => Promise<void>;
  deleteDependent: (dependentId: string) => Promise<void>;
  addCard: (card: CreateCardInput) => Promise<void>;
  editCard: (cardId: string, card: UpdateCardInput) => Promise<void>;
  deleteCard: (cardId: string) => Promise<void>;
  fetchTransactions: (options?: { includeAllMonths?: boolean }) => Promise<void>;
  addTransaction: (transaction: CreateTransactionInput) => Promise<void>;
  addTransactions: (transactions: CreateTransactionInput[]) => Promise<void>;
  updateTransaction: (
    transactionId: string,
    transaction: UpdateTransactionInput,
  ) => Promise<void>;
  updateTransactionGroup: (
    groupId: string,
    fromDate: string,
    transaction: UpdateTransactionInput,
    scope?: "future" | "all",
  ) => Promise<void>;
  updateTransactionCategories: (
    transactionIds: string[],
    category: string,
  ) => Promise<void>;
  payCardInvoice: (
    invoiceId: string,
    payment?: CreateInvoicePaymentInput,
  ) => Promise<InvoicePayment>;
  settleDependent: (
    settlement: CreateDependentSettlementInput,
  ) => Promise<DependentSettlement>;
  addIncome: (
    income: Pick<CreateTransactionInput, "amount" | "date" | "description">,
  ) => Promise<void>;
  deleteTransaction: (transactionId: string) => Promise<void>;
  deleteTransactionGroup: (groupId: string, fromDate: string) => Promise<void>;
  clearFinanceState: () => void;
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

function getMonthStart(date: string) {
  const { month, year } = getDateOnlyParts(date);

  return toDateOnly(year, month, 1);
}

function getSelectedMonthRange(month: number, year: number) {
  const startDate = toDateOnly(year, month, 1);
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextMonthYear = month === 12 ? year + 1 : year;
  const endDate = toDateOnly(nextMonthYear, nextMonth, 1);

  return { startDate, endDate };
}

function addMonthsToMonthStart(month: number, year: number, offset: number) {
  const monthIndex = month - 1 + offset;
  const nextYear = year + Math.floor(monthIndex / 12);
  const nextMonth = (((monthIndex % 12) + 12) % 12) + 1;

  return toDateOnly(nextYear, nextMonth, 1);
}

function getOperationalMonthRange(month: number, year: number) {
  return {
    startDate: addMonthsToMonthStart(month, year, -1),
    endDate: addMonthsToMonthStart(month, year, 13),
  };
}

function getDayFromDate(date: string) {
  return getDateOnlyParts(date).day;
}

function replaceDateOnlyDay(date: string, nextDay: number) {
  const { month, year } = getDateOnlyParts(date);
  const lastDayOfMonth = new Date(year, month, 0).getDate();

  return toDateOnly(year, month, Math.min(nextDay, lastDayOfMonth));
}

function toTransactionType(value: string | null): TransactionType {
  const normalizedValue = value?.toLowerCase().trim();

  if (normalizedValue === "income" || normalizedValue === "receita") {
    return "income";
  }

  if (normalizedValue === "card") {
    return "card";
  }

  return "fixed";
}

function toAmount(value: number | string | null | undefined): number {
  const normalizedValue =
    typeof value === "string" ? value.replace(",", ".") : value;
  const amount = Number(normalizedValue);

  return Number.isFinite(amount) ? amount : 0;
}

function mapCard(row: CardRow): Card {
  return {
    id: row.id,
    name: row.name,
    color: row.color ?? undefined,
    emoji: row.emoji ?? undefined,
    closingDay: row.closing_day ?? undefined,
    dueDay: row.due_day ?? undefined,
    limitAmount: row.limit_amount ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapCardInvoice(row: CardInvoiceRow): CardInvoice {
  const today = getLocalTodayDateOnly();
  const persistedStatus = row.status.toLowerCase() as CardInvoiceStatus;
  const status =
    persistedStatus === "open" && row.cycle_end < today
      ? "closed"
      : persistedStatus;

  return {
    id: row.id,
    cardId: row.card_id,
    billingMonthStart: row.billing_month,
    cycleStart: row.cycle_start,
    cycleEnd: row.cycle_end,
    dueDate: row.due_date,
    status,
    postedAmount: toAmount(row.posted_amount),
    totalAmount: toAmount(row.total_amount),
    paidAmount: toAmount(row.paid_amount),
    closedAt: row.closed_at,
    paidAt: row.paid_at,
  };
}

function mapInvoicePayment(row: InvoicePaymentRow): InvoicePayment {
  const method: InvoicePaymentMethod = [
    "PIX",
    "DEBIT",
    "TRANSFER",
    "CASH",
    "OTHER",
  ].includes(row.method)
    ? (row.method as InvoicePaymentMethod)
    : "OTHER";

  return {
    id: row.id,
    invoiceId: row.invoice_id,
    amount: toAmount(row.amount),
    paidAt: row.paid_at,
    method,
    status: row.status.toLowerCase() as InvoicePayment["status"],
    source: row.source.toLowerCase() as InvoicePayment["source"],
    notes: row.notes,
    createdAt: row.created_at,
  };
}

function mapDependentSettlement(
  row: DependentSettlementRow,
): DependentSettlement {
  const method: DependentSettlementMethod = [
    "PIX",
    "TRANSFER",
    "CASH",
    "OTHER",
  ].includes(row.method)
    ? (row.method as DependentSettlementMethod)
    : "OTHER";

  return {
    id: row.id,
    dependentId: row.dependent_id,
    competenceMonth: row.competence_month,
    amount: toAmount(row.amount),
    settledAt: row.settled_at,
    method,
    status: row.status.toLowerCase() as DependentSettlement["status"],
    source: row.source.toLowerCase() as DependentSettlement["source"],
    notes: row.notes,
    createdAt: row.created_at,
  };
}

function mapTransaction(row: TransactionRow): Transaction {
  const { month, year } = getDateOnlyParts(row.month_start);

  return {
    id: row.id,
    description: row.description,
    amount: toAmount(row.amount),
    date: row.transaction_date ?? toDateOnly(year, month, row.day || 1),
    category: row.category ?? "",
    type: toTransactionType(row.type),
    status: fromDbTransactionStatus(row.status),
    cardId: row.card_id,
    invoiceId: row.invoice_id ?? null,
    dependentId: row.dependent_id,
    groupId: row.group_id,
    splitGroupId: row.split_group_id,
    owner: row.owner ?? "eu",
    dependentIds: row.split_with ?? ["eu"],
    installments: row.installments_total ?? undefined,
    current_installment: row.installment_number ?? undefined,
    is_recurring: row.recurring ?? undefined,
    installmentNumber: row.installment_number ?? undefined,
    installmentsTotal: row.installments_total ?? undefined,
    notes: row.notes ?? undefined,
    billingMonthStart: row.month_start,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapDependent(row: DependentRow): Dependent {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
  };
}

function toTransactionInsertPayload(
  transaction: CreateTransactionInput,
  userId: string,
  cardClosingDay?: number,
) {
  const normalizedDate = normalizeDateOnly(transaction.date);
  const monthStart =
    transaction.type === "card"
      ? transaction.billingMonthStart
        ? getMonthStart(transaction.billingMonthStart)
        : getCardInvoiceMonthStart(normalizedDate, cardClosingDay)
      : getMonthStart(normalizedDate);

  return {
    user_id: userId,
    card_id: transaction.type === "card" ? (transaction.cardId ?? null) : null,
    dependent_id: transaction.dependentId ?? null,
    group_id: transaction.groupId ?? null,
    ...(transaction.splitGroupId
      ? { split_group_id: transaction.splitGroupId }
      : {}),
    month_start: monthStart,
    transaction_date: normalizedDate,
    type: transaction.type,
    description: transaction.description,
    category: transaction.category,
    amount: transaction.amount,
    day: getDayFromDate(normalizedDate),
    status: toDbTransactionStatus(getCanonicalTransactionStatus(transaction)),
    owner: transaction.owner ?? "eu",
    installment_number:
      transaction.current_installment ?? transaction.installmentNumber ?? 1,
    installments_total:
      transaction.installments ?? transaction.installmentsTotal ?? 1,
    notes: transaction.notes ?? "",
    recurring: transaction.is_recurring ?? false,
    split_with: transaction.dependentIds?.length
      ? transaction.dependentIds
      : [transaction.owner ?? "eu"],
  };
}

function isTransactionInSelectedRange(
  transaction: Transaction,
  month: number,
  year: number,
) {
  return isTransactionInSelectedCompetence(transaction, month, year);
}

function getDefaultCategories(): Category[] {
  return DEFAULT_CATEGORIES.map((category) => ({
    ...category,
    id: `default-${category.kind}-${slugify(category.label)}`,
    isDefault: true,
  }));
}

function getEssentialCategories() {
  return getDefaultCategories().filter((category) =>
    isEssentialCategory(category.label),
  );
}

function mapCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    label: row.label ?? row.name ?? "Categoria",
    kind: row.kind === "income" ? "income" : "expense",
    icon: row.icon ?? "Tag",
    createdAt: row.created_at,
  };
}

function mapCategoryBudget(row: CategoryBudgetRow): CategoryBudget {
  return {
    id: row.id,
    categoryId: row.category_id,
    competenceMonth: row.competence_month,
    amount: toAmount(row.amount),
    alertThresholdPercent: row.alert_threshold_percent,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mergeCategories(customCategories: Category[]) {
  const customKeys = new Set(
    customCategories.map(
      (category) =>
        `${category.kind}:${category.label.toLocaleLowerCase("pt-BR")}`,
    ),
  );

  return [
    ...customCategories,
    ...getEssentialCategories().filter(
      (category) =>
        !customKeys.has(
          `${category.kind}:${category.label.toLocaleLowerCase("pt-BR")}`,
        ),
    ),
  ].sort((left, right) => left.label.localeCompare(right.label, "pt-BR"));
}

function getCurrentUser(): Promise<User | null> {
  return getSessionUser();
}

/* Due subscription charges only change with the date, so the sync runs on
   the first load and then at most every few minutes, not on every fetch. */
const STATUS_SYNC_INTERVAL_MS = 5 * 60 * 1000;
let lastStatusSyncAt = 0;

async function syncDueTransactionStatuses() {
  if (Date.now() - lastStatusSyncAt < STATUS_SYNC_INTERVAL_MS) return;

  const { error } = await supabase.rpc("finync_sync_due_transaction_statuses");
  if (error) throw error;

  lastStatusSyncAt = Date.now();
}

const preferenceStorageKeys = {
  owner: "finync-preferences-owner",
  dirty: "finync-preferences-dirty",
  defaultCurrency: "finync-default-currency",
  dateFormat: "finync-date-format",
  hideBalancesByDefault: "finync-hide-balances-by-default",
  invoiceReminder: "finync-invoice-reminder",
  weeklySummary: "finync-weekly-summary",
  navigationPreferences: "finync-navigation-preferences",
} as const;

const defaultNavigationPreferences: NavigationPreferences = {
  pinnedHrefs: [],
  itemOrder: [],
  collapsedSections: [],
};

const defaultUserPreferences: UserPreferences = {
  defaultCurrency: "BRL",
  dateFormat: "DD/MM/AAAA",
  hideBalancesByDefault: false,
  invoiceReminder: false,
  weeklySummary: false,
  navigationPreferences: defaultNavigationPreferences,
};

function isDefaultCurrency(value: string | null): value is DefaultCurrency {
  return value === "BRL" || value === "USD" || value === "EUR";
}

function isUserDateFormat(value: string | null): value is UserDateFormat {
  return value === "DD/MM/AAAA" || value === "MM/DD/AAAA";
}

function normalizeNavigationPreferences(
  value: unknown,
): NavigationPreferences {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return defaultNavigationPreferences;
  }

  const preferences = value as Record<string, unknown>;
  const normalizeStringArray = (candidate: unknown) =>
    Array.isArray(candidate)
      ? [...new Set(candidate.filter((item): item is string => typeof item === "string"))]
      : [];

  return {
    pinnedHrefs: normalizeStringArray(preferences.pinnedHrefs),
    itemOrder: normalizeStringArray(preferences.itemOrder),
    collapsedSections: normalizeStringArray(preferences.collapsedSections),
  };
}

function getStoredPreferences(userId?: string): UserPreferences {
  if (typeof window === "undefined") return defaultUserPreferences;

  const storedOwner = window.localStorage.getItem(preferenceStorageKeys.owner);
  if (userId && storedOwner && storedOwner !== userId) {
    return defaultUserPreferences;
  }

  const storedCurrency = window.localStorage.getItem(
    preferenceStorageKeys.defaultCurrency,
  );
  const storedDateFormat = window.localStorage.getItem(
    preferenceStorageKeys.dateFormat,
  );
  const storedNavigationPreferences = window.localStorage.getItem(
    preferenceStorageKeys.navigationPreferences,
  );

  let navigationPreferences = defaultNavigationPreferences;
  try {
    navigationPreferences = normalizeNavigationPreferences(
      storedNavigationPreferences
        ? JSON.parse(storedNavigationPreferences)
        : null,
    );
  } catch {
    navigationPreferences = defaultNavigationPreferences;
  }

  return {
    defaultCurrency: isDefaultCurrency(storedCurrency)
      ? storedCurrency
      : defaultUserPreferences.defaultCurrency,
    dateFormat: isUserDateFormat(storedDateFormat)
      ? storedDateFormat
      : defaultUserPreferences.dateFormat,
    hideBalancesByDefault:
      window.localStorage.getItem(preferenceStorageKeys.hideBalancesByDefault) ===
      "true",
    invoiceReminder:
      window.localStorage.getItem(preferenceStorageKeys.invoiceReminder) ===
      "true",
    weeklySummary:
      window.localStorage.getItem(preferenceStorageKeys.weeklySummary) === "true",
    navigationPreferences,
  };
}

function persistPreferences(preferences: UserPreferences, userId?: string) {
  if (typeof window === "undefined") return;

  if (userId) {
    window.localStorage.setItem(preferenceStorageKeys.owner, userId);
  }

  window.localStorage.setItem(
    preferenceStorageKeys.defaultCurrency,
    preferences.defaultCurrency,
  );
  window.localStorage.setItem(
    preferenceStorageKeys.dateFormat,
    preferences.dateFormat,
  );
  window.localStorage.setItem(
    preferenceStorageKeys.hideBalancesByDefault,
    String(preferences.hideBalancesByDefault),
  );
  window.localStorage.setItem(
    preferenceStorageKeys.invoiceReminder,
    String(preferences.invoiceReminder),
  );
  window.localStorage.setItem(
    preferenceStorageKeys.weeklySummary,
    String(preferences.weeklySummary),
  );
  window.localStorage.setItem(
    preferenceStorageKeys.navigationPreferences,
    JSON.stringify(preferences.navigationPreferences),
  );
}

function hasPendingPreferenceSync(userId: string) {
  if (typeof window === "undefined") return false;

  return (
    window.localStorage.getItem(preferenceStorageKeys.owner) === userId &&
    window.localStorage.getItem(preferenceStorageKeys.dirty) === "true"
  );
}

function setPendingPreferenceSync(pending: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(preferenceStorageKeys.dirty, String(pending));
}

function mapUserPreferences(row: UserPreferencesRow): UserPreferences {
  return {
    defaultCurrency: isDefaultCurrency(row.default_currency)
      ? row.default_currency
      : defaultUserPreferences.defaultCurrency,
    dateFormat: isUserDateFormat(row.date_format)
      ? row.date_format
      : defaultUserPreferences.dateFormat,
    hideBalancesByDefault: row.hide_balances_by_default,
    invoiceReminder: row.invoice_reminder,
    weeklySummary: row.weekly_summary,
    navigationPreferences: normalizeNavigationPreferences(
      row.navigation_preferences,
    ),
  };
}

function getPreferencesFromState(state: FinanceState): UserPreferences {
  return {
    defaultCurrency: state.defaultCurrency,
    dateFormat: state.dateFormat,
    hideBalancesByDefault: state.hideBalancesByDefault,
    invoiceReminder: state.invoiceReminder,
    weeklySummary: state.weeklySummary,
    navigationPreferences: state.navigationPreferences,
  };
}

const initialUserPreferences = getStoredPreferences();

function reportFinanceError(operation: string, error: unknown) {
  if (process.env.NODE_ENV === "development") {
    console.error(operation, error);
  }

  void reportAppError(error, {
    source: "SUPABASE",
    context: { operation },
  });
}

export const useFinanceStore = create<FinanceState>()((set, get) => ({
  cards: [],
  cardInvoices: [],
  invoicePayments: [],
  dependentSettlements: [],
  dependents: [],
  categories: getEssentialCategories(),
  categoryBudgets: [],
  transactions: [],
  authUser: null,
  isAuthReady: false,
  isLoading: true,
  isFetching: false,
  hasInitializedFinancialMonth: false,
  isPreferencesReady: false,
  ...initialUserPreferences,
  currentMonth: getDateOnlyParts(getLocalTodayDateOnly()).month,
  currentYear: getDateOnlyParts(getLocalTodayDateOnly()).year,
  fetchedMonth: getDateOnlyParts(getLocalTodayDateOnly()).month,
  fetchedYear: getDateOnlyParts(getLocalTodayDateOnly()).year,

  fetchPreferences: async () => {
    const user = get().authUser ?? (await getCurrentUser());
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("user_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      const localPreferences = getStoredPreferences(user.id);
      if (hasPendingPreferenceSync(user.id)) {
        const { error: syncError } = await supabase
          .from("user_preferences")
          .upsert(
            {
              user_id: user.id,
              default_currency: localPreferences.defaultCurrency,
              date_format: localPreferences.dateFormat,
              hide_balances_by_default: localPreferences.hideBalancesByDefault,
              invoice_reminder: localPreferences.invoiceReminder,
              weekly_summary: localPreferences.weeklySummary,
              navigation_preferences:
                localPreferences.navigationPreferences as unknown as Json,
            },
            { onConflict: "user_id" },
          );

        if (syncError) throw syncError;

        setPendingPreferenceSync(false);
        set({ ...localPreferences, isPreferencesReady: true });
        return;
      }

      if (data) {
        const preferences = mapUserPreferences(data as UserPreferencesRow);
        persistPreferences(preferences, user.id);
        set({ ...preferences, isPreferencesReady: true });
        return;
      }

      const { error: insertError } = await supabase
        .from("user_preferences")
        .insert({
          user_id: user.id,
          default_currency: localPreferences.defaultCurrency,
          date_format: localPreferences.dateFormat,
          hide_balances_by_default: localPreferences.hideBalancesByDefault,
          invoice_reminder: localPreferences.invoiceReminder,
          weekly_summary: localPreferences.weeklySummary,
          navigation_preferences:
            localPreferences.navigationPreferences as unknown as Json,
        });

      if (insertError) throw insertError;

      persistPreferences(localPreferences, user.id);
      setPendingPreferenceSync(false);
      set({ ...localPreferences, isPreferencesReady: true });
    } catch (error) {
      reportFinanceError("Sincronizar preferências", error);
      set({ isPreferencesReady: true });
    }
  },

  updatePreferences: async (updates) => {
    const previousPreferences = getPreferencesFromState(get());
    const nextPreferences = { ...previousPreferences, ...updates };
    const user = get().authUser ?? (await getCurrentUser());

    persistPreferences(nextPreferences, user?.id);
    set({ ...nextPreferences, isPreferencesReady: true });

    if (!user) return;

    const { error } = await supabase.from("user_preferences").upsert(
      {
        user_id: user.id,
        default_currency: nextPreferences.defaultCurrency,
        date_format: nextPreferences.dateFormat,
        hide_balances_by_default: nextPreferences.hideBalancesByDefault,
        invoice_reminder: nextPreferences.invoiceReminder,
        weekly_summary: nextPreferences.weeklySummary,
        navigation_preferences:
          nextPreferences.navigationPreferences as unknown as Json,
      },
      { onConflict: "user_id" },
    );

    if (error) {
      setPendingPreferenceSync(true);
      throw error;
    }

    setPendingPreferenceSync(false);
  },

  setHideBalancesByDefault: async (hideBalances) => {
    try {
      await get().updatePreferences({ hideBalancesByDefault: hideBalances });
    } catch (error) {
      reportFinanceError("Sincronizar privacidade", error);
    }
  },

  toggleHideBalancesByDefault: async () => {
    try {
      await get().updatePreferences({
        hideBalancesByDefault: !get().hideBalancesByDefault,
      });
    } catch (error) {
      reportFinanceError("Alternar privacidade", error);
    }
  },

  updateAuthUser: (user) => set({ authUser: user }),

  nextMonth: () => {
    set((state) => {
      if (state.currentMonth === 12) {
        return {
          currentMonth: 1,
          currentYear: state.currentYear + 1,
          isFetching: true,
        };
      }

      return { currentMonth: state.currentMonth + 1, isFetching: true };
    });
  },

  goToMonth: (month, year) => {
    set((state) =>
      state.currentMonth === month && state.currentYear === year
        ? {}
        : { currentMonth: month, currentYear: year, isFetching: true },
    );
  },

  prevMonth: () => {
    set((state) => {
      if (state.currentMonth === 1) {
        return {
          currentMonth: 12,
          currentYear: state.currentYear - 1,
          isFetching: true,
        };
      }

      return { currentMonth: state.currentMonth - 1, isFetching: true };
    });
  },

  initializeAuth: () => {
    if (!get().isAuthReady) {
      set({ isLoading: true });
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const user = session?.user ?? null;
      const isFirstAuthCheck = !get().isAuthReady;

      if (
        user &&
        [
          "INITIAL_SESSION",
          "SIGNED_IN",
          "TOKEN_REFRESHED",
          "USER_UPDATED",
        ].includes(event)
      ) {
        set({
          authUser: user,
          isAuthReady: true,
          isLoading: isFirstAuthCheck,
        });

        window.setTimeout(() => {
          void Promise.all([
            get().fetchCards(),
            get().fetchDependents(),
            get().fetchCategories(),
            get().fetchPreferences(),
            get().fetchTransactions(),
          ]).finally(() => {
            if (isFirstAuthCheck) {
              set({ isLoading: false });
            }
          });
        }, 0);

        return;
      }

      if (event === "INITIAL_SESSION" || event === "SIGNED_OUT" || !user) {
        set({
          authUser: null,
          cards: [],
          cardInvoices: [],
          invoicePayments: [],
          dependentSettlements: [],
          dependents: [],
          categories: getEssentialCategories(),
          categoryBudgets: [],
          transactions: [],
          isAuthReady: true,
          isLoading: false,
          isFetching: false,
          hasInitializedFinancialMonth: false,
          isPreferencesReady: false,
          ...defaultUserPreferences,
        });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  },

  clearFinanceState: () => {
    set({
      authUser: null,
      cards: [],
      cardInvoices: [],
      invoicePayments: [],
      dependentSettlements: [],
      dependents: [],
      categories: getEssentialCategories(),
      categoryBudgets: [],
      transactions: [],
      isAuthReady: true,
      isLoading: false,
      isFetching: false,
      hasInitializedFinancialMonth: false,
      isPreferencesReady: false,
      ...defaultUserPreferences,
    });
  },

  fetchDependents: async () => {
    try {
      const user = await getCurrentUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("dependents")
        .select("*")
        .eq("user_id", user.id)
        .order("name", { ascending: true });

      if (error) throw error;

      set({ dependents: (data as DependentRow[]).map(mapDependent) });
    } catch (error) {
      reportFinanceError("Buscar dependentes", error);
      throw error;
    }
  },

  fetchCategories: async () => {
    try {
      const user = await getCurrentUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("categories")
        .select("id, name, label, kind, icon, created_at")
        .eq("user_id", user.id)
        .order("label", { ascending: true });

      if (error) throw error;

      set({
        categories: mergeCategories(
          ((data ?? []) as CategoryRow[]).map(mapCategory),
        ),
      });
    } catch (error) {
      reportFinanceError("Buscar categorias", error);
      set({ categories: getEssentialCategories() });
    }
  },

  fetchCategoryBudgets: async () => {
    try {
      const user = await getCurrentUser();
      if (!user) return;

      const competenceMonth = toDateOnly(
        get().currentYear,
        get().currentMonth,
        1,
      );
      const { data, error } = await supabase
        .from("category_budgets")
        .select("*")
        .eq("user_id", user.id)
        .eq("competence_month", competenceMonth)
        .order("created_at", { ascending: true });

      if (error) throw error;

      set({
        categoryBudgets: (data as CategoryBudgetRow[]).map(mapCategoryBudget),
      });
    } catch (error) {
      reportFinanceError("Buscar orçamentos por categoria", error);
      throw error;
    }
  },

  addCategory: async (category) => {
    const user = await getCurrentUser();
    if (!user) throw new Error("Usuário não autenticado.");

    const label = category.label.trim();

    const { data, error } = await supabase
      .from("categories")
      .insert({
        user_id: user.id,
        name: label,
        label,
        kind: category.kind,
        icon: category.icon,
      })
      .select("id, name, label, kind, icon, created_at")
      .single();

    if (error) throw error;

    set((state) => ({
      categories: mergeCategories([
        ...state.categories.filter((item) => !item.isDefault),
        mapCategory(data as CategoryRow),
      ]),
    }));
  },

  editCategory: async (categoryId, category) => {
    const currentCategory = get().categories.find(
      (item) => item.id === categoryId,
    );
    if (!currentCategory) throw new Error("Categoria não encontrada.");
    if (isEssentialCategory(currentCategory.label)) {
      throw new Error("Esta categoria é essencial e não pode ser alterada.");
    }

    const user = await getCurrentUser();
    if (!user) throw new Error("Usuário não autenticado.");

    const nextLabel = category.label?.trim() || currentCategory.label;
    const nextKind = category.kind ?? currentCategory.kind;
    const nextIcon = category.icon ?? currentCategory.icon;
    const { data, error } = await supabase
      .from("categories")
      .update({
        name: nextLabel,
        label: nextLabel,
        kind: nextKind,
        icon: nextIcon,
      })
      .eq("id", categoryId)
      .eq("user_id", user.id)
      .select("id, name, label, kind, icon, created_at")
      .single();

    if (error) throw error;

    if (nextLabel !== currentCategory.label) {
      const { error: transactionsError } = await supabase
        .from("transactions")
        .update({ category: nextLabel })
        .eq("user_id", user.id)
        .eq("category", currentCategory.label);

      if (transactionsError) {
        await supabase
          .from("categories")
          .update({
            name: currentCategory.label,
            label: currentCategory.label,
            kind: currentCategory.kind,
            icon: currentCategory.icon,
          })
          .eq("id", categoryId)
          .eq("user_id", user.id);
        throw transactionsError;
      }
    }

    const savedCategory = mapCategory(data as CategoryRow);
    set((state) => ({
      categories: mergeCategories(
        state.categories.map((item) =>
          item.id === categoryId ? savedCategory : item,
        ),
      ),
      transactions: state.transactions.map((transaction) =>
        transaction.category === currentCategory.label
          ? { ...transaction, category: nextLabel }
          : transaction,
      ),
    }));
  },

  deleteCategory: async (categoryId) => {
    const category = get().categories.find((item) => item.id === categoryId);
    if (!category) throw new Error("Categoria não encontrada.");
    if (isEssentialCategory(category.label)) {
      throw new Error("Esta categoria é essencial e não pode ser excluída.");
    }

    const user = await getCurrentUser();
    if (!user) throw new Error("Usuário não autenticado.");

    const { data, error } = await supabase
      .from("categories")
      .delete()
      .eq("id", categoryId)
      .eq("user_id", user.id)
      .select("id")
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      throw new Error("A categoria não foi removida pelo banco de dados.");
    }

    set((state) => ({
      categories: mergeCategories(
        state.categories.filter((item) => item.id !== categoryId),
      ),
      categoryBudgets: state.categoryBudgets.filter(
        (budget) => budget.categoryId !== categoryId,
      ),
    }));
  },

  upsertCategoryBudget: async (budget) => {
    try {
      const user = await getCurrentUser();
      if (!user) throw new Error("Usuário não autenticado.");

      const amount = Number(budget.amount);
      const alertThresholdPercent = budget.alertThresholdPercent ?? 80;

      if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error("Informe um limite mensal válido.");
      }

      if (
        !Number.isInteger(alertThresholdPercent) ||
        alertThresholdPercent < 1 ||
        alertThresholdPercent > 100
      ) {
        throw new Error("O alerta deve estar entre 1% e 100%.");
      }

      const { data, error } = await supabase
        .from("category_budgets")
        .upsert(
          {
            user_id: user.id,
            category_id: budget.categoryId,
            competence_month: getMonthStart(budget.competenceMonth),
            amount,
            alert_threshold_percent: alertThresholdPercent,
          },
          { onConflict: "user_id,category_id,competence_month" },
        )
        .select("*")
        .single();

      if (error) throw error;
      if (!data) throw new Error("Orçamento não retornado pelo Supabase.");

      const savedBudget = mapCategoryBudget(data as CategoryBudgetRow);

      set((state) => ({
        categoryBudgets: [
          ...state.categoryBudgets.filter(
            (currentBudget) => currentBudget.id !== savedBudget.id,
          ),
          savedBudget,
        ],
      }));

      return savedBudget;
    } catch (error) {
      reportFinanceError("Salvar orçamento por categoria", error);
      throw error;
    }
  },

  copyPreviousMonthBudgets: async (competenceMonth) => {
    try {
      const user = await getCurrentUser();
      if (!user) throw new Error("Usuário não autenticado.");

      const { month, year } = getDateOnlyParts(competenceMonth);
      const previousMonth = toDateOnly(
        month === 1 ? year - 1 : year,
        month === 1 ? 12 : month - 1,
        1,
      );
      const { data, error } = await supabase
        .from("category_budgets")
        .select("*")
        .eq("user_id", user.id)
        .eq("competence_month", previousMonth);

      if (error) throw error;

      /* Never overwrite a limit already set for the target month. */
      const budgetedCategoryIds = new Set(
        get()
          .categoryBudgets.filter(
            (budget) => budget.competenceMonth === competenceMonth,
          )
          .map((budget) => budget.categoryId),
      );
      const toCopy = (data as CategoryBudgetRow[])
        .map(mapCategoryBudget)
        .filter((budget) => !budgetedCategoryIds.has(budget.categoryId));

      for (const budget of toCopy) {
        await get().upsertCategoryBudget({
          categoryId: budget.categoryId,
          competenceMonth,
          amount: budget.amount,
          alertThresholdPercent: budget.alertThresholdPercent,
        });
      }

      return toCopy.length;
    } catch (error) {
      reportFinanceError("Copiar orçamentos do mês anterior", error);
      throw error;
    }
  },

  deleteCategoryBudget: async (budgetId) => {
    try {
      const user = await getCurrentUser();
      if (!user) throw new Error("Usuário não autenticado.");

      const { error } = await supabase
        .from("category_budgets")
        .delete()
        .eq("id", budgetId)
        .eq("user_id", user.id);

      if (error) throw error;

      set((state) => ({
        categoryBudgets: state.categoryBudgets.filter(
          (budget) => budget.id !== budgetId,
        ),
      }));
    } catch (error) {
      reportFinanceError("Excluir orçamento por categoria", error);
      throw error;
    }
  },

  addDependent: async (dependent) => {
    try {
      const user = await getCurrentUser();
      if (!user) throw new Error("Usuário não autenticado.");

      const { error: profileError } = await supabase.from("users").upsert(
        {
          id: user.id,
          email: user.email,
          plan: "free",
        },
        { onConflict: "id" },
      );

      if (profileError) throw profileError;

      const { data, error } = await supabase
        .from("dependents")
        .insert({ user_id: user.id, name: dependent.name.trim() })
        .select("*")
        .single();

      if (error) throw error;

      set((state) => ({
        dependents: [
          ...state.dependents,
          mapDependent(data as DependentRow),
        ].sort((left, right) => left.name.localeCompare(right.name, "pt-BR")),
      }));
    } catch (error) {
      reportFinanceError("Adicionar dependente", error);
      throw error;
    }
  },

  editDependent: async (dependentId, dependent) => {
    try {
      const user = await getCurrentUser();
      if (!user) throw new Error("Usuário não autenticado.");

      const name = dependent.name?.trim();
      if (!name) throw new Error("Informe o nome do dependente.");

      const { data, error } = await supabase
        .from("dependents")
        .update({ name })
        .eq("id", dependentId)
        .eq("user_id", user.id)
        .select("*")
        .single();

      if (error) throw error;

      const savedDependent = mapDependent(data as DependentRow);
      set((state) => ({
        dependents: state.dependents
          .map((item) =>
            item.id === dependentId ? savedDependent : item,
          )
          .sort((left, right) => left.name.localeCompare(right.name, "pt-BR")),
      }));
    } catch (error) {
      reportFinanceError("Editar dependente", error);
      throw error;
    }
  },

  deleteDependent: async (dependentId) => {
    try {
      const user = await getCurrentUser();
      if (!user) throw new Error("Usuário não autenticado.");

      const { error } = await supabase
        .from("dependents")
        .delete()
        .eq("id", dependentId)
        .eq("user_id", user.id);

      if (error) throw error;

      set((state) => ({
        dependents: state.dependents.filter(
          (dependent) => dependent.id !== dependentId,
        ),
        dependentSettlements: state.dependentSettlements.filter(
          (settlement) => settlement.dependentId !== dependentId,
        ),
        transactions: state.transactions.map((transaction) =>
          transaction.dependentId === dependentId
            ? { ...transaction, dependentId: null }
            : transaction,
        ),
      }));
    } catch (error) {
      reportFinanceError("Remover dependente", error);
      throw error;
    }
  },

  fetchCards: async () => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        return;
      }

      const { data, error } = await supabase
        .from("cards")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (error) throw error;

      const cards = (data as CardRow[]).map(mapCard);
      const financialMonthStart = getCurrentFinancialMonthStart(cards);
      const financialMonth = getDateOnlyParts(financialMonthStart);

      set((state) => ({
        cards,
        ...(state.hasInitializedFinancialMonth
          ? {}
          : {
              currentMonth: financialMonth.month,
              currentYear: financialMonth.year,
              isFetching: true,
              hasInitializedFinancialMonth: true,
            }),
      }));
    } catch (error) {
      reportFinanceError("Buscar cartões", error);
    }
  },

  fetchCardInvoices: async () => {
    try {
      const user = await getCurrentUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("card_invoices")
        .select("*")
        .eq("user_id", user.id)
        .order("billing_month", { ascending: false });

      if (error) throw error;

      const cardInvoices = (data as CardInvoiceRow[]).map(mapCardInvoice);
      const { startDate, endDate } = getSelectedMonthRange(
        get().currentMonth,
        get().currentYear,
      );
      const selectedInvoiceIds = cardInvoices
        .filter(
          (invoice) =>
            invoice.billingMonthStart >= startDate &&
            invoice.billingMonthStart < endDate,
        )
        .map((invoice) => invoice.id);

      set({ cardInvoices });
      await get().fetchInvoicePayments(selectedInvoiceIds);
    } catch (error) {
      reportFinanceError("Buscar faturas", error);
    }
  },

  fetchInvoicePayments: async (invoiceIds) => {
    try {
      const user = await getCurrentUser();
      if (!user) return;

      const selectedInvoiceIds =
        invoiceIds ?? get().cardInvoices.map((invoice) => invoice.id);

      if (!selectedInvoiceIds.length) {
        set({ invoicePayments: [] });
        return;
      }

      const { data, error } = await supabase
        .from("invoice_payments")
        .select("*")
        .eq("user_id", user.id)
        .in("invoice_id", selectedInvoiceIds)
        .order("paid_at", { ascending: false });

      if (error) throw error;

      set({
        invoicePayments: (data as InvoicePaymentRow[]).map(mapInvoicePayment),
      });
    } catch (error) {
      reportFinanceError("Buscar pagamentos de fatura", error);
      throw error;
    }
  },

  fetchDependentSettlements: async () => {
    try {
      const user = await getCurrentUser();
      if (!user) return;

      const competenceMonth = toDateOnly(
        get().currentYear,
        get().currentMonth,
        1,
      );
      const { data, error } = await supabase
        .from("dependent_settlements")
        .select("*")
        .eq("user_id", user.id)
        .eq("competence_month", competenceMonth)
        .order("settled_at", { ascending: false });

      if (error) throw error;

      set({
        dependentSettlements: (data as DependentSettlementRow[]).map(
          mapDependentSettlement,
        ),
      });
    } catch (error) {
      reportFinanceError("Buscar acertos de dependentes", error);
      throw error;
    }
  },

  addCard: async (card) => {
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

      const { data, error } = await supabase
        .from("cards")
        .insert({
          user_id: user.id,
          legacy_key: slugify(card.name),
          name: card.name,
          color: card.color ?? "#5b9cf6",
          emoji: card.emoji ?? null,
          closing_day: card.closingDay ?? null,
          due_day: card.dueDay ?? null,
          limit_amount: card.limitAmount ?? 0,
        })
        .select("*")
        .single();

      if (error) throw error;

      set({ cards: [...get().cards, mapCard(data as CardRow)] });
    } catch (error) {
      reportFinanceError("Adicionar cartão", error);
      throw error;
    }
  },

  editCard: async (cardId, card) => {
    try {
      const user = await getCurrentUser();
      if (!user) throw new Error("Usuário não autenticado.");

      const updatePayload: TablesUpdate<"cards"> = {};

      if (card.name !== undefined) {
        updatePayload.name = card.name;
        updatePayload.legacy_key = slugify(card.name);
      }

      if (card.color !== undefined) updatePayload.color = card.color;
      if (card.emoji !== undefined) updatePayload.emoji = card.emoji;
      if (card.closingDay !== undefined)
        updatePayload.closing_day = card.closingDay;
      if (card.dueDay !== undefined) updatePayload.due_day = card.dueDay;
      if (card.limitAmount !== undefined)
        updatePayload.limit_amount = card.limitAmount;

      const { data, error } = await supabase
        .from("cards")
        .update(updatePayload)
        .eq("id", cardId)
        .eq("user_id", user.id)
        .select("*")
        .single();

      if (error) throw error;

      set({
        cards: get().cards.map((currentCard) =>
          currentCard.id === cardId ? mapCard(data as CardRow) : currentCard,
        ),
      });
    } catch (error) {
      reportFinanceError("Editar cartão", error);
      throw error;
    }
  },

  deleteCard: async (cardId) => {
    try {
      const user = await getCurrentUser();
      if (!user) throw new Error("Usuário não autenticado.");

      const { error } = await supabase
        .from("cards")
        .delete()
        .eq("id", cardId)
        .eq("user_id", user.id);

      if (error) throw error;

      set((state) => {
        const removedInvoiceIds = new Set(
          state.cardInvoices
            .filter((invoice) => invoice.cardId === cardId)
            .map((invoice) => invoice.id),
        );

        return {
          cards: state.cards.filter((card) => card.id !== cardId),
          cardInvoices: state.cardInvoices.filter(
            (invoice) => invoice.cardId !== cardId,
          ),
          invoicePayments: state.invoicePayments.filter(
            (payment) => !removedInvoiceIds.has(payment.invoiceId),
          ),
          transactions: state.transactions.filter(
            (transaction) => transaction.cardId !== cardId,
          ),
        };
      });
    } catch (error) {
      reportFinanceError("Excluir cartão", error);
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "23503"
      ) {
        throw new Error(
          "Não é possível excluir um cartão que possui transações vinculadas.",
        );
      }

      throw error;
    }
  },
  fetchTransactions: async (options) => {
    try {
      set({ isFetching: true });

      const user = await getCurrentUser();
      if (!user) {
        return;
      }

      const selectedMonth = get().currentMonth;
      const selectedYear = get().currentYear;
      const { startDate, endDate } = getOperationalMonthRange(
        selectedMonth,
        selectedYear,
      );
      await syncDueTransactionStatuses();

      const data = await fetchAllPages((from, to) => {
        const baseQuery = supabase
          .from("transactions")
          .select("*")
          .eq("user_id", user.id);
        const scopedQuery = options?.includeAllMonths
          ? baseQuery
          : baseQuery.gte("month_start", startDate).lt("month_start", endDate);

        return scopedQuery
          .order("month_start", { ascending: false })
          .order("day", { ascending: false })
          .order("created_at", { ascending: false })
          .order("id", { ascending: false })
          .range(from, to);
      });

      set({
        transactions: (data as TransactionRow[]).map(mapTransaction),
        fetchedMonth: selectedMonth,
        fetchedYear: selectedYear,
      });
      await Promise.all([
        get().fetchCardInvoices(),
        get().fetchDependentSettlements(),
        get().fetchCategoryBudgets(),
      ]);
    } catch (error) {
      reportFinanceError("Buscar transações", error);
    } finally {
      set({ isFetching: false });
    }
  },

  addTransaction: async (transaction) => {
    await get().addTransactions([transaction]);
  },

  addTransactions: async (transactionsToCreate) => {
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

      const { data, error } = await supabase
        .from("transactions")
        .insert(
          transactionsToCreate.map((transaction) => {
            const cardClosingDay = transaction.cardId
              ? get().cards.find((card) => card.id === transaction.cardId)
                  ?.closingDay
              : undefined;

            return toTransactionInsertPayload(
              transaction,
              user.id,
              cardClosingDay,
            );
          }),
        )
        .select("*");

      if (error) throw error;
      if (!data?.length) {
        throw new Error("Supabase não retornou as transações inseridas.");
      }

      const transactionRows = data as TransactionRow[];
      const newTransactions = transactionRows.map(mapTransaction);
      const visibleTransactions = newTransactions.filter((transaction) =>
        isTransactionInSelectedRange(
          transaction,
          get().currentMonth,
          get().currentYear,
        ),
      );

      set((state) => ({
        transactions: [...visibleTransactions, ...state.transactions],
      }));
      markRecentlyAdded(newTransactions.map((transaction) => transaction.id));
      await get().fetchCardInvoices();
    } catch (error) {
      reportFinanceError("Adicionar transações", error);
      throw error;
    }
  },

  updateTransaction: async (transactionId, transaction) => {
    try {
      const user = await getCurrentUser();
      if (!user) throw new Error("Usuário não autenticado.");

      const currentTransaction = get().transactions.find(
        (current) => current.id === transactionId,
      );
      const nextType = transaction.type ?? currentTransaction?.type;
      const nextCardId =
        transaction.cardId !== undefined
          ? transaction.cardId
          : currentTransaction?.cardId;
      const normalizedCurrentDate = currentTransaction
        ? normalizeDateOnly(currentTransaction.date)
        : null;
      const normalizedNextDate =
        transaction.date !== undefined
          ? normalizeDateOnly(transaction.date)
          : normalizedCurrentDate;
      const dateChanged =
        transaction.date !== undefined &&
        normalizedNextDate !== normalizedCurrentDate;
      const billingContextChanged =
        (transaction.type !== undefined &&
          transaction.type !== currentTransaction?.type) ||
        (transaction.cardId !== undefined &&
          (transaction.cardId ?? null) !==
            (currentTransaction?.cardId ?? null));

      const updatePayload: TablesUpdate<"transactions"> = {};

      if (transaction.description !== undefined) {
        updatePayload.description = transaction.description;
      }

      if (transaction.amount !== undefined) {
        updatePayload.amount = transaction.amount;
      }

      if (transaction.date !== undefined) {
        updatePayload.day = getDayFromDate(transaction.date);
        updatePayload.transaction_date = normalizeDateOnly(transaction.date);
      }

      if (
        normalizedNextDate &&
        (dateChanged || billingContextChanged || !currentTransaction)
      ) {
        const cardClosingDay = nextCardId
          ? get().cards.find((card) => card.id === nextCardId)?.closingDay
          : undefined;
        updatePayload.month_start =
          nextType === "card"
            ? getCardInvoiceMonthStart(normalizedNextDate, cardClosingDay)
            : getMonthStart(normalizedNextDate);
      }

      if (transaction.category !== undefined) {
        updatePayload.category = transaction.category;
      }

      if (transaction.type !== undefined) {
        updatePayload.type = transaction.type;
        updatePayload.card_id =
          transaction.type === "card" ? (transaction.cardId ?? null) : null;
      } else if (transaction.cardId !== undefined) {
        updatePayload.card_id = transaction.cardId;
      }

      if (transaction.dependentId !== undefined) {
        updatePayload.dependent_id = transaction.dependentId;
      }

      if (transaction.splitGroupId !== undefined) {
        updatePayload.split_group_id = transaction.splitGroupId;
      }

      if (transaction.status !== undefined) {
        updatePayload.status = toDbTransactionStatus(
          getCanonicalTransactionStatus({
            type: nextType ?? "fixed",
            status: transaction.status,
            date: normalizedNextDate,
            is_recurring:
              transaction.is_recurring ?? currentTransaction?.is_recurring,
            cardId: nextCardId,
            installments:
              transaction.installments ?? currentTransaction?.installments,
            installmentsTotal:
              transaction.installmentsTotal ??
              currentTransaction?.installmentsTotal,
            notes: transaction.notes ?? currentTransaction?.notes,
          }),
        );
      }

      if (transaction.owner !== undefined) {
        updatePayload.owner = transaction.owner;
      }

      if (transaction.installmentNumber !== undefined) {
        updatePayload.installment_number = transaction.installmentNumber;
      }

      if (transaction.current_installment !== undefined) {
        updatePayload.installment_number = transaction.current_installment;
      }

      if (transaction.installmentsTotal !== undefined) {
        updatePayload.installments_total = transaction.installmentsTotal;
      }

      if (transaction.installments !== undefined) {
        updatePayload.installments_total = transaction.installments;
      }

      if (transaction.is_recurring !== undefined) {
        updatePayload.recurring = transaction.is_recurring;
      }

      if (transaction.notes !== undefined) {
        updatePayload.notes = transaction.notes;
      }

      if (transaction.dependentIds !== undefined) {
        updatePayload.split_with = transaction.dependentIds;
      }

      const { data, error } = await supabase
        .from("transactions")
        .update(updatePayload)
        .eq("id", transactionId)
        .eq("user_id", user.id)
        .select("*")
        .single();

      if (error) throw error;
      if (!data)
        throw new Error("Supabase não retornou a transação atualizada.");

      const updatedTransaction = mapTransaction(data as TransactionRow);

      set((state) => ({
        transactions: state.transactions.map((item) =>
          item.id === transactionId ? updatedTransaction : item,
        ),
      }));
      await get().fetchCardInvoices();
    } catch (error) {
      reportFinanceError("Atualizar transação", error);
      throw error;
    }
  },

  updateTransactionGroup: async (
    groupId,
    fromDate,
    transaction,
    scope = "future",
  ) => {
    try {
      const user = await getCurrentUser();
      if (!user) throw new Error("Usuário não autenticado.");

      const normalizedFromDate = normalizeDateOnly(fromDate);
      const sourceTransaction = get().transactions.find(
        (currentTransaction) =>
          currentTransaction.groupId === groupId &&
          normalizeDateOnly(currentTransaction.date) === normalizedFromDate,
      );
      const requestedDate =
        transaction.date !== undefined
          ? normalizeDateOnly(transaction.date)
          : normalizedFromDate;
      const dateChanged =
        transaction.date !== undefined && requestedDate !== normalizedFromDate;
      const typeChanged =
        transaction.type !== undefined &&
        transaction.type !== sourceTransaction?.type;
      const cardChanged =
        transaction.cardId !== undefined &&
        (transaction.cardId ?? null) !== (sourceTransaction?.cardId ?? null);
      const descriptionChanged =
        transaction.description !== undefined &&
        transaction.description !== sourceTransaction?.description;
      const amountChanged =
        transaction.amount !== undefined &&
        transaction.amount !== sourceTransaction?.amount;
      const categoryChanged =
        transaction.category !== undefined &&
        transaction.category !== sourceTransaction?.category;
      const dependentChanged =
        transaction.dependentId !== undefined &&
        (transaction.dependentId ?? null) !==
          (sourceTransaction?.dependentId ?? null);
      const sourceDay = dateChanged ? getDayFromDate(requestedDate) : null;
      const groupQuery = supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .eq("group_id", groupId);
      const scopedGroupQuery =
        scope === "all"
          ? groupQuery
          : groupQuery.gte("transaction_date", normalizedFromDate);
      const { data: groupRows, error: groupError } = await scopedGroupQuery;

      if (groupError) throw groupError;

      const groupTransactions = ((groupRows ?? []) as TransactionRow[])
        .map(mapTransaction)
        .sort((left, right) => {
          const leftInstallment =
            left.installmentNumber ?? left.current_installment ?? 1;
          const rightInstallment =
            right.installmentNumber ?? right.current_installment ?? 1;

          if (leftInstallment !== rightInstallment) {
            return leftInstallment - rightInstallment;
          }

          return normalizeDateOnly(left.date).localeCompare(
            normalizeDateOnly(right.date),
          );
        });

      if (!groupTransactions.length) return;

      if (
        transaction.category !== undefined &&
        Object.keys(transaction).length === 1
      ) {
        const groupTransactionIds = groupTransactions.map(
          (currentTransaction) => currentTransaction.id,
        );
        const { data, error } = await supabase
          .from("transactions")
          .update({ category: transaction.category })
          .eq("user_id", user.id)
          .in("id", groupTransactionIds)
          .select("*");

        if (error) throw error;

        const updatedById = new Map(
          ((data ?? []) as TransactionRow[]).map((row) => {
            const updatedTransaction = mapTransaction(row);
            return [updatedTransaction.id, updatedTransaction];
          }),
        );

        set((state) => ({
          transactions: state.transactions.map(
            (currentTransaction) =>
              updatedById.get(currentTransaction.id) ?? currentTransaction,
          ),
        }));
        return;
      }

      const updatedRows = await Promise.all(
        groupTransactions.map(async (currentTransaction) => {
          const nextType = transaction.type ?? currentTransaction.type;
          const nextCardId =
            transaction.cardId !== undefined
              ? transaction.cardId
              : currentTransaction.cardId;
          const nextDate =
            sourceDay === null
              ? normalizeDateOnly(currentTransaction.date)
              : replaceDateOnlyDay(currentTransaction.date, sourceDay);
          const updatePayload: TablesUpdate<"transactions"> = {};

          if (descriptionChanged) {
            updatePayload.description = transaction.description;
          }

          if (amountChanged) {
            updatePayload.amount = transaction.amount;
          }

          if (dateChanged) {
            updatePayload.day = getDayFromDate(nextDate);
            updatePayload.transaction_date = nextDate;
          }

          if (dateChanged || typeChanged || cardChanged) {
            const cardClosingDay = nextCardId
              ? get().cards.find((card) => card.id === nextCardId)?.closingDay
              : undefined;

            updatePayload.month_start =
              nextType === "card"
                ? getCardInvoiceMonthStart(nextDate, cardClosingDay)
                : getMonthStart(nextDate);
          }

          if (categoryChanged) {
            updatePayload.category = transaction.category;
          }

          if (typeChanged) {
            updatePayload.type = transaction.type;
            updatePayload.card_id =
              transaction.type === "card" ? (transaction.cardId ?? null) : null;
          } else if (cardChanged) {
            updatePayload.card_id = transaction.cardId;
          }

          if (dependentChanged) {
            updatePayload.dependent_id = transaction.dependentId;
          }

          if (transaction.splitGroupId !== undefined) {
            updatePayload.split_group_id = transaction.splitGroupId;
          }

          if (transaction.status !== undefined) {
            updatePayload.status = toDbTransactionStatus(
              getCanonicalTransactionStatus({
                type: nextType,
                status: transaction.status,
                date: nextDate,
                is_recurring:
                  transaction.is_recurring ?? currentTransaction.is_recurring,
                cardId: nextCardId,
                installments:
                  transaction.installments ?? currentTransaction.installments,
                installmentsTotal:
                  transaction.installmentsTotal ??
                  currentTransaction.installmentsTotal,
                notes: transaction.notes ?? currentTransaction.notes,
              }),
            );
          }

          if (transaction.owner !== undefined) {
            updatePayload.owner = transaction.owner;
          }

          if (transaction.installmentNumber !== undefined) {
            updatePayload.installment_number = transaction.installmentNumber;
          }

          if (transaction.current_installment !== undefined) {
            updatePayload.installment_number = transaction.current_installment;
          }

          if (transaction.installmentsTotal !== undefined) {
            updatePayload.installments_total = transaction.installmentsTotal;
          }

          if (transaction.installments !== undefined) {
            updatePayload.installments_total = transaction.installments;
          }

          if (transaction.is_recurring !== undefined) {
            updatePayload.recurring = transaction.is_recurring;
          }

          if (transaction.notes !== undefined) {
            updatePayload.notes = transaction.notes;
          }

          if (transaction.dependentIds !== undefined) {
            updatePayload.split_with = transaction.dependentIds;
          }

          if (!Object.keys(updatePayload).length) {
            return currentTransaction;
          }

          const { data, error } = await supabase
            .from("transactions")
            .update(updatePayload)
            .eq("id", currentTransaction.id)
            .eq("user_id", user.id)
            .select("*")
            .single();

          if (error) throw error;
          if (!data) {
            throw new Error("Supabase não retornou a transação atualizada.");
          }

          return mapTransaction(data as TransactionRow);
        }),
      );
      const updatedById = new Map(
        updatedRows.map((updatedTransaction) => [
          updatedTransaction.id,
          updatedTransaction,
        ]),
      );

      set((state) => ({
        transactions: state.transactions.map(
          (currentTransaction) =>
            updatedById.get(currentTransaction.id) ?? currentTransaction,
        ),
      }));
      await get().fetchCardInvoices();
    } catch (error) {
      reportFinanceError("Atualizar recorrência", error);
      throw error;
    }
  },

  updateTransactionCategories: async (transactionIds, category) => {
    if (!transactionIds.length) return;

    try {
      const user = await getCurrentUser();
      if (!user) throw new Error("Usuário não autenticado.");

      const selectedIdSet = new Set(transactionIds);
      const selectedTransactions = get().transactions.filter((transaction) =>
        selectedIdSet.has(transaction.id),
      );
      const groupIds = Array.from(
        new Set(
          selectedTransactions
            .map((transaction) => transaction.groupId)
            .filter((groupId): groupId is string => Boolean(groupId)),
        ),
      );

      const filters = [`id.in.(${transactionIds.join(",")})`];

      if (groupIds.length) {
        filters.push(`group_id.in.(${groupIds.join(",")})`);
      }

      const { error } = await supabase
        .from("transactions")
        .update({ category })
        .eq("user_id", user.id)
        .or(filters.join(","));

      if (error) throw error;

      const groupIdSet = new Set(groupIds);
      set((state) => ({
        transactions: state.transactions.map((transaction) =>
          selectedIdSet.has(transaction.id) ||
          (transaction.groupId && groupIdSet.has(transaction.groupId))
            ? { ...transaction, category }
            : transaction,
        ),
      }));
      await get().fetchCardInvoices();
    } catch (error) {
      reportFinanceError("Atualizar categorias das transações", error);
      throw error;
    }
  },

  payCardInvoice: async (invoiceId, payment = {}) => {
    try {
      const user = await getCurrentUser();
      if (!user) throw new Error("Usuário não autenticado.");

      const invoice = get().cardInvoices.find(
        (currentInvoice) => currentInvoice.id === invoiceId,
      );

      if (!invoice) throw new Error("Fatura não encontrada.");

      const outstandingAmount = Math.max(
        invoice.totalAmount - invoice.paidAmount,
        0,
      );
      const paymentAmount = payment.amount ?? outstandingAmount;

      if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
        throw new Error("Informe um valor de pagamento válido.");
      }

      if (paymentAmount > outstandingAmount) {
        throw new Error("O pagamento não pode exceder o saldo da fatura.");
      }

      const { data, error } = await supabase
        .from("invoice_payments")
        .insert({
          user_id: user.id,
          invoice_id: invoice.id,
          amount: paymentAmount,
          paid_at: payment.paidAt ?? new Date().toISOString(),
          method: payment.method ?? "PIX",
          status: "CONFIRMED",
          source: "MANUAL",
          idempotency_key: `manual:${crypto.randomUUID()}`,
          notes: payment.notes?.trim() || null,
        })
        .select("*")
        .single();

      if (error) throw error;
      if (!data) throw new Error("Pagamento não retornado pelo Supabase.");

      const newPayment = mapInvoicePayment(data as InvoicePaymentRow);

      set((state) => ({
        invoicePayments: [newPayment, ...state.invoicePayments],
      }));
      await get().fetchCardInvoices();
      return newPayment;
    } catch (error) {
      reportFinanceError("Liquidar fatura", error);
      throw error;
    }
  },

  settleDependent: async (settlement) => {
    try {
      const user = await getCurrentUser();
      if (!user) throw new Error("Usuário não autenticado.");

      const amount = Number(settlement.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error("Informe um valor válido para o acerto.");
      }

      const { data, error } = await supabase
        .from("dependent_settlements")
        .insert({
          user_id: user.id,
          dependent_id: settlement.dependentId,
          competence_month: getMonthStart(settlement.competenceMonth),
          amount,
          settled_at: settlement.settledAt ?? new Date().toISOString(),
          method: settlement.method ?? "PIX",
          status: "CONFIRMED",
          source: "MANUAL",
          idempotency_key: `manual:${crypto.randomUUID()}`,
          notes: settlement.notes?.trim() || null,
        })
        .select("*")
        .single();

      if (error) throw error;
      if (!data) throw new Error("Acerto não retornado pelo Supabase.");

      const newSettlement = mapDependentSettlement(
        data as DependentSettlementRow,
      );

      set((state) => ({
        dependentSettlements: [
          newSettlement,
          ...state.dependentSettlements,
        ],
      }));

      return newSettlement;
    } catch (error) {
      reportFinanceError("Registrar acerto de dependente", error);
      throw error;
    }
  },

  addIncome: async (income) => {
    await get().addTransaction({
      description: income.description,
      amount: income.amount,
      date: income.date,
      category: "Receita",
      type: "income",
      status: "confirmed",
      cardId: null,
      owner: "eu",
      dependentIds: ["eu"],
      notes: "Receita",
    });
  },

  deleteTransaction: async (transactionId) => {
    try {
      const user = await getCurrentUser();
      if (!user) throw new Error("Usuário não autenticado.");

      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("id", transactionId)
        .eq("user_id", user.id);

      if (error) throw error;

      set((state) => ({
        transactions: state.transactions.filter(
          (transaction) => transaction.id !== transactionId,
        ),
      }));
      await get().fetchCardInvoices();
    } catch (error) {
      reportFinanceError("Excluir transação", error);
      throw error;
    }
  },

  deleteTransactionGroup: async (groupId, fromDate) => {
    try {
      const user = await getCurrentUser();
      if (!user) throw new Error("Usuário não autenticado.");

      const normalizedFromDate = normalizeDateOnly(fromDate);
      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("user_id", user.id)
        .eq("group_id", groupId)
        .gte("transaction_date", normalizedFromDate);

      if (error) throw error;

      set((state) => ({
        transactions: state.transactions.filter(
          (transaction) =>
            !(
              transaction.groupId === groupId &&
              normalizeDateOnly(transaction.date) >= normalizedFromDate
            ),
        ),
      }));
      await get().fetchCardInvoices();
    } catch (error) {
      reportFinanceError("Excluir recorrência", error);
      throw error;
    }
  },
}));
