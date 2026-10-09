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

const isNative = Platform.OS === 'android' || Platform.OS === 'ios';
// expo-notifications only on native: it has no real scheduler on web, so it is never imported there.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Notifications = isNative ? require('expo-notifications') : null;

let channelReady = false;
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
  await Notifications.setNotificationChannelAsync('timer', {
    name: 'Timer running',
    importance: Notifications.AndroidImportance.LOW,
    sound: null,
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

/** Schedules one reminder for a future moment. Scheduling the same id again replaces it, it does not double up. */
export function scheduleAt(id: string, when: Date, title: string, body: string) {
  cancelScheduled(id);
  const ms = when.getTime() - Date.now();
  if (ms <= 0) return;
  if (isNative) {
    if (!channelReady) return;
    Notifications.scheduleNotificationAsync({
      identifier: id,
      content: { title, body, channelId: 'reminders' },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when },
    }).catch(() => {});
  } else {
    // setTimeout tops out at about 24 days; past that, this would fire straight away, so cap it and let the
    // next app open reschedule closer to the real time instead.
    const capped = Math.min(ms, 2000000000);
    webTimers.set(id, setTimeout(() => { webTimers.delete(id); showWebNotification(title, body); }, capped));
  }
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
