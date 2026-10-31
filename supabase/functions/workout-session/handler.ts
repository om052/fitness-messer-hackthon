export interface WorkoutSessionClient {
  auth: {
    getUser: () => Promise<{ data: { user: { id: string } | null }; error: unknown }>;
  };
  from: (table: string) => {
    insert: (value: unknown) => {
      select: (columns: string) => {
        single: () => Promise<{ data: unknown; error: unknown }>;
      };
    };
  };
}

export interface WorkoutSessionDeps {
  getEnv: (key: string) => string | undefined;
  createClient: (
    url: string,
    key: string,
    options: { global: { headers: { Authorization: string } } },
  ) => WorkoutSessionClient;
}

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export async function handleRequest(req: Request, deps: WorkoutSessionDeps): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Allow": "POST", "Content-Type": "application/json" },
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

  let body: { exerciseId?: string } = {};
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid json" }), { status: 400, headers: corsHeaders });
  }

  const allowedExerciseIds = new Set([
    "push_up", "goblet_squat", "brisk_walk", "plank_forearm_plank", "hip_opener",
    "split_squat", "biceps_curl", "jumping_jack", "dumbbell_row", "overhead_press",
    "romanian_deadlift", "glute_bridge", "bodyweight_squat", "wall_sit",
    "mountain_climber", "high_knees", "cat_cow", "arm_circles",
  ]);

  if (typeof body.exerciseId !== "string" || body.exerciseId.trim() === "" || !allowedExerciseIds.has(body.exerciseId)) {
    return new Response(JSON.stringify({ error: "invalid exerciseId" }), { status: 400, headers: corsHeaders });
  }

  const { data, error: insertError } = await supabase
    .from("workout_sessions")
    .insert({ user_id: user.id, exercise_id: body.exerciseId, status: "draft" })
    .select("id, status")
    .single();

  if (insertError) {
    return new Response(JSON.stringify({ error: "failed to create session" }), { status: 500, headers: corsHeaders });
  }

  return new Response(JSON.stringify(data), { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
