// Small sound effects for the happy moments (a quest done, a level up). On by default, with a switch on the quests
// card. They are short synthesized sounds made for this app. Nothing here ever plays on its own at night or in the
// background: only straight after you do something.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAudioPlayer } from 'expo-audio';
import { useEffect, useState } from 'react';

const FILES = {
  ding: require('../../assets/sounds/sfx_ding.wav'),
  levelup: require('../../assets/sounds/sfx_levelup.wav'),
  pop: require('../../assets/sounds/sfx_pop.wav'),
};
export type Sfx = keyof typeof FILES;

const KEY = 'forge.sfx';
let enabled = true;
let loaded = false;
const listeners = new Set<(v: boolean) => void>();

async function load() {
  if (loaded) return;
  loaded = true;
  try {
    const v = await AsyncStorage.getItem(KEY);
    if (v === '0') { enabled = false; listeners.forEach((fn) => fn(false)); }
  } catch { /* stays on */ }
}

export function setSfxEnabled(v: boolean) {
  enabled = v;
  listeners.forEach((fn) => fn(v));
  AsyncStorage.setItem(KEY, v ? '1' : '0').catch(() => {});
}

export function useSfxEnabled(): [boolean, (v: boolean) => void] {
  const [v, setV] = useState(enabled);
  useEffect(() => {
    listeners.add(setV);
    load().then(() => setV(enabled));
    return () => { listeners.delete(setV); };
  }, []);
  return [v, setSfxEnabled];
}

export function playSfx(name: Sfx) {
  if (!enabled) return;
  try {
    const p = createAudioPlayer(FILES[name]);
    p.play();
    setTimeout(() => { try { p.remove(); } catch { /* done */ } }, 3000);
  } catch { /* some browsers block sound until you tap the page */ }
}
