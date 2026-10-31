-- Fix EXECUTE privileges for commit_verified_result.
-- The original migration revoked EXECUTE from PUBLIC only, but Supabase default
-- role grants left anon and authenticated able to execute the function.
revoke execute on function public.commit_verified_result(uuid, text, numeric, jsonb, jsonb, text) from public;
revoke execute on function public.commit_verified_result(uuid, text, numeric, jsonb, jsonb, text) from anon;
revoke execute on function public.commit_verified_result(uuid, text, numeric, jsonb, jsonb, text) from authenticated;
grant execute on function public.commit_verified_result(uuid, text, numeric, jsonb, jsonb, text) to service_role;
