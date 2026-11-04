
import { randomBytes } from "node:crypto";
import { prisma } from "../../config/database.js";
import { ApiError } from "../../utils/ApiError.js";
import { sendEmail } from "../../integrations/email/email.service.js";
import {
  calculateInvoiceTotals,
} from "./invoice.schema.js";

const ACTIVE_CONNECTION_STATUS = "ACTIVE";

function ensureBusiness(user) {
  if (user.accountCategory !== "BUSINESS") {
    throw new ApiError(403, "Only business accounts can perform this action.");
  }
}

function ensureClient(user) {
  if (user.accountCategory !== "CLIENT") {
    throw new ApiError(403, "Only client accounts can perform this action.");
  }
}

function generateInvoiceNumber() {
  const date = new Date();
  const datePart = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("");

  const suffix = randomBytes(3).toString("hex").toUpperCase();

  return `INV-${datePart}-${suffix}`;
}

const invoiceInclude = {
  items: true,
  businessUser: {
    select: {
      id: true,
      email: true,
      fullName: true,
      businessProfile: true,
    },
  },
  clientUser: {
    select: {
      id: true,
      email: true,
      fullName: true,
      clientProfile: true,
    },
  },
};

function canAccessInvoice(invoice, user) {
  if (invoice.businessUserId === user.id) {
    return true;
  }

  if (
    invoice.clientUserId &&
    invoice.clientUserId === user.id
  ) {
    return true;
  }

  return false;
}

async function findAccessibleInvoice(invoiceId, user) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: invoiceInclude,
  });

  if (!invoice || !canAccessInvoice(invoice, user)) {
    throw new ApiError(404, "Invoice not found.");
  }

  return invoice;
}

async function resolveClientUser({
  businessUserId,
  clientEmail,
  clientUserId,
}) {
  if (clientUserId) {
    const client = await prisma.user.findUnique({
      where: { id: clientUserId },
      select: {
        id: true,
        email: true,
        accountCategory: true,
        status: true,
      },
    });

    if (
      !client ||
      client.accountCategory !== "CLIENT" ||
      client.status !== "ACTIVE" ||
      client.email.toLowerCase() !== clientEmail.toLowerCase()
    ) {
      throw new ApiError(400, "The selected client account is invalid.");
    }

    const connection = await prisma.connection.findFirst({
      where: {
        businessUserId,
        clientUserId: client.id,
        status: ACTIVE_CONNECTION_STATUS,
      },
    });

    if (!connection) {
      throw new ApiError(403, "This client is not connected to your business.");
    }

    return client.id;
  }

  const matchingClient = await prisma.user.findUnique({
    where: { email: clientEmail.toLowerCase() },
    select: {
      id: true,
      accountCategory: true,
      status: true,
    },
  });

  if (!matchingClient) {
    // Unregistered client: keep clientUserId null.
    return null;
  }

  if (
    matchingClient.accountCategory !== "CLIENT" ||
    matchingClient.status !== "ACTIVE"
  ) {
    throw new ApiError(400, "The email belongs to an account that cannot receive this invoice.");
  }

  const connection = await prisma.connection.findFirst({
    where: {
      businessUserId,
      clientUserId: matchingClient.id,
      status: ACTIVE_CONNECTION_STATUS,
    },
  });

  if (!connection) {
    throw new ApiError(403, "This client must accept your business connection first.");
  }

  return matchingClient.id;
}

function invoiceCreateData(input, totals, clientUserId, invoiceNumber) {
  return {
    invoiceNumber,
    clientName: input.clientName,
    clientEmail: input.clientEmail.toLowerCase(),
    clientUserId,
    currency: input.currency.toUpperCase(),
    dueDate: input.dueDate ? new Date(input.dueDate) : null,
    notes: input.notes ?? null,
    terms: input.terms ?? null,
    subtotal: totals.subtotal,
    discountAmount: totals.discountAmount,
    taxAmount: totals.taxAmount,
    totalAmount: totals.totalAmount,
    amountPaid: "0.00",
    balanceDue: totals.balanceDue,
    status: "DRAFT",
    items: {
      create: totals.items,
    },
  };
}

export async function createInvoice(user, input) {
  ensureBusiness(user);

  const business = await prisma.businessProfile.findUnique({
    where: { userId: user.id },
  });

  if (!business) {
    throw new ApiError(400, "Complete your business profile before creating invoices.");
  }

  const clientUserId = await resolveClientUser({
    businessUserId: user.id,
    clientEmail: input.clientEmail,
    clientUserId: input.clientUserId,
  });

  const totals = calculateInvoiceTotals(
    input.items,
    input.discountAmount ?? "0",
  );

  // Unique invoice number is protected by the database constraint.
  // Retry in case another request generates the same number.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const invoiceNumber = generateInvoiceNumber();

    try {
      return await prisma.invoice.create({
        data: {
          businessUserId: user.id,
          ...invoiceCreateData(
            input,
            totals,
            clientUserId,
            invoiceNumber,
          ),
        },
        include: invoiceInclude,
      });
    } catch (error) {
      if (error.code === "P2002" && attempt < 2) {
        continue;
      }

      throw error;
    }
  }

  throw new ApiError(500, "Unable to generate a unique invoice number.");
}

