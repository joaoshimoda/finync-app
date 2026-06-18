"use client";

import { supabase } from "@/lib/supabaseClient";
import {
  getDateOnlyParts,
  getLocalTodayDateOnly,
  normalizeDateOnly,
  toDateOnly,
} from "@/lib/dateUtils";
import type { User } from "@supabase/supabase-js";
import { create } from "zustand";

export type TransactionType = "income" | "fixed" | "card";
export type TransactionStatus = "pending" | "confirmed" | "paid";

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

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
  type: TransactionType;
  status?: TransactionStatus;
  cardId?: string | null;
  groupId?: string | null;
  owner?: string;
  dependentIds?: string[];
  installments?: number;
  current_installment?: number;
  is_recurring?: boolean;
  installmentNumber?: number;
  installmentsTotal?: number;
  notes?: string;
  tagIds?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface FinanceBalances {
  totalIncome: number;
  totalExpenseDebit: number;
  totalCreditCardInvoice: number;
  availableBalance: number;
}

export type CreateTransactionInput = Omit<
  Transaction,
  "id" | "createdAt" | "updatedAt"
>;
export type UpdateTransactionInput = Partial<CreateTransactionInput>;

export type CreateCardInput = Omit<Card, "id" | "createdAt" | "updatedAt">;
export type UpdateCardInput = Partial<CreateCardInput>;

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
  group_id: string | null;
  month_start: string;
  month_label: string | null;
  type: string | null;
  description: string;
  category: string | null;
  amount: number | string | null;
  day: number;
  status: string | null;
  owner: string | null;
  installment_number: number | null;
  installments_total: number | null;
  recurring: boolean | null;
  notes: string | null;
  split_with: string[] | null;
  created_at: string;
  updated_at: string;
}

interface FinanceState {
  cards: Card[];
  transactions: Transaction[];
  authUser: User | null;
  isAuthReady: boolean;
  isLoading: boolean;
  isFetching: boolean;
  currentMonth: number;
  currentYear: number;
  fetchedMonth: number;
  fetchedYear: number;
  initializeAuth: () => () => void;
  nextMonth: () => void;
  prevMonth: () => void;
  fetchCards: () => Promise<void>;
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
  payCardInvoice: (cardId: string) => Promise<void>;
  addIncome: (
    income: Pick<CreateTransactionInput, "amount" | "date" | "description">,
  ) => Promise<void>;
  deleteTransaction: (transactionId: string) => Promise<void>;
  deleteTransactionGroup: (groupId: string, fromDate: string) => Promise<void>;
  calculateBalances: () => FinanceBalances;
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

function toDbStatus(status?: TransactionStatus) {
  if (status === "paid") return "PAGO";
  if (status === "pending") return "PENDENTE";
  return "CONFIRMADO";
}

function fromDbStatus(status?: string | null): TransactionStatus {
  if (status === "PAGO") return "paid";
  if (status === "PENDENTE") return "pending";
  return "confirmed";
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
    date: toDateOnly(year, month, row.day || 1),
    category: row.category ?? "",
    type: toTransactionType(row.type),
    status: fromDbStatus(row.status),
    cardId: row.card_id,
    groupId: row.group_id,
    owner: row.owner ?? "eu",
    dependentIds: row.split_with ?? ["eu"],
    installments: row.installments_total ?? undefined,
    current_installment: row.installment_number ?? undefined,
    is_recurring: row.recurring ?? undefined,
    installmentNumber: row.installment_number ?? undefined,
    installmentsTotal: row.installments_total ?? undefined,
    notes: row.notes ?? undefined,
    tagIds: [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toTransactionInsertPayload(
  transaction: CreateTransactionInput,
  userId: string,
) {
  const normalizedDate = normalizeDateOnly(transaction.date);

  return {
    user_id: userId,
    card_id: transaction.type === "card" ? transaction.cardId ?? null : null,
    group_id: transaction.groupId ?? null,
    month_start: getMonthStart(normalizedDate),
    type: transaction.type,
    description: transaction.description,
    category: transaction.category,
    amount: transaction.amount,
    day: getDayFromDate(normalizedDate),
    status: toDbStatus(transaction.status),
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
  const { startDate, endDate } = getSelectedMonthRange(month, year);
  const monthStart = getMonthStart(transaction.date);

  return monthStart >= startDate && monthStart < endDate;
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

export const useFinanceStore = create<FinanceState>()((set, get) => ({
  cards: [],
  transactions: [],
  authUser: null,
  isAuthReady: false,
  isLoading: true,
  isFetching: false,
  currentMonth: getDateOnlyParts(getLocalTodayDateOnly()).month,
  currentYear: getDateOnlyParts(getLocalTodayDateOnly()).year,
  fetchedMonth: getDateOnlyParts(getLocalTodayDateOnly()).month,
  fetchedYear: getDateOnlyParts(getLocalTodayDateOnly()).year,

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
          void Promise.all([get().fetchCards(), get().fetchTransactions()]).finally(() => {
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
          transactions: [],
          isAuthReady: true,
          isLoading: false,
          isFetching: false,
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
      transactions: [],
      isAuthReady: true,
      isLoading: false,
      isFetching: false,
    });
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

      set({ cards: (data as CardRow[]).map(mapCard) });
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

      set({
        cards: get().cards.filter((card) => card.id !== cardId),
        transactions: get().transactions.filter(
          (transaction) => transaction.cardId !== cardId,
        ),
      });
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
        console.log("fetchTransactions: usuário não autenticado.");
        return;
      }

      console.log("fetchTransactions: buscando transações para usuário:", user.id);

      const selectedMonth = get().currentMonth;
      const selectedYear = get().currentYear;
      const { startDate, endDate } = getSelectedMonthRange(
        selectedMonth,
        selectedYear,
      );

      console.log("Período selecionado:", { startDate, endDate });

      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .gte("month_start", startDate)
        .lt("month_start", endDate)
        .order("month_start", { ascending: false })
        .order("day", { ascending: false });

      console.log("Dados do Supabase:", data);

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
          transactionsToCreate.map((transaction) =>
            toTransactionInsertPayload(transaction, user.id),
          ),
        )
        .select("*");

      if (error) throw error;
      if (!data?.length) {
        throw new Error("Supabase não retornou as transações inseridas.");
      }

      const newTransactions = (data as TransactionRow[]).map(mapTransaction);
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
        updatePayload.month_start = getMonthStart(
          normalizeDateOnly(transaction.date),
        );
        updatePayload.day = getDayFromDate(normalizeDateOnly(transaction.date));
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

      const updatedTransaction = mapTransaction(data as TransactionRow);

      set((state) => ({
        transactions: state.transactions.map((currentTransaction) =>
          currentTransaction.id === transactionId
            ? updatedTransaction
            : currentTransaction,
        ),
      }));
    } catch (error) {
      console.error("Erro ao atualizar transação:", error);
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
      tagIds: [],
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

  calculateBalances: () => {
    const transactions = get().transactions;
    console.log("Transações no Store:", transactions);

    const totalIncome =
      transactions
        .filter((transaction) => transaction.type === "income")
        .reduce((acc, transaction) => acc + toAmount(transaction.amount), 0) || 0;
    const totalExpenseDebit =
      transactions
        .filter((transaction) => transaction.type === "fixed")
        .reduce((acc, transaction) => acc + toAmount(transaction.amount), 0) || 0;
    const totalCreditCardInvoice =
      transactions
        .filter(
          (transaction) =>
            transaction.type === "card" ||
            (transaction.type !== "income" && Boolean(transaction.cardId)),
        )
        .reduce((acc, transaction) => acc + toAmount(transaction.amount), 0) || 0;
    const availableBalance =
      totalIncome - totalExpenseDebit - totalCreditCardInvoice;

    return {
      totalIncome,
      totalExpenseDebit,
      totalCreditCardInvoice,
      availableBalance,
    };
  },
}));
