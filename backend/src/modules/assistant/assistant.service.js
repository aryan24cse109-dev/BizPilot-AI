import { ApiError } from "../../utils/ApiError.js";
import {
  createInvoice,
  listInvoices,
  getInvoice,
  getInvoiceByNumber,
  sendInvoice,
  cancelInvoice,
} from "../invoices/invoice.service.js";
import { createInvoiceSchema } from "../invoices/invoice.schema.js";
import {
  listPayments,
  getPaymentSummary,
  getClientPaymentSummary,
} from "../payments/payment.service.js";
import { getDashboard } from "../dashboard/dashboard.service.js";
import { prisma } from "../../config/database.js";
import { aiClient } from "../../integrations/ai/ai.client.js";
import { validateAndNormalizeAIResponse } from "../../integrations/ai/ai.schema.js";

// Actions that mutate state and need explicit user confirmation.
const consequential = new Set(["SEND_INVOICE", "CANCEL_INVOICE"]);

// Actions restricted to business accounts.
const businessOnlyActions = new Set([
  "CREATE_INVOICE_DRAFT",
  "SEND_INVOICE",
  "CANCEL_INVOICE",
  "LIST_INVOICES",
  "LIST_PENDING_INVOICES",
  "LIST_OVERDUE_INVOICES",
  "LIST_DRAFT_INVOICES",
  "LIST_PAID_INVOICES",
  "LIST_PARTIALLY_PAID_INVOICES",
  "GET_CLIENT_INVOICES",
  "GET_PAYMENT_SUMMARY",
  "GET_CLIENT_PAYMENT_SUMMARY",
  "GET_PAYMENT_HISTORY",
  "GET_DASHBOARD_SUMMARY",
  "GET_OUTSTANDING_BALANCE",
  "PREPARE_PAYMENT_FOLLOWUP",
  "PREPARE_CLIENT_MESSAGE",
]);

