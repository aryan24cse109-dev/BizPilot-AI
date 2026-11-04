import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { getDashboard, listDashboardInvoices, listDashboardTransactions } from "./dashboard.service.js";
import { dashboardQuerySchema } from "./dashboard.schema.js";

function parseQuery(query) {
  const result = dashboardQuerySchema.safeParse(query);
  if (!result.success) throw new ApiError(400, "Validation failed.", result.error.issues);
  return result.data;
}

export async function dashboardController(req, res) {
  return res.status(200).json(new ApiResponse(200, "Dashboard retrieved successfully.", await getDashboard(req.user, parseQuery(req.query))));
}

export async function dashboardInvoicesController(req, res) {
  const filters = parseQuery(req.query);
  return res.status(200).json(new ApiResponse(200, "Dashboard invoices retrieved successfully.", await listDashboardInvoices(req.user, filters)));
}

export async function dashboardTransactionsController(req, res) {
  const filters = parseQuery(req.query);
  return res.status(200).json(new ApiResponse(200, "Dashboard transactions retrieved successfully.", await listDashboardTransactions(req.user, filters)));
}