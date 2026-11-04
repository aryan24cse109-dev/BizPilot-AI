import { Router } from 'express';
import { ClientController } from '../controllers/client.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/search', ClientController.searchUsers);
router.get('/connections', ClientController.listConnections);
router.post('/connect', ClientController.sendConnectionRequest);
router.post('/connections/:id/respond', ClientController.respondConnection);

export default router;
