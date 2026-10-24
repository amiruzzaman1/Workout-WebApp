import raw from '../data/exercises.json';
import { EQUIPMENT_TO_KEY, EXERCISE_NEEDS, EXERCISE_TO_MACHINE } from '../data/machines';

export type Exercise = {
  id: string;
  name: string;
  level: 'beginner' | 'intermediate' | 'expert';
  equipment: string;
  category: string;
  force: string | null;
  mechanic: string | null;
  primary: string[];
  secondary: string[];
  steps: string[];
  images: string[];
  custom?: boolean;
};

export const EXERCISES = raw as Exercise[];
const BY_ID: Record<string, Exercise> = Object.fromEntries(EXERCISES.map((e) => [e.id, e]));

let customById: Record<string, Exercise> = {};
export function setCustomExercises(list: Exercise[]) {
  customById = Object.fromEntries(list.map((e) => [e.id, e]));
}
export function allExercises(): Exercise[] {
  return [...Object.values(customById), ...EXERCISES];
}
export function getExercise(id: string): Exercise | undefined {
  return BY_ID[id] ?? customById[id];
}

const IMG_BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/';
export function imageUrls(e: Exercise): string[] {
  return e.images.map((p) => IMG_BASE + p);
}

// Muscle groups shown in the app, mapped to the dataset's muscle names.
export const MUSCLE_GROUPS: Record<string, string[]> = {
  Chest: ['chest'],
  Back: ['lats', 'middle back', 'lower back', 'traps'],
  Shoulders: ['shoulders'],
  Arms: ['biceps', 'triceps', 'forearms'],
  Legs: ['quadriceps', 'hamstrings', 'glutes', 'calves', 'adductors', 'abductors'],
  Core: ['abdominals'],
};

/** Which of the app's groups an exercise belongs to. */
export function groupOf(e: Exercise | undefined): string {
  if (!e) return 'Mobility';
  if (e.category === 'cardio') return 'Cardio';
  if (e.category === 'stretching') return 'Mobility';
  for (const [g, muscles] of Object.entries(MUSCLE_GROUPS)) {
    if (e.primary.some((m) => muscles.includes(m))) return g;
  }
  return 'Mobility';
}

export function titleCase(s: string) {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Which "My gym" key an exercise needs.
 * null = nothing needed (bodyweight). 'unknown' = a machine we don't have a guide for.
 */
export function requiredKey(e: Exercise): string | null | 'unknown' {
  if (e.custom) return null;
  if (e.category === 'stretching') return null; // mobility work needs no kit
  if (e.id in EXERCISE_NEEDS) return EXERCISE_NEEDS[e.id];
  if (EXERCISE_TO_MACHINE[e.id]) return EXERCISE_TO_MACHINE[e.id];
  if (e.equipment in EQUIPMENT_TO_KEY) return EQUIPMENT_TO_KEY[e.equipment];
  return 'unknown';
}

export function isAvailable(e: Exercise, equipment: Set<string>): boolean {
  const k = requiredKey(e);
  if (k === null) return true;
  if (k === 'unknown') return false;
  return equipment.has(k);
}
