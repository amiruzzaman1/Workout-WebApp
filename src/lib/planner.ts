// Rule-based weekly plan generator.
// Rules:
//  - A muscle group trained hard needs 2 days (48h) before it is trained hard again.
//  - On a two-session day the second session never repeats muscles from the first.
//    Beginners always get light cardio/mobility as the second session.
//  - Beginners get fewer exercises and at most 3 sets.
import { getExercise, isAvailable } from './exercises';

export type Profile = {
  id: string;
  display_name: string | null;
  experience: 'beginner' | 'intermediate';
  goal: 'muscle' | 'fat_loss' | 'strength' | 'general' | 'recomp';
  training_days: number[];
  sessions_per_day: number;
  double_days: number[];
  session_minutes: number;
  split: SplitChoice;
  injuries: string | null;
  gym_name: string | null;
  equipment: string[];
  // body & nutrition (see nutrition.ts)
  height_cm?: number | null;
  weight_kg?: number | null;
  sex?: 'male' | 'female' | null;
  birth_year?: number | null;
  birth_date?: string | null; // YYYY-MM-DD
  job_activity?: 'desk' | 'light' | 'active' | 'heavy' | null;
  work_hours_week?: number | null;
  work_hours_by_day?: (number | null)[] | null;
  target_weight_kg?: number | null;
  calorie_override?: number | null;
  water_goal_ml?: number | null;
};

export type SplitChoice = 'auto' | 'full_body' | 'upper_lower' | 'ppl' | 'body_part';

export type PlanItem = {
  uid: string;
  exerciseId: string;
  slot?: string;
  sets: number;
  reps: string;
  restSec: number;
  note?: string;
};

export type PlanSession = {
  id: string;
  title: string;
  type: 'strength' | 'cardio' | 'mobility';
  focus: string[];
  warmup?: string;
  items: PlanItem[];
};

export type PlanDay = { day: number; sessions: PlanSession[] };

export type PlanData = {
  version: 1;
  generatedAt: string;
  split: Exclude<SplitChoice, 'auto'>;
  notes: string[];
  days: PlanDay[];
};

export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Monday first

export const SPLIT_LABELS: Record<SplitChoice, string> = {
  auto: 'Pick for me',
  full_body: 'Full body',
  upper_lower: 'Upper / Lower',
  ppl: 'Push / Pull / Legs',
  body_part: 'One body part a day',
};

// ---------- Exercise slots: candidates in order of preference ----------
export const SLOTS: Record<string, string[]> = {
  squat: ['Leg_Press', 'Smith_Machine_Squat', 'Hack_Squat', 'Goblet_Squat', 'Dumbbell_Squat', 'Barbell_Squat', 'Bodyweight_Squat'],
  lunge: ['Split_Squat_with_Dumbbells', 'Dumbbell_Lunges', 'Smith_Single-Leg_Split_Squat', 'Bodyweight_Squat'],
  hinge: ['Stiff-Legged_Dumbbell_Deadlift', 'Hyperextensions_Back_Extensions', 'Pull_Through', 'Romanian_Deadlift', 'Single_Leg_Glute_Bridge'],
  leg_curl: ['Seated_Leg_Curl', 'Lying_Leg_Curls', 'Stiff-Legged_Dumbbell_Deadlift'],
  leg_ext: ['Leg_Extensions', 'Split_Squat_with_Dumbbells'],
  glutes: ['Thigh_Abductor', 'Barbell_Hip_Thrust', 'Single_Leg_Glute_Bridge', 'Butt_Lift_Bridge'],
  calves: ['Standing_Calf_Raises', 'Seated_Calf_Raise', 'Calf_Press_On_The_Leg_Press_Machine', 'Smith_Machine_Calf_Raise', 'Dumbbell_Seated_One-Leg_Calf_Raise'],
  h_push: ['Machine_Bench_Press', 'Leverage_Chest_Press', 'Dumbbell_Bench_Press', 'Smith_Machine_Bench_Press', 'Pushups'],
  incline_push: ['Leverage_Incline_Chest_Press', 'Incline_Dumbbell_Press', 'Smith_Machine_Incline_Bench_Press', 'Incline_Push-Up'],
  chest_fly: ['Butterfly', 'Cable_Crossover', 'Dumbbell_Flyes'],
  v_pull: ['Wide-Grip_Lat_Pulldown', 'Close-Grip_Front_Lat_Pulldown', 'Underhand_Cable_Pulldowns', 'Pullups'],
  h_pull: ['Seated_Cable_Rows', 'Leverage_Iso_Row', 'One-Arm_Dumbbell_Row', 'Bent_Over_Two-Dumbbell_Row'],
  back_iso: ['Straight-Arm_Pulldown', 'Hyperextensions_Back_Extensions', 'Dumbbell_Incline_Row'],
  v_push: ['Machine_Shoulder_Military_Press', 'Leverage_Shoulder_Press', 'Seated_Dumbbell_Press', 'Smith_Machine_Overhead_Shoulder_Press'],
  lateral: ['Side_Lateral_Raise', 'Cable_Seated_Lateral_Raise'],
  rear_delt: ['Reverse_Machine_Flyes', 'Face_Pull', 'Reverse_Flyes'],
  biceps: ['Dumbbell_Bicep_Curl', 'Standing_Biceps_Cable_Curl', 'Machine_Bicep_Curl', 'EZ-Bar_Curl'],
  biceps2: ['Hammer_Curls', 'Cable_Hammer_Curls_-_Rope_Attachment', 'Incline_Dumbbell_Curl'],
  triceps: ['Triceps_Pushdown_-_Rope_Attachment', 'Triceps_Pushdown', 'Machine_Triceps_Extension', 'Bench_Dips'],
  triceps2: ['Cable_Rope_Overhead_Triceps_Extension', 'Standing_Dumbbell_Triceps_Extension', 'Tricep_Dumbbell_Kickback'],
  core: ['Plank', 'Cable_Crunch', 'Ab_Crunch_Machine', 'Crunches', 'Dead_Bug'],
  core2: ['Pallof_Press', 'Reverse_Crunch', 'Side_Bridge', 'Dead_Bug'],
  cardio: ['Walking_Treadmill', 'Bicycling_Stationary', 'Elliptical_Trainer', 'Rowing_Stationary', 'Stairmaster'],
};

