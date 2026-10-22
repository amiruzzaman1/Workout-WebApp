// Decides what the notifications should be and (re)schedules them. There is no server here, so nothing truly
// runs in the background: this works out the next sensible reminders each time the app is opened (or the data
// changes) and schedules them. On Android they still fire through the OS with the app closed; on the web the
// Forge tab has to still be open somewhere. So every message is only as accurate as the last time the app was
// open, the same honest limit this file always had.
//
// The main thing is the "pulse": one custom notification every two hours from 8 am to 10 pm, for the rest of
// today and all of tomorrow. Each slot looks at what you have and have not done (food by meal, water, protein,
// sleep, workout, tasks, streak) and picks the kind of message that fits, then one of 10 variations of it in
// the chosen coach's voice (angry Goku, flirty Mirko; lines in pulseMessages.ts).
import { CoachStyle, getCoachStyle } from './coachStyle';
import { CATEGORY, cancelScheduled, scheduleAt } from './notify';
import { fill, PULSE_TEXT, PulseKind, Vars, voiceOf } from './pulseMessages';

const HOURS = [8, 10, 12, 14, 16, 18, 20, 22];

/** What a day looks like so far. For tomorrow nothing is logged yet, so everything is empty except the plan. */
export type DayState = {
  meals: { breakfast: boolean; lunch: boolean; dinner: boolean };
  waterPct: number | null;     // 0 to 1 of the goal
  waterGlassesLeft: number;
  proteinPct: number | null;   // 0 to 1 of the target
  sleepLogged: boolean;
  workout: { planned: boolean; done: boolean; title: string | null };
  tasksLeft: number;
  streak: { days: number; loggedToday: boolean };
};

function at(hour: number, minute: number, daysAhead = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  d.setHours(hour, minute, 0, 0);
  return d;
}

/** The next time a given weekday (0 Sunday to 6 Saturday) hits this hour and minute, today included if that
 *  time has not passed yet today. */
