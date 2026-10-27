// The ten alarm sounds to pick from, made for this app (simple synthesized tones, no outside audio, so there is
// nothing to license). The files in assets/sounds are also listed in app.json's expo-notifications plugin, which
// copies them into the Android app so a notification channel can ring with one. 'default' is the phone's own
// notification sound, which every alarm used before sounds could be picked.
import { createAudioPlayer } from 'expo-audio';

export type AlarmSoundId = 'default' | 'alarm_classic' | 'alarm_chime' | 'alarm_rising' | 'alarm_bells' | 'alarm_radar' | 'alarm_fast' | 'alarm_piano' | 'alarm_siren' | 'alarm_marimba' | 'alarm_powerup';

export const ALARM_SOUNDS: { id: AlarmSoundId; label: string; hint: string; file?: number }[] = [
  { id: 'default', label: 'Phone default', hint: 'Your phone\'s own notification sound' },
  { id: 'alarm_classic', label: 'Classic beep', hint: 'Plain digital beeps', file: require('../../assets/sounds/alarm_classic.wav') },
  { id: 'alarm_chime', label: 'Gentle chime', hint: 'Soft bells, a calm start', file: require('../../assets/sounds/alarm_chime.wav') },
  { id: 'alarm_rising', label: 'Rising tone', hint: 'Climbs up until you wake', file: require('../../assets/sounds/alarm_rising.wav') },
  { id: 'alarm_bells', label: 'Morning bells', hint: 'Ding dong, ding dong', file: require('../../assets/sounds/alarm_bells.wav') },
  { id: 'alarm_radar', label: 'Radar ping', hint: 'A sharp ping that fades', file: require('../../assets/sounds/alarm_radar.wav') },
  { id: 'alarm_fast', label: 'Fast alarm', hint: 'Quick two tone alert, hard to ignore', file: require('../../assets/sounds/alarm_fast.wav') },
  { id: 'alarm_piano', label: 'Soft piano', hint: 'A short rising tune', file: require('../../assets/sounds/alarm_piano.wav') },
  { id: 'alarm_siren', label: 'Siren', hint: 'Loud wail, up and down', file: require('../../assets/sounds/alarm_siren.wav') },
  { id: 'alarm_marimba', label: 'Marimba', hint: 'Bouncy wooden notes', file: require('../../assets/sounds/alarm_marimba.wav') },
  { id: 'alarm_powerup', label: 'Power up', hint: 'Climbing notes with a big finish', file: require('../../assets/sounds/alarm_powerup.wav') },
];

export const soundLabel = (id: string | null | undefined) => ALARM_SOUNDS.find((s) => s.id === id)?.label ?? 'Phone default';

/** The file name Android's notification channel needs, or undefined for the phone's default. */
export const soundFileName = (id: string | null | undefined) => (id && id !== 'default' ? `${id}.wav` : undefined);

let current: ReturnType<typeof createAudioPlayer> | null = null;

/** Stops whatever sound is playing right now (a preview, or a web alarm that is ringing). */
export function stopSound() {
  try { current?.pause(); current?.remove(); } catch { /* already gone */ }
  current = null;
}

/** Plays a sound once, for the preview button and for web alarms. Does nothing for the phone default. */
export function playSound(id: string | null | undefined) {
  stopSound();
  const file = ALARM_SOUNDS.find((s) => s.id === id)?.file;
  if (!file) return;
  try {
    current = createAudioPlayer(file);
    current.play();
  } catch { /* some browsers block sound until you tap the page */ }
}
