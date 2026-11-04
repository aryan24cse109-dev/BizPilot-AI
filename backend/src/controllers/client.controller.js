import { ClientService } from '../services/client.service.js';

export class ClientController {
  static async searchUsers(req, res, next) {
    try {
      const results = await ClientService.searchUsers(req.user.id, req.query.q);
      res.json({ success: true, data: results });
    } catch (err) {
      next(err);
    }
  }

  static async sendConnectionRequest(req, res, next) {
    try {
      const connection = await ClientService.sendConnectionRequest(
        req.user.id,
        req.body.receiverId,
        req.body.notes
      );
      res.status(201).json({
        success: true,
        message: 'Connection request sent successfully.',
        data: connection,
      });
    } catch (err) {
      next(err);
    }
  }

  static async respondConnection(req, res, next) {
    try {
      const { id } = req.params;
      const { accept } = req.body;
      const connection = await ClientService.respondToConnectionRequest(id, req.user.id, accept !== false);
      res.json({
        success: true,
        message: accept ? 'Connection accepted!' : 'Connection request declined.',
        data: connection,
      });
    } catch (err) {
      next(err);
    }
  }

  static async listConnections(req, res, next) {
    try {
      const data = await ClientService.listConnections(req.user.id);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
}
