// Plain language descriptions and forgiving search for the exercise list, for when you do not know an exercise by
// its proper name. You can type what you want to train ("belly", "bum", "back of legs"), what you use ("cable",
// "treadmill") or half a name ("lat pull"), and spelling slips still find it.
import { Exercise, needsLabel, ORIGINAL_NAME, requiredKey } from './exercises';

/** The app's muscle names in everyday words, shown in descriptions and also searchable. */
export const PLAIN_MUSCLE: Record<string, string> = {
  chest: 'chest',
  lats: 'sides of the back (lats)',
  'middle back': 'middle of the back',
  'lower back': 'lower back',
  traps: 'upper back and neck (traps)',
  shoulders: 'shoulders',
  biceps: 'front of the arm (biceps)',
  triceps: 'back of the arm (triceps)',
  forearms: 'forearms and grip',
  quadriceps: 'front of the thighs (quads)',
  hamstrings: 'back of the thighs (hamstrings)',
  glutes: 'bum (glutes)',
  calves: 'calves',
  adductors: 'inner thighs',
  abductors: 'outer thighs and hips',
  abdominals: 'stomach and core (abs)',
  neck: 'neck',
};

/** Extra words people type for each muscle, besides the real names. */
const MUSCLE_WORDS: Record<string, string> = {
  chest: 'chest pecs pec breast boobs upper body push',
  lats: 'back lats lat wings v taper pull',
  'middle back': 'back rows row upper back pull',
  'lower back': 'back lower back spine',
  traps: 'traps neck upper back shrug',
  shoulders: 'shoulders delts delt shoulder arms upper body',
  biceps: 'biceps bicep arms arm guns curl front of arm',
  triceps: 'triceps tricep arms arm back of arm',
  forearms: 'forearms forearm grip wrist hands',
  quadriceps: 'quads quad thighs thigh legs leg front of legs',
  hamstrings: 'hamstrings hamstring thighs back of legs back of thighs legs leg',
  glutes: 'glutes glute bum butt booty hips legs leg',
  calves: 'calves calf lower legs legs leg',
  adductors: 'inner thigh thighs groin legs',
  abductors: 'outer thigh hips legs',
  abdominals: 'abs ab core stomach belly tummy six pack abdominals waist',
};

/** Whole exercise ideas people search for rather than a name. */
const THEMES: [RegExp, string][] = [
  [/squat|leg press|lunge|step.?up/i, 'legs leg lower body squat thighs'],
  [/deadlift|hip thrust|bridge|good morning/i, 'hinge hips posterior chain glutes hamstrings'],
  [/press|push.?up|dip|fly|flye/i, 'push pressing'],
  [/row|pull|chin|curl|pulldown/i, 'pull pulling'],
  [/crunch|plank|raise|twist|sit.?up/i, 'core abs'],
  [/treadmill|bike|bicycl|elliptical|row(ing)?,? stationary|stair|jump|rope|run|walk/i, 'cardio fat burn heart rate conditioning'],
  [/stretch|circle|mobility|roll/i, 'warmup stretch mobility loosen'],
];

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

export function plainMuscles(e: Exercise): string[] {
  return e.primary.map((m) => PLAIN_MUSCLE[m] ?? m);
}

/** A one or two line plain description built from the exercise's own data. */
export function describe(e: Exercise): string {
  if (e.custom) return `Your own exercise for ${plainMuscles(e).join(', ') || 'the whole body'}.`;
  const what = e.category === 'stretching' ? 'Loosens up' : e.category === 'cardio' ? 'Cardio that works' : 'Works';
  const muscles = plainMuscles(e).slice(0, 2).join(' and ') || 'the whole body';
  const gear = requiredKey(e);
  const how = gear === null ? 'No equipment.' : gear === 'unknown' ? `Needs ${needsLabel(e).toLowerCase()}.` : `On the ${needsLabel(e).toLowerCase()}.`;
  const type = e.mechanic === 'isolation' ? 'Focuses on one muscle.' : e.mechanic === 'compound' ? 'Uses several muscles together.' : '';
  return [`${what} the ${muscles}.`, how, type].filter(Boolean).join(' ');
}

type Entry = { name: string; nameWords: string[]; primary: string; words: string; steps: string };
const INDEX = new Map<string, Entry>();

