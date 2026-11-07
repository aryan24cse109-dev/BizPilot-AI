
import { prisma } from "../../config/database.js";
import { ApiError } from "../../utils/ApiError.js";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const OTHER_USER_SELECT = {
  id: true,
  email: true,
  fullName: true,
  username: true,
  accountCategory: true,
  businessProfile: true,
  clientProfile: true,
};

export class MessageService {
  /**
   * Resolve a recipient using:
   * - Registered user's UUID
   * - Registered user's email
   * - Invitation UUID belonging to a registered user
   *
   * Never creates users or accepts invitations.
   */
  static async resolveRecipient(recipient) {
    if (typeof recipient !== "string" || !recipient.trim()) {
      throw new ApiError(400, "A valid recipient is required.");
    }

    const value = recipient.trim();

    // Resolve by email.
    if (value.includes("@")) {
      const user = await prisma.user.findUnique({
        where: { email: value.toLowerCase() },
        select: {
          id: true,
          email: true,
          accountCategory: true,
          status: true,
        },
      });

      if (!user) {
        throw new ApiError(
          404,
          "No registered user was found with this email. The recipient must register before messaging."
        );
      }

      return user;
    }

    if (!UUID_REGEX.test(value)) {
      throw new ApiError(
        400,
        "Recipient must be a valid email address or ID."
      );
    }

    // Resolve by user UUID.
    const user = await prisma.user.findUnique({
      where: { id: value },
      select: {
        id: true,
        email: true,
        accountCategory: true,
        status: true,
      },
    });

    if (user) {
      return user;
    }

    // Resolve invitation UUID without accepting the invitation.
    const invitation = await prisma.invitation.findUnique({
      where: { id: value },
      select: { email: true },
    });

    if (invitation?.email) {
      const invitedUser = await prisma.user.findUnique({
        where: {
          email: invitation.email.trim().toLowerCase(),
        },
        select: {
          id: true,
          email: true,
          accountCategory: true,
          status: true,
        },
      });

      if (invitedUser) {
        return invitedUser;
      }

      throw new ApiError(
        409,
        "The invited person has not registered yet. They must register before messaging."
      );
    }

    throw new ApiError(
      404,
      "Recipient user or invitation could not be found."
    );
  }

  /**
   * Verify an active business-client connection.
   * This method never creates or reactivates connections.
   */
  static async verifyActiveConnection(user1, user2) {
    const isBusinessClientPair =
      (user1.accountCategory === "BUSINESS" &&
        user2.accountCategory === "CLIENT") ||
      (user1.accountCategory === "CLIENT" &&
        user2.accountCategory === "BUSINESS");

    if (!isBusinessClientPair) {
      throw new ApiError(
        403,
        "Messaging is only available between a business and its connected client."
      );
    }

    const businessUserId =
      user1.accountCategory === "BUSINESS" ? user1.id : user2.id;

    const clientUserId =
      user1.accountCategory === "CLIENT" ? user1.id : user2.id;

    const connection = await prisma.connection.findUnique({
      where: {
        businessUserId_clientUserId: {
          businessUserId,
          clientUserId,
        },
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!connection || connection.status !== "ACTIVE") {
      throw new ApiError(
        403,
        "You can only message users with an active business-client connection."
      );
    }

    return connection;
  }

  /**
   * Get or create a conversation between two actively connected users.
   */
  static async getOrCreateConversation(user1Id, recipient) {
    if (!user1Id || !recipient) {
      throw new ApiError(
        400,
        "Both the current user and a valid recipient are required."
      );
    }

    if (!UUID_REGEX.test(user1Id)) {
      throw new ApiError(400, "Invalid current user ID.");
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: user1Id },
      select: {
        id: true,
        email: true,
        accountCategory: true,
        status: true,
      },
    });

    if (!currentUser) {
      throw new ApiError(404, "Current user could not be found.");
    }

    const targetUser = await this.resolveRecipient(recipient);

    if (currentUser.id === targetUser.id) {
      throw new ApiError(
        400,
        "You cannot start a conversation with yourself."
      );
    }

    if (
      currentUser.status !== "ACTIVE" ||
      targetUser.status !== "ACTIVE"
    ) {
      throw new ApiError(
        403,
        "Both users must have active accounts to message."
      );
    }

    await this.verifyActiveConnection(currentUser, targetUser);

    // Consistent participant ordering prevents duplicate conversations.
    const [user1, user2] = [currentUser.id, targetUser.id].sort();

    const conversation = await prisma.conversation.upsert({
      where: {
        user1Id_user2Id: {
          user1Id: user1,
          user2Id: user2,
        },
      },
      update: {},
      create: {
        user1Id: user1,
        user2Id: user2,
      },
    });

    const otherUser = await prisma.user.findUnique({
      where: { id: targetUser.id },
      select: OTHER_USER_SELECT,
    });

    return {
      ...conversation,
      otherUser,
    };
  }

