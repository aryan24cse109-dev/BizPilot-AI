import { Router } from 'express';
import { WorkspaceController } from '../controllers/workspace.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireWorkspace } from '../middleware/workspace.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/', WorkspaceController.listWorkspaces);
router.post('/', WorkspaceController.createWorkspace);
router.get('/current', requireWorkspace(), WorkspaceController.getWorkspace);
router.put('/current/profile', requireWorkspace(['OWNER', 'ADMIN']), WorkspaceController.updateProfile);
router.get('/:id', requireWorkspace(), WorkspaceController.getWorkspace);

export default router;