export async function listInvoices(user, filters) {
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 20;
  const skip = (page - 1) * limit;

  const where = {};

  if (user.accountCategory === "BUSINESS") {
    where.businessUserId = user.id;
  } else if (user.accountCategory === "CLIENT") {
    where.clientUserId = user.id;
  } else {
    throw new ApiError(403, "This account cannot access invoices.");
  }

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.search) {
    where.OR = [
      { invoiceNumber: { contains: filters.search, mode: "insensitive" } },
      { clientName: { contains: filters.search, mode: "insensitive" } },
      { clientEmail: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  const [invoices, total] = await prisma.$transaction([
    prisma.invoice.findMany({
      where,
      include: { items: true },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.invoice.count({ where }),
  ]);

  return {
    invoices,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getInvoice(user, invoiceId) {
  const invoice = await findAccessibleInvoice(invoiceId, user);

  if (
    user.accountCategory === "CLIENT" &&
    invoice.clientUserId === user.id &&
    invoice.status === "SENT"
  ) {
    return prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        status: "VIEWED",
        viewedAt: new Date(),
      },
      include: invoiceInclude,
    });
  }

  return invoice;
}

export async function updateInvoice(user, invoiceId, input) {
  ensureBusiness(user);

  const existing = await findAccessibleInvoice(invoiceId, user);

  if (existing.status !== "DRAFT") {
    throw new ApiError(400, "Only draft invoices can be edited.");
  }

  const totals = calculateInvoiceTotals(
    input.items ?? existing.items,
    input.discountAmount ?? existing.discountAmount.toString(),
  );

  const data = {};

  if (input.clientName !== undefined) data.clientName = input.clientName;
  if (input.clientEmail !== undefined) {
    data.clientEmail = input.clientEmail.toLowerCase();
  }
  if (input.currency !== undefined) {
    data.currency = input.currency.toUpperCase();
  }
  if (input.dueDate !== undefined) {
    data.dueDate = input.dueDate ? new Date(input.dueDate) : null;
  }
  if (input.notes !== undefined) data.notes = input.notes;
  if (input.terms !== undefined) data.terms = input.terms;

  data.subtotal = totals.subtotal;
  data.discountAmount = totals.discountAmount;
  data.taxAmount = totals.taxAmount;
  data.totalAmount = totals.totalAmount;
  data.balanceDue = totals.balanceDue;

  return prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      ...data,
      ...(input.items
        ? {
            items: {
              deleteMany: {},
              create: totals.items,
            },
          }
        : {}),
    },
    include: invoiceInclude,
  });
}

export async function sendInvoice(user, invoiceId) {
  ensureBusiness(user);

  const invoice = await findAccessibleInvoice(invoiceId, user);

  if (invoice.status !== "DRAFT") {
    throw new ApiError(400, "Only draft invoices can be sent.");
  }

  const business = invoice.businessUser.businessProfile;

  const result = await sendEmail({
    to: invoice.clientEmail,
    subject: `Invoice ${invoice.invoiceNumber} from ${business.businessName}`,
    text: [
      `Hello ${invoice.clientName},`,
      "",
      `You have received invoice ${invoice.invoiceNumber}.`,
      `Business: ${business.businessName}`,
      `Total: ${invoice.currency} ${invoice.totalAmount.toString()}`,
      `Due: ${invoice.dueDate ? invoice.dueDate.toDateString() : "Not specified"}`,
      "",
      "Please contact the business if you have questions.",
    ].join("\n"),
  });

  if (!result.delivered) {
    return {
      invoice,
      delivered: false,
      message: "Email was not delivered. Configure the email provider to send invoices.",
    };
  }

  const updated = await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      status: "SENT",
      sentAt: new Date(),
    },
    include: invoiceInclude,
  });

  return {
    invoice: updated,
    delivered: true,
    message: "Invoice email sent successfully.",
  };
}

export async function cancelInvoice(user, invoiceId) {
  ensureBusiness(user);

  const invoice = await findAccessibleInvoice(invoiceId, user);

  // MVP: only draft invoices can be cancelled.
  // Payment and refund handling belongs to the Razorpay stage.
  if (invoice.status !== "DRAFT") {
    throw new ApiError(400, "Only draft invoices can be cancelled.");
  }

  return prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      status: "CANCELLED",
      cancelledAt: new Date(),
    },
    include: invoiceInclude,
  });
}
