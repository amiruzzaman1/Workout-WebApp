// XP, levels, daily quests and achievements. Everything here is worked out from what you have already logged, so it
// needs no extra database table and can never get out of step with your real data. Points reward healthy things
// only: logging meals, hitting your water and protein, training, sleeping and finishing tasks.
import { FoodEntry } from './nutrition';
import { LogRow } from './progress';
import { shiftISO } from './streak';
import { TaskItem } from './tracker';

export type XpInput = {
  foodEntries: FoodEntry[];
  water: Record<string, number>;
  sleep: { night_of: string; minutes?: number | null }[];
  weights: { day: string; kg: number | string | null }[];
  logs: LogRow[];
  visits: { visit_date: string }[];
  tasks: TaskItem[];
  targets: { protein?: number; water?: number };
};

const dayOfIso = (iso: string | null | undefined) => (iso ? iso.slice(0, 10) : '');
const localDay = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export type DayFacts = {
  meals: number;          // of breakfast, lunch, dinner (a snack counts as a fourth)
  mealSet: string[];
  proteinPct: number;     // 0 to 1+
  waterPct: number;       // 0 to 1+
  sets: number;
  trained: boolean;
  slept: boolean;
  weighed: boolean;
  tasksDone: number;
};

/** What happened on each day that has anything on it. */
export function dayFacts(x: XpInput): Record<string, DayFacts> {
  const out: Record<string, DayFacts> = {};
  const get = (d: string): DayFacts => (out[d] ??= { meals: 0, mealSet: [], proteinPct: 0, waterPct: 0, sets: 0, trained: false, slept: false, weighed: false, tasksDone: 0 });
  const protein: Record<string, number> = {};
  for (const e of x.foodEntries) {
    const f = get(e.eaten_on);
    if (!f.mealSet.includes(e.meal)) f.mealSet.push(e.meal);
    protein[e.eaten_on] = (protein[e.eaten_on] ?? 0) + (Number(e.protein_g) || 0);
  }
  for (const [d, f] of Object.entries(out)) {
    f.meals = Math.min(4, f.mealSet.length);
    f.proteinPct = x.targets.protein ? (protein[d] ?? 0) / x.targets.protein : 0;
  }
  for (const [d, ml] of Object.entries(x.water)) get(d).waterPct = x.targets.water ? ml / x.targets.water : 0;
  for (const l of x.logs) { const f = get(l.performed_on); f.sets += 1; f.trained = true; }
  for (const v of x.visits) get(v.visit_date).trained = true;
  for (const s of x.sleep) if (s.minutes != null) get(s.night_of).slept = true;
  for (const w of x.weights) if (w.kg != null) get(w.day).weighed = true;
  for (const t of x.tasks) if (t.done && t.done_at) get(localDay(t.done_at)).tasksDone += 1;
  return out;
}

/** XP earned on one day. */
export function xpForDay(f: DayFacts): number {
  let xp = 10 * f.meals;
  xp += Math.round(20 * Math.min(1, f.waterPct));
  xp += Math.round(20 * Math.min(1, f.proteinPct));
  if (f.trained) xp += 50 + 2 * Math.min(20, f.sets);
  if (f.slept) xp += 15;
  if (f.weighed) xp += 10;
  xp += 10 * Math.min(5, f.tasksDone);
  return xp;
}

export function totalXp(x: XpInput): { total: number; today: (iso: string) => number } {
  const facts = dayFacts(x);
  let total = 0;
  for (const f of Object.values(facts)) total += xpForDay(f);
  return { total, today: (iso) => (facts[iso] ? xpForDay(facts[iso]) : 0) };
}

// ---------------- levels ----------------
/** XP needed to reach a level (level 1 is 0): 200, 500, 900, 1400, ... */
export const xpToReach = (level: number) => 50 * (level - 1) * (level + 2);
const TITLES = ['Rookie', 'Starter', 'Regular', 'Grinder', 'Machine', 'Beast', 'Veteran', 'Elite', 'Legend', 'Icon'];

export function levelInfo(xp: number) {
  let level = 1;
  while (xp >= xpToReach(level + 1)) level += 1;
  const base = xpToReach(level);
  const next = xpToReach(level + 1);
  return { level, title: TITLES[Math.min(TITLES.length - 1, Math.floor((level - 1) / 2))], into: xp - base, need: next - base, pct: (xp - base) / (next - base), next };
}

// ---------------- daily quests ----------------
export type QuestKey = 'meals' | 'water' | 'protein' | 'workout' | 'sleep' | 'tasks';
export type Quest = { key: QuestKey; title: string; detail: string; done: boolean; pct: number; xp: number };

