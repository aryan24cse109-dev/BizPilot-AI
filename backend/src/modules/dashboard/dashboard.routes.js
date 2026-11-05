import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import {
  dashboardController,
  dashboardInvoicesController,
  dashboardTransactionsController,
} from "./dashboard.controller.js";

const router = Router();
router.use(authenticate);
router.get("/", asyncHandler(dashboardController));
router.get("/invoices", asyncHandler(dashboardInvoicesController));
router.get("/transactions", asyncHandler(dashboardTransactionsController));
export default router;