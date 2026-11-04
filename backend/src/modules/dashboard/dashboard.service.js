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

function roleWhere(user, filters) {
  if (user.accountCategory === "BUSINESS") {
    return {
      businessUserId: user.id,
      status: { in: filters.includeCancelled ? [...publishedStatuses, "CANCELLED"] : publishedStatuses },
      ...dateWhere(filters, "issueDate"),
    };
  }
  if (user.accountCategory === "CLIENT") {
    return {
      clientUserId: user.id,
      status: { in: openStatuses },
      ...dateWhere(filters, "issueDate"),
    };
  }
  throw new ApiError(403, "This account cannot access the dashboard.");
}

export async function getDashboard(user, filters) {
  const ownerWhere = user.accountCategory === "BUSINESS"
    ? { businessUserId: user.id }
    : user.accountCategory === "CLIENT"
      ? { clientUserId: user.id }
      : null;
  if (!ownerWhere) throw new ApiError(403, "This account cannot access the dashboard.");
  const invoiceWhere = {
    ...ownerWhere,
    ...dateWhere(filters, "issueDate"),
  };
  const publishedWhere = {
    ...invoiceWhere,
    status: { in: filters.includeCancelled ? [...publishedStatuses, "CANCELLED"] : publishedStatuses },
  };
  const paymentWhere = {
    ...(user.accountCategory === "BUSINESS"
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
    role: user.accountCategory,
    semantics: {
      invoiceMetricsDate: "Invoice issue date (UTC)",
      collectionMetricsDate: "Payment capture date (UTC)",
      pendingMetricsDate: "Payment capture date when available, otherwise initiation date",
    },
    metrics: {
      invoices: {
        total: Object.values(invoiceCounts).reduce((sum, value) => sum + value, 0),
        byStatus: invoiceCounts,
      },
      financial: {
        totalInvoicedAmount: sumValue(invoiceAmounts._sum.totalAmount),
        totalOutstandingAmount: sumValue(invoiceAmounts._sum.balanceDue),
        totalCapturedAmount: sumValue(captured._sum.amount),
        pendingPaymentAmount: sumValue(pending._sum.amount),
        failedPaymentCount: failedCount,
        successfulPaymentCount: successfulCount,
      },
    },
    recentInvoices: await listDashboardInvoices(user, filters, 1, 5),
    recentPayments: await listDashboardTransactions(user, filters, 1, 5),
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
  const where = {
    ...(user.accountCategory === "BUSINESS" ? { businessUserId: user.id } : { clientUserId: user.id }),
    ...(filters.status ? { status: filters.status } : {}),
    ...dateWhere(filters, "createdAt"),
  };
  const [payments, total] = await prisma.$transaction([
    prisma.payment.findMany({
      where,
      select: {
        id: true, invoiceId: true, amount: true, currency: true, status: true,
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