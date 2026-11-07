import test from "node:test";
import assert from "node:assert/strict";

import { createAIClient } from "../src/integrations/ai/ai.client.js";
import { validateAndNormalizeAIResponse } from "../src/integrations/ai/ai.schema.js";
import { createAssistantOrchestrator, executeWorkflow } from "../src/modules/assistant/assistant.service.js";
import http from "node:http";
import { createApp as createAIApp } from "../../ai-service/src/app.js";
import { createAssistantRoutes } from "../../ai-service/src/modules/assistant/assistant.routes.js";
import { createServiceAuthMiddleware } from "../../ai-service/src/middleware/serviceAuth.middleware.js";

// ─── Shared fixture ───────────────────────────────────────────────────────────

const validResponse = {
  type: "workflow",
  intent: "GET_INVOICE_STATUS",
  confidence: 0.9,
  entities: {},
  workflow: {
    action: "GET_INVOICE_STATUS",
    parameters: { invoiceId: "invoice-1" },
    requiresConfirmation: false,
  },
  clarificationQuestion: null,
  response: "I can check that invoice.",
  workflowInterpretation: {
    isWorkflow: true,
    isComplete: true,
    action: "GET_INVOICE_STATUS",
    missingRequirements: [],
    requiresConfirmation: false,
  },
};

const mockFetch = (status, payload) => async () => ({
  ok: status >= 200 && status < 300,
  status,
  headers: { get: () => null },
  text: async () => JSON.stringify(payload),
});

// ─── Schema validation ────────────────────────────────────────────────────────

test("backend rejects unsupported AI workflow parameters and payment mutations", () => {
  const invalidParameters = {
    ...validResponse,
    workflow: {
      ...validResponse.workflow,
      parameters: { invoiceId: "invoice-1", deleteAll: true },
    },
  };
  assert.equal(validateAndNormalizeAIResponse(invalidParameters).success, false);

  const paymentMutation = {
    ...validResponse,
    workflow: {
      action: "GET_INVOICE_STATUS",
      parameters: { invoiceId: "invoice-1", paymentStatus: "PAID" },
      requiresConfirmation: false,
    },
  };
  assert.equal(validateAndNormalizeAIResponse(paymentMutation).success, false);
});

test("GET_PAYMENT_SUMMARY is accepted with no parameters", () => {
  const r = validateAndNormalizeAIResponse({
    ...validResponse,
    type: "workflow",
    intent: "GET_PAYMENT_SUMMARY",
    workflow: { action: "GET_PAYMENT_SUMMARY", parameters: {}, requiresConfirmation: false },
    workflowInterpretation: {
      isWorkflow: true, isComplete: true, action: "GET_PAYMENT_SUMMARY",
      missingRequirements: [], requiresConfirmation: false,
    },
  });
  assert.equal(r.success, true);
});

test("GET_PAYMENT_SUMMARY accepts period parameter", () => {
  const r = validateAndNormalizeAIResponse({
    ...validResponse,
    type: "workflow",
    intent: "GET_PAYMENT_SUMMARY",
    workflow: { action: "GET_PAYMENT_SUMMARY", parameters: { period: "month" }, requiresConfirmation: false },
    workflowInterpretation: {
      isWorkflow: true, isComplete: true, action: "GET_PAYMENT_SUMMARY",
      missingRequirements: [], requiresConfirmation: false,
    },
  });
  assert.equal(r.success, true);
});

test("GET_CLIENT_PAYMENT_SUMMARY accepts clientName", () => {
  const r = validateAndNormalizeAIResponse({
    ...validResponse,
    type: "workflow",
    intent: "GET_CLIENT_PAYMENT_SUMMARY",
    workflow: {
      action: "GET_CLIENT_PAYMENT_SUMMARY",
      parameters: { clientName: "Rahul" },
      requiresConfirmation: false,
    },
    workflowInterpretation: {
      isWorkflow: true, isComplete: true, action: "GET_CLIENT_PAYMENT_SUMMARY",
      missingRequirements: [], requiresConfirmation: false,
    },
  });
  assert.equal(r.success, true);
});

