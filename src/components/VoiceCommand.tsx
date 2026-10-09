import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef, useState } from 'react';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { AccessibilityInfo, Animated, Easing, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { entryToFood, MEAL_LABELS, round, scaleFood } from '../lib/nutrition';
import { recipeToFood } from '../lib/recipes';
import { useStore } from '../lib/store';
import { A, C, F, R } from '../lib/theme';
import { segmentsOf } from '../lib/tracker';
import { parseVoiceCommand, VoiceIntent } from '../lib/voiceParse';
import { preload as preloadDictionary, remember } from '../lib/voiceDictionary';
import { todayISO } from '../lib/progress';
import { useTimeCategories } from './DayTrackers';
import { Button, hovered, smooth } from './ui';

type Phase = 'listening' | 'parsed' | 'saving' | 'done' | 'error';

/**
 * A floating mic button (Android only, the phone's own speech recognizer, nothing sent anywhere). Says what
 * it heard, works out what you meant, then always shows you a confirm screen before anything is saved, so a
 * misheard word never quietly logs the wrong thing. What you confirm is remembered on this device, so the
 * same phrase resolves straight away next time instead of being re-guessed.
 */
export function VoiceCommand() {
  const {
    activities, addActivity, updateActivity, activeVisit, startVisit, endVisit,
    tasks, addTask, myFoods, sharedFoods, foodEntries, recipes, addFoodEntry,
  } = useStore();
  const { categories } = useTimeCategories();
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>('listening');
  const [partial, setPartial] = useState('');
  const [intent, setIntent] = useState<VoiceIntent | null>(null);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const spoke = useRef(false);

  const running = activities.find((a) => a.day === todayISO() && a.started_at && !a.ended_at) ?? null;
  const runningLabel = running?.title ?? (activeVisit ? 'Gym' : null);

  useSpeechRecognitionEvent('result', (e) => {
    const best = e.results[0]?.transcript ?? '';
    setPartial(best);
    if (e.isFinal && best.trim()) { spoke.current = true; finish(best); }
  });
  useSpeechRecognitionEvent('error', (e) => {
    setError(e.error === 'not-allowed' ? 'Forge needs microphone and speech permission, allow it in your phone settings.' : e.error === 'no-speech' ? "Didn't catch anything, try again." : 'Could not listen right now.');
    setPhase('error');
  });
  useSpeechRecognitionEvent('end', () => {
    if (!spoke.current && open) { setError("Didn't catch anything, try again."); setPhase('error'); }
  });

  function finish(said: string) {
    ExpoSpeechRecognitionModule.stop();
    setTranscript(said);
    const knownFoods = [
      ...sharedFoods, ...myFoods, ...recipes.map(recipeToFood),
      ...[...foodEntries].reverse().slice(0, 150).map(entryToFood),
    ];
    const parsed = parseVoiceCommand(said, { knownFoods, categories, runningLabel });
    setIntent(parsed);
    setPhase('parsed');
  }

  async function start() {
    setOpen(true); setPhase('listening'); setPartial(''); setIntent(null); setError(null); spoke.current = false;
    await preloadDictionary();
    const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!perm.granted) { setError('Forge needs microphone and speech permission, allow it in your phone settings.'); setPhase('error'); return; }
    ExpoSpeechRecognitionModule.start({
      lang: 'en-US', interimResults: true, continuous: false, addsPunctuation: false,
      contextualStrings: knownWords().slice(0, 200),
    });
  }

  function knownWords(): string[] {
    const w = new Set<string>();
    for (const f of [...sharedFoods, ...myFoods, ...recipes.map(recipeToFood)]) w.add(f.name);
    for (const t of tasks) w.add(t.title);
    for (const c of categories) w.add(c);
    return [...w];
  }

  function close() {
    ExpoSpeechRecognitionModule.abort();
    setOpen(false);
  }

  async function confirm() {
    if (!intent) return;
    setPhase('saving');
    try {
      await act(intent);
      setPhase('done');
      setTimeout(close, 1100);
    } catch (e: any) {
      setError(e?.message ?? 'Could not save that. Check your connection and try again.');
      setPhase('error');
    }
  }

  async function act(it: VoiceIntent) {
    if (it.kind === 'start_timer') {
      if (it.isGym) {
        await startVisit(it.label);
      } else {
        const key = (s: string) => s.trim().toLowerCase();
        const match = activities.find((a) => a.day === todayISO() && key(a.title) === key(it.label));
        if (match) await updateActivity(match.id, { started_at: new Date().toISOString(), ended_at: null, segments: segmentsOf(match) });
        else await addActivity({ day: todayISO(), title: it.label, description: null, category: it.category, started_at: new Date().toISOString(), ended_at: null, minutes: null, segments: [] });
      }
      await remember(it.label, { kind: 'timer', label: it.label, isGym: it.isGym });
    } else if (it.kind === 'stop_timer') {
      if (running) {
        const end = new Date();
        const elapsed = Math.round((end.getTime() - new Date(running.started_at!).getTime()) / 60000);
        await updateActivity(running.id, { ended_at: end.toISOString(), minutes: Math.max(1, (running.minutes ?? 0) + elapsed), segments: [...segmentsOf(running), { s: running.started_at!, e: end.toISOString() }] });
      } else if (activeVisit) {
        await endVisit();
      }
    } else if (it.kind === 'add_task') {
      await addTask({ day: todayISO(), title: it.title, category: it.category, target_minutes: null });
    } else if (it.kind === 'log_food') {
      const m = scaleFood(it.food, it.amount);
      await addFoodEntry({
        eaten_on: todayISO(), meal: it.meal, name: it.food.name, brand: it.food.brand ?? null, barcode: it.food.barcode ?? null,
        amount: it.amount, unit: it.unit, serving_label: it.food.serving_label ?? null, source: it.food.source ?? null, ...m,
      } as any);
      await remember(transcript.replace(/\bfor\s+(breakfast|lunch|dinner|tea|snack)\b/i, '').trim(), { kind: 'food', source: it.food.source ?? 'unknown', id: it.food.id ?? it.food.name, name: it.food.name });
    }
  }

  if (Platform.OS !== 'android') return null;

  return (
    <>
      <Mic onPress={start} active={open} />
      <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
        <Pressable style={s.backdrop} onPress={phase === 'listening' ? close : undefined}>
          <Pressable style={s.card} onPress={(e) => e.stopPropagation()}>
            {phase === 'listening' && (
              <>
                <PulsingMic />
                <Text style={s.hint}>Listening{partial ? '' : '…'}</Text>
                <Text style={s.transcript} numberOfLines={3}>{partial || 'Say something, like "start my gym routine" or "log two eggs for breakfast".'}</Text>
                <Button kind="secondary" title="Cancel" onPress={close} style={{ marginTop: 16 }} />
              </>
            )}
            {phase === 'parsed' && intent && (
              <ConfirmCard intent={intent} transcript={transcript} onConfirm={confirm} onRetry={start} onCancel={close} />
            )}
            {phase === 'saving' && <Text style={s.hint}>Saving…</Text>}
            {phase === 'done' && (
              <View style={{ alignItems: 'center', gap: 8 }}>
                <Ionicons name="checkmark-circle" size={34} color={A.up} />
                <Text style={s.hint}>Done</Text>
              </View>
            )}
            {phase === 'error' && (
              <>
                <Ionicons name="alert-circle-outline" size={28} color={C.danger} />
                <Text style={[s.transcript, { marginTop: 8 }]}>{error}</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
                  <Button icon="mic" title="Try again" onPress={start} />
                  <Button kind="secondary" title="Close" onPress={close} />
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function ConfirmCard({ intent, transcript, onConfirm, onRetry, onCancel }: { intent: VoiceIntent; transcript: string; onConfirm: () => void; onRetry: () => void; onCancel: () => void }) {
  return (
    <>
      <Text style={s.heard}>"{transcript}"</Text>
      {intent.kind === 'start_timer' && (
        <>
          <Ionicons name="play-circle" size={30} color={A.up} />
          <Text style={s.title}>Start {intent.isGym ? 'a gym session' : intent.label}</Text>
          {!intent.isGym && <Text style={s.hint}>{intent.category ?? 'Other'}</Text>}
        </>
      )}
      {intent.kind === 'stop_timer' && (
        <>
          <Ionicons name="stop-circle" size={30} color={A.over} />
          <Text style={s.title}>Stop the timer</Text>
        </>
      )}
      {intent.kind === 'add_task' && (
        <>
          <Ionicons name="checkbox-outline" size={28} color={A.core} />
          <Text style={s.title}>Add task: {intent.title}</Text>
          {!!intent.category && <Text style={s.hint}>{intent.category}</Text>}
        </>
      )}
      {intent.kind === 'log_food' && (
        <>
          <Ionicons name="nutrition" size={28} color={A.carbs} />
          <Text style={s.title}>{intent.food.name}</Text>
          <Text style={s.hint}>{round(intent.amount, 1)} {intent.unit} · {MEAL_LABELS[intent.meal]} · {scaleFood(intent.food, intent.amount).kcal} kcal</Text>
          {!!intent.note && <Text style={s.note}>{intent.note}</Text>}
        </>
      )}
      {intent.kind === 'unknown' && (
        <>
          <Ionicons name="help-circle-outline" size={28} color={C.muted} />
          <Text style={s.title}>Not sure what you meant</Text>
          <Text style={s.hint}>Try "start my gym routine", "log two eggs for breakfast", or "remind me to call the dentist".</Text>
        </>
      )}
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 18, flexWrap: 'wrap', justifyContent: 'center' }}>
        {intent.kind !== 'unknown' && <Button icon="checkmark" title="Confirm" onPress={onConfirm} />}
        <Button kind="secondary" icon="mic" title="Try again" onPress={onRetry} />
        <Button kind="secondary" title="Cancel" onPress={onCancel} />
      </View>
    </>
  );
}

function Mic({ onPress, active }: { onPress: () => void; active: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={active} accessibilityRole="button" accessibilityLabel="Voice command" style={(p) => [s.fab, smooth, hovered(p) && { backgroundColor: C.card2, borderColor: A.up }, p.pressed && { opacity: 0.8 }]}>
      <Ionicons name="mic" size={22} color={A.up} />
    </Pressable>
  );
}

function PulsingMic() {
  const p = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    AccessibilityInfo.isReduceMotionEnabled?.().then((still) => {
      if (still) return;
      loop = Animated.loop(Animated.sequence([
        Animated.timing(p, { toValue: 1, duration: 650, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(p, { toValue: 0, duration: 650, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]));
      loop.start();
    }).catch(() => {});
    return () => loop?.stop();
  }, []);
  const scale = p.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] });
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', height: 64 }}>
      <Animated.View style={[s.pulseRing, { transform: [{ scale }] }]} />
      <Ionicons name="mic" size={30} color={A.up} />
    </View>
  );
}

