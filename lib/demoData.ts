import { CARD_CREDIT_ADJUSTMENT_CATEGORY, CARD_CREDIT_ADJUSTMENT_NOTE } from "./cardCredits.ts";
import {
  getCardInvoiceCycle,
  getCardInvoiceDueDate,
  getCardInvoiceMonthStart,
  getInstallmentInvoiceMonthStart,
} from "./cardBilling.ts";
import { DEFAULT_CATEGORIES } from "./categories.ts";
import { getDateOnlyParts, getLocalTodayDateOnly, toDateOnly } from "./dateUtils.ts";

/* Fictional household for the public demo: a year of history plus the
   months ahead, built relative to today so it never looks stale. Shapes
   match what the finance store holds after mapping the database rows. */

type TransactionType = "income" | "fixed" | "card";
type TransactionStatus = "pending" | "confirmed" | "paid";

export interface DemoTransaction {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
  type: TransactionType;
  status: TransactionStatus;
  cardId: string | null;
  invoiceId: string | null;
  dependentId: string | null;
  groupId: string | null;
  splitGroupId: string | null;
  owner: string;
  dependentIds: string[];
  installments: number;
  current_installment: number;
  is_recurring: boolean;
  installmentNumber: number;
  installmentsTotal: number;
  notes?: string;
  billingMonthStart: string;
  createdAt: string;
  updatedAt: string;
}

export const demoCards = [
  { id: "demo-card-nubank", name: "Nubank", color: "#6d28d9", closingDay: 3, dueDay: 10, limitAmount: 8000 },
  { id: "demo-card-inter", name: "Inter", color: "#ea580c", closingDay: 25, dueDay: 5, limitAmount: 5000 },
];

export const demoDependents = [
  { id: "demo-dep-ana", name: "Ana Souza" },
  { id: "demo-dep-pedro", name: "Pedro Lima" },
];

export const DEMO_USER_NAME = "Marina";

const [NUBANK, INTER] = demoCards;
const [ANA, PEDRO] = demoDependents;

function closingDayOf(cardId: string) {
  return demoCards.find((card) => card.id === cardId)?.closingDay;
}

/* Small deterministic generator so the demo looks the same on every visit. */
function createRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1_664_525 + 1_013_904_223) % 4_294_967_296;
    return state / 4_294_967_296;
  };
}

function shiftMonth(year: number, month: number, offset: number) {
  const date = new Date(year, month - 1 + offset, 1);
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
}

function dayIn(year: number, month: number, day: number) {
  return toDateOnly(year, month, Math.min(day, new Date(year, month, 0).getDate()));
}

function money(value: number) {
  return Math.round(value * 100) / 100;
}

const variablePurchases: Array<{
  description: string;
  category: string;
  min: number;
  max: number;
  card: string;
  perMonth: number;
  dependent?: string;
}> = [
  { description: "Pão de Açúcar", category: "Alimentação", min: 180, max: 420, card: NUBANK.id, perMonth: 3 },
  { description: "iFood", category: "Alimentação", min: 38, max: 96, card: NUBANK.id, perMonth: 4 },
  { description: "Uber", category: "Transporte", min: 14, max: 48, card: INTER.id, perMonth: 5 },
  { description: "Posto Shell", category: "Transporte", min: 150, max: 260, card: INTER.id, perMonth: 1 },
  { description: "Drogasil", category: "Saúde", min: 25, max: 120, card: NUBANK.id, perMonth: 1 },
  { description: "Cinemark", category: "Lazer", min: 48, max: 110, card: NUBANK.id, perMonth: 1 },
  { description: "Amazon", category: "Outros", min: 60, max: 240, card: INTER.id, perMonth: 1 },
  { description: "iFood", category: "Alimentação", min: 32, max: 70, card: NUBANK.id, perMonth: 2, dependent: ANA.id },
  { description: "Steam", category: "Lazer", min: 30, max: 140, card: INTER.id, perMonth: 1, dependent: PEDRO.id },
];

