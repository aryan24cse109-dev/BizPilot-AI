import { NotificationService } from "./notification.service.js";

export class NotificationController {
  static async listNotifications(req, res, next) {
    try {
      const result = await NotificationService.listNotifications(req.user.id, req.query);
      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async markAsRead(req, res, next) {
    try {
      const result = await NotificationService.markAsRead(req.user.id, req.params.id);
      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async markAllAsRead(req, res, next) {
    try {
      const result = await NotificationService.markAllAsRead(req.user.id);
      return res.status(200).json({
        success: true,
        message: "All notifications marked as read.",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteNotification(req, res, next) {
    try {
      const result = await NotificationService.deleteNotification(req.user.id, req.params.id);
      return res.status(200).json({
        success: true,
        message: "Notification removed.",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

