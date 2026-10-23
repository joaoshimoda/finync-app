"use client";

import type { User } from "@supabase/supabase-js";

import { getCardInvoiceMonthStart } from "@/lib/cardBilling";
import { getDateOnlyParts, normalizeDateOnly, toDateOnly } from "@/lib/dateUtils";
import { DEMO_USER_NAME, type DemoData } from "@/lib/demoData";
import { getCanonicalTransactionStatus } from "@/lib/transactionStatus";
import {
  useFinanceStore,
  type CategoryBudget,
  type DependentSettlement,
  type InvoicePayment,
  type Transaction,
} from "@/store/useFinanceStore";

type FinanceState = ReturnType<typeof useFinanceStore.getState>;

let sequence = 0;
function nextId(prefix: string) {
  sequence += 1;
  return `demo-${prefix}-${Date.now()}-${sequence}`;
}

function monthStart(date: string) {
  const { year, month } = getDateOnlyParts(date);
  return toDateOnly(year, month, 1);
}

function shiftMonthStart(month: number, year: number, offset: number) {
  const date = new Date(year, month - 1 + offset, 1);
  return toDateOnly(date.getFullYear(), date.getMonth() + 1, 1);
}

/* Swaps the store's data and actions for in-memory versions so the real
   pages run against the fictional household; nothing reaches Supabase.
   Returns a function that puts the original store back. */
