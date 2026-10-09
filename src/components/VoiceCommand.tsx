import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef, useState } from 'react';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { AccessibilityInfo, ActivityIndicator, Animated, Easing, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { buildPrompt, resolveLlmOutput } from '../lib/aiAssistant';
import { useAiRuntime } from '../lib/aiRuntime';
import { confirm as confirmDialog } from '../lib/confirm';
import { EXERCISES } from '../lib/exercises';
import { entryToFood, MEAL_LABELS, round, scaleFood } from '../lib/nutrition';
import { recipeToFood } from '../lib/recipes';
import { REPEAT_LABEL } from '../lib/reminders';
import { useStore } from '../lib/store';
import { A, C, F, R } from '../lib/theme';
import { fmt12, isTime, minutesBetween, segmentsOf } from '../lib/tracker';
import { hasDestructive, parseVoiceCommand, VoiceContext, VoiceIntent } from '../lib/voiceParse';
import { preload as preloadDictionary, remember } from '../lib/voiceDictionary';
import { todayISO } from '../lib/progress';
import { speak, stopSpeaking, useSpeakEnabled } from '../lib/speech';
import { useTimeCategories } from './DayTrackers';
import { Button, hovered, Input, Row, smooth } from './ui';

type Phase = 'listening' | 'thinking' | 'parsed' | 'saving' | 'done' | 'error';

/**
 * A floating mic button (Android only, the phone's own speech recognizer, nothing sent anywhere). Says what
 * it heard, works out what you meant, then always shows you a confirm screen before anything is saved, so a
 * misheard word never quietly logs the wrong thing. What you confirm is remembered on this device, so the
 * same phrase resolves straight away next time instead of being re-guessed.
 */
export function VoiceCommand() {
  const {
    activities, addActivity, updateActivity, activeVisit, startVisit, endVisit,
    tasks, addTask, deleteTask, myFoods, sharedFoods, foodEntries, recipes, addFoodEntry, deleteFoodEntry,
    reminders, addReminder, deleteReminder, water, setWater, logWeight, saveProfile,
    customExercises, logs, addLog, sleep, saveSleep,
  } = useStore();
  const { categories } = useTimeCategories();
  const ai = useAiRuntime();
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>('listening');
  const [partial, setPartial] = useState('');
  const [typed, setTyped] = useState('');
  const [intent, setIntent] = useState<VoiceIntent | null>(null);
  const [fromAi, setFromAi] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const spoke = useRef(false);
  const [speakOn, setSpeakOn] = useSpeakEnabled();

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

  const todayFoodEntries = foodEntries.filter((e) => e.eaten_on === todayISO());
  const todayTasks = tasks.filter((t) => t.day === todayISO());
  const exercises = [...EXERCISES, ...customExercises];
  const todaySleep = sleep.find((s) => s.night_of === todayISO()) ?? null;

  async function finish(said: string) {
    ExpoSpeechRecognitionModule.stop();
    setTranscript(said);
    setFromAi(false);
    const knownFoods = [
      ...sharedFoods, ...myFoods, ...recipes.map(recipeToFood),
      ...[...foodEntries].reverse().slice(0, 150).map(entryToFood),
    ];
    const ctx: VoiceContext = { knownFoods, categories, runningLabel, todayTasks, todayFoodEntries, reminders, exercises };
    const parsed = parseVoiceCommand(said, ctx);
    // The instant word matching above handles most phrasings for free; the on-device model, when you have
    // turned it on in User settings, only ever gets asked when that fast path genuinely found nothing, since
    // it is slower and the point of the fast path is to make most commands not need it at all.
    if (parsed.kind === 'unknown' && ai.available && ai.enabled && ai.isLoaded) {
      setPhase('thinking');
      try {
        const raw = await ai.ask(buildPrompt(said, ctx));
        const resolved = resolveLlmOutput(raw, ctx);
        setIntent(resolved);
        setFromAi(resolved.kind !== 'unknown');
      } catch {
        setIntent(parsed); // the model itself failed to answer; fall back to the honest "not sure"
      }
      setPhase('parsed');
      return;
    }
    setIntent(parsed);
    setPhase('parsed');
  }

  // Reads back what it understood (or that it did not), the same moments the modal already changes to show
  // it, so turning this on feels like getting an answer rather than a running narration of everything typed.
  useEffect(() => {
    if (phase === 'parsed' && intent) speak(speakable(intent));
    else if (phase === 'done') speak('Done.');
    else if (phase === 'error' && error) speak(error);
  }, [phase]);

  async function start() {
    stopSpeaking();
    setOpen(true); setPhase('listening'); setPartial(''); setTyped(''); setIntent(null); setError(null); spoke.current = false;
    await preloadDictionary();
    const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!perm.granted) { setError('Forge needs microphone and speech permission, allow it in your phone settings.'); setPhase('error'); return; }
    ExpoSpeechRecognitionModule.start({
      lang: 'en-US', interimResults: true, continuous: false, addsPunctuation: false,
      contextualStrings: knownWords().slice(0, 200),
    });
  }

  /** Typed instead of spoken: the exact same pipeline as a finished voice command, just skipping the microphone. */
  function send() {
    if (!typed.trim()) return;
    ExpoSpeechRecognitionModule.abort();
    spoke.current = true;
    finish(typed.trim());
  }

  function knownWords(): string[] {
    const w = new Set<string>();
    for (const f of [...sharedFoods, ...myFoods, ...recipes.map(recipeToFood)]) w.add(f.name);
    for (const t of todayTasks) w.add(t.title);
    for (const r of reminders) w.add(r.title);
    for (const c of categories) w.add(c);
    for (const e of exercises.slice(0, 80)) w.add(e.name);
    return [...w];
  }

  function close() {
    ExpoSpeechRecognitionModule.abort();
    stopSpeaking();
    setOpen(false);
  }

  async function confirm() {
    if (!intent) return;
    // Removing something gets asked twice: once by the confirm card everything already goes through, and
    // again here, the same native-feeling prompt every delete button elsewhere in Forge already uses. A
    // 'multi' command can have more than one delete buried in it, so every one of them gets named.
    if (hasDestructive(intent)) {
      const labels = deleteLabels(intent);
      if (!(await confirmDialog('Delete this?', `${labels.map((l) => `"${l}"`).join(', ')} will be removed.`, { confirmText: 'Delete', danger: true }))) return;
    }
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
    if (it.kind === 'multi') {
      for (const sub of it.intents) await act(sub);
      return;
    }
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
    } else if (it.kind === 'delete_task') {
      await deleteTask(it.task.id);
    } else if (it.kind === 'log_food') {
      const m = scaleFood(it.food, it.amount);
      await addFoodEntry({
        eaten_on: todayISO(), meal: it.meal, name: it.food.name, brand: it.food.brand ?? null, barcode: it.food.barcode ?? null,
        amount: it.amount, unit: it.unit, serving_label: it.food.serving_label ?? null, source: it.food.source ?? null, ...m,
      } as any);
      await remember(transcript.replace(/\bfor\s+(breakfast|lunch|dinner|tea|snack)\b/i, '').trim(), { kind: 'food', source: it.food.source ?? 'unknown', id: it.food.id ?? it.food.name, name: it.food.name });
    } else if (it.kind === 'delete_food') {
      await deleteFoodEntry(it.entry.id);
    } else if (it.kind === 'log_weight') {
      await logWeight({ day: todayISO(), kg: it.kg, waist_cm: null });
    } else if (it.kind === 'log_water') {
      const cur = water[todayISO()] ?? 0;
      await setWater(todayISO(), it.mode === 'set' ? it.ml : cur + it.ml);
    } else if (it.kind === 'set_water_goal') {
      await saveProfile({ water_goal_ml: it.ml } as any);
    } else if (it.kind === 'set_goal_weight') {
      await saveProfile({ target_weight_kg: it.kg } as any);
    } else if (it.kind === 'set_fitness_goal') {
      await saveProfile({ goal: it.goal } as any);
    } else if (it.kind === 'add_reminder') {
      await addReminder({ title: it.title, remind_time: it.time, repeat: it.repeat, remind_date: it.date });
    } else if (it.kind === 'delete_reminder') {
      await deleteReminder(it.reminder.id);
    } else if (it.kind === 'log_set') {
      const already = logs.filter((l) => l.performed_on === todayISO() && l.exercise_id === it.exercise.id).length;
      for (let i = 0; i < it.sets; i++) {
        await addLog({
          performed_on: todayISO(), exercise_id: it.exercise.id, set_number: already + i + 1,
          reps: it.reps, weight_kg: it.weight, unit: it.unit, session_title: null, target_reps: null, metric: 'reps',
        });
      }
    } else if (it.kind === 'sleep_start') {
      await saveSleep({ night_of: todayISO(), bed_time: it.time, wake_time: todaySleep?.wake_time ?? null, minutes: null });
    } else if (it.kind === 'sleep_end') {
      const bed = todaySleep?.bed_time ?? null;
      const minutes = bed && isTime(bed) ? minutesBetween(bed, it.time) : null;
      await saveSleep({ night_of: todayISO(), bed_time: bed, wake_time: it.time, minutes });
    }
  }

  if (Platform.OS !== 'android') return null;

  return (
    <>
      <Mic onPress={start} active={open} />
      <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
        <Pressable style={s.backdrop} onPress={phase === 'listening' ? close : undefined}>
          <Pressable style={s.card} onPress={(e) => e.stopPropagation()}>
            <SpeakToggle on={speakOn} onToggle={() => setSpeakOn(!speakOn)} />
            {phase === 'listening' && (
              <>
                <PulsingMic />
                <Text style={s.hint}>Listening{partial ? '' : '…'}</Text>
                <Text style={s.transcript} numberOfLines={3}>{partial || 'Say something, like "log 3 sets of 10 at 60 kg for bench press", "track my study time", or "I\'m going to sleep".'}</Text>
                <View style={s.orRow}><View style={s.orLine} /><Text style={s.orText}>or type it</Text><View style={s.orLine} /></View>
                <Input value={typed} onChangeText={setTyped} placeholder="Type a command instead" onSubmitEditing={send} returnKeyType="send" style={{ width: '100%' }} />
                <Row style={{ gap: 8, marginTop: 10, width: '100%' }}>
                  <Button small icon="arrow-up" title="Send" onPress={send} disabled={!typed.trim()} style={{ flex: 1 }} />
                  <Button small kind="secondary" title="Cancel" onPress={close} style={{ flex: 1 }} />
                </Row>
              </>
            )}
            {phase === 'thinking' && (
              <>
                <Text style={s.heard}>"{transcript}"</Text>
                <View style={s.dotsWrap}><Dots /></View>
                <Text style={s.hint}>Having a closer look</Text>
                <View style={s.localBadge}><Ionicons name="phone-portrait-outline" size={12} color={A.core} /><Text style={s.localBadgeText}>Running on your phone, not the internet</Text></View>
              </>
            )}
            {phase === 'parsed' && intent && (
              <ConfirmCard intent={intent} transcript={transcript} fromAi={fromAi} onConfirm={confirm} onRetry={start} onCancel={close} />
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

/** The name of the thing being removed, for every delete buried anywhere in an intent (a plain delete, or
 *  one or more inside a 'multi' command), for the extra "X will be removed" confirmation. */
function deleteLabels(intent: VoiceIntent): string[] {
  if (intent.kind === 'multi') return intent.intents.flatMap(deleteLabels);
  if (intent.kind === 'delete_task') return [intent.task.title];
  if (intent.kind === 'delete_reminder') return [intent.reminder.title];
  if (intent.kind === 'delete_food') return [intent.entry.name];
  return [];
}

/** What to read out loud for each kind of understood command, a spoken sentence rather than the card's
 *  own short label, kept in sync with ConfirmCard's own text below. */
function speakable(intent: VoiceIntent): string {
  switch (intent.kind) {
    case 'multi': return intent.intents.map(speakable).join(' ');
    case 'start_timer': return intent.isGym ? 'Starting a gym session.' : `Starting ${intent.label}.`;
    case 'stop_timer': return 'Stopping the timer.';
    case 'add_task': return `Adding task: ${intent.title}.`;
    case 'delete_task': return `Delete task: ${intent.task.title}.`;
    case 'delete_food': return `Delete ${intent.entry.name}.`;
    case 'log_weight': return `Logging weight: ${intent.kg} kilograms.`;
    case 'log_water': return `${intent.mode === 'set' ? 'Setting' : 'Adding'} water: ${intent.ml} millilitres.`;
    case 'set_water_goal': return `Setting water goal to ${(intent.ml / 1000).toFixed(1)} litres a day.`;
    case 'set_goal_weight': return `Setting goal weight to ${intent.kg} kilograms.`;
    case 'set_fitness_goal': return `Changing goal to ${intent.label}.`;
    case 'add_reminder': return `Reminder: ${intent.title}, ${REPEAT_LABEL[intent.repeat]}, ${fmt12(intent.time)}.`;
    case 'delete_reminder': return `Delete reminder: ${intent.reminder.title}.`;
    case 'log_set': return `${intent.exercise.name}, ${intent.sets} set${intent.sets === 1 ? '' : 's'} of ${intent.reps} reps${intent.weight != null ? ` at ${intent.weight} kilograms` : ', bodyweight'}.`;
    case 'sleep_start': return `Going to bed at ${fmt12(intent.time)}.`;
    case 'sleep_end': return `Woke up at ${fmt12(intent.time)}.`;
    case 'log_food': return `${intent.food.name}, ${round(intent.amount, 1)} ${intent.unit}.`;
    case 'unknown': return "Sorry, I didn't catch that.";
  }
}

function SpeakToggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="button"
      accessibilityLabel={on ? 'Turn off spoken answers' : 'Turn on spoken answers'}
      style={(p) => [s.speakToggle, smooth, hovered(p) && { backgroundColor: C.card2, borderColor: A.core }]}
    >
      <Ionicons name={on ? 'volume-high' : 'volume-mute'} size={16} color={on ? A.core : C.muted} />
    </Pressable>
  );
}

function ConfirmCard({ intent, transcript, fromAi, onConfirm, onRetry, onCancel }: { intent: VoiceIntent; transcript: string; fromAi: boolean; onConfirm: () => void; onRetry: () => void; onCancel: () => void }) {
  return (
    <>
      {fromAi && <View style={s.aiTag}><Ionicons name="sparkles" size={11} color={A.core} /><Text style={s.aiTagText}>AI guess</Text></View>}
      <Text style={s.heard}>"{transcript}"</Text>
      {intent.kind === 'multi' ? (
        <View style={{ width: '100%', gap: 4 }}>
          {intent.intents.map((sub, i) => (
            <View key={i} style={[{ alignItems: 'center', paddingVertical: 10 }, i > 0 && s.multiDivider]}>
              <IntentBody intent={sub} fromAi={fromAi} />
            </View>
          ))}
        </View>
      ) : (
        <IntentBody intent={intent} fromAi={fromAi} />
      )}
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 18, flexWrap: 'wrap', justifyContent: 'center' }}>
        {intent.kind !== 'unknown' && (
          hasDestructive(intent)
            ? <Button kind="secondary" icon="trash-outline" tint={A.over} title="Delete" onPress={onConfirm} />
            : <Button icon="checkmark" title="Confirm" onPress={onConfirm} />
        )}
        <Button kind="secondary" icon="mic" title="Try again" onPress={onRetry} />
        <Button kind="secondary" title="Cancel" onPress={onCancel} />
      </View>
    </>
  );
}

