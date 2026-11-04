import { Router } from 'express';
import { PaymentController } from '../controllers/payment.controller.js';

const router = Router();

// Payment provider webhook callbacks
router.post('/razorpay', (req, res, next) => {
  req.params.provider = 'RAZORPAY';
  PaymentController.handleWebhook(req, res, next);
});

router.post('/paypal', (req, res, next) => {
  req.params.provider = 'PAYPAL';
  PaymentController.handleWebhook(req, res, next);
});

export default router;