test("GET_CLIENT_PAYMENT_SUMMARY rejects unsupported parameter clientId", () => {
  const r = validateAndNormalizeAIResponse({
    ...validResponse,
    type: "workflow",
    intent: "GET_CLIENT_PAYMENT_SUMMARY",
    workflow: {
      action: "GET_CLIENT_PAYMENT_SUMMARY",
      parameters: { clientId: "abc-123" },
      requiresConfirmation: false,
    },
    workflowInterpretation: {
      isWorkflow: true, isComplete: true, action: "GET_CLIENT_PAYMENT_SUMMARY",
      missingRequirements: [], requiresConfirmation: false,
    },
  });
  assert.equal(r.success, false);
});

test("GET_DASHBOARD_SUMMARY is accepted", () => {
  const r = validateAndNormalizeAIResponse({
    ...validResponse,
    type: "workflow",
    intent: "GET_DASHBOARD_SUMMARY",
    workflow: { action: "GET_DASHBOARD_SUMMARY", parameters: {}, requiresConfirmation: false },
    workflowInterpretation: {
      isWorkflow: true, isComplete: true, action: "GET_DASHBOARD_SUMMARY",
      missingRequirements: [], requiresConfirmation: false,
    },
  });
  assert.equal(r.success, true);
});

test("LIST_PENDING_INVOICES is accepted", () => {
  const r = validateAndNormalizeAIResponse({
    ...validResponse,
    type: "workflow",
    intent: "LIST_PENDING_INVOICES",
    workflow: { action: "LIST_PENDING_INVOICES", parameters: {}, requiresConfirmation: false },
    workflowInterpretation: {
      isWorkflow: true, isComplete: true, action: "LIST_PENDING_INVOICES",
      missingRequirements: [], requiresConfirmation: false,
    },
  });
  assert.equal(r.success, true);
});

test("LIST_OVERDUE_INVOICES is accepted", () => {
  const r = validateAndNormalizeAIResponse({
    ...validResponse,
    type: "workflow",
    intent: "LIST_OVERDUE_INVOICES",
    workflow: { action: "LIST_OVERDUE_INVOICES", parameters: {}, requiresConfirmation: false },
    workflowInterpretation: {
      isWorkflow: true, isComplete: true, action: "LIST_OVERDUE_INVOICES",
      missingRequirements: [], requiresConfirmation: false,
    },
  });
  assert.equal(r.success, true);
});

test("unknown action is rejected", () => {
  const r = validateAndNormalizeAIResponse({
    ...validResponse,
    type: "workflow",
    intent: "DELETE_ALL_INVOICES",
    workflow: { action: "DELETE_ALL_INVOICES", parameters: {}, requiresConfirmation: false },
    workflowInterpretation: {
      isWorkflow: true, isComplete: true, action: "DELETE_ALL_INVOICES",
      missingRequirements: [], requiresConfirmation: false,
    },
  });
  assert.equal(r.success, false);
});

// ─── Invoice draft normalization ──────────────────────────────────────────────

test("canonicalizes lineItems and preserves valid items", () => {
  const base = {
    ...validResponse,
    type: "workflow",
    intent: "CREATE_INVOICE_DRAFT",
    workflowInterpretation: {
      isWorkflow: true, isComplete: true, action: "CREATE_INVOICE_DRAFT",
      missingRequirements: [], requiresConfirmation: false,
    },
  };
  const item = { description: "Website Development", quantity: 1, unitPrice: 15000 };

  const fromLineItems = validateAndNormalizeAIResponse({
    ...base,
    workflow: {
      action: "CREATE_INVOICE_DRAFT",
      parameters: { clientName: "Semser Study", lineItems: [item] },
      requiresConfirmation: false,
    },
  });
  assert.equal(fromLineItems.success, true);
  assert.deepEqual(fromLineItems.data.workflow.parameters.items, [item]);
  assert.equal("lineItems" in fromLineItems.data.workflow.parameters, false);

  const canonical = validateAndNormalizeAIResponse({
    ...base,
    workflow: {
      action: "CREATE_INVOICE_DRAFT",
      parameters: { clientName: "Semser Study", items: [item] },
      requiresConfirmation: false,
    },
  });
  assert.equal(canonical.success, true);
  assert.deepEqual(canonical.data.workflow.parameters.items, [item]);
});

