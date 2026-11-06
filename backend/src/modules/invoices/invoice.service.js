import crypto, { randomBytes } from "node:crypto";
import { prisma } from "../../config/database.js";
import { env } from "../../config/env.js";
import { ApiError } from "../../utils/ApiError.js";
import { sendEmail } from "../../integrations/email/email.service.js";
import { NotificationService } from "../notifications/notification.service.js";
import {
  calculateInvoiceTotals,
} from "./invoice.schema.js";

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function ensureBusiness(user) {
  if (user.accountCategory !== "BUSINESS" && !user.businessProfile) {
    throw new ApiError(403, "A business profile is required to issue invoices.");
  }
}

async function ensureClient(user) {
  if (user.accountCategory === "CLIENT") return true;
  if (user.roleCapabilities?.hasClientAccess) return true;

  const normalizedEmail = (user.email || "").toLowerCase().trim();
  const count = await prisma.invoice.count({
    where: {
      businessUserId: { not: user.id },
      OR: [
        { clientUserId: user.id },
        { clientEmail: normalizedEmail },
      ],
    },
  });
  if (count > 0) return true;

  const connCount = await prisma.connection.count({
    where: {
      clientUserId: user.id,
      businessUserId: { not: user.id },
      status: "ACTIVE",
    },
  });
  if (connCount > 0) return true;

  throw new ApiError(403, "You do not have access to client portal records.");
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

  if (
    invoice.clientEmail &&
    invoice.clientEmail.toLowerCase() === user.email.toLowerCase()
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
  clientName,
  clientUserId,
}) {
  const normalizedEmail = clientEmail.toLowerCase().trim();

  // 1. If explicit clientUserId is provided, check if client account exists
  if (clientUserId) {
    const client = await prisma.user.findUnique({
      where: { id: clientUserId },
      select: {
        id: true,
        email: true,
        fullName: true,
        status: true,
      },
    });

    if (client && client.status === "ACTIVE") {
      // Auto-connect business and client
      await prisma.connection.upsert({
        where: {
          businessUserId_clientUserId: {
            businessUserId,
            clientUserId: client.id,
          },
        },
        update: { status: "ACTIVE", acceptedAt: new Date() },
        create: {
          businessUserId,
          clientUserId: client.id,
          status: "ACTIVE",
          acceptedAt: new Date(),
        },
      });

      return client.id;
    }
  }

  // 2. Look up existing registered user by email
  const matchingClient = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: {
      id: true,
      email: true,
      fullName: true,
      status: true,
    },
  });

  if (matchingClient && matchingClient.status === "ACTIVE") {
    // Existing user: Link clientUserId immediately and ensure active connection
    await prisma.connection.upsert({
      where: {
        businessUserId_clientUserId: {
          businessUserId,
          clientUserId: matchingClient.id,
        },
      },
      update: { status: "ACTIVE", acceptedAt: new Date() },
      create: {
        businessUserId,
        clientUserId: matchingClient.id,
        status: "ACTIVE",
        acceptedAt: new Date(),
      },
    });

    return matchingClient.id;
  }

  // 3. Unregistered client email:
  // Automatically create an invitation record and send email invitation
  try {
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const existingInvitation = await prisma.invitation.findFirst({
      where: {
        businessUserId,
        email: normalizedEmail,
        status: "PENDING",
      },
    });

    if (!existingInvitation) {
      await prisma.invitation.create({
        data: {
          businessUserId,
          email: normalizedEmail,
          clientName: clientName || null,
          tokenHash,
          expiresAt,
        },
      });
    } else if (clientName && !existingInvitation.clientName) {
      await prisma.invitation.update({
        where: { id: existingInvitation.id },
        data: { clientName },
      });
    }

    const business = await prisma.user.findUnique({
      where: { id: businessUserId },
      include: { businessProfile: true },
    });
    const businessName = business?.businessProfile?.businessName || business?.fullName || "A Business Partner";

    await sendEmail({
      to: normalizedEmail,
      subject: `New Invoice from ${businessName} on BizPilot AI`,
      text: `Hello ${clientName || "Valued Client"},\n\n${businessName} has issued an invoice to you. Sign in or register at ${env.FRONTEND_URL}/login using ${normalizedEmail} to view your invoice, make payments, and manage your account.\n\nThank you,\nBizPilot AI Team`,
      html: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
        <h2 style="color: #1e293b;">Digital Tax Invoice Issued</h2>
        <p>Hello <strong>${clientName || "Valued Client"}</strong>,</p>
        <p><strong>${businessName}</strong> has issued an invoice to you on BizPilot AI.</p>
        <p style="margin: 20px 0;">
          <a href="${env.FRONTEND_URL}/login" style="background-color: #10b981; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
            Sign In / Register to View & Settle
          </a>
        </p>
        <p style="color: #64748b; font-size: 12px;">Sign in using this email address (<strong>${normalizedEmail}</strong>) to automatically link and view all invoices issued to you.</p>
      </div>`,
    });
  } catch (inviteErr) {
    console.warn("Notice: Invitation email could not be dispatched:", inviteErr.message);
  }

  // Keep clientUserId null until client signs in with this email address
  return null;
}

function invoiceCreateData(input, totals, clientUserId, invoiceNumber) {
  return {
    invoiceNumber,
    clientName: input.clientName,
    clientEmail: input.clientEmail.toLowerCase().trim(),
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

  if (!business && user.accountCategory !== "BUSINESS") {
    throw new ApiError(400, "Complete your business profile before creating invoices.");
  }

  const clientUserId = await resolveClientUser({
    businessUserId: user.id,
    clientEmail: input.clientEmail,
    clientName: input.clientName,
    clientUserId: input.clientUserId,
  });

  const totals = calculateInvoiceTotals(
    input.items,
    input.discountAmount ?? "0",
  );

  // Unique invoice number is protected by database constraint with retry
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

export async function listInvoices(user, filters = {}) {
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 20;
  const skip = (page - 1) * limit;

  const where = {};
  const requestedRole = (filters.role || filters.type || "").toLowerCase();

  if (requestedRole === "client") {
    await ensureClient(user);
    // Client view: invoices issued to this user by other businesses
    where.businessUserId = { not: user.id };
    where.OR = [
      { clientUserId: user.id },
      { clientEmail: user.email.toLowerCase().trim() },
    ];
  } else if (requestedRole === "business") {
    ensureBusiness(user);
    // Business view: invoices created by this business user
    where.businessUserId = user.id;
  } else {
    // Fallback: If user has business capabilities, show business invoices, else client invoices
    if (user.accountCategory === "BUSINESS" || user.businessProfile) {
      where.businessUserId = user.id;
    } else {
      where.OR = [
        { clientUserId: user.id },
        { clientEmail: user.email.toLowerCase().trim() },
      ];
    }
  }

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.search) {
    const searchFilter = [
      { invoiceNumber: { contains: filters.search, mode: "insensitive" } },
      { clientName: { contains: filters.search, mode: "insensitive" } },
      { clientEmail: { contains: filters.search, mode: "insensitive" } },
    ];

    if (where.OR) {
      where.AND = [{ OR: where.OR }, { OR: searchFilter }];
      delete where.OR;
    } else {
      where.OR = searchFilter;
    }
  }

  const [invoices, total] = await prisma.$transaction([
    prisma.invoice.findMany({
      where,
      include: { items: true, businessUser: { include: { businessProfile: true } } },
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

  // If viewed by client recipient and invoice is SENT, mark as VIEWED
  const isClientViewer =
    (invoice.clientUserId && invoice.clientUserId === user.id) ||
    (invoice.clientEmail && invoice.clientEmail.toLowerCase() === user.email.toLowerCase());

  if (isClientViewer && invoice.status === "SENT") {
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
    data.clientEmail = input.clientEmail.toLowerCase().trim();
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

  if (input.items) {
    data.items = {
      deleteMany: {},
      create: totals.items,
    };
  }

  return prisma.invoice.update({
    where: { id: existing.id },
    data,
    include: invoiceInclude,
  });
}

export async function sendInvoice(user, invoiceId) {
  ensureBusiness(user);

  const invoice = await findAccessibleInvoice(invoiceId, user);

  if (invoice.status !== "DRAFT") {
    throw new ApiError(400, "Only draft invoices can be sent.");
  }

  const updatedInvoice = await prisma.invoice.update({
    where: { id: invoice.id },
    data: {
      status: "SENT",
      sentAt: new Date(),
    },
    include: invoiceInclude,
  });

  if (updatedInvoice.clientUserId) {
    NotificationService.createNotification({
      userId: updatedInvoice.clientUserId,
      type: "INVOICE_SENT",
      title: "New Tax Invoice Received",
      body: `${user.fullName || "Business"} issued invoice ${updatedInvoice.invoiceNumber} for ₹${Number(updatedInvoice.totalAmount).toLocaleString('en-IN')}`,
      data: { invoiceId: updatedInvoice.id, link: `/portal/invoices/${updatedInvoice.id}` },
    }).catch(() => { });
  }

  try {
    const businessName =
      invoice.businessUser?.businessProfile?.businessName ||
      invoice.businessUser?.fullName ||
      "BizPilot Merchant";

    await sendEmail({
      to: invoice.clientEmail,
      subject: `Invoice ${invoice.invoiceNumber} from ${businessName}`,
      text: `Hello ${invoice.clientName},\n\nYou have received invoice ${invoice.invoiceNumber} for ${invoice.currency} ${invoice.totalAmount}.\n\nPlease sign in to BizPilot AI at ${env.FRONTEND_URL} to view details and complete secure digital payment.\n\nThank you!`,
      html: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
        <h2 style="color: #1e293b;">Invoice ${invoice.invoiceNumber} Issued</h2>
        <p>Dear <strong>${invoice.clientName}</strong>,</p>
        <p><strong>${businessName}</strong> has sent you an invoice for <strong>${invoice.currency} ${Number(invoice.totalAmount).toLocaleString('en-IN')}</strong>.</p>
        <p>Due Date: <strong>${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-IN') : 'Due upon receipt'}</strong></p>
        <p style="margin: 24px 0;">
          <a href="${env.FRONTEND_URL}/portal/invoices/${invoice.id}" style="background-color: #10b981; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
            View & Pay Invoice Online
          </a>
        </p>
      </div>`,
    });
  } catch (err) {
    console.warn("Invoice notification email failed:", err.message);
  }

  return updatedInvoice;
}

export async function cancelInvoice(user, invoiceId, reason) {
  ensureBusiness(user);

  const invoice = await findAccessibleInvoice(invoiceId, user);

  if (invoice.status === "PAID" || invoice.status === "CANCELLED") {
    throw new ApiError(400, `Cannot cancel an invoice with status ${invoice.status}.`);
  }

  return prisma.invoice.update({
    where: { id: invoice.id },
    data: {
      status: "CANCELLED",
      cancelledAt: new Date(),
      notes: reason ? `${invoice.notes ? `${invoice.notes}\n` : ""}Cancellation reason: ${reason}` : invoice.notes,
    },
    include: invoiceInclude,
  });
}