const fixedBills = [
  { description: "Aluguel", category: "Moradia", amount: 2100, day: 5 },
  { description: "Condomínio", category: "Moradia", amount: 480, day: 10 },
  { description: "Energia elétrica", category: "Moradia", amount: 190, day: 18, vary: 0.25 },
  { description: "Internet fibra", category: "Moradia", amount: 119.9, day: 20 },
  { description: "Plano de saúde", category: "Saúde", amount: 420, day: 21 },
  { description: "Plano do celular", category: "Outros", amount: 59.9, day: 25 },
  { description: "Academia", category: "Saúde", amount: 109.9, day: 27 },
];

const subscriptions = [
  { description: "Netflix", amount: 44.9, day: 8, card: NUBANK.id },
  { description: "Spotify Família", amount: 34.9, day: 12, card: NUBANK.id },
  { description: "iCloud+ 200 GB", amount: 14.9, day: 15, card: INTER.id },
  { description: "ChatGPT Plus", amount: 104.9, day: 24, card: INTER.id },
];

export function buildDemoData(today = getLocalTodayDateOnly()) {
  const random = createRandom(42);
  const { year, month, day: todayDay } = getDateOnlyParts(today);
  const transactions: DemoTransaction[] = [];
  let sequence = 0;

  function add(
    partial: Partial<DemoTransaction> &
      Pick<DemoTransaction, "description" | "amount" | "date" | "category" | "type">,
  ) {
    sequence += 1;
    const cardId = partial.cardId ?? null;
    const billingMonthStart =
      partial.billingMonthStart ??
      (partial.type === "card" && cardId
        ? getCardInvoiceMonthStart(partial.date, closingDayOf(cardId))
        : toDateOnly(getDateOnlyParts(partial.date).year, getDateOnlyParts(partial.date).month, 1));
    const installmentsTotal = partial.installmentsTotal ?? 1;
    const installmentNumber = partial.installmentNumber ?? 1;

    transactions.push({
      id: `demo-tx-${sequence}`,
      status: "confirmed",
      cardId,
      invoiceId: null,
      dependentId: null,
      groupId: null,
      splitGroupId: null,
      owner: "eu",
      dependentIds: ["eu"],
      is_recurring: false,
      createdAt: `${partial.date}T12:00:00.000Z`,
      updatedAt: `${partial.date}T12:00:00.000Z`,
      ...partial,
      installments: installmentsTotal,
      current_installment: installmentNumber,
      installmentNumber,
      installmentsTotal,
      billingMonthStart,
    });
  }

  /* Twelve months back, the current one and three ahead. */
  for (let offset = -12; offset <= 3; offset += 1) {
    const period = shiftMonth(year, month, offset);
    const isPast = offset < 0;
    const isCurrent = offset === 0;


    add({
      description: "Salário",
      amount: 7800,
      date: dayIn(period.year, period.month, 5),
      category: "Salário",
      type: "income",
      is_recurring: true,
      groupId: "demo-group-salary",
    });
    if (offset % 3 === 0 && offset <= 0) {
      add({
        description: "Projeto freelance",
        amount: money(900 + random() * 900),
        date: dayIn(period.year, period.month, 16),
        category: "Freelance",
        type: "income",
      });
    }

    fixedBills.forEach((bill, index) => {
      const date = dayIn(period.year, period.month, bill.day);
      const isDue = date < today;
      /* Leave one bill overdue this month so the demo shows the warning. */
      const isOverdueExample = isCurrent && bill.description === "Energia elétrica";
      add({
        description: bill.description,
        amount: bill.vary ? money(bill.amount * (1 - bill.vary / 2 + random() * bill.vary)) : bill.amount,
        date,
        category: bill.category,
        type: "fixed",
        status: (isPast || (isDue && !isOverdueExample)) && offset <= 0 ? "paid" : "pending",
        is_recurring: true,
        groupId: `demo-group-bill-${index}`,
      });
    });

    subscriptions.forEach((subscription, index) => {
      const date = dayIn(period.year, period.month, subscription.day);
      add({
        description: subscription.description,
        amount: subscription.amount,
        date,
        category: "Lazer",
        type: "card",
        cardId: subscription.card,
        status: date > today ? "pending" : "confirmed",
        is_recurring: true,
        groupId: `demo-group-sub-${index}`,
      });
    });

    if (offset > 0) continue;

    variablePurchases.forEach((purchase) => {
      for (let count = 0; count < purchase.perMonth; count += 1) {
        const purchaseDay = 1 + Math.floor(random() * 27);
        if (isCurrent && purchaseDay > todayDay) continue;
        const dependent = purchase.dependent
          ? demoDependents.find((item) => item.id === purchase.dependent)
          : null;
        add({
          description: purchase.description,
          amount: money(purchase.min + random() * (purchase.max - purchase.min)),
          date: dayIn(period.year, period.month, purchaseDay),
          category: purchase.category,
          type: "card",
          cardId: purchase.card,
          dependentId: dependent?.id ?? null,
          owner: dependent?.name ?? "eu",
          dependentIds: [dependent?.id ?? "eu"],
        });
      }
    });

    if (offset === -2) {
      add({
        description: "Estorno Amazon",
        amount: 79.9,
        date: dayIn(period.year, period.month, 14),
        category: CARD_CREDIT_ADJUSTMENT_CATEGORY,
        notes: CARD_CREDIT_ADJUSTMENT_NOTE,
        type: "card",
        cardId: INTER.id,
      });
    }
  }

  /* Installment purchases: a notebook in 10x and clothes in 4x for Ana. */
  [
    { description: "Notebook Dell", total: 3899, count: 10, monthsAgo: 4, card: NUBANK.id, category: "Outros" },
    { description: "Renner", total: 454.84, count: 4, monthsAgo: 1, card: NUBANK.id, category: "Vestuário", dependent: ANA },
    { description: "Tênis Nike", total: 699.9, count: 3, monthsAgo: 0, card: INTER.id, category: "Vestuário" },
  ].forEach((plan, planIndex) => {
    const start = shiftMonth(year, month, -plan.monthsAgo);
    const purchaseDate = dayIn(start.year, start.month, Math.min(todayDay, 12));
    const installmentAmount = money(plan.total / plan.count);
    for (let index = 0; index < plan.count; index += 1) {
      const billingMonthStart = getInstallmentInvoiceMonthStart(
        purchaseDate,
        closingDayOf(plan.card),
        index,
      );
      add({
        description: plan.description,
        amount: installmentAmount,
        date: purchaseDate,
        category: plan.category,
        type: "card",
        cardId: plan.card,
        groupId: `demo-group-installment-${planIndex}`,
        installmentNumber: index + 1,
        installmentsTotal: plan.count,
        billingMonthStart,
        dependentId: plan.dependent?.id ?? null,
        owner: plan.dependent?.name ?? "eu",
        dependentIds: [plan.dependent?.id ?? "eu"],
      });
    }
  });

  /* Invoices: one per card and billing month, paid when already due. */
  const invoiceTotals = new Map<string, number>();
  transactions
    .filter((transaction) => transaction.type === "card" && transaction.cardId)
    .forEach((transaction) => {
      const key = `${transaction.cardId}|${transaction.billingMonthStart}`;
      const signed =
        transaction.notes?.includes(CARD_CREDIT_ADJUSTMENT_NOTE) ? -transaction.amount : transaction.amount;
      invoiceTotals.set(key, (invoiceTotals.get(key) ?? 0) + signed);
    });

  const cardInvoices = Array.from(invoiceTotals.entries()).map(([key, total]) => {
    const [cardId, billingMonthStart] = key.split("|");
    const card = demoCards.find((item) => item.id === cardId)!;
    const cycle = getCardInvoiceCycle(billingMonthStart, card.closingDay);
    const dueDate = getCardInvoiceDueDate(billingMonthStart, card.closingDay, card.dueDay);
    const totalAmount = money(Math.max(total, 0));
    const isPaid = dueDate < today;
    const isClosed = cycle.endDate < today;
    return {
      id: `demo-invoice-${cardId}-${billingMonthStart}`,
      cardId,
      billingMonthStart,
      cycleStart: cycle.startDate,
      cycleEnd: cycle.endDate,
      dueDate,
      status: (isPaid ? "paid" : isClosed ? "closed" : "open") as "paid" | "closed" | "open",
      postedAmount: totalAmount,
      totalAmount,
      paidAmount: isPaid ? totalAmount : 0,
      paidAt: isPaid ? `${dueDate}T12:00:00.000Z` : null,
      closedAt: isClosed ? `${cycle.endDate}T23:59:00.000Z` : null,
    };
  });
  const invoicesByKey = new Map(cardInvoices.map((invoice) => [`${invoice.cardId}|${invoice.billingMonthStart}`, invoice.id]));
  transactions.forEach((transaction) => {
    if (transaction.type === "card" && transaction.cardId) {
      transaction.invoiceId = invoicesByKey.get(`${transaction.cardId}|${transaction.billingMonthStart}`) ?? null;
    }
  });

  /* Ana pays back every month; this month only part of it so far. */
  const dependentSettlements = Array.from({ length: 4 }, (_, index) => {
    const period = shiftMonth(year, month, -index);
    const competenceMonth = toDateOnly(period.year, period.month, 1);
    const owed = transactions
      .filter(
        (transaction) =>
          transaction.dependentId === ANA.id && transaction.billingMonthStart === competenceMonth,
      )
      .reduce((sum, transaction) => sum + transaction.amount, 0);
    return {
      id: `demo-settlement-${index}`,
      dependentId: ANA.id,
      competenceMonth,
      amount: money(index === 0 ? Math.min(150, owed) : owed),
      settledAt: `${dayIn(period.year, period.month, 20)}T12:00:00.000Z`,
      method: "PIX" as const,
      status: "confirmed" as const,
      source: "manual" as const,
      notes: null,
      createdAt: `${dayIn(period.year, period.month, 20)}T12:00:00.000Z`,
    };
  }).filter((settlement) => settlement.amount > 0);

  const categories = DEFAULT_CATEGORIES.map((category, index) => ({
    id: `demo-category-${index}`,
    label: category.label,
    kind: category.kind,
    icon: category.icon,
    isDefault: false,
  }));
  categories.push({ id: "demo-category-clothes", label: "Vestuário", kind: "expense", icon: "Shirt", isDefault: false });

  const categoryBudgets = [-1, 0].flatMap((offset) => {
    const period = shiftMonth(year, month, offset);
    const competenceMonth = toDateOnly(period.year, period.month, 1);
    return [
      ["Alimentação", 1400],
      ["Transporte", 600],
      ["Lazer", 450],
      ["Saúde", 700],
      ["Vestuário", 300],
    ].map(([label, amount]) => ({
      id: `demo-budget-${offset}-${label}`,
      categoryId: categories.find((category) => category.label === label)!.id,
      competenceMonth,
      amount: amount as number,
      alertThresholdPercent: 80,
      createdAt: `${competenceMonth}T12:00:00.000Z`,
      updatedAt: `${competenceMonth}T12:00:00.000Z`,
    }));
  });

  return {
    cards: demoCards,
    dependents: demoDependents,
    categories,
    categoryBudgets,
    transactions,
    cardInvoices,
    invoicePayments: [],
    dependentSettlements,
  };
}

export type DemoData = ReturnType<typeof buildDemoData>;

/* The database row shape the analytics history reads, for personal spending. */
export function toAnalyticsRows(transactions: DemoTransaction[]) {
  return transactions
    .filter((transaction) => !transaction.dependentId)
    .map((transaction) => ({
      id: transaction.id,
      card_id: transaction.cardId,
      dependent_id: transaction.dependentId,
      month_start: transaction.billingMonthStart,
      transaction_date: transaction.date,
      type: transaction.type,
      description: transaction.description,
      category: transaction.category,
      amount: transaction.amount,
      day: getDateOnlyParts(transaction.date).day,
      notes: transaction.notes ?? null,
    }))
    .sort(
      (left, right) =>
        left.month_start.localeCompare(right.month_start) || left.day - right.day,
    );
}
