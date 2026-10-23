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

-- v7: timed exercises (planks, stretches, cardio) log seconds or minutes
alter table public.workout_logs add column if not exists metric text not null default 'reps';
alter table public.workout_logs drop constraint if exists workout_logs_metric_check;
alter table public.workout_logs add constraint workout_logs_metric_check check (metric in ('reps','seconds','minutes'));

-- v8: sleep and time tracking
create table if not exists public.sleep_logs (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  night_of date not null,
  bed_time text, wake_time text, minutes int, note text,
  created_at timestamptz not null default now(),
  primary key (user_id, night_of)
);
create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  day date not null default current_date,
  title text not null, description text, category text,
  started_at timestamptz, ended_at timestamptz, minutes int,
  created_at timestamptz not null default now()
);
create index if not exists activity_logs_user_day_idx on public.activity_logs (user_id, day);
alter table public.sleep_logs enable row level security;
alter table public.activity_logs enable row level security;
drop policy if exists "own sleep" on public.sleep_logs;
create policy "own sleep" on public.sleep_logs for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "own activity" on public.activity_logs;
create policy "own activity" on public.activity_logs for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
grant select, insert, update, delete on public.sleep_logs, public.activity_logs to authenticated;

-- v9: weight and waist history
create table if not exists public.weight_logs (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  day date not null default current_date,
  kg numeric(5,1),
  waist_cm numeric(5,1),
  created_at timestamptz not null default now(),
  primary key (user_id, day)
);
alter table public.weight_logs enable row level security;
drop policy if exists "own weights" on public.weight_logs;
create policy "own weights" on public.weight_logs for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
grant select, insert, update, delete on public.weight_logs to authenticated;

