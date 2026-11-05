import { prisma } from "../../config/database.js";
import { ApiError } from "../../utils/ApiError.js";

export class NotificationService {
  /**
   * List notifications for a user with unread count
   */
  static async listNotifications(userId, options = {}) {
    if (!userId) throw new ApiError(401, "Authentication required.");

    const limit = Math.min(Number(options.limit) || 30, 100);
    const unreadOnly = options.unreadOnly === true || options.unreadOnly === "true";

    const where = {
      userId,
      ...(unreadOnly ? { readAt: null } : {}),
    };

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: {
          userId,
          readAt: null,
        },
      }),
    ]);

    // If a user has zero notifications in database, seed friendly operational notices
    if (notifications.length === 0 && !unreadOnly) {
      const seeded = await NotificationService.seedInitialNotifications(userId);
      return {
        notifications: seeded,
        unreadCount: seeded.filter((n) => !n.readAt).length,
        total: seeded.length,
      };
    }

    return {
      notifications: notifications.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.body,
        data: n.data,
        isRead: Boolean(n.readAt),
        date: n.createdAt.toISOString(),
        readAt: n.readAt ? n.readAt.toISOString() : null,
      })),
      unreadCount,
      total,
    };
  }

  /**
   * Mark a single notification as read
   */
  static async markAsRead(userId, notificationId) {
    if (!userId) throw new ApiError(401, "Authentication required.");

    const notif = await prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notif) {
      throw new ApiError(404, "Notification not found.");
    }

    const updated = await prisma.notification.update({
      where: { id: notificationId },
      data: { readAt: new Date() },
    });

    return {
      id: updated.id,
      isRead: true,
      readAt: updated.readAt.toISOString(),
    };
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(userId) {
    if (!userId) throw new ApiError(401, "Authentication required.");

    await prisma.notification.updateMany({
      where: {
        userId,
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });

    return { success: true };
  }

  /**
   * Delete a notification
   */
  static async deleteNotification(userId, notificationId) {
    if (!userId) throw new ApiError(401, "Authentication required.");

    await prisma.notification.deleteMany({
      where: {
        id: notificationId,
        userId,
      },
    });

    return { success: true };
  }

  /**
   * Create a new notification for a user
   */
  static async createNotification({ userId, type = "SYSTEM_ALERT", title, body, data = null }) {
    if (!userId || !title || !body) return null;

    try {
      return await prisma.notification.create({
        data: {
          userId,
          type,
          title,
          body,
          data,
        },
      });
    } catch (err) {
      console.warn("Could not create notification:", err.message);
      return null;
    }
  }

  /**
   * Helper to seed realistic operational notices for a new active account
   */
  static async seedInitialNotifications(userId) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { businessProfile: true },
      });

      if (!user) return [];

      const isBusiness = user.accountCategory === "BUSINESS" || Boolean(user.businessProfile);

      const toCreate = isBusiness
        ? [
            {
              userId,
              type: "SYSTEM_ALERT",
              title: "Welcome to BizPilot Financial Operations",
              body: "Your unified business workspace is active. Create digital tax invoices and track client settlements instantly.",
              data: { link: "/business/invoices" },
            },
            {
              userId,
              type: "INVOICE_VIEWED",
              title: "AI Assistant & Ledger Ready",
              body: "AI Assistant is connected to generate invoices, summarize ledger metrics, and compose follow-ups in English or Hindi.",
              data: { link: "/business/ai" },
            },
          ]
        : [
            {
              userId,
              type: "SYSTEM_ALERT",
              title: "Client Portal Activated",
              body: "Welcome to your Client Portal. Invoices issued to your email will automatically link to this account.",
              data: { link: "/portal/invoices" },
            },
            {
              userId,
              type: "INVOICE_SENT",
              title: "Verified Settlements Available",
              body: "Review received invoices and complete verified digital payments via UPI, Cards, or NetBanking.",
              data: { link: "/portal/invoices" },
            },
          ];

      const created = [];
      for (const item of toCreate) {
        const n = await prisma.notification.create({ data: item });
        created.push({
          id: n.id,
          type: n.type,
          title: n.title,
          message: n.body,
          data: n.data,
          isRead: false,
          date: n.createdAt.toISOString(),
          readAt: null,
        });
      }
      return created;
    } catch (err) {
      console.warn("Could not seed notifications:", err.message);
      return [];
    }
  }
}
