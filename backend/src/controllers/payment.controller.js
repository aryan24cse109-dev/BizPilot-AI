import { PaymentService } from '../services/payment.service.js';

export class PaymentController {
  static async createOrder(req, res, next) {
    try {
      const order = await PaymentService.createOrder({
        ...req.body,
        actorId: req.user.id,
      });

      res.status(201).json({
        success: true,
        data: order,
      });
    } catch (err) {
      next(err);
    }
  }

  static async verifyPayment(req, res, next) {
    try {
      const result = await PaymentService.verifyAndRecordPayment(req.body);
      res.json({
        success: true,
        message: result.message,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async listWorkspacePayments(req, res, next) {
    try {
      const data = await PaymentService.listWorkspacePayments(req.workspace.id, req.query);
      res.json({ success: true, ...data });
    } catch (err) {
      next(err);
    }
  }

  static async listClientPayments(req, res, next) {
    try {
      const data = await PaymentService.listClientPayments(req.user.id, req.query);
      res.json({ success: true, ...data });
    } catch (err) {
      next(err);
    }
  }

  static async handleWebhook(req, res, next) {
    try {
      const provider = req.params.provider?.toUpperCase();
      const signature = req.headers['x-razorpay-signature'] || req.headers['paypal-transmission-sig'];
      const result = await PaymentService.handleWebhook(provider, req.body, signature);

      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }
}
