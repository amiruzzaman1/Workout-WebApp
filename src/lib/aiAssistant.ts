// The optional on-device model (Phase 2). Off by default: it is a sizeable download, so you turn it on
// yourself from User settings, never automatically. It only ever runs after the free, instant word matching
// in voiceParse.ts has already given up, and it never saves anything itself, see resolveLlmOutput() below:
// its answer is re-checked against your real data the exact same way a spoken command is, then shown on the
// same confirm screen, with the same extra confirmation for anything that deletes.
//
// Was Gemma 3n (gemma-3n-E2B-it-int4.task) at first, which loaded on EAS but failed on device with "Unsupported
// model signature" from odml.infra.LiteRTResourceCalculator: Google only ever shipped Gemma 3n for the LLM
// Inference API in the newer .litertlm container, never the older Task Bundle (.task) format this library
// (com.google.mediapipe:tasks-genai, now in maintenance mode) understands, so that file was never actually
// going to load here no matter how the download went. Gemma 3, the smaller 1B model, IS shipped in real
// .task form for this exact API (Google's litert-community/Gemma3-1B-IT on Hugging Face), so that is what
// runs now. It is also a fifth of the download size, a welcome side effect.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { CoachContext } from './coach';
import { COACHES, CoachStyle } from './coachStyle';
import { Food, FoodEntry, Meal } from './nutrition';
import { Goal } from './planner';
import { Reminder, Repeat } from './reminders';
import { nowClock, TaskItem } from './tracker';
import {
  findByTitle, findFood, GOAL_LABEL, GOAL_WORDS, mealForNow, parseNumber, parseTime, parseUnit, resolveAmount, VoiceContext, VoiceIntent,
} from './voiceParse';

export const MODEL_NAME = 'gemma3-1b-it-int4.task';
// A public, ungated re-upload of Google's own model (same Task Bundle file as the official, license gated
// litert-community/Gemma3-1B-IT repo), so the app can download it with a plain request, no Hugging Face
// account or license click-through needed on your end.
export const MODEL_URL = 'https://huggingface.co/aquhm/gemma3-1b-it-int4-litert/resolve/main/gemma3-1b-it-int4.task';
export const MODEL_SIZE_MB = 560;

/** The one shared shape both the real (Android) runtime and the stub (web, iOS) hand out, so nothing that
 *  uses it has to know or care which one it got. See src/lib/aiRuntime.tsx and its .android.tsx twin. */
export type AiRuntime = {
  /** False on the web and iOS: the model only runs on Android, this is never a question of permission. */
  available: boolean;
  enabled: boolean;
  setEnabled: (v: boolean) => void;
  status: 'not_downloaded' | 'downloading' | 'downloaded' | 'error';
  progress: number;
  error: string | null;
  isLoaded: boolean;
  /** Set only if loading an already downloaded model into memory failed; loading itself is automatic. */
  loadError: string | null;
  retryLoad: () => Promise<void>;
  download: () => Promise<void>;
  cancelDownload: () => Promise<void>;
  /** For when the in-app download will not finish: point the model at a copy of the file the user downloaded themselves. */
  importLocalFile: () => Promise<void>;
  remove: () => Promise<void>;
  ask: (prompt: string) => Promise<string>;
};

const KEY = 'forge.ai.enabled';
let current = false;
let loaded = false;
const listeners = new Set<(v: boolean) => void>();

async function load() {
  if (loaded) return;
  loaded = true;
  try {
    current = (await AsyncStorage.getItem(KEY)) === '1';
    listeners.forEach((fn) => fn(current));
  } catch { /* private window or similar, stays off */ }
}

export function setAiEnabled(v: boolean) {
  current = v;
  listeners.forEach((fn) => fn(v));
  AsyncStorage.setItem(KEY, v ? '1' : '0').catch(() => {});
}

export function useAiEnabled(): [boolean, (v: boolean) => void] {
  const [v, setV] = useState(current);
  useEffect(() => {
    listeners.add(setV);
    load().then(() => setV(current));
    return () => { listeners.delete(setV); };
  }, []);
  return [v, setAiEnabled];
}

/** The actions the model is allowed to propose, as a short written contract it is shown every time, with the
 *  user's own real names mixed in so it reaches for a real match instead of inventing a plausible sounding one. */
