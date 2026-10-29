// Local notifications, the same small API on both platforms, even though they work quite differently underneath.
//
// Android: expo-notifications hands scheduling to the OS, so a reminder still fires with the app closed, as long
// as the phone has notification permission granted and is not aggressively battery-optimising the app.
//
// Web: there is no background scheduler here, only the browser's Notification API, so a reminder only fires while
// the Forge tab is open somewhere (it can be in the background or minimised, that is fine, just not fully closed).
// Keeping the tab open is the honest limit of a notification with no server behind it; a closer phone-like result
// would need a small backend sending real push notifications, which this app does not have.
import { Platform } from 'react-native';
import { playSound, soundFileName } from './alarmSounds';

const isNative = Platform.OS === 'android' || Platform.OS === 'ios';
// expo-notifications only on native: it has no real scheduler on web, so it is never imported there.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Notifications = isNative ? require('expo-notifications') : null;

let channelReady = false;

// While you are on a break (see onBreak.ts) nothing is shown or scheduled before this moment.
let breakEnd: Date | null = null;
export function setBreakEnd(d: Date | null) { breakEnd = d; }
export function getBreakEnd(): Date | null { return breakEnd && breakEnd.getTime() > Date.now() ? breakEnd : null; }
const inBreak = (when: Date) => !!getBreakEnd() && when.getTime() < (breakEnd as Date).getTime();
let handlerSet = false;

/** Call once, early (the root layout does this). Sets up the Android channel notifications need to look right. */
export async function initNotifications() {
  if (!isNative || channelReady) return;
  channelReady = true;
  if (!handlerSet) {
    handlerSet = true;
    Notifications.setNotificationHandler({
      handleNotification: async () => ({ shouldShowAlert: true, shouldPlaySound: false, shouldSetBadge: false, shouldShowBanner: true, shouldShowList: true }),
    });
  }
  // High importance puts it above the fold at the top of the notification panel, with a heads up banner.
  await Notifications.setNotificationChannelAsync('reminders', {
    name: 'Reminders',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
    vibrationPattern: [0, 200, 100, 200],
  });
  // A reminder set to Silent: shows in the notification shade, no sound, no buzz, no pop up banner.
  await Notifications.setNotificationChannelAsync('reminders-silent', {
    name: 'Silent reminders',
    importance: Notifications.AndroidImportance.LOW,
    sound: null,
    enableVibrate: false,
  });
  await Notifications.setNotificationChannelAsync('timer', {
    name: 'Timer running',
    importance: Notifications.AndroidImportance.LOW,
    sound: null,
  });
  // Alarms get their own channels, one per vibration shape, each duplicated with and without sound: Android
  // only ever takes a notification's sound and vibration from the channel it is posted on (never a per
  // notification override, on Android 8 and up), so every combination the Alarms page can offer needs its
  // own channel created up front. MAX importance plus the phone's ALARM audio stream (not the notification
  // or ringer one) is what lets the sound play even with the ringer turned down or the phone on silent, the
  // same stream the stock Clock app's alarms use; bypassDnd only actually does anything once the user has
  // separately granted this app "Do Not Disturb access" in system settings, which nothing here prompts for
  // since Android has no normal runtime permission dialog for it, only harmless otherwise.
  for (const [key, pattern] of Object.entries(ALARM_VIBRATION)) {
    for (const sound of [true, false]) {
      await Notifications.setNotificationChannelAsync(alarmChannelId(key as AlarmVibration, sound), {
        name: `Alarm (${key === 'none' ? 'no vibration' : key}, ${sound ? 'sound' : 'silent'})`,
        importance: Notifications.AndroidImportance.MAX,
        sound: sound ? 'default' : null,
        vibrationPattern: pattern,
        enableVibrate: !!pattern,
        bypassDnd: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        ...(sound ? { audioAttributes: { usage: Notifications.AndroidAudioUsage.ALARM } } : null),
      });
    }
  }
  await setupActionCategories();
}

