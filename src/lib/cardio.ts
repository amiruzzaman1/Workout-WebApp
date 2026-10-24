// Cardio numbers that matter for a session: how long, how fast, how steep, how hard your heart should work and
// roughly how many calories it burns. Everything here is an ESTIMATE from your weight and age, shown as the
// starting point on the plan, and every number can be edited by hand (session editor or the workout screen).
// Calories are the extra ones the exercise burns on top of resting (net), the same idea as the training calories
// the Food tab adds to your daily burn, so nothing is counted twice.

export type CardioKind = 'treadmill' | 'bike' | 'cross' | 'rower' | 'stairs' | 'rope';
export type Intensity = 'easy' | 'steady' | 'hard';
/** Treadmill style: a steady walk, jog or run, or intervals that alternate fast and easy. */
export type TreadMode = 'walk' | 'jog' | 'run' | 'intervals';

/** Your own final numbers. Anything left out falls back to the estimate. */
export type CardioPlan = {
  speedKmh?: number;   // treadmill
  incline?: number;    // treadmill, percent
  level?: number;      // resistance or level on bike, cross trainer, stairs; damper on the rower
  hrLow?: number;      // target heart rate, beats per minute
  hrHigh?: number;
  kcal?: number;       // only used when kcalManual is true
  kcalManual?: boolean;
  intensity?: Intensity;
  // Treadmill only
  mode?: TreadMode;
  distanceKm?: number;   // only used when distanceManual is true
  distanceManual?: boolean;
  fastKmh?: number;      // intervals: the fast part
  fastMin?: number;      // intervals: minutes fast
  easyMin?: number;      // intervals: minutes easy (at speedKmh)
};

const KIND: Record<string, CardioKind> = {
  Walking_Treadmill: 'treadmill', Jogging_Treadmill: 'treadmill', Running_Treadmill: 'treadmill',
  Bicycling_Stationary: 'bike', Recumbent_Bike: 'bike', Air_Bike: 'bike',
  Elliptical_Trainer: 'cross',
  Rowing_Stationary: 'rower',
  Stairmaster: 'stairs', Step_Mill: 'stairs', Power_Stairs: 'stairs',
  Rope_Jumping: 'rope',
};

export function cardioKind(exerciseId: string): CardioKind | null {
  return KIND[exerciseId] ?? null;
}

export const KIND_LABEL: Record<CardioKind, string> = {
  treadmill: 'Treadmill', bike: 'Bike', cross: 'Cross trainer', rower: 'Rower', stairs: 'Stair climber', rope: 'Skipping rope',
};
export const MODE_LABEL: Record<TreadMode, string> = { walk: 'Walk', jog: 'Jog', run: 'Run', intervals: 'Intervals' };

/** Speed and incline to start from when you pick a treadmill style. */
export const MODE_DEFAULTS: Record<TreadMode, Partial<CardioPlan>> = {
  walk: { speedKmh: 5.5, incline: 6, hrLow: undefined },
  jog: { speedKmh: 7, incline: 1 },
  run: { speedKmh: 9, incline: 1 },
  intervals: { speedKmh: 4.5, incline: 2, fastKmh: 8, fastMin: 1, easyMin: 2 },
};

export const LEVEL_LABEL: Record<CardioKind, string> = {
  treadmill: '', bike: 'Resistance level', cross: 'Resistance level', rower: 'Damper (1 to 10)', stairs: 'Level', rope: '',
};

export type Who = { weightKg: number; age: number };

/** Fills in a weight and age when the profile does not have them yet. */
export function whoFrom(p: { weight_kg?: number | string | null; birth_date?: string | null; birth_year?: number | null } | null | undefined): Who {
  const w = Number(p?.weight_kg);
  const now = new Date();
  let age = 30;
  if (p?.birth_date && /^\d{4}-\d{2}-\d{2}/.test(p.birth_date)) {
    const b = new Date(p.birth_date + 'T12:00:00');
    age = now.getFullYear() - b.getFullYear() - (now < new Date(now.getFullYear(), b.getMonth(), b.getDate()) ? 1 : 0);
  } else if (p?.birth_year) age = now.getFullYear() - p.birth_year;
  return { weightKg: Number.isFinite(w) && w > 30 ? w : 75, age: Math.min(80, Math.max(16, age)) };
}