function systemPrompt(ctx: VoiceContext): string {
  const foods = ctx.knownFoods.slice(0, 40).map((f) => f.name).join(', ') || 'none yet';
  const tasks = ctx.todayTasks.slice(0, 30).map((t) => t.title).join(', ') || 'none';
  const reminders = ctx.reminders.slice(0, 30).map((r) => r.title).join(', ') || 'none';
  const categories = ctx.categories.join(', ');
  const exercises = ctx.exercises.slice(0, 60).map((e) => e.name).join(', ');
  return [
    'You turn one sentence from the user of a fitness app into exactly one JSON object, nothing else, no words before or after it, no markdown fences.',
    'Pick the single closest "kind" from this list, and only use fields that kind needs:',
    '- start_timer: {kind,label,isGym}',
    '- stop_timer: {kind}',
    '- add_task: {kind,label,category}',
    '- delete_task: {kind,label}',
    '- log_food: {kind,label,amount,unit,meal}  (amount and unit optional, unit one of g,ml,kg,l,tsp,tbsp,cup,piece)',
    '- delete_food: {kind,label}',
    '- log_weight: {kind,amount}',
    '- log_water: {kind,amount,unit,mode}  (unit ml or l, mode add or set)',
    '- set_goal_weight: {kind,amount}',
    '- set_water_goal: {kind,amount,unit}',
    '- set_fitness_goal: {kind,goal}  (goal one of recomp,muscle,fat_loss,strength,general)',
    '- add_reminder: {kind,label,time,repeat}  (time like "09:00", repeat one of once,daily,weekly,monthly,yearly)',
    '- delete_reminder: {kind,label}',
    '- log_set: {kind,label,sets,reps,weight}  (label a real exercise name, sets defaults to 1, weight omitted means bodyweight)',
    '- sleep_start: {kind,time}  (going to bed; time optional, like "23:00", only if a clock time was actually said, otherwise omit it for right now)',
    '- sleep_end: {kind,time}  (woke up; time optional, same rule, omit it for right now)',
    '- unknown: {kind}  (use this whenever nothing above genuinely fits, never force a guess)',
    `Foods already logged or saved by this user: ${foods}.`,
    `Today's tasks: ${tasks}. Reminders: ${reminders}. Time categories: ${categories}.`,
    `Exercises: ${exercises}.`,
    'label should name a real thing from those lists when deleting or logging something that already exists.',
  ].join('\n');
}

export function buildPrompt(transcript: string, ctx: VoiceContext): string {
  return `${systemPrompt(ctx)}\n\nThe user said: "${transcript}"\nJSON:`;
}

/** A free form question answered in character as your chosen coach (same two voices as coach.ts's scripted
 *  lines), grounded in your real progress. Plain text back, not the JSON contract above, since this is a
 *  conversation, not an action to carry out. */
export function buildCoachPrompt(question: string, voice: CoachStyle, ctx: CoachContext): string {
  const { name, blurb } = COACHES[voice];
  const stats = [
    `This week: ${ctx.weekDone} of ${ctx.weekPlanned} planned workouts done. Total workouts ever: ${ctx.totalWorkouts}.`,
    ctx.daysSinceLast != null ? `Days since the last workout: ${ctx.daysSinceLast}.` : 'No workout logged yet.',
    `Food logged today: ${ctx.foodLogged ? 'yes' : 'not yet'}.`,
    ctx.proteinPct != null ? `Protein today: ${Math.round(ctx.proteinPct * 100)}% of target.` : null,
    ctx.waterPct != null ? `Water today: ${Math.round(ctx.waterPct * 100)}% of target.` : null,
    ctx.sleepMinutes != null ? `Slept last night: ${Math.round((ctx.sleepMinutes / 60) * 10) / 10} hours.` : null,
    ctx.goalPct != null ? `${Math.round(ctx.goalPct * 100)}% of the way to the weight goal.` : null,
  ].filter((l): l is string => !!l).join('\n');
  return [
    `You are ${name}, a gym coach inside a fitness app. ${blurb}`,
    'Answer the question in one short paragraph, fully in character, about effort and progress, never about body or identity, and with no dashes in your writing.',
    'Use the numbers below only where they are actually relevant to the question; never invent a number you were not given.',
    stats,
    `The user asks: "${question}"`,
    `${name}'s answer:`,
  ].join('\n\n');
}

/** Pulls out the first {...} block, since a small model sometimes wraps the JSON in a sentence despite being told not to. */
function extractJson(raw: string): any | null {
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch { return null; }
}

/**
 * Turns the model's loose JSON into a real VoiceIntent, the same shape a spoken command resolves to, grounding
 * every name it proposed against your actual data. A guess that does not match anything real comes back as
 * 'unknown' rather than being passed through, exactly like the plain word matching already does.
 */
