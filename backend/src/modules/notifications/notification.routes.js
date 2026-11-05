import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { NotificationController } from "./notification.controller.js";

const router = Router();

router.use(authenticate);

router.get("/", NotificationController.listNotifications);
router.patch("/read-all", NotificationController.markAllAsRead);
router.patch("/:id/read", NotificationController.markAsRead);
router.delete("/:id", NotificationController.deleteNotification);

export default router;

