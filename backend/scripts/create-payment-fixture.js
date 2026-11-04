import "dotenv/config";
import crypto from "node:crypto";
import { prisma } from "../src/config/database.js";
import { env } from "../src/config/env.js";

if (env.NODE_ENV !== "development" || process.env.PAYMENT_FIXTURE !== "1") {
  throw new Error("Set NODE_ENV=development and PAYMENT_FIXTURE=1 to create the fixture.");
}

const suffix = crypto.randomBytes(4).toString("hex");
const businessEmail = `fixture-business-${suffix}@example.test`;
const clientEmail = `fixture-client-${suffix}@example.test`;

try {
  const result = await prisma.$transaction(async (tx) => {
    const business = await tx.user.create({
      data: {
        email: businessEmail,
        username: `fixture_business_${suffix}`,
        fullName: "BizPilot Payment Fixture",
        accountCategory: "BUSINESS",
        onboardingCompleted: true,
        businessProfile: {
          create: {
            businessType: "SMALL_BUSINESS",
            businessName: "BizPilot Payment Fixture",
          },
        },
      },
    });
    const client = await tx.user.create({
      data: {
        email: clientEmail,
        username: `fixture_client_${suffix}`,
        fullName: "BizPilot Client Fixture",
        accountCategory: "CLIENT",
        onboardingCompleted: true,
        emailVerifiedAt: new Date(),
        clientProfile: { create: {} },
      },
    });
    await tx.connection.create({
      data: {
        businessUserId: business.id,
        clientUserId: client.id,
        status: "ACTIVE",
        acceptedAt: new Date(),
      },
    });
    const invoice = await tx.invoice.create({
      data: {
        businessUserId: business.id,
        clientUserId: client.id,
        invoiceNumber: `FIXTURE-${suffix}`,
        clientName: client.fullName,
        clientEmail: client.email,
        currency: "INR",
        status: "SENT",
        subtotal: "1000.00",
        taxAmount: "180.00",
        totalAmount: "1180.00",
        balanceDue: "1180.00",
        sentAt: new Date(),
        items: {
          create: {
            description: "BizPilot payment fixture",
            quantity: "1.000",
            unitPrice: "1000.00",
            taxRate: "18.0000",
            lineSubtotal: "1000.00",
            lineTax: "180.00",
            lineTotal: "1180.00",
          },
        },
      },
    });
    return { businessEmail, clientEmail, invoiceId: invoice.id };
  });
  console.log("Created development payment fixture:", result);
} finally {
  await prisma.$disconnect();
}
