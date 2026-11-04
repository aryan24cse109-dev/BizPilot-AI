import { WorkspaceService } from '../services/workspace.service.js';

export class WorkspaceController {
  static async listWorkspaces(req, res, next) {
    try {
      const data = await WorkspaceService.listUserWorkspaces(req.user.id);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async createWorkspace(req, res, next) {
    try {
      const workspace = await WorkspaceService.createWorkspace(req.user.id, req.body);
      res.status(201).json({ success: true, data: workspace });
    } catch (err) {
      next(err);
    }
  }

  static async getWorkspace(req, res, next) {
    try {
      const workspaceId = req.params.id || req.workspace.id;
      const workspace = await WorkspaceService.getWorkspaceDetails(workspaceId);
      res.json({ success: true, data: workspace });
    } catch (err) {
      next(err);
    }
  }

  static async updateProfile(req, res, next) {
    try {
      const workspaceId = req.params.id || req.workspace.id;
      const profile = await WorkspaceService.updateBusinessProfile(workspaceId, req.body);
      res.json({ success: true, data: profile });
    } catch (err) {
      next(err);
    }
  }
}
