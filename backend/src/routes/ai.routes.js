import { Router } from 'express';
import { AIController } from '../controllers/ai.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireWorkspace } from '../middleware/workspace.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { aiChatSchema, aiExecuteSchema } from '../validators/ai.validator.js';

const router = Router();

router.use(authenticate);

router.post('/chat', requireWorkspace(), validate(aiChatSchema), AIController.chat);
router.post('/execute', requireWorkspace(['OWNER', 'ADMIN', 'FINANCE_MANAGER']), validate(aiExecuteSchema), AIController.execute);
router.post('/voice/transcribe', requireWorkspace(), AIController.transcribeVoice);
router.get('/conversations', requireWorkspace(), AIController.listConversations);
router.get('/conversations/:id', AIController.getConversation);

export default router;
