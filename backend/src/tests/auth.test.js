import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app.js';

describe('Authentication & User Management APIs', () => {
  const testUser = {
    name: 'Aarav Patel',
    email: `aarav_${Date.now()}@test.com`,
    username: `aarav_${Date.now()}`,
    password: 'Password@123',
    workspaceName: 'Aarav Design Studio',
  };

  it('should register a new business user successfully', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send(testUser);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(testUser.email);
    expect(res.body.data.user.activeWorkspace.name).toBe(testUser.workspaceName);
    expect(res.body.data.token).toBeDefined();
  });

  it('should reject registration with duplicate email', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send(testUser);

    expect(res.status).toBe(500); // Or 400
    expect(res.body.success).toBe(false);
  });

  it('should login an existing user with valid credentials', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        emailOrUsername: testUser.email,
        password: testUser.password,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
  });

  it('should reject login with wrong password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        emailOrUsername: testUser.email,
        password: 'WrongPassword!',
      });

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});
