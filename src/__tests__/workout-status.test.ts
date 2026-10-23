import { handleRequest } from "../../supabase/functions/workout-status/handler";

function makeDeps(overrides?: Partial<any>) {
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: "user-1" } }, error: null }) },
    from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { id: "s1", status: "draft", exercise_id: "ex1", created_at: "now" }, error: null }) }) }) }),
  };
  return {
    getEnv: (k: string) => (k === "SUPABASE_URL" ? "https://x" : k === "SUPABASE_ANON_KEY" ? "anon" : undefined),
    createClient: () => client,
    ...overrides,
  } as any;
}

describe("workout-status handler", () => {
  it("OPTIONS preflight", async () => {
    const res = await handleRequest(new Request("http://x", { method: "OPTIONS" }), makeDeps());
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Methods")).toBe("GET, OPTIONS");
  });

  it("rejects non-GET", async () => {
    const res = await handleRequest(new Request("http://x", { method: "POST" }), makeDeps());
    expect(res.status).toBe(405);
  });

  it("rejects missing auth", async () => {
    const res = await handleRequest(new Request("http://x", { method: "GET" }), makeDeps());
    expect(res.status).toBe(401);
  });

  it("rejects invalid auth", async () => {
    const deps = makeDeps({ createClient: () => ({ auth: { getUser: async () => ({ data: { user: null }, error: new Error("x") }) }, from: () => ({}) }) });
    const res = await handleRequest(new Request("http://x", { method: "GET" }), deps);
    expect(res.status).toBe(401);
  });

  it("rejects missing id", async () => {
    const res = await handleRequest(new Request("http://x", { method: "GET", headers: { Authorization: "Bearer t" } }), makeDeps());
    expect(res.status).toBe(400);
  });

  it("returns 404 on not found", async () => {
    const deps = makeDeps({ createClient: () => ({ auth: { getUser: async () => ({ data: { user: { id: "user-1" } }, error: null }) }, from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: null, error: new Error("not found") }) }) }) }) }) });
    const res = await handleRequest(new Request("http://x?id=abc", { method: "GET", headers: { Authorization: "Bearer t" } }), deps);
    expect(res.status).toBe(404);
  });

  it("returns 200 with data", async () => {
    const res = await handleRequest(new Request("http://x?id=abc", { method: "GET", headers: { Authorization: "Bearer t" } }), makeDeps());
    expect(res.status).toBe(200);
  });
});