export function installDemoStore(data: DemoData) {
  const original = useFinanceStore.getState();
  let all: Transaction[] = data.transactions.map((transaction) => ({ ...transaction }));
  const { setState, getState } = useFinanceStore;

  /* Same window the real fetch loads: previous month to a year ahead. */
  function visibleTransactions(includeAllMonths = false) {
    if (includeAllMonths) return all;
    const { currentMonth, currentYear } = getState();
    const start = shiftMonthStart(currentMonth, currentYear, -1);
    const end = shiftMonthStart(currentMonth, currentYear, 13);
    return all.filter(
      (transaction) =>
        (transaction.billingMonthStart ?? "") >= start && (transaction.billingMonthStart ?? "") < end,
    );
  }

  function commit(includeAllMonths = false) {
    setState({ transactions: visibleTransactions(includeAllMonths) });
  }

  function toTransaction(input: Omit<Transaction, "id">): Transaction {
    const date = normalizeDateOnly(input.date);
    const closingDay = input.cardId
      ? getState().cards.find((card) => card.id === input.cardId)?.closingDay
      : undefined;
    const billingMonthStart =
      input.billingMonthStart ??
      (input.type === "card" ? getCardInvoiceMonthStart(date, closingDay) : monthStart(date));

    return {
      owner: "eu",
      dependentIds: ["eu"],
      ...input,
      id: nextId("tx"),
      date,
      billingMonthStart,
      status: getCanonicalTransactionStatus({ ...input, date, is_recurring: input.is_recurring }),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  const resolve = async () => {};

  const overrides: Partial<FinanceState> = {
    cards: data.cards,
    dependents: data.dependents,
    categories: data.categories,
    categoryBudgets: data.categoryBudgets,
    cardInvoices: data.cardInvoices,
    invoicePayments: data.invoicePayments,
    dependentSettlements: data.dependentSettlements,
    transactions: [],
    authUser: {
      id: "demo-user",
      email: "marina@exemplo.com",
      user_metadata: { name: DEMO_USER_NAME },
    } as unknown as User,
    isAuthReady: true,
    isLoading: false,
    isFetching: false,
    isPreferencesReady: true,
    hasInitializedFinancialMonth: true,
    hideBalancesByDefault: false,

    fetchTransactions: async (options) => {
      const { currentMonth, currentYear } = getState();
      setState({
        transactions: visibleTransactions(options?.includeAllMonths),
        fetchedMonth: currentMonth,
        fetchedYear: currentYear,
        isFetching: false,
      });
    },
    fetchCards: resolve,
    fetchCardInvoices: resolve,
    fetchInvoicePayments: resolve,
    fetchDependentSettlements: resolve,
    fetchDependents: resolve,
    fetchCategories: resolve,
    fetchCategoryBudgets: resolve,
    fetchPreferences: resolve,
    initializeAuth: () => () => {},

    updatePreferences: async (preferences) => setState(preferences as Partial<FinanceState>),
    setHideBalancesByDefault: async (hideBalancesByDefault) => setState({ hideBalancesByDefault }),
    toggleHideBalancesByDefault: async () =>
      setState({ hideBalancesByDefault: !getState().hideBalancesByDefault }),

    addTransaction: async (transaction) => {
      all = [...all, toTransaction(transaction)];
      commit();
    },
    addTransactions: async (transactions) => {
      all = [...all, ...transactions.map(toTransaction)];
      commit();
    },
    addIncome: async (income) => {
      all = [
        ...all,
        toTransaction({ ...income, type: "income", category: "Receita", status: "confirmed" }),
      ];
      commit();
    },
    updateTransaction: async (transactionId, patch) => {
      all = all.map((transaction) =>
        transaction.id === transactionId ? { ...transaction, ...patch } : transaction,
      );
      commit();
    },
    updateTransactionGroup: async (groupId, fromDate, patch, scope = "future") => {
      const from = normalizeDateOnly(fromDate);
      all = all.map((transaction) =>
        transaction.groupId === groupId &&
        (scope === "all" || normalizeDateOnly(transaction.date) >= from)
          ? { ...transaction, ...patch, date: transaction.date }
          : transaction,
      );
      commit();
    },
    updateTransactionCategories: async (transactionIds, category) => {
      const targets = new Set(transactionIds);
      all = all.map((transaction) =>
        targets.has(transaction.id) ? { ...transaction, category } : transaction,
      );
      commit();
    },
    deleteTransaction: async (transactionId) => {
      all = all.filter((transaction) => transaction.id !== transactionId);
      commit();
    },
    deleteTransactionGroup: async (groupId, fromDate) => {
      const from = normalizeDateOnly(fromDate);
      all = all.filter(
        (transaction) =>
          transaction.groupId !== groupId || normalizeDateOnly(transaction.date) < from,
      );
      commit();
    },

    payCardInvoice: async (invoiceId, payment) => {
      const invoice = getState().cardInvoices.find((item) => item.id === invoiceId);
      if (!invoice) throw new Error("Fatura não encontrada.");
      const amount = payment?.amount ?? Math.max(invoice.totalAmount - invoice.paidAmount, 0);
      const paidAmount = invoice.paidAmount + amount;
      setState({
        cardInvoices: getState().cardInvoices.map((item) =>
          item.id === invoiceId
            ? {
                ...item,
                paidAmount,
                status: paidAmount >= item.totalAmount ? "paid" : "partially_paid",
                paidAt: new Date().toISOString(),
              }
            : item,
        ),
      });
      const invoicePayment: InvoicePayment = {
        id: nextId("payment"),
        invoiceId,
        amount,
        paidAt: payment?.paidAt ?? new Date().toISOString(),
        method: payment?.method ?? "PIX",
        status: "confirmed",
        source: "manual",
        notes: payment?.notes ?? null,
        createdAt: new Date().toISOString(),
      };
      return invoicePayment;
    },
    settleDependent: async (input) => {
      const settlement: DependentSettlement = {
        id: nextId("settlement"),
        dependentId: input.dependentId,
        competenceMonth: input.competenceMonth,
        amount: input.amount,
        settledAt: input.settledAt ?? new Date().toISOString(),
        method: input.method ?? "PIX",
        status: "confirmed",
        source: "manual",
        notes: input.notes ?? null,
        createdAt: new Date().toISOString(),
      };
      setState({ dependentSettlements: [...getState().dependentSettlements, settlement] });
      return settlement;
    },

    upsertCategoryBudget: async (input) => {
      const existing = getState().categoryBudgets.find(
        (budget) =>
          budget.categoryId === input.categoryId && budget.competenceMonth === input.competenceMonth,
      );
      const budget: CategoryBudget = {
        id: existing?.id ?? nextId("budget"),
        categoryId: input.categoryId,
        competenceMonth: monthStart(input.competenceMonth),
        amount: input.amount,
        alertThresholdPercent: input.alertThresholdPercent ?? 80,
        createdAt: existing?.createdAt ?? new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setState({
        categoryBudgets: [
          ...getState().categoryBudgets.filter((item) => item.id !== budget.id),
          budget,
        ],
      });
      return budget;
    },
    deleteCategoryBudget: async (budgetId) =>
      setState({
        categoryBudgets: getState().categoryBudgets.filter((budget) => budget.id !== budgetId),
      }),
    copyPreviousMonthBudgets: async (competenceMonth) => {
      const { month, year } = getDateOnlyParts(competenceMonth);
      const previous = shiftMonthStart(month, year, -1);
      const budgets = getState().categoryBudgets;
      const taken = new Set(
        budgets.filter((budget) => budget.competenceMonth === competenceMonth).map((budget) => budget.categoryId),
      );
      const copies = budgets
        .filter((budget) => budget.competenceMonth === previous && !taken.has(budget.categoryId))
        .map((budget) => ({ ...budget, id: nextId("budget"), competenceMonth }));
      setState({ categoryBudgets: [...budgets, ...copies] });
      return copies.length;
    },

    addDependent: async ({ name }) =>
      setState({ dependents: [...getState().dependents, { id: nextId("dependent"), name }] }),
    editDependent: async (dependentId, patch) =>
      setState({
        dependents: getState().dependents.map((dependent) =>
          dependent.id === dependentId ? { ...dependent, ...patch } : dependent,
        ),
      }),
    deleteDependent: async (dependentId) =>
      setState({ dependents: getState().dependents.filter((dependent) => dependent.id !== dependentId) }),

    addCard: async (card) => setState({ cards: [...getState().cards, { ...card, id: nextId("card") }] }),
    editCard: async (cardId, patch) =>
      setState({
        cards: getState().cards.map((card) => (card.id === cardId ? { ...card, ...patch } : card)),
      }),
    deleteCard: async (cardId) => {
      all = all.filter((transaction) => transaction.cardId !== cardId);
      setState({ cards: getState().cards.filter((card) => card.id !== cardId) });
      commit();
    },

    addCategory: async (category) =>
      setState({
        categories: [...getState().categories, { ...category, id: nextId("category") }],
      }),
    editCategory: async (categoryId, patch) =>
      setState({
        categories: getState().categories.map((category) =>
          category.id === categoryId ? { ...category, ...patch } : category,
        ),
      }),
    deleteCategory: async (categoryId) =>
      setState({ categories: getState().categories.filter((category) => category.id !== categoryId) }),
  };

  setState(overrides);
  commit();

  return () => {
    useFinanceStore.setState(original, true);
  };
}
