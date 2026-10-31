import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleRequest } from "./handler.ts";

const prodDeps = {
  getEnv: (key: string) => Deno.env.get(key),
  createClient: (url: string, key: string, options: { global: { headers: { Authorization: string } } }) =>
    createClient(url, key, options),
};

serve((req) => handleRequest(req, prodDeps));