function nextWeekday(weekday: number, hour: number, minute: number): Date {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  let diff = (weekday - d.getDay() + 7) % 7;
  if (diff === 0 && d <= new Date()) diff = 7;
  d.setDate(d.getDate() + diff);
  return d;
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

const stamp = (d: Date) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;

/** Which kind of message fits this hour, given how the day is going. The first thing that is true wins. */
export function pickKind(hour: number, s: DayState): PulseKind {
  const waterBad = s.waterPct == null || s.waterPct < 0.15 ? 'waterNone' : s.waterPct < 0.6 ? 'waterLow' : null;
  const waterBehind = s.waterPct != null && s.waterPct < 0.6 && s.waterPct >= 0.15 ? 'waterLow' : waterBad;
  const risk = s.streak.days > 0 && !s.streak.loggedToday;
  const workoutOpen = s.workout.planned && !s.workout.done;
  const proteinLow = s.proteinPct != null && s.proteinPct < 0.6 && s.meals.lunch;
  switch (hour) {
    case 8: return 'morning';
    case 10:
      if (!s.sleepLogged) return 'sleepMissing';
      if (!s.meals.breakfast) return 'mealBreakfast';
      if (waterBad === 'waterNone') return 'waterNone';
      return workoutOpen ? 'workoutPlanned' : 'waterGood';
    case 12:
      if (waterBehind) return waterBehind;
      if (!s.meals.breakfast) return 'mealBreakfast';
      return workoutOpen ? 'workoutPlanned' : s.tasksLeft > 0 ? 'tasksLeft' : 'waterGood';
    case 14:
      if (!s.meals.lunch) return 'mealLunch';
      if (proteinLow) return 'proteinLow';
      if (waterBehind) return waterBehind;
      return s.tasksLeft > 0 ? 'tasksLeft' : 'waterGood';
    case 16:
      if (workoutOpen) return 'workoutPlanned';
      if (waterBehind) return waterBehind;
      if (proteinLow) return 'proteinLow';
      if (s.tasksLeft > 0) return 'tasksLeft';
      return s.workout.done ? 'workoutDone' : s.workout.planned ? 'workoutPlanned' : 'restDay';
    case 18:
      if (workoutOpen) return 'workoutPlanned';
      if (!s.meals.dinner && !s.meals.lunch) return 'mealLunch';
      if (s.tasksLeft > 0) return 'tasksLeft';
      return s.workout.done ? 'workoutDone' : 'restDay';
    case 20:
      if (!s.meals.dinner) return 'mealDinner';
      if (proteinLow || (s.proteinPct != null && s.proteinPct < 0.8)) return 'proteinLow';
      if (waterBehind) return waterBehind;
      return risk ? 'streakRisk' : 'waterGood';
    default: // 22
      if (risk) return 'streakRisk';
      if (!s.meals.dinner || s.tasksLeft > 0) return s.tasksLeft > 0 ? 'tasksLeft' : 'mealDinner';
      return s.workout.done || (s.waterPct != null && s.waterPct >= 0.9) ? 'dayDone' : 'bedtime';
  }
}

/** A kind with its notification button set: food and water get Log food / +250 ml, training gets Start workout. */
const CATEGORY_OF: Partial<Record<PulseKind, string>> = {
  waterNone: CATEGORY.logNudge, waterLow: CATEGORY.logNudge, mealBreakfast: CATEGORY.logNudge, mealLunch: CATEGORY.logNudge,
  mealDinner: CATEGORY.logNudge, proteinLow: CATEGORY.logNudge, streakRisk: CATEGORY.logNudge, tasksLeft: CATEGORY.logNudge,
  workoutPlanned: CATEGORY.workoutNudge, morning: CATEGORY.coachNudge, workoutDone: CATEGORY.coachNudge, dayDone: CATEGORY.coachNudge,
};

/** The text for one kind: a title and a body, each a different one of 10 or 3 variations, chosen by a seed so
 *  the same slot keeps the same words between refreshes (no flicker) but another day or another slot differs. */
export function pulseText(kind: PulseKind, style: CoachStyle, seed: string, vars: Vars): { title: string; body: string } {
  const v = PULSE_TEXT[kind][voiceOf(style)];
  const n = hash(seed + kind);
  return { title: fill(v.titles[n % v.titles.length], vars), body: fill(v.bodies[(n >>> 4) % v.bodies.length], vars) };
}

/** Every 2 hour pulse still ahead today, and all of tomorrow's, built from today's real state and a blank tomorrow. */
export function schedulePulses(today: DayState, tomorrow: DayState, name: string) {
  const style = getCoachStyle();
  const now = new Date();
  [[today, 0], [tomorrow, 1]].forEach(([state, ahead]) => {
    const s = state as DayState;
    const day = at(0, 0, ahead as number);
    for (const hour of HOURS) {
      const id = `pulse-${stamp(day)}-${hour}`;
      const when = at(hour, 0, ahead as number);
      if (when <= now) { cancelScheduled(id); continue; }
      const kind = pickKind(hour, s);
      const left = Math.max(0, s.waterGlassesLeft);
      const vars: Vars = {
        name, streak: String(s.streak.days), pct: `${Math.round((s.waterPct ?? 0) * 100)}%`,
        glasses: left <= 0 ? 'a few sips' : `${left} glass${left === 1 ? '' : 'es'}`,
        session: s.workout.title ?? 'your workout', tasks: `${s.tasksLeft} task${s.tasksLeft === 1 ? '' : 's'}`,
        protein: `${Math.round((s.proteinPct ?? 0) * 100)}%`, days: '',
      };
      const msg = pulseText(kind, style, `${stamp(day)}${hour}`, vars);
      scheduleAt(id, when, msg.title, msg.body, 'reminders', CATEGORY_OF[kind]);
    }
    // One more late check at 11:30 pm, only when the streak would still end at midnight.
    const lateId = `pulse-${stamp(day)}-late`;
    const late = at(23, 30, ahead as number);
    if (late <= now || !(s.streak.days > 0 && !s.streak.loggedToday)) { cancelScheduled(lateId); return; }
    const msg = pulseText('streakRisk', style, `${stamp(day)}late`, { name, streak: String(s.streak.days) });
    scheduleAt(lateId, late, msg.title, msg.body, 'reminders', CATEGORY.logNudge);
  });
}

/** Older versions scheduled these fixed ids; they are replaced by the pulses, so stop them from also firing. */
function cancelLegacy() {
  for (const id of ['daily-morning', 'daily-midday', 'daily-evening', 'miss-noon', 'miss-evening', 'miss-midnight', 'workout-reminder', 'water-nudge']) cancelScheduled(id);
}

function dailyDays(days: number | null): string {
  return days == null ? 'a while' : `${days} day${days === 1 ? '' : 's'}`;
}

/** A weekly nudge (next Monday, 9am) once a week or more has passed since the last weigh in, or there has
 *  never been one. Weekly on purpose, a weigh in is not a daily thing. */
export function scheduleWeighInReminder(daysSinceLastWeighIn: number | null, name: string) {
  const id = 'weighin-reminder';
  if (!(daysSinceLastWeighIn == null || daysSinceLastWeighIn >= 7)) { cancelScheduled(id); return; }
  const when = nextWeekday(1, 9, 0);
  const msg = pulseText('weighIn', getCoachStyle(), stamp(when), { name, days: dailyDays(daysSinceLastWeighIn) });
  scheduleAt(id, when, msg.title, msg.body, 'reminders', CATEGORY.weighInNudge);
}

/** A nudge (next Monday, 9:30am) once two weeks or more have passed since the last progress photo. */
export function scheduleProgressPhotoReminder(daysSinceLastPhoto: number | null, name: string) {
  const id = 'photo-reminder';
  if (!(daysSinceLastPhoto == null || daysSinceLastPhoto >= 14)) { cancelScheduled(id); return; }
  const when = nextWeekday(1, 9, 30);
  const msg = pulseText('photo', getCoachStyle(), stamp(when), { name, days: dailyDays(daysSinceLastPhoto) });
  scheduleAt(id, when, msg.title, msg.body, 'reminders', CATEGORY.photoNudge);
}

/** A "we miss you" nudge for tomorrow morning once nothing at all has been logged for 2 or more days. */
export function scheduleInactivityWinBack(daysSinceAnyLog: number | null, name: string) {
  const id = 'winback';
  if (daysSinceAnyLog == null || daysSinceAnyLog < 2) { cancelScheduled(id); return; }
  const when = at(10, 0, 1);
  const msg = pulseText('winback', getCoachStyle(), stamp(when), { name, days: dailyDays(daysSinceAnyLog) });
  scheduleAt(id, when, msg.title, msg.body, 'reminders', CATEGORY.coachNudge);
}

/** Call whenever the app opens or the day's data changes. */
export function refreshTodayNotifications(opts: {
  today: DayState;
  tomorrowWorkout: { planned: boolean; title: string | null };
  name: string;
  daysSinceLastWeighIn: number | null; daysSinceLastPhoto: number | null; daysSinceAnyLog: number | null;
}) {
  cancelLegacy();
  const tomorrow: DayState = {
    meals: { breakfast: false, lunch: false, dinner: false }, waterPct: 0, waterGlassesLeft: 8,
    proteinPct: null, sleepLogged: false,
    workout: { planned: opts.tomorrowWorkout.planned, done: false, title: opts.tomorrowWorkout.title },
    tasksLeft: 0, streak: { days: opts.today.streak.days, loggedToday: false },
  };
  schedulePulses(opts.today, tomorrow, opts.name);
  scheduleWeighInReminder(opts.daysSinceLastWeighIn, opts.name);
  scheduleProgressPhotoReminder(opts.daysSinceLastPhoto, opts.name);
  scheduleInactivityWinBack(opts.daysSinceAnyLog, opts.name);
}
