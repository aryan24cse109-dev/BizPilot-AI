
import { ApiResponse } from "../../utils/ApiResponse.js";
import { ApiError } from "../../utils/ApiError.js";
import {
  createInvoiceSchema,
  updateInvoiceSchema,
  invoiceListQuerySchema,
} from "./invoice.schema.js";
import {
  createInvoice,
  listInvoices,
  getInvoice,
  updateInvoice,
  sendInvoice,
  cancelInvoice,
} from "./invoice.service.js";
import { generateInvoicePdf } from "./invoice.pdf.service.js";

function validate(schema, data) {
  const result = schema.safeParse(data);

  if (!result.success) {
    throw new ApiError(
      400,
      "Validation failed.",
      result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    );
  }

  return result.data;
}

export async function createInvoiceController(req, res) {
  const input = validate(createInvoiceSchema, req.body);
  const invoice = await createInvoice(req.user, input);

  return res.status(201).json(
    new ApiResponse(201, "Invoice draft created successfully.", invoice),
  );
}

export async function listInvoicesController(req, res) {
  const filters = validate(invoiceListQuerySchema, req.query);
  const result = await listInvoices(req.user, filters);

  return res.status(200).json(
    new ApiResponse(200, "Invoices retrieved successfully.", result),
  );
}

export async function getInvoiceController(req, res) {
  const invoice = await getInvoice(req.user, req.params.id);

  return res.status(200).json(
    new ApiResponse(200, "Invoice retrieved successfully.", invoice),
  );
}

export async function updateInvoiceController(req, res) {
  const input = validate(updateInvoiceSchema, req.body);
  const invoice = await updateInvoice(req.user, req.params.id, input);

  return res.status(200).json(
    new ApiResponse(200, "Invoice updated successfully.", invoice),
  );
}

export async function sendInvoiceController(req, res) {
  const result = await sendInvoice(req.user, req.params.id);

  return res.status(200).json(
    new ApiResponse(200, result.message, result),
  );
}

export async function cancelInvoiceController(req, res) {
  const invoice = await cancelInvoice(req.user, req.params.id);

  return res.status(200).json(
    new ApiResponse(200, "Invoice cancelled successfully.", invoice),
  );
}

export async function downloadInvoicePdfController(req, res) {
  const invoice = await getInvoice(req.user, req.params.id);

  return generateInvoicePdf(res, invoice);
}