const s = StyleSheet.create({
  fab: { position: 'absolute', right: 18, bottom: 88, width: 54, height: 54, borderRadius: 27, backgroundColor: C.card, borderWidth: 1, borderColor: C.borderStrong, alignItems: 'center', justifyContent: 'center', elevation: 4, shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  backdrop: { flex: 1, backgroundColor: '#000000aa', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 360, backgroundColor: C.card, borderWidth: 1, borderColor: C.borderStrong, borderRadius: R.lg, padding: 22, alignItems: 'center', gap: 4 },
  pulseRing: { position: 'absolute', width: 56, height: 56, borderRadius: 28, backgroundColor: A.up + '33' },
  hint: { color: C.muted, fontFamily: F.bodyMed, fontSize: 13, marginTop: 10, textAlign: 'center' },
  transcript: { color: C.text, fontFamily: F.bodySemi, fontSize: 16, textAlign: 'center', marginTop: 6, lineHeight: 22 },
  heard: { color: C.faint, fontFamily: F.body, fontSize: 12, textAlign: 'center', fontStyle: 'italic', marginBottom: 6 },
  title: { color: C.text, fontFamily: F.display, fontSize: 18, letterSpacing: -0.4, textAlign: 'center', marginTop: 8 },
  note: { color: A.carbs, fontFamily: F.body, fontSize: 12, textAlign: 'center', marginTop: 6 },
});
