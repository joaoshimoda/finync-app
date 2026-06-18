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
  const isFixed = transaction.type === "fixed" || transaction.is_recurring;

  return (
    <>
      <span>{transaction.description}</span>
      {installmentsTotal > 1 ? (
        <span className="ml-1 text-muted-foreground">
          ({installmentNumber}/{installmentsTotal})
        </span>
      ) : null}
      {isFixed ? (
        <Badge variant="secondary" className="ml-2 h-5 py-0 text-[10px]">
          Fixo
        </Badge>
      ) : null}
    </>
  );
}
