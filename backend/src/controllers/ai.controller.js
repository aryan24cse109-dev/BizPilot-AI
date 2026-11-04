import { AIService } from '../services/ai.service.js';
import { VoiceService } from '../services/voice.service.js';

export class AIController {
  static async chat(req, res, next) {
    try {
      const response = await AIService.handleChatQuery({
        userId: req.user.id,
        workspaceId: req.workspace.id,
        message: req.body.message,
        conversationId: req.body.conversationId,
        language: req.body.language,
      });

      res.json({
        success: true,
        data: response,
      });
    } catch (err) {
      next(err);
    }
  }

  static async execute(req, res, next) {
    try {
      const response = await AIService.executeAction({
        actionLogId: req.body.actionLogId,
        userId: req.user.id,
        workspaceId: req.workspace.id,
        confirmed: req.body.confirmed,
        overrides: req.body.overrides,
      });

      res.json({
        success: true,
        data: response,
      });
    } catch (err) {
      next(err);
    }
  }

  static async transcribeVoice(req, res, next) {
    try {
      const result = await VoiceService.transcribe({
        audioBase64: req.body.audio,
        language: req.body.language || 'hi-IN',
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async listConversations(req, res, next) {
    try {
      const list = await AIService.listConversations(req.user.id, req.workspace.id);
      res.json({ success: true, data: list });
    } catch (err) {
      next(err);
    }
  }

  static async getConversation(req, res, next) {
    try {
      const conversation = await AIService.getConversation(req.params.id, req.user.id);
      res.json({ success: true, data: conversation });
    } catch (err) {
      next(err);
    }
  }
}
