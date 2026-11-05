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

const router = Router();
router.use(authenticate);
router.post("/invoices/:invoiceId/order", asyncHandler(createOrderController));
router.post("/verify", asyncHandler(verifyPaymentController));
router.get("/", asyncHandler(listPaymentsController));
router.get("/:id", asyncHandler(getPaymentController));
router.get("/invoices/:invoiceId", asyncHandler(listInvoicePaymentsController));

export const paymentWebhookRouter = Router();
paymentWebhookRouter.post("/razorpay", asyncHandler(webhookController));

export default router;