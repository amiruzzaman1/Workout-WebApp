// Celebrates crossing a real milestone the moment it happens, rather than on a schedule: a streak reaching a
// round number, or getting a quarter, half, three quarters or all the way to the goal weight. Each one only
// fires once per crossing (the last value seen is kept in AsyncStorage), so logging again the same day, or
// opening the app twice, never repeats the same celebration.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { notifyNow } from './notify';

const STREAK_STEPS = [3, 7, 14, 21, 30, 50, 75, 100, 150, 200, 365];
const GOAL_STEPS = [0.25, 0.5, 0.75, 1];

const KEY_STREAK = 'forge.milestone.streak';
const KEY_GOAL = 'forge.milestone.goal';
const KEY_GOAL_KG = 'forge.milestone.goalkg';

async function highestCrossed(key: string, steps: number[], value: number): Promise<number | null> {
  const reached = [...steps].reverse().find((s) => value >= s);
  if (reached == null) return null;
  const seenRaw = await AsyncStorage.getItem(key).catch(() => null);
  const seen = seenRaw ? Number(seenRaw) : 0;
  if (reached <= seen) return null;
  await AsyncStorage.setItem(key, String(reached)).catch(() => {});
  return reached;
}

/** Call with the current day streak (src/lib/streak.ts) whenever it is known, e.g. the Dashboard effect. */
export async function checkStreakMilestone(days: number) {
  const reached = await highestCrossed(KEY_STREAK, STREAK_STEPS, days);
  if (reached == null) return;
  const line = reached >= 100 ? `${reached} days. That is not a habit anymore, that is who you are now.`
    : reached >= 30 ? `${reached} days in a row. A full month of showing up.`
    : `${reached} day streak. Keep it going.`;
  notifyNow('🔥 New streak milestone', line);
}

/** Call with how far along the current weight goal is (0 to 1, coach.ts's goalPct) and the goal itself in kg,
 *  whenever both are known. Changing the goal weight (a new target set) quietly resets which thresholds have
 *  already been celebrated, so the next weigh in can celebrate 25% of the new goal instead of staying silent
 *  because the old goal's 100% was already marked as seen. */
export async function checkGoalMilestone(goalPct: number | null, goalKg: number | null) {
  if (goalPct == null) return;
  if (goalKg != null) {
    const seenKg = await AsyncStorage.getItem(KEY_GOAL_KG).catch(() => null);
    if (seenKg !== String(goalKg)) {
      await AsyncStorage.setItem(KEY_GOAL_KG, String(goalKg)).catch(() => {});
      await AsyncStorage.removeItem(KEY_GOAL).catch(() => {});
    }
  }
  const reached = await highestCrossed(KEY_GOAL, GOAL_STEPS, goalPct);
  if (reached == null) return;
  const line = reached >= 1 ? "You reached your goal weight. Time to set a new one, or just hold here for a while."
    : `${Math.round(reached * 100)}% of the way to your goal weight. Keep going.`;
  notifyNow(reached >= 1 ? '🎯 Goal reached' : '🎯 Getting closer', line);
}