  /**
   * List conversations belonging to the authenticated user.
   */
  static async listUserConversations(userId) {
    if (!UUID_REGEX.test(userId)) {
      throw new ApiError(400, "Invalid user ID.");
    }

    const conversations = await prisma.conversation.findMany({
      where: {
        OR: [
          { user1Id: userId },
          { user2Id: userId },
        ],
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    return Promise.all(
      conversations.map(async (conversation) => {
        const otherUserId =
          conversation.user1Id === userId
            ? conversation.user2Id
            : conversation.user1Id;

        const [otherUser, lastMessage, unreadCount] = await Promise.all([
          prisma.user.findUnique({
            where: { id: otherUserId },
            select: OTHER_USER_SELECT,
          }),

          prisma.message.findFirst({
            where: {
              conversationId: conversation.id,
            },
            orderBy: {
              createdAt: "desc",
            },
          }),

          prisma.message.count({
            where: {
              conversationId: conversation.id,
              senderId: { not: userId },
              isRead: false,
            },
          }),
        ]);

        return {
          id: conversation.id,
          otherUser,
          lastMessage,
          unreadCount,
          updatedAt: conversation.updatedAt,
        };
      })
    );
  }

  /**
   * Get messages and mark incoming messages as read.
   */
  static async getMessages(conversationId, userId) {
    if (!UUID_REGEX.test(conversationId)) {
      throw new ApiError(400, "Invalid conversation ID.");
    }

    if (!UUID_REGEX.test(userId)) {
      throw new ApiError(400, "Invalid user ID.");
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: {
        id: true,
        user1Id: true,
        user2Id: true,
      },
    });

    if (
      !conversation ||
      (conversation.user1Id !== userId &&
        conversation.user2Id !== userId)
    ) {
      throw new ApiError(
        404,
        "Conversation not found or access denied."
      );
    }

    const messages = await prisma.$transaction(async (tx) => {
      await tx.message.updateMany({
        where: {
          conversationId,
          senderId: { not: userId },
          isRead: false,
        },
        data: {
          isRead: true,
        },
      });

      return tx.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: "asc" },
      });
    });

    return messages.map((message) => ({
      ...message,
      isSender: message.senderId === userId,
    }));
  }

  /**
   * Send a message to an active conversation participant.
   */
  static async sendMessage({
    conversationId,
    senderId,
    content,
    activityType,
    activityData,
  }) {
    if (!UUID_REGEX.test(conversationId)) {
      throw new ApiError(400, "Invalid conversation ID.");
    }

    if (!UUID_REGEX.test(senderId)) {
      throw new ApiError(400, "Invalid sender ID.");
    }

    if (typeof content !== "string" || !content.trim()) {
      throw new ApiError(400, "Message content cannot be empty.");
    }

    const cleanContent = content.trim();

    if (activityType != null && typeof activityType !== "string") {
      throw new ApiError(400, "Activity type must be a string.");
    }

    if (activityType && activityType.length > 100) {
      throw new ApiError(
        400,
        "Activity type cannot exceed 100 characters."
      );
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: {
        id: true,
        user1Id: true,
        user2Id: true,
      },
    });

    if (
      !conversation ||
      (conversation.user1Id !== senderId &&
        conversation.user2Id !== senderId)
    ) {
      throw new ApiError(
        404,
        "Conversation not found or access denied."
      );
    }

    const recipientId =
      conversation.user1Id === senderId
        ? conversation.user2Id
        : conversation.user1Id;

    // Recheck connection status before accepting a new message.
    const [sender, recipient] = await Promise.all([
      prisma.user.findUnique({
        where: { id: senderId },
        select: {
          id: true,
          fullName: true,
          accountCategory: true,
          status: true,
          businessProfile: {
            select: {
              businessName: true,
            },
          },
        },
      }),

      prisma.user.findUnique({
        where: { id: recipientId },
        select: {
          id: true,
          accountCategory: true,
          status: true,
        },
      }),
    ]);

    if (!sender || !recipient) {
      throw new ApiError(404, "Conversation participant not found.");
    }

    if (
      sender.status !== "ACTIVE" ||
      recipient.status !== "ACTIVE"
    ) {
      throw new ApiError(
        403,
        "Both users must have active accounts to message."
      );
    }

    await this.verifyActiveConnection(sender, recipient);

    const senderName =
      sender.businessProfile?.businessName ||
      sender.fullName ||
      "Contact";

    // Save message and update conversation timestamp atomically.
    const message = await prisma.$transaction(async (tx) => {
      const createdMessage = await tx.message.create({
        data: {
          conversationId,
          senderId,
          senderType: "USER",
          content: cleanContent,
          ...(activityType ? { activityType } : {}),
          ...(activityData !== undefined && activityData !== null
            ? { activityData }
            : {}),
        },
      });

      await tx.conversation.update({
        where: { id: conversationId },
        data: {
          updatedAt: new Date(),
        },
      });

      return createdMessage;
    });

    // Notifications are best-effort.
    // A notification failure must not undo a saved message.
    try {
      await prisma.notification.create({
        data: {
          userId: recipientId,
          type: "SYSTEM_ALERT",
          title: `New message from ${senderName}`,
          body:
            cleanContent.length > 90
              ? `${cleanContent.slice(0, 87)}...`
              : cleanContent,
          data: {
            conversationId,
            senderId,
            messageId: message.id,
          },
        },
      });
    } catch (error) {
      console.error(
        "Failed to create message notification:",
        error
      );
    }

    return {
      ...message,
      isSender: true,
    };
  }
}
