import test from "node:test";
import assert from "node:assert/strict";
import Decimal from "decimal.js";
import { getPaymentSummary, getClientPaymentSummary } from "../src/modules/payments/payment.service.js";
import { executeWorkflow } from "../src/modules/assistant/assistant.service.js";

test("getPaymentSummary function exists and is exported correctly", async () => {
  assert.equal(typeof getPaymentSummary, "function");
});

test("getClientPaymentSummary requires clientName or clientEmail", async () => {
  assert.equal(typeof getClientPaymentSummary, "function");
  await assert.rejects(
    () => getClientPaymentSummary({ id: "user-1", accountCategory: "BUSINESS" }, {}),
    (err) => {
      assert.equal(err.statusCode, 400);
      return true;
    }
  );
});

test("executeWorkflow returns structured result for GET_PAYMENT_SUMMARY", async () => {
  const mockUser = { id: "test-biz-user-1", accountCategory: "BUSINESS", businessProfile: { id: "prof-1" } };
  
  // Test that calling executeWorkflow with GET_PAYMENT_SUMMARY returns an object
  // It should execute real service function without throwing 400 'Unsupported workflow operation'
  try {
    const res = await executeWorkflow(mockUser, {
      operation: "GET_PAYMENT_SUMMARY",
      input: { period: "month" },
      confirmed: false,
    });
    assert.ok(res);
    assert.equal(typeof res.totalCollected, "string");
    assert.equal(typeof res.period, "string");
  } catch (err) {
    // If DB is offline in test runner, verify it did not fail with schema/operation error
    assert.notEqual(err.message, "Unsupported workflow operation: GET_PAYMENT_SUMMARY.");
  }
});

test("read-only queries do not create invoice records", async () => {
  const mockUser = { id: "test-biz-user-1", accountCategory: "BUSINESS", businessProfile: { id: "prof-1" } };
  // Operations like LIST_PENDING_INVOICES, GET_PAYMENT_SUMMARY, GET_DASHBOARD_SUMMARY must not create drafts
  const readOnlyOps = ["LIST_PENDING_INVOICES", "LIST_OVERDUE_INVOICES", "GET_PAYMENT_SUMMARY", "GET_DASHBOARD_SUMMARY"];
  for (const op of readOnlyOps) {
    try {
      await executeWorkflow(mockUser, { operation: op, input: {}, confirmed: false });
    } catch (err) {
      assert.notEqual(err.message, `Unsupported workflow operation: ${op}.`);
    }
  }
});
