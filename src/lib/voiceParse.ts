// Turns a spoken (or typed) sentence into one of the things Forge can actually do. No model, just word matching,
// the same technique real diet trackers use for this: fast, free, predictable, and it never makes something up.
// "Everything the app can do" does not mean literally anything you could say, it means every action in this file,
// each one a real, named thing the app already knows how to do (add, change or remove something); anything that
// does not match one of them comes back as 'unknown' rather than a wrong guess, and the caller always shows a
// confirm screen before anything is saved or removed, with a stronger, separate confirmation for deletes.
import { Exercise } from './exercises';
import { libToFood, searchLibrary } from './foodData';
import { Food, FoodEntry, Meal } from './nutrition';
import { Goal } from './planner';
import { Unit } from './progress';
import { gramsOf, RecipeUnit } from './recipes';
import { Reminder, Repeat } from './reminders';
import { nowClock, TaskItem } from './tracker';
import { recallSync } from './voiceDictionary';

export type VoiceIntent =
  | { kind: 'start_timer'; label: string; isGym: boolean; category: string | null }
  | { kind: 'stop_timer' }
  | { kind: 'add_task'; title: string; category: string | null }
  | { kind: 'delete_task'; task: TaskItem }
  | { kind: 'log_food'; food: Food; amount: number; unit: string; meal: Meal; note?: string }
  | { kind: 'delete_food'; entry: FoodEntry }
  | { kind: 'log_weight'; kg: number }
  | { kind: 'log_water'; ml: number; mode: 'add' | 'set' }
  | { kind: 'set_goal_weight'; kg: number }
  | { kind: 'set_water_goal'; ml: number }
  | { kind: 'set_fitness_goal'; goal: Goal; label: string }
  | { kind: 'add_reminder'; title: string; time: string; repeat: Repeat; date: string | null; guessedTime: boolean }
  | { kind: 'delete_reminder'; reminder: Reminder }
  | { kind: 'log_set'; exercise: Exercise; sets: number; reps: number; weight: number | null; unit: Unit }
  | { kind: 'sleep_start'; time: string }
  | { kind: 'sleep_end'; time: string }
  | { kind: 'multi'; intents: VoiceIntent[] }
  | { kind: 'unknown'; transcript: string };

/** Which of these actions remove something, so the caller can ask twice before doing it. */
export function isDestructive(kind: VoiceIntent['kind']): boolean {
  return kind === 'delete_task' || kind === 'delete_food' || kind === 'delete_reminder';
}

/** Same thing, but looking inside a 'multi' command too, since "delete the task to call mum and start my
 *  gym timer" still needs the stronger delete confirmation even though deleting is not the whole command. */
export function hasDestructive(intent: VoiceIntent): boolean {
  return intent.kind === 'multi' ? intent.intents.some(hasDestructive) : isDestructive(intent.kind);
}