const ISOLATION = new Set(['lateral', 'rear_delt', 'biceps', 'biceps2', 'triceps', 'triceps2', 'calves', 'chest_fly', 'leg_ext', 'leg_curl', 'glutes', 'back_iso']);
const CORE = new Set(['core', 'core2']);

const STRETCHES = ['Childs_Pose', 'Kneeling_Hip_Flexor', 'Hamstring_Stretch', 'Chest_And_Front_Of_Shoulder_Stretch', 'Cat_Stretch', 'Standing_Hip_Circles', 'Upper_Back_Stretch'];

// ---------- Session templates ----------
type Template = { key: string; title: string; groups: string[]; slots: string[] };

const T: Record<string, Template> = {
  fbA: { key: 'fbA', title: 'Full Body A', groups: ['chest', 'back', 'shoulders', 'quads', 'hamstrings'], slots: ['squat', 'h_push', 'v_pull', 'hinge', 'lateral', 'core', 'biceps', 'triceps'] },
  fbB: { key: 'fbB', title: 'Full Body B', groups: ['chest', 'back', 'shoulders', 'quads', 'hamstrings'], slots: ['leg_curl', 'v_push', 'h_pull', 'lunge', 'chest_fly', 'core2', 'calves', 'rear_delt'] },
  upper: { key: 'upper', title: 'Upper Body', groups: ['chest', 'back', 'shoulders', 'biceps', 'triceps'], slots: ['h_push', 'v_pull', 'v_push', 'h_pull', 'lateral', 'biceps', 'triceps', 'rear_delt'] },
  lower: { key: 'lower', title: 'Lower Body', groups: ['quads', 'hamstrings', 'glutes', 'calves'], slots: ['squat', 'hinge', 'leg_ext', 'leg_curl', 'calves', 'core', 'glutes'] },
  push: { key: 'push', title: 'Push (Chest, Shoulders, Triceps)', groups: ['chest', 'shoulders', 'triceps'], slots: ['h_push', 'v_push', 'incline_push', 'lateral', 'triceps', 'chest_fly', 'triceps2'] },
  pull: { key: 'pull', title: 'Pull (Back, Biceps)', groups: ['back', 'biceps'], slots: ['v_pull', 'h_pull', 'rear_delt', 'biceps', 'back_iso', 'biceps2', 'core'] },
  legs: { key: 'legs', title: 'Legs', groups: ['quads', 'hamstrings', 'glutes', 'calves'], slots: ['squat', 'hinge', 'leg_ext', 'leg_curl', 'lunge', 'calves', 'glutes'] },
  chest: { key: 'chest', title: 'Chest', groups: ['chest'], slots: ['h_push', 'incline_push', 'chest_fly', 'core', 'core2'] },
  back: { key: 'back', title: 'Back', groups: ['back'], slots: ['v_pull', 'h_pull', 'back_iso', 'rear_delt', 'core'] },
  shoulders: { key: 'shoulders', title: 'Shoulders', groups: ['shoulders'], slots: ['v_push', 'lateral', 'rear_delt', 'core2', 'core'] },
  arms: { key: 'arms', title: 'Arms', groups: ['biceps', 'triceps'], slots: ['biceps', 'triceps', 'biceps2', 'triceps2', 'core'] },
};

