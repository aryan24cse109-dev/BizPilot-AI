import Decimal from "decimal.js";
import { prisma } from "../../config/database.js";
import { ApiError } from "../../utils/ApiError.js";
import { getPagination, paginationResult } from "../../utils/pagination.js";

const publishedStatuses = ["SENT", "VIEWED", "PARTIALLY_PAID", "PAID", "OVERDUE", "REFUNDED"];
const openStatuses = ["SENT", "VIEWED", "PARTIALLY_PAID", "PAID", "OVERDUE", "REFUNDED"];

function dateWhere(filters, field) {
  const result = {};
  if (filters.period) {
    const now = new Date();
    let start;
    let end;
    if (filters.period === "current_month") {
      start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    } else if (filters.period === "previous_month") {
      start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
      end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    } else {
      start = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
      end = new Date(Date.UTC(now.getUTCFullYear() + 1, 0, 1));
    }
    result[field] = { gte: start, lt: end };
    return result;
  }
  if (filters.startDate || filters.endDate) {
    result[field] = {};
    if (filters.startDate) result[field].gte = new Date(`${filters.startDate}T00:00:00.000Z`);
    if (filters.endDate) result[field].lt = new Date(`${filters.endDate}T00:00:00.000Z`);
  }
  return result;
}

function sumValue(value) {
  return new Decimal(value ?? 0).toFixed(2);
}

function resolveRole(user, filters) {
  const requestedRole = (filters.role || filters.type || "").toLowerCase();
  const isBiz = user.accountCategory === "BUSINESS" || Boolean(user.businessProfile);

  if (requestedRole === "business") {
    if (!isBiz) {
      throw new ApiError(403, "A business workspace is required to view business analytics.");
    }
    return "BUSINESS";
  }

  if (requestedRole === "client") {
    return "CLIENT";
  }

  if (isBiz) return "BUSINESS";
  return "CLIENT";
}

function roleWhere(user, filters) {
  const effectiveRole = resolveRole(user, filters);
  if (effectiveRole === "BUSINESS") {
    return {
      businessUserId: user.id,
      status: { in: filters.includeCancelled ? [...publishedStatuses, "CANCELLED"] : publishedStatuses },
      ...dateWhere(filters, "issueDate"),
    };
  }
  return {
    businessUserId: { not: user.id },
    OR: [
      { clientUserId: user.id },
      { clientEmail: user.email.toLowerCase().trim() },
    ],
    status: { in: openStatuses },
    ...dateWhere(filters, "issueDate"),
  };
}

export async function getDashboard(user, filters = {}) {
  const effectiveRole = resolveRole(user, filters);

  const ownerWhere = effectiveRole === "BUSINESS"
    ? { businessUserId: user.id }
    : {
      businessUserId: { not: user.id },
      OR: [
        { clientUserId: user.id },
        { clientEmail: user.email.toLowerCase().trim() },
      ],
    };

  const invoiceWhere = {
    ...ownerWhere,
    ...dateWhere(filters, "issueDate"),
  };
  const publishedWhere = {
    ...invoiceWhere,
    status: { in: filters.includeCancelled ? [...publishedStatuses, "CANCELLED"] : publishedStatuses },
  };
  const paymentWhere = {
    ...(effectiveRole === "BUSINESS"
      ? { businessUserId: user.id }
      : { clientUserId: user.id }),
    ...dateWhere(filters, "capturedAt"),
  };
  const [counts, invoiceAmounts, captured, failedCount, successfulCount, pending] =
    await Promise.all([
      prisma.invoice.groupBy({
        by: ["status"],
        where: invoiceWhere,
        _count: { _all: true },
      }),
      prisma.invoice.aggregate({
        where: publishedWhere,
        _sum: { totalAmount: true, balanceDue: true },
      }),
      prisma.payment.aggregate({
        where: { ...paymentWhere, status: "SUCCEEDED" },
        _sum: { amount: true },
      }),
      prisma.payment.count({ where: { ...paymentWhere, status: "FAILED" } }),
      prisma.payment.count({ where: { ...paymentWhere, status: "SUCCEEDED" } }),
      prisma.payment.aggregate({ where: { ...paymentWhere, status: { in: ["INITIATED", "PENDING"] } }, _sum: { amount: true } }),
    ]);

  const invoiceCounts = Object.fromEntries(counts.map((row) => [row.status, row._count._all]));
  return {
    role: effectiveRole,
    period: filters.period ?? "all_time",
    metrics: {
      invoices: {
        draft: invoiceCounts.DRAFT ?? 0,
        sent: invoiceCounts.SENT ?? 0,
        viewed: invoiceCounts.VIEWED ?? 0,
        partiallyPaid: invoiceCounts.PARTIALLY_PAID ?? 0,
        paid: invoiceCounts.PAID ?? 0,
        overdue: invoiceCounts.OVERDUE ?? 0,
        cancelled: invoiceCounts.CANCELLED ?? 0,
        refunded: invoiceCounts.REFUNDED ?? 0,
        total: Object.values(invoiceCounts).reduce((acc, count) => acc + count, 0),
      },
      financial: {
        currency: "INR",
        totalInvoicedAmount: sumValue(invoiceAmounts._sum.totalAmount),
        totalOutstandingAmount: sumValue(invoiceAmounts._sum.balanceDue),
        totalCapturedAmount: sumValue(captured._sum.amount),
        totalPendingAmount: sumValue(pending._sum.amount),
      },
      payments: {
        successfulCount,
        failedCount,
        totalAttempts: successfulCount + failedCount,
      },
    },
  };
}

export async function listDashboardInvoices(user, filters, pageInput, limitInput) {
  const { page, limit, skip } = getPagination({ page: pageInput ?? filters.page, limit: limitInput ?? filters.limit });
  const where = roleWhere(user, filters);
  const [invoices, total] = await prisma.$transaction([
    prisma.invoice.findMany({
      where,
      select: {
        id: true, invoiceNumber: true, clientName: true, clientEmail: true,
        currency: true, totalAmount: true, amountPaid: true, balanceDue: true,
        status: true, issueDate: true, dueDate: true,
      },
      orderBy: { issueDate: "desc" },
      skip,
      take: limit,
    }),
    prisma.invoice.count({ where }),
  ]);
  return { invoices, pagination: paginationResult(page, limit, total) };
}

export async function listDashboardTransactions(user, filters, pageInput, limitInput) {
  const { page, limit, skip } = getPagination({ page: pageInput ?? filters.page, limit: limitInput ?? filters.limit });
  const effectiveRole = resolveRole(user, filters);
  const where = {
    ...(effectiveRole === "BUSINESS" ? { businessUserId: user.id } : { clientUserId: user.id }),
    ...(filters.status ? { status: filters.status } : {}),
    ...dateWhere(filters, "createdAt"),
  };
  const [payments, total] = await prisma.$transaction([
    prisma.payment.findMany({
      where,
      select: {
        id: true, invoiceId: true, amount: true, currency: true, status: true,
        provider: true,
        providerOrderId: true, providerPaymentId: true, initiatedAt: true, capturedAt: true,
        invoice: { select: { invoiceNumber: true, clientName: true, clientEmail: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.payment.count({ where }),
  ]);
  return { payments, pagination: paginationResult(page, limit, total) };
}
