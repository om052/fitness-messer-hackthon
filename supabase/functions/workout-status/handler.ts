export interface WorkoutStatusClient {
  auth: {
    getUser: () => Promise<{ data: { user: { id: string } | null }; error: unknown }>;
  };
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        single: () => Promise<{ data: unknown; error: unknown }>;
      };
    };
  };
}

export interface WorkoutStatusDeps {
  getEnv: (key: string) => string | undefined;
  createClient: (
    url: string,
    key: string,
    options: { global: { headers: { Authorization: string } } },
  ) => WorkoutStatusClient;
}

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

export async function handleRequest(req: Request, deps: WorkoutStatusDeps): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Allow": "GET", "Content-Type": "application/json" },
    });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "missing auth" }), { status: 401, headers: corsHeaders });
  }

  const supabaseUrl = deps.getEnv("SUPABASE_URL");
  const supabaseAnonKey = deps.getEnv("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !supabaseAnonKey) {
    return new Response(JSON.stringify({ error: "missing env" }), { status: 500, headers: corsHeaders });
  }

  const supabase = deps.createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return new Response(JSON.stringify({ error: "invalid auth" }), { status: 401, headers: corsHeaders });
  }

  const url = new URL(req.url);
  const sessionId = url.searchParams.get("id");
  if (!sessionId) {
    return new Response(JSON.stringify({ error: "missing id" }), { status: 400, headers: corsHeaders });
  }

  const { data, error: fetchError } = await supabase
    .from("workout_sessions")
    .select("id, status, exercise_id, created_at")
    .eq("id", sessionId)
    .single();

  if (fetchError || !data) {
    return new Response(JSON.stringify({ error: "not found" }), { status: 404, headers: corsHeaders });
  }

  return new Response(JSON.stringify(data), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
