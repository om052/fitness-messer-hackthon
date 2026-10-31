-- pgTAP tests for workout verification migration (local only).

begin;

create extension if not exists pgtap;

select plan(46);

-- Schema and RLS
select has_table('public', 'workout_sessions', 'workout_sessions exists');
select has_table('public', 'media_uploads', 'media_uploads exists');
select has_table('public', 'analysis_jobs', 'analysis_jobs exists');
select has_table('public', 'analysis_results', 'analysis_results exists');
select has_table('public', 'reward_transactions', 'reward_transactions exists');

select ok((select relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='workout_sessions'), 'workout_sessions RLS enabled');
select ok((select relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='media_uploads'), 'media_uploads RLS enabled');
select ok((select relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='analysis_jobs'), 'analysis_jobs RLS enabled');
select ok((select relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='analysis_results'), 'analysis_results RLS enabled');
select ok((select relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='reward_transactions'), 'reward_transactions RLS enabled');

-- Grants
select ok(
  not has_table_privilege('anon', 'public.workout_sessions', 'SELECT,INSERT,UPDATE,DELETE'),
  'anon has no workout_sessions privileges'
);
select ok(
  not has_table_privilege('authenticated', 'public.analysis_results', 'INSERT,UPDATE,DELETE'),
  'authenticated cannot write analysis_results'
);
select ok(
  not has_table_privilege('authenticated', 'public.reward_transactions', 'INSERT,UPDATE,DELETE'),
  'authenticated cannot write reward_transactions'
);
select ok(
  not has_table_privilege('authenticated', 'public.analysis_jobs', 'SELECT,INSERT,UPDATE,DELETE'),
  'authenticated has no analysis_jobs privileges'
);

-- Function privileges
select ok(
  not has_function_privilege('anon', 'public.commit_verified_result(uuid,text,numeric,jsonb,jsonb,text)', 'EXECUTE'),
  'anon cannot execute commit_verified_result'
);
select ok(
  not has_function_privilege('authenticated', 'public.commit_verified_result(uuid,text,numeric,jsonb,jsonb,text)', 'EXECUTE'),
  'authenticated cannot execute commit_verified_result'
);
select ok(
  has_function_privilege('service_role', 'public.commit_verified_result(uuid,text,numeric,jsonb,jsonb,text)', 'EXECUTE'),
  'service_role can execute commit_verified_result'
);

-- Fixtures
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@test.local', crypt('password', gen_salt('bf')), now(), now(), now()),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@test.local', crypt('password', gen_salt('bf')), now(), now(), now());

insert into public.workout_sessions (id, user_id, exercise_id, status)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'push_up', 'verifying');

insert into public.media_uploads (id, session_id, storage_path, content_type, size_bytes, delete_after_at)
values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'path/to/file', 'image/png', 10, now() + interval '1 day');

insert into public.analysis_results (id, session_id, status, confidence)
values ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'verified', 0.9);

-- Cross-user isolation
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);

select is(auth.uid(), '22222222-2222-2222-2222-222222222222'::uuid, 'auth.uid resolves to user B');

select is_empty(
  $$ select id from public.workout_sessions where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' $$,
  'user B cannot read user A session'
);
select is_empty(
  $$ select id from public.media_uploads where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' $$,
  'user B cannot read user A media upload'
);
select is_empty(
  $$ select id from public.analysis_results where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc' $$,
  'user B cannot read user A analysis result'
);

-- Client write rejection as authenticated user A
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);

select is(auth.uid(), '11111111-1111-1111-1111-111111111111'::uuid, 'auth.uid resolves to user A');

select throws_ok(
  $$ insert into public.workout_sessions (user_id, exercise_id) values ('11111111-1111-1111-1111-111111111111', 'push_up') $$,
  '42501',
  null,
  'authenticated cannot insert workout_sessions'
);
select is(
  (select count(*)::int from public.workout_sessions where user_id = '11111111-1111-1111-1111-111111111111'),
  1,
  'workout_sessions unchanged after rejected update/delete attempts'
);