export function resolveLlmOutput(raw: string, ctx: VoiceContext): VoiceIntent {
  const o = extractJson(raw);
  const fallback: VoiceIntent = { kind: 'unknown', transcript: raw.slice(0, 200) };
  if (!o || typeof o.kind !== 'string') return fallback;
  const label = typeof o.label === 'string' ? o.label : '';

  switch (o.kind) {
    case 'start_timer':
      return label ? { kind: 'start_timer', label, isGym: !!o.isGym, category: null } : fallback;
    case 'stop_timer':
      return { kind: 'stop_timer' };
    case 'add_task':
      return label ? { kind: 'add_task', title: label, category: typeof o.category === 'string' ? o.category : null } : fallback;
    case 'delete_task': {
      const task = label ? findByTitle<TaskItem>(label, ctx.todayTasks, (x) => x.title) : null;
      return task ? { kind: 'delete_task', task } : fallback;
    }
    case 'log_food': {
      const food: Food | null = label ? findFood(label, ctx.knownFoods) : null;
      if (!food) return fallback;
      const unit = typeof o.unit === 'string' ? parseUnit(o.unit) : null;
      const amount = typeof o.amount === 'number' ? o.amount : null;
      const meal: Meal = typeof o.meal === 'string' && ['breakfast', 'lunch', 'dinner', 'snack'].includes(o.meal) ? o.meal : mealForNow();
      const { amount: amt, unit: u, note } = resolveAmount(food, amount, unit);
      return { kind: 'log_food', food, amount: amt, unit: u, meal, note };
    }
    case 'delete_food': {
      const entry = label ? findByTitle<FoodEntry>(label, ctx.todayFoodEntries, (x) => x.name) : null;
      return entry ? { kind: 'delete_food', entry } : fallback;
    }
    case 'log_weight': {
      const kg = typeof o.amount === 'number' ? o.amount : parseNumber(String(o.amount ?? ''));
      return kg != null && kg > 0 && kg < 400 ? { kind: 'log_weight', kg } : fallback;
    }
    case 'log_water': {
      const n = typeof o.amount === 'number' ? o.amount : parseNumber(String(o.amount ?? ''));
      if (n == null) return fallback;
      const unit = typeof o.unit === 'string' ? parseUnit(o.unit) : null;
      return { kind: 'log_water', ml: unit === 'l' ? n * 1000 : n, mode: o.mode === 'set' ? 'set' : 'add' };
    }
    case 'set_goal_weight': {
      const kg = typeof o.amount === 'number' ? o.amount : parseNumber(String(o.amount ?? ''));
      return kg != null && kg > 0 && kg < 400 ? { kind: 'set_goal_weight', kg } : fallback;
    }
    case 'set_water_goal': {
      const n = typeof o.amount === 'number' ? o.amount : parseNumber(String(o.amount ?? ''));
      if (n == null) return fallback;
      const unit = typeof o.unit === 'string' ? parseUnit(o.unit) : null;
      return { kind: 'set_water_goal', ml: unit === 'l' ? n * 1000 : n };
    }
    case 'set_fitness_goal': {
      const g = GOAL_WORDS.find(([re]) => re.test(String(o.goal ?? '').toLowerCase())) ?? (typeof o.goal === 'string' && (['recomp', 'muscle', 'fat_loss', 'strength', 'general'] as Goal[]).includes(o.goal as Goal) ? [null, o.goal as Goal] as const : null);
      return g ? { kind: 'set_fitness_goal', goal: g[1], label: GOAL_LABEL[g[1]] } : fallback;
    }
    case 'add_reminder': {
      if (!label) return fallback;
      const time = typeof o.time === 'string' ? (parseTime(o.time) ?? o.time) : null;
      const repeat: Repeat = (['once', 'daily', 'weekly', 'monthly', 'yearly'] as Repeat[]).includes(o.repeat) ? o.repeat : 'once';
      return { kind: 'add_reminder', title: label, time: time ?? '09:00', repeat, date: null, guessedTime: !time };
    }
    case 'delete_reminder': {
      const reminder = label ? findByTitle<Reminder>(label, ctx.reminders, (x) => x.title) : null;
      return reminder ? { kind: 'delete_reminder', reminder } : fallback;
    }
    case 'log_set': {
      const exercise = label ? findByTitle(label, ctx.exercises, (x) => x.name) : null;
      const reps = typeof o.reps === 'number' ? o.reps : parseNumber(String(o.reps ?? ''));
      if (!exercise || reps == null) return fallback;
      const sets = typeof o.sets === 'number' && o.sets > 0 ? Math.round(o.sets) : 1;
      const weight = typeof o.weight === 'number' ? o.weight : parseNumber(String(o.weight ?? ''));
      return { kind: 'log_set', exercise, sets, reps: Math.round(reps), weight, unit: weight != null ? 'kg' : 'bw' };
    }
    case 'sleep_start':
      return { kind: 'sleep_start', time: (typeof o.time === 'string' && parseTime(o.time)) || nowClock() };
    case 'sleep_end':
      return { kind: 'sleep_end', time: (typeof o.time === 'string' && parseTime(o.time)) || nowClock() };
    default:
      return fallback;
  }
}
