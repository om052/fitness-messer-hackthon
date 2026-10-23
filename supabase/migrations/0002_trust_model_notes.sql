-- Trust model B: backend-only service-role RPC.
-- The app never calls commit_verified_result. A trusted backend authenticates
-- the user, validates ownership, and then invokes this function with
-- service_role. The RPC relies on that trusted boundary; auth.uid() is not
-- meaningful for service-role calls.

-- (No SQL changes beyond documentation; grants remain service_role only.)