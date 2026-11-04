
import { z } from "zod";
import Decimal from "decimal.js";

Decimal.set({
  precision: 28,
  rounding: Decimal.ROUND_HALF_UP,
});

const decimalInput = z.union([
  z.string().trim().min(1),
  z.number().finite(),
]);

const invoiceItemSchema = z.object({
  description: z.string().trim().min(1).max(500),
  quantity: decimalInput,
  unitPrice: decimalInput,
  taxRate: decimalInput.optional().default("0"),
});

export const createInvoiceSchema = z.object({
  clientName: z.string().trim().min(2).max(150),
  clientEmail: z.string().trim().email().max(255),
  clientUserId: z.string().uuid().optional().nullable(),
  currency: z.string().trim().length(3).default("INR"),
  dueDate: z.string().datetime().optional().nullable(),
  discountAmount: decimalInput.optional().default("0"),
  notes: z.string().trim().max(5000).optional().nullable(),
  terms: z.string().trim().max(5000).optional().nullable(),
  items: z.array(invoiceItemSchema).min(1).max(100),
});

export const updateInvoiceSchema = createInvoiceSchema
  .omit({ clientUserId: true })
  .partial()
  .extend({
    items: z.array(invoiceItemSchema).min(1).max(100).optional(),
  });

export const invoiceListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.string().optional(),
  search: z.string().trim().max(100).optional(),
});

function toDecimal(value, fieldName) {
  let result;

  try {
    result = new Decimal(value);
  } catch {
    throw new Error(`${fieldName} must be a valid number.`);
  }

  if (!result.isFinite()) {
    throw new Error(`${fieldName} must be a finite number.`);
  }

  return result;
}

export function calculateInvoiceTotals(items, discountAmount = "0") {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("An invoice must contain at least one item.");
  }

  let subtotal = new Decimal(0);
  let taxAmount = new Decimal(0);

  const calculatedItems = items.map((item) => {
    const quantity = toDecimal(item.quantity, "Quantity");
    const unitPrice = toDecimal(item.unitPrice, "Unit price");
    const taxRate = toDecimal(item.taxRate ?? "0", "Tax rate");

    if (quantity.lte(0) || quantity.gt(1000000)) {
      throw new Error("Quantity must be greater than 0 and within the allowed limit.");
    }

    if (unitPrice.lt(0) || unitPrice.gt("9999999999999999")) {
      throw new Error("Unit price is outside the allowed range.");
    }

    if (taxRate.lt(0) || taxRate.gt(100)) {
      throw new Error("Tax rate must be between 0 and 100.");
    }

    const lineSubtotal = quantity.mul(unitPrice).toDecimalPlaces(2);
    const lineTax = lineSubtotal
      .mul(taxRate)
      .div(100)
      .toDecimalPlaces(2);

    const lineTotal = lineSubtotal.plus(lineTax);

    subtotal = subtotal.plus(lineSubtotal);
    taxAmount = taxAmount.plus(lineTax);

    return {
      description: item.description.trim(),
      quantity: quantity.toFixed(3),
      unitPrice: unitPrice.toFixed(2),
      taxRate: taxRate.toFixed(4),
      lineSubtotal: lineSubtotal.toFixed(2),
      lineTax: lineTax.toFixed(2),
      lineTotal: lineTotal.toFixed(2),
    };
  });

  const discount = toDecimal(discountAmount, "Discount");

  if (discount.lt(0) || discount.gt(subtotal)) {
    throw new Error("Discount cannot be negative or greater than the subtotal.");
  }

  // MVP accounting rule:
  // Invoice-level discount is deducted after item-level tax.
  const totalAmount = subtotal.plus(taxAmount).minus(discount);

  if (totalAmount.lt(0)) {
    throw new Error("Invoice total cannot be negative.");
  }

  return {
    items: calculatedItems,
    subtotal: subtotal.toFixed(2),
    discountAmount: discount.toFixed(2),
    taxAmount: taxAmount.toFixed(2),
    totalAmount: totalAmount.toFixed(2),
    amountPaid: "0.00",
    balanceDue: totalAmount.toFixed(2),
  };
}
