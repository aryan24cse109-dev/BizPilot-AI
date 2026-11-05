
import test from "node:test";
import assert from "node:assert/strict";

import {
  calculateInvoiceTotals,
  createInvoiceSchema,
} from "../src/modules/invoices/invoice.schema.js";

test("calculates invoice subtotal, tax, discount and total correctly", () => {
  const result = calculateInvoiceTotals(
    [
      {
        description: "Website development",
        quantity: "1",
        unitPrice: "10000",
        taxRate: "18",
      },
    ],
    "500",
  );

  assert.equal(result.subtotal, "10000.00");
  assert.equal(result.taxAmount, "1800.00");
  assert.equal(result.discountAmount, "500.00");
  assert.equal(result.totalAmount, "11300.00");
  assert.equal(result.balanceDue, "11300.00");
});

test("supports multiple invoice items", () => {
  const result = calculateInvoiceTotals(
    [
      {
        description: "Frontend",
        quantity: "1",
        unitPrice: "5000",
        taxRate: "18",
      },
      {
        description: "Backend",
        quantity: "2",
        unitPrice: "2500",
        taxRate: "18",
      },
    ],
    "0",
  );

  assert.equal(result.subtotal, "10000.00");
  assert.equal(result.taxAmount, "1800.00");
  assert.equal(result.totalAmount, "11800.00");
  assert.equal(result.items.length, 2);
});

test("rejects negative quantity", () => {
  assert.throws(() => {
    calculateInvoiceTotals([
      {
        description: "Test",
        quantity: "-1",
        unitPrice: "100",
        taxRate: "18",
      },
    ]);
  });
});

test("rejects negative unit price", () => {
  assert.throws(() => {
    calculateInvoiceTotals([
      {
        description: "Test",
        quantity: "1",
        unitPrice: "-100",
        taxRate: "18",
      },
    ]);
  });
});

test("rejects tax rates above 100 percent", () => {
  assert.throws(() => {
    calculateInvoiceTotals([
      {
        description: "Test",
        quantity: "1",
        unitPrice: "100",
        taxRate: "101",
      },
    ]);
  });
});

test("rejects discount greater than subtotal", () => {
  assert.throws(() => {
    calculateInvoiceTotals(
      [
        {
          description: "Test",
          quantity: "1",
          unitPrice: "100",
          taxRate: "0",
        },
      ],
      "200",
    );
  });
});

test("accepts a valid invoice request", () => {
  const result = createInvoiceSchema.safeParse({
    clientName: "ABC Technologies",
    clientEmail: "client@example.com",
    currency: "INR",
    discountAmount: "500",
    items: [
      {
        description: "Software development",
        quantity: "1",
        unitPrice: "10000",
        taxRate: "18",
      },
    ],
  });

  assert.equal(result.success, true);
});

test("rejects an invoice with invalid client email", () => {
  const result = createInvoiceSchema.safeParse({
    clientName: "ABC Technologies",
    clientEmail: "invalid-email",
    items: [
      {
        description: "Software development",
        quantity: "1",
        unitPrice: "10000",
        taxRate: "18",
      },
    ],
  });

  assert.equal(result.success, false);
});

test("rejects an invoice without items", () => {
  const result = createInvoiceSchema.safeParse({
    clientName: "ABC Technologies",
    clientEmail: "client@example.com",
    items: [],
  });

  assert.equal(result.success, false);
});
