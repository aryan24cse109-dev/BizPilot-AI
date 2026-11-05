import Decimal from "decimal.js";

import { prisma } from "../../config/database.js";
import { ApiError } from "../../utils/ApiError.js";
import { getRazorpayPublicKey } from "../../config/razorpay.js";
import { createRazorpayOrder, getRazorpayPayment } from "../../integrations/razorpay/razorpay.service.js";
import { verifyCheckoutSignature } from "../../integrations/razorpay/razorpay.signature.js";
import { toMinorUnits } from "../../utils/currency.js";
import { getPagination, paginationResult } from "../../utils/pagination.js";

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
  if (user.accountCategory !== "CLIENT") {
    throw new ApiError(403, "Only client accounts can initiate payments.");
  }
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

      if (!invoice || invoice.clientUserId !== user.id) {
        throw new ApiError(404, "Invoice not found.");
      }
      if (!["SENT", "VIEWED", "PARTIALLY_PAID", "OVERDUE"].includes(invoice.status)) {
        throw new ApiError(400, "This invoice is not available for payment.");
      }

      const connection = await tx.connection.findFirst({
        where: {
          businessUserId: invoice.businessUserId,
          clientUserId: user.id,
          status: "ACTIVE",
        },
      });
      if (!connection) throw new ApiError(403, "You are not connected to this business.");

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
  assertMoneyMatch(providerPayment.amount, payment.amount, providerPayment.currency, payment.currency);
  if (payment.providerPaymentId && payment.providerPaymentId !== providerPayment.id) {
    throw new ApiError(409, "A different provider payment is already associated with this attempt.");
  }
  if (payment.status === "SUCCEEDED" || payment.status === "REFUNDED") return;

  await tx.payment.update({
    where: { id: payment.id },
    data: {
      status: "SUCCEEDED",
      providerPaymentId: providerPayment.id,
      capturedAt: new Date(),
      failureReason: null,
      metadata: providerPayment,
    },
  });

  const successful = await tx.payment.aggregate({
    where: { invoiceId: payment.invoiceId, status: "SUCCEEDED" },
    _sum: { amount: true },
  });
  const invoice = await tx.invoice.findUnique({ where: { id: payment.invoiceId } });
  const paid = new Decimal(successful._sum.amount ?? 0);
  const total = new Decimal(invoice.totalAmount);
  const balance = Decimal.max(0, total.minus(paid));
  const status = balance.isZero() ? "PAID" : "PARTIALLY_PAID";
  await tx.invoice.update({
    where: { id: invoice.id },
    data: {
      amountPaid: paid.toFixed(2),
      balanceDue: balance.toFixed(2),
      status,
      paidAt: balance.isZero() ? new Date() : null,
    },
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

export async function listPayments(user, filters) {
  const { page, limit, skip } = getPagination(filters);
  const where = user.accountCategory === "BUSINESS"
    ? { businessUserId: user.id }
    : user.accountCategory === "CLIENT"
      ? { clientUserId: user.id }
      : null;
  if (!where) throw new ApiError(403, "This account cannot access payments.");
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
  if (
    (user.accountCategory === "BUSINESS" && payment.businessUserId !== user.id) ||
    (user.accountCategory === "CLIENT" && payment.clientUserId !== user.id)
  ) throw new ApiError(404, "Payment not found.");
  return payment;
}

export async function listInvoicePayments(user, invoiceId, filters) {
  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice ||
    (user.accountCategory === "BUSINESS" && invoice.businessUserId !== user.id) ||
    (user.accountCategory === "CLIENT" && invoice.clientUserId !== user.id)) {
    throw new ApiError(404, "Invoice not found.");
  }
  return listPayments(user, { ...filters, invoiceId });
}