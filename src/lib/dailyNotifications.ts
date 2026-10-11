// Decides what today's notifications should be and (re)schedules them. There is no server here, so nothing truly
// runs in the background: this just works out the next sensible reminder each time the app is opened (or every
// so often while it stays open) and schedules that one. On Android that single schedule still fires through the
// OS even if the app is closed by the time it goes off; on the web the Forge tab has to still be open somewhere.
import { getCoachStyle } from './coachStyle';
import { dayMessage } from './dayMessages';
import { cancelScheduled, scheduleAt } from './notify';
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
      scheduleAt(id, when, "Don't lose your streak", `Your ${opts.streakDays} day streak ends at midnight if you do not log something today (food, a workout, your weight, or sleep).`);
    } else {
      scheduleAt(id, when, "Don't forget to log today", body);
    }
  }
}

/** Call once when the app opens (or the Dashboard mounts) with what today looks like so far. */
export function refreshTodayNotifications(todayFoodLogged: boolean, tasksToday: TaskItem[], streak: { days: number; loggedToday: boolean }) {
  scheduleDailyCheckIns();
  scheduleMissedLogReminders({
    loggedFoodToday: todayFoodLogged, tasksLeftToday: tasksToday.filter((t) => !t.done).length,
    streakDays: streak.days, loggedSomethingToday: streak.loggedToday,
  });
}