function entryFor(e: Exercise): Entry {
  let x = INDEX.get(e.id);
  if (x) return x;
  const name = norm(e.name);
  const themes = THEMES.filter(([re]) => re.test(e.name)).map(([, w]) => w).join(' ') + (e.category === 'stretching' ? ' warmup stretch mobility loosen' : '');
  const words4 = (list: string[]) => list.map((m) => `${m} ${MUSCLE_WORDS[m] ?? ''} ${PLAIN_MUSCLE[m] ?? ''}`).join(' ');
  const primary = norm(words4(e.primary));
  const muscles = words4(e.secondary.slice(0, 2));
  const gear = requiredKey(e);
  const gearWords = gear === null ? 'bodyweight no equipment' : gear === 'unknown' ? e.equipment : `${needsLabel(e)} ${e.equipment}`;
  const words = norm(`${ORIGINAL_NAME[e.id] ?? ''} ${muscles} ${gearWords} ${e.category} ${e.level} ${e.force ?? ''} ${e.mechanic ?? ''} ${themes}`);
  x = { name, nameWords: name.split(' '), primary, words, steps: norm((e.steps ?? []).slice(0, 2).join(' ')) };
  INDEX.set(e.id, x);
  return x;
}

/** Edit distance up to 2, with an early exit, for catching typos like "pulldwon" or "benchpress". */
function near(a: string, b: string): boolean {
  if (a === b) return true;
  const la = a.length, lb = b.length;
  if (Math.abs(la - lb) > 2) return false;
  let prev = Array.from({ length: lb + 1 }, (_, j) => j);
  for (let i = 1; i <= la; i++) {
    const cur = [i];
    let best = i;
    for (let j = 1; j <= lb; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      best = Math.min(best, cur[j]);
    }
    if (best > 2) return false;
    prev = cur;
  }
  return prev[lb] <= (a.length >= 7 ? 2 : 1);
}

/** Spellings to try for one typed word: plural, and joined words such as "pushup" which the data writes "push up". */
function variants(token: string): string[] {
  const out = [token];
  if (token.endsWith('s') && token.length > 3) out.push(token.slice(0, -1));
  const joined: Record<string, string> = { pushup: 'push up', pullup: 'pull up', situp: 'sit up', chinup: 'chin up', benchpress: 'bench press', legpress: 'leg press', pulldown: 'pull down', stepup: 'step up', warmup: 'warmup' };
  if (joined[token]) out.push(joined[token]);
  return out;
}

const STOP = new Set(['of', 'the', 'a', 'for', 'my', 'to', 'on', 'and', 'with', 'in']);

/** 0 means no match. Higher is a better match. Every typed word has to match something. */
export function scoreExercise(e: Exercise, query: string): number {
  const full = norm(query).replace(/warm ?up/g, 'warmup');
  const tokens = full.split(' ').filter((t) => t && !STOP.has(t));
  if (!tokens.length) return 1;
  const x = entryFor(e);
  let total = 0;
  for (const t of tokens) {
    let best = 0;
    for (const v of variants(t)) {
      const phrase = v.includes(' ');
      if (x.name === v) best = Math.max(best, 100);
      else if (x.nameWords.includes(v)) best = Math.max(best, 60);
      else if (x.nameWords.some((w) => w.startsWith(v)) && v.length >= 3) best = Math.max(best, 50);
      else if (phrase && x.name.includes(v)) best = Math.max(best, 50);
      else if (x.primary.includes(` ${v} `) || x.primary.startsWith(v + ' ') || x.primary.endsWith(' ' + v) || x.primary === v) best = Math.max(best, 40);
      else if (x.words.includes(` ${v} `) || x.words.startsWith(v + ' ') || x.words.endsWith(' ' + v)) best = Math.max(best, 26);
      else if (v.length >= 4 && x.name.includes(v)) best = Math.max(best, 20);
      else if (v.length >= 4 && x.words.includes(v)) best = Math.max(best, 14);
      else if (v.length >= 5 && x.steps.includes(v)) best = Math.max(best, 5);
      else if (v.length >= 4 && x.nameWords.some((w) => near(w, v))) best = Math.max(best, 22);
    }
    if (!best) return 0;
    total += best;
  }
  // The whole phrase you typed, such as "back of legs" or "inner thigh", sitting in the muscle words.
  if (tokens.length > 1 && x.primary.includes(tokens.join(' '))) total += 60;
  if (x.name.startsWith(full)) total += 40;
  return total;
}
