import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../app.js';

describe('AI Business Assistant Engine Tests', () => {
  let businessToken;
  let workspaceId;

  beforeAll(async () => {
    const bRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ emailOrUsername: 'business@bizpilot.ai', password: 'Password@123' });
    businessToken = bRes.body.data.token;
    workspaceId = bRes.body.data.user.activeWorkspace.id;
  });

  let actionLogId;

  it('should parse Hinglish command: "Rahul ke liye 15000 rupees ka invoice banao for website development"', async () => {
    const res = await request(app)
      .post('/api/v1/ai/chat')
      .set('Authorization', `Bearer ${businessToken}`)
      .set('x-workspace-id', workspaceId)
      .send({
        message: 'Rahul ke liye 15000 rupees ka invoice banao for website development',
        language: 'hinglish',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const data = res.body.data;
    expect(data.intent).toBe('CREATE_INVOICE');
    expect(data.requiresConfirmation).toBe(true);
    expect(data.draft).toBeDefined();
    expect(data.draft.clientName).toContain('Rahul');
    expect(data.draft.amount).toBe(15000);
    expect(data.draft.description.toLowerCase()).toBe('website development');
    expect(data.actionLogId).toBeDefined();

    actionLogId = data.actionLogId;
  });

  it('should confirm and execute the invoice draft, saving it to PostgreSQL', async () => {
    const res = await request(app)
      .post('/api/v1/ai/execute')
      .set('Authorization', `Bearer ${businessToken}`)
      .set('x-workspace-id', workspaceId)
      .send({
        actionLogId,
        confirmed: true,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('EXECUTED');
    expect(res.body.data.invoice.invoiceNumber).toBeDefined();
    expect(Number(res.body.data.invoice.subtotal)).toBe(15000);
  });

  it('should answer financial query: "How much money did I collect this month?" backed by real DB records', async () => {
    const res = await request(app)
      .post('/api/v1/ai/chat')
      .set('Authorization', `Bearer ${businessToken}`)
      .set('x-workspace-id', workspaceId)
      .send({
        message: 'How much money did I collect this month?',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.intent).toBe('GET_COLLECTION_SUMMARY');
    expect(res.body.data.toolResult).toBeDefined();
    expect(typeof res.body.data.toolResult.totalCollected).toBe('number');
  });
});
