import { Router } from 'express';
import { MessageController } from '../controllers/message.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/', MessageController.listConversations);
router.post('/start', MessageController.getOrCreateConversation);
router.get('/:id', MessageController.getMessages);
router.post('/:id', MessageController.sendMessage);

export default router;
