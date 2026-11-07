import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import {
  createOrderController,
  getPaymentController,
  listInvoicePaymentsController,
  listPaymentsController,
  verifyPaymentController,
  webhookController,
} from "./payment.controller.js";
import {
  createDummySessionController,
  getDummySessionController,
  revokeDummySessionController,
  simulateDummyPaymentController,
} from "./dummy-payment.controller.js";

const router = Router();
router.use(authenticate);
router.post("/invoices/:invoiceId/order", asyncHandler(createOrderController));
router.post("/invoices/:invoiceId/dummy-session", asyncHandler(createDummySessionController));
router.delete("/dummy-sessions/:sessionId", asyncHandler(revokeDummySessionController));
router.post("/verify", asyncHandler(verifyPaymentController));
router.get("/", asyncHandler(listPaymentsController));
router.get("/:id", asyncHandler(getPaymentController));
router.get("/invoices/:invoiceId", asyncHandler(listInvoicePaymentsController));

export const paymentWebhookRouter = Router();
paymentWebhookRouter.post("/razorpay", asyncHandler(webhookController));

export const dummyPaymentRouter = Router();
dummyPaymentRouter.get("/:token", asyncHandler(getDummySessionController));
dummyPaymentRouter.post("/:token/simulate", asyncHandler(simulateDummyPaymentController));

export default router;