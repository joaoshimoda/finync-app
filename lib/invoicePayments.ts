export type InvoiceAmounts = {
  postedAmount: number;
  totalAmount: number;
  paidAmount: number;
};

export function getInvoiceOutstanding(invoice: InvoiceAmounts) {
  return Math.max(invoice.totalAmount - invoice.paidAmount, 0);
}

export function getPostedInvoiceOutstanding(invoice: InvoiceAmounts) {
  return Math.max(invoice.postedAmount - invoice.paidAmount, 0);
}

export function getSuggestedInvoicePayment(invoice: InvoiceAmounts) {
  const postedOutstanding = getPostedInvoiceOutstanding(invoice);

  return postedOutstanding > 0
    ? postedOutstanding
    : getInvoiceOutstanding(invoice);
}
