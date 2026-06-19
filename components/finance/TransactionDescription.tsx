import { Badge } from "@/components/ui/badge";
import type { Transaction } from "@/store/useFinanceStore";

interface TransactionDescriptionProps {
  transaction: Transaction;
}

export function TransactionDescription({
  transaction,
}: TransactionDescriptionProps) {
  const installmentNumber =
    transaction.installmentNumber ?? transaction.current_installment ?? 1;
  const installmentsTotal =
    transaction.installmentsTotal ?? transaction.installments ?? 1;
  const recurringLabel =
    transaction.is_recurring !== true
      ? null
      : transaction.type === "card" || Boolean(transaction.cardId)
        ? "Assinatura"
        : "Fixo";

  return (
    <>
      <span>{transaction.description}</span>
      {installmentsTotal > 1 ? (
        <span className="ml-1 text-muted-foreground">
          ({installmentNumber}/{installmentsTotal})
        </span>
      ) : null}
      {recurringLabel ? (
        <Badge variant="secondary" className="ml-2 h-5 py-0 text-[10px]">
          {recurringLabel}
        </Badge>
      ) : null}
    </>
  );
}
