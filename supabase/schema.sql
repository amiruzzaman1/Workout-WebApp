-- Workout app database setup.
-- Paste this whole file into Supabase > SQL Editor > New query, then click Run.
-- Safe to run more than once.

-- 1. Profiles: one row per user (goals, schedule, which machines their gym has)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  experience text not null default 'beginner',      -- beginner | intermediate
  goal text not null default 'general',             -- muscle | fat_loss | strength | general
  training_days int[] not null default '{1,3,5}',   -- 0 = Sun ... 6 = Sat
  sessions_per_day int not null default 1,          -- 1 or 2
  double_days int[] not null default '{}',          -- days with 2 sessions
  session_minutes int not null default 60,
  split text not null default 'auto',               -- auto | full_body | upper_lower | ppl | body_part
  injuries text,
  gym_name text default 'Jetts Newtown',
  equipment text[] not null default '{}',           -- keys of machines / equipment available
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Plans: the whole weekly plan is stored as JSON so it is easy to edit
create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null default 'My plan',
  is_active boolean not null default true,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists plans_user_idx on public.plans (user_id);

-- 3. Custom exercises a user adds themselves
create table if not exists public.custom_exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  primary_muscles text[] not null default '{}',
  equipment text,
  instructions text[] not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists custom_exercises_user_idx on public.custom_exercises (user_id);

-- 4. Workout logs: one row per set you actually did (used in the next phase)
create table if not exists public.workout_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  performed_on date not null default current_date,
  exercise_id text not null,
  set_number int not null,
  reps int,
  weight_kg numeric(6,2),
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists workout_logs_user_date_idx on public.workout_logs (user_id, performed_on);

-- Row level security: every user only ever sees their own rows
alter table public.profiles enable row level security;
alter table public.plans enable row level security;
alter table public.custom_exercises enable row level security;
alter table public.workout_logs enable row level security;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for all to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

drop policy if exists "own plans" on public.plans;
create policy "own plans" on public.plans
  for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "own custom exercises" on public.custom_exercises;
create policy "own custom exercises" on public.custom_exercises
  for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "own logs" on public.workout_logs;
create policy "own logs" on public.workout_logs
  for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Expose the tables to logged-in users only (automatic exposure is off)
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.profiles, public.plans,
  public.custom_exercises, public.workout_logs to authenticated;
