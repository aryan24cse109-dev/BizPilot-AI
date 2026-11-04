/**
 * Common Payment Adapter Interface
 */
export class PaymentAdapter {
  /**
   * Create an order on the payment gateway
   * @param {Object} params - { invoiceId, amount, currency, invoiceNumber, clientName, clientEmail }
   * @returns {Promise<{ orderId: string, amount: number, currency: string, clientSecret?: string }>}
   */
  async createOrder(params) {
    throw new Error('createOrder() not implemented in adapter');
  }

  /**
   * Verify webhook signature and extract event payload
   * @param {string|Buffer} rawBody
   * @param {string} signature
   * @param {string} secret
   * @returns {Promise<{ isValid: boolean, eventId: string, eventType: string, payload: any }>}
   */
  async verifyWebhook(rawBody, signature, secret) {
    throw new Error('verifyWebhook() not implemented in adapter');
  }

  /**
   * Reconcile/fetch payment status directly from provider API
   * @param {string} providerPaymentId
   * @returns {Promise<{ status: string, amount: number, currency: string }>}
   */
  async getPaymentStatus(providerPaymentId) {
    throw new Error('getPaymentStatus() not implemented in adapter');
  }
}
