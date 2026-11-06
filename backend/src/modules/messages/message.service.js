import crypto from "node:crypto";
import { prisma } from "../../config/database.js";
import { ApiError } from "../../utils/ApiError.js";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class MessageService {
  /**
   * Get or create a conversation between two users
   */
  static async getOrCreateConversation(user1Id, recipient) {
    if (!user1Id || !recipient) {
      throw new ApiError(400, "Both user IDs or a valid recipient are required to establish a conversation.");
    }

    if (user1Id === recipient) {
      throw new ApiError(400, "Cannot start a conversation with yourself.");
    }

    let user2Id = recipient;

    // 1. If recipient is an email address
    if (typeof recipient === "string" && recipient.includes("@")) {
      const normalizedEmail = recipient.toLowerCase().trim();
      let targetUser = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });

      if (!targetUser) {
        // Find existing invitation or invoice to get client details
        const invitation = await prisma.invitation.findFirst({
          where: { email: normalizedEmail },
        });
        const invoice = await prisma.invoice.findFirst({
          where: { clientEmail: normalizedEmail },
        });

        const clientName =
          invitation?.clientName || invoice?.clientName || normalizedEmail.split("@")[0];

        const usernameBase =
          normalizedEmail
            .split("@")[0]
            .toLowerCase()
            .replace(/[^a-z0-9_]/g, "")
            .slice(0, 30) || "client";
        const username = `${usernameBase}_${crypto.randomBytes(3).toString("hex")}`;

        // Auto-provision client user account so messaging is immediate
        targetUser = await prisma.user.create({
          data: {
            email: normalizedEmail,
            username,
            fullName: clientName,
            accountCategory: "CLIENT",
            status: "ACTIVE",
            onboardingCompleted: true,
          },
        });

        await prisma.clientProfile
          .create({
            data: {
              userId: targetUser.id,
              billingAddress: invitation?.company || "",
            },
          })
          .catch(() => {});

        // Link pending invitations & unlinked invoices
        await prisma.invitation
          .updateMany({
            where: { email: normalizedEmail },
            data: { status: "ACCEPTED", acceptedAt: new Date(), acceptedByUserId: targetUser.id },
          })
          .catch(() => {});

        await prisma.invoice
          .updateMany({
            where: { clientEmail: normalizedEmail },
            data: { clientUserId: targetUser.id },
          })
          .catch(() => {});
      }

      user2Id = targetUser.id;
    } else {
      // 2. Check if recipient is a user ID or invitation ID
      let targetUser = null;
      if (UUID_REGEX.test(recipient)) {
        targetUser = await prisma.user.findUnique({
          where: { id: recipient },
        });
      }

      if (!targetUser) {
        if (UUID_REGEX.test(recipient)) {
          const invitation = await prisma.invitation.findUnique({
            where: { id: recipient },
          });
          if (invitation) {
            return this.getOrCreateConversation(user1Id, invitation.email);
          }
        }
        throw new ApiError(404, "Recipient client or user could not be found.");
      }

      user2Id = targetUser.id;
    }

    if (user1Id === user2Id) {
      throw new ApiError(400, "Cannot start a conversation with yourself.");
    }

    // Ensure active connection exists between the two users
    await prisma.connection
      .upsert({
        where: {
          businessUserId_clientUserId: {
            businessUserId: user1Id,
            clientUserId: user2Id,
          },
        },
        update: { status: "ACTIVE" },
        create: {
          businessUserId: user1Id,
          clientUserId: user2Id,
          status: "ACTIVE",
          acceptedAt: new Date(),
        },
      })
      .catch(async () => {
        await prisma.connection
          .upsert({
            where: {
              businessUserId_clientUserId: {
                businessUserId: user2Id,
                clientUserId: user1Id,
              },
            },
            update: { status: "ACTIVE" },
            create: {
              businessUserId: user2Id,
              clientUserId: user1Id,
              status: "ACTIVE",
              acceptedAt: new Date(),
            },
          })
          .catch(() => {});
      });

    // Normalized ordering for conversation pair
    const [u1, u2] = [user1Id, user2Id].sort();

    const existing = await prisma.$queryRawUnsafe(
      `SELECT * FROM "Conversation" WHERE "user1Id" = $1 AND "user2Id" = $2 LIMIT 1`,
      u1,
      u2
    );

    let conversation = existing[0];

    if (!conversation) {
      const id = crypto.randomUUID();
      const now = new Date();
      await prisma.$queryRawUnsafe(
        `INSERT INTO "Conversation" (id, "user1Id", "user2Id", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5)`,
        id,
        u1,
        u2,
        now,
        now
      );
      conversation = { id, user1Id: u1, user2Id: u2, createdAt: now, updatedAt: now };
    }

    const otherUserId = conversation.user1Id === user1Id ? conversation.user2Id : conversation.user1Id;
    const otherUser = await prisma.user.findUnique({
      where: { id: otherUserId },
      select: {
        id: true,
        email: true,
        fullName: true,
        username: true,
        accountCategory: true,
        businessProfile: true,
        clientProfile: true,
      },
    });

    return {
      ...conversation,
      otherUser,
    };
  }

  /**
   * List all conversations for current user
   */
  static async listUserConversations(userId) {
    const conversations = await prisma.$queryRawUnsafe(
      `SELECT * FROM "Conversation" WHERE "user1Id" = $1 OR "user2Id" = $1 ORDER BY "updatedAt" DESC`,
      userId
    );

    const results = [];
    for (const c of conversations) {
      const otherUserId = c.user1Id === userId ? c.user2Id : c.user1Id;
      const otherUser = await prisma.user.findUnique({
        where: { id: otherUserId },
        select: {
          id: true,
          email: true,
          fullName: true,
          username: true,
          accountCategory: true,
          businessProfile: true,
          clientProfile: true,
        },
      });

      const messages = await prisma.$queryRawUnsafe(
        `SELECT * FROM "Message" WHERE "conversationId" = $1 ORDER BY "createdAt" DESC LIMIT 1`,
        c.id
      );

      const unreadCountRows = await prisma.$queryRawUnsafe(
        `SELECT count(*) FROM "Message" WHERE "conversationId" = $1 AND "senderId" != $2 AND "isRead" = false`,
        c.id,
        userId
      );
      const unreadCount = Number(unreadCountRows[0]?.count || 0);

      results.push({
        id: c.id,
        otherUser,
        lastMessage: messages[0] || null,
        unreadCount,
        updatedAt: c.updatedAt,
      });
    }

    return results;
  }

  /**
   * Get all messages in a conversation
   */
  static async getMessages(conversationId, userId) {
    const convRows = await prisma.$queryRawUnsafe(
      `SELECT * FROM "Conversation" WHERE id = $1 LIMIT 1`,
      conversationId
    );
    const conversation = convRows[0];

    if (!conversation || (conversation.user1Id !== userId && conversation.user2Id !== userId)) {
      throw new ApiError(404, "Conversation not found or access denied.");
    }

    // Mark messages as read
    await prisma.$queryRawUnsafe(
      `UPDATE "Message" SET "isRead" = true, "updatedAt" = $1 WHERE "conversationId" = $2 AND "senderId" != $3 AND "isRead" = false`,
      new Date(),
      conversationId,
      userId
    );

    const messages = await prisma.$queryRawUnsafe(
      `SELECT * FROM "Message" WHERE "conversationId" = $1 ORDER BY "createdAt" ASC`,
      conversationId
    );

    return messages.map((m) => ({
      ...m,
      isSender: m.senderId === userId,
    }));
  }

  /**
   * Send a message
   */
  static async sendMessage({ conversationId, senderId, content, activityType, activityData }) {
    if (!content || !content.trim()) {
      throw new ApiError(400, "Message content cannot be empty.");
    }

    const convRows = await prisma.$queryRawUnsafe(
      `SELECT * FROM "Conversation" WHERE id = $1 LIMIT 1`,
      conversationId
    );
    const conversation = convRows[0];

    if (!conversation || (conversation.user1Id !== senderId && conversation.user2Id !== senderId)) {
      throw new ApiError(404, "Conversation not found or access denied.");
    }

    const id = crypto.randomUUID();
    const now = new Date();

    await prisma.$queryRawUnsafe(
      `INSERT INTO "Message" (id, "conversationId", "senderId", "senderType", content, "activityType", "activityData", "isRead", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, 'USER', $4, $5, $6, false, $7, $8)`,
      id,
      conversationId,
      senderId,
      content.trim(),
      activityType || null,
      activityData ? JSON.stringify(activityData) : null,
      now,
      now
    );

    await prisma.$queryRawUnsafe(
      `UPDATE "Conversation" SET "updatedAt" = $1 WHERE id = $2`,
      now,
      conversationId
    );

    // Notify recipient in real-time
    const otherUserId = conversation.user1Id === senderId ? conversation.user2Id : conversation.user1Id;
    const sender = await prisma.user.findUnique({
      where: { id: senderId },
      select: { fullName: true, businessProfile: { select: { businessName: true } } },
    });
    const senderName = sender?.businessProfile?.businessName || sender?.fullName || "Contact";

    await prisma.notification
      .create({
        data: {
          userId: otherUserId,
          type: "SYSTEM_ALERT",
          title: `New message from ${senderName}`,
          body: content.trim().length > 90 ? `${content.trim().slice(0, 87)}...` : content.trim(),
          data: { conversationId, senderId },
        },
      })
      .catch(() => {});

    return {
      id,
      conversationId,
      senderId,
      content: content.trim(),
      activityType: activityType || null,
      activityData: activityData || null,
      isRead: false,
      createdAt: now,
      updatedAt: now,
      isSender: true,
    };
  }
}

