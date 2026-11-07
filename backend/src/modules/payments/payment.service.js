import Decimal from "decimal.js";

import { prisma } from "../../config/database.js";
import { ApiError } from "../../utils/ApiError.js";
import { getRazorpayPublicKey } from "../../config/razorpay.js";
import { createRazorpayOrder, getRazorpayPayment } from "../../integrations/razorpay/razorpay.service.js";
import { verifyCheckoutSignature } from "../../integrations/razorpay/razorpay.signature.js";
import { toMinorUnits } from "../../utils/currency.js";
import { getPagination, paginationResult } from "../../utils/pagination.js";
import { reconcileSuccessfulPayment } from "./payment-reconciliation.service.js";

const paymentInclude = {
  invoice: {
    select: {
      id: true,
      invoiceNumber: true,
      totalAmount: true,
      amountPaid: true,
      balanceDue: true,
      currency: true,
      status: true,
      businessUserId: true,
      clientUserId: true,
    },
  },
};

function assertClient(user) {
  // In dual-role architecture, any authenticated user can make client payments
  return true;
}

function assertMoneyMatch(providerAmount, expectedAmount, currency, expectedCurrency) {
  if (
    Number(providerAmount) !== toMinorUnits(expectedAmount) ||
    String(currency).toUpperCase() !== String(expectedCurrency).toUpperCase()
  ) {
    throw new ApiError(409, "The provider payment does not match the invoice.");
  }
}

async function findPaymentForClient(userId, paymentId) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: paymentInclude,
  });
  if (!payment || payment.clientUserId !== userId) {
    throw new ApiError(404, "Payment not found.");
  }
  return payment;
}

