import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ExerciseThumb } from '../../../../../src/components/ExerciseAnimation';
import { Button, Eyebrow, H1, hovered, HoverTip, P, Row, Screen, smooth } from '../../../../../src/components/ui';
import { getExercise, groupOf } from '../../../../../src/lib/exercises';
import { groupColor } from '../../../../../src/lib/groups';
import { DAY_NAMES, METRIC_SHORT, metricFor, PlanItem } from '../../../../../src/lib/planner';
import {
  defaultUnit, fmtDuration, fmtWeight, LogRow, parseRange, secondsByDate, sessionsFor, suggest, todayISO, Unit, visitSeconds, workingWeight,
} from '../../../../../src/lib/progress';
import { useStore } from '../../../../../src/lib/store';
import { A, C, F, R } from '../../../../../src/lib/theme';

type Draft = { weight: string; reps: string; logId?: string };

export default function WorkoutScreen() {
  const params = useLocalSearchParams<{ day: string; idx: string; date?: string }>();
  const day = Number(params.day);
  const idx = Number(params.idx);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { plan, logs, visits, activeVisit, startVisit, endVisit } = useStore();
  const session = plan?.data.days.find((d) => d.day === day)?.sessions[idx];
  // The day being logged. A past day lets you fill in a workout you forgot to record.
  const today = params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? params.date : todayISO();
  const isToday = today === todayISO();

  const [rest, setRest] = useState<{ until: number; total: number } | null>(null);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!rest && !activeVisit) return;
    const t = setInterval(() => setNow(Date.now()), rest ? 250 : 1000);
    return () => clearInterval(t);
  }, [rest, activeVisit]);
  const restLeft = rest ? Math.max(0, Math.ceil((rest.until - now) / 1000)) : 0;
  useEffect(() => {
    if (rest && restLeft === 0) {
      const t = setTimeout(() => setRest(null), 1500);
      return () => clearTimeout(t);
    }
  }, [rest, restLeft]);

  if (!session) return <Screen><P>Session not found.</P></Screen>;

  const warmups = session.items.filter((i) => i.phase === 'warmup');
  const mainItems = session.items.filter((i) => i.phase !== 'warmup');
  const todays = logs.filter((l) => l.performed_on === today);
  const doneSets = mainItems.reduce((a, it) => a + todays.filter((l) => l.exercise_id === it.exerciseId).length, 0);
  const totalSets = mainItems.reduce((a, it) => a + Math.max(1, it.sets), 0);
  const pct = totalSets ? Math.min(1, doneSets / totalSets) : 0;
  const todayTotal = secondsByDate(visits, now).get(today) ?? 0;
  const ensureTimer = () => { if (isToday && !activeVisit) startVisit(session.title); };
  async function finish() {
    if (isToday) await endVisit();
    router.replace('/progress');
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Stack.Screen
        options={{
          title: '',
          headerRight: () => (
            <Pressable onPress={() => router.push(`/session/${day}/${idx}`)} accessibilityRole="button" accessibilityLabel="Edit this workout" style={(p) => [{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 }, smooth, hovered(p) && { backgroundColor: C.card2 }]}>
              <Ionicons name="create-outline" size={16} color={C.text} />
              <Text style={{ color: C.text, fontFamily: F.bodyMed }}>Edit</Text>
            </Pressable>
          ),
        }}
      />
      <Screen>
        <Eyebrow>{isToday ? `${DAY_NAMES[day]} · today` : `Logging for ${DAY_NAMES[day]} ${today}`}</Eyebrow>
        <H1>{session.title}</H1>
        <View style={{ gap: 8, marginTop: 4 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Text style={st.meta}>{doneSets} of {totalSets} sets</Text>
            <Text style={st.meta}>{Math.round(pct * 100)}%</Text>
          </Row>
          <HoverTip align="start" lines={[`${doneSets} of ${totalSets} sets`, `${Math.round(pct * 100)}% of the workout done`]}>
            <View style={st.track}><View style={[st.fill, { width: `${pct * 100}%` }]} /></View>
          </HoverTip>
        </View>
        {isToday && <View style={st.timer}>
          <View style={{ flex: 1 }}>
            <Text style={st.timerLabel}>{activeVisit ? 'IN THE GYM' : todayTotal > 0 ? 'GYM TIME TODAY' : 'GYM TIMER'}</Text>
            <Text style={st.timerClock}>
              {activeVisit ? fmtDuration(visitSeconds(activeVisit, now), true) : todayTotal > 0 ? fmtDuration(todayTotal) : '0:00'}
            </Text>
            {activeVisit && todayTotal > visitSeconds(activeVisit, now) + 30 && (
              <Text style={st.meta}>{fmtDuration(todayTotal)} total today</Text>
            )}
          </View>
          {activeVisit ? (
            <Pressable onPress={() => endVisit()} accessibilityRole="button" style={(p) => [st.timerBtn, st.timerBtnRow, smooth, hovered(p) && { backgroundColor: C.card2, borderColor: A.over }]}>
              <Ionicons name="stop" size={14} color={A.over} /><Text style={st.timerBtnText}>Stop</Text>
            </Pressable>
          ) : (
            <Pressable onPress={() => startVisit(session.title)} accessibilityRole="button" style={(p) => [st.timerBtn, st.timerBtnRow, st.timerBtnOn, smooth, hovered(p) && { backgroundColor: '#dcdcdc' }]}>
              <Ionicons name="play" size={14} color={C.inverseText} /><Text style={[st.timerBtnText, { color: C.inverseText }]}>Start</Text>
            </Pressable>
          )}
        </View>}
        {session.warmup && <P muted style={{ fontSize: 14, marginTop: 8 }}>Warm-up: {session.warmup.replace(/^Then /, 'Do ')}</P>}

        {warmups.length > 0 && (
          <View style={{ marginTop: 18, gap: 4 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Row style={{ gap: 7 }}><Ionicons name="flame" size={15} color={A.cardio} /><Text style={[st.sectionLabel, { color: A.cardio }]}>Warm-up</Text></Row>
              <Text style={st.meta}>about 8 min</Text>
            </Row>
            <Text style={st.meta}>Picked for what today trains. Light and easy, nothing near failure.</Text>
            {warmups.map((it, i) => (
              <ExerciseBlock key={it.uid} index={i} item={it} sessionTitle={session.title} date={today} compact
                onRest={() => ensureTimer()} />
            ))}
          </View>
        )}

        <Row style={{ gap: 7, marginTop: 22 }}><Ionicons name="barbell" size={15} color={A.fat} /><Text style={[st.sectionLabel, { color: A.fat }]}>Working sets</Text></Row>
        {mainItems.map((it, i) => (
          <ExerciseBlock key={it.uid} index={i} item={it} sessionTitle={session.title} date={today} onRest={(sec) => { ensureTimer(); if (sec > 0) setRest({ until: Date.now() + sec * 1000, total: sec }); }} />
        ))}

        <Button icon="flag" title={isToday && activeVisit ? `Finish workout · ${fmtDuration(visitSeconds(activeVisit, now))}` : 'Finish workout'} onPress={finish} style={{ marginTop: 24 }} />
      </Screen>

      {rest && (
        <View style={[st.restBar, { paddingBottom: insets.bottom + 14 }]}>
          <View style={{ flex: 1 }}>
            <Text style={st.restLabel}>{restLeft > 0 ? 'REST' : 'GO'}</Text>
            <Text style={st.restTime}>{restLeft > 0 ? `${Math.floor(restLeft / 60)}:${String(restLeft % 60).padStart(2, '0')}` : 'Next set'}</Text>
          </View>
          <Pressable onPress={() => setRest((r) => (r ? { ...r, until: r.until + 30000 } : r))} accessibilityRole="button" style={(p) => [st.restBtn, smooth, hovered(p) && { backgroundColor: '#e2e2e2' }]}><Text style={st.restBtnText}>+30s</Text></Pressable>
          <Pressable onPress={() => setRest(null)} accessibilityRole="button" style={(p) => [st.restBtn, smooth, { backgroundColor: C.inverseText }, hovered(p) && { backgroundColor: '#2a2a2a' }]}><Text style={[st.restBtnText, { color: C.inverse }]}>Skip</Text></Pressable>
          <View style={[st.restProgress, { width: `${rest.total ? (restLeft / rest.total) * 100 : 0}%` }]} />
        </View>
      )}
    </View>
  );
}

function ExerciseBlock({ item, index, sessionTitle, date, onRest, compact }: { item: PlanItem; index: number; sessionTitle: string; date: string; onRest: (sec: number) => void; compact?: boolean }) {
  const router = useRouter();
  const { logs, addLog, deleteLog, updateLog } = useStore();
  const e = getExercise(item.exerciseId);
  const today = date;
  const range = parseRange(item.reps);
  const past = useMemo(() => logs.filter((l) => l.performed_on < today), [logs, today]);
  const sug = useMemo(
    () => suggest(past, item.exerciseId, item.reps, item.sets, item.metric ?? metricFor(item.exerciseId)),
    [past, item.exerciseId, item.reps, item.sets, item.metric],
  );
  const last = useMemo(() => sessionsFor(past, item.exerciseId)[0], [past, item.exerciseId]);
  const todayLogs = logs.filter((l) => l.performed_on === today && l.exercise_id === item.exerciseId).sort((a, b) => a.set_number - b.set_number);

  const metric = item.metric ?? metricFor(item.exerciseId);
  const timed = metric !== 'reps';
  const machineLike = e && ['machine', 'cable', 'other'].includes(e.equipment);
  const [watch, setWatch] = useState<{ from: number } | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!watch) return;
    const id = setInterval(() => setTick((n) => n + 1), 250);
    return () => clearInterval(id);
  }, [watch]);
  const elapsed = watch ? Math.max(0, Math.round((Date.now() - watch.from) / 1000)) : 0;
  const [unit, setUnit] = useState<Unit>(todayLogs[0]?.unit ?? last?.unit ?? defaultUnit(e));
  const startWeight = sug.weight ?? (last ? workingWeight(last) : undefined);

  const init = (): Draft[] => {
    const n = Math.max(item.sets || 1, todayLogs.length);
    return Array.from({ length: n }, (_, k) => {
      const l = todayLogs.find((x) => x.set_number === k + 1);
      if (l) return { weight: l.weight_kg == null ? '' : String(l.weight_kg), reps: l.reps == null ? '' : String(l.reps), logId: l.id };
      return { weight: startWeight != null && unit !== 'bw' ? String(startWeight) : '', reps: '' };
    });
  };
  const [rows, setRows] = useState<Draft[]>(init);
  const busy = useRef(false);
  const [err, setErr] = useState<string | null>(null);

  const setRow = (k: number, ch: Partial<Draft>) => setRows((r) => r.map((x, j) => (j === k ? { ...x, ...ch } : x)));

  async function toggle(k: number) {
    if (busy.current) return;
    busy.current = true;
    setErr(null);
    const r = rows[k];
    try {
      if (r.logId) {
        await deleteLog(r.logId);
        setRow(k, { logId: undefined });
      } else {
        const reps = range ? Number(r.reps || range[1]) : null;
        const weight = r.weight.trim() === '' ? null : Number(r.weight.replace(',', '.'));
        const row: Omit<LogRow, 'id'> = {
          performed_on: today, exercise_id: item.exerciseId, set_number: k + 1, reps, weight_kg: Number.isFinite(weight as number) ? weight : null,
          unit, session_title: sessionTitle, target_reps: item.reps, metric,
        };
        const saved = await addLog(row);
        // carry the weight forward to the next empty set
        setRows((rs) => rs.map((x, j) => (j === k ? { ...x, reps: reps == null ? '' : String(reps), logId: saved.id } : j > k && !x.logId && x.weight === '' ? { ...x, weight: r.weight } : x)));
        onRest(item.restSec);
      }
    } catch (ex: any) {
      setErr(ex.message);
    } finally {
      busy.current = false;
    }
  }

  async function commitEdit(k: number) {
    const r = rows[k];
    if (!r.logId) return;
    const weight = r.weight.trim() === '' ? null : Number(r.weight.replace(',', '.'));
    await updateLog(r.logId, { reps: r.reps === '' ? null : Number(r.reps), weight_kg: weight, unit }).catch((ex) => setErr(ex.message));
  }

  if (!e) return null;
  const doneCount = rows.filter((r) => r.logId).length;
  const complete = doneCount >= rows.length;

  return (
    <View style={st.block}>
      <Pressable onPress={() => router.push(`/library/exercise/${encodeURIComponent(e.id)}`)} accessibilityRole="button" accessibilityLabel={`How to do ${e.name}`} style={(p) => [{ flexDirection: 'row', gap: 14, alignItems: 'center', borderRadius: R.sm }, smooth, hovered(p) && { backgroundColor: C.card }]}>
        <ExerciseThumb exercise={e} size={compact ? 44 : 56} />
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={[st.idx, { color: groupColor(groupOf(e)) }]}>
            {groupOf(e).toUpperCase()}{complete ? '  ·  DONE' : ''}
          </Text>
          <Text style={[st.name, compact && { fontSize: 16 }]}>{e.name}</Text>
          <Text style={st.meta}>
            {item.sets} × {item.reps} {METRIC_SHORT[metric]}{item.restSec ? ` · rest ${item.restSec}s` : ''} · how-to
          </Text>
        </View>
      </Pressable>

      {sug.kind !== 'none' && !compact && (
        <View style={[st.tip, { borderLeftColor: sug.kind === 'increase' ? A.up : sug.kind === 'decrease' ? A.down : C.borderStrong }]}>
          <Text style={[st.tipHead, sug.kind === 'increase' && { color: A.up }, sug.kind === 'decrease' && { color: A.down }]}>
            {sug.kind === 'increase' ? '↑ ' : sug.kind === 'decrease' ? '↓ ' : ''}{sug.headline}
          </Text>
          <Text style={st.tipBody}>{sug.detail}</Text>
          {last && <Text style={[st.meta, { marginTop: 4 }]}>Last ({last.date.slice(5)}): {last.sets.map((x) => `${fmtWeight(x.weight, last.unit)} × ${x.reps}`).join(', ')}</Text>}
        </View>
      )}
      {item.note && <Text style={st.meta}>{item.note}</Text>}

      {range && !timed && (machineLike || unit === 'bw') && (
        <Row style={{ gap: 0, alignSelf: 'flex-start' }}>
          {(machineLike ? (['kg', 'level'] as Unit[]) : (['bw', 'kg'] as Unit[])).map((u) => (
            <Pressable key={u} onPress={() => setUnit(u)} accessibilityRole="button" accessibilityState={{ selected: unit === u }} style={(p) => [st.seg, smooth, hovered(p) && unit !== u && { backgroundColor: C.card2 }, unit === u && st.segOn]}>
              <Text style={[st.segText, unit === u && { color: C.inverseText }]}>{u === 'kg' ? 'KG' : u === 'level' ? 'PIN LEVEL' : 'BODYWEIGHT'}</Text>
            </Pressable>
          ))}
        </Row>
      )}

      {timed && (
        <Row style={{ gap: 10 }}>
          <Pressable
            onPress={() => {
              if (!watch) return setWatch({ from: Date.now() });
              const value = metric === 'seconds' ? elapsed : Math.max(1, Math.round(elapsed / 60));
              const k = rows.findIndex((r) => !r.logId);
              if (k >= 0) setRow(k, { reps: String(value) });
              setWatch(null);
            }}
            accessibilityRole="button"
            style={(p) => [st.timerBtn2, st.timerBtnRow, smooth, hovered(p) && !watch && { backgroundColor: C.card2, borderColor: C.text }, watch && { backgroundColor: C.inverse, borderColor: C.inverse }]}
          >
            <Ionicons name={watch ? 'stop' : 'timer-outline'} size={15} color={watch ? C.inverseText : C.text} />
            <Text style={[st.timerBtn2Text, watch && { color: C.inverseText }]}>
              {watch ? `Stop · ${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')}` : 'Start timer'}
            </Text>
          </Pressable>
          <Text style={st.meta}>{watch ? 'Tap stop and it fills the next set.' : `Times the set for you, in ${metric}.`}</Text>
        </Row>
      )}

      <View style={{ gap: 6 }}>
        <View style={st.headRow}>
          <Text style={[st.col, { width: 34 }]}>SET</Text>
          {range && !timed && <Text style={[st.col, { flex: 1 }]}>{unit === 'level' ? 'LEVEL' : unit === 'bw' ? '+KG' : 'KG'}</Text>}
          <Text style={[st.col, { flex: 1 }]}>{range ? (metric === 'seconds' ? 'SECONDS' : metric === 'minutes' ? 'MINUTES' : 'REPS') : 'TARGET'}</Text>
          <View style={{ width: 44 }} />
        </View>
        {rows.map((r, k) => (
          <View key={k} style={[st.setRow, r.logId && st.setRowDone]}>
            <Text style={[st.setNum, r.logId && { color: C.inverseText }]}>{k + 1}</Text>
            {range && !timed && (
              <TextInput
                value={r.weight}
                onChangeText={(t) => setRow(k, { weight: t.replace(/[^0-9.,]/g, '') })}
                onBlur={() => commitEdit(k)}
                keyboardType="decimal-pad"
                placeholder={unit === 'bw' ? '0' : ''}
                placeholderTextColor={r.logId ? '#666' : C.faint}
                style={[st.cell, r.logId && st.cellDone]}
              />
            )}
            {range ? (
              <TextInput
                value={r.reps}
                onChangeText={(t) => setRow(k, { reps: t.replace(/\D/g, '') })}
                onBlur={() => commitEdit(k)}
                keyboardType="number-pad"
                placeholder={String(range[1])}
                placeholderTextColor={r.logId ? '#666' : C.faint}
                style={[st.cell, r.logId && st.cellDone]}
              />
            ) : (
              <Text style={[st.cell, { paddingTop: 12 }, r.logId && st.cellDone]}>{item.reps}</Text>
            )}
            <Pressable onPress={() => toggle(k)} accessibilityRole="checkbox" accessibilityState={{ checked: !!r.logId }} accessibilityLabel={`Set ${k + 1} done`} style={(p) => [st.check, smooth, hovered(p) && !r.logId && { borderColor: A.up, backgroundColor: A.up + '22' }, r.logId && st.checkOn]}>
              <Ionicons name="checkmark" size={22} color={r.logId ? C.inverse : C.faint} />
            </Pressable>
          </View>
        ))}
        <Pressable onPress={() => setRows((rs) => [...rs, { weight: rs[rs.length - 1]?.weight ?? '', reps: '' }])} accessibilityRole="button" style={(p) => [{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 6, borderRadius: R.sm, alignSelf: 'flex-start' }, smooth, hovered(p) && { backgroundColor: C.card2 }]}>
          <Ionicons name="add-circle-outline" size={16} color={C.muted} />
          <Text style={st.meta}>Add set</Text>
        </Pressable>
        {err && <Text style={{ color: C.danger, fontFamily: F.body }}>{err}</Text>}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  meta: { color: C.muted, fontFamily: F.body, fontSize: 12 },
  timer: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: C.border },
  timerLabel: { color: C.muted, fontFamily: F.bodySemi, fontSize: 10, letterSpacing: 1.4 },
  timerClock: { color: C.text, fontFamily: F.display, fontSize: 24, letterSpacing: -0.7, fontVariant: ['tabular-nums'] },
  timerBtn: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: R.sm, borderWidth: 1, borderColor: C.borderStrong },
  timerBtn2: { paddingVertical: 9, paddingHorizontal: 14, borderRadius: R.sm, borderWidth: 1, borderColor: C.borderStrong },
  timerBtnRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  timerBtn2Text: { color: C.text, fontFamily: F.bodySemi, fontSize: 13 },
  timerBtnOn: { backgroundColor: C.inverse, borderColor: C.inverse },
  timerBtnText: { color: C.text, fontFamily: F.bodySemi, fontSize: 14 },
  track: { height: 2, backgroundColor: C.border },
  fill: { height: 2, backgroundColor: A.up },
  block: { gap: 12, paddingTop: 22, paddingBottom: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  sectionLabel: { color: C.muted, fontFamily: F.bodySemi, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase' },
  idx: { color: C.faint, fontFamily: F.displayMed, fontSize: 12, letterSpacing: 1 },
  name: { color: C.text, fontFamily: F.display, fontSize: 19, letterSpacing: -0.3 },
  tip: { borderLeftWidth: 2, borderLeftColor: C.borderStrong, paddingLeft: 12, paddingVertical: 2, gap: 3 },
  tipHead: { color: C.text, fontFamily: F.bodySemi, fontSize: 14 },
  tipBody: { color: C.muted, fontFamily: F.body, fontSize: 13, lineHeight: 19 },
  seg: { paddingVertical: 7, paddingHorizontal: 12, borderWidth: 1, borderColor: C.border },
  segOn: { backgroundColor: C.inverse, borderColor: C.inverse },
  segText: { color: C.muted, fontFamily: F.bodySemi, fontSize: 11, letterSpacing: 1 },
  headRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 2 },
  col: { color: C.faint, fontFamily: F.bodySemi, fontSize: 10, letterSpacing: 1.2 },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: R.sm, padding: 4 },
  setRowDone: { backgroundColor: C.inverse },
  setNum: { width: 30, textAlign: 'center', color: C.muted, fontFamily: F.displayMed, fontSize: 15 },
  cell: { flex: 1, width: 0, minWidth: 0, height: 44, borderWidth: 1, borderColor: C.border, borderRadius: R.sm, color: C.text, fontFamily: F.displayMed, fontSize: 17, textAlign: 'center', backgroundColor: C.card },
  cellDone: { backgroundColor: C.inverse, borderColor: '#d4d4d4', color: C.inverseText },
  check: { width: 44, height: 44, borderRadius: R.sm, borderWidth: 1, borderColor: C.borderStrong, alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: C.inverseText, borderColor: C.inverseText },
  checkText: { color: C.faint, fontSize: 18, fontFamily: F.bodySemi },
  restBar: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: C.inverse, paddingHorizontal: 20, paddingTop: 14, flexDirection: 'row', alignItems: 'center', gap: 10, overflow: 'hidden' },
  restLabel: { color: '#666', fontFamily: F.bodySemi, fontSize: 10, letterSpacing: 1.4 },
  restTime: { color: C.inverseText, fontFamily: F.display, fontSize: 24, letterSpacing: -0.7 },
  restBtn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: R.sm, borderWidth: 1, borderColor: C.inverseText },
  restBtnText: { color: C.inverseText, fontFamily: F.bodySemi, fontSize: 13 },
  restProgress: { position: 'absolute', left: 0, top: 0, height: 3, backgroundColor: C.inverseText },
});
