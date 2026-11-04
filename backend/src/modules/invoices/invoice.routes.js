
import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

import {
  createInvoiceController,
  listInvoicesController,
  getInvoiceController,
  updateInvoiceController,
  sendInvoiceController,
  cancelInvoiceController,
  downloadInvoicePdfController,
} from "./invoice.controller.js";

const router = Router();

// All invoice endpoints require an authenticated session.
router.use(authenticate);

router.post("/", asyncHandler(createInvoiceController));

router.get("/", asyncHandler(listInvoicesController));

router.get("/:id/pdf", asyncHandler(downloadInvoicePdfController));

router.get("/:id", asyncHandler(getInvoiceController));

router.patch("/:id", asyncHandler(updateInvoiceController));

router.post("/:id/send", asyncHandler(sendInvoiceController));

router.post("/:id/cancel", asyncHandler(cancelInvoiceController));

export default router;
