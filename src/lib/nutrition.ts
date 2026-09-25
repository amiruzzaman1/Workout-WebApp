// Body metrics and daily targets.
// BMR: Mifflin-St Jeor. TDEE: resting burn plus work and training.
// These are estimates, not medical advice.
import { Profile } from './planner';

export type Sex = 'male' | 'female';
export type JobActivity = 'desk' | 'light' | 'active' | 'heavy';

export const JOB_LABELS: Record<JobActivity, string> = {
  desk: 'Mostly sitting',
  light: 'Sitting and moving',
  active: 'On my feet',
  heavy: 'Heavy physical work',
};

/** Shown under the chips so you can check you picked the right one. */
export const JOB_DESCRIPTIONS: Record<JobActivity, string> = {
  desk: 'Seated for most of the shift, standing up now and then. Office or study work, driving, a call centre, a ticket desk.',
  light: 'A mix of sitting and moving, nothing heavy. Shop counter, reception, lab work, teaching, delivery driving where you mostly stay in the car.',
  active: 'Walking or standing almost the whole shift, carrying light things. Kitchen work, waiting tables, courier rounds on foot or bike, nursing, supermarket or warehouse floor.',
  heavy: 'Hard physical work with lifting or digging for much of the shift. Construction, landscaping, farm work, furniture removal, scaffolding.',
};

/** Extra METs above resting, per hour worked. */
const JOB_MET: Record<JobActivity, number> = { desk: 0.3, light: 1.0, active: 1.8, heavy: 3.5 };
const DEFAULT_WORK_HOURS = 38;

export type Body = {
  height_cm?: number | null;
  weight_kg?: number | null;
  sex?: Sex | null;
  birth_year?: number | null;
  birth_date?: string | null;
  job_activity?: JobActivity | null;
  work_hours_week?: number | null;
  work_hours_by_day?: (number | null)[] | null;
  target_weight_kg?: number | null;
  calorie_override?: number | null;
  water_goal_ml?: number | null;
};

export type Targets = {
  ready: boolean;
  problem?: string;
  age?: number;
  bmi?: number;
  bmiLabel?: string;
  healthyRange?: [number, number];
  bmr?: number;
  tdee?: number;
  workKcal?: number;
  trainKcal?: number;
  workHours?: number;
  direction?: 'lose' | 'gain' | 'hold';
  goalNote?: string;
  tips?: string[];
  weeklyKg?: number;
  weeksToGoal?: number | null;
  goalDate?: string | null;
  kcal?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fibre?: number;
  water?: number;
  rationale?: string;
  /** Upper limits, not goals to hit: staying under these is the healthy range, unlike protein or fibre. */
  sugars?: number;
  satFat?: number;
  sodium?: number;
};

export const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Weekly work hours: the per-day list when it's filled in, otherwise the weekly total. */
export function weeklyWorkHours(p: Body | null | undefined): number | null {
  const byDay = p?.work_hours_by_day;
  if (byDay && byDay.some((v) => v != null && Number(v) > 0)) {
    return byDay.reduce((a: number, v) => a + (Number(v) || 0), 0);
  }
  const wk = p?.work_hours_week;
  return wk != null && Number(wk) > 0 ? Number(wk) : null;
}

export function bmiLabel(bmi: number) {
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Healthy weight';
  if (bmi < 30) return 'Overweight';
  return 'Obese';
}

/** Exact age from a date of birth (YYYY-MM-DD). */
export function ageFromDate(d: string | null | undefined): number | null {
  if (!d) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d);
  if (!m) return null;
  const [y, mo, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const now = new Date();
  let age = now.getFullYear() - y;
  const hadBirthday = now.getMonth() + 1 > mo || (now.getMonth() + 1 === mo && now.getDate() >= day);
  if (!hadBirthday) age -= 1;
  return age >= 13 && age <= 100 ? age : null;
}

