import { z } from "zod";

const numericValue = z.union([
  z.number().finite(),
  z.string().trim().min(1).regex(/^\d+(?:\.\d+)?$/),
]);

const invoiceItemSchema = z.object({
  description: z.string().trim().min(1).max(500),
  quantity: numericValue.refine((value) => Number(value) > 0),
  unitPrice: numericValue.refine((value) => Number(value) >= 0),
  taxRate: numericValue
    .refine((value) => Number(value) >= 0 && Number(value) <= 100)
    .optional(),
}).strict();

const sameItems = (left, right) =>
  JSON.stringify(left) === JSON.stringify(right);

const normalizeInvoiceDraftParameters = (parameters) => {
  if (parameters.items === undefined && parameters.lineItems === undefined) {
    return { success: true, parameters };
  }

  if (
    parameters.items !== undefined &&
    parameters.lineItems !== undefined &&
    !sameItems(parameters.items, parameters.lineItems)
  ) {
    return {
      success: false,
      issues: [{ message: "Invoice items and lineItems conflict." }],
    };
  }

  const items = parameters.items ?? parameters.lineItems;
  const itemResult = z.array(invoiceItemSchema).min(1).max(100).safeParse(items);
  if (!itemResult.success) {
    return {
      success: false,
      issues: itemResult.error.issues,
    };
  }

  const normalized = { ...parameters, items: itemResult.data };
  delete normalized.lineItems;
  return { success: true, parameters: normalized };
};

// Canonical workflow action names accepted by the backend.
// Every action listed here MUST have a corresponding handler in assistant.service.js.
const actions = [
  // Single-invoice retrieval
  "GET_INVOICE",
  "GET_INVOICE_STATUS",
  "GET_OUTSTANDING_BALANCE",

  // Invoice lists
  "LIST_INVOICES",
  "LIST_PENDING_INVOICES",
  "LIST_OVERDUE_INVOICES",
  "LIST_DRAFT_INVOICES",
  "LIST_PAID_INVOICES",
  "LIST_PARTIALLY_PAID_INVOICES",
  "GET_CLIENT_INVOICES",

  // Payment retrieval and analytics
  "GET_PAYMENT_HISTORY",
  "GET_PAYMENT_SUMMARY",
  "GET_CLIENT_PAYMENT_SUMMARY",

  // Dashboard / business overview
  "GET_DASHBOARD_SUMMARY",

  // Invoice creation and messaging
  "CREATE_INVOICE_DRAFT",
  "PREPARE_PAYMENT_FOLLOWUP",
  "PREPARE_CLIENT_MESSAGE",

  // Consequential mutating actions
  "SEND_INVOICE",
  "CANCEL_INVOICE",
];

const workflowSchema = z.object({
  action: z.enum(actions),
  parameters: z.record(z.string(), z.unknown()).default({}),
  requiresConfirmation: z.boolean(),
}).strict();

const interpretationSchema = z.object({
  isWorkflow: z.boolean(),
  isComplete: z.boolean(),
  action: z.enum(actions).nullable().optional(),
  missingRequirements: z.array(z.unknown()).default([]),
  requiresConfirmation: z.boolean(),
}).strict();

export const assistantAIResponseSchema = z.object({
  type: z.enum(["intent", "workflow", "clarification", "conversation"]),
  intent: z.enum(actions).nullable(),
  confidence: z.number().min(0).max(1),
  entities: z.record(z.string(), z.unknown()).default({}),
  workflow: workflowSchema.nullable(),
  clarificationQuestion: z.string().max(1000).nullable(),
  response: z.string().min(1).max(4000),
  analysis: z.record(z.string(), z.unknown()).optional(),
  workflowInterpretation: interpretationSchema.optional(),
  provider: z.string().max(50).optional(),
  model: z.string().max(200).nullable().optional(),
  fallbackFrom: z.string().max(50).nullable().optional(),
}).strict();

