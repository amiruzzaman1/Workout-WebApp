// Logging types + progression rules.
// Rule used: "double progression".
//   1. Pick a rep range (e.g. 8 to 12).
//   2. Stay at the same weight until you hit the TOP of the range on every set.
//   3. Then go up one step (e.g. 8 kg to 9 kg dumbbells, or +1 pin level). Reps drop, build back up.
//   4. If you fall below the BOTTOM of the range two sessions in a row, drop the weight ~10%.
import { Exercise, getExercise } from './exercises';

export type Unit = 'kg' | 'level' | 'bw';
export type Metric = 'reps' | 'seconds' | 'minutes';

export type LogRow = {
  id: string;
  performed_on: string; // YYYY-MM-DD
  exercise_id: string;
  set_number: number;
  reps: number | null;
  weight_kg: number | null; // kg, or machine level when unit = 'level'
  unit: Unit;
  session_title?: string | null;
  target_reps?: string | null;
  metric?: Metric;
  created_at?: string;
};

export type SessionLog = { date: string; unit: Unit; sets: { weight: number; reps: number }[] };

export type Suggestion = {
  kind: 'first' | 'increase' | 'hold' | 'decrease' | 'none';
  weight?: number;
  unit: Unit;
  headline: string;
  detail: string;
};

export function todayISO() {
  const d = new Date();
  const z = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}

export function parseRange(reps: string): [number, number] | null {
  const m = reps.match(/(\d+)\s*[-–]\s*(\d+)/);
  if (m) return [Number(m[1]), Number(m[2])];
  const one = reps.match(/^\s*(\d+)\s*$/);
  if (one) return [Number(one[1]), Number(one[1])];
  return null;
}

export function defaultUnit(e: Exercise | undefined): Unit {
  if (!e) return 'kg';
  if (e.equipment === 'body only') return 'bw';
  return 'kg';
}

export function fmtWeight(w: number | null | undefined, unit: Unit) {
  if (unit === 'bw') return w ? `BW +${trim(w)} kg` : 'BW';
  if (w == null) return '';
  return unit === 'level' ? `Lvl ${trim(w)}` : `${trim(w)} kg`;
}
function trim(n: number) {
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, '');
}

/** Group an exercise's logs into sessions (one per date), newest first. */
export function sessionsFor(logs: LogRow[], exerciseId: string): SessionLog[] {
  const byDate = new Map<string, LogRow[]>();
  for (const r of logs) {
    if (r.exercise_id !== exerciseId || r.reps == null) continue;
    const arr = byDate.get(r.performed_on) ?? [];
    arr.push(r);
    byDate.set(r.performed_on, arr);
  }
  return [...byDate.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([date, rows]) => {
      rows.sort((a, b) => a.set_number - b.set_number);
      return { date, unit: rows[0].unit, sets: rows.map((r) => ({ weight: Number(r.weight_kg ?? 0), reps: r.reps ?? 0 })) };
    });
}

/** Weight the session was mostly done at (the heaviest weight used for 2+ sets, else the heaviest). */
export function workingWeight(s: SessionLog) {
  const counts = new Map<number, number>();
  s.sets.forEach((x) => counts.set(x.weight, (counts.get(x.weight) ?? 0) + 1));
  const multi = [...counts.entries()].filter(([, c]) => c >= 2).map(([w]) => w);
  return multi.length ? Math.max(...multi) : Math.max(...s.sets.map((x) => x.weight));
}

export function nextStep(w: number, unit: Unit, e: Exercise | undefined): number {
  if (unit === 'level') return w + 1;
  if (unit === 'bw') return w; // progress with reps instead
  const eq = e?.equipment ?? '';
  const upTo = (step: number) => Math.floor(w / step + 1e-9) * step + step; // next rack step above w
  if (eq === 'dumbbell' || eq === 'kettlebells') return w < 10 ? Math.floor(w) + 1 : upTo(2.5);
  if (eq === 'barbell' || eq === 'e-z curl bar') return w + 2.5;
  // machines & cables
  return w < 40 ? upTo(2.5) : upTo(5);
}

function prevStep(w: number, unit: Unit, e: Exercise | undefined): number {
  if (unit === 'level') return Math.max(1, w - 1);
  const eq = e?.equipment ?? '';
  const step = eq === 'dumbbell' || eq === 'kettlebells' ? (w <= 10 ? 1 : 2.5) : 2.5;
  const target = w * 0.9;
  return Math.max(0, Math.round(target / step) * step);
}

