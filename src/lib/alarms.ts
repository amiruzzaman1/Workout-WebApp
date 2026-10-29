// Alarms: like your phone's alarm clock, but scheduled the same way the rest of Forge's notifications are
// (src/lib/notify.ts), since there is no server behind this app to send a real push notification instead.
// On Android, each one posts on its own notification channel at the highest importance, through the phone's
// ALARM audio stream rather than the notification one, which is what lets it ring even with the phone on
// silent, the closest a plain Expo app can get to the stock Clock app's alarms without a full custom native
// module (which would also be needed for its full screen lock face; dismissing one here works like
// dismissing a notification, not like silencing a ringing alarm).
import { AlarmVibration, alarmChannelId, cancelAlarmAt, getBreakEnd, scheduleAlarmAt } from './notify';
import { isoOf } from './onBreak';

export type AlarmRepeat = 'once' | 'daily' | 'weekly';

export type Alarm = {
  id: string;
  label: string;
  alarm_time: string; // "HH:MM", 24 hour, same convention as TimeField and reminders
  repeat: AlarmRepeat;
  /** 0 (Sunday) to 6 (Saturday), Date.getDay()'s own numbering; only used when repeat is 'weekly'. */
  days: number[];
  /** "YYYY-MM-DD"; only used when repeat is 'once'. */
  alarm_date: string | null;
  sound: boolean;
  vibrate: boolean;
  vibration_pattern: Exclude<AlarmVibration, 'none'>;
  /** How many times it rings/buzzes, a few seconds apart; 1 to 6. */
  repeat_count: number;
  enabled: boolean;
  /** One of ALARM_SOUNDS' ids in alarmSounds.ts. Missing or 'default' means the phone's own sound. */
  sound_id?: string;
  /** Minutes the Snooze button waits before ringing again. Missing or null means no snooze button. */
  snooze_minutes?: number | null;
  /** Alarms with the same group name are managed together (Wake Up, Gym, ...). Missing means on its own. */
  group_name?: string | null;
  /** The date of one occurrence that is skipped ("YYYY-MM-DD"). Once that day has gone it does nothing. */
  skip_date?: string | null;
};

export const SNOOZE_CHOICES = [5, 10, 15];

export const REPEAT_LABEL: Record<AlarmRepeat, string> = { once: 'Once', daily: 'Every day', weekly: 'Certain days' };
export const VIBRATION_LABEL: Record<Alarm['vibration_pattern'], string> = { short: 'Short pulse', double: 'Double pulse', long: 'Long buzz' };

/** When an alarm next goes off, or null when it is turned off, "once" has already passed, or "weekly" has
 *  no days picked yet. */
export function nextOccurrence(a: Alarm, from = new Date()): Date | null {
  if (!a.enabled) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(a.alarm_time);
  if (!m) return null;
  const hh = Number(m[1]), mm = Number(m[2]);

  if (a.repeat === 'daily') {
    const d = new Date(from);
    d.setHours(hh, mm, 0, 0);
    if (d <= from) d.setDate(d.getDate() + 1);
    return d;
  }
  if (a.repeat === 'once') {
    if (!a.alarm_date) return null;
    const d = new Date(`${a.alarm_date}T00:00:00`);
    d.setHours(hh, mm, 0, 0);
    return d > from ? d : null;
  }
  // weekly: step a day at a time to the soonest picked weekday, today included if its time has not passed.
  if (!a.days.length) return null;
  const d = new Date(from);
  d.setHours(hh, mm, 0, 0);
  for (let i = 0; i < 8; i++) {
    if (a.days.includes(d.getDay()) && d > from) return d;
    d.setDate(d.getDate() + 1);
  }
  return null;
}

/** The next time this alarm would ring, not counting a skip. */
export function nextIgnoringSkip(a: Alarm, from = new Date()): Date | null {
  return nextOccurrence({ ...a, skip_date: null, enabled: true }, from);
}

/** True while the next ring is the one marked to be skipped. */
export function isSkipping(a: Alarm, from = new Date()): boolean {
  if (!a.skip_date) return false;
  const n = nextIgnoringSkip(a, from);
  return !!n && isoOf(n) === a.skip_date;
}

/** What to save to skip the next ring (or, if that ring is already skipped, to bring it back). */
export function toggleSkipChanges(a: Alarm, from = new Date()): Partial<Alarm> {
  if (isSkipping(a, from)) return { skip_date: null };
  const n = nextIgnoringSkip(a, from);
  return n ? { skip_date: isoOf(n) } : {};
}

/** Every time this alarm goes off in the next `days` days (after the break, if you are on one), soonest first,
 *  leaving out a skipped ring. A daily alarm gives one per day, so it keeps ringing for a week without the app being
 *  opened; the Dashboard tops it up whenever it opens. */
export function upcomingOccurrences(a: Alarm, days = 7, from = new Date()): Date[] {
  const out: Date[] = [];
  const brk = getBreakEnd();
  let cursor = brk && brk.getTime() > from.getTime() ? brk : from;
  const end = cursor.getTime() + days * 864e5;
  for (let i = 0; i < 30; i++) {
    const next = nextOccurrence(a, cursor);
    if (!next || next.getTime() > end) break;
    cursor = new Date(next.getTime() + 60_000);
    if (a.skip_date && isoOf(next) === a.skip_date) { if (a.repeat === 'once') break; continue; }
    out.push(next);
    if (a.repeat === 'once') break;
  }
  return out;
}

/** The soonest ring that will actually happen (what the list shows). */
export function nextRing(a: Alarm): Date | null {
  return upcomingOccurrences(a, 14, new Date())[0] ?? null;
}

function ringExtra(a: Alarm, vibration: AlarmVibration) {
  return { vibration, soundId: a.sound ? a.sound_id : null, snooze: a.snooze_minutes ?? null, alarmId: a.id };
}

/** (Re)schedules every alarm for its coming days. Call this again whenever the list changes. */
export function refreshAlarms(alarms: Alarm[]) {
  for (const a of alarms) {
    const id = `alarm-${a.id}`;
    const whens = upcomingOccurrences(a);
    if (!whens.length) { cancelAlarmAt(id); continue; }
    const vibration: AlarmVibration = a.vibrate ? a.vibration_pattern : 'none';
    const channelId = alarmChannelId(vibration, a.sound, a.sound_id);
    scheduleAlarmAt(id, whens, a.label || 'Alarm', 'Tap to open Forge', channelId, a.repeat_count, ringExtra(a, vibration));
  }
}

/** Rings this alarm in a few seconds with its real sound and buttons, so you can hear and try it. */
export function testAlarm(a: Alarm, seconds = 3) {
  const vibration: AlarmVibration = a.vibrate ? a.vibration_pattern : 'none';
  const channelId = alarmChannelId(vibration, a.sound, a.sound_id);
  scheduleAlarmAt(`alarm-test-${a.id}`, new Date(Date.now() + seconds * 1000), `${a.label || 'Alarm'} (test)`, 'This is a test', channelId, Math.min(a.repeat_count, 2), ringExtra(a, vibration), true);
}

/** The Snooze button: rings once more in `minutes`. Replaces an earlier snooze of the same alarm. */
export function snoozeAlarm(a: Alarm, minutes: number) {
  const vibration: AlarmVibration = a.vibrate ? a.vibration_pattern : 'none';
  const channelId = alarmChannelId(vibration, a.sound, a.sound_id);
  scheduleAlarmAt(`alarm-snooze-${a.id}`, new Date(Date.now() + minutes * 60_000), a.label || 'Alarm', `Snoozed for ${minutes} min`, channelId, a.repeat_count, ringExtra(a, vibration), true);
}