export function questsFor(day: string, x: XpInput, opts: { workoutPlanned: boolean; tasksToday: TaskItem[]; sleepNightOf: string }): Quest[] {
  const f = dayFacts(x)[day];
  const sleptRow = x.sleep.find((s) => s.night_of === opts.sleepNightOf && s.minutes != null);
  const q: Quest[] = [];
  const meals = Math.min(3, ['breakfast', 'lunch', 'dinner'].filter((m) => f?.mealSet.includes(m)).length);
  q.push({ key: 'meals', title: 'Log breakfast, lunch and dinner', detail: `${meals} of 3 meals`, done: meals >= 3, pct: meals / 3, xp: 30 });
  q.push({ key: 'water', title: 'Reach your water goal', detail: x.targets.water ? `${Math.round(Math.min(1, f?.waterPct ?? 0) * 100)}%` : 'Set up your body stats first', done: (f?.waterPct ?? 0) >= 1, pct: Math.min(1, f?.waterPct ?? 0), xp: 20 });
  q.push({ key: 'protein', title: 'Hit your protein', detail: x.targets.protein ? `${Math.round(Math.min(1, f?.proteinPct ?? 0) * 100)}%` : 'Set up your body stats first', done: (f?.proteinPct ?? 0) >= 0.9, pct: Math.min(1, (f?.proteinPct ?? 0) / 0.9), xp: 20 });
  if (opts.workoutPlanned) q.push({ key: 'workout', title: 'Do today\'s workout', detail: f?.trained ? `${f.sets} sets logged` : 'Not started', done: !!f?.trained, pct: f?.trained ? 1 : 0, xp: 50 });
  q.push({ key: 'sleep', title: 'Log last night\'s sleep', detail: sleptRow ? 'Logged' : 'Not logged', done: !!sleptRow, pct: sleptRow ? 1 : 0, xp: 15 });
  const open = opts.tasksToday.length;
  if (open > 0) {
    const done = opts.tasksToday.filter((t) => t.done).length;
    q.push({ key: 'tasks', title: 'Finish your tasks', detail: `${done} of ${open} done`, done: done >= open, pct: done / open, xp: 10 * Math.min(5, open) });
  }
  return q;
}

// ---------------- achievements ----------------
export type Achievement = { id: string; emoji: string; title: string; desc: string; done: boolean; have: number; need: number };

function longestRun(days: Set<string>): number {
  let best = 0;
  for (const d of days) {
    if (days.has(shiftISO(d, -1))) continue; // only start counting at the first day of a run
    let n = 0; let c = d;
    while (days.has(c)) { n++; c = shiftISO(c, 1); }
    best = Math.max(best, n);
  }
  return best;
}

/** How many times the heaviest set of a day beat everything lifted on earlier days for the same exercise (the very first time does not count). */
export function countPersonalBests(logs: LogRow[]): number {
  const topByDay: Record<string, Record<string, number>> = {};
  for (const l of logs) {
    if (l.weight_kg == null || l.unit !== 'kg') continue;
    const d = (topByDay[l.exercise_id] ??= {});
    d[l.performed_on] = Math.max(d[l.performed_on] ?? 0, Number(l.weight_kg));
  }
  let n = 0;
  for (const days of Object.values(topByDay)) {
    let best = 0;
    for (const day of Object.keys(days).sort()) {
      if (best > 0 && days[day] > best) n += 1;
      best = Math.max(best, days[day]);
    }
  }
  return n;
}

export function achievementsFor(x: XpInput, loggedDays: Set<string>): Achievement[] {
  const facts = dayFacts(x);
  const days = Object.values(facts);
  const workoutDays = days.filter((f) => f.trained).length;
  const sets = x.logs.length;
  const water = days.filter((f) => f.waterPct >= 1).length;
  const protein = days.filter((f) => f.proteinPct >= 0.9).length;
  const sleep = days.filter((f) => f.slept).length;
  const weigh = days.filter((f) => f.weighed).length;
  const tasks = x.tasks.filter((t) => t.done).length;
  const streak = longestRun(loggedDays);
  const prs = countPersonalBests(x.logs);
  const a = (id: string, emoji: string, title: string, desc: string, have: number, need: number): Achievement => ({ id, emoji, title, desc, have: Math.min(have, need), need, done: have >= need });
  return [
    a('first_workout', '🏋️', 'First workout', 'Log your first workout', workoutDays, 1),
    a('workouts_10', '💪', 'Ten workouts', 'Train on 10 different days', workoutDays, 10),
    a('workouts_50', '🔥', 'Fifty workouts', 'Train on 50 different days', workoutDays, 50),
    a('sets_100', '📈', '100 sets', 'Log 100 sets in total', sets, 100),
    a('sets_500', '🦾', '500 sets', 'Log 500 sets in total', sets, 500),
    a('pr_1', '🥇', 'First personal best', 'Lift heavier than ever before on any exercise', prs, 1),
    a('pr_10', '🏆', 'Ten personal bests', 'Beat your best weight 10 times', prs, 10),
    a('streak_3', '🌱', '3 day streak', 'Log something 3 days in a row', streak, 3),
    a('streak_7', '⚡', 'One week streak', 'Log something 7 days in a row', streak, 7),
    a('streak_14', '🚀', 'Two week streak', 'Log something 14 days in a row', streak, 14),
    a('streak_30', '👑', '30 day streak', 'Log something 30 days in a row', streak, 30),
    a('water_7', '💧', 'Hydration hero', 'Reach your water goal on 7 days', water, 7),
    a('protein_7', '🥩', 'Protein pro', 'Hit your protein on 7 days', protein, 7),
    a('sleep_7', '😴', 'Sleep tracker', 'Log your sleep on 7 nights', sleep, 7),
    a('weigh_4', '⚖️', 'Weigh in regular', 'Weigh in on 4 different days', weigh, 4),
    a('tasks_20', '✅', 'Getting things done', 'Finish 20 tasks', tasks, 20),
  ];
}

export { dayOfIso };
