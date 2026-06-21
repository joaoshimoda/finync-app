export const VARIABLE_INCOME_NOTE = "[variable_income]";
export const RECURRING_INCOME_NOTE = "[recurring_income]";

type IncomeRecurrenceCandidate = {
  notes?: string | null;
  type?: string | null;
  is_recurring?: boolean | null;
  status?: string | null;
};

export function isVariableIncome(transaction: IncomeRecurrenceCandidate) {
  return (
    transaction.type === "income" &&
    transaction.notes?.includes(VARIABLE_INCOME_NOTE)
  );
}

export function isPendingVariableIncome(transaction: IncomeRecurrenceCandidate) {
  return isVariableIncome(transaction) && transaction.status === "pending";
}
