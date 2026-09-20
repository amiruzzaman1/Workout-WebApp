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

-- v2: units for logging (kg, machine level, bodyweight)
alter table public.workout_logs
  add column if not exists unit text not null default 'kg',
  add column if not exists session_title text,
  add column if not exists target_reps text;
alter table public.workout_logs drop constraint if exists workout_logs_unit_check;
alter table public.workout_logs add constraint workout_logs_unit_check check (unit in ('kg','level','bw'));
create index if not exists workout_logs_user_ex_idx on public.workout_logs (user_id, exercise_id, performed_on);

-- v3: time spent in the gym (one row per visit; two-a-days = two rows)
create table if not exists public.gym_visits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  visit_date date not null default current_date,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  session_title text,
  created_at timestamptz not null default now()
);
create index if not exists gym_visits_user_date_idx on public.gym_visits (user_id, visit_date);
alter table public.gym_visits enable row level security;
drop policy if exists "own visits" on public.gym_visits;
create policy "own visits" on public.gym_visits for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
grant select, insert, update, delete on public.gym_visits to authenticated;

-- v4: food tracking, body stats and water
alter table public.profiles
  add column if not exists height_cm numeric(5,1),
  add column if not exists weight_kg numeric(5,1),
  add column if not exists sex text,
  add column if not exists birth_year int,
  add column if not exists job_activity text default 'light',
  add column if not exists target_weight_kg numeric(5,1),
  add column if not exists calorie_override int,
  add column if not exists water_goal_ml int;

create table if not exists public.foods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null, brand text, barcode text,
  kcal_100 numeric(7,2) not null default 0,
  protein_100 numeric(7,2) not null default 0,
  carbs_100 numeric(7,2) not null default 0,
  sugars_100 numeric(7,2),
  fat_100 numeric(7,2) not null default 0,
  sat_fat_100 numeric(7,2),
  fibre_100 numeric(7,2),
  sodium_100 numeric(8,2),
  serving_g numeric(7,2), serving_label text,
  unit text not null default 'g', source text,
  created_at timestamptz not null default now()
);
create index if not exists foods_user_idx on public.foods (user_id);
create unique index if not exists foods_user_barcode_idx on public.foods (user_id, barcode) where barcode is not null;

create table if not exists public.food_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  eaten_on date not null default current_date,
  meal text not null default 'snack',
  name text not null, brand text, barcode text,
  amount numeric(8,2) not null default 100,
  unit text not null default 'g',
  serving_label text,
  kcal numeric(8,2) not null default 0,
  protein_g numeric(7,2) not null default 0,
  carbs_g numeric(7,2) not null default 0,
  sugars_g numeric(7,2),
  fat_g numeric(7,2) not null default 0,
  sat_fat_g numeric(7,2),
  fibre_g numeric(7,2),
  sodium_mg numeric(8,2),
  source text,
  created_at timestamptz not null default now()
);
create index if not exists food_entries_user_date_idx on public.food_entries (user_id, eaten_on);

create table if not exists public.water_logs (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  day date not null default current_date,
  ml int not null default 0,
  primary key (user_id, day)
);

alter table public.foods enable row level security;
alter table public.food_entries enable row level security;
alter table public.water_logs enable row level security;
drop policy if exists "own foods" on public.foods;
create policy "own foods" on public.foods for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "own food entries" on public.food_entries;
create policy "own food entries" on public.food_entries for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "own water" on public.water_logs;
create policy "own water" on public.water_logs for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
grant select, insert, update, delete on public.foods, public.food_entries, public.water_logs to authenticated;

-- v5: exact date of birth (age was previously derived from a year)
alter table public.profiles add column if not exists birth_date date;

-- v6: work hours (weekly total, or per day)
alter table public.profiles
  add column if not exists work_hours_week numeric(5,1),
  add column if not exists work_hours_by_day numeric(4,1)[];
