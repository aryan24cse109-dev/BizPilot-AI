import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireWorkspace } from '../middleware/workspace.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/business', requireWorkspace(), DashboardController.getBusinessDashboard);
router.get('/client', DashboardController.getClientDashboard);
router.get('/analytics', requireWorkspace(), DashboardController.getBusinessIntelligence);

export default router;
