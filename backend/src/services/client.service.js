import prisma from '../config/db.js';

export class ClientService {
  /**
   * Search registered users by username or business name.
   * Privacy rule: Does not expose private email addresses in public search results.
   */
  static async searchUsers(currentUserId, query) {
    if (!query || query.trim().length < 2) return [];

    const users = await prisma.user.findMany({
      where: {
        id: { not: currentUserId },
        accountStatus: 'ACTIVE',
        OR: [
          { username: { contains: query, mode: 'insensitive' } },
          { name: { contains: query, mode: 'insensitive' } },
          {
            workspacesOwned: {
              some: {
                name: { contains: query, mode: 'insensitive' }
              }
            }
          }
        ]
      },
      select: {
        id: true,
        name: true,
        username: true,
        profile: {
          select: { avatarUrl: true }
        },
        workspacesOwned: {
          select: { id: true, name: true, businessProfile: { select: { businessType: true, city: true } } }
        }
      },
      take: 10,
    });

    // Determine connection status with current user
    const userIds = users.map(u => u.id);
    const existingConnections = await prisma.connection.findMany({
      where: {
        OR: [
          { senderId: currentUserId, receiverId: { in: userIds } },
          { receiverId: currentUserId, senderId: { in: userIds } }
        ]
      }
    });

    const connMap = new Map();
    existingConnections.forEach(c => {
      const otherId = c.senderId === currentUserId ? c.receiverId : c.senderId;
      connMap.set(otherId, { status: c.status, connectionId: c.id, isSender: c.senderId === currentUserId });
    });

    return users.map(u => ({
      ...u,
      connection: connMap.get(u.id) || null,
    }));
  }

  /**
   * Send a connection request
   */
  static async sendConnectionRequest(senderId, receiverId, notes) {
    if (senderId === receiverId) {
      throw new Error('You cannot connect with your own account.');
    }

    const receiver = await prisma.user.findUnique({ where: { id: receiverId } });
    if (!receiver) throw new Error('User not found.');

    const existing = await prisma.connection.findFirst({
      where: {
        OR: [
          { senderId, receiverId },
          { senderId: receiverId, receiverId: senderId }
        ]
      }
    });

    if (existing) {
      if (existing.status === 'ACCEPTED') throw new Error('You are already connected with this user.');
      if (existing.status === 'PENDING') throw new Error('A connection request is already pending.');
      // If rejected, update to pending
      return await prisma.connection.update({
        where: { id: existing.id },
        data: { senderId, receiverId, status: 'PENDING', notes }
      });
    }

    const connection = await prisma.connection.create({
      data: {
        senderId,
        receiverId,
        status: 'PENDING',
        notes,
      }
    });

    await prisma.notification.create({
      data: {
        userId: receiverId,
        type: 'CONNECTION_REQUEST',
        title: 'New Connection Request',
        message: 'A business user has sent you a connection request.',
        linkUrl: '/clients',
        metadata: { connectionId: connection.id },
      }
    });

    return connection;
  }

  /**
   * Accept or reject connection request
   */
  static async respondToConnectionRequest(connectionId, userId, accept = true) {
    const connection = await prisma.connection.findUnique({
      where: { id: connectionId }
    });

    if (!connection || connection.receiverId !== userId) {
      throw new Error('Connection request not found or unauthorized.');
    }

    const updated = await prisma.connection.update({
      where: { id: connectionId },
      data: {
        status: accept ? 'ACCEPTED' : 'REJECTED',
      }
    });

    if (accept) {
      await prisma.notification.create({
        data: {
          userId: connection.senderId,
          type: 'CONNECTION_ACCEPTED',
          title: 'Connection Accepted',
          message: 'Your connection request was accepted! You can now send invoices and messages.',
          linkUrl: '/clients',
        }
      });
    }

    return updated;
  }

  /**
   * List connected clients and pending requests for current user
   */
  static async listConnections(userId) {
    const connections = await prisma.connection.findMany({
      where: {
        OR: [
          { senderId: userId },
          { receiverId: userId }
        ]
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            username: true,
            email: true,
            profile: true,
            workspacesOwned: { select: { name: true } }
          }
        },
        receiver: {
          select: {
            id: true,
            name: true,
            username: true,
            email: true,
            profile: true,
            workspacesOwned: { select: { name: true } }
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    const accepted = [];
    const pendingIncoming = [];
    const pendingOutgoing = [];

    connections.forEach(c => {
      const isSender = c.senderId === userId;
      const otherUser = isSender ? c.receiver : c.sender;

      if (c.status === 'ACCEPTED') {
        accepted.push({
          connectionId: c.id,
          user: otherUser,
          connectedAt: c.updatedAt,
        });
      } else if (c.status === 'PENDING') {
        if (isSender) {
          pendingOutgoing.push({ connectionId: c.id, user: otherUser, createdAt: c.createdAt });
        } else {
          pendingIncoming.push({ connectionId: c.id, user: otherUser, createdAt: c.createdAt, notes: c.notes });
        }
      }
    });

    return {
      accepted,
      pendingIncoming,
      pendingOutgoing,
    };
  }
}
