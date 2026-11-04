import { Router } from 'express';
import { PaymentController } from '../controllers/payment.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireWorkspace } from '../middleware/workspace.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { createOrderSchema, verifyPaymentSchema } from '../validators/payment.validator.js';

const router = Router();

router.use(authenticate);

// Client creating payment order and verifying capture
router.post('/create-order', validate(createOrderSchema), PaymentController.createOrder);
router.post('/verify', validate(verifyPaymentSchema), PaymentController.verifyPayment);

// Payment history
router.get('/history/workspace', requireWorkspace(), PaymentController.listWorkspacePayments);
router.get('/history/client', PaymentController.listClientPayments);

export default router;
