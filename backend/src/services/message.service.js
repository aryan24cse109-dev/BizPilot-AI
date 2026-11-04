import prisma from '../config/db.js';

export class MessageService {
  /**
   * Get or create conversation between two connected users
   */
  static async getOrCreateConversation(user1Id, user2Id) {
    // Check if connected
    const connection = await prisma.connection.findFirst({
      where: {
        status: 'ACCEPTED',
        OR: [
          { senderId: user1Id, receiverId: user2Id },
          { senderId: user2Id, receiverId: user1Id }
        ]
      }
    });

    if (!connection) {
      throw new Error('You can only message users with whom you have an accepted connection.');
    }

    // Normalized ordering
    const [u1, u2] = [user1Id, user2Id].sort();

    let conversation = await prisma.conversation.findUnique({
      where: {
        user1Id_user2Id: { user1Id: u1, user2Id: u2 }
      },
      include: {
        user1: { select: { id: true, name: true, username: true, profile: true } },
        user2: { select: { id: true, name: true, username: true, profile: true } }
      }
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: { user1Id: u1, user2Id: u2 },
        include: {
          user1: { select: { id: true, name: true, username: true, profile: true } },
          user2: { select: { id: true, name: true, username: true, profile: true } }
        }
      });
    }

    return conversation;
  }

  /**
   * List all conversations for current user
   */
  static async listUserConversations(userId) {
    const conversations = await prisma.conversation.findMany({
      where: {
        OR: [
          { user1Id: userId },
          { user2Id: userId }
        ]
      },
      include: {
        user1: { select: { id: true, name: true, username: true, profile: true } },
        user2: { select: { id: true, name: true, username: true, profile: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    return conversations.map(c => {
      const otherUser = c.user1Id === userId ? c.user2 : c.user1;
      return {
        id: c.id,
        otherUser,
        lastMessage: c.messages[0] || null,
        updatedAt: c.updatedAt,
      };
    });
  }

  /**
   * Get messages in conversation
   */
  static async getMessages(conversationId, userId) {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId }
    });

    if (!conversation || (conversation.user1Id !== userId && conversation.user2Id !== userId)) {
      throw new Error('Conversation not found or unauthorized.');
    }

    // Mark messages as read
    await prisma.message.updateMany({
      where: {
        conversationId,
        senderId: { not: userId },
        isRead: false,
      },
      data: { isRead: true }
    });

    return await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: { select: { id: true, name: true, username: true } }
      }
    });
  }

  /**
   * Send a message
   */
  static async sendMessage({ conversationId, senderId, content, activityType, activityData }) {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId }
    });

    if (!conversation || (conversation.user1Id !== senderId && conversation.user2Id !== senderId)) {
      throw new Error('Unauthorized conversation.');
    }

    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId,
        senderType: activityType ? 'SYSTEM' : 'USER',
        content,
        activityType,
        activityData,
      },
      include: {
        sender: { select: { id: true, name: true, username: true } }
      }
    });

    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() }
    });

    return message;
  }
}