export function isValidDate(y: number, mo: number, d: number) {
  if (!(mo >= 1 && mo <= 12) || !(d >= 1 && d <= 31)) return false;
  const dt = new Date(y, mo - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === mo - 1 && dt.getDate() === d && dt <= new Date();
}

/** Older saves hold a year of birth (or, from a typo, a plain age). */
export function ageFrom(birth: number | null | undefined): number | null {
  if (!birth) return null;
  const n = Number(birth);
  if (!Number.isFinite(n)) return null;
  const age = n > 1900 ? new Date().getFullYear() - n : n;
  return age >= 13 && age <= 100 ? age : null;
}

export function computeTargets(p: (Profile & Body) | null): Targets {
  if (!p || !p.height_cm || !p.weight_kg || !p.sex || (!p.birth_date && !p.birth_year)) return { ready: false };
  const h = Number(p.height_cm);
  const w = Number(p.weight_kg);
  const age = ageFromDate(p.birth_date) ?? ageFrom(p.birth_year);
  if (age == null) return { ready: false, problem: 'Enter your date of birth (you must be 13 or older).' };
  if (!(h >= 100 && h <= 250)) return { ready: false, problem: 'Enter your height in centimetres (100 to 250).' };
  if (!(w >= 30 && w <= 300)) return { ready: false, problem: 'Enter your weight in kilograms (30 to 300).' };
  const m = h / 100;
  const bmi = w / (m * m);

  const bmr = Math.round(10 * w + 6.25 * h - 5 * age + (p.sex === 'male' ? 5 : -161));

  // Daily burn = resting + everyday living + work + training, rather than one blanket multiplier.
  const job = (p.job_activity as JobActivity) ?? 'light';
  const workHours = weeklyWorkHours(p) ?? DEFAULT_WORK_HOURS;
  const workKcal = Math.round((workHours * JOB_MET[job] * w) / 7);
  const sessions = (p.training_days?.length ?? 3) + (p.double_days?.length ?? 0);
  const minutes = p.session_minutes ?? 60;
  // Lifting sits around 5 METs, so about 4 above resting.
  const trainKcal = Math.round((sessions * (minutes / 60) * 4 * w) / 7);
  const tdee = Math.round(bmr * 1.2 + workKcal + trainKcal);

  // Your goal weight drives the calories. Gap to close, then a safe weekly pace.
  const goalW = p.target_weight_kg ? Number(p.target_weight_kg) : null;
  const gap = goalW ? goalW - w : null;
  let direction: 'lose' | 'gain' | 'hold' =
    gap == null
      ? p.goal === 'fat_loss' || p.goal === 'recomp' ? 'lose' : p.goal === 'muscle' || p.goal === 'strength' ? 'gain' : 'hold'
      : gap <= -0.5 ? 'lose' : gap >= 0.5 ? 'gain' : 'hold';

  // What you're training for shapes how fast, and how the food is split.
  const wantsMuscle = p.goal === 'muscle' || p.goal === 'strength' || p.goal === 'recomp';
  const recomp = p.goal === 'recomp';
  let weeklyKg = 0;
  let kcal = tdee;
  let rationale = 'Matched to your daily burn, so your weight stays where it is.';
  let goalNote: string | undefined;

  if (direction === 'lose') {
    // Up to 0.75% of bodyweight a week, gentler when you're building muscle or nearly there.
    const rateCap = recomp ? 0.004 : wantsMuscle ? 0.005 : 0.0075;
    const maxRate = Math.min(recomp ? 0.4 : wantsMuscle ? 0.5 : 0.75, w * rateCap);
    weeklyKg = -(gap != null && Math.abs(gap) < 2 ? Math.min(0.25, maxRate) : maxRate);
    kcal = Math.round(tdee + (weeklyKg * 7700) / 7);
    const floor = Math.round(bmr * 1.1);
    if (kcal < floor) {
      kcal = floor;
      weeklyKg = ((kcal - tdee) * 7) / 7700;
    }
    rationale = `${Math.round(tdee - kcal)} kcal below your daily burn, about ${Math.abs(weeklyKg).toFixed(2)} kg a week.`;
    if (recomp) {
      rationale += ' A gentle deficit with high protein, so the fat comes off while you build.';
      goalNote = `Losing fat and building muscle at the same time works best like this: a small deficit, ${Math.round(w * 2.2)} g of protein a day, and hard lifting. Expect the scale to move slowly, around ${Math.abs(weeklyKg).toFixed(2)} kg a week. Go by your waist measurement, the mirror and your lifts, not the scale alone.`;
    } else if (wantsMuscle) {
      rationale += ' A small deficit, so you hold onto muscle while the fat comes off.';
      if (gap != null) goalNote = `You picked ${p.goal === 'strength' ? 'getting stronger' : 'building muscle'}, but your goal weight (${goalW} kg) is lower than your weight now (${w} kg). Eating under your burn takes fat off, so you'll get leaner and more defined, and your strength should hold. Very little new muscle is built while you're in a deficit, though. If you want to grow instead, set a goal weight above ${w} kg, or switch your goal to "Lose fat and build muscle".`;
    }
  } else if (direction === 'gain') {
    weeklyKg = p.goal === 'fat_loss' ? 0.15 : gap != null && Math.abs(gap) > 5 ? 0.3 : 0.22;
    kcal = Math.round(tdee + (weeklyKg * 7700) / 7);
    rationale = `${kcal - tdee} kcal above your daily burn, about ${weeklyKg.toFixed(2)} kg a week, ${wantsMuscle ? 'mostly muscle while you keep lifting' : 'so you gain it slowly'}.`;
    if (p.goal === 'fat_loss' && gap != null) goalNote = 'Your goal is losing fat, but your goal weight is above where you are now. Set a lower goal weight, or switch your goal in your profile.';
  } else if (gap != null) {
    rationale = wantsMuscle
      ? "You're at your goal weight, so this holds you steady. Muscle will come slowly at this intake."
      : "You're at your goal weight, so this holds you there.";
  }

  if (p.calorie_override) {
    kcal = p.calorie_override;
    weeklyKg = ((kcal - tdee) * 7) / 7700;
    direction = Math.abs(kcal - tdee) < 60 ? 'hold' : kcal < tdee ? 'lose' : 'gain';
    rationale = `Your own target: about ${weeklyKg > 0 ? '+' : ''}${weeklyKg.toFixed(2)} kg a week at this intake.`;
  }
  // Never suggest a starvation-level target, whatever the inputs say.
  kcal = Math.max(1200, Math.round(kcal));

  const weeksToGoal = gap != null && weeklyKg !== 0 && Math.sign(gap) === Math.sign(weeklyKg)
    ? Math.ceil(Math.abs(gap / weeklyKg)) : null;
  const goalDate = weeksToGoal != null && weeksToGoal < 260
    ? new Date(Date.now() + weeksToGoal * 7 * 864e5).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
    : null;

  const proteinPerKg = recomp ? 2.2 : direction === 'lose' ? 2.0 : wantsMuscle ? 1.9 : p.goal === 'general' ? 1.6 : 1.8;
  const protein = Math.round(w * proteinPerKg);
  const fat = Math.max(Math.round(w * 0.8), Math.round((kcal * 0.22) / 9));
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
  const fibre = Math.round((kcal / 1000) * 14);
  const water = p.water_goal_ml ?? Math.round((w * 35 + sessions * 70 + (workHours / 7) * 60) / 100) * 100;
  // Sugars and saturated fat: WHO/NZ guidance caps free sugars and saturated fat at about 10% of calories
  // each, so these scale with your own calorie target. Sodium is a flat population safety limit (NZ Ministry
  // of Health, about 2300 mg a day for an adult) that does not change with body size or calorie target.
  const sugars = Math.round((kcal * 0.1) / 4);
  const satFat = Math.round((kcal * 0.1) / 9);
  const sodium = 2300;

  const tips: string[] = [];
  if (recomp) {
    tips.push(`Protein is the whole game here: ${protein} g a day, spread over 3 or 4 meals of about ${Math.round(protein / 3.5)} g.`);
    tips.push('Lift hard and chase the progression prompts. Losing fat while adding muscle only works if the weights keep going up.');
    tips.push('Measure your waist every couple of weeks. In a recomp the scale barely moves while your shape changes.');
    tips.push('Sleep matters more than any supplement here. Aim for 7 to 8 hours.');
  } else if (wantsMuscle) {
    tips.push(`Spread your ${protein} g of protein over 3 or 4 meals, around ${Math.round(protein / 3.5)} g each, so there's always material to build with.`);
    tips.push('Eat a meal with carbs and protein within a couple of hours of training.');
    if (direction !== 'lose') tips.push('If the scale hasn\'t moved in two weeks, add 150 kcal and check again.');
  } else if (p.goal === 'fat_loss') {
    tips.push(`Protein is the one to hit every day (${protein} g): it keeps you full and protects muscle in a deficit.`);
    tips.push('Fill half the plate with vegetables; the fibre target does most of the work on hunger.');
    tips.push('If weight hasn\'t moved in two weeks, take 100 to 150 kcal off carbs rather than protein.');
  } else {
    tips.push(`Aim for ${protein} g of protein and ${fibre} g of fibre most days; the rest is flexible.`);
    tips.push('Keep an eye on the weekly average rather than any one day.');
  }
  tips.push(`Drink about ${(water / 1000).toFixed(1)} L of water a day, more on gym days and long shifts.`);

  return {
    ready: true, age, bmi, bmiLabel: bmiLabel(bmi), goalNote, tips,
    healthyRange: [Math.round(18.5 * m * m * 10) / 10, Math.round(24.9 * m * m * 10) / 10],
    bmr, tdee, kcal, protein, carbs, fat, fibre, water, sugars, satFat, sodium, rationale, workKcal, trainKcal, workHours,
    direction, weeklyKg: Math.round(weeklyKg * 100) / 100, weeksToGoal, goalDate,
  };
}

// ---------- height units ----------
export function cmToFtIn(cm: number) {
  const totalIn = cm / 2.54;
  let ft = Math.floor(totalIn / 12);
  let inch = Math.round(totalIn - ft * 12);
  if (inch === 12) { ft += 1; inch = 0; }
  return { ft, inch };
}
export function ftInToCm(ft: number, inch: number) {
  return Math.round((ft * 12 + inch) * 2.54 * 10) / 10;
}

// ---------- food data ----------
/** Set on foods that users added to the shared list. */
export type SharedMeta = {
  action: 'added' | 'edited';
  by: 'you' | 'other'; // who added it, or who edited it last
  updated_at: string;
};

export type Food = {
  id?: string;
  name: string;
  brand?: string | null;
  barcode?: string | null;
  kcal_100: number;
  protein_100: number;
  carbs_100: number;
  sugars_100?: number | null;
  fat_100: number;
  sat_fat_100?: number | null;
  fibre_100?: number | null;
  sodium_100?: number | null; // mg per 100 g
  serving_g?: number | null;
  serving_label?: string | null;
  unit?: string; // "g", "ml", or "piece" for a food counted whole (a kebab, a slice, a can)
  source?: string | null;
  shared?: SharedMeta;
  /** Household measures for the built in ingredients: d is grams in 1 ml, pc is grams in 1 piece. */
  measures?: { d?: number; pc?: number };
  /** Set on a food made from one of your recipes, so the portion screen can offer to edit it. */
  recipe_id?: string;
};

export type FoodEntry = {
  id: string;
  eaten_on: string;
  meal: Meal;
  name: string;
  brand?: string | null;
  barcode?: string | null;
  amount: number;
  unit: string;
  serving_label?: string | null;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  sugars_g?: number | null;
  fat_g: number;
  sat_fat_g?: number | null;
  fibre_g?: number | null;
  sodium_mg?: number | null;
  source?: string | null;
};

export type Meal = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export const MEALS: Meal[] = ['breakfast', 'lunch', 'dinner', 'snack'];
export const MEAL_LABELS: Record<Meal, string> = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snacks' };

const n = (v: any) => (v == null || v === '' || Number.isNaN(Number(v)) ? null : Number(v));

/**
 * Scale a food's numbers to how much of it you had. For "g" or "ml" foods, `kcal_100` and friends are per
 * 100 of that unit, so the factor is amount/100. For a "piece" food (a kebab, a slice, a can), those same
 * fields hold the numbers for one whole piece, so the factor is just the count, e.g. 1.5 pieces.
 */
export function scaleFood(f: Food, amount: number) {
  const k = f.unit === 'piece' ? amount : amount / 100;
  const r = (v: number | null | undefined, d = 1) => (v == null ? null : Math.round(v * k * 10 ** d) / 10 ** d);
  return {
    kcal: Math.round((f.kcal_100 ?? 0) * k),
    protein_g: r(f.protein_100) ?? 0,
    carbs_g: r(f.carbs_100) ?? 0,
    sugars_g: r(f.sugars_100),
    fat_g: r(f.fat_100) ?? 0,
    sat_fat_g: r(f.sat_fat_100),
    fibre_g: r(f.fibre_100),
    sodium_mg: r(f.sodium_100, 0),
  };
}

/** Turns a logged amount back into "2" or "2 pieces" or "150 g", for showing in a list. */
export function fmtAmount(amount: number, unit: string, singular?: string | null) {
  if (unit !== 'piece') return `${round(amount)} ${unit}`;
  const word = (singular || 'piece').replace(/^\d+\s*/, '');
  return amount === 1 ? `1 ${word}` : `${round(amount, 2)} ${/s$/i.test(word) ? word : `${word}s`}`;
}

/** Rebuilds a Food from a logged entry's saved totals, so picking it again scales from the same numbers. */
export function entryToFood(e: FoodEntry): Food {
  const amount = Number(e.amount) || (e.unit === 'piece' ? 1 : 100);
  const k = e.unit === 'piece' ? 1 / amount : 100 / amount;
  return {
    name: e.name, brand: e.brand, barcode: e.barcode,
    kcal_100: Number(e.kcal) * k, protein_100: Number(e.protein_g) * k, carbs_100: Number(e.carbs_g) * k,
    sugars_100: e.sugars_g == null ? null : Number(e.sugars_g) * k,
    fat_100: Number(e.fat_g) * k,
    sat_fat_100: e.sat_fat_g == null ? null : Number(e.sat_fat_g) * k,
    fibre_100: e.fibre_g == null ? null : Number(e.fibre_g) * k,
    sodium_100: e.sodium_mg == null ? null : Number(e.sodium_mg) * k,
    serving_g: null, serving_label: e.serving_label, unit: e.unit, source: e.source,
  };
}

export function totals(entries: FoodEntry[]) {
  const t = { kcal: 0, protein: 0, carbs: 0, fat: 0, sugars: 0, satFat: 0, fibre: 0, sodium: 0 };
  for (const e of entries) {
    t.kcal += Number(e.kcal) || 0;
    t.protein += Number(e.protein_g) || 0;
    t.carbs += Number(e.carbs_g) || 0;
    t.fat += Number(e.fat_g) || 0;
    t.sugars += Number(e.sugars_g) || 0;
    t.satFat += Number(e.sat_fat_g) || 0;
    t.fibre += Number(e.fibre_g) || 0;
    t.sodium += Number(e.sodium_mg) || 0;
  }
  return t;
}

export function round(v: number, d = 0) {
  return Math.round(v * 10 ** d) / 10 ** d;
}

export const nn = n;