// ---------------- action buttons on a notification ----------------
//
// A button that only logs something (ACTIONS.addWater) still opens the app to the foreground: Android never
// runs this app's JS to handle a button tap if the app was fully killed (not just backgrounded) and that
// button is marked as not opening the app, so a true "stays closed, just logs it" button cannot be made
// reliable here. Opening the app and then doing the action immediately (see consumeLastNotificationAction()
// below, and where ai.tsx and the root layout call it) is the honest, working version of a one tap button.
export const CATEGORY = {
  logNudge: 'log-nudge', workoutNudge: 'workout-nudge', weighInNudge: 'weighin-nudge',
  photoNudge: 'photo-nudge', coachNudge: 'coach-nudge', alarmSnooze: 'alarm-snooze', alarmPlain: 'alarm-plain',
} as const;
export const ACTION = {
  addWater: 'add_water', openFood: 'open_food', openWorkout: 'open_workout',
  openWeight: 'open_weight', openPhotos: 'open_photos', openChat: 'open_chat', snooze: 'snooze', stopAlarm: 'stop_alarm',
} as const;

async function setupActionCategories() {
  await Notifications.setNotificationCategoryAsync(CATEGORY.logNudge, [
    { identifier: ACTION.addWater, buttonTitle: '+250ml water' },
    { identifier: ACTION.openFood, buttonTitle: 'Log food' },
  ]);
  await Notifications.setNotificationCategoryAsync(CATEGORY.workoutNudge, [
    { identifier: ACTION.openWorkout, buttonTitle: 'Start workout' },
  ]);
  await Notifications.setNotificationCategoryAsync(CATEGORY.weighInNudge, [
    { identifier: ACTION.openWeight, buttonTitle: 'Log weight' },
  ]);
  await Notifications.setNotificationCategoryAsync(CATEGORY.photoNudge, [
    { identifier: ACTION.openPhotos, buttonTitle: 'Add a photo' },
  ]);
  await Notifications.setNotificationCategoryAsync(CATEGORY.coachNudge, [
    { identifier: ACTION.openChat, buttonTitle: 'Ask my coach' },
  ]);
  await Notifications.setNotificationCategoryAsync(CATEGORY.alarmSnooze, [
    { identifier: ACTION.snooze, buttonTitle: 'Snooze' },
    { identifier: ACTION.stopAlarm, buttonTitle: 'Stop' },
  ]);
  await Notifications.setNotificationCategoryAsync(CATEGORY.alarmPlain, [
    { identifier: ACTION.stopAlarm, buttonTitle: 'Stop' },
  ]);
}

/** Fires with the action identifier (one of ACTION's values) whenever a button is tapped while the app is
 *  already running, and also once for whatever action launched the app this time (a cold start from tapping
 *  a button), since the listener below only catches responses that happen after it is registered. Call once
 *  near the top of the app, after initNotifications(). A plain tap on the notification body itself (not a
 *  button) reports Notifications.DEFAULT_ACTION_IDENTIFIER, which this passes through too, your handler can
 *  ignore it if it only cares about the buttons. */
export function onNotificationAction(handler: (actionId: string, data?: Record<string, any>) => void): () => void {
  if (!isNative) return () => {};
  const dataOf = (r: any) => r?.notification?.request?.content?.data as Record<string, any> | undefined;
  Notifications.getLastNotificationResponseAsync().then((r: any) => {
    if (r) handler(r.actionIdentifier, dataOf(r));
  }).catch(() => {});
  const sub = Notifications.addNotificationResponseReceivedListener((r: any) => handler(r.actionIdentifier, dataOf(r)));
  return () => sub.remove();
}

export type AlarmVibration = 'none' | 'short' | 'double' | 'long';
const ALARM_VIBRATION: Record<AlarmVibration, number[] | null> = {
  none: null, short: [0, 250], double: [0, 150, 120, 150], long: [0, 900],
};
export function alarmChannelId(vibration: AlarmVibration, sound: boolean, soundId?: string | null): string {
  if (sound && soundId && soundId !== 'default') return `alarm-${vibration}-${soundId}`;
  return `alarm-${vibration}-${sound ? 'sound' : 'silent'}`;
}

/** A picked alarm sound needs its own channel (Android only takes sound from the channel), made the first time it is
 *  used so the phone's settings do not fill up with channels nobody picked. */
