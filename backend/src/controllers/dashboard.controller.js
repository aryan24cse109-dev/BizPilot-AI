import { DashboardService } from '../services/dashboard.service.js';

export class DashboardController {
  static async getBusinessDashboard(req, res, next) {
    try {
      const data = await DashboardService.getBusinessDashboard(req.workspace.id, req.query);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async getClientDashboard(req, res, next) {
    try {
      const data = await DashboardService.getClientDashboard(req.user.id);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async getBusinessIntelligence(req, res, next) {
    try {
      const data = await DashboardService.getBusinessIntelligence(req.workspace.id);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
}
