"use client";

import { supabase } from "@/lib/supabaseClient";
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
import { isTransactionInSelectedPeriod } from "@/lib/transactionPeriod";
import {
  DEFAULT_CATEGORIES,
  isEssentialCategory,
  type CategoryKind,
} from "@/lib/categories";

export type TransactionType = "income" | "fixed" | "card";
export type TransactionStatus = "pending" | "confirmed" | "paid";
type DbTransactionStatus = "PAGO" | "PENDENTE" | "CONFIRMADO";

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

export interface Category {
  id: string;
  label: string;
  kind: CategoryKind;
  icon: string;
  isDefault?: boolean;
  createdAt?: string;
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
  dependentId?: string | null;
  groupId?: string | null;
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

interface CardRow {
  id: string;
  legacy_key: string;
  name: string;
  color: string | null;
  emoji: string | null;
  closing_day: number | null;
  due_day: number | null;
  limit_amount: number | null;
  created_at: string;
  updated_at: string;
}

interface TransactionRow {
  id: string;
  card_id: string | null;
  dependent_id: string | null;
  group_id: string | null;
  month_start: string;
  month_label: string | null;
  transaction_date: string | null;
  type: string | null;
  description: string;
  category: string | null;
  amount: number | string | null;
  day: number;
  status: DbTransactionStatus;
  owner: string | null;
  installment_number: number | null;
  installments_total: number | null;
  recurring: boolean | null;
  notes: string | null;
  split_with: string[] | null;
  created_at: string;
  updated_at: string;
}

interface DependentRow {
  id: string;
  name: string;
  created_at: string;
}

interface CategoryRow {
  id: string;
  name: string | null;
  label: string;
  kind: CategoryKind;
  icon: string;
  created_at: string;
}

interface FinanceState {
  cards: Card[];
  dependents: Dependent[];
  categories: Category[];
  transactions: Transaction[];
  authUser: User | null;
  isAuthReady: boolean;
  isLoading: boolean;
  isFetching: boolean;
  hasInitializedFinancialMonth: boolean;
  hideBalancesByDefault: boolean;
  currentMonth: number;
  currentYear: number;
  fetchedMonth: number;
  fetchedYear: number;
  setHideBalancesByDefault: (hideBalances: boolean) => void;
  toggleHideBalancesByDefault: () => void;
  updateAuthUser: (user: User) => void;
  initializeAuth: () => () => void;
  nextMonth: () => void;
  prevMonth: () => void;
  fetchCards: () => Promise<void>;
  fetchDependents: () => Promise<void>;
  fetchCategories: () => Promise<void>;
  addCategory: (category: CreateCategoryInput) => Promise<void>;
  deleteCategory: (categoryId: string) => Promise<void>;
  addDependent: (dependent: CreateDependentInput) => Promise<void>;
  deleteDependent: (dependentId: string) => Promise<void>;
  addCard: (card: CreateCardInput) => Promise<void>;
  editCard: (cardId: string, card: UpdateCardInput) => Promise<void>;
  deleteCard: (cardId: string) => Promise<void>;
  fetchTransactions: () => Promise<void>;
  addTransaction: (transaction: CreateTransactionInput) => Promise<void>;
  addTransactions: (transactions: CreateTransactionInput[]) => Promise<void>;
  updateTransaction: (
    transactionId: string,
    transaction: UpdateTransactionInput,
  ) => Promise<void>;
  updateTransactionCategories: (
    transactionIds: string[],
    category: string,
  ) => Promise<void>;
  payCardInvoice: (cardId: string) => Promise<void>;
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

function toDbStatus(status?: TransactionStatus): DbTransactionStatus {
  if (status === "paid") return "PAGO";
  if (status === "pending") return "PENDENTE";
  return "CONFIRMADO";
}

function fromDbStatus(status: DbTransactionStatus): TransactionStatus {
  if (status === "PAGO") return "paid";
  if (status === "PENDENTE") return "pending";
  return "confirmed";
}

function getInitialTransactionStatus(
  transaction: CreateTransactionInput,
): TransactionStatus | undefined {
  if (
    transaction.type === "card" &&
    transaction.is_recurring === true &&
    transaction.status === "pending" &&
    normalizeDateOnly(transaction.date) <= getLocalTodayDateOnly()
  ) {
    return "confirmed";
  }

  return transaction.status;
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
  const nextMonth = ((monthIndex % 12) + 12) % 12 + 1;

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

function mapTransaction(row: TransactionRow): Transaction {
  const { month, year } = getDateOnlyParts(row.month_start);

  return {
    id: row.id,
    description: row.description,
    amount: toAmount(row.amount),
    date: row.transaction_date ?? toDateOnly(year, month, row.day || 1),
    category: row.category ?? "",
    type: toTransactionType(row.type),
    status: fromDbStatus(row.status),
    cardId: row.card_id,
    dependentId: row.dependent_id,
    groupId: row.group_id,
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
    card_id: transaction.type === "card" ? transaction.cardId ?? null : null,
    dependent_id: transaction.dependentId ?? null,
    group_id: transaction.groupId ?? null,
    month_start: monthStart,
    transaction_date: normalizedDate,
    type: transaction.type,
    description: transaction.description,
    category: transaction.category,
    amount: transaction.amount,
    day: getDayFromDate(normalizedDate),
    status: toDbStatus(getInitialTransactionStatus(transaction)),
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

function isTransactionInSelectedRange(transaction: Transaction, month: number, year: number) {
  return isTransactionInSelectedPeriod(transaction, month, year);
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
    kind: row.kind,
    icon: row.icon,
    createdAt: row.created_at,
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

async function getCurrentUser(): Promise<User | null> {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session) {
    return null;
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

const hideBalancesStorageKey = "finync-hide-balances-by-default";

function getStoredHideBalancesPreference() {
  if (typeof window === "undefined") return false;

  return window.localStorage.getItem(hideBalancesStorageKey) === "true";
}

export const useFinanceStore = create<FinanceState>()((set, get) => ({
  cards: [],
  dependents: [],
  categories: getEssentialCategories(),
  transactions: [],
  authUser: null,
  isAuthReady: false,
  isLoading: true,
  isFetching: false,
  hasInitializedFinancialMonth: false,
  hideBalancesByDefault: getStoredHideBalancesPreference(),
  currentMonth: getDateOnlyParts(getLocalTodayDateOnly()).month,
  currentYear: getDateOnlyParts(getLocalTodayDateOnly()).year,
  fetchedMonth: getDateOnlyParts(getLocalTodayDateOnly()).month,
  fetchedYear: getDateOnlyParts(getLocalTodayDateOnly()).year,

  setHideBalancesByDefault: (hideBalances) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        hideBalancesStorageKey,
        String(hideBalances),
      );
    }

    set({ hideBalancesByDefault: hideBalances });
  },

  toggleHideBalancesByDefault: () => {
    const nextValue = !get().hideBalancesByDefault;

    if (typeof window !== "undefined") {
      window.localStorage.setItem(hideBalancesStorageKey, String(nextValue));
    }

    set({ hideBalancesByDefault: nextValue });
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
        ["INITIAL_SESSION", "SIGNED_IN", "TOKEN_REFRESHED", "USER_UPDATED"].includes(event)
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
          dependents: [],
          categories: getEssentialCategories(),
          transactions: [],
          isAuthReady: true,
          isLoading: false,
          isFetching: false,
          hasInitializedFinancialMonth: false,
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
      dependents: [],
      categories: getEssentialCategories(),
      transactions: [],
      isAuthReady: true,
      isLoading: false,
      isFetching: false,
      hasInitializedFinancialMonth: false,
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
      console.error("Erro ao buscar dependentes:", error);
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
      console.error("Erro ao buscar categorias:", error);
      set({ categories: getEssentialCategories() });
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
    }));
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
      console.error("Erro ao adicionar dependente:", error);
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
        transactions: state.transactions.map((transaction) =>
          transaction.dependentId === dependentId
            ? { ...transaction, dependentId: null }
            : transaction,
        ),
      }));
    } catch (error) {
      console.error("Erro ao remover dependente:", error);
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
      console.error("Erro ao buscar cartões:", error);
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
      console.error("Erro no Supabase:", error);
      throw error;
    }
  },

  editCard: async (cardId, card) => {
    try {
      const user = await getCurrentUser();
      if (!user) throw new Error("Usuário não autenticado.");

      const updatePayload: Record<string, string | number | null> = {};

      if (card.name !== undefined) {
        updatePayload.name = card.name;
        updatePayload.legacy_key = slugify(card.name);
      }

      if (card.color !== undefined) updatePayload.color = card.color;
      if (card.emoji !== undefined) updatePayload.emoji = card.emoji;
      if (card.closingDay !== undefined) updatePayload.closing_day = card.closingDay;
      if (card.dueDay !== undefined) updatePayload.due_day = card.dueDay;
      if (card.limitAmount !== undefined) updatePayload.limit_amount = card.limitAmount;

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
      console.error("Erro ao editar cartão:", error);
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

      set((state) => ({
        cards: state.cards.filter((card) => card.id !== cardId),
        transactions: state.transactions.filter(
          (transaction) => transaction.cardId !== cardId,
        ),
      }));
    } catch (error) {
      console.error("Erro ao excluir cartão:", error);
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
  fetchTransactions: async () => {
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
      const todayDate = getLocalTodayDateOnly();
      const { error: statusSyncError } = await supabase
        .from("transactions")
        .update({ status: toDbStatus("confirmed") })
        .eq("user_id", user.id)
        .eq("type", "card")
        .eq("recurring", true)
        .eq("status", toDbStatus("pending"))
        .lte("transaction_date", todayDate)
        .gte("month_start", startDate)
        .lt("month_start", endDate);

      if (statusSyncError) throw statusSyncError;

      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .gte("month_start", startDate)
        .lt("month_start", endDate)
        .order("month_start", { ascending: false })
        .order("day", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;

      set({
        transactions: (data as TransactionRow[]).map(mapTransaction),
        fetchedMonth: selectedMonth,
        fetchedYear: selectedYear,
      });
    } catch (error) {
      console.error("Erro ao buscar transações:", error);
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
    } catch (error) {
      console.error("Erro no Supabase:", error);
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

      const updatePayload: Record<
        string,
        string | number | boolean | string[] | null
      > = {};

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
          transaction.type === "card" ? transaction.cardId ?? null : null;
      } else if (transaction.cardId !== undefined) {
        updatePayload.card_id = transaction.cardId;
      }

      if (transaction.dependentId !== undefined) {
        updatePayload.dependent_id = transaction.dependentId;
      }

      if (transaction.status !== undefined) {
        updatePayload.status = toDbStatus(transaction.status);
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
      if (!data) throw new Error("Supabase não retornou a transação atualizada.");

      if (transaction.category !== undefined && currentTransaction?.groupId) {
        const { error: groupCategoryError } = await supabase
          .from("transactions")
          .update({ category: transaction.category })
          .eq("user_id", user.id)
          .eq("group_id", currentTransaction.groupId);

        if (groupCategoryError) throw groupCategoryError;
      }

      const updatedTransaction = mapTransaction(data as TransactionRow);

      set((state) => ({
        transactions: state.transactions.map((item) => {
          if (item.id === transactionId) return updatedTransaction;

          if (
            transaction.category !== undefined &&
            currentTransaction?.groupId &&
            item.groupId === currentTransaction.groupId
          ) {
            return { ...item, category: transaction.category };
          }

          return item;
        }),
      }));
    } catch (error) {
      console.error("Erro ao atualizar transação:", error);
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

      const updateRequests = [
        supabase
          .from("transactions")
          .update({ category })
          .eq("user_id", user.id)
          .in("id", transactionIds),
        ...groupIds.map((groupId) =>
          supabase
            .from("transactions")
            .update({ category })
            .eq("user_id", user.id)
            .eq("group_id", groupId),
        ),
      ];
      const results = await Promise.all(updateRequests);
      const failedRequest = results.find((result) => result.error);

      if (failedRequest?.error) throw failedRequest.error;

      const groupIdSet = new Set(groupIds);
      set((state) => ({
        transactions: state.transactions.map((transaction) =>
          selectedIdSet.has(transaction.id) ||
          (transaction.groupId && groupIdSet.has(transaction.groupId))
            ? { ...transaction, category }
            : transaction,
        ),
      }));
    } catch (error) {
      console.error("Erro ao atualizar categorias das transações:", error);
      throw error;
    }
  },

  payCardInvoice: async (cardId) => {
    try {
      const user = await getCurrentUser();
      if (!user) throw new Error("Usuário não autenticado.");

      const { startDate, endDate } = getSelectedMonthRange(
        get().currentMonth,
        get().currentYear,
      );

      const { data, error } = await supabase
        .from("transactions")
        .update({ status: toDbStatus("paid") })
        .eq("user_id", user.id)
        .eq("type", "card")
        .eq("card_id", cardId)
        .gte("month_start", startDate)
        .lt("month_start", endDate)
        .lte("transaction_date", getLocalTodayDateOnly())
        .select("*");

      if (error) throw error;

      const paidTransactions = (data as TransactionRow[]).map(mapTransaction);
      const paidTransactionById = new Map(
        paidTransactions.map((transaction) => [transaction.id, transaction]),
      );

      set((state) => ({
        transactions: state.transactions.map((transaction) =>
          paidTransactionById.get(transaction.id) ?? transaction,
        ),
      }));
    } catch (error) {
      console.error("Erro ao liquidar fatura:", error);
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
    } catch (error) {
      console.error("Erro ao excluir transação:", error);
      throw error;
    }
  },

  deleteTransactionGroup: async (groupId, fromDate) => {
    try {
      const user = await getCurrentUser();
      if (!user) throw new Error("Usuário não autenticado.");

      const normalizedFromDate = normalizeDateOnly(fromDate);
      const fromMonthStart = getMonthStart(normalizedFromDate);

      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("user_id", user.id)
        .eq("group_id", groupId)
        .gte("month_start", fromMonthStart);

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
    } catch (error) {
      console.error("Erro ao excluir recorrência:", error);
      throw error;
    }
  },

}));
