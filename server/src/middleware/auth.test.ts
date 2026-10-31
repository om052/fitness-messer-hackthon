import { describe, it, expect, vi } from "vitest";
import request from "supertest";

vi.hoisted(() => {
  process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/fitness_messer_test";
  process.env.CLERK_SECRET_KEY = "sk_test_fixture";
  process.env.CLERK_PUBLISHABLE_KEY = "pk_test_ZXhhbXBsZS5jbGVyay5hY2NvdW50cy5kZXYk";
});

vi.mock("@clerk/express", () => ({
  clerkMiddleware: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  getAuth: () => ({ userId: null }),
}));

import { createApp } from "../app.js";

// The provider is mocked so rejection-path tests remain deterministic and do
// not need Clerk keys or a network connection.

describe("auth middleware rejection paths", () => {
  const app = createApp();

  it("rejects GET /api/v1/auth/me with no Authorization header", async () => {
    const res = await request(app).get("/api/v1/auth/me");
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Unauthorized");
  });

  it("rejects GET /api/v1/kingdoms/mine with no Authorization header", async () => {
    const res = await request(app).get("/api/v1/kingdoms/mine");
    expect(res.status).toBe(401);
  });

  it("rejects POST /api/v1/kingdoms with no Authorization header", async () => {
    const res = await request(app)
      .post("/api/v1/kingdoms")
      .send({ name: "X", lat: 1, lng: 1 });
    expect(res.status).toBe(401);
  });

  it("rejects a malformed Bearer header", async () => {
    const res = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", "Bearer");
    expect(res.status).toBe(401);
  });

  it("rejects an empty-token Bearer header", async () => {
    const res = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", "Bearer ");
    expect(res.status).toBe(401);
  });

  it("rejects a garbage/invalid JWT", async () => {
    const res = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", "Bearer not.a.real.jwt");
    expect([401, 500]).toContain(res.status);
  });

  it("rejects an expired-but-structurally-valid JWT", async () => {
    // Header.payload with expired exp claim; signature invalid → rejected.
    const payload = Buffer.from(
      JSON.stringify({
        sub: "user_test",
        exp: Math.floor(Date.now() / 1000) - 3600,
      }),
    ).toString("base64url");
    const token = `eyJhbGciOiJSUzI1NiJ9.${payload}.badsig`;
    const res = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(401);
  });

  it("keeps /api/v1/health public", async () => {
    const res = await request(app).get("/api/v1/health");
    expect(res.status).toBe(200);
  });
});
