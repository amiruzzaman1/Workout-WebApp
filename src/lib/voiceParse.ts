// Turns a spoken sentence into one of a few things Forge can actually do. No model, just word matching, the
// same technique real diet trackers use for this: fast, predictable, and it never makes something up. Anything
// it is not confident about comes back as 'unknown' rather than a wrong guess, and the caller always shows a
// confirm screen before anything is saved.
import { libToFood, searchLibrary } from './foodData';
import { Food, Meal } from './nutrition';
import { gramsOf, RecipeUnit } from './recipes';
import { recallSync } from './voiceDictionary';

export type VoiceIntent =
  | { kind: 'start_timer'; label: string; isGym: boolean; category: string | null }
  | { kind: 'stop_timer' }
  | { kind: 'add_task'; title: string; category: string | null }
  | { kind: 'log_food'; food: Food; amount: number; unit: string; meal: Meal; note?: string }
  | { kind: 'unknown'; transcript: string };

export const norm = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim();

const NUMBER_WORDS: Record<string, number> = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, couple: 2, few: 3, half: 0.5,
};
function parseQty(text: string): number | null {
  const digit = text.match(/\d+(\.\d+)?/);
  if (digit) return Number(digit[0]);
  for (const [w, n] of Object.entries(NUMBER_WORDS)) if (new RegExp(`\\b${w}\\b`).test(text)) return n;
  return null;
}

const UNIT_WORDS: Record<string, RecipeUnit | 'kg' | 'l'> = {
  g: 'g', gram: 'g', grams: 'g', kg: 'kg', kilo: 'kg', kilos: 'kg', kilogram: 'kg', kilograms: 'kg',
  ml: 'ml', millilitre: 'ml', millilitres: 'ml', milliliter: 'ml', milliliters: 'ml',
  l: 'l', litre: 'l', litres: 'l', liter: 'l', liters: 'l',
  tsp: 'tsp', teaspoon: 'tsp', teaspoons: 'tsp', tbsp: 'tbsp', tablespoon: 'tbsp', tablespoons: 'tbsp',
  cup: 'cup', cups: 'cup', piece: 'piece', pieces: 'piece', slice: 'piece', slices: 'piece', serving: 'piece', servings: 'piece',
};
function parseUnit(text: string): RecipeUnit | 'kg' | 'l' | null {
  for (const [w, u] of Object.entries(UNIT_WORDS)) if (new RegExp(`\\b${w}\\b`).test(text)) return u;
  return null;
}

const MEAL_WORDS: [RegExp, Meal][] = [[/\bbreakfast\b/, 'breakfast'], [/\blunch\b/, 'lunch'], [/\bdinner\b|\btea\b/, 'dinner'], [/\bsnack\b/, 'snack']];
function parseMeal(text: string): Meal | null {
  for (const [re, m] of MEAL_WORDS) if (re.test(text)) return m;
  return null;
}
/** A sensible meal for right now, same rule the Add food screen uses. */
export function mealForNow(): Meal {
  const h = new Date().getHours();
  return h < 11 ? 'breakfast' : h < 16 ? 'lunch' : h < 21 ? 'dinner' : 'snack';
}

/** How much of a food to log, from the amount and unit heard, falling back to a normal serving if that unit cannot be worked out for this food. */
export function resolveAmount(food: Food, qty: number | null, unitWord: RecipeUnit | 'kg' | 'l' | null): { amount: number; unit: string; note?: string } {
  const unit = food.unit ?? 'g';
  if (unit === 'piece') return { amount: qty ?? 1, unit };
  if (unitWord === 'g' || unitWord === 'kg') return { amount: (qty ?? 100) * (unitWord === 'kg' ? 1000 : 1), unit };
  if (unitWord === 'ml' || unitWord === 'l') return { amount: (qty ?? 100) * (unitWord === 'l' ? 1000 : 1), unit };
  if ((unitWord === 'tsp' || unitWord === 'tbsp' || unitWord === 'cup') && food.measures?.d) {
    return { amount: gramsOf({ amount: qty ?? 1, unit: unitWord, d: food.measures.d }), unit };
  }
  if (unitWord === 'piece' && food.measures?.pc) {
    return { amount: (qty ?? 1) * food.measures.pc, unit };
  }
  // No unit was heard at all ("two eggs", "a bowl of oats"): that number counts servings, not grams, since
  // nobody means "2 grams" when they say "two eggs". Guessing at a count with no known serving size is the
  // one case worth flagging, everything else here is either exact or a sensible, silent default.
  if (!unitWord) {
    const knownServing = !!food.serving_g && food.serving_g > 0;
    const perServing = knownServing ? food.serving_g! : 100;
    const note = qty != null && qty !== 1 && !knownServing ? `Guessed ${perServing} g each, the usual size for this food is not known, check it before saving.` : undefined;
    return { amount: (qty ?? 1) * perServing, unit, note };
  }
  const amt = food.serving_g && food.serving_g > 0 ? food.serving_g : 100;
  return { amount: amt, unit, note: `Could not work out "${unitWord}" for this food, used ${amt} ${unit} instead, check it before saving.` };
}

