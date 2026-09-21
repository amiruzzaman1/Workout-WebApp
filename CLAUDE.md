# Workout WebApp: project context for Claude

Personal workout, food and habit tracker. Built for Amir (complete beginner, trains at Jetts Newtown, Wellington NZ) and one friend. Each has their own account and plan. Not published to app stores. Web first; Android/iOS later via Expo Go.

## Stack
- Expo SDK 57, expo-router, React Native Web, TypeScript. Run: `npm run web` (clean cache: `npx expo start --web -c`). Build: `npx expo export --platform web` (output: dist).
- Supabase (auth + Postgres). Project ref `zglxidulxgjfschsrvqm`, URL https://zglxidulxgjfschsrvqm.supabase.co. Client uses the publishable key in `src/lib/supabase.ts`. Never use or commit the service_role key.
- Every table has RLS: `(select auth.uid()) = user_id`, granted to `authenticated` only (automatic table exposure is off). Full schema with versioned sections v1 to v9 in `supabase/schema.sql`; append new changes as a new vN section.
- Hosting: Vercel project `workout-webapp` (vercel.json has SPA rewrite). GitHub repo amiruzzaman1/Workout-WebApp, pushed from GitHub Desktop.
- Data sources: free-exercise-db (public domain images), Open Food Facts (NZ barcodes and search, `src/lib/off.ts`). Web BarcodeDetector for scanning (Chrome/Android; iOS Safari falls back to typing the barcode).
- Avoid adding native libraries without telling the user to install them; `react-native-svg` may not be installed on the user's PC (LineChart is drawn with plain Views for that reason; Ring.tsx is unused).

## Routes (tab bar must stay visible on every page, so detail pages live in per tab Stacks)
- app/_layout.tsx: root Stack + Gate (no session -> /login; no profile -> /you/onboarding)
- app/login.tsx
- app/(tabs)/_layout.tsx: Tabs, each with its own accent colour pill: (home) Today, food, progress, library (Exercises), you
- (home): index (Today), workout/[day]/[idx] (live workout, gym timer, rest timer, warm up + working sets, stopwatch for timed sets), session/[day]/[idx] (session editor, metric Reps/Seconds/Minutes)
- food: index (daily log, macros, water, meal summaries), add (search, scan, my foods, quick add, portion with % of daily targets), nutrition (body stats, BMI, burn breakdown, calorie and macro targets)
- library: index, exercise/[id], machine/[key], machines, custom-exercise
- progress.tsx: tabs Weight (weigh ins, waist, trend chart with goal line, history), Food (7/30 day report), Training (workouts, gym time, lifts, adjust next time), Sleep (sleep averages, time tracker by category)
- you: index (MyFitnessPal style Me page: avatar, streak, goals, nutrition goals, settings), onboarding (profile + body stats at sign up)

## Key files
- src/lib/store.tsx: all app state and Supabase CRUD (profile, plan, logs, gym visits, food, water, sleep, activities, weights). Logging a newer weight updates profile.weight_kg.
- src/lib/planner.ts: plan generator (splits, two a day, goals incl. recomp), personalised warm ups per session focus, 5 to 9 exercises per session, timed holds.
- src/lib/progress.ts: double progression suggestions (add weight at top of rep range on all sets; 10% lighter after two sessions below range), gym visit helpers.
- src/lib/nutrition.ts: Mifflin St Jeor BMR; burn = BMR x 1.2 + work kcal (weekly hours x job MET x kg / 7) + training kcal; goal weight drives deficit/surplus; recomp 0.4%, muscle 0.5%, fat loss 0.75% bodyweight a week; protein 2.2 g/kg recomp, 2.0 lose, 1.9 muscle, 1.6 general; 1200 kcal floor.
- src/lib/theme.ts: C (pure black monochrome), F (Space Grotesk display, Inter body), A (muted accents: protein blue, carbs amber, fat violet, fibre green, water cyan, core rose, cardio orange, over red), GROUP_COLORS per muscle group.
- src/lib/quotes.ts: 41 built in quotes, rotate every 10 minutes by clock, no real person attributions.
- src/lib/tracker.ts + src/components/DayTrackers.tsx: sleep and time tracker (categories Study, Work, Project, Admin, Rest, Other).

## User preferences (follow these)
- Keep the pure black and white theme, with muted accent colours for labels, charts, nutrients and groups. Do not change the base theme.
- No dash or hyphen punctuation in UI copy. Use commas or colons instead.
- Plain, simple language; beginner friendly; direct replies; simplest solution that works.
- Height in cm or ft/in; weight typable plus steppers; decimals allowed (e.g. 5.5 work hours).
- Body stats: height, weight, goal weight, date of birth, sex, job type (with descriptions and examples), optional weekly or per day work hours.
- Amir's own goal is "Lose fat and build muscle" (recomp): calorie deficit with high protein.

## Testing
- Typecheck with `npx tsc --noEmit`. Test the web build in a browser with a test account; Playwright with mocked Supabase routes was used during development.

## Possible next steps
- Deploy latest to Vercel after pushing.
- Add real Jetts Newtown machine photos (user will supply).
- Android/iOS via Expo Go or a development build.