const ROTATIONS: Record<Exclude<SplitChoice, 'auto'>, string[]> = {
  full_body: ['fbA', 'fbB'],
  upper_lower: ['upper', 'lower'],
  ppl: ['push', 'pull', 'legs'],
  body_part: ['chest', 'back', 'legs', 'shoulders', 'arms'],
};

export function resolveSplit(p: Profile): Exclude<SplitChoice, 'auto'> {
  if (p.split !== 'auto') return p.split;
  const n = p.training_days.length;
  if (n <= 3) return 'full_body';
  if (n === 4 || p.experience === 'beginner') return 'upper_lower';
  return 'ppl';
}

// ---------- Injury filters (simple keyword rules) ----------
function injuryExclusions(injuries: string | null): { slots: Set<string>; ids: Set<string> } {
  const s = (injuries ?? '').toLowerCase();
  const slots = new Set<string>();
  const ids = new Set<string>();
  if (/knee/.test(s)) {
    slots.add('lunge');
    ['Barbell_Squat', 'Hack_Squat', 'Split_Squat_with_Dumbbells', 'Dumbbell_Lunges', 'Stairmaster', 'Running_Treadmill'].forEach((i) => ids.add(i));
  }
  if (/back|spine|disc/.test(s)) {
    ['Romanian_Deadlift', 'Barbell_Squat', 'Bent_Over_Two-Dumbbell_Row', 'Stiff-Legged_Dumbbell_Deadlift', 'Smith_Machine_Squat', 'Rowing_Stationary'].forEach((i) => ids.add(i));
  }
  if (/shoulder/.test(s)) {
    ['Bench_Dips', 'Smith_Machine_Overhead_Shoulder_Press', 'Pullups'].forEach((i) => ids.add(i));
  }
  if (/wrist/.test(s)) ['Pushups', 'Plank'].forEach((i) => ids.add(i));
  return { slots, ids };
}

// ---------- Helpers ----------
let uidCounter = 0;
export function uid() {
  uidCounter += 1;
  return Date.now().toString(36) + '-' + uidCounter.toString(36) + '-' + Math.random().toString(36).slice(2, 6);
}

function pickFromSlot(slot: string, equipment: Set<string>, used: Set<string>, exclude: Set<string>): string | null {
  for (const id of SLOTS[slot] ?? []) {
    const e = getExercise(id);
    if (!e || used.has(id) || exclude.has(id)) continue;
    if (isAvailable(e, equipment)) return id;
  }
  return null;
}

function prescription(p: Profile, slot: string): { sets: number; reps: string; restSec: number } {
  const beginner = p.experience === 'beginner';
  if (CORE.has(slot)) return { sets: beginner ? 2 : 3, reps: '10-15 (or 30s hold)', restSec: 45 };
  const iso = ISOLATION.has(slot);
  switch (p.goal) {
    case 'strength':
      return iso ? { sets: 3, reps: '10-12', restSec: 75 } : { sets: beginner ? 3 : 4, reps: beginner ? '6-8' : '5-8', restSec: 150 };
    case 'fat_loss':
      return { sets: 3, reps: iso ? '12-15' : '10-15', restSec: 60 };
    case 'muscle':
    case 'recomp':
      return iso ? { sets: 3, reps: '12-15', restSec: 60 } : { sets: beginner ? 3 : 4, reps: '8-12', restSec: 90 };
    default:
      return { sets: beginner ? 2 : 3, reps: iso ? '12-15' : '10-12', restSec: 75 };
  }
}

function buildStrength(t: Template, p: Profile, equipment: Set<string>, exclude: { slots: Set<string>; ids: Set<string> }): PlanSession {
  const maxItems = Math.max(4, Math.min(p.experience === 'beginner' ? 6 : 8, Math.round(p.session_minutes / 10)));
  const used = new Set<string>();
  const items: PlanItem[] = [];
  for (const slot of t.slots) {
    if (items.length >= maxItems) break;
    if (exclude.slots.has(slot)) continue;
    const id = pickFromSlot(slot, equipment, used, exclude.ids);
    if (!id) continue;
    used.add(id);
    items.push({ uid: uid(), exerciseId: id, slot, ...prescription(p, slot) });
  }
  return {
    id: uid(),
    title: t.title,
    type: 'strength',
    focus: t.groups,
    warmup: '5 min easy cardio, then 1 or 2 light warm-up sets of the first exercise.',
    items,
  };
}