/** "eggs" and "egg" (or "berries" and "berry") count as the same word, since people say food names in whatever
 *  number comes naturally, and the library might only have the other one. */
function wordVariants(w: string): string[] {
  if (w.endsWith('ies') && w.length > 4) return [w, `${w.slice(0, -3)}y`];
  if (w.endsWith('es') && w.length > 4) return [w, w.slice(0, -2), w.slice(0, -1)];
  if (w.endsWith('s') && w.length > 3) return [w, w.slice(0, -1)];
  return [w, `${w}s`];
}

/** The best match for a spoken food name among the foods you already know plus the built in library, or null.
 *  Checks what this exact phrase turned out to mean last time first, so a food you have named once is never
 *  re-guessed, even if it does not sound like anything in your library. */
export function findFood(query: string, known: Food[]): Food | null {
  const learned = recallSync(query);
  if (learned?.kind === 'food') {
    const f = known.find((k) => (k.id ?? k.name) === learned.id && (k.source ?? '') === learned.source);
    if (f) return f;
  }
  const words = norm(query).split(' ').filter((w) => w.length > 2);
  if (!words.length) return null;
  let best: Food | null = null;
  let bestScore = -1;
  for (const f of known) {
    const name = norm(f.name);
    const hits = words.filter((w) => wordVariants(w).some((v) => name.includes(v))).length;
    if (hits === 0) continue;
    const score = hits * 100 - name.length; // every matched word counts far more than a shorter name
    if (score > bestScore) { bestScore = score; best = f; }
  }
  // A real match among your own foods always wins; the shared library is only a fallback, never over your own data.
  if (best) return best;
  const lib = searchLibrary(query, ['dish', 'bangladesh', 'ingredient'], 1);
  return lib.length ? libToFood(lib[0]) : null;
}

/** Strips filler words ("a", "an", "the", "my") and title cases what is left, so a spoken label reads like a real name. */
function cleanLabel(s: string): string {
  return s.replace(/\b(a|an|the|my)\b/g, '').replace(/\s+/g, ' ').trim().replace(/\b\w/g, (c) => c.toUpperCase());
}

/** The best matching category name (a built in or custom time tracker category) for a spoken word, or null. */
function findCategory(text: string, categories: string[]): string | null {
  const t = norm(text);
  return categories.find((c) => t.includes(norm(c))) ?? null;
}

export type VoiceContext = { knownFoods: Food[]; categories: string[]; runningLabel: string | null };

export function parseVoiceCommand(transcript: string, ctx: VoiceContext): VoiceIntent {
  const t = norm(transcript);
  if (!t) return { kind: 'unknown', transcript };

  if (ctx.runningLabel && /\b(stop|end|finish|pause)\b/.test(t)) return { kind: 'stop_timer' };

  const startMatch = t.match(/\b(?:start|begin|starting|resume)\b\s*(?:my\s+)?(.*)/);
  if (startMatch) {
    const rest = startMatch[1].trim().replace(/\b(timer|routine|session)\b/g, '').trim();
    const learned = recallSync(rest);
    if (learned?.kind === 'timer') return { kind: 'start_timer', label: learned.label, isGym: learned.isGym, category: findCategory(learned.label, ctx.categories) };
    const isGym = /\bgym\b|\bworkout\b|\blifting\b|\blift\b/.test(rest) || /\bgym\b|\bworkout\b/.test(t);
    const label = cleanLabel(rest) || 'Gym';
    return { kind: 'start_timer', label, isGym, category: findCategory(rest, ctx.categories) };
  }

  const taskMatch = t.match(/\b(?:remind me to|add (?:a )?task(?: to)?|i need to|new task)\b\s*(.*)/);
  if (taskMatch && taskMatch[1].trim()) {
    const title = taskMatch[1].replace(/\btoday\b|\btomorrow\b/g, '').trim();
    return { kind: 'add_task', title: cleanLabel(title), category: findCategory(title, ctx.categories) };
  }

  const foodMatch = t.match(/\b(?:log|ate|had|eating|drank|add)\b\s*(.*)/);
  if (foodMatch && foodMatch[1].trim()) {
    let rest = foodMatch[1];
    const meal = parseMeal(rest) ?? mealForNow();
    rest = rest.replace(/\bfor\s+(breakfast|lunch|dinner|tea|snack)\b/, '').trim();
    const qty = parseQty(rest);
    const unitWord = parseUnit(rest);
    const foodName = rest
      .replace(/^\d+(\.\d+)?\s*/, '')
      .replace(/\b(a|an|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|couple|few|half|of|some)\b/g, '')
      .replace(/\b(g|grams?|kgs?|kilos?|kilograms?|mls?|millilit(?:re|er)s?|l|lit(?:re|er)s?|tsp|teaspoons?|tbsp|tablespoons?|cups?|pieces?|slices?|servings?)\b/g, '')
      .trim();
    const food = foodName ? findFood(foodName, ctx.knownFoods) : null;
    if (food) {
      const { amount, unit, note } = resolveAmount(food, qty, unitWord);
      return { kind: 'log_food', food, amount, unit, meal, note };
    }
  }

  return { kind: 'unknown', transcript };
}
