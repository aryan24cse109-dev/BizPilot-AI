import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import {
  createOrderSchema,
  paymentListSchema,
  verifyPaymentSchema,
} from "./payment.schema.js";
import {
  createPaymentOrder,
  getPayment,
  listInvoicePayments,
  listPayments,
  processWebhook,
  verifyPayment,
} from "./payment.service.js";

function parse(schema, value) {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new ApiError(400, "Validation failed.", result.error.issues);
  }
  return result.data;
}

export async function createOrderController(req, res) {
  const result = await createPaymentOrder(
    req.user,
    req.params.invoiceId,
    parse(createOrderSchema, req.body),
  );
  return res.status(201).json(new ApiResponse(201, "Payment order created.", result));
}

export async function verifyPaymentController(req, res) {
  const result = await verifyPayment(req.user, parse(verifyPaymentSchema, req.body));
  return res.status(200).json(new ApiResponse(200, "Payment verification accepted.", result));
}

export async function listPaymentsController(req, res) {
  const result = await listPayments(req.user, parse(paymentListSchema, req.query));
  return res.status(200).json(new ApiResponse(200, "Payments retrieved successfully.", result));
}

export async function getPaymentController(req, res) {
  const result = await getPayment(req.user, req.params.id);
  return res.status(200).json(new ApiResponse(200, "Payment retrieved successfully.", result));
}

export async function listInvoicePaymentsController(req, res) {
  const result = await listInvoicePayments(
    req.user,
    req.params.invoiceId,
    parse(paymentListSchema, req.query),
  );
  return res.status(200).json(new ApiResponse(200, "Payments retrieved successfully.", result));
}

export async function webhookController(req, res) {
  const rawBody = Buffer.isBuffer(req.body) ? req.body : null;
  const signature = req.get("X-Razorpay-Signature");
  if (!rawBody) throw new ApiError(400, "Raw webhook body is required.");
  const { parseVerifiedWebhook } = await import("../../integrations/razorpay/razorpay.webhook.js");
  const payload = parseVerifiedWebhook(rawBody, signature);
  if (!payload) throw new ApiError(400, "Invalid webhook signature or payload.");
  const eventId = req.get("x-razorpay-event-id");
  if (!eventId) throw new ApiError(400, "Webhook event ID is required.");
  const result = await processWebhook({
    eventId,
    eventType: payload.event,
    payload,
  });
  return res.status(200).json(new ApiResponse(200, "Webhook processed.", result));
}