const HR_ZONE: Record<Intensity, [number, number]> = { easy: [0.5, 0.6], steady: [0.6, 0.7], hard: [0.7, 0.8] };

export function heartRange(age: number, intensity: Intensity): [number, number] {
  const max = 220 - age;
  const [a, b] = HR_ZONE[intensity];
  return [Math.round(max * a), Math.round(max * b)];
}

// Starting numbers for each machine at each effort. A beginner who is losing fat does best with a steady incline
// walk rather than a run: low impact on the knees and a good calorie burn.
const DEFAULTS: Record<CardioKind, Record<Intensity, { speed?: number; incline?: number; level?: number; met: number }>> = {
  treadmill: { easy: { speed: 4.5, incline: 0, met: 0 }, steady: { speed: 5.5, incline: 6, met: 0 }, hard: { speed: 5.5, incline: 10, met: 0 } },
  bike: { easy: { level: 4, met: 4 }, steady: { level: 6, met: 5.8 }, hard: { level: 8, met: 7.5 } },
  cross: { easy: { level: 3, met: 4.6 }, steady: { level: 5, met: 5.8 }, hard: { level: 7, met: 7.2 } },
  rower: { easy: { level: 3, met: 4.8 }, steady: { level: 4, met: 7 }, hard: { level: 5, met: 8.5 } },
  stairs: { easy: { level: 3, met: 6 }, steady: { level: 5, met: 8 }, hard: { level: 7, met: 9 } },
  rope: { easy: { met: 8.8 }, steady: { met: 11.8 }, hard: { met: 12.3 } },
};

/** The numbers to start with for this exercise: speed, incline, level and heart rate (not calories, see kcalFor). */
export function estimateCardio(exerciseId: string, intensity: Intensity, age: number): CardioPlan {
  const k = cardioKind(exerciseId);
  const [hrLow, hrHigh] = heartRange(age, intensity);
  const base: CardioPlan = { intensity, hrLow, hrHigh };
  if (!k) return base;
  const d = DEFAULTS[k][intensity];
  if (k === 'treadmill') {
    // A jog or run starts faster than the walk default.
    const run = exerciseId === 'Running_Treadmill' ? 9 : exerciseId === 'Jogging_Treadmill' ? 7 : null;
    return { ...base, speedKmh: run ?? d.speed, incline: run ? 1 : d.incline };
  }
  return { ...base, level: d.level };
}

/** ACSM walking equation up to about 6.4 km/h, running equation above it. Net of resting (3.5). */
function treadKcal(speedKmh: number, inclinePct: number, minutes: number, kg: number): number {
  const mPerMin = (speedKmh * 1000) / 60;
  const grade = inclinePct / 100;
  const vo2 = speedKmh <= 6.4 ? 0.1 * mPerMin + 1.8 * mPerMin * grade : 0.2 * mPerMin + 0.9 * mPerMin * grade;
  return (vo2 * kg * 5 * minutes) / 1000;
}

/** Share of an interval session spent on the fast part. */
function fastShare(plan: CardioPlan): number {
  const fast = plan.fastMin ?? 1;
  const easy = plan.easyMin ?? 2;
  return fast + easy > 0 ? fast / (fast + easy) : 0;
}

/** The average treadmill speed over the session, which for intervals mixes the fast and easy parts. */
export function averageSpeed(plan: CardioPlan | undefined, intensity: Intensity = 'steady'): number {
  const base = plan?.speedKmh ?? DEFAULTS.treadmill[intensity].speed ?? 5;
  if (plan?.mode !== 'intervals') return base;
  const f = fastShare(plan);
  return f * (plan.fastKmh ?? 8) + (1 - f) * base;
}

