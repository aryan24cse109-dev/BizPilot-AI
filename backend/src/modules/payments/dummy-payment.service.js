
import crypto from "node:crypto";
import QRCode from "qrcode";
import Decimal from "decimal.js";
import { toMinorUnits } from "../../utils/currency.js";

import { prisma } from "../../config/database.js";
import { env } from "../../config/env.js";
import { ApiError } from "../../utils/ApiError.js";
import { reconcileSuccessfulPayment } from "./payment-reconciliation.service.js";

const sessionInclude = {
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
      clientEmail: true,
      businessUser: {
        select: {
          id: true,
          fullName: true,
          businessProfile: {
            select: { businessName: true },
          },
        },
      },
    },
  },
};

function hashToken(token) {
  return crypto
    .createHash("sha256")
    .update(token, "utf8")
    .digest("hex");
}

function createToken() {
  return crypto.randomBytes(32).toString("base64url");
}

function normalizeCurrency(currency) {
  if (typeof currency !== "string" || !currency.trim()) {
    throw new ApiError(400, "Invoice currency is invalid.");
  }

  return currency.trim().toUpperCase();
}

function assertInvoicePayable(invoice) {
  if (!invoice) {
    throw new ApiError(404, "Invoice not found.");
  }

  if (
    !["SENT", "VIEWED", "PARTIALLY_PAID", "OVERDUE"].includes(
      invoice.status
    )
  ) {
    throw new ApiError(400, "This invoice is not available for payment.");
  }

  const balanceDue = new Decimal(invoice.balanceDue);

  if (!balanceDue.isFinite() || balanceDue.lte(0)) {
    throw new ApiError(400, "This invoice has no outstanding balance.");
  }

  // Ensure the invoice amount can safely be represented in minor units.
  toMinorUnits(balanceDue);
}

function assertSessionAccess(session, user) {
  if (!user) return;

  const isBusinessOwner = session.businessUserId === user.id;

  const isClient =
    session.clientUserId === user.id ||
    session.invoice.clientEmail?.toLowerCase() ===
      user.email?.toLowerCase();

  if (!isBusinessOwner && !isClient) {
    throw new ApiError(404, "Payment session not found.");
  }
}

function sessionResponse(session, token, qrDataUrl = null) {
  return {
    id: session.id,
    invoiceId: session.invoiceId,
    invoiceNumber: session.invoice.invoiceNumber,
    businessName:
      session.invoice.businessUser.businessProfile?.businessName ||
      session.invoice.businessUser.fullName,
    amount: session.amount,
    currency: session.currency,
    status: session.status,
    expiresAt: session.expiresAt,
    paymentUrl: token
      ? `${env.FRONTEND_URL}/demo-payment/${encodeURIComponent(token)}`
      : undefined,
    qrDataUrl: qrDataUrl || undefined,
  };
}

async function loadSessionByToken(tx, token) {
  const tokenHash = hashToken(token);

  await tx.$queryRaw`
    SELECT id
    FROM dummy_payment_sessions
    WHERE "tokenHash" = ${tokenHash}
    FOR UPDATE
  `;

  const session = await tx.dummyPaymentSession.findUnique({
    where: { tokenHash },
    include: sessionInclude,
  });

  if (!session) {
    throw new ApiError(404, "Payment session not found.");
  }

  if (session.status === "ACTIVE" && session.expiresAt <= new Date()) {
    return tx.dummyPaymentSession.update({
      where: { id: session.id },
      data: { status: "EXPIRED" },
      include: sessionInclude,
    });
  }

  return session;
}

function assertActiveSession(session) {
  if (session.status === "EXPIRED") {
    throw new ApiError(410, "Payment session has expired.");
  }

  if (session.status === "REVOKED") {
    throw new ApiError(410, "Payment session has been revoked.");
  }

  if (session.status === "SUCCESSFUL") {
    throw new ApiError(409, "Payment session has already been completed.");
  }

  if (session.expiresAt <= new Date()) {
    throw new ApiError(410, "Payment session has expired.");
  }
}

function assertSessionMatchesInvoice(session) {
  const invoiceBalance = new Decimal(session.invoice.balanceDue);
  const sessionAmount = new Decimal(session.amount);

  const invoiceCurrency = normalizeCurrency(session.invoice.currency);
  const sessionCurrency = normalizeCurrency(session.currency);

  if (
    !invoiceBalance.isFinite() ||
    !sessionAmount.isFinite() ||
    sessionAmount.lte(0) ||
    invoiceBalance.lte(0)
  ) {
    throw new ApiError(409, "The payment session has an invalid amount.");
  }

  // Session amount is stored in major units, just like invoice.balanceDue.
  // Reject the session if the current outstanding balance is now lower.
  if (invoiceBalance.lt(sessionAmount)) {
    throw new ApiError(
      409,
      "The invoice balance has changed. Please create a new payment session."
    );
  }

  if (invoiceCurrency !== sessionCurrency) {
    throw new ApiError(
      409,
      "The invoice currency has changed. Please create a new payment session."
    );
  }

  // Validate conversion without changing the stored major-unit amount.
  toMinorUnits(sessionAmount);
}