function buildCardio(p: Profile, equipment: Set<string>, exclude: { slots: Set<string>; ids: Set<string> }, light: boolean): PlanSession {
  const used = new Set<string>();
  const items: PlanItem[] = [];
  const minutes = light ? 20 : Math.max(20, Math.min(40, p.session_minutes - 15));
  const c = pickFromSlot('cardio', equipment, used, exclude.ids);
  if (c) {
    used.add(c);
    items.push({ uid: uid(), exerciseId: c, slot: 'cardio', sets: 1, reps: `${minutes} min`, restSec: 0, note: 'Steady pace: you can still talk in short sentences.' });
  }
  for (const slot of ['core', 'core2']) {
    const id = pickFromSlot(slot, equipment, used, exclude.ids);
    if (id) {
      used.add(id);
      items.push({ uid: uid(), exerciseId: id, slot, sets: 2, reps: '10-15 (or 30s hold)', restSec: 45 });
    }
  }
  for (const id of STRETCHES.slice(0, 3)) {
    if (getExercise(id)) items.push({ uid: uid(), exerciseId: id, slot: 'stretch', sets: 1, reps: '30s each side', restSec: 0 });
  }
  return { id: uid(), title: light ? 'Light Cardio & Mobility' : 'Cardio & Core', type: 'cardio', focus: ['cardio', 'core'], items };
}

// ---------- Main ----------
export function generatePlan(p: Profile): PlanData {
  const split = resolveSplit(p);
  const rotation = ROTATIONS[split];
  const equipment = new Set(p.equipment);
  const exclude = injuryExclusions(p.injuries);
  const training = new Set(p.training_days);
  const doubles = new Set(p.sessions_per_day > 1 ? p.double_days : []);
  const notes: string[] = [];

  // Simulate two weeks so recovery across Sunday→Monday is respected; keep week 2.
  const lastTrained: Record<string, number> = {};
  let rot = 0;
  let result: PlanDay[] = [];

  for (let week = 0; week < 2; week++) {
    const days: PlanDay[] = [];
    WEEK_ORDER.forEach((dow, i) => {
      const dayIndex = week * 7 + i;
      const sessions: PlanSession[] = [];
      if (training.has(dow)) {
        const ok = (t: Template) => t.groups.every((g) => lastTrained[g] === undefined || dayIndex - lastTrained[g] >= 2);
        let first: Template | null = null;
        for (let k = 0; k < rotation.length; k++) {
          const t = T[rotation[(rot + k) % rotation.length]];
          if (ok(t)) {
            first = t;
            rot = (rot + k + 1) % rotation.length;
            break;
          }
        }
        if (first) {
          sessions.push(buildStrength(first, p, equipment, exclude));
          first.groups.forEach((g) => (lastTrained[g] = dayIndex));
        } else {
          sessions.push(buildCardio(p, equipment, exclude, false));
        }

        if (doubles.has(dow)) {
          let second: Template | null = null;
          if (p.experience !== 'beginner' && first) {
            const used = new Set(first.groups);
            for (let k = 0; k < rotation.length; k++) {
              const t = T[rotation[(rot + k) % rotation.length]];
              if (ok(t) && t.groups.every((g) => !used.has(g))) {
                second = t;
                rot = (rot + k + 1) % rotation.length;
                break;
              }
            }
          }
          if (second) {
            sessions.push(buildStrength(second, p, equipment, exclude));
            second.groups.forEach((g) => (lastTrained[g] = dayIndex));
          } else {
            sessions.push(buildCardio(p, equipment, exclude, true));
          }
        }
      }
      days.push({ day: dow, sessions });
    });
    result = days;
  }

  if (p.experience === 'beginner') {
    notes.push('Beginner plan: pick a weight you could lift 3 or 4 more times at the end of each set. Add a little weight once you hit the top of the rep range on every set.');
  }
  if (doubles.size > 0) {
    notes.push('Two-session days: leave at least 6 hours between sessions. The second session never repeats the muscles from the first.');
    if (p.experience === 'beginner') notes.push('As a beginner your second session is light cardio and mobility, so your muscles can recover.');
  }
  if (result.some((d) => d.sessions.some((s) => s.type === 'cardio')) && doubles.size === 0) {
    notes.push('Some days are cardio & core because your muscles need 48 hours between hard sessions.');
  }
  if (p.injuries) notes.push('You mentioned an injury, so exercises that commonly aggravate it were left out. Stop anything that causes pain and check with a physio.');

  return { version: 1, generatedAt: new Date().toISOString(), split, notes, days: result };
}

/** Alternatives for swapping: same slot first, then anything hitting the same primary muscle. */
export function alternativesFor(item: PlanItem, equipment: Set<string>): string[] {
  const out: string[] = [];
  const seen = new Set<string>([item.exerciseId]);
  for (const id of item.slot ? SLOTS[item.slot] ?? [] : []) {
    const e = getExercise(id);
    if (e && !seen.has(id) && isAvailable(e, equipment)) {
      out.push(id);
      seen.add(id);
    }
  }
  return out;
}