async function ensureAlarmChannel(vibration: AlarmVibration, soundId: string) {
  if (!isNative) return;
  await Notifications.setNotificationChannelAsync(alarmChannelId(vibration, true, soundId), {
    name: `Alarm (${soundId.replace('alarm_', '')}, ${vibration === 'none' ? 'no vibration' : vibration})`,
    importance: Notifications.AndroidImportance.MAX,
    sound: soundFileName(soundId),
    vibrationPattern: ALARM_VIBRATION[vibration],
    enableVibrate: !!ALARM_VIBRATION[vibration],
    bypassDnd: true,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    audioAttributes: { usage: Notifications.AndroidAudioUsage.ALARM },
  });
}

/** Asks once; android 13+ and the browser both need this before anything can show. Returns whether it is allowed. */
export async function requestNotifyPermission(): Promise<boolean> {
  if (isNative) {
    const cur = await Notifications.getPermissionsAsync();
    if (cur.granted) return true;
    const req = await Notifications.requestPermissionsAsync();
    return !!req.granted;
  }
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const res = await Notification.requestPermission();
  return res === 'granted';
}

export function hasPermission(): boolean {
  if (!isNative) return typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted';
  return true; // checked lazily by requestNotifyPermission before the first schedule; good enough for a personal app
}

// Pending web timers, so a reschedule of the same id replaces the old one instead of piling up.
const webTimers = new Map<string, ReturnType<typeof setTimeout>>();

function showWebNotification(title: string, body: string, tag?: string) {
  if (typeof window === 'undefined' || Notification.permission !== 'granted') return;
  try {
    new Notification(title, { body, tag, silent: !!tag });
  } catch {
    /* some browsers in some contexts refuse this quietly; nothing more to do */
  }
}

/** Shows right away, no scheduling. */
export function notifyNow(title: string, body: string) {
  if (getBreakEnd()) return; // on a break
  if (isNative) {
    if (!channelReady) return;
    Notifications.scheduleNotificationAsync({ content: { title, body }, trigger: null }).catch(() => {});
  } else {
    showWebNotification(title, body);
  }
}

/** Cancels a previously scheduled reminder by its id, on whichever platform scheduled it. */
export function cancelScheduled(id: string) {
  if (isNative) {
    Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
  } else {
    const t = webTimers.get(id);
    if (t) { clearTimeout(t); webTimers.delete(id); }
  }
}

/** Schedules one reminder for a future moment. Scheduling the same id again replaces it, it does not double
 *  up. channelId picks the sound/vibration/importance (an id from initNotifications(), 'reminders' unless
 *  told otherwise); categoryId, separately, is what actually attaches action buttons (one of CATEGORY's
 *  values) — the two are unrelated Android concepts and passing one where the other belongs silently drops
 *  both the buttons and the real channel, which is exactly the bug this comment is here to stop coming back. */
export function scheduleAt(id: string, when: Date, title: string, body: string, channelId = 'reminders', categoryId?: string, data?: Record<string, unknown>, force = false) {
  cancelScheduled(id);
  if (!force && inBreak(when)) return; // on a break
  const ms = when.getTime() - Date.now();
  if (ms <= 0) return;
  if (isNative) {
    if (!channelReady) return;
    Notifications.scheduleNotificationAsync({
      identifier: id,
      content: { title, body, channelId, ...(categoryId ? { categoryIdentifier: categoryId } : null), ...(data ? { data } : null) },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when },
    }).catch(() => {});
  } else {
    // setTimeout tops out at about 24 days; past that, this would fire straight away, so cap it and let the
    // next app open reschedule closer to the real time instead.
    const capped = Math.min(ms, 2000000000);
    webTimers.set(id, setTimeout(() => { webTimers.delete(id); showWebNotification(title, body); }, capped));
  }
}

// How many times a single alarm notification can be posted in a row (see scheduleAlarmAt) and therefore how
// many ids cancelAlarmAt always clears, whether or not that many were actually used for a given alarm. The
// Alarms page's repeat count stepper imports this to clamp to the same number; the schema.sql CHECK
// constraint on alarms.repeat_count is a separate, SQL side copy of the same ceiling, since SQL cannot
// import a JS constant, so a change here needs that CHECK constraint updated by hand too.
export const MAX_ALARM_REPEATS = 6;

