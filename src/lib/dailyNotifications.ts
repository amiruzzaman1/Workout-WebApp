// Decides what today's notifications should be and (re)schedules them. There is no server here, so nothing truly
// runs in the background: this just works out the next sensible reminder each time the app is opened (or every
// so often while it stays open) and schedules that one. On Android that single schedule still fires through the
// OS even if the app is closed by the time it goes off; on the web the Forge tab has to still be open somewhere.
// Because of that, a few of these (the water nudge especially) are only ever as accurate as they were the last
// time the app was open: there is nothing that re-checks "is this still true" between then and when it fires, the
// same honest limit the original missed log nudges already had.
import { getCoachStyle } from './coachStyle';
import { dayMessage } from './dayMessages';
import { CATEGORY, cancelScheduled, scheduleAt } from './notify';
import { TaskItem } from './tracker';

const TIMES = { morning: [7, 30], midday: [12, 30], evening: [20, 30] } as const;
/** The user asked for these three times by name; a missed log check fires at each one still ahead today. */
const MISS_TIMES: [string, number, number][] = [['miss-noon', 12, 0], ['miss-evening', 18, 0], ['miss-midnight', 23, 59]];

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

/** The three good morning/midday/evening check ins, each moved to tomorrow once today's time has already passed. */
export function scheduleDailyCheckIns() {
  const style = getCoachStyle();
  for (const slot of Object.keys(TIMES) as (keyof typeof TIMES)[]) {
    const [h, m] = TIMES[slot];
    const when = at(h, m) > new Date() ? at(h, m) : at(h, m, 1);
    const msg = dayMessage(slot, style);
    scheduleAt(`daily-${slot}`, when, msg.title, msg.body);
  }
}

/**
 * The 12 pm, 6 pm and 12 am "did you log today" reminders. Call this again right after food is logged (or a
 * task is ticked off) so the rest of today's reminders are cancelled instead of nagging about something done.
 * When a day streak (src/lib/streak.ts, food, a workout, a weigh in or sleep, not just food) is actually
 * running and still not logged today, the nudge leads with that instead, since "you will lose your streak"
 * is a much stronger reason to open the app than "you have not logged food" on its own.
 */
export function scheduleMissedLogReminders(opts: { loggedFoodToday: boolean; tasksLeftToday: number; streakDays: number; loggedSomethingToday: boolean }) {
  const allDone = opts.loggedFoodToday && opts.tasksLeftToday === 0;
  const streakAtRisk = opts.streakDays > 0 && !opts.loggedSomethingToday;
  for (const [id, h, m] of MISS_TIMES) {
    if (allDone && !streakAtRisk) { cancelScheduled(id); continue; }
    const when = at(h, m);
    if (when <= new Date()) { cancelScheduled(id); continue; } // today's slot already passed, nothing to move it to
    const body = !opts.loggedFoodToday && opts.tasksLeftToday > 0
      ? `You have not logged food today, and ${opts.tasksLeftToday} task${opts.tasksLeftToday === 1 ? '' : 's'} left on your list.`
      : !opts.loggedFoodToday
        ? 'You have not logged any food today.'
        : `${opts.tasksLeftToday} task${opts.tasksLeftToday === 1 ? '' : 's'} still left on today's list.`;
    if (streakAtRisk) {
      scheduleAt(id, when, "Don't lose your streak", `Your ${opts.streakDays} day streak ends at midnight if you do not log something today (food, a workout, your weight, or sleep).`, 'reminders', CATEGORY.logNudge);
    } else {
      scheduleAt(id, when, "Don't forget to log today", body, 'reminders', CATEGORY.logNudge);
    }
  }
}

/** Evening nudge (6pm) for a planned session that is still sitting there untouched. Separate from the missed
 *  log ones above: those are about logging anything at all, this is specifically about today's workout. */
export function scheduleWorkoutReminder(opts: { plannedToday: boolean; sessionTitle: string | null; doneToday: boolean }) {
  const id = 'workout-reminder';
  if (!opts.plannedToday || opts.doneToday) { cancelScheduled(id); return; }
  const when = at(18, 0);
  if (when <= new Date()) { cancelScheduled(id); return; }
  scheduleAt(
    id, when, "Today's workout is waiting",
    opts.sessionTitle ? `${opts.sessionTitle} is still on today's plan.` : 'Your planned session for today is still open.',
    'reminders', CATEGORY.workoutNudge,
  );
}

