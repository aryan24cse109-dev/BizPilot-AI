import test from "node:test";
import assert from "node:assert/strict";

import { createAIClient } from "../src/integrations/ai/ai.client.js";
import { validateAndNormalizeAIResponse } from "../src/integrations/ai/ai.schema.js";
import { createAssistantOrchestrator } from "../src/modules/assistant/assistant.service.js";
import http from "node:http";
import { createApp as createAIApp } from "../../ai-service/src/app.js";
import { createAssistantRoutes } from "../../ai-service/src/modules/assistant/assistant.routes.js";
import { createServiceAuthMiddleware } from "../../ai-service/src/middleware/serviceAuth.middleware.js";

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

const response = (status, payload) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: { get: () => null },
  text: async () => JSON.stringify(payload),
});

test("AI client sends only the service secret and bounded assistant payload", async () => {
  let captured;
  const client = createAIClient({
    baseUrl: "http://ai.test",
    secret: "server-secret",
    timeoutMs: 1000,
    fetchImpl: async (url, options) => {
      captured = { url, options };
      return response(200, { success: true, data: validResponse });
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
      return response(200, { success: true, data: validResponse });
    },
  });

  await assert.rejects(() => timedOut.interpret({ message: "status" }), (error) => {
    return error.code === "AI_SERVICE_TIMEOUT";
  });

  const malformed = createAIClient({
    secret: "server-secret",
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      headers: { get: () => null },
      text: async () => "not-json",
    }),
  });

  await assert.rejects(() => malformed.interpret({ message: "status" }), (error) => {
    return error.code === "AI_RESPONSE_INVALID";
  });
});

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

test("orchestrator returns confirmation without executing a sensitive action", async () => {
  let executed = false;
  const orchestrator = createAssistantOrchestrator({
    aiClientImpl: {
      interpret: async () => ({
        ...validResponse,
        intent: "SEND_INVOICE",
        workflow: {
          action: "SEND_INVOICE",
          parameters: { invoiceId: "invoice-1" },
          requiresConfirmation: true,
        },
        workflowInterpretation: {
          ...validResponse.workflowInterpretation,
          action: "SEND_INVOICE",
          requiresConfirmation: true,
        },
      }),
    },
    executeWorkflowImpl: async () => {
      executed = true;
      return {};
    },
  });

  const result = await orchestrator.interpretAndExecute(
    { id: "business-1", accountCategory: "BUSINESS" },
    { message: "Send invoice", conversationHistory: [], confirmed: false },
  );

  assert.equal(result.status, "confirmation_required");
  assert.equal(executed, false);
});

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
  const client = createAIClient({
    baseUrl: `http://127.0.0.1:${address.port}`,
    secret: "cross-service-secret",
  });
  const result = await client.interpret({ message: "Show invoice status" });

  assert.equal(result.workflow.action, "GET_INVOICE_STATUS");
});