export async function createDummyPaymentSession(user, invoiceId) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      businessUser: {
        select: { id: true },
      },
    },
  });

  const isBusinessOwner = invoice?.businessUserId === user.id;

  const isAuthorizedClient =
    invoice &&
    (invoice.clientUserId === user.id ||
      invoice.clientEmail?.toLowerCase() === user.email?.toLowerCase());

  if (!invoice || (!isBusinessOwner && !isAuthorizedClient)) {
    throw new ApiError(404, "Invoice not found.");
  }

  assertInvoicePayable(invoice);

  const token = createToken();

  const expiresAt = new Date(
    Date.now() +
      (env.DUMMY_SESSION_TTL_MINUTES ?? 30) * 60 * 1000
  );

  const currency = normalizeCurrency(invoice.currency);

  // IMPORTANT:
  // Store the amount in major units (e.g. ₹5000.00).
  // Do NOT call toMinorUnits() here.
  const amount = new Decimal(invoice.balanceDue).toFixed(2);

  const session = await prisma.dummyPaymentSession.create({
    data: {
      invoiceId: invoice.id,
      businessUserId: invoice.businessUserId,
      clientUserId:
        invoice.clientUserId ?? (isAuthorizedClient ? user.id : null),
      tokenHash: hashToken(token),
      amount,
      currency,
      expiresAt,
    },
    include: sessionInclude,
  });

  const paymentUrl = `${env.FRONTEND_URL}/demo-payment/${encodeURIComponent(token)}`;

  const qrDataUrl = await QRCode.toDataURL(paymentUrl, {
    margin: 1,
    width: 320,
  });

  return sessionResponse(session, token, qrDataUrl);
}

export async function getDummyPaymentSession(token, user = null) {
  if (!token || token.length < 32) {
    throw new ApiError(404, "Payment session not found.");
  }

  const session = await prisma.$transaction((tx) =>
    loadSessionByToken(tx, token)
  );

  assertSessionAccess(session, user);

  return sessionResponse(session);
}

export async function simulateDummyPayment({
  token,
  action,
  requestKey,
  user = null,
}) {
  if (!token || token.length < 32) {
    throw new ApiError(404, "Payment session not found.");
  }

  if (!requestKey || requestKey.length < 8) {
    throw new ApiError(400, "A valid idempotency key is required.");
  }

  if (!["SUCCESS", "FAILURE"].includes(action)) {
    throw new ApiError(400, "Action must be SUCCESS or FAILURE.");
  }

  return prisma.$transaction(async (tx) => {
    const session = await loadSessionByToken(tx, token);

    assertSessionAccess(session, user);

    const eventType =
      action === "SUCCESS"
        ? "SUCCESS_SIMULATED"
        : "FAILURE_SIMULATED";

    const existing = await tx.dummyPaymentEvent.findUnique({
      where: { requestKey },
    });

    if (existing) {
      if (
        existing.sessionId !== session.id ||
        existing.eventType !== eventType
      ) {
        throw new ApiError(
          409,
          "The idempotency key is already associated with another request."
        );
      }

      return {
        duplicate: true,
        event: existing,
        session: sessionResponse(session),
      };
    }

    assertActiveSession(session);
    assertInvoicePayable(session.invoice);
    assertSessionMatchesInvoice(session);

    const payment = await tx.payment.create({
      data: {
        invoiceId: session.invoiceId,
        businessUserId: session.businessUserId,
        clientUserId: session.clientUserId,
        provider: "DUMMY",
        status: action === "SUCCESS" ? "PENDING" : "FAILED",
        amount: session.amount,
        currency: session.currency,
        idempotencyKey: `dummy_${requestKey}`,
        failureReason:
          action === "SUCCESS"
            ? null
            : "Simulated demo payment failure.",
        metadata: {
          simulated: true,
          paymentMode: "DUMMY_SIMULATION",
          requestKey,
        },
      },
    });

    const event = await tx.dummyPaymentEvent.create({
      data: {
        sessionId: session.id,
        paymentId: payment.id,
        eventType,
        requestKey,
        amount: session.amount,
        currency: session.currency,
        metadata: {
          simulated: true,
          paymentMode: "DUMMY_SIMULATION",
        },
      },
    });

    await tx.auditLog.create({
      data: {
        ownerUserId: session.businessUserId,
        actorUserId: user?.id ?? null,
        action: "DEMO_PAYMENT_SIMULATED",
        entityType: "Payment",
        entityId: payment.id,
        details: {
          invoiceId: session.invoiceId,
          eventType,
          amount: new Decimal(session.amount).toFixed(2),
          currency: session.currency,
          simulated: true,
        },
      },
    });

    if (action === "FAILURE") {
      return {
        duplicate: false,
        event,
        payment,
        invoice: session.invoice,
        session: sessionResponse(session),
      };
    }

    // Payment records store major units.
    // Reconciliation receives provider amounts in minor units.
    const invoice = await reconcileSuccessfulPayment(tx, {
      payment,
      providerAmount: toMinorUnits(session.amount),
      providerCurrency: session.currency,
      metadata: {
        simulated: true,
        paymentMode: "DUMMY_SIMULATION",
        requestKey,
      },
    });

    const completedSession = await tx.dummyPaymentSession.update({
      where: { id: session.id },
      data: {
        status: "SUCCESSFUL",
        consumedAt: new Date(),
      },
      include: sessionInclude,
    });

    return {
      duplicate: false,
      event,
      payment: await tx.payment.findUnique({
        where: { id: payment.id },
      }),
      invoice,
      session: sessionResponse(completedSession),
    };
  });
}

export async function revokeDummyPaymentSession(user, sessionId) {
  const session = await prisma.dummyPaymentSession.findUnique({
    where: { id: sessionId },
  });

  if (!session || session.businessUserId !== user.id) {
    throw new ApiError(404, "Payment session not found.");
  }

  if (session.status !== "ACTIVE") {
    throw new ApiError(
      409,
      "Only active payment sessions can be revoked."
    );
  }

  return prisma.dummyPaymentSession.update({
    where: { id: session.id },
    data: { status: "REVOKED" },
  });
}
