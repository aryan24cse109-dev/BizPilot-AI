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

const consequential = new Set(["SEND_INVOICE", "CANCEL_INVOICE"]);

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