import crypto from "node:crypto";
import { prisma } from "../../config/database.js";
import { ApiError } from "../../utils/ApiError.js";

export class MessageService {
  /**
   * Get or create a conversation between two users
   */
  static async getOrCreateConversation(user1Id, user2Id) {
    if (!user1Id || !user2Id) {
      throw new ApiError(400, "Both user IDs are required to establish a conversation.");
    }
    if (user1Id === user2Id) {
      throw new ApiError(400, "Cannot start a conversation with yourself.");
    }

    // Normalized ordering
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
