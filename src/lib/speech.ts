// Reads a short line out loud through Android's own text to speech engine, Jarvis style, when a voice
// command has been understood (or not). Off by default, same as the AI model, since it is also a new
// behaviour the user might not expect the first time; a button in the voice modal turns it on or off.
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Speech from 'expo-speech';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

const KEY = 'forge.speak';
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

export function setSpeakEnabled(v: boolean) {
  current = v;
  listeners.forEach((fn) => fn(v));
  AsyncStorage.setItem(KEY, v ? '1' : '0').catch(() => {});
}

export function useSpeakEnabled(): [boolean, (v: boolean) => void] {
  const [v, setV] = useState(current);
  useEffect(() => {
    listeners.add(setV);
    load().then(() => setV(current));
    return () => { listeners.delete(setV); };
  }, []);
  return [v, setSpeakEnabled];
}

export function speak(text: string) {
  if (Platform.OS !== 'android' || !current || !text) return;
  Speech.stop();
  Speech.speak(text, { language: 'en-US' });
}

export function stopSpeaking() {
  if (Platform.OS === 'android') Speech.stop();
}
