// What a voice command turned out to mean, remembered on this device. Every time you confirm (or correct) what
// Forge understood, the exact phrase you said is saved here, pointing at the real thing it resolved to. Next time
// you say the same phrase, it is used straight away instead of guessing again, so it keeps making fewer mistakes
// on your own words, your own food names, your own routines, without any model ever being retrained.
import AsyncStorage from '@react-native-async-storage/async-storage';

export type RememberedFood = { kind: 'food'; source: string; id: string; name: string };
export type RememberedTimer = { kind: 'timer'; label: string; isGym: boolean };
export type Remembered = RememberedFood | RememberedTimer;

const KEY = 'forge.voice.dictionary';
let cache: Record<string, Remembered> | null = null;

const norm = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ');

async function load(): Promise<Record<string, Remembered>> {
  if (cache) return cache;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    cache = raw ? JSON.parse(raw) : {};
  } catch {
    cache = {};
  }
  return cache!;
}

/** Loads the dictionary into memory, so recallSync() has something to read. Call this once before listening starts. */
export async function preload() {
  await load();
}

/** What "oats" or "leg day" turned out to mean last time, read from memory (call preload() first). No await, so the parser that uses it can stay a plain, fast function. */
export function recallSync(phrase: string): Remembered | null {
  return cache?.[norm(phrase)] ?? null;
}

/** Called after you confirm (or fix) a command, so the same phrase resolves straight away next time. */
export async function remember(phrase: string, value: Remembered) {
  const d = await load();
  d[norm(phrase)] = value;
  cache = d;
  try { await AsyncStorage.setItem(KEY, JSON.stringify(d)); } catch { /* storage blocked, just not remembered this time */ }
}

/** Every phrase learned so far, for giving the speech recognizer a head start on hearing them correctly. */
export async function learnedPhrases(): Promise<string[]> {
  return Object.keys(await load());
}