-- v10: foods added by users, shared between everyone who signs in.
-- Anyone signed in can read and add. Anyone signed in can correct a food (and the app shows who last touched it).
-- Only the person who added a food can delete it. The same name can exist twice.
create table if not exists public.shared_foods (
  id uuid primary key default gen_random_uuid(),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  name text not null check (char_length(name) between 1 and 200),
  brand text check (brand is null or char_length(brand) <= 120),
  barcode text check (barcode is null or char_length(barcode) <= 32),
  kcal_100 numeric(7,2) not null default 0 check (kcal_100 between 0 and 1000),
  protein_100 numeric(7,2) not null default 0 check (protein_100 between 0 and 100),
  carbs_100 numeric(7,2) not null default 0 check (carbs_100 between 0 and 100),
  sugars_100 numeric(7,2) check (sugars_100 is null or sugars_100 between 0 and 100),
  fat_100 numeric(7,2) not null default 0 check (fat_100 between 0 and 100),
  sat_fat_100 numeric(7,2) check (sat_fat_100 is null or sat_fat_100 between 0 and 100),
  fibre_100 numeric(7,2) check (fibre_100 is null or fibre_100 between 0 and 100),
  sodium_100 numeric(8,2) check (sodium_100 is null or sodium_100 >= 0),
  serving_g numeric(7,2), serving_label text,
  unit text not null default 'g' check (unit in ('g', 'ml')),
  source text default 'User added',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists shared_foods_updated_idx on public.shared_foods (updated_at desc);
create index if not exists shared_foods_barcode_idx on public.shared_foods (barcode) where barcode is not null;

-- Whoever edits a row is recorded by the database, so it cannot be faked from the app.
create or replace function public.shared_foods_touch() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.created_by := old.created_by;
  new.created_at := old.created_at;
  new.updated_by := (select auth.uid());
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists shared_foods_touch on public.shared_foods;
create trigger shared_foods_touch before update on public.shared_foods
  for each row execute function public.shared_foods_touch();

alter table public.shared_foods enable row level security;
drop policy if exists "read shared foods" on public.shared_foods;
create policy "read shared foods" on public.shared_foods for select to authenticated
  using ((select auth.uid()) is not null);
drop policy if exists "add shared foods" on public.shared_foods;
create policy "add shared foods" on public.shared_foods for insert to authenticated
  with check ((select auth.uid()) = created_by);
drop policy if exists "edit shared foods" on public.shared_foods;
create policy "edit shared foods" on public.shared_foods for update to authenticated
  using ((select auth.uid()) is not null) with check ((select auth.uid()) is not null);
drop policy if exists "delete own shared foods" on public.shared_foods;
create policy "delete own shared foods" on public.shared_foods for delete to authenticated
  using ((select auth.uid()) = created_by);
grant select, insert, update, delete on public.shared_foods to authenticated;

-- v11: time tracker. Each task keeps every block of time (from and to) so a task can be continued, and you can add your own categories.
alter table public.activity_logs add column if not exists segments jsonb not null default '[]'::jsonb;
alter table public.profiles add column if not exists time_categories text[];

-- v12: planned tasks for a day. They show as suggestions in the time tracker, and can be ticked off on the Tasks page (they stay, shown struck through).
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  day date not null default current_date,
  title text not null,
  category text,
  target_minutes int,
  done boolean not null default false,
  done_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists tasks_user_day_idx on public.tasks (user_id, day);
alter table public.tasks enable row level security;
drop policy if exists "own tasks" on public.tasks;
create policy "own tasks" on public.tasks for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
grant select, insert, update, delete on public.tasks to authenticated;

-- v13: your own recipes and usuals (milk you always have). Each holds a list of ingredients with the amounts and the nutrition
-- copied in when saved (items, jsonb), so a recipe never changes if a food it used is later edited.
create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  servings numeric(6,2) not null default 1 check (servings > 0),
  cooked_g numeric(8,1),
  items jsonb not null default '[]'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists recipes_user_idx on public.recipes (user_id, updated_at desc);
alter table public.recipes enable row level security;
drop policy if exists "own recipes" on public.recipes;
create policy "own recipes" on public.recipes for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
grant select, insert, update, delete on public.recipes to authenticated;

-- v14: profile photo. The file itself lives in Supabase Storage (bucket avatars), one file per user
-- (<user id>/avatar.jpg, overwritten on a new photo); the profile row just keeps its address.
alter table public.profiles add column if not exists avatar_url text;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatar read" on storage.objects;
create policy "avatar read" on storage.objects for select
  using (bucket_id = 'avatars');
drop policy if exists "avatar write own" on storage.objects;
create policy "avatar write own" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "avatar update own" on storage.objects;
create policy "avatar update own" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "avatar delete own" on storage.objects;
create policy "avatar delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- v15: reminders that are not about one specific day: a daily medicine, a one off future date (cancel a
-- subscription), or a yearly one (a birthday). Scheduled client side with src/lib/notify.ts.
create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null,
  remind_time text not null default '09:00',
  repeat text not null default 'once' check (repeat in ('once', 'daily', 'weekly', 'monthly', 'yearly')),
  remind_date date,
  created_at timestamptz not null default now()
);
create index if not exists reminders_user_idx on public.reminders (user_id);
alter table public.reminders enable row level security;
drop policy if exists "own reminders" on public.reminders;
create policy "own reminders" on public.reminders for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
grant select, insert, update, delete on public.reminders to authenticated;

-- v16: alarms, like your phone's alarm clock. Once, every day, or certain days of the week, with sound and
-- vibration you can turn on or off and a repeat count for both, so it keeps ringing/buzzing a few times
-- instead of once. Scheduled client side with src/lib/alarms.ts and src/lib/notify.ts.
create table if not exists public.alarms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  label text not null default '',
  alarm_time text not null default '07:00',
  repeat text not null default 'once' check (repeat in ('once', 'daily', 'weekly')),
  days int[] not null default '{}', -- 0 (Sunday) to 6 (Saturday), only used when repeat = 'weekly'
  alarm_date date, -- only used when repeat = 'once'
  sound boolean not null default true,
  vibrate boolean not null default true,
  vibration_pattern text not null default 'short' check (vibration_pattern in ('short', 'double', 'long')),
  repeat_count smallint not null default 3 check (repeat_count between 1 and 6),
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists alarms_user_idx on public.alarms (user_id);
alter table public.alarms enable row level security;
drop policy if exists "own alarms" on public.alarms;
create policy "own alarms" on public.alarms for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
grant select, insert, update, delete on public.alarms to authenticated;

