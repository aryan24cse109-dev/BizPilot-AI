import { Prisma } from '@prisma/client';

/**
 * Robust financial calculations utility using fixed-point representation (paise/cents integer math)
 * to avoid floating point precision issues.
 */

// Convert human readable number or string to integer cents/paise (e.g. 150.25 -> 15025)
export const toCents = (val) => {
  if (val === null || val === undefined) return 0n;
  const str = String(val).trim();
  if (!str) return 0n;
  const [whole, fraction = ''] = str.split('.');
  const paddedFraction = fraction.padEnd(2, '0').slice(0, 2);
  const sign = whole.startsWith('-') ? -1n : 1n;
  const absWhole = whole.replace('-', '');
  return sign * (BigInt(absWhole || '0') * 100n + BigInt(paddedFraction || '0'));
};

// Convert cents back to 2-decimal string format e.g. 15025 -> "150.25"
export const fromCents = (cents) => {
  const isNegative = cents < 0n;
  const abs = isNegative ? -cents : cents;
  const whole = abs / 100n;
  const fraction = abs % 100n;
  return `${isNegative ? '-' : ''}${whole.toString()}.${fraction.toString().padStart(2, '0')}`;
};

export const toPrismaDecimal = (val) => {
  return new Prisma.Decimal(fromCents(toCents(val)));
};

/**
 * Calculate line item total: quantity * unitPrice
 */
export const calculateLineTotal = (quantity, unitPrice) => {
  const qty = Number(quantity) || 0;
  const priceCents = toCents(unitPrice);
  const totalCents = BigInt(Math.round(Number(priceCents) * qty));
  return fromCents(totalCents);
};

/**
 * Calculate invoice financial breakdown:
 * - Subtotal = sum(items)
 * - Tax = subtotal * (taxRate / 100)
 * - Discount = subtotal * (discountRate / 100)
 * - Grand Total = subtotal + tax - discount
 * - Balance Due = grandTotal - paidAmount
 */
export const computeInvoiceTotals = (items, taxRatePercent = 0, discountRatePercent = 0, currentPaid = 0) => {
  let subtotalCents = 0n;

  const processedItems = items.map((item, idx) => {
    const qty = Number(item.quantity) > 0 ? Number(item.quantity) : 1;
    const priceCents = toCents(item.unitPrice);
    const itemTotalCents = BigInt(Math.round(Number(priceCents) * qty));
    subtotalCents += itemTotalCents;

    return {
      description: String(item.description || `Item #${idx + 1}`).trim(),
      quantity: toPrismaDecimal(qty),
      unitPrice: toPrismaDecimal(fromCents(priceCents)),
      total: toPrismaDecimal(fromCents(itemTotalCents)),
      sortOrder: idx,
    };
  });

  const subtotal = fromCents(subtotalCents);

  // Tax calculation
  const taxRate = Number(taxRatePercent) || 0;
  const taxCents = BigInt(Math.round((Number(subtotalCents) * taxRate) / 100));
  const taxAmount = fromCents(taxCents);

  // Discount calculation
  const discountRate = Number(discountRatePercent) || 0;
  const discountCents = BigInt(Math.round((Number(subtotalCents) * discountRate) / 100));
  const discountAmount = fromCents(discountCents);

  // Grand total
  const grandTotalCents = subtotalCents + taxCents - discountCents;
  const grandTotal = fromCents(grandTotalCents > 0n ? grandTotalCents : 0n);

  // Paid amount & balance
  const paidCents = toCents(currentPaid);
  const balanceDueCents = (grandTotalCents - paidCents) > 0n ? (grandTotalCents - paidCents) : 0n;
  const balanceDue = fromCents(balanceDueCents);

  return {
    processedItems,
    subtotal: toPrismaDecimal(subtotal),
    taxRate: toPrismaDecimal(taxRate),
    taxAmount: toPrismaDecimal(taxAmount),
    discountRate: toPrismaDecimal(discountRate),
    discountAmount: toPrismaDecimal(discountAmount),
    totalAmount: toPrismaDecimal(grandTotal),
    paidAmount: toPrismaDecimal(fromCents(paidCents)),
    balanceDue: toPrismaDecimal(balanceDue),
  };
};
