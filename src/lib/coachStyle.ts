import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

/** Which coach you chose: Goku (male, insulting and ego clashing) or Mirko (female, soft spoken and motivating). Saved on this device. */
export type CoachStyle = 'male' | 'female';

const KEY = 'forge.coach';
let current: CoachStyle = 'male';
let loaded = false;
const listeners = new Set<(s: CoachStyle) => void>();

async function load() {
  if (loaded) return;
  loaded = true;
  try {
    const v = await AsyncStorage.getItem(KEY);
    if (v === 'male' || v === 'female') {
      current = v;
      listeners.forEach((fn) => fn(current));
    }
  } catch {
    // Storage can be blocked in a private window. The default coach is used then.
  }
}

export function setCoachStyle(s: CoachStyle) {
  current = s;
  listeners.forEach((fn) => fn(s));
  AsyncStorage.setItem(KEY, s).catch(() => {});
}

export function useCoachStyle(): [CoachStyle, (s: CoachStyle) => void] {
  const [style, setStyle] = useState<CoachStyle>(current);
  useEffect(() => {
    listeners.add(setStyle);
    load();
    setStyle(current);
    return () => { listeners.delete(setStyle); };
  }, []);
  return [style, setCoachStyle];
}

export const COACHES: Record<CoachStyle, { name: string; blurb: string }> = {
  male: { name: 'Goku', blurb: 'Ruthless. Insults you and bruises your ego so you push harder.' },
  female: { name: 'Mirko', blurb: 'Soft spoken and kind. Motivates you with care and belief.' },
};