// Actions that need an invoice identifier to be resolvable.
const actionRequiresInvoiceId = new Set([
  "GET_INVOICE_STATUS",
  "GET_OUTSTANDING_BALANCE",
  "PREPARE_PAYMENT_FOLLOWUP",
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

  if (actionRequiresInvoiceId.has(action) && !parameters.invoiceId && !parameters.invoiceNumber) {
    return {
      status: "clarification_required",
      operation: action,
      question: "Please provide the invoice ID or invoice number.",
    };

    const resolveInvoice = async (user, input) => {
      if (input.invoiceId) return getInvoice(user, input.invoiceId);
      if (input.invoiceNumber) return getInvoiceByNumber(user, input.invoiceNumber);
      throw new ApiError(400, "invoiceId or invoiceNumber is required.");
    };
  }

  if (action === "CREATE_INVOICE_DRAFT" && !Array.isArray(parameters.items)) {
    return {
      status: "clarification_required",
      operation: action,
      question: "Please provide at least one invoice item with a description, quantity, and unit price.",
    };
  }

  if (action === "CREATE_INVOICE_DRAFT" && !parameters.clientEmail) {
    return {
      status: "clarification_required",
      operation: action,
      question: "Please provide the client's email address.",
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

function ensureBusinessAssistantAccess(user, operation) {
  if (
    businessOnlyActions.has(operation) &&
    user.accountCategory !== "BUSINESS" &&
    !user.businessProfile
  ) {
    throw new ApiError(403, "This assistant action is available to business accounts only.");
  }
}

export async function executeWorkflow(user, request) {
  ensureBusinessAssistantAccess(user, request.operation);

  if (consequential.has(request.operation) && !request.confirmed) {
    return {
      confirmationRequired: true,
      operation: request.operation,
      message: "Explicit confirmation is required before this action is executed.",
    };
  }

  const inp = request.input || {};

  switch (request.operation) {
    // ── Invoice retrieval ──────────────────────────────────────────────
    case "GET_INVOICE":
      // Can be used to list by filter or get a specific invoice.
      if (inp.invoiceId) return getInvoice(user, inp.invoiceId);
      if (inp.invoiceNumber) return getInvoiceByNumber(user, inp.invoiceNumber);
      return listInvoices(user, inp);

    case "GET_INVOICE_STATUS": {
      const invoice = await resolveInvoice(user, inp);
      return {
        invoiceId:     invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        status:        invoice.status,
        balanceDue:    invoice.balanceDue?.toString(),
        totalAmount:   invoice.totalAmount?.toString(),
        paidAmount:    invoice.paidAmount?.toString(),
      };
    }

    // ── Invoice lists ──────────────────────────────────────────────────
    case "LIST_INVOICES":
      return listInvoices(user, inp);

    case "LIST_PENDING_INVOICES":
      return listInvoices(user, {
        ...inp,
        status: { in: ["SENT", "VIEWED", "PARTIALLY_PAID", "OVERDUE"] },
      });

    case "LIST_OVERDUE_INVOICES": {
      // Overdue = SENT or PARTIALLY_PAID with dueDate in the past and balance still due
      const now = new Date();
      const overdueWhere = {
        businessUserId: user.id,
        status: { in: ["SENT", "PARTIALLY_PAID"] },
        dueDate: { lt: now },
        balanceDue: { gt: 0 },
      };
      const [invoices, total] = await prisma.$transaction([
        prisma.invoice.findMany({
          where: overdueWhere,
          include: { items: true },
          orderBy: { dueDate: "asc" },
        }),
        prisma.invoice.count({ where: overdueWhere }),
      ]);
      return { invoices, pagination: { total } };
    }

    case "LIST_DRAFT_INVOICES":
      return listInvoices(user, { ...inp, status: "DRAFT" });

    case "LIST_PAID_INVOICES":
      return listInvoices(user, { ...inp, status: "PAID" });

    case "LIST_PARTIALLY_PAID_INVOICES":
      return listInvoices(user, { ...inp, status: "PARTIALLY_PAID" });

    case "GET_CLIENT_INVOICES": {
      const filters = {};
      if (inp.clientEmail) filters.clientEmail = inp.clientEmail;
      if (inp.clientName)  filters.clientName  = inp.clientName;
      return listInvoices(user, filters);
    }

    // ── Payment retrieval ──────────────────────────────────────────────
    case "GET_PAYMENT_HISTORY":
      return listPayments(user, { page: 1, limit: 50, status: inp.status });

    case "GET_OUTSTANDING_BALANCE": {
      const invoice = await resolveInvoice(user, inp);
      return {
        invoiceId:   invoice.id,
        currency:    invoice.currency,
        totalAmount: invoice.totalAmount?.toString(),
        paidAmount:  invoice.paidAmount?.toString(),
        balanceDue:  invoice.balanceDue?.toString(),
      };
    }

    case "GET_PAYMENT_SUMMARY":
      return getPaymentSummary(user, inp);

    case "GET_CLIENT_PAYMENT_SUMMARY":
      return getClientPaymentSummary(user, inp);

    // ── Dashboard ──────────────────────────────────────────────────────
    case "GET_DASHBOARD_SUMMARY":
      return getDashboard(user, { page: 1, limit: 5 });

    // ── Invoice creation ───────────────────────────────────────────────
    case "CREATE_INVOICE_DRAFT":
      return createInvoice(user, validateInvoiceInput(inp));

    // ── Messaging ──────────────────────────────────────────────────────
    case "PREPARE_PAYMENT_FOLLOWUP": {
      const invoice = await resolveInvoice(user, inp);
      return {
        type:      "PAYMENT_FOLLOWUP_DRAFT",
        invoiceId: invoice.id,
        subject:   `Payment follow-up for ${invoice.invoiceNumber}`,
        message:   `Hello ${invoice.clientName}, this is a reminder that ${invoice.currency} ${invoice.balanceDue?.toString()} remains outstanding for invoice ${invoice.invoiceNumber}.`,
      };
    }

    case "PREPARE_CLIENT_MESSAGE": {
      // If invoice ID provided, resolve invoice and prepare message
      let invoiceRef = null;
      if (inp.invoiceId || inp.invoiceNumber) {
        invoiceRef = await resolveInvoice(user, inp);
      }
      const message = typeof inp.message === "string" ? inp.message.trim() : "";
      const purpose = typeof inp.purpose === "string" ? inp.purpose.trim() : "";
      return {
        type:         "CLIENT_MESSAGE_DRAFT",
        invoiceId:    invoiceRef?.id ?? null,
        invoiceNumber: invoiceRef?.invoiceNumber ?? null,
        recipient:    invoiceRef?.clientEmail ?? inp.clientEmail ?? null,
        clientName:   invoiceRef?.clientName  ?? inp.clientName  ?? null,
        message:      message || purpose || "Please see the details attached.",
      };
    }

    // ── Consequential actions ──────────────────────────────────────────
    case "SEND_INVOICE":
      return sendInvoice(user, (await resolveInvoice(user, inp)).id);

    case "CANCEL_INVOICE":
      return cancelInvoice(user, (await resolveInvoice(user, inp)).id);

    default:
      throw new ApiError(400, `Unsupported workflow operation: ${request.operation}.`);
  }
}
