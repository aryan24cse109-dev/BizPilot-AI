import { MessageService } from "./message.service.js";

export class MessageController {
  static async listConversations(req, res, next) {
    try {
      const data = await MessageService.listUserConversations(req.user.id);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async getOrCreateConversation(req, res, next) {
    try {
      const { recipientId, recipient, email } = req.body;
      const target = recipientId || recipient || email;
      const conversation = await MessageService.getOrCreateConversation(req.user.id, target);
      res.json({ success: true, data: conversation });
    } catch (err) {
      next(err);
    }
  }

  static async getMessages(req, res, next) {
    try {
      const messages = await MessageService.getMessages(req.params.id, req.user.id);
      res.json({ success: true, data: messages });
    } catch (err) {
      next(err);
    }
  }

  static async sendMessage(req, res, next) {
    try {
      const message = await MessageService.sendMessage({
        conversationId: req.params.id,
        senderId: req.user.id,
        content: req.body.content,
        activityType: req.body.activityType,
        activityData: req.body.activityData,
      });

      res.status(201).json({ success: true, data: message });
    } catch (err) {
      next(err);
    }
  }
}