test("rejects invalid invoice draft items", () => {
  const base = {
    ...validResponse,
    type: "workflow",
    intent: "CREATE_INVOICE_DRAFT",
    workflowInterpretation: {
      isWorkflow: true, isComplete: true, action: "CREATE_INVOICE_DRAFT",
      missingRequirements: [], requiresConfirmation: false,
    },
  };
  const r = validateAndNormalizeAIResponse({
    ...base,
    workflow: {
      action: "CREATE_INVOICE_DRAFT",
      parameters: {
        clientName: "Semser Study",
        items: [{ description: "Website", quantity: 0, unitPrice: -1 }],
      },
      requiresConfirmation: false,
    },
  });
  assert.equal(r.success, false);
});

// ─── Orchestrator tests ───────────────────────────────────────────────────────

test("GET_PAYMENT_SUMMARY orchestrator executes handler", async () => {
  let calledWith;
  const orchestrator = createAssistantOrchestrator({
    aiClientImpl: {
      interpret: async () => ({
        type: "workflow",
        intent: "GET_PAYMENT_SUMMARY",
        confidence: 0.95,
        entities: {},
        workflow: { action: "GET_PAYMENT_SUMMARY", parameters: {}, requiresConfirmation: false },
        clarificationQuestion: null,
        response: "Here is your payment summary.",
        workflowInterpretation: {
          isWorkflow: true, isComplete: true, action: "GET_PAYMENT_SUMMARY",
          missingRequirements: [], requiresConfirmation: false,
        },
      }),
    },
    executeWorkflowImpl: async (_user, req) => {
      calledWith = req;
      return { totalCollected: "50000.00" };
    },
  });

  const result = await orchestrator.interpretAndExecute(
    { id: "biz-1", accountCategory: "BUSINESS" },
    { message: "How much money did I collect this month?", conversationHistory: [] },
  );
  assert.equal(result.status, "executed");
  assert.equal(calledWith.operation, "GET_PAYMENT_SUMMARY");
  assert.deepEqual(calledWith.input, {});
});

test("GET_CLIENT_PAYMENT_SUMMARY orchestrator executes with clientName", async () => {
  let calledWith;
  const orchestrator = createAssistantOrchestrator({
    aiClientImpl: {
      interpret: async () => ({
        type: "workflow",
        intent: "GET_CLIENT_PAYMENT_SUMMARY",
        confidence: 0.95,
        entities: {},
        workflow: {
          action: "GET_CLIENT_PAYMENT_SUMMARY",
          parameters: { clientName: "Rahul" },
          requiresConfirmation: false,
        },
        clarificationQuestion: null,
        response: "Client payment summary for Rahul.",
        workflowInterpretation: {
          isWorkflow: true, isComplete: true, action: "GET_CLIENT_PAYMENT_SUMMARY",
          missingRequirements: [], requiresConfirmation: false,
        },
      }),
    },
    executeWorkflowImpl: async (_user, req) => {
      calledWith = req;
      return { client: { name: "Rahul" }, summary: { totalPaid: "10000.00" } };
    },
  });

  const result = await orchestrator.interpretAndExecute(
    { id: "biz-1", accountCategory: "BUSINESS" },
    { message: "Show Rahul's payment history", conversationHistory: [] },
  );
  assert.equal(result.status, "executed");
  assert.equal(calledWith.operation, "GET_CLIENT_PAYMENT_SUMMARY");
  assert.equal(calledWith.input.clientName, "Rahul");
});