select throws_ok(
  $$ insert into public.media_uploads (session_id, storage_path, content_type, size_bytes, delete_after_at) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'x', 'image/png', 1, now()) $$,
  '42501',
  null,
  'authenticated cannot insert media_uploads'
);

select throws_ok(
  $$ insert into public.analysis_results (session_id, status) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'verified') $$,
  '42501',
  null,
  'authenticated cannot insert analysis_results'
);

select throws_ok(
  $$ insert into public.reward_transactions (user_id, session_id, idempotency_key) values ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'k') $$,
  '42501',
  null,
  'authenticated cannot insert reward_transactions'
);

-- Explicit UPDATE/DELETE denial checks
select throws_ok(
  $$ update public.workout_sessions set status = 'verified' where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' $$,
  '42501',
  null,
  'authenticated cannot update workout_sessions'
);
select throws_ok(
  $$ delete from public.workout_sessions where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' $$,
  '42501',
  null,
  'authenticated cannot delete workout_sessions'
);
select throws_ok(
  $$ update public.media_uploads set storage_path = 'y' where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' $$,
  '42501',
  null,
  'authenticated cannot update media_uploads'
);
select throws_ok(
  $$ delete from public.media_uploads where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' $$,
  '42501',
  null,
  'authenticated cannot delete media_uploads'
);
select throws_ok(
  $$ update public.analysis_results set status = 'rejected' where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc' $$,
  '42501',
  null,
  'authenticated cannot update analysis_results'
);
select throws_ok(
  $$ delete from public.analysis_results where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc' $$,
  '42501',
  null,
  'authenticated cannot delete analysis_results'
);
select throws_ok(
  $$ update public.reward_transactions set rewards = '{"gold":1}'::jsonb where session_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' $$,
  '42501',
  null,
  'authenticated cannot update reward_transactions'
);
select throws_ok(
  $$ delete from public.reward_transactions where session_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' $$,
  '42501',
  null,
  'authenticated cannot delete reward_transactions'
);
select throws_ok(
  $$ update public.analysis_jobs set status = 'failed' where session_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' $$,
  '42501',
  null,
  'authenticated cannot update analysis_jobs'
);
select throws_ok(
  $$ delete from public.analysis_jobs where session_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' $$,
  '42501',
  null,
  'authenticated cannot delete analysis_jobs'
);


-- RPC behavior as service_role
set local role service_role;

select throws_ok(
  $$ select public.commit_verified_result('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bogus', 0.5, '{}'::jsonb, '{"gold":10}'::jsonb, 'key-invalid') $$,
  'invalid result status',
  'invalid result status rejected'
);

select lives_ok(
  $$ select public.commit_verified_result('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'verified', 0.9, '{"reps":1}'::jsonb, '{"gold":999}'::jsonb, 'key-1') $$,
  'valid commit succeeds'
);
select is(
  (select rewards from public.reward_transactions where session_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  '{}'::jsonb,
  'rewards ignored by RPC'
);
select is(
  (select status from public.workout_sessions where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  'verified',
  'session status updated to verified'
);

select throws_ok(
  $$ select public.commit_verified_result('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'verified', 0.9, '{"reps":1}'::jsonb, '{"gold":999}'::jsonb, 'key-2') $$,
  'invalid transition from verified',
  'duplicate commit is rejected after status transition'
);
select is(
  (select count(*)::int from public.analysis_results where session_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  2,
  'analysis result count unchanged after duplicate attempt'
);
select is(
  (select count(*)::int from public.reward_transactions where session_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  1,
  'no duplicate reward transaction on duplicate commit'
);

select throws_ok(
  $$ select public.commit_verified_result('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'rejected', 0.1, '{}'::jsonb, '{}'::jsonb, 'key-3') $$,
  'invalid transition from verified',
  'invalid transition rejected'
);
select is(
  (select status from public.workout_sessions where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  'verified',
  'session unchanged after failed commit'
);

select * from finish();
rollback;