/** The icon, title and hint for exactly one understood command, the same body whether it is the only thing
 *  shown on the confirm card or one row inside a 'multi' command's stacked list. */
function IntentBody({ intent, fromAi }: { intent: VoiceIntent; fromAi: boolean }) {
  return (
    <>
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
      {intent.kind === 'delete_task' && (
        <>
          <Ionicons name="trash-outline" size={28} color={A.over} />
          <Text style={s.title}>Delete task: {intent.task.title}</Text>
        </>
      )}
      {intent.kind === 'delete_food' && (
        <>
          <Ionicons name="trash-outline" size={28} color={A.over} />
          <Text style={s.title}>Delete: {intent.entry.name}</Text>
          <Text style={s.hint}>{MEAL_LABELS[intent.entry.meal]} · {intent.entry.kcal} kcal</Text>
        </>
      )}
      {intent.kind === 'log_weight' && (
        <>
          <Ionicons name="scale-outline" size={28} color={A.protein} />
          <Text style={s.title}>Log weight: {intent.kg} kg</Text>
        </>
      )}
      {intent.kind === 'log_water' && (
        <>
          <Ionicons name="water" size={28} color={A.water} />
          <Text style={s.title}>{intent.mode === 'set' ? 'Set' : 'Add'} water: {intent.ml} ml</Text>
        </>
      )}
      {intent.kind === 'set_water_goal' && (
        <>
          <Ionicons name="water" size={28} color={A.water} />
          <Text style={s.title}>Set water goal: {(intent.ml / 1000).toFixed(1)} L a day</Text>
        </>
      )}
      {intent.kind === 'set_goal_weight' && (
        <>
          <Ionicons name="flag-outline" size={28} color={A.protein} />
          <Text style={s.title}>Set goal weight: {intent.kg} kg</Text>
        </>
      )}
      {intent.kind === 'set_fitness_goal' && (
        <>
          <Ionicons name="flag-outline" size={28} color={A.protein} />
          <Text style={s.title}>Change goal: {intent.label}</Text>
        </>
      )}
      {intent.kind === 'add_reminder' && (
        <>
          <Ionicons name="alarm-outline" size={28} color={A.core} />
          <Text style={s.title}>Remind me: {intent.title}</Text>
          <Text style={s.hint}>{REPEAT_LABEL[intent.repeat]}, {fmt12(intent.time)}</Text>
          {intent.guessedTime && <Text style={s.note}>No time heard, guessed 9:00 AM, edit it on the Tasks page if that is wrong.</Text>}
        </>
      )}
      {intent.kind === 'delete_reminder' && (
        <>
          <Ionicons name="trash-outline" size={28} color={A.over} />
          <Text style={s.title}>Delete reminder: {intent.reminder.title}</Text>
        </>
      )}
      {intent.kind === 'log_set' && (
        <>
          <Ionicons name="barbell-outline" size={28} color={A.fat} />
          <Text style={s.title}>{intent.exercise.name}</Text>
          <Text style={s.hint}>{intent.sets} set{intent.sets === 1 ? '' : 's'} of {intent.reps} reps{intent.weight != null ? ` at ${intent.weight} kg` : ', bodyweight'}</Text>
        </>
      )}
      {intent.kind === 'sleep_start' && (
        <>
          <Ionicons name="moon-outline" size={28} color={'#8f9bff'} />
          <Text style={s.title}>Going to bed, {fmt12(intent.time)}</Text>
        </>
      )}
      {intent.kind === 'sleep_end' && (
        <>
          <Ionicons name="sunny-outline" size={28} color={A.carbs} />
          <Text style={s.title}>Woke up, {fmt12(intent.time)}</Text>
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
          <Text style={s.hint}>
            {fromAi
              ? "Even the AI wasn't confident about that one."
              : 'Try "log two eggs for breakfast", "start my gym routine", "remind me to call the dentist", "delete the task to buy milk", or "set my goal weight to 70".'}
          </Text>
        </>
      )}
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

/** Three dots, one after another, same idea as a chat app's "typing" indicator, while the model thinks. */
function Dots() {
  const vals = [useRef(new Animated.Value(0.3)).current, useRef(new Animated.Value(0.3)).current, useRef(new Animated.Value(0.3)).current];
  useEffect(() => {
    let loops: Animated.CompositeAnimation[] = [];
    AccessibilityInfo.isReduceMotionEnabled?.().then((still) => {
      if (still) return;
      loops = vals.map((v, i) => Animated.loop(Animated.sequence([
        Animated.delay(i * 150),
        Animated.timing(v, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.timing(v, { toValue: 0.3, duration: 350, useNativeDriver: true }),
        Animated.delay((2 - i) * 150),
      ])));
      loops.forEach((l) => l.start());
    }).catch(() => {});
    return () => loops.forEach((l) => l.stop());
  }, []);
  return (
    <View style={{ flexDirection: 'row', gap: 5 }}>
      {vals.map((v, i) => <Animated.View key={i} style={[s.dot, { opacity: v }]} />)}
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
  orRow: { flexDirection: 'row', alignItems: 'center', gap: 8, width: '100%', marginTop: 14, marginBottom: 2 },
  orLine: { flex: 1, height: 1, backgroundColor: C.border },
  orText: { color: C.faint, fontFamily: F.body, fontSize: 11 },
  dotsWrap: { marginTop: 10, marginBottom: 2 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.muted },
  localBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.card2, borderWidth: 1, borderColor: C.borderStrong, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, marginTop: 10 },
  localBadgeText: { color: C.soft, fontFamily: F.bodySemi, fontSize: 10.5 },
  aiTag: { position: 'absolute', top: 14, right: 14, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.card2, borderWidth: 1, borderColor: A.core, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  aiTagText: { color: A.core, fontFamily: F.bodySemi, fontSize: 10, letterSpacing: 0.4, textTransform: 'uppercase' },
  speakToggle: { position: 'absolute', top: 10, left: 10, width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'transparent' },
  multiDivider: { borderTopWidth: 1, borderTopColor: C.border },
});
