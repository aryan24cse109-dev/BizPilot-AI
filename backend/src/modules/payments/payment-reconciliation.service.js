import Decimal from "decimal.js";

import { ApiError } from "../../utils/ApiError.js";
import { toMinorUnits } from "../../utils/currency.js";

export async function reconcileSuccessfulPayment(tx, {
  payment,
  providerPaymentId = null,
  providerAmount,
  providerCurrency,
  metadata = null,
}) {
  if (
    Number(providerAmount) !== toMinorUnits(payment.amount) ||
    String(providerCurrency).toUpperCase() !== String(payment.currency).toUpperCase()
  ) {
    throw new ApiError(409, "The provider payment does not match the invoice.");
  }
  if (payment.providerPaymentId && payment.providerPaymentId !== providerPaymentId) {
    throw new ApiError(409, "A different provider payment is already associated with this attempt.");
  }
  if (payment.status === "SUCCEEDED" || payment.status === "REFUNDED") {
    return tx.invoice.findUnique({ where: { id: payment.invoiceId } });
  }

  await tx.payment.update({
    where: { id: payment.id },
    data: {
      status: "SUCCEEDED",
      providerPaymentId,
      capturedAt: new Date(),
      failureReason: null,
      metadata,
    },
  });

  const successful = await tx.payment.aggregate({
    where: { invoiceId: payment.invoiceId, status: "SUCCEEDED" },
    _sum: { amount: true },
  });
  const invoice = await tx.invoice.findUnique({ where: { id: payment.invoiceId } });
  if (!invoice) throw new ApiError(404, "Invoice not found.");

  const paid = new Decimal(successful._sum.amount ?? 0);
  const total = new Decimal(invoice.totalAmount);
  const balance = Decimal.max(0, total.minus(paid));
  return tx.invoice.update({
    where: { id: invoice.id },
    data: {
      amountPaid: paid.toFixed(2),
      balanceDue: balance.toFixed(2),
      status: balance.isZero() ? "PAID" : "PARTIALLY_PAID",
      paidAt: balance.isZero() ? new Date() : null,
    },
  });
}
