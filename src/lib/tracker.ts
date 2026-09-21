// Sleep and time tracking.
export type SleepLog = {
  night_of: string;       // the date you woke up on
  bed_time: string | null;  // "22:45"
  wake_time: string | null; // "06:30"
  minutes: number | null;
  note?: string | null;
};

/** One block of time on a task: when it started and when it ended. */
export type Segment = { s: string; e: string };

/**
 * One task on one day. `minutes` is the total across every block. While the timer runs, `started_at`
 * is when the current block began and `ended_at` is empty, and `minutes` holds what was already logged
 * before, so continuing a task keeps counting from there.
 */
export type ActivityLog = {
  id: string;
  day: string;
  title: string;
  description?: string | null;
  category?: string | null;
  started_at?: string | null;
  ended_at?: string | null;
  minutes: number | null;
  segments?: Segment[] | null;
};

const TIME = /^([01]?\d|2[0-3]):([0-5]\d)$/;

export function isTime(s: string | null | undefined) {
  return !!s && TIME.test(s.trim());
}

/** Minutes between two clock times, rolling over midnight. */
export function minutesBetween(bed: string, wake: string): number | null {
  const a = TIME.exec(bed.trim());
  const b = TIME.exec(wake.trim());
  if (!a || !b) return null;
  const start = Number(a[1]) * 60 + Number(a[2]);
  const end = Number(b[1]) * 60 + Number(b[2]);
  const mins = end >= start ? end - start : 24 * 60 - start + end;
  return mins > 0 && mins <= 16 * 60 ? mins : null;
}

export function fmtMinutes(min: number | null | undefined) {
  if (min == null) return '';
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`;
}

/** Rough guide, not a diagnosis. */
export function sleepVerdict(min: number) {
  if (min < 6 * 60) return { label: 'Short', hint: 'Under 6 hours. Recovery and appetite both take a hit.' };
  if (min < 7 * 60) return { label: 'A bit short', hint: 'Most adults do better with 7 to 9 hours.' };
  if (min <= 9 * 60) return { label: 'Good', hint: 'In the 7 to 9 hour range where recovery happens.' };
  return { label: 'Long', hint: 'Over 9 hours. Fine now and then, worth noticing if it is every night.' };
}

export const ACTIVITY_CATEGORIES = ['Study', 'Work', 'Project', 'Admin', 'Rest', 'Other'];

/** The blocks of time on a task. Older entries only have a start and an end, so those count as one block. */
export function segmentsOf(a: ActivityLog): Segment[] {
  if (a.segments?.length) return a.segments;
  return a.started_at && a.ended_at ? [{ s: a.started_at, e: a.ended_at }] : [];
}

/** "14:05" in the phone's own time zone. */
export function clockOf(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** "09:00 to 10:15, 14:30 to 15:00" */
export function rangeText(segs: Segment[], max = 3) {
  const shown = segs.slice(0, max).map((x) => `${clockOf(x.s)} to ${clockOf(x.e)}`).join(', ');
  return segs.length > max ? `${shown} and ${segs.length - max} more` : shown;
}

export function nowClock() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export type WeightLog = { day: string; kg: number | null; waist_cm: number | null };
