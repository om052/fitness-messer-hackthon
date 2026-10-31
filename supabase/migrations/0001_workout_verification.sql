-- Phase 1 Slice 2 - Stage 1: workout verification database foundation (NOT APPLIED)
-- Additive, backward-compatible migration. No reward rates are defined here.

create table if not exists public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_id text not null,
  status text not null default 'draft'
    check (status in ('draft','uploaded','queued','verifying','verified','rejected','failed')),
  nonce uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days')
);

create table if not exists public.media_uploads (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.workout_sessions(id) on delete cascade,
  storage_path text not null,
  content_type text not null,
  size_bytes bigint not null check (size_bytes > 0),
  uploaded_at timestamptz not null default now(),
  delete_after_at timestamptz not null
);

create table if not exists public.analysis_jobs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.workout_sessions(id) on delete cascade,
  status text not null default 'queued'
    check (status in ('queued','leased','completed','failed')),
  attempts integer not null default 0,
  last_error text,
  locked_at timestamptz,
  locked_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.analysis_results (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.workout_sessions(id) on delete cascade,
  status text not null check (status in ('verified','rejected','failed')),
  confidence numeric,
  metrics jsonb,
  completed_at timestamptz not null default now()
);

create table if not exists public.reward_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null references public.workout_sessions(id) on delete cascade,
  idempotency_key text not null,
  rewards jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (session_id),
  unique (idempotency_key)
);

create index if not exists idx_workout_sessions_user on public.workout_sessions(user_id);
create index if not exists idx_media_uploads_session on public.media_uploads(session_id);
create index if not exists idx_analysis_jobs_session on public.analysis_jobs(session_id);
create index if not exists idx_analysis_results_session on public.analysis_results(session_id);

alter table public.workout_sessions enable row level security;
alter table public.media_uploads enable row level security;
alter table public.analysis_jobs enable row level security;
alter table public.analysis_results enable row level security;
alter table public.reward_transactions enable row level security;

-- Users can read their own sessions and results; no client writes to verified results/rewards.
create policy "users_read_own_sessions" on public.workout_sessions
  for select using (auth.uid() = user_id);
create policy "users_read_own_results" on public.analysis_results
  for select using (exists (
    select 1 from public.workout_sessions s
    where s.id = analysis_results.session_id and s.user_id = auth.uid()
  ));
create policy "users_read_own_media" on public.media_uploads
  for select using (exists (
    select 1 from public.workout_sessions s
    where s.id = media_uploads.session_id and s.user_id = auth.uid()
  ));

-- No client insert/update policies for results/rewards; service role only.

-- Explicit grants: clients can read own rows via RLS; no direct writes to results/rewards.
revoke all on table public.workout_sessions from anon, authenticated;
revoke all on table public.media_uploads from anon, authenticated;
revoke all on table public.analysis_jobs from anon, authenticated;
revoke all on table public.analysis_results from anon, authenticated;
revoke all on table public.reward_transactions from anon, authenticated;

grant select on table public.workout_sessions to authenticated;
grant select on table public.media_uploads to authenticated;
grant select on table public.analysis_results to authenticated;

grant all on table public.workout_sessions to service_role;
grant all on table public.media_uploads to service_role;
grant all on table public.analysis_jobs to service_role;
grant all on table public.analysis_results to service_role;
grant all on table public.reward_transactions to service_role;

-- Atomic commit RPC (security definer, service role only)
create or replace function public.commit_verified_result(
  p_session_id uuid,
  p_status text,
  p_confidence numeric,
  p_metrics jsonb,
  p_rewards jsonb,
  p_idempotency_key text
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid;
  v_current_status text;
  v_existing jsonb;
begin
  select user_id, status into v_user_id, v_current_status
  from public.workout_sessions
  where id = p_session_id
  for update;

  if v_user_id is null then
    raise exception 'session not found';
  end if;

  -- transition validation
  if v_current_status not in ('verifying') then
    raise exception 'invalid transition from %', v_current_status;
  end if;

  if p_status not in ('verified','rejected','failed') then
    raise exception 'invalid result status';
  end if;

  -- idempotent return
  select jsonb_build_object('session_id', session_id, 'rewards', rewards)
  into v_existing
  from public.reward_transactions
  where session_id = p_session_id;

  if v_existing is not null then
    return v_existing;
  end if;

  -- official rewards remain disabled: ignore p_rewards
  if p_status = 'verified' then
    insert into public.analysis_results (session_id, status, confidence, metrics)
    values (p_session_id, p_status, p_confidence, p_metrics);

    insert into public.reward_transactions (user_id, session_id, idempotency_key, rewards)
    values (v_user_id, p_session_id, p_idempotency_key, '{}'::jsonb);
  else
    insert into public.analysis_results (session_id, status, confidence, metrics)
    values (p_session_id, p_status, p_confidence, p_metrics);
  end if;

  update public.workout_sessions
  set status = p_status, updated_at = now()
  where id = p_session_id;

  return jsonb_build_object('session_id', p_session_id, 'status', p_status);
end;
$$;

revoke all on function public.commit_verified_result(uuid,text,numeric,jsonb,jsonb,text) from public;
grant execute on function public.commit_verified_result(uuid,text,numeric,jsonb,jsonb,text) to service_role;