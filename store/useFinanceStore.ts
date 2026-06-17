"use client";

import { supabase } from "@/lib/supabaseClient";
import type { User } from "@supabase/supabase-js";
import { create } from "zustand";

export type TransactionType = "fixed" | "card";
export type TransactionStatus = "pending" | "confirmed" | "paid";

export interface Card {
  id: string;
  name: string;
  color?: string;
  emoji?: string;
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
  owner?: string;
  dependentIds?: string[];
  installmentNumber?: number;
  installmentsTotal?: number;
  notes?: string;
  tagIds?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export type CreateTransactionInput = Omit<
  Transaction,
  "id" | "createdAt" | "updatedAt"
>;

export type CreateCardInput = Omit<Card, "id" | "createdAt" | "updatedAt">;

interface CardRow {
  id: string;
  legacy_key: string;
  name: string;
  color: string | null;
  emoji: string | null;
  due_day: number | null;
  limit_amount: number | null;
  created_at: string;
  updated_at: string;
}

interface TransactionRow {
  id: string;
  card_id: string | null;
  month_start: string;
  month_label: string | null;
  type: TransactionType;
  description: string;
  amount: number;
  day: number;
  status: string | null;
  owner: string | null;
  installment_number: number | null;
  installments_total: number | null;
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
  initializeAuth: () => () => void;
  fetchCards: () => Promise<void>;
  addCard: (card: CreateCardInput) => Promise<void>;
  deleteCard: (cardId: string) => Promise<void>;
  fetchTransactions: () => Promise<void>;
  addTransaction: (transaction: CreateTransactionInput) => Promise<void>;
  deleteTransaction: (transactionId: string) => Promise<void>;
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

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function getMonthStart(date: string) {
  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }

  return new Date(parsedDate.getFullYear(), parsedDate.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
}

function getDayFromDate(date: string) {
  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) return 5;

  return parsedDate.getDate();
}

function mapCard(row: CardRow): Card {
  return {
    id: row.id,
    name: row.name,
    color: row.color ?? undefined,
    emoji: row.emoji ?? undefined,
    dueDay: row.due_day ?? undefined,
    limitAmount: row.limit_amount ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapTransaction(row: TransactionRow): Transaction {
  const date = new Date(row.month_start);
  date.setDate(row.day || 1);

  return {
    id: row.id,
    description: row.description,
    amount: Number(row.amount) || 0,
    date: date.toISOString().slice(0, 10),
    category: "",
    type: row.type,
    status: fromDbStatus(row.status),
    cardId: row.card_id,
    owner: row.owner ?? "eu",
    dependentIds: row.split_with ?? ["eu"],
    installmentNumber: row.installment_number ?? undefined,
    installmentsTotal: row.installments_total ?? undefined,
    notes: row.notes ?? undefined,
    tagIds: [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
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
      console.error("Failed to fetch cards:", error);
    }
  },

  addCard: async (card) => {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw userError ?? new Error("Usuario nao autenticado.");
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
          due_day: card.dueDay ?? 0,
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

  deleteCard: async (cardId) => {
    try {
      const user = await getCurrentUser();
      if (!user) return;

      const { error } = await supabase
        .from("cards")
        .delete()
        .eq("id", cardId)
        .eq("user_id", user.id);

      if (error) throw error;

      set({
        cards: get().cards.filter((card) => card.id !== cardId),
        transactions: get().transactions.filter((transaction) => transaction.cardId !== cardId),
      });
    } catch (error) {
      console.error("Failed to delete card:", error);
    }
  },

  fetchTransactions: async () => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        return;
      }

      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("month_start", { ascending: false })
        .order("day", { ascending: false });

      if (error) throw error;

      set({ transactions: (data as TransactionRow[]).map(mapTransaction) });
    } catch (error) {
      console.error("Failed to fetch transactions:", error);
    }
  },

  addTransaction: async (transaction) => {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw userError ?? new Error("Usuario nao autenticado.");
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
        .insert({
          user_id: user.id,
          card_id: transaction.cardId ?? null,
          month_start: getMonthStart(transaction.date),
          type: transaction.type,
          description: transaction.description,
          amount: transaction.amount,
          day: getDayFromDate(transaction.date),
          status: toDbStatus(transaction.status),
          owner: transaction.owner ?? "eu",
          installment_number: transaction.installmentNumber ?? 1,
          installments_total: transaction.installmentsTotal ?? 1,
          notes: transaction.notes ?? "",
          split_with: transaction.dependentIds?.length
            ? transaction.dependentIds
            : [transaction.owner ?? "eu"],
        })
        .select("*")
        .single();

      if (error) throw error;
      if (!data) throw new Error("Supabase nao retornou a transacao inserida.");

      const persistedTagIds = (transaction.tagIds || []).filter(isUuid);
      if (persistedTagIds.length) {
        const { error: tagError } = await supabase.from("transaction_tags").insert(
          persistedTagIds.map((tagId) => ({
            transaction_id: (data as TransactionRow).id,
            tag_id: tagId,
            user_id: user.id,
          })),
        );

        if (tagError) {
          console.error("Failed to attach transaction tags:", tagError);
        }
      }

      set({ transactions: [mapTransaction(data as TransactionRow), ...get().transactions] });
    } catch (error) {
      console.error("Erro no Supabase:", error);
      throw error;
    }
  },

  deleteTransaction: async (transactionId) => {
    try {
      const user = await getCurrentUser();
      if (!user) return;

      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("id", transactionId)
        .eq("user_id", user.id);

      if (error) throw error;

      set({
        transactions: get().transactions.filter(
          (transaction) => transaction.id !== transactionId,
        ),
      });
    } catch (error) {
      console.error("Failed to delete transaction:", error);
    }
  },
}));
