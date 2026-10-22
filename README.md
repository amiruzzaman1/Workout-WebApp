# Forge

A personal workout, food and habit tracker, built for one person and a friend. Each has their own account and plan. It runs on the web (Vercel) and as an Android app, from the same code.

## What it does

- **Training:** a weekly plan generator (splits, recomp, muscle or fat loss), 870+ exercises with images and how-tos, a live workout screen with gym and rest timers, progressive overload suggestions, and beginner guides for the machines at Jetts Newtown, Wellington.
- **Food:** barcode scanning and search (Open Food Facts, NZ first), built in South Asian, Bangladeshi and air fryer foods, recipes, your own measures, calories in kcal and kJ, macros and daily targets worked out from your body and goal.
- **Habits:** sleep log with totals, time tracker, daily tasks, reminders, alarms, water, weigh ins and private progress photos (take one with the camera or pick from the gallery).
- **Coach:** pick Goku (aggressive) or Mirko (flirty and supportive). Both write the dashboard messages and a custom notification every two hours based on what you have and have not logged. An optional on device AI model and voice commands work on Android only.
- **Career tab:** a private 14 week plan to a software engineer job in NZ, shown to one account only.

## Built with

Expo SDK 57 and expo-router (React Native Web), TypeScript, Supabase (auth, Postgres with row level security, storage), Vercel for the web, EAS cloud builds for Android.

## Set up

1. **Database:** in Supabase open **SQL Editor → New query**, paste everything from `supabase/schema.sql` (versioned sections v1 and up, run any you have not run yet), click **Run**.
2. **Sign in:** Supabase → **Authentication → Sign In / Providers → Email**. Set a minimum password length of 8 with required character types. Turn **Confirm email** off, or keep it on and set the **Site URL** to your Vercel address.
3. **Install:** `npm install`

## Run

```
npm run web
```

Opens at http://localhost:8081. Check types with `npx tsc --noEmit`. Build the web app with `npx expo export --platform web`.

## Deploy

- **Web:** push to GitHub and Vercel redeploys automatically (`vercel.json` sets the build and the SPA rewrite).
- **Android:** `npx eas-cli build --platform android --profile preview`, then install the APK. Bump `versionCode` in `app.json` for each new build.

## Where things live

| What | Where |
|---|---|
| Screens and routes | `app/` |
| App state and Supabase calls | `src/lib/store.tsx` |
| Plan generator | `src/lib/planner.ts` |
| Nutrition maths and food search | `src/lib/nutrition.ts`, `src/lib/off.ts`, `src/lib/foodData.ts` |
| Notifications and their messages | `src/lib/dailyNotifications.ts`, `src/lib/pulseMessages.ts` |
| Coach voices | `src/lib/coach.ts` |
| Machine guides | `src/data/machines.ts` |
| Database schema | `supabase/schema.sql` |

More detail on how each part works is in `CLAUDE.md`.

## Data credits

Exercises: free-exercise-db (public domain). Foods: Open Food Facts, USDA FoodData Central SR Legacy (public domain), Indian Nutrient Databank (CC BY), Food Composition Table for Bangladesh (INFS, University of Dhaka, via FAO INFOODS).
