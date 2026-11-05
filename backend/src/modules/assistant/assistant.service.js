import { ApiError } from "../../utils/ApiError.js";
import {
  createInvoice,
  getInvoice,
  sendInvoice,
  cancelInvoice,
} from "../invoices/invoice.service.js";
import { createInvoiceSchema } from "../invoices/invoice.schema.js";
import { listPayments } from "../payments/payment.service.js";
import { getDashboard } from "../dashboard/dashboard.service.js";
import { aiClient } from "../../integrations/ai/ai.client.js";
import { validateAndNormalizeAIResponse } from "../../integrations/ai/ai.schema.js";

const consequential = new Set(["SEND_INVOICE", "CANCEL_INVOICE"]);

const actionRequiresInvoiceId = new Set([
  "GET_INVOICE",
  "GET_INVOICE_STATUS",
  "GET_OUTSTANDING_BALANCE",
  "PREPARE_PAYMENT_FOLLOWUP",
  "PREPARE_CLIENT_MESSAGE",
  "SEND_INVOICE",
  "CANCEL_INVOICE",
]);

const capabilitiesFor = (user) =>
  user.accountCategory === "BUSINESS"
    ? ["read_invoices", "write_invoice_drafts", "prepare_messages", "send_or_cancel_invoices"]
    : ["read_invoices", "read_payments"];

const buildAIContext = (user) => ({
  locale: "en-IN",
  accountCategory: user.accountCategory,
  capabilities: capabilitiesFor(user),
});

const toExecutionRequest = (workflow, confirmed) => ({
  operation: workflow.action,
  input: workflow.parameters,
  confirmed,
});

const validateExecutableWorkflow = (response) => {
  if (!response.workflow) {
    return { status: "conversation", response: response.response };
  }

  const { action, parameters } = response.workflow;
  if (actionRequiresInvoiceId.has(action) && !parameters.invoiceId) {
    return {
      status: "clarification_required",
      operation: action,
      question: "Please provide the invoice ID.",
    };
  }

  if (action === "CREATE_INVOICE_DRAFT" && !Array.isArray(parameters.items)) {
    return {
      status: "clarification_required",
      operation: action,
      question: "Please provide at least one invoice item with quantity and price.",
    };
  }

  return null;
};

export const createAssistantOrchestrator = ({
  aiClientImpl = aiClient,
  executeWorkflowImpl = executeWorkflow,
} = {}) => {
  const interpretAndExecute = async (user, request) => {
    const aiResponse = await aiClientImpl.interpret({
      message: request.message,
      conversationHistory: request.conversationHistory,
      context: buildAIContext(user),
    });

    const validation = validateAndNormalizeAIResponse(aiResponse);
    if (!validation.success) {
      throw new ApiError(502, "AI service returned an invalid workflow.", validation.issues);
    }

    const response = validation.data;
    if (response.type === "clarification" || response.workflowInterpretation?.isComplete === false) {
      return {
        status: "clarification_required",
        question: response.clarificationQuestion || response.response,
        operation: response.workflowInterpretation?.action ?? response.intent,
        aiResponse: response,
      };
    }

    const executableValidation = validateExecutableWorkflow(response);
    if (executableValidation) {
      return { ...executableValidation, aiResponse: response };
    }

    const workflow = response.workflow;
    if (!workflow) {
      return { status: "conversation", response: response.response, aiResponse: response };
    }

    if (workflow.requiresConfirmation && !request.confirmed) {
      return {
        status: "confirmation_required",
        confirmationRequired: true,
        operation: workflow.action,
        input: workflow.parameters,
        message: "Explicit confirmation is required before this action is executed.",
        aiResponse: response,
      };
    }

    const result = await executeWorkflowImpl(
      user,
      toExecutionRequest(workflow, request.confirmed),
    );

    return {
      status: "executed",
      operation: workflow.action,
      result,
      aiResponse: response,
    };
  };

  return Object.freeze({ interpretAndExecute });
};

export const interpretAssistantMessage = createAssistantOrchestrator().interpretAndExecute;

function requireString(input, key) {
  if (typeof input[key] !== "string" || !input[key]) {
    throw new ApiError(400, `${key} is required.`);
  }
  return input[key];
}

function validateInvoiceInput(input) {
  const result = createInvoiceSchema.safeParse(input);
  if (!result.success) throw new ApiError(400, "Invalid invoice draft.", result.error.issues);
  return result.data;
}

export async function executeWorkflow(user, request) {
  if (consequential.has(request.operation) && !request.confirmed) {
    return {
      confirmationRequired: true,
      operation: request.operation,
      message: "Explicit confirmation is required before this action is executed.",
    };
  }

  switch (request.operation) {
    case "GET_INVOICE":
      return getInvoice(user, requireString(request.input, "invoiceId"));
    case "GET_INVOICE_STATUS": {
      const invoice = await getInvoice(user, requireString(request.input, "invoiceId"));
      return { invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber, status: invoice.status };
    }
    case "GET_PAYMENT_HISTORY":
      return listPayments(user, { page: 1, limit: 100, status: request.input.status });
    case "GET_OUTSTANDING_BALANCE": {
      const invoice = await getInvoice(user, requireString(request.input, "invoiceId"));
      return {
        invoiceId: invoice.id,
        currency: invoice.currency,
        totalAmount: invoice.totalAmount,
        amountPaid: invoice.amountPaid,
        balanceDue: invoice.balanceDue,
      };
    }
    case "GET_DASHBOARD_SUMMARY":
      return getDashboard(user, { page: 1, limit: 5 });
    case "CREATE_INVOICE_DRAFT":
      return createInvoice(user, validateInvoiceInput(request.input));
    case "PREPARE_PAYMENT_FOLLOWUP": {
      const invoice = await getInvoice(user, requireString(request.input, "invoiceId"));
      return {
        type: "PAYMENT_FOLLOWUP_DRAFT",
        invoiceId: invoice.id,
        subject: `Payment follow-up for ${invoice.invoiceNumber}`,
        message: `Hello ${invoice.clientName}, this is a reminder that ${invoice.currency} ${invoice.balanceDue.toString()} remains outstanding for invoice ${invoice.invoiceNumber}.`,
      };
    }
    case "PREPARE_CLIENT_MESSAGE": {
      const invoice = await getInvoice(user, requireString(request.input, "invoiceId"));
      const message = typeof request.input.message === "string" ? request.input.message.trim() : "";
      if (!message || message.length > 5000) throw new ApiError(400, "A message of up to 5000 characters is required.");
      return { type: "CLIENT_MESSAGE_DRAFT", invoiceId: invoice.id, recipient: invoice.clientEmail, message };
    }
    case "SEND_INVOICE":
      return sendInvoice(user, requireString(request.input, "invoiceId"));
    case "CANCEL_INVOICE":
      return cancelInvoice(user, requireString(request.input, "invoiceId"));
    default:
      throw new ApiError(400, "Unsupported workflow operation.");
  }
}