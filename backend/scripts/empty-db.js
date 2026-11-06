import { prisma } from "../src/config/database.js";

async function emptyDatabase() {
  console.log("Connecting to database and emptying all tables...");

  try {
    // 1. Delete dependent transactional and audit tables first
    const deletedEvents = await prisma.paymentWebhookEvent.deleteMany({});
    console.log(`- Deleted PaymentWebhookEvents: ${deletedEvents.count}`);

    const deletedPayments = await prisma.payment.deleteMany({});
    console.log(`- Deleted Payments: ${deletedPayments.count}`);

    const deletedItems = await prisma.invoiceItem.deleteMany({});
    console.log(`- Deleted InvoiceItems: ${deletedItems.count}`);

    const deletedInvoices = await prisma.invoice.deleteMany({});
    console.log(`- Deleted Invoices: ${deletedInvoices.count}`);

    const deletedNotifications = await prisma.notification.deleteMany({});
    console.log(`- Deleted Notifications: ${deletedNotifications.count}`);

    const deletedInvitations = await prisma.invitation.deleteMany({});
    console.log(`- Deleted Invitations: ${deletedInvitations.count}`);

    const deletedConnections = await prisma.connection.deleteMany({});
    console.log(`- Deleted Connections: ${deletedConnections.count}`);

    const deletedAudit = await prisma.auditLog.deleteMany({});
    console.log(`- Deleted AuditLogs: ${deletedAudit.count}`);

    const deletedSessions = await prisma.authSession.deleteMany({});
    console.log(`- Deleted AuthSessions: ${deletedSessions.count}`);

    // 2. Delete user profile tables
    const deletedBizProfiles = await prisma.businessProfile.deleteMany({});
    console.log(`- Deleted BusinessProfiles: ${deletedBizProfiles.count}`);

    const deletedClientProfiles = await prisma.clientProfile.deleteMany({});
    console.log(`- Deleted ClientProfiles: ${deletedClientProfiles.count}`);

    // 3. Delete users
    const deletedUsers = await prisma.user.deleteMany({});
    console.log(`- Deleted Users: ${deletedUsers.count}`);

    console.log("\nVerifying table counts...");
    const counts = {
      users: await prisma.user.count(),
      businessProfiles: await prisma.businessProfile.count(),
      clientProfiles: await prisma.clientProfile.count(),
      invoices: await prisma.invoice.count(),
      invoiceItems: await prisma.invoiceItem.count(),
      payments: await prisma.payment.count(),
      notifications: await prisma.notification.count(),
      connections: await prisma.connection.count(),
      invitations: await prisma.invitation.count(),
      authSessions: await prisma.authSession.count(),
    };

    console.log("Current counts across all database tables:", counts);
    console.log("Database successfully emptied!");
  } catch (err) {
    console.error("Error while emptying database:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

emptyDatabase();

