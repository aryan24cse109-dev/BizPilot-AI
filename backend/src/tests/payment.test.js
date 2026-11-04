import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../app.js';

describe('Payment Engine, Idempotency & Webhook Verification', () => {
  let clientToken;
  let clientUserId;
  let businessToken;
  let businessWorkspaceId;
  let invoiceId;
  let invoiceTotal;

  beforeAll(async () => {
    // Business login
    const bRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ emailOrUsername: 'business@bizpilot.ai', password: 'Password@123' });
    businessToken = bRes.body.data.token;
    businessWorkspaceId = bRes.body.data.user.activeWorkspace.id;

    // Client login
    const cRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ emailOrUsername: 'rahul@rahulenterprises.com', password: 'Password@123' });
    clientToken = cRes.body.data.token;
    clientUserId = cRes.body.data.user.id;

    // Create a new fresh invoice for payment testing
    const invRes = await request(app)
      .post('/api/v1/invoices')
      .set('Authorization', `Bearer ${businessToken}`)
      .set('x-workspace-id', businessWorkspaceId)
      .send({
        clientId: clientUserId,
        dueDate: new Date(Date.now() + 7 * 86400000).toISOString(),
        currency: 'INR',
        items: [{ description: 'Payment Test Milestone', quantity: 1, unitPrice: 10000 }],
        taxRate: 0,
      });

    invoiceId = invRes.body.data.id;
    invoiceTotal = Number(invRes.body.data.totalAmount); // 10000
  });

  it('should create a payment order for the client', async () => {
    const res = await request(app)
      .post('/api/v1/payments/create-order')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        invoiceId,
        provider: 'RAZORPAY',
        amount: 5000, // partial payment
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.orderId).toBeDefined();
    expect(res.body.data.amount).toBe(5000);
  });

  it('should process a verified partial payment and change invoice to PARTIALLY_PAID', async () => {
    const paymentId = `pay_test_${Date.now()}`;
    const orderId = `order_test_${Date.now()}`;

    const res = await request(app)
      .post('/api/v1/payments/verify')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        invoiceId,
        provider: 'RAZORPAY',
        providerOrderId: orderId,
        providerPaymentId: paymentId,
        signature: 'sandbox_sig_valid',
        amount: 5000,
        currency: 'INR',
        paymentMethod: 'UPI',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.invoice.status).toBe('PARTIALLY_PAID');
    expect(Number(res.body.data.invoice.paidAmount)).toBe(5000);
    expect(Number(res.body.data.invoice.balanceDue)).toBe(5000);
  });

  it('IDEMPOTENCY: Re-submitting the exact same payment does NOT double charge', async () => {
    const paymentId = `pay_idempotent_${Date.now()}`;
    const orderId = `order_idempotent_${Date.now()}`;

    // First attempt
    const res1 = await request(app)
      .post('/api/v1/payments/verify')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        invoiceId,
        provider: 'RAZORPAY',
        providerOrderId: orderId,
        providerPaymentId: paymentId,
        signature: 'sandbox_sig_valid',
        amount: 5000,
        currency: 'INR',
      });

    expect(res1.status).toBe(200);
    expect(res1.body.data.alreadyProcessed).toBe(false);
    expect(res1.body.data.invoice.status).toBe('PAID');
    expect(Number(res1.body.data.invoice.balanceDue)).toBe(0);

    // Duplicate second attempt with identical providerPaymentId
    const res2 = await request(app)
      .post('/api/v1/payments/verify')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        invoiceId,
        provider: 'RAZORPAY',
        providerOrderId: orderId,
        providerPaymentId: paymentId,
        signature: 'sandbox_sig_valid',
        amount: 5000,
        currency: 'INR',
      });

    expect(res2.status).toBe(200);
    expect(res2.body.data.alreadyProcessed).toBe(true);
    expect(Number(res2.body.data.invoice.balanceDue)).toBe(0);
  });
});