// A decimal point stays in, so a spoken weight like "82.3" survives normalizing; addsPunctuation is off when
// listening, so a stray full stop here is always part of a number, never sentence punctuation. A colon stays
// in too, so a stated clock time like "11:30" survives for parseTime() to read, rather than becoming "11 30"
// and losing its minutes.
export const norm = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9':. ]+/g, ' ').replace(/\s+/g, ' ').trim();

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
export function parseUnit(text: string): RecipeUnit | 'kg' | 'l' | null {
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

/** How well a name matches a spoken query: every shared word counts far more than a shorter name, -1 for no match at all. */
function titleScore(query: string, name: string): number {
  const words = norm(query).split(' ').filter((w) => w.length > 2);
  if (!words.length) return -1;
  const n = norm(name);
  const hits = words.filter((w) => wordVariants(w).some((v) => n.includes(v))).length;
  return hits === 0 ? -1 : hits * 100 - n.length;
}

/** The best matching item by name among a list (a task, a reminder, a logged food), or null if nothing matches. */
export function findByTitle<T>(query: string, items: T[], titleOf: (x: T) => string): T | null {
  let best: T | null = null;
  let bestScore = -1;
  for (const it of items) {
    const score = titleScore(query, titleOf(it));
    if (score > bestScore) { bestScore = score; best = it; }
  }
  return best;
}

type MatchGroup = { items: unknown[]; titleOf: (x: any) => string; make: (x: any) => VoiceIntent };
/** One list to search, paired with how to read its name and what to return if it is the best match. Each list
 *  keeps its own item type; only the group itself is untyped, so findBestAcross can mix lists of different kinds. */
function matchGroup<T>(items: T[], titleOf: (x: T) => string, make: (x: T) => VoiceIntent): MatchGroup {
  return { items, titleOf, make };
}

/** The best match across several kinds of list at once (used when a spoken "delete X" does not say what kind of
 *  thing X is), so a real match in one list never loses to a weaker, coincidental match in another. */
function findBestAcross(query: string, groups: MatchGroup[]): VoiceIntent | null {
  let best: VoiceIntent | null = null;
  let bestScore = -1;
  for (const g of groups) {
    for (const it of g.items) {
      const score = titleScore(query, g.titleOf(it));
      if (score > bestScore) { bestScore = score; best = g.make(it); }
    }
  }
  return best;
}

/** A plain decimal, for things people say as digits (a weight, a water amount), e.g. "82.3" or "1500". */
export function parseNumber(text: string): number | null {
  const m = text.match(/\d+(\.\d+)?/);
  return m ? Number(m[0]) : null;
}

export const GOAL_WORDS: [RegExp, Goal][] = [
  [/\brecomp\b|\blose fat and build muscle\b|\btone up\b/, 'recomp'],
  [/\bbuild muscle\b|\bgain muscle\b|\bbulk\b/, 'muscle'],
  [/\blose (fat|weight)\b|\bcut\b|\bfat loss\b/, 'fat_loss'],
  [/\b(get|be|become) stronger\b|\bstrength\b/, 'strength'],
  [/\bgeneral fitness\b|\bstay fit\b/, 'general'],
];
export const GOAL_LABEL: Record<Goal, string> = { recomp: 'Lose fat and build muscle', muscle: 'Build muscle', fat_loss: 'Lose fat', strength: 'Get stronger', general: 'General fitness' };

/** "9am", "9:30 pm", "noon", "midnight" as 24 hour "HH:MM", or null if nothing like a time was said. */
export function parseTime(text: string): string | null {
  if (/\bnoon\b/.test(text)) return '12:00';
  if (/\bmidnight\b/.test(text)) return '00:00';
  const m = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/);
  if (!m) return null;
  let h = Number(m[1]);
  const min = m[2] ? Number(m[2]) : 0;
  if (h > 23 || min > 59) return null;
  if (m[3] === 'pm' && h < 12) h += 12;
  if (m[3] === 'am' && h === 12) h = 0;
  if (!m[3] && h === 0) return null; // a bare "0" from something else, not really a time
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}
const REPEAT_WORDS: [RegExp, Repeat][] = [
  [/\bevery day\b|\bdaily\b/, 'daily'], [/\bevery week\b|\bweekly\b/, 'weekly'],
  [/\bevery month\b|\bmonthly\b/, 'monthly'], [/\bevery year\b|\byearly\b|\bannually\b/, 'yearly'],
];

export type VoiceContext = {
  knownFoods: Food[]; categories: string[]; runningLabel: string | null;
  todayTasks: TaskItem[]; todayFoodEntries: FoodEntry[]; reminders: Reminder[]; exercises: Exercise[];
};