test("LIST_PENDING_INVOICES orchestrator executes", async () => {
  const orchestrator = createAssistantOrchestrator({
    aiClientImpl: {
      interpret: async () => ({
        type: "workflow",
        intent: "LIST_PENDING_INVOICES",
        confidence: 0.95,
        entities: {},
        workflow: { action: "LIST_PENDING_INVOICES", parameters: {}, requiresConfirmation: false },
        clarificationQuestion: null,
        response: "Here are your pending invoices.",
        workflowInterpretation: {
          isWorkflow: true, isComplete: true, action: "LIST_PENDING_INVOICES",
          missingRequirements: [], requiresConfirmation: false,
        },
      }),
    },
    executeWorkflowImpl: async (_user, req) => {
      assert.equal(req.operation, "LIST_PENDING_INVOICES");
      return { invoices: [], pagination: { total: 0 } };
    },
  });

  const result = await orchestrator.interpretAndExecute(
    { id: "biz-1", accountCategory: "BUSINESS" },
    { message: "Show my pending invoices", conversationHistory: [] },
  );
  assert.equal(result.status, "executed");
});

test("GET_DASHBOARD_SUMMARY orchestrator executes", async () => {
  const orchestrator = createAssistantOrchestrator({
    aiClientImpl: {
      interpret: async () => ({
        type: "workflow",
        intent: "GET_DASHBOARD_SUMMARY",
        confidence: 0.95,
        entities: {},
        workflow: { action: "GET_DASHBOARD_SUMMARY", parameters: {}, requiresConfirmation: false },
        clarificationQuestion: null,
        response: "Here is your business summary.",
        workflowInterpretation: {
          isWorkflow: true, isComplete: true, action: "GET_DASHBOARD_SUMMARY",
          missingRequirements: [], requiresConfirmation: false,
        },
      }),
    },
    executeWorkflowImpl: async (_user, req) => {
      assert.equal(req.operation, "GET_DASHBOARD_SUMMARY");
      return { summary: "dashboard data" };
    },
  });

  const result = await orchestrator.interpretAndExecute(
    { id: "biz-1", accountCategory: "BUSINESS" },
    { message: "Give me my business summary", conversationHistory: [] },
  );
  assert.equal(result.status, "executed");
});

test("assistant rejects business-only actions for client accounts", async () => {
  await assert.rejects(
    executeWorkflow(
      { id: "client-1", accountCategory: "CLIENT", businessProfile: null },
      { operation: "CREATE_INVOICE_DRAFT", input: {}, confirmed: false },
    ),
    (error) => {
      assert.equal(error.statusCode, 403);
      return true;
    },
  );
});

test("orchestrator returns confirmation for SEND_INVOICE without confirmed flag", async () => {
  let executed = false;
  const orchestrator = createAssistantOrchestrator({
    aiClientImpl: {
      interpret: async () => ({
        ...validResponse,
        intent: "SEND_INVOICE",
        workflow: { action: "SEND_INVOICE", parameters: { invoiceId: "invoice-1" }, requiresConfirmation: true },
        workflowInterpretation: {
          ...validResponse.workflowInterpretation,
          action: "SEND_INVOICE",
          requiresConfirmation: true,
        },
      }),
    },
    executeWorkflowImpl: async () => { executed = true; return {}; },
  });

  const result = await orchestrator.interpretAndExecute(
    { id: "biz-1", accountCategory: "BUSINESS" },
    { message: "Send invoice", conversationHistory: [], confirmed: false },
  );
  assert.equal(result.status, "confirmation_required");
  assert.equal(executed, false);
});

// ─── AI client contract tests ─────────────────────────────────────────────────

test("AI client sends only the service secret in headers", async () => {
  let captured;
  const client = createAIClient({
    baseUrl: "http://ai.test",
    secret: "server-secret",
    timeoutMs: 1000,
    fetchImpl: async (url, options) => {
      captured = { url, options };
      return {
        ok: true, status: 200,
        headers: { get: () => null },
        text: async () => JSON.stringify({ success: true, data: validResponse }),
      };
    },
  });

  const result = await client.interpret({
    message: "Show invoice status",
    conversationHistory: [],
    context: { accountCategory: "BUSINESS" },
  });

  assert.equal(result.intent, "GET_INVOICE_STATUS");
  assert.equal(captured.url, "http://ai.test/api/assistant/interpret");
  assert.equal(captured.options.headers["x-ai-service-secret"], "server-secret");
  assert.equal(captured.options.headers.authorization, undefined);
  assert.equal(JSON.parse(captured.options.body).context.accountCategory, "BUSINESS");
});

