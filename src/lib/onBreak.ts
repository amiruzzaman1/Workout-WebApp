// "On break": for a tour or a holiday. profiles.break_until is the LAST day of the break (a date), and everything
// the app would notify you about, alarms, reminders and every nudge, stays quiet through the end of that day and
// comes back by itself the day after. Nothing has to run for that to happen: alarms, reminders and the 2 hourly
// nudges are scheduled for the days after the break while it lasts, so they are already waiting on the phone.
import { setBreakEnd } from './notify';

const z = (n: number) => String(n).padStart(2, '0');
export const isoOf = (d: Date) => `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;

/** The moment notifications come back: midnight at the start of the day after the last break day, or null when not on a break. */
export function breakEndOf(breakUntil: string | null | undefined, now = new Date()): Date | null {
  if (!breakUntil || !/^\d{4}-\d{2}-\d{2}$/.test(breakUntil)) return null;
  const end = new Date(`${breakUntil}T00:00:00`);
  end.setDate(end.getDate() + 1);
  return end.getTime() > now.getTime() ? end : null;
}

/** Tells the notification layer about the break (call before scheduling anything). Returns the end moment. */
export function applyBreak(breakUntil: string | null | undefined): Date | null {
  const end = breakEndOf(breakUntil);
  setBreakEnd(end);
  return end;
}

/** A time that falls inside the break moves to the same time of day on the first day after it. */
export function afterBreak(when: Date, end: Date | null): Date {
  if (!end || when.getTime() >= end.getTime()) return when;
  const d = new Date(end);
  d.setHours(when.getHours(), when.getMinutes(), 0, 0);
  return d;
}

/** "Fri 31 Oct" for a date string. */
export function dayText(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('en-NZ', { weekday: 'short', day: 'numeric', month: 'short' });
}

export function addDaysISO(iso: string, n: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + n);
  return isoOf(d);
}
