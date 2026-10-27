// Alarms: like your phone's alarm clock, but scheduled the same way the rest of Forge's notifications are
// (src/lib/notify.ts), since there is no server behind this app to send a real push notification instead.
// On Android, each one posts on its own notification channel at the highest importance, through the phone's
// ALARM audio stream rather than the notification one, which is what lets it ring even with the phone on
// silent, the closest a plain Expo app can get to the stock Clock app's alarms without a full custom native
// module (which would also be needed for its full screen lock face; dismissing one here works like
// dismissing a notification, not like silencing a ringing alarm).
import { AlarmVibration, alarmChannelId, cancelAlarmAt, scheduleAlarmAt } from './notify';

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
};

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

/** Every time this alarm goes off in the next `days` days, soonest first. A daily alarm gives one per day, so it keeps
 *  ringing for a week without the app being opened; the Dashboard tops it up whenever it opens. */
export function upcomingOccurrences(a: Alarm, days = 7, from = new Date()): Date[] {
  const out: Date[] = [];
  const end = from.getTime() + days * 864e5;
  let cursor = from;
  for (let i = 0; i < 30; i++) {
    const next = nextOccurrence(a, cursor);
    if (!next || next.getTime() > end) break;
    out.push(next);
    if (a.repeat === 'once') break;
    cursor = new Date(next.getTime() + 60_000);
  }
  return out;
}

/** (Re)schedules every alarm for its coming days. Call this again whenever the list changes. */
export function refreshAlarms(alarms: Alarm[]) {
  for (const a of alarms) {
    const id = `alarm-${a.id}`;
    const whens = upcomingOccurrences(a);
    if (!whens.length) { cancelAlarmAt(id); continue; }
    const vibration: AlarmVibration = a.vibrate ? a.vibration_pattern : 'none';
    const channelId = alarmChannelId(vibration, a.sound, a.sound_id);
    scheduleAlarmAt(id, whens, a.label || 'Alarm', 'Tap to open Forge', channelId, a.repeat_count, { vibration, soundId: a.sound ? a.sound_id : null });
  }
}