-- v17: progress photos. Unlike avatars, nobody else can see these, not even other signed in users, since
-- they are a lot more personal; the bucket is private and the app shows them with a short lived signed url
-- instead of a public one. One row per photo (the day it was taken, an optional note); the file itself
-- lives in Storage, bucket progress_photos, path <user id>/<a random name>.jpg.
create table if not exists public.progress_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  day date not null,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists progress_photos_user_idx on public.progress_photos (user_id);
alter table public.progress_photos enable row level security;
drop policy if exists "own progress photos" on public.progress_photos;
create policy "own progress photos" on public.progress_photos for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
grant select, insert, update, delete on public.progress_photos to authenticated;

insert into storage.buckets (id, name, public)
values ('progress_photos', 'progress_photos', false)
on conflict (id) do nothing;

drop policy if exists "progress photo own" on storage.objects;
create policy "progress photo own" on storage.objects for all to authenticated
  using (bucket_id = 'progress_photos' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'progress_photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- v18: Coach chat history (app/(tabs)/(home)/coach-chat.tsx). Saved per coach (male Goku, female Mirko) so
-- swapping coaches never mixes their conversations; the recent messages are also fed back into the AI
-- model's prompt (aiAssistant.ts's buildCoachPrompt) so it has the last few turns of context, the honest,
-- on device version of "remembering the conversation", not model fine tuning.
create table if not exists public.coach_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  coach text not null check (coach in ('male', 'female')),
  role text not null check (role in ('user', 'coach')),
  text text not null,
  created_at timestamptz not null default now()
);
create index if not exists coach_messages_user_coach_idx on public.coach_messages (user_id, coach, created_at);
alter table public.coach_messages enable row level security;
drop policy if exists "own coach messages" on public.coach_messages;
create policy "own coach messages" on public.coach_messages for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
grant select, insert, delete on public.coach_messages to authenticated;

-- v19: Career plan ticks (app/(tabs)/tracker/career.tsx, plan content in src/data/careerPlan.ts). One row per
-- ticked task; unticking deletes the row. task_id is the plan's own stable id ("w3t2"), never renumbered.
create table if not exists public.career_progress (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  task_id text not null,
  done_at timestamptz not null default now(),
  primary key (user_id, task_id)
);
alter table public.career_progress enable row level security;
drop policy if exists "own career progress" on public.career_progress;
create policy "own career progress" on public.career_progress for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
grant select, insert, update, delete on public.career_progress to authenticated;

-- v20: Your own measures for any food ("1 teaspoon of yoghurt = 3 g"), used on the food portion screen
-- (app/(tabs)/food/add.tsx). Keyed by the food's name in lower case, so they follow the food wherever you
-- find it (search, scan, my foods). amount is in the food's own unit, g or ml, for one of that measure.
create table if not exists public.food_measures (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  food_key text not null,
  label text not null,
  amount numeric not null check (amount > 0),
  created_at timestamptz not null default now(),
  unique (user_id, food_key, label)
);
create index if not exists food_measures_user_idx on public.food_measures (user_id);
alter table public.food_measures enable row level security;
drop policy if exists "own food measures" on public.food_measures;
create policy "own food measures" on public.food_measures for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
grant select, insert, update, delete on public.food_measures to authenticated;

-- v21: how a regular reminder alerts you: silent, a normal notification, or like an alarm (rings through
-- silent mode, buzzes, repeats). Existing reminders stay normal notifications.
alter table public.reminders add column if not exists style text not null default 'normal' check (style in ('silent', 'normal', 'alarm'));
alter table public.reminders add column if not exists vibration_pattern text not null default 'short' check (vibration_pattern in ('short', 'double', 'long'));
alter table public.reminders add column if not exists repeat_count smallint not null default 3 check (repeat_count between 1 and 6);