/** Distance in km for a treadmill session: what you typed, or minutes times the average speed. */
export function distanceFor(minutes: number, plan?: CardioPlan): number {
  if (plan?.distanceManual && Number.isFinite(plan.distanceKm)) return Math.round((plan.distanceKm as number) * 100) / 100;
  return Math.round((averageSpeed(plan, plan?.intensity) * minutes / 60) * 100) / 100;
}

/** Extra calories burned for `minutes` of this exercise, from the plan's numbers (or the estimate where missing). */
export function kcalFor(exerciseId: string, minutes: number, who: Who, plan?: CardioPlan): number {
  if (!(minutes > 0)) return 0;
  const k = cardioKind(exerciseId);
  const intensity = plan?.intensity ?? 'steady';
  if (plan?.kcalManual && Number.isFinite(plan.kcal)) return Math.round(plan.kcal as number);
  if (!k) return Math.round(((5 - 1) * 3.5 * who.weightKg) / 200 * minutes);
  if (k === 'treadmill') {
    const d = DEFAULTS.treadmill[intensity];
    const speed = plan?.speedKmh ?? d.speed ?? 5;
    const incline = plan?.incline ?? d.incline ?? 0;
    if (plan?.mode === 'intervals') {
      const f = fastShare(plan);
      return Math.round(f * treadKcal(plan.fastKmh ?? 8, incline, minutes, who.weightKg) + (1 - f) * treadKcal(speed, incline, minutes, who.weightKg));
    }
    return Math.round(treadKcal(speed, incline, minutes, who.weightKg));
  }
  // Machines with a level: the MET moves a little with the level you pick, around the default for that effort.
  const d = DEFAULTS[k][intensity];
  const lvl = plan?.level;
  const lvlAdj = lvl != null && d.level != null ? 1 + (lvl - d.level) * 0.05 : 1;
  const met = Math.max(2, d.met * lvlAdj);
  return Math.round(((met - 1) * 3.5 * who.weightKg * minutes) / 200);
}

/** The heart rate range to show: your own numbers if you set them, otherwise the estimate for the effort. */
export function heartTarget(plan: CardioPlan | undefined, age: number): [number, number] {
  if (plan?.hrLow && plan?.hrHigh) return [plan.hrLow, plan.hrHigh];
  return heartRange(age, plan?.intensity ?? 'steady');
}

/** A short line for the workout card, such as "5.5 km/h, 6% incline, 126 to 147 bpm, about 160 kcal". */
export function cardioSummary(exerciseId: string, minutes: number, who: Who, plan?: CardioPlan): string {
  const k = cardioKind(exerciseId);
  const parts: string[] = [];
  if (k === 'treadmill') {
    const p = plan?.speedKmh != null ? plan : { ...estimateCardio(exerciseId, plan?.intensity ?? 'steady', who.age), ...plan };
    parts.push(plan?.mode === 'intervals' ? `${plan.fastMin ?? 1} min at ${plan.fastKmh ?? 8}, ${plan.easyMin ?? 2} min at ${p.speedKmh} km/h` : `${p.speedKmh} km/h`, `${p.incline ?? 0}% incline`, `${distanceFor(minutes, plan)} km`);
  } else if (k && k !== 'rope') {
    const lvl = plan?.level ?? estimateCardio(exerciseId, plan?.intensity ?? 'steady', who.age).level;
    parts.push(`${LEVEL_LABEL[k].toLowerCase().replace(' (1 to 10)', '')} ${lvl}`);
  }
  const [lo, hi] = heartTarget(plan, who.age);
  parts.push(`${lo} to ${hi} bpm`, `about ${kcalFor(exerciseId, minutes, who, plan)} kcal`);
  return parts.join(', ');
}