export function suggest(
  logs: LogRow[], exerciseId: string, targetReps: string, targetSets: number, metric: Metric = 'reps',
): Suggestion {
  const e = getExercise(exerciseId);
  const unit = defaultUnit(e);
  const range = parseRange(targetReps);
  const sessions = sessionsFor(logs, exerciseId);
  if (!range) return { kind: 'none', unit, headline: '', detail: '' };
  const [lo, hi] = range;

  // Timed work progresses by holding longer, not by adding weight.
  if (metric === 'seconds' || metric === 'minutes') {
    const word = metric === 'seconds' ? 's' : ' min';
    const step = metric === 'seconds' ? 15 : 5;
    if (sessions.length === 0) {
      return {
        kind: 'first', unit,
        headline: metric === 'seconds' ? `Hold for ${lo} to ${hi}${word}` : `Aim for ${hi}${word}`,
        detail: metric === 'seconds'
          ? 'Stop the set when your form goes, not when the timer says so. Use the timer button to count it.'
          : 'Steady pace, one where you could still talk in short sentences.',
      };
    }
    const last = sessions[0];
    const best = Math.max(...last.sets.map((x) => x.reps));
    const listed = last.sets.map((x) => `${x.reps}${word}`).join(', ');
    const allTop = last.sets.length >= targetSets && last.sets.every((x) => x.reps >= hi);
    return allTop
      ? {
          kind: 'increase', unit,
          headline: `Go up to ${hi + step}${word}`,
          detail: `You hit ${hi}${word} on every set last time (${listed}). Raise the target by ${step}${word} and build back up.`,
        }
      : {
          kind: 'hold', unit,
          headline: `Beat ${best}${word}`,
          detail: `Last time: ${listed}. Add a little to each set. Once every set reaches ${hi}${word}, the target goes up.`,
        };
  }

  if (sessions.length === 0) {
    return {
      kind: 'first',
      unit,
      headline: 'First time: find your weight',
      detail:
        unit === 'bw'
          ? `Do as many clean reps as you can, up to ${hi}. Stop 2 reps before your form breaks.`
          : `Start light. Pick a weight you can lift ${hi} times with 2 or 3 reps still in the tank. Too easy? Go up next set.`,
    };
  }

  const last = sessions[0];
  const u = last.unit;
  const w = workingWeight(last);
  const atW = last.sets.filter((s) => s.weight === w);
  const repsStr = atW.map((s) => s.reps).join(', ');

  if (u === 'bw') {
    const allTop = atW.length >= targetSets && atW.every((s) => s.reps >= hi);
    return allTop
      ? { kind: 'increase', unit: u, weight: w, headline: 'Make it harder', detail: `You hit ${hi}+ reps on every set (${repsStr}). Hold a dumbbell, slow the lowering to 3 s, or pick a harder version.` }
      : { kind: 'hold', unit: u, weight: w, headline: `Beat ${repsStr}`, detail: `Add 1 rep to at least one set. When every set reaches ${hi}, make it harder.` };
  }

  const allTop = atW.length >= targetSets && atW.every((s) => s.reps >= hi);
  if (allTop) {
    const nw = nextStep(w, u, e);
    return {
      kind: 'increase',
      unit: u,
      weight: nw,
      headline: `Go up to ${fmtWeight(nw, u)}`,
      detail: `Last time you hit ${hi}+ reps on every set at ${fmtWeight(w, u)} (${repsStr}). Expect about ${lo} to ${lo + 2} reps at the new weight, then build back up to ${hi}.`,
    };
  }

  const belowNow = atW.some((s) => s.reps < lo);
  const prev = sessions[1];
  const belowBefore = prev && workingWeight(prev) === w && prev.sets.filter((s) => s.weight === w).some((s) => s.reps < lo);
  if (belowNow && belowBefore) {
    const nw = prevStep(w, u, e);
    return {
      kind: 'decrease',
      unit: u,
      weight: nw,
      headline: `Drop to ${fmtWeight(nw, u)}`,
      detail: `You've been under ${lo} reps at ${fmtWeight(w, u)} two sessions in a row. Go a little lighter, own the ${lo} to ${hi} range, then climb again.`,
    };
  }

  const need = atW.filter((s) => s.reps < hi).length;
  return {
    kind: 'hold',
    unit: u,
    weight: w,
    headline: `Stay at ${fmtWeight(w, u)}`,
    detail: `Last time: ${repsStr}. Add a rep where you can. Once every set reaches ${hi} (${need} to go), you move up.`,
  };
}

/** Estimated one-rep max (Epley), used only to chart the strength trend. */
export function e1rm(w: number, reps: number) {
  if (reps <= 0) return 0;
  return reps === 1 ? w : w * (1 + reps / 30);
}

export function exerciseName(id: string) {
  return getExercise(id)?.name ?? id;
}

export type GymVisit = { id: string; visit_date: string; started_at: string; ended_at: string | null; session_title?: string | null };

export function visitSeconds(v: GymVisit, now = Date.now()) {
  const end = v.ended_at ? new Date(v.ended_at).getTime() : now;
  return Math.max(0, Math.round((end - new Date(v.started_at).getTime()) / 1000));
}

/** Total seconds in the gym per date. */
export function secondsByDate(visits: GymVisit[], now = Date.now()) {
  const m = new Map<string, number>();
  for (const v of visits) m.set(v.visit_date, (m.get(v.visit_date) ?? 0) + visitSeconds(v, now));
  return m;
}

export function fmtDuration(sec: number, clock = false) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (clock) return `${h > 0 ? h + ':' : ''}${String(m).padStart(h > 0 ? 2 : 1, '0')}:${String(s).padStart(2, '0')}`;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  if (sec > 0 && m === 0) return '<1m';
  return `${m}m`;
}