test("AI client maps timeout and malformed responses safely", async () => {
  const timedOut = createAIClient({
    secret: "server-secret",
    timeoutMs: 5,
    fetchImpl: async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      return { ok: true, status: 200, headers: { get: () => null }, text: async () => "{}" };
    },
  });
  await assert.rejects(
    () => timedOut.interpret({ message: "status" }),
    (error) => error.code === "AI_SERVICE_TIMEOUT",
  );

  const malformed = createAIClient({
    secret: "server-secret",
    fetchImpl: async () => ({
      ok: true, status: 200,
      headers: { get: () => null },
      text: async () => "not-json",
    }),
  });
  await assert.rejects(
    () => malformed.interpret({ message: "status" }),
    (error) => error.code === "AI_RESPONSE_INVALID",
  );
});

test("requests client email when it cannot be safely resolved", async () => {
  const orchestrator = createAssistantOrchestrator({
    aiClientImpl: {
      interpret: async () => ({
        ...validResponse,
        type: "workflow",
        intent: "CREATE_INVOICE_DRAFT",
        workflow: {
          action: "CREATE_INVOICE_DRAFT",
          parameters: {
            clientName: "Semser Study",
            items: [{ description: "Website Development", quantity: 1, unitPrice: 15000 }],
          },
          requiresConfirmation: false,
        },
        workflowInterpretation: {
          isWorkflow: true, isComplete: true, action: "CREATE_INVOICE_DRAFT",
          missingRequirements: [], requiresConfirmation: false,
        },
      }),
    },
  });

  const result = await orchestrator.interpretAndExecute(
    { id: "biz-1", accountCategory: "BUSINESS" },
    { message: "Create invoice", conversationHistory: [] },
  );
  assert.equal(result.status, "clarification_required");
  assert.match(result.question, /email/i);
});

test("passes canonical extracted items to invoice execution", async () => {
  let capturedInput;
  const item = { description: "Website Development", quantity: 1, unitPrice: 15000 };
  const orchestrator = createAssistantOrchestrator({
    aiClientImpl: {
      interpret: async () => ({
        ...validResponse,
        type: "workflow",
        intent: "CREATE_INVOICE_DRAFT",
        workflow: {
          action: "CREATE_INVOICE_DRAFT",
          parameters: { clientName: "Semser Study", clientEmail: "semser@example.com", items: [item] },
          requiresConfirmation: false,
        },
        workflowInterpretation: {
          isWorkflow: true, isComplete: true, action: "CREATE_INVOICE_DRAFT",
          missingRequirements: [], requiresConfirmation: false,
        },
      }),
    },
    executeWorkflowImpl: async (_user, request) => {
      capturedInput = request.input;
      return { id: "draft-1" };
    },
  });

  const result = await orchestrator.interpretAndExecute(
    { id: "biz-1", accountCategory: "BUSINESS" },
    { message: "Create an invoice for Semser Study for Website Development 1 x 15000", conversationHistory: [] },
  );
  assert.equal(result.status, "executed");
  assert.deepEqual(capturedInput.items, [item]);
});

// ─── Cross-service HTTP contract ──────────────────────────────────────────────

test("backend client completes a cross-service HTTP contract with an injected AI handler", async (t) => {
  const aiRouter = createAssistantRoutes({
    serviceAuth: createServiceAuthMiddleware("cross-service-secret"),
    rateLimiter: (req, res, next) => next(),
    controller: async (req, res) => res.status(200).json({ success: true, data: validResponse }),
  });
  const server = http.createServer(createAIApp({ assistantRouter: aiRouter }));
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => server.close());

  const address = server.address();
  const client  = createAIClient({
    baseUrl: `http://127.0.0.1:${address.port}`,
    secret: "cross-service-secret",
  });
  const result = await client.interpret({ message: "Show invoice status" });
  assert.equal(result.workflow.action, "GET_INVOICE_STATUS");
});