/** A weekly nudge (next Monday, 9am) once a week or more has passed since the last weigh in, or there has
 *  never been one. Weekly rather than daily on purpose, a weigh in is not a daily thing. */
export function scheduleWeighInReminder(daysSinceLastWeighIn: number | null) {
  const id = 'weighin-reminder';
  const overdue = daysSinceLastWeighIn == null || daysSinceLastWeighIn >= 7;
  if (!overdue) { cancelScheduled(id); return; }
  scheduleAt(id, nextWeekday(1, 9, 0), 'Time for a weigh in', "It's been a week or more. A quick weigh in keeps your targets accurate.", 'reminders', CATEGORY.weighInNudge);
}

/** Afternoon nudge (3pm) if water is well behind pace for the day. Scheduled from whatever the water
 *  percentage was the last time the app was open, so it can be stale by 3pm if nothing was logged since;
 *  the same trade off the rest of this file already makes without a server to re-check things in between. */
export function scheduleWaterNudge(waterPct: number | null) {
  const id = 'water-nudge';
  const when = at(15, 0);
  if (waterPct == null || waterPct >= 0.4 || when <= new Date()) { cancelScheduled(id); return; }
  scheduleAt(id, when, 'Running low on water', `Only about ${Math.round(waterPct * 100)}% of today's water goal so far.`, 'reminders', CATEGORY.logNudge);
}

/** A nudge (next Monday, 9:30am, alongside the weigh in one) once two weeks or more have passed since the
 *  last progress photo, or there has never been one. */
export function scheduleProgressPhotoReminder(daysSinceLastPhoto: number | null) {
  const id = 'photo-reminder';
  const overdue = daysSinceLastPhoto == null || daysSinceLastPhoto >= 14;
  if (!overdue) { cancelScheduled(id); return; }
  scheduleAt(id, nextWeekday(1, 9, 30), 'Add a progress photo', "It's been two weeks or more. Visual change often shows up before the scale does.", 'reminders', CATEGORY.photoNudge);
}

/** A "we miss you" nudge for tomorrow morning once the app has gone genuinely quiet (2 or more days with
 *  nothing logged at all), separate from same day missed log nudges, which only cover today. In the coach's
 *  own voice, since a plain system reminder is a weaker pull back than the coach actually sounding like it
 *  noticed. */
export function scheduleInactivityWinBack(daysSinceAnyLog: number | null) {
  const id = 'winback';
  if (daysSinceAnyLog == null || daysSinceAnyLog < 2) { cancelScheduled(id); return; }
  const style = getCoachStyle();
  const title = style === 'female' ? "I've been thinking about you" : "Don't make me come find you";
  scheduleAt(id, at(10, 0, 1), title, `It's been ${daysSinceAnyLog} days. Come back and keep going, your streak and goals are still waiting.`, 'reminders', CATEGORY.coachNudge);
}

/** Call once when the app opens (or the Dashboard mounts) with what today (and lately) looks like so far. */
export function refreshTodayNotifications(opts: {
  todayFoodLogged: boolean; tasksToday: TaskItem[]; streak: { days: number; loggedToday: boolean };
  workout: { plannedToday: boolean; sessionTitle: string | null; doneToday: boolean };
  daysSinceLastWeighIn: number | null; waterPct: number | null; daysSinceLastPhoto: number | null; daysSinceAnyLog: number | null;
}) {
  scheduleDailyCheckIns();
  scheduleMissedLogReminders({
    loggedFoodToday: opts.todayFoodLogged, tasksLeftToday: opts.tasksToday.filter((t) => !t.done).length,
    streakDays: opts.streak.days, loggedSomethingToday: opts.streak.loggedToday,
  });
  scheduleWorkoutReminder(opts.workout);
  scheduleWeighInReminder(opts.daysSinceLastWeighIn);
  scheduleWaterNudge(opts.waterPct);
  scheduleProgressPhotoReminder(opts.daysSinceLastPhoto);
  scheduleInactivityWinBack(opts.daysSinceAnyLog);
}