export async function createPaymentOrder(user, invoiceId, input) {
  assertClient(user);

  let payment;
  try {
    payment = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM invoices WHERE id = ${invoiceId}::uuid FOR UPDATE`;
      const invoice = await tx.invoice.findUnique({
        where: { id: invoiceId },
        include: { businessUser: true },
      });

      const isClientMatch =
        invoice &&
        (invoice.clientUserId === user.id ||
          (invoice.clientEmail && invoice.clientEmail.toLowerCase() === user.email.toLowerCase().trim()) ||
          invoice.businessUserId === user.id);

      if (!invoice || !isClientMatch) {
        throw new ApiError(404, "Invoice not found or unauthorized.");
      }

      if (invoice.status === "DRAFT" && invoice.businessUserId === user.id) {
        await tx.invoice.update({
          where: { id: invoice.id },
          data: { status: "SENT" },
        });
        invoice.status = "SENT";
      }

      if (!["SENT", "VIEWED", "PARTIALLY_PAID", "OVERDUE"].includes(invoice.status)) {
        throw new ApiError(400, "This invoice is not available for payment.");
      }

      // Link clientUserId on the fly if needed
      if (!invoice.clientUserId) {
        await tx.invoice.update({
          where: { id: invoice.id },
          data: { clientUserId: user.id },
        });
      }

      // Ensure active connection exists
      await tx.connection.upsert({
        where: {
          businessUserId_clientUserId: {
            businessUserId: invoice.businessUserId,
            clientUserId: user.id,
          },
        },
        update: { status: "ACTIVE", acceptedAt: new Date() },
        create: {
          businessUserId: invoice.businessUserId,
          clientUserId: user.id,
          status: "ACTIVE",
          acceptedAt: new Date(),
        },
      });

      const existing = await tx.payment.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
        include: paymentInclude,
      });
      if (existing) {
        if (existing.clientUserId !== user.id || existing.invoiceId !== invoice.id) {
          throw new ApiError(409, "The idempotency key is already in use.");
        }
        if (existing.status === "INITIATED" && !existing.providerOrderId) {
          throw new ApiError(409, "This payment attempt is already being created.");
        }
        return existing;
      }

      const balance = new Decimal(invoice.balanceDue);
      const amount = new Decimal(input.amount ?? balance);
      if (!amount.isFinite() || amount.lte(0) || amount.gt(balance)) {
        throw new ApiError(400, "Payment amount must be greater than zero and within the outstanding balance.");
      }
      if (invoice.currency.toUpperCase() !== "INR") {
        throw new ApiError(400, "This payment provider currently supports INR invoices only.");
      }

      return tx.payment.create({
        data: {
          invoiceId: invoice.id,
          businessUserId: invoice.businessUserId,
          clientUserId: user.id,
          provider: "RAZORPAY",
          amount: amount.toFixed(2),
          currency: invoice.currency.toUpperCase(),
          idempotencyKey: input.idempotencyKey,
          status: "INITIATED",
        },
        include: paymentInclude,
      });
    });
  } catch (error) {
    if (error.code === "P2002") {
      payment = await prisma.payment.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
        include: paymentInclude,
      });
    } else {
      throw error;
    }
  }

  if (!payment) throw new ApiError(500, "Unable to create payment attempt.");
  if (payment.providerOrderId) {
    return {
      keyId: getRazorpayPublicKey(),
      orderId: payment.providerOrderId,
      payment,
    };
  }

  const receipt = `bp_${payment.id.replaceAll("-", "").slice(0, 32)}`;
  try {
    const order = await createRazorpayOrder({
      amount: toMinorUnits(payment.amount),
      currency: payment.currency,
      receipt,
      notes: { bizpilotPaymentId: payment.id, invoiceId: payment.invoiceId },
    });
    if (
      !order?.id ||
      Number(order.amount) !== toMinorUnits(payment.amount) ||
      String(order.currency).toUpperCase() !== payment.currency
    ) {
      throw new ApiError(502, "Razorpay returned an invalid order.");
    }
    const updated = await prisma.payment.update({
      where: { id: payment.id },
      data: { providerOrderId: order.id, status: "PENDING" },
      include: paymentInclude,
    });
    return { keyId: getRazorpayPublicKey(), orderId: order.id, payment: updated };
  } catch (error) {
    await prisma.payment.updateMany({
      where: { id: payment.id, status: "INITIATED" },
      data: { status: "FAILED", failureReason: "Unable to create provider order." },
    });
    throw error;
  }
}

export async function verifyPayment(user, input) {
  assertClient(user);
  if (!verifyCheckoutSignature(
    input.razorpayOrderId,
    input.razorpayPaymentId,
    input.razorpaySignature,
  )) {
    throw new ApiError(400, "Invalid payment signature.");
  }

  const payment = await prisma.payment.findFirst({
    where: { providerOrderId: input.razorpayOrderId, clientUserId: user.id },
    include: paymentInclude,
  });
  if (!payment) throw new ApiError(404, "Payment attempt not found.");

  const providerPayment = await getRazorpayPayment(input.razorpayPaymentId);
  if (!providerPayment?.id || providerPayment.order_id !== payment.providerOrderId) {
    throw new ApiError(409, "The provider payment is not linked to this order.");
  }
  assertMoneyMatch(
    providerPayment.amount,
    payment.amount,
    providerPayment.currency,
    payment.currency,
  );

  const updated = await prisma.payment.updateMany({
    where: {
      id: payment.id,
      status: { in: ["INITIATED", "PENDING"] },
    },
    data: {
      providerPaymentId: input.razorpayPaymentId,
      status: providerPayment.status === "failed" ? "FAILED" : "PENDING",
      failureReason: providerPayment.error_description ?? null,
      metadata: providerPayment,
    },
  });
  return {
    accepted: true,
    authoritativeCapturePending: providerPayment.status !== "captured",
    payment: await prisma.payment.findUnique({
      where: { id: payment.id },
      include: paymentInclude,
    }),
    updated: updated.count === 1,
  };
}

async function applyCapturedPayment(tx, payment, providerPayment) {
  await reconcileSuccessfulPayment(tx, {
    payment,
    providerPaymentId: providerPayment.id,
    providerAmount: providerPayment.amount,
    providerCurrency: providerPayment.currency,
    metadata: providerPayment,
  });
}

export async function processWebhook({ eventId, eventType, payload }) {
  if (!eventId || !eventType) throw new ApiError(400, "Webhook event is incomplete.");
  try {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.paymentWebhookEvent.findUnique({
        where: {
          provider_providerEventId: {
            provider: "RAZORPAY",
            providerEventId: eventId,
          },
        },
      });
      if (existing?.status === "PROCESSED") return { duplicate: true };

      const event = existing ?? await tx.paymentWebhookEvent.create({
        data: {
          provider: "RAZORPAY",
          providerEventId: eventId,
          eventType,
          payload,
          signatureVerified: true,
          status: "PROCESSING",
        },
      });

      const entity = payload?.payload?.payment?.entity;
      if (eventType === "payment.captured" && entity?.order_id && entity?.id) {
        const payment = await tx.payment.findFirst({
          where: {
            OR: [
              { providerOrderId: entity.order_id },
              { providerPaymentId: entity.id },
            ],
          },
        });
        if (payment) await applyCapturedPayment(tx, payment, entity);
      } else if (eventType === "payment.failed" && entity?.order_id) {
        const payment = await tx.payment.findFirst({ where: { providerOrderId: entity.order_id } });
        if (payment && !["SUCCEEDED", "REFUNDED", "PARTIALLY_REFUNDED"].includes(payment.status)) {
          await tx.payment.update({
            where: { id: payment.id },
            data: {
              status: "FAILED",
              providerPaymentId: entity.id ?? payment.providerPaymentId,
              failureReason: entity.error_description ?? "Payment failed.",
              metadata: entity,
            },
          });
        }
      }
      await tx.paymentWebhookEvent.update({
        where: { id: event.id },
        data: { status: "PROCESSED", processedAt: new Date() },
      });
      return { duplicate: false };
    });
  } catch (error) {
    if (error.code === "P2002") return { duplicate: true };
    throw error;
  }
}

export async function listPayments(user, filters = {}) {
  const { page, limit, skip } = getPagination(filters);
  const requestedRole = (filters.role || filters.type || "").toLowerCase();

  let where;
  if (requestedRole === "client") {
    where = { clientUserId: user.id };
  } else if (requestedRole === "business") {
    where = { businessUserId: user.id };
  } else {
    if (user.accountCategory === "BUSINESS" || user.businessProfile) {
      where = { businessUserId: user.id };
    } else {
      where = { clientUserId: user.id };
    }
  }

  if (filters.status) where.status = filters.status;
  if (filters.invoiceId) where.invoiceId = filters.invoiceId;
  const [payments, total] = await prisma.$transaction([
    prisma.payment.findMany({
      where,
      include: paymentInclude,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.payment.count({ where }),
  ]);
  return { payments, pagination: paginationResult(page, limit, total) };
}

export async function getPayment(user, paymentId) {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId }, include: paymentInclude });
  if (!payment) throw new ApiError(404, "Payment not found.");
  if (payment.businessUserId !== user.id && payment.clientUserId !== user.id) {
    throw new ApiError(404, "Payment not found.");
  }
  return payment;
}

export async function listInvoicePayments(user, invoiceId, filters = {}) {
  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice ||
    (invoice.businessUserId !== user.id &&
     invoice.clientUserId !== user.id &&
     invoice.clientEmail?.toLowerCase() !== user.email.toLowerCase())) {
    throw new ApiError(404, "Invoice not found.");
  }
  return listPayments(user, { ...filters, invoiceId });
}

/**
 * Aggregate payment summary for the authenticated business user.
 * Returns verified successful payments grouped by period and provider.
 *
 * @param {object} user - Authenticated user (must have .id and .accountCategory)
 * @param {object} filters - Optional: { period: 'month'|'lastMonth'|'year'|'all', startDate, endDate }
 */
export async function getPaymentSummary(user, filters = {}) {
  const now = new Date();
  let startDate = filters.startDate ? new Date(filters.startDate) : null;
  let endDate   = filters.endDate   ? new Date(filters.endDate)   : null;
  let periodLabel = "All time";

  if (startDate && Number.isNaN(startDate.getTime())) {
    throw new ApiError(400, "startDate must be a valid date.");
  }
  if (endDate && Number.isNaN(endDate.getTime())) {
    throw new ApiError(400, "endDate must be a valid date.");
  }
  if (startDate && endDate && startDate > endDate) {
    throw new ApiError(400, "startDate must be before endDate.");
  }

  if (!startDate && !endDate) {
    const period = (filters.period || "month").toLowerCase();
    if (period === "month" || period === "thismonth") {
      startDate   = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate     = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      periodLabel = `${now.toLocaleString("en-IN", { month: "long" })} ${now.getFullYear()}`;
    } else if (period === "lastmonth") {
      const lm   = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
      const lmYr = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
      startDate   = new Date(lmYr, lm, 1);
      endDate     = new Date(lmYr, lm + 1, 0, 23, 59, 59, 999);
      periodLabel = `${new Date(lmYr, lm, 1).toLocaleString("en-IN", { month: "long" })} ${lmYr}`;
    } else if (period === "year" || period === "thisyear") {
      startDate   = new Date(now.getFullYear(), 0, 1);
      endDate     = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      periodLabel = `${now.getFullYear()}`;
    }
    // "all" => no date filter, periodLabel stays "All time"
  }

  const baseWhere = { businessUserId: user.id, status: "SUCCEEDED" };
  if (startDate || endDate) {
    baseWhere.capturedAt = {
      ...(startDate ? { gte: startDate } : {}),
      ...(endDate ? { lte: endDate } : {}),
    };
  }

  const [payments, outstandingResult] = await prisma.$transaction([
    prisma.payment.findMany({
      where: baseWhere,
      select: {
        id: true,
        amount: true,
        currency: true,
        provider: true,
        capturedAt: true,
        invoice: { select: { invoiceNumber: true, clientName: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.invoice.aggregate({
      where: {
        businessUserId: user.id,
        status: { in: ["SENT", "PARTIALLY_PAID"] },
      },
      _sum: { balanceDue: true },
      _count: { id: true },
    }),
  ]);

  const byProvider = {};
  let totalCollected = new Decimal(0);
  for (const p of payments) {
    const amt  = new Decimal(p.amount.toString());
    totalCollected = totalCollected.plus(amt);
    const prov = p.provider || "UNKNOWN";
    byProvider[prov] = (byProvider[prov] ?? new Decimal(0)).plus(amt);
  }

  const providerBreakdown = Object.entries(byProvider).map(([provider, total]) => ({
    provider,
    totalCollected: total.toFixed(2),
  }));

  const currency = payments[0]?.currency ?? "INR";

  return {
    period: periodLabel,
    totalCollected: totalCollected.toFixed(2),
    currency,
    paymentCount: payments.length,
    providerBreakdown,
    outstanding: {
      total:        (outstandingResult._sum.balanceDue ?? 0).toString(),
      invoiceCount: outstandingResult._count.id,
    },
    recentPayments: payments.slice(0, 10).map((p) => ({
      id:            p.id,
      amount:        p.amount.toString(),
      currency:      p.currency,
      provider:      p.provider,
      date:          p.capturedAt,
      invoiceNumber: p.invoice?.invoiceNumber ?? null,
      clientName:    p.invoice?.clientName    ?? null,
    })),
  };
}

/**
 * Aggregate payment summary for a specific client of the authenticated business user.
 *
 * @param {object} user    - Authenticated business user
 * @param {object} filters - { clientName?, clientEmail? }
 */
export async function getClientPaymentSummary(user, filters = {}) {
  const { clientName, clientEmail } = filters;

  if (!clientName && !clientEmail) {
    throw new ApiError(400, "clientName or clientEmail is required for a client payment summary.");
  }

  const invoiceWhere = { businessUserId: user.id };
  if (clientEmail && clientName) {
    invoiceWhere.clientEmail = { equals: clientEmail, mode: "insensitive" };
    invoiceWhere.clientName = { contains: clientName, mode: "insensitive" };
  } else if (clientEmail) {
    invoiceWhere.clientEmail = { equals: clientEmail, mode: "insensitive" };
  } else {
    invoiceWhere.clientName = { contains: clientName, mode: "insensitive" };
  }

  const invoices = await prisma.invoice.findMany({
    where: invoiceWhere,
    select: {
      id: true,
      invoiceNumber: true,
      clientName: true,
      clientEmail: true,
      totalAmount: true,
      paidAmount: true,
      balanceDue: true,
      status: true,
      currency: true,
    },
  });

  if (invoices.length === 0) {
    throw new ApiError(
      404,
      `No invoices found for "${clientName ?? clientEmail}". Please verify the name or email.`,
    );
  }

  const invoiceIds = invoices.map((i) => i.id);
  const payments   = await prisma.payment.findMany({
    where: { businessUserId: user.id, invoiceId: { in: invoiceIds }, status: "SUCCEEDED" },
    select: {
      id: true,
      amount: true,
      currency: true,
      provider: true,
      createdAt: true,
      invoice: { select: { invoiceNumber: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  let totalBilled      = new Decimal(0);
  let totalOutstanding = new Decimal(0);
  const byProvider = {};

  for (const inv of invoices) {
    totalBilled      = totalBilled.plus(new Decimal(inv.totalAmount.toString()));
    totalOutstanding = totalOutstanding.plus(new Decimal(inv.balanceDue.toString()));
  }
  let totalPaid = new Decimal(0);
  for (const payment of payments) {
    totalPaid = totalPaid.plus(new Decimal(payment.amount.toString()));
    byProvider[payment.provider] = (byProvider[payment.provider] ?? new Decimal(0))
      .plus(new Decimal(payment.amount.toString()));
  }

  const currency           = invoices[0]?.currency  ?? "INR";
  const resolvedClientName = invoices[0]?.clientName ?? clientName ?? clientEmail;

  return {
    client: {
      name:  resolvedClientName,
      email: invoices[0]?.clientEmail ?? clientEmail ?? null,
    },
    summary: {
      totalBilled:      totalBilled.toFixed(2),
      totalPaid:        totalPaid.toFixed(2),
      totalOutstanding: totalOutstanding.toFixed(2),
      currency,
      invoiceCount: invoices.length,
      paymentCount: payments.length,
      providerBreakdown: Object.entries(byProvider).map(([provider, total]) => ({
        provider,
        totalPaid: total.toFixed(2),
      })),
    },
    invoices: invoices.map((inv) => ({
      invoiceNumber: inv.invoiceNumber,
      status:        inv.status,
      totalAmount:   inv.totalAmount.toString(),
      paidAmount:    inv.paidAmount.toString(),
      balanceDue:    inv.balanceDue.toString(),
    })),
    recentPayments: payments.slice(0, 10).map((p) => ({
      id:            p.id,
      amount:        p.amount.toString(),
      currency:      p.currency,
      provider:      p.provider,
      date:          p.createdAt,
      invoiceNumber: p.invoice?.invoiceNumber ?? null,
    })),
  };
}
