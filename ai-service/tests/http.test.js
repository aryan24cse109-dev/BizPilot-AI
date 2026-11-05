import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";

import app from "../src/app.js";
import { createServiceAuthMiddleware } from "../src/middleware/serviceAuth.middleware.js";

const request = (server, path, options = {}) =>
  new Promise((resolve, reject) => {
    const address = server.address();
    const req = http.request({
      host: address.address,
      port: address.port,
      path,
      method: options.method ?? "GET",
      headers: options.headers,
    }, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => { body += chunk; });
      res.on("end", () => resolve({ status: res.statusCode, body: JSON.parse(body) }));
    });
    req.on("error", reject);
    if (options.body) req.write(options.body);
    req.end();
  });

test("AI service exposes health and readiness endpoints", async (t) => {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => server.close());

  const health = await request(server, "/api/health");
  const readiness = await request(server, "/api/health/ready");

  assert.equal(health.status, 200);
  assert.equal(readiness.status, 200);
  assert.equal(health.body.success, true);
});

test("assistant endpoint rejects missing service credentials", async (t) => {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => server.close());

  const result = await request(server, "/api/assistant/interpret", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ message: "Show my invoices" }),
  });

  assert.ok([401, 503].includes(result.status));
  assert.equal(result.body.success, false);
});

test("service authentication compares a valid injected secret", async () => {
  const middleware = createServiceAuthMiddleware("test-secret");
  const next = (error) => { if (error) throw error; };
  const requestObject = {
    get(name) {
      return name === "x-ai-service-secret" ? "test-secret" : undefined;
    },
  };

  middleware(requestObject, {}, next);
  assert.equal(requestObject.serviceAuthenticated, true);
});
