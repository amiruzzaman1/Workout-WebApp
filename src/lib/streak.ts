// How many days in a row, up to today, something has been logged: food, a workout, a weigh in or sleep.
// Shared by the User page's badge, the Dashboard banner, and the "don't lose it" notification nudge, so the
// three of them can never show a different number for the same thing.
function shiftISO(day: string, days: number) {
  const d = new Date(`${day}T00:00:00`);
  d.setDate(d.getDate() + days);
  const z = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}

export type StreakInputs = {
  foodEntries: { eaten_on: string }[];
  logs: { performed_on: string }[];
  weights: { day: string }[];
  sleep: { night_of: string }[];
};

/** Every day with anything logged at all, as a set of "YYYY-MM-DD" strings. */
export function loggedDaySet(x: StreakInputs): Set<string> {
  return new Set<string>([
    ...x.foodEntries.map((e) => e.eaten_on),
    ...x.logs.map((l) => l.performed_on),
    ...x.weights.map((w) => w.day),
    ...x.sleep.map((s) => s.night_of),
  ]);
}

/** Days in a row up to and including today, or up to yesterday if nothing is logged yet today, so the
 *  number does not drop to 0 the moment a new day starts, only if the day before is actually skipped. */
export function currentStreak(days: Set<string>, today: string): number {
  let d = today;
  if (!days.has(d)) d = shiftISO(d, -1);
  let n = 0;
  while (days.has(d)) { n++; d = shiftISO(d, -1); }
  return n;
}