/** An alarm "ringing" a few times is not one native concept on Android, there is no "repeat this sound and
 *  vibration N times" option, so this posts the same notification N times a few seconds apart instead, each
 *  one triggering the channel's sound and vibration pattern on its own. `whens` can be several upcoming days, so a
 *  daily alarm keeps going for the next week even if the app is never opened. Scheduling the same id again (the
 *  alarm changed, or it is just being refreshed) replaces every earlier copy first. On the web the picked sound is
 *  played by the page when each one goes off (a browser notification cannot carry a custom sound). */
export function scheduleAlarmAt(
  id: string, whens: Date | Date[], title: string, body: string, channelId: string, repeatCount: number,
  extra?: { vibration: AlarmVibration; soundId?: string | null; snooze?: number | null; alarmId?: string },
  force = false,
) {
  const list = (Array.isArray(whens) ? whens : [whens]).filter((d) => d.getTime() > Date.now() && (force || !inBreak(d)));
  const category = extra?.alarmId ? (extra.snooze ? CATEGORY.alarmSnooze : CATEGORY.alarmPlain) : undefined;
  (async () => {
    await cancelAlarmAtAsync(id);
    if (isNative && extra?.soundId && extra.soundId !== 'default') await ensureAlarmChannel(extra.vibration, extra.soundId).catch(() => {});
    list.forEach((when, n) => {
      for (let i = 0; i < repeatCount; i++) {
        const at = new Date(when.getTime() + i * 3000);
        const key = `${id}-${n}-${i}`;
        if (isNative) scheduleAt(key, at, title, body, channelId, category, extra?.alarmId ? { alarmId: extra.alarmId, n, snooze: extra.snooze ?? null } : undefined, force);
        else {
          const ms = Math.min(at.getTime() - Date.now(), 2000000000);
          webTimers.set(key, setTimeout(() => { webTimers.delete(key); showWebNotification(title, body); if (i === 0) playSound(extra?.soundId); }, ms));
        }
      }
    });
  })();
}

async function cancelAlarmAtAsync(id: string) {
  await cancelByPrefix(id + '-');
}

/** Cancels every scheduled notification whose id starts with this text (the several copies of one alarm, say). */
export async function cancelByPrefix(prefix: string) {
  if (isNative) {
    try {
      const all = await Notifications.getAllScheduledNotificationsAsync();
      await Promise.all(all.filter((n: any) => String(n.identifier).startsWith(prefix)).map((n: any) => Notifications.cancelScheduledNotificationAsync(n.identifier)));
    } catch { /* nothing to clear */ }
  } else {
    for (const [k, t] of [...webTimers.entries()]) if (k.startsWith(prefix)) { clearTimeout(t); webTimers.delete(k); }
  }
}

export function cancelAlarmAt(id: string) {
  cancelAlarmAtAsync(id);
}

// ---------------- the running timer's own ongoing notification ----------------

const TIMER_ID = 'running-timer';

/** Starts the "timer running" notification. Safe to call again if one is already showing, it just restarts it. */
export function startTimerNotification(title: string) {
  if (isNative) {
    if (!channelReady) return;
    Notifications.scheduleNotificationAsync({
      identifier: TIMER_ID,
      content: { title: 'Timer running', body: title, channelId: 'timer', sticky: true, autoDismiss: false },
      trigger: null,
    }).catch(() => {});
  } else {
    showWebNotification('Timer running', title, TIMER_ID);
  }
}

/** Refreshes the elapsed time shown. Call this every so often (the Dashboard does it once a minute) while it runs. */
export function updateTimerNotification(title: string, elapsed: string) {
  if (isNative) {
    if (!channelReady) return;
    Notifications.scheduleNotificationAsync({
      identifier: TIMER_ID,
      content: { title: 'Timer running', body: `${title} · ${elapsed}`, channelId: 'timer', sticky: true, autoDismiss: false },
      trigger: null,
    }).catch(() => {});
  } else {
    showWebNotification('Timer running', `${title} · ${elapsed}`, TIMER_ID);
  }
}

export function stopTimerNotification() {
  if (isNative) Notifications.dismissNotificationAsync(TIMER_ID).catch(() => {});
  // The web one clears itself out on its own next time a new one with the same tag replaces it; closing it
  // outright needs the Notification object, which is not kept around, so it is left to fade out from the tray.
}
