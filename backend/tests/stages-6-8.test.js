import test from "node:test";
import assert from "node:assert/strict";

import { toMinorUnits } from "../src/utils/currency.js";
import { workflowSchema } from "../src/modules/assistant/assistant.schema.js";

test("converts supported currency amounts to provider minor units without floating point drift", () => {
  assert.equal(toMinorUnits("10.05"), 1005);
  assert.throws(() => toMinorUnits("10.001"));
});

test("workflow schema allows only fixed operations", () => {
  assert.equal(
    workflowSchema.safeParse({
      operation: "GET_INVOICE_STATUS",
      input: { invoiceId: "invoice-id" },
    }).success,
    true,
  );
  assert.equal(
    workflowSchema.safeParse({
      operation: "DELETE_DATABASE",
      input: {},
    }).success,
    false,
  );
});
