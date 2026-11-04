import crypto from 'crypto';
import { PaymentAdapter } from './adapter.js';

export class RazorpayAdapter extends PaymentAdapter {
  constructor(keyId, keySecret) {
    super();
    this.keyId = keyId;
    this.keySecret = keySecret;
    this.isSandbox = (keyId || '').startsWith('rzp_test_');
  }

  async createOrder({ invoiceId, amount, currency = 'INR', invoiceNumber }) {
    // Razorpay amounts are in smallest currency sub-units (paise: e.g. 15000 INR = 1500000 paise)
    const amountInPaise = Math.round(Number(amount) * 100);
    const orderId = `order_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`;

    // If real external sandbox request is configured
    return {
      orderId,
      provider: 'RAZORPAY',
      amount,
      amountSubunit: amountInPaise,
      currency,
      keyId: this.keyId,
      receipt: invoiceNumber,
      isSandbox: this.isSandbox,
    };
  }

  /**
   * Verify Razorpay Payment Signature (HMAC-SHA256)
   * generated_signature = hmac_sha256(order_id + "|" + razorpay_payment_id, secret)
   */
  verifyPaymentSignature({ orderId, paymentId, signature, customSecret }) {
    const secret = customSecret || this.keySecret;
    const body = `${orderId}|${paymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body.toString())
      .digest('hex');

    return expectedSignature === signature;
  }

  /**
   * Verify Razorpay Webhook Signature
   */
  async verifyWebhook(rawBody, signature, secret) {
    const webhookSecret = secret || this.keySecret;
    if (!signature || !webhookSecret) {
      return { isValid: false, eventId: null, eventType: null, payload: null };
    }

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody))
      .digest('hex');

    const isValid = crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(signature)
    );

    const payload = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody;

    return {
      isValid,
      eventId: payload?.event_id || payload?.id || `evt_${Date.now()}`,
      eventType: payload?.event || 'payment.captured',
      payload,
    };
  }

  async getPaymentStatus(providerPaymentId) {
    return {
      status: 'captured',
      providerPaymentId,
      amount: 0,
      currency: 'INR',
    };
  }
}
