# Workout

Personal workout app: weekly plan generator, 870+ exercises with animations and how-tos, and beginner guides for gym machines (starting with Jetts Newtown, Wellington). Built with Expo (web now, Android/iOS later from the same code) and Supabase.

## One-time setup

1. **Database** — In Supabase open **SQL Editor → New query**, paste everything from `supabase/schema.sql`, click **Run**.
2. **Email confirmation** — Supabase → **Authentication → Sign In / Providers → Email**. Either:
   - turn **Confirm email** off (simplest for you and a friend), or
   - keep it on and set **Authentication → URL Configuration → Site URL** to your Vercel address once deployed.
3. **Install** — in this folder run `npm install`.

## Run locally

```
npm run web
```
Opens at http://localhost:8081.

## Deploy to Vercel (free)

1. Commit and push this folder with GitHub Desktop.
2. On vercel.com → **Add New → Project** → import the repo → **Deploy**. `vercel.json` already sets the build command and output folder.
3. Every push to GitHub redeploys automatically.

## Put it on a phone

- **iPhone:** open the site in Safari → Share → **Add to Home Screen**.
- **Android:** open in Chrome → ⋮ menu → **Add to Home screen / Install app**.

## Where things live

| What | File |
|---|---|
| Machine guides & Jetts Newtown default list | `src/data/machines.ts` |
| Exercise data (free-exercise-db, public domain) | `src/data/exercises.json` |
| Plan generator rules | `src/lib/planner.ts` |
| Supabase connection | `src/lib/supabase.ts` |
| Screens | `app/` |

Exercise photos come from [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (Unlicense).
