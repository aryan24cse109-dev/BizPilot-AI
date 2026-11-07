import { ApiResponse } from "../../utils/ApiResponse.js";
import { ApiError } from "../../utils/ApiError.js";
import {
  createDummyPaymentSession,
  getDummyPaymentSession,
  revokeDummyPaymentSession,
  simulateDummyPayment,
} from "./dummy-payment.service.js";

export async function createDummySessionController(req, res) {
  const result = await createDummyPaymentSession(req.user, req.params.invoiceId);
  return res.status(201).json(new ApiResponse(201, "Demo payment session created.", result));
}

export async function getDummySessionController(req, res) {
  const result = await getDummyPaymentSession(req.params.token, req.user ?? null);
  return res.status(200).json(new ApiResponse(200, "Demo payment session retrieved.", result));
}

export async function simulateDummyPaymentController(req, res) {
  if (!["SUCCESS", "FAILURE"].includes(req.body?.action)) {
    throw new ApiError(400, "Action must be SUCCESS or FAILURE.");
  }
  if (typeof req.body?.requestKey !== "string" || req.body.requestKey.trim().length < 8) {
    throw new ApiError(400, "A valid idempotency key is required.");
  }
  const result = await simulateDummyPayment({
    token: req.params.token,
    action: req.body.action,
    requestKey: req.body.requestKey.trim(),
    user: req.user ?? null,
  });
  return res.status(200).json(new ApiResponse(200, "Demo payment simulation processed.", result));
}

export async function revokeDummySessionController(req, res) {
  const result = await revokeDummyPaymentSession(req.user, req.params.sessionId);
  return res.status(200).json(new ApiResponse(200, "Demo payment session revoked.", result));
}
