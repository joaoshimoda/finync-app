import { Badge } from "@/components/ui/badge";
import type { Transaction } from "@/store/useFinanceStore";

interface TransactionDescriptionProps {
  transaction: Transaction;
}

export function getTransactionDescriptionPresentation(
  transaction: Transaction,
) {
  const installmentNumber =
    transaction.installmentNumber ?? transaction.current_installment ?? 1;
  const installmentsTotal =
    transaction.installmentsTotal ?? transaction.installments ?? 1;
  const hasInstallments = installmentsTotal > 1;
  const description = hasInstallments
    ? transaction.description
        .replace(/(?:\s*\(\d{1,2}\/\d{1,2}\))+\s*$/, "")
        .trim()
    : transaction.description;

  return {
    description,
    hasInstallments,
    installmentNumber,
    installmentsTotal,
  };
}

export function TransactionDescription({
  transaction,
}: TransactionDescriptionProps) {
  const {
    description,
    hasInstallments,
    installmentNumber,
    installmentsTotal,
  } = getTransactionDescriptionPresentation(transaction);
  const recurringLabel =
    transaction.is_recurring !== true
      ? null
      : transaction.type === "card" || Boolean(transaction.cardId)
        ? "Assinatura"
        : "Fixo";

  return (
    <>
      <span>{description}</span>
      {hasInstallments ? (
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