function parseSingle(transcript: string, ctx: VoiceContext): VoiceIntent {
  const t = norm(transcript);
  if (!t) return { kind: 'unknown', transcript };

  if (ctx.runningLabel && /\b(stop|end|finish|pause)\b/.test(t)) return { kind: 'stop_timer' };

  // Going to bed or waking up: the same two things the Sleep card's "Bed now" and "Woke now" buttons already
  // do, just said instead of tapped. The clock time is captured once here, not read again at save time, so
  // what is shown on the confirm card is exactly what gets saved even if a few seconds pass before you confirm.
  if (/\b(?:going|heading|off) to (?:bed|sleep)\b|\bi'?m going to sleep\b|\bgoodnight\b/.test(t)) return { kind: 'sleep_start', time: parseTime(t) ?? nowClock() };
  if (/\b(?:just )?woke up\b|\bwaking up\b|\bi'?m awake\b|\bgood morning\b/.test(t)) return { kind: 'sleep_end', time: parseTime(t) ?? nowClock() };

  // "start", "track", "time tracker" and "log time" are all the same request in plain speech, and the words
  // "timer", "tracker", "time" and "tracking" are the name of the feature, not part of the activity's own
  // name, so they get stripped along with the usual filler words before anything else looks at what is left.
  const startMatch = t.match(/\b(?:start|begin|starting|resume|track|tracking|time tracker|log time)\b\s*(?:my\s+)?(.*)/);
  if (startMatch) {
    const rest = startMatch[1].trim().replace(/\b(timer|routine|session|tracker|tracking|track|time|for|a|an|the|my)\b/g, '').replace(/\s+/g, ' ').trim();
    const learned = recallSync(rest);
    if (learned?.kind === 'timer') return { kind: 'start_timer', label: learned.label, isGym: learned.isGym, category: findCategory(learned.label, ctx.categories) };
    const isGym = /\bgym\b|\bworkout\b|\blifting\b|\blift\b/.test(rest) || /\bgym\b|\bworkout\b/.test(t);
    // Nothing recognisable was actually said (just "start a timer" on its own): ask again rather than
    // quietly guessing Gym, which is what used to happen here.
    if (!rest && !isGym) return { kind: 'unknown', transcript };
    const label = cleanLabel(rest) || 'Gym';
    return { kind: 'start_timer', label, isGym, category: findCategory(rest, ctx.categories) };
  }

  // Deletes come before anything else can claim the same words ("delete the task to call the dentist" must not
  // fall through to add_task just because "call the dentist" is also in there).
  const deleteMatch = t.match(/\b(?:delete|remove|cancel)\b\s*(?:the\s+)?(.*)/);
  if (deleteMatch && deleteMatch[1].trim()) {
    const rest = deleteMatch[1].replace(/\btask\b|\breminder\b|\bentry\b/g, '').trim();
    if (/\btask\b/.test(deleteMatch[0])) {
      const task = findByTitle(rest, ctx.todayTasks, (x) => x.title);
      if (task) return { kind: 'delete_task', task };
    } else if (/\breminder\b/.test(deleteMatch[0])) {
      const reminder = findByTitle(rest, ctx.reminders, (x) => x.title);
      if (reminder) return { kind: 'delete_reminder', reminder };
    } else {
      const found = findBestAcross(rest, [
        matchGroup(ctx.todayTasks, (x) => x.title, (x): VoiceIntent => ({ kind: 'delete_task', task: x })),
        matchGroup(ctx.reminders, (x) => x.title, (x): VoiceIntent => ({ kind: 'delete_reminder', reminder: x })),
        matchGroup(ctx.todayFoodEntries, (x) => x.name, (x): VoiceIntent => ({ kind: 'delete_food', entry: x })),
      ]);
      if (found) return found;
    }
    return { kind: 'unknown', transcript };
  }

  // A reminder that repeats is a different thing from a one off task for today, even though both start with
  // similar words ("remind me to..."), so this is checked before add_task, only taking over when a repeat
  // word is actually heard.
  const repeatHeard = REPEAT_WORDS.find(([re]) => re.test(t));
  const reminderMatch = t.match(/\bremind me (?:every\s+\w+\s+)?(?:at\s+[\w:]+\s+)?to\b\s*(.*)/);
  if (repeatHeard && reminderMatch && reminderMatch[1].trim()) {
    const title = cleanLabel(reminderMatch[1].replace(/\b(am|pm)\b/g, '').trim());
    const time = parseTime(t);
    return { kind: 'add_reminder', title, time: time ?? '09:00', repeat: repeatHeard[1], date: null, guessedTime: !time };
  }

  const weightMatch = t.match(/\b(?:log|record|update)\s+(?:my\s+)?weight\b|\bi\s+weigh\b|\bmy\s+weight\s+is\b/);
  if (weightMatch) {
    const kg = parseNumber(t);
    if (kg != null && kg > 0 && kg < 400) return { kind: 'log_weight', kg };
  }

  const waterSetMatch = t.match(/\b(?:set|change)\s+(?:my\s+)?(?:daily\s+)?water\s*(?:goal|target)\b/);
  if (waterSetMatch) {
    const n = parseNumber(t);
    if (n != null) { const unit = parseUnit(t); return { kind: 'set_water_goal', ml: unit === 'l' ? n * 1000 : n }; }
  }
  const waterLogMatch = t.match(/\b(?:drank|had|log|add|set)\b.*\bwater\b/);
  if (waterLogMatch) {
    const n = parseNumber(t);
    if (n != null) {
      const unit = parseUnit(t);
      const ml = unit === 'l' ? n * 1000 : n;
      return { kind: 'log_water', ml, mode: /\bset\b/.test(t) ? 'set' : 'add' };
    }
  }

  const goalWeightMatch = t.match(/\b(?:set|change)\s+(?:my\s+)?goal\s+weight\b/);
  if (goalWeightMatch) {
    const kg = parseNumber(t);
    if (kg != null && kg > 0 && kg < 400) return { kind: 'set_goal_weight', kg };
  }

  const fitnessGoalMatch = t.match(/\b(?:set|change)\s+(?:my\s+)?goal\s+to\b\s*(.*)/);
  if (fitnessGoalMatch) {
    const g = GOAL_WORDS.find(([re]) => re.test(fitnessGoalMatch[1]));
    if (g) return { kind: 'set_fitness_goal', goal: g[1], label: GOAL_LABEL[g[1]] };
  }

  const taskMatch = t.match(/\b(?:remind me to|add (?:a )?(?:new )?task(?: to)?|i need to|new task(?: to)?)\b\s*(.*)/);
  if (taskMatch && taskMatch[1].trim()) {
    const title = taskMatch[1].replace(/\btoday\b|\btomorrow\b/g, '').trim();
    return { kind: 'add_task', title: cleanLabel(title), category: findCategory(title, ctx.categories) };
  }

  // A set logged for an exercise is only tried when "reps" or "sets" is actually said, so it never steals a
  // plain food log ("log my oats") just because both start with the word "log".
  if (/\b(?:log|did|do|record|finished|completed)\b/.test(t) && /\b(?:reps?|sets?)\b/.test(t)) {
    const setsM = t.match(/(\d+)\s*sets?\b/);
    const repsM = t.match(/(\d+)\s*reps?\b/);
    const weightM = t.match(/(\d+(?:\.\d+)?)\s*(?:kg|kilo|kilos|kilogram|kilograms)\b/);
    const bodyweight = /\bbody\s*weight\b|\bbodyweight\b|\bno weight\b|\bwith no weight\b/.test(t);
    const nameM = t.match(/\b(?:for|on|of)\s+(.+?)(?:\s+for\s+\d+\s*reps?)?$/);
    const exercise = nameM ? findByTitle(nameM[1], ctx.exercises, (x) => x.name) : null;
    if (exercise && repsM) {
      return {
        kind: 'log_set', exercise, sets: setsM ? Number(setsM[1]) : 1, reps: Number(repsM[1]),
        weight: bodyweight ? null : weightM ? Number(weightM[1]) : null,
        unit: bodyweight ? 'bw' : weightM ? 'kg' : 'bw',
      };
    }
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

// Checked in this order: the more specific "and then"/"then" first, so "add a task and then start the timer"
// splits there rather than at the bare "and" it also contains, which would leave a stray "then" on the second
// half and confuse it.
const CONNECTORS = [/\band then\b/, /\bthen\b/, /\band also\b/, /\band\b/];

/**
 * Most commands are one action; "add a task to call the dentist and start my study timer" is two. This tries
 * splitting on the first connector word found and only actually commits to treating it as two commands if
 * each half, parsed completely on its own, resolves to something real (not 'unknown'); otherwise it falls
 * back to parsing the whole sentence as one. That check is what keeps an "and" that is just part of one
 * phrase, like a reminder "to call mum and dad" or deleting "the eggs and bacon" entry, from being wrongly
 * split in half: either half alone would come back unknown, so the split is rejected and the original stays
 * one command.
 */
export function parseVoiceCommand(transcript: string, ctx: VoiceContext): VoiceIntent {
  const t = norm(transcript);
  for (const connector of CONNECTORS) {
    const m = t.match(new RegExp(`^(.+?)\\s*${connector.source}\\s*(.+)$`));
    if (!m) continue;
    const left = parseSingle(m[1], ctx);
    if (left.kind === 'unknown') continue;
    // Recurses on the right half so a third "and" chains further ("...and log 2 eggs and start my timer"),
    // flattening a nested 'multi' instead of leaving one inside another.
    const right = parseVoiceCommand(m[2], ctx);
    if (right.kind === 'unknown') continue;
    return { kind: 'multi', intents: [left, ...(right.kind === 'multi' ? right.intents : [right])] };
  }
  return parseSingle(t, ctx);
}
