import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../app.js';

describe('Invoice Engine & Tenant Isolation Tests', () => {
  let businessToken;
  let businessWorkspaceId;
  let clientUserId;
  let otherBusinessToken;
  let otherWorkspaceId;

  beforeAll(async () => {
    // 1. Log in as seeded business user
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ emailOrUsername: 'business@bizpilot.ai', password: 'Password@123' });
    businessToken = loginRes.body.data.token;
    businessWorkspaceId = loginRes.body.data.user.activeWorkspace.id;

    // 2. Log in as seeded client user
    const clientLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ emailOrUsername: 'rahul@rahulenterprises.com', password: 'Password@123' });
    clientUserId = clientLogin.body.data.user.id;

    // 3. Register a separate third-party business for tenant isolation testing
    const otherUser = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Vikram Joshi',
        email: `vikram_${Date.now()}@otherbiz.com`,
        username: `vikram_${Date.now()}`,
        password: 'Password@123',
        workspaceName: 'Joshi Global Agency',
      });
    otherBusinessToken = otherUser.body.data.token;
    otherWorkspaceId = otherUser.body.data.user.activeWorkspace.id;
  });

  let createdInvoiceId;

  it('should create an invoice with accurate decimal calculations and sequential number', async () => {
    const res = await request(app)
      .post('/api/v1/invoices')
      .set('Authorization', `Bearer ${businessToken}`)
      .set('x-workspace-id', businessWorkspaceId)
      .send({
        clientId: clientUserId,
        dueDate: new Date(Date.now() + 14 * 86400000).toISOString(),
        currency: 'INR',
        items: [
          { description: 'React Frontend Development', quantity: 2, unitPrice: 25000 },
          { description: 'API Integration & Testing', quantity: 1, unitPrice: 15000 }
        ],
        taxRate: 18,
        discountRate: 5,
        notes: 'Deliverable due in 2 weeks',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    const inv = res.body.data;
    createdInvoiceId = inv.id;

    expect(inv.invoiceNumber).toMatch(/^INV-\d{4}-\d{4}$/);
    // Subtotal: 2*25000 + 15000 = 65000.00
    expect(Number(inv.subtotal)).toBe(65000);
    // Tax: 18% of 65000 = 11700.00
    expect(Number(inv.taxAmount)).toBe(11700);
    // Discount: 5% of 65000 = 3250.00
    expect(Number(inv.discountAmount)).toBe(3250);
    // Grand Total: 65000 + 11700 - 3250 = 73450.00
    expect(Number(inv.totalAmount)).toBe(73450);
    expect(Number(inv.balanceDue)).toBe(73450);
    expect(inv.status).toBe('SENT');
  });

  it('TENANT ISOLATION: Workspace B cannot view Workspace A invoice', async () => {
    const res = await request(app)
      .get(`/api/v1/invoices/${createdInvoiceId}`)
      .set('Authorization', `Bearer ${otherBusinessToken}`)
      .set('x-workspace-id', otherWorkspaceId);

    expect(res.status).toBe(500); // Access denied exception
    expect(res.body.success).toBe(false);
  });

  it('should generate valid PDF stream for invoice', async () => {
    const res = await request(app)
      .get(`/api/v1/invoices/${createdInvoiceId}/pdf`)
      .set('Authorization', `Bearer ${businessToken}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
    expect(res.body).toBeDefined();
  });
});