// Allowed parameters per action. Keys must match parameterSchemas below.
// Actions that accept no parameters have an empty array.
const allowedParameters = {
  GET_INVOICE:                 ["invoiceId", "invoiceNumber", "clientName", "clientEmail", "status"],
  GET_INVOICE_STATUS:          ["invoiceId", "invoiceNumber"],
  GET_OUTSTANDING_BALANCE:     ["invoiceId", "invoiceNumber"],

  LIST_INVOICES:               ["status", "clientName", "clientEmail"],
  LIST_PENDING_INVOICES:       [],
  LIST_OVERDUE_INVOICES:       [],
  LIST_DRAFT_INVOICES:         [],
  LIST_PAID_INVOICES:          [],
  LIST_PARTIALLY_PAID_INVOICES: [],
  GET_CLIENT_INVOICES:         ["clientName", "clientEmail"],

  GET_PAYMENT_HISTORY:         ["status"],
  GET_PAYMENT_SUMMARY:         ["period", "startDate", "endDate"],
  GET_CLIENT_PAYMENT_SUMMARY:  ["clientName", "clientEmail"],

  GET_DASHBOARD_SUMMARY:       [],

  CREATE_INVOICE_DRAFT: [
    "clientName", "clientEmail", "currency", "dueDate",
    "discountAmount", "notes", "terms", "items", "lineItems", "amount",
  ],
  PREPARE_PAYMENT_FOLLOWUP: ["invoiceId", "invoiceNumber"],
  PREPARE_CLIENT_MESSAGE:   ["invoiceId", "invoiceNumber", "clientName", "clientEmail", "message", "purpose"],
  SEND_INVOICE:             ["invoiceId", "invoiceNumber"],
  CANCEL_INVOICE:           ["invoiceId", "invoiceNumber"],
};

const parameterSchemas = {
  invoiceId:      z.string().trim().min(1).max(100),
  invoiceNumber:  z.string().trim().min(1).max(100),
  clientName:     z.string().trim().min(1).max(150),
  clientEmail:    z.string().trim().email().max(255),
  status:         z.string().trim().min(1).max(50),
  currency:       z.string().trim().length(3),
  dueDate:        z.string().trim().max(50),
  message:        z.string().trim().min(1).max(5000),
  purpose:        z.string().trim().min(1).max(5000),
  notes:          z.string().trim().max(5000),
  amount:         z.union([z.string().trim().min(1), z.number().finite().nonnegative()]),
  items:          z.array(z.record(z.string(), z.unknown())).min(1).max(100),
  lineItems:      z.array(z.record(z.string(), z.unknown())).min(1).max(100),
  discountAmount: z.union([z.string().trim().min(1), z.number().finite().nonnegative()]),
  period:         z.string().trim().min(1).max(50),
  startDate:      z.string().trim().max(50),
  endDate:        z.string().trim().max(50),
};

export const validateAndNormalizeAIResponse = (input) => {
  const parsed = assistantAIResponseSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      issues: parsed.error.issues,
    };
  }

  const response = parsed.data;

  if (response.type !== "workflow" && response.workflow !== null) {
    return { success: false, issues: [{ message: "Only workflow responses may contain workflow data." }] };
  }

  if (response.workflow && response.intent !== response.workflow.action) {
    return { success: false, issues: [{ message: "Workflow action does not match intent." }] };
  }

  if (response.workflow) {
    if (response.workflow.action === "CREATE_INVOICE_DRAFT") {
      const normalized = normalizeInvoiceDraftParameters(response.workflow.parameters);
      if (!normalized.success) {
        return { success: false, issues: normalized.issues };
      }
      response.workflow.parameters = normalized.parameters;
    }

    const allowed = allowedParameters[response.workflow.action];
    for (const [key, value] of Object.entries(response.workflow.parameters)) {
      if (value === null || value === undefined || value === "") {
        delete response.workflow.parameters[key];
        continue;
      }
      if (!allowed.includes(key) || !parameterSchemas[key]) {
        return { success: false, issues: [{ message: `Unsupported workflow parameter: ${key}.` }] };
      }

      const valueResult = parameterSchemas[key].safeParse(value);
      if (!valueResult.success) {
        return { success: false, issues: valueResult.error.issues };
      }
    }

    response.workflow.requiresConfirmation =
      response.workflow.action === "SEND_INVOICE" ||
      response.workflow.action === "CANCEL_INVOICE";
  }

  return { success: true, data: response };
};
