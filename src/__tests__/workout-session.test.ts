import { handleRequest } from "../../supabase/functions/workout-session/handler";

function makeDeps(overrides?: Partial<any>) {
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: "user-1" } }, error: null }) },
    from: () => ({
      insert: () => ({ select: () => ({ single: async () => ({ data: { id: "s1", status: "draft" }, error: null }) }) }),
    }),
  };
  return {
    getEnv: (k: string) => (k === "SUPABASE_URL" ? "https://x" : k === "SUPABASE_ANON_KEY" ? "anon" : undefined),
    createClient: () => client,
    ...overrides,
  } as any;
}

describe("workout-session handler", () => {
  it("OPTIONS preflight returns 204 and CORS headers", async () => {
    const res = await handleRequest(new Request("http://x", { method: "OPTIONS" }), makeDeps());
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });

  it("rejects non-POST", async () => {
    const res = await handleRequest(new Request("http://x", { method: "GET" }), makeDeps());
    expect(res.status).toBe(405);
  });

  it("rejects missing auth", async () => {
    const res = await handleRequest(new Request("http://x", { method: "POST" }), makeDeps());
    expect(res.status).toBe(401);
  });

  it("rejects invalid auth", async () => {
    const deps = makeDeps({ createClient: () => ({ auth: { getUser: async () => ({ data: { user: null }, error: new Error("x") }) }, from: () => ({}) }) });
    const res = await handleRequest(new Request("http://x", { method: "POST", headers: { Authorization: "Bearer t" } }), deps);
    expect(res.status).toBe(401);
  });

  it("rejects missing exerciseId", async () => {
    const res = await handleRequest(new Request("http://x", { method: "POST", headers: { Authorization: "Bearer t", "Content-Type": "application/json" }, body: JSON.stringify({}) }), makeDeps());
    expect(res.status).toBe(400);
  });

  it("rejects client-supplied status/rewards by ignoring (only exerciseId accepted)", async () => {
    const client = {
      auth: { getUser: async () => ({ data: { user: { id: "user-1" } }, error: null }) },
      from: () => ({ insert: (v: any) => { expect(v.status).toBe("draft"); expect(v.rewards).toBeUndefined(); return { select: () => ({ single: async () => ({ data: { id: "s1", status: "draft" }, error: null }) }) }; } }),
    };
    const deps = { getEnv: (k: string) => (k === "SUPABASE_URL" ? "https://x" : "anon"), createClient: () => client };
    const res = await handleRequest(new Request("http://x", { method: "POST", headers: { Authorization: "Bearer t", "Content-Type": "application/json" }, body: JSON.stringify({ exerciseId: "push_up", status: "verified", rewards: { gold: 10 } }) }), deps as any);
    expect(res.status).toBe(201);
  });

  it("returns 500 on db error", async () => {
    const deps = makeDeps({ createClient: () => ({ auth: { getUser: async () => ({ data: { user: { id: "user-1" } }, error: null }) }, from: () => ({ insert: () => ({ select: () => ({ single: async () => ({ data: null, error: new Error("db") }) }) }) }) }) });
    const res = await handleRequest(new Request("http://x", { method: "POST", headers: { Authorization: "Bearer t", "Content-Type": "application/json" }, body: JSON.stringify({ exerciseId: "push_up" }) }), deps);
    expect(res.status).toBe(500);
  });

  it("accepts every supported exercise ID", async () => {
    const ids = ["push_up","goblet_squat","brisk_walk","plank_forearm_plank","hip_opener","split_squat","biceps_curl","jumping_jack","dumbbell_row","overhead_press","romanian_deadlift","glute_bridge","bodyweight_squat","wall_sit","mountain_climber","high_knees","cat_cow","arm_circles"];
    for (const id of ids) {
      const res = await handleRequest(new Request("http://x", { method: "POST", headers: { Authorization: "Bearer t", "Content-Type": "application/json" }, body: JSON.stringify({ exerciseId: id }) }), makeDeps());
      expect(res.status).toBe(201);
    }
  });

  it("rejects unknown exercise ID", async () => {
    const res = await handleRequest(new Request("http://x", { method: "POST", headers: { Authorization: "Bearer t", "Content-Type": "application/json" }, body: JSON.stringify({ exerciseId: "unknown" }) }), makeDeps());
    expect(res.status).toBe(400);
  });

  it("rejects empty exercise ID", async () => {
    const res = await handleRequest(new Request("http://x", { method: "POST", headers: { Authorization: "Bearer t", "Content-Type": "application/json" }, body: JSON.stringify({ exerciseId: "" }) }), makeDeps());
    expect(res.status).toBe(400);
  });

  it("rejects non-string exercise ID", async () => {
    const res = await handleRequest(new Request("http://x", { method: "POST", headers: { Authorization: "Bearer t", "Content-Type": "application/json" }, body: JSON.stringify({ exerciseId: 123 }) }), makeDeps());
    expect(res.status).toBe(400);
  });
});
