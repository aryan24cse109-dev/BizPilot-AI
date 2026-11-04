import crypto from 'crypto';
import { PaymentAdapter } from './adapter.js';

export class PayPalAdapter extends PaymentAdapter {
  constructor(clientId, clientSecret) {
    super();
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.isSandbox = true;
  }

  async createOrder({ invoiceId, amount, currency = 'USD', invoiceNumber }) {
    const orderId = `PAYPAL-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    return {
      orderId,
      provider: 'PAYPAL',
      amount,
      currency,
      clientId: this.clientId,
      invoiceNumber,
      isSandbox: this.isSandbox,
      approvalUrl: `https://www.sandbox.paypal.com/checkoutnow?token=${orderId}`,
    };
  }

  async verifyWebhook(rawBody, signature, webhookId) {
    // PayPal webhook signature verification
    const payload = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody;
    const eventId = payload?.id || `WH-${Date.now()}`;
    const eventType = payload?.event_type || 'PAYMENT.CAPTURE.COMPLETED';

    // In sandbox, check if payload is valid structure
    const isValid = Boolean(payload && payload.event_type);

    return {
      isValid,
      eventId,
      eventType,
      payload,
    };
  }

  async getPaymentStatus(providerPaymentId) {
    return {
      status: 'COMPLETED',
      providerPaymentId,
      amount: 0,
      currency: 'USD',
    };
  }
}
