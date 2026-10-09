// Reminders that are not about a single day: take your medicine every day at the same time, cancel a
// subscription on a date in the future, a birthday that comes back every year. Each is scheduled with
// src/lib/notify.ts for whenever it is next due; see refreshReminders(), called whenever the list changes.
import { cancelScheduled, scheduleAt } from './notify';

export type Repeat = 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly';

export type Reminder = {
  id: string;
  title: string;
  remind_time: string; // "HH:MM", 24 hour, the form TimeField and the database use
  repeat: Repeat;
  /** The day it happens (once), or the day its weekday/day of month/month and day come from (weekly/monthly/yearly). Unused for daily. */
  remind_date?: string | null; // "YYYY-MM-DD"
};

export const REPEAT_LABEL: Record<Repeat, string> = {
  once: 'Once',
  daily: 'Every day',
  weekly: 'Every week',
  monthly: 'Every month',
  yearly: 'Every year',
};

/** When a reminder next goes off, or null when it needs a date it does not have, or (for "once") that date has passed. */
export function nextOccurrence(r: Reminder, from = new Date()): Date | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(r.remind_time);
  if (!m) return null;
  const hh = Number(m[1]), mm = Number(m[2]);
  const src = r.remind_date ? new Date(`${r.remind_date}T00:00:00`) : null;

  if (r.repeat === 'daily') {
    const d = new Date(from);
    d.setHours(hh, mm, 0, 0);
    if (d <= from) d.setDate(d.getDate() + 1);
    return d;
  }
  if (!src) return null;
  if (r.repeat === 'once') {
    const d = new Date(src);
    d.setHours(hh, mm, 0, 0);
    return d > from ? d : null;
  }
  if (r.repeat === 'weekly') {
    const weekday = src.getDay();
    const d = new Date(from);
    d.setHours(hh, mm, 0, 0);
    while (d.getDay() !== weekday || d <= from) d.setDate(d.getDate() + 1);
    return d;
  }
  if (r.repeat === 'monthly') {
    const day = src.getDate();
    const d = new Date(from.getFullYear(), from.getMonth(), day, hh, mm, 0, 0);
    if (d <= from) d.setMonth(d.getMonth() + 1, day);
    return d;
  }
  // yearly
  const d = new Date(from.getFullYear(), src.getMonth(), src.getDate(), hh, mm, 0, 0);
  if (d <= from) d.setFullYear(d.getFullYear() + 1);
  return d;
}

/** (Re)schedules every reminder for whenever it is next due. Call this again whenever the list changes. */
export function refreshReminders(reminders: Reminder[]) {
  for (const r of reminders) {
    const id = `reminder-${r.id}`;
    const when = nextOccurrence(r);
    if (when) scheduleAt(id, when, 'Reminder', r.title);
    else cancelScheduled(id);
  }
}
