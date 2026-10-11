import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Image, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { BarChart } from '../../src/components/BarChart';
import { catColor } from '../../src/components/DayTrackers';
import { ExerciseThumb } from '../../src/components/ExerciseAnimation';
import { LineChart } from '../../src/components/LineChart';
import { dayLabel } from '../../src/components/AppHeader';
import { Button, Card, Chip, Eyebrow, H1, H2, hovered, HoverTip, Input, Label, ListRow, P, Row, Screen, Section, smooth, Stat } from '../../src/components/ui';
import { confirm } from '../../src/lib/confirm';
import { getExercise } from '../../src/lib/exercises';
import { computeTargets, MEAL_LABELS, MEALS, round, totals } from '../../src/lib/nutrition';
import { metricFor } from '../../src/lib/planner';
import { fmtDuration, fmtWeight, secondsByDate, sessionsFor, suggest, todayISO, visitSeconds, workingWeight } from '../../src/lib/progress';
import { useStore } from '../../src/lib/store';
import { A, C, F, R } from '../../src/lib/theme';
import { ACTIVITY_CATEGORIES, fmt12, fmtMinutes, isTime } from '../../src/lib/tracker';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
function mondayOf(d: Date) {
  const m = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  m.setDate(m.getDate() - ((m.getDay() + 6) % 7));
  return m;
}
function iso(d: Date) {
  const z = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}
function shift(isoDay: string, days: number) {
  const d = new Date(isoDay + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return iso(d);
}
function nice(isoDay: string, withDay = false) {
  const d = new Date(isoDay + 'T00:00:00');
  return `${withDay ? WD[d.getDay()] + ' ' : ''}${d.getDate()} ${MONTHS[d.getMonth()]}`;
}
const dayNum = (isoDay: string) => Math.round(new Date(isoDay + 'T00:00:00').getTime() / 864e5);

type Tab = 'weight' | 'photos' | 'food' | 'training' | 'sleep';
const TABS: { key: Tab; label: string; color: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { key: 'weight', label: 'Weight', color: A.protein, icon: 'scale-outline' },
  { key: 'photos', label: 'Photos', color: A.core, icon: 'images-outline' },
  { key: 'food', label: 'Food', color: A.carbs, icon: 'restaurant-outline' },
  { key: 'training', label: 'Training', color: A.up, icon: 'barbell-outline' },
  { key: 'sleep', label: 'Sleep', color: A.fat, icon: 'moon-outline' },
];

const TAB_KEYS = TABS.map((t) => t.key);

export default function ProgressScreen() {
  // A notification action (e.g. the progress photo nudge) can ask to land on a specific tab instead of
  // always Weight, via ?tab=photos; anything else or missing just falls back to the usual default.
  const { tab: tabParam } = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<Tab>(() => (TAB_KEYS.includes(tabParam as Tab) ? (tabParam as Tab) : 'weight'));
  return (
    <Screen>
      <Eyebrow>Progress</Eyebrow>
      <H1>Your progress</H1>
      <View style={st.seg}>
        {TABS.map((t) => {
          const on = t.key === tab;
          return (
            <Pressable key={t.key} onPress={() => setTab(t.key)} accessibilityRole="tab" accessibilityState={{ selected: on }} style={(p) => [st.segBtn, smooth, hovered(p) && !on && { backgroundColor: C.card2, borderColor: t.color + '88' }, on && { backgroundColor: t.color + '26', borderColor: t.color }]}>
              <Ionicons name={t.icon} size={16} color={on ? t.color : C.muted} />
              <Text style={[st.segText, on && { color: t.color }]}>{t.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {tab === 'weight' && <WeightTab />}
      {tab === 'photos' && <PhotosTab />}
      {tab === 'food' && <FoodTab />}
      {tab === 'training' && <TrainingTab />}
      {tab === 'sleep' && <SleepTab />}
    </Screen>
  );
}

// ---------------- Weight ----------------

const RANGES = [
  { key: '1M', days: 30 },
  { key: '3M', days: 91 },
  { key: '6M', days: 182 },
  { key: '1Y', days: 365 },
  { key: 'All', days: 100000 },
];

function WeightTab() {
  const { weights, profile, logWeight, deleteWeight, date: day } = useStore();
  const [range, setRange] = useState('3M');
  const last = [...weights].reverse().find((w) => w.kg != null);
  const [kg, setKg] = useState('');
  const [waist, setWaist] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [showAll, setShowAll] = useState(false);

  const withKg = weights.filter((w) => w.kg != null) as { day: string; kg: number; waist_cm: number | null }[];
  const start = withKg[0]?.kg ?? (profile?.weight_kg ? Number(profile.weight_kg) : null);
  const current = last?.kg ?? (profile?.weight_kg ? Number(profile.weight_kg) : null);
  const goal = profile?.target_weight_kg ? Number(profile.target_weight_kg) : null;
  const change = start != null && current != null ? round(current - start, 1) : null;
  const wantDown = goal != null && start != null ? goal < start : true;
  const good = change == null || change === 0 ? null : wantDown ? change < 0 : change > 0;
  const toGo = goal != null && current != null ? round(Math.abs(current - goal), 1) : null;
  const pct = goal != null && start != null && current != null && start !== goal
    ? Math.max(0, Math.min(1, (start - current) / (start - goal))) : null;

  const days = RANGES.find((r) => r.key === range)!.days;
  const cutoff = shift(todayISO(), -days);
  const shown = withKg.filter((w) => w.day >= cutoff);
  const points = shown.map((w, i) => {
    const prev = i > 0 ? shown[i - 1].kg : null;
    const diff = prev != null ? round(w.kg - prev, 1) : null;
    const toGoal = goal != null && start != null && start !== goal ? Math.max(0, Math.min(1, (start - w.kg) / (start - goal))) : null;
    return { x: dayNum(w.day), y: w.kg, caption: `${nice(w.day, true)}: ${w.kg} kg${diff ? `  (${diff > 0 ? '+' : ''}${diff})` : ''}`, note: toGoal != null ? `${Math.round(toGoal * 100)}% of the way to your goal` : undefined };
  });
  const waists = weights.filter((w) => w.waist_cm != null && w.day >= cutoff).map((w) => ({ x: dayNum(w.day), y: w.waist_cm!, caption: `${nice(w.day, true)}: ${w.waist_cm} cm waist` }));

  // Weekly pace over the last 4 weeks of weigh ins.
  const pace = useMemo(() => {
    if (withKg.length < 2) return null;
    const lastW = withKg[withKg.length - 1];
    const from = withKg.find((w) => w.day >= shift(lastW.day, -28)) ?? withKg[0];
    const span = dayNum(lastW.day) - dayNum(from.day);
    if (span < 6) return null;
    return round(((lastW.kg - from.kg) / span) * 7, 2);
  }, [withKg]);

  async function save() {
    setErr('');
    const k = kg.trim() ? Number(kg.replace(',', '.')) : null;
    const wc = waist.trim() ? Number(waist.replace(',', '.')) : null;
    if (k == null && wc == null) { setErr('Type your weight, your waist, or both.'); return; }
    if (k != null && !(k >= 30 && k <= 300)) { setErr('Weight should be between 30 and 300 kg.'); return; }
    if (wc != null && !(wc >= 40 && wc <= 250)) { setErr('Waist should be between 40 and 250 cm.'); return; }
    setBusy(true);
    try {
      const existing = weights.find((w) => w.day === day);
      await logWeight({ day, kg: k ?? existing?.kg ?? null, waist_cm: wc ?? existing?.waist_cm ?? null });
      setKg(''); setWaist('');
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }

  const history = [...weights].reverse();

  return (
    <>
      <Row style={{ gap: 10, marginTop: 18 }}>
        <Stat value={current != null ? `${current}` : '?'} label="Current kg" color={A.protein} />
        <Stat value={change == null ? '0' : `${change > 0 ? '+' : ''}${change}`} label="Since start" color={good == null ? C.borderStrong : good ? A.up : A.down} />
        <Stat value={toGo != null ? `${toGo}` : '?'} label="kg to goal" color={A.fat} />
      </Row>

      {goal != null && start != null && pct != null && (
        <Card style={{ gap: 10 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Text style={st.small}>Start {start} kg</Text>
            <Text style={[st.small, { color: A.up }]}>{Math.round(pct * 100)}% there</Text>
            <Text style={st.small}>Goal {goal} kg</Text>
          </Row>
          <HoverTip lines={[`${Math.round(pct * 100)}% of the way to ${goal} kg`, `Started at ${start} kg, now ${current} kg`]}>
            <View style={st.track}><View style={[st.fill, { width: `${Math.max(2, pct * 100)}%`, backgroundColor: A.up }]} /></View>
          </HoverTip>
          {pace != null && (
            <Text style={st.small}>
              Last 4 weeks: {pace > 0 ? '+' : ''}{pace} kg a week.{' '}
              {Math.abs(pace) > 1 ? 'That is fast, check you are eating enough protein.' : pace === 0 ? 'Holding steady.' : (wantDown ? pace < 0 : pace > 0) ? 'Heading the right way.' : 'Moving away from your goal, check your food log.'}
            </Text>
          )}
        </Card>
      )}

      <Section title="Weight trend" icon="trending-up" color={A.protein} right={<Row style={{ gap: 4 }}>{RANGES.map((r) => (
        <Pressable key={r.key} onPress={() => setRange(r.key)} accessibilityRole="button" accessibilityState={{ selected: range === r.key }} style={(p) => [st.rangeBtn, smooth, (range === r.key || hovered(p)) && { backgroundColor: C.card2 }]}>
          <Text style={[st.rangeText, range === r.key && { color: C.text }]}>{r.key}</Text>
        </Pressable>
      ))}</Row>}>
        <LineChart
          points={points}
          color={A.protein}
          goal={goal}
          goalLabel={goal != null ? `Goal ${goal} kg` : undefined}
          emptyText={withKg.length ? 'No weigh ins in this range' : 'Log your first weigh in below to start your chart'}
          startLabel={shown[0] ? nice(shown[0].day) : ''}
          endLabel={shown.length > 1 ? nice(shown[shown.length - 1].day) : ''}
        />
      </Section>

      <Section title="Log a weigh in" icon="scale" color={A.protein}>
        <Card style={{ gap: 4 }}>
          <Text style={{ color: C.muted, fontFamily: F.body, fontSize: 13 }}>Saving for {dayLabel(day)}. Change the day with the button at the top right.</Text>
          <Row style={{ gap: 10, alignItems: 'flex-end' }}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Label>Weight (kg)</Label>
              <Input value={kg} onChangeText={(t) => setKg(t.replace(/[^0-9.,]/g, ''))} keyboardType="decimal-pad" placeholder={last?.kg ? String(last.kg) : '80.5'} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Label>Waist (cm, optional)</Label>
              <Input value={waist} onChangeText={(t) => setWaist(t.replace(/[^0-9.,]/g, ''))} keyboardType="decimal-pad" placeholder="92" />
            </View>
          </Row>
          {!!err && <Text style={{ color: A.over, fontFamily: F.body, fontSize: 13, marginTop: 6 }}>{err}</Text>}
          <Button small icon="checkmark" title="Save" loading={busy} onPress={save} style={{ alignSelf: 'flex-start', marginTop: 10 }} />
          <Text style={[st.small, { marginTop: 8 }]}>Weigh yourself first thing in the morning, after the toilet and before food. Your daily targets update to your latest weight.</Text>
        </Card>
      </Section>

      {waists.length > 0 && (
        <Section title="Waist" icon="resize" color={A.core}>
          <LineChart points={waists} color={A.core} height={110} startLabel={nice(weights.filter((w) => w.waist_cm != null && w.day >= cutoff)[0].day)} />
        </Section>
      )}

      {history.length > 0 && (
        <Section title="History" icon="time-outline" color={C.muted}>
          <View>
            {(showAll ? history : history.slice(0, 8)).map((w, i, arr) => {
              const prev = history[i + 1];
              const diff = prev?.kg != null && w.kg != null ? round(w.kg - prev.kg, 1) : null;
              const col = diff == null || diff === 0 ? C.muted : (wantDown ? diff < 0 : diff > 0) ? A.up : A.down;
              return (
                <View key={w.day} style={st.hRow}>
                  <Text style={st.hDate}>{nice(w.day, true)}</Text>
                  <Text style={st.hKg}>{w.kg != null ? `${w.kg} kg` : ''}</Text>
                  <Text style={[st.hDiff, { color: col }]}>{diff ? `${diff > 0 ? '+' : ''}${diff}` : ''}</Text>
                  <Text style={[st.hDiff, { color: A.core, width: 64 }]}>{w.waist_cm != null ? `${w.waist_cm} cm` : ''}</Text>
                  <Pressable onPress={() => deleteWeight(w.day)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Delete the weigh in on ${nice(w.day)}`} style={(p) => [{ padding: 5, borderRadius: 999 }, smooth, hovered(p) && { backgroundColor: A.over + '22' }]}>
                    {(p: any) => <Ionicons name="trash-outline" size={16} color={hovered(p) ? A.over : C.faint} />}
                  </Pressable>
                </View>
              );
            })}
          </View>
          {history.length > 8 && <Button small kind="ghost" icon={showAll ? 'chevron-up' : 'chevron-down'} title={showAll ? 'Show less' : `Show all ${history.length}`} onPress={() => setShowAll(!showAll)} />}
        </Section>
      )}
    </>
  );
}

// ---------------- Photos ----------------

function PhotosTab() {
  const { progressPhotos, addProgressPhoto, deleteProgressPhoto, signProgressPhotos, date: day } = useStore();
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewing, setViewing] = useState<string | null>(null);

  // The bucket is private, so there is no plain public address; a short lived signed one is fetched for
  // whatever is in the list right now, refreshed whenever a photo is added or removed.
  useEffect(() => {
    const ids = progressPhotos.map((p) => p.id);
    if (!ids.length) { setUrls({}); return; }
    signProgressPhotos(ids).then(setUrls);
  }, [progressPhotos]);

  async function add() {
    setError(null);
    if (Platform.OS !== 'web') {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) { setError('Allow photo access in your phone settings to add a progress photo.'); return; }
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.7 });
    if (result.canceled || !result.assets?.length) return;
    setBusy(true);
    try {
      await addProgressPhoto(result.assets[0].uri, day);
    } catch (e: any) {
      setError(e?.message ?? 'Could not upload that photo. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (await confirm('Delete this photo?', 'It will be removed for good.', { confirmText: 'Delete', danger: true })) {
      await deleteProgressPhoto(id);
      if (viewing === id) setViewing(null);
    }
  }

  const sortedPhotos = [...progressPhotos].sort((a, b) => b.day.localeCompare(a.day));
  const viewed = sortedPhotos.find((p) => p.id === viewing) ?? null;

  return (
    <>
      <Card style={{ marginTop: 18, gap: 8 }}>
        <Text style={{ color: C.muted, fontFamily: F.body, fontSize: 13, lineHeight: 19 }}>
          Visual change often shows up before the scale does. Only you can see these, not even a friend who also uses Forge.
        </Text>
        <Button icon="camera-outline" title={`Add a photo for ${dayLabel(day)}`} onPress={add} loading={busy} style={{ alignSelf: 'flex-start' }} />
        {!!error && <Text style={{ color: A.over, fontFamily: F.body, fontSize: 13 }}>{error}</Text>}
      </Card>

      <Section title={sortedPhotos.length ? `${sortedPhotos.length} photo${sortedPhotos.length === 1 ? '' : 's'}` : 'Your timeline'} icon="images" color={A.core}>
        {sortedPhotos.length === 0 ? (
          <P muted style={{ fontSize: 13 }}>No progress photos yet. Add one on the day you weigh in to build a timeline over time.</P>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {sortedPhotos.map((p) => (
              <Pressable key={p.id} onPress={() => setViewing(p.id)} accessibilityRole="button" accessibilityLabel={`Photo from ${nice(p.day, true)}`} style={(st) => [pst.thumbWrap, smooth, hovered(st) && { borderColor: A.core }]}>
                {urls[p.id] ? <Image source={{ uri: urls[p.id] }} style={pst.thumb} /> : <View style={[pst.thumb, { backgroundColor: C.card2 }]} />}
                <Text style={pst.thumbDate}>{nice(p.day)}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </Section>

      <Modal visible={!!viewed} transparent animationType="fade" onRequestClose={() => setViewing(null)}>
        <Pressable style={pst.backdrop} onPress={() => setViewing(null)}>
          {!!viewed && (
            <Pressable style={pst.viewer} onPress={(e) => e.stopPropagation()}>
              {urls[viewed.id] ? <Image source={{ uri: urls[viewed.id] }} style={pst.full} resizeMode="contain" /> : <View style={[pst.full, { backgroundColor: C.card2 }]} />}
              <Row style={{ justifyContent: 'space-between', marginTop: 12 }}>
                <Text style={{ color: C.text, fontFamily: F.displayMed, fontSize: 15 }}>{nice(viewed.day, true)}</Text>
                <Row style={{ gap: 14 }}>
                  <Pressable onPress={() => remove(viewed.id)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Delete this photo" style={(st) => [{ padding: 4, borderRadius: 999 }, smooth, hovered(st) && { backgroundColor: A.over + '22' }]}>
                    <Ionicons name="trash-outline" size={20} color={A.over} />
                  </Pressable>
                  <Pressable onPress={() => setViewing(null)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Close" style={(st) => [{ padding: 4, borderRadius: 999 }, smooth, hovered(st) && { backgroundColor: C.card2 }]}>
                    <Ionicons name="close" size={22} color={C.muted} />
                  </Pressable>
                </Row>
              </Row>
            </Pressable>
          )}
        </Pressable>
      </Modal>
    </>
  );
}

// ---------------- Food ----------------

function FoodTab() {
  const { foodEntries, profile, water } = useStore();
  const [span, setSpan] = useState(7);
  const t = useMemo(() => computeTargets(profile as any), [profile]);
  const today = todayISO();
  const from = shift(today, -(span - 1));
  const inRange = foodEntries.filter((e) => e.eaten_on >= from && e.eaten_on <= today);

  const byDay = useMemo(() => {
    const out: { day: string; kcal: number; protein: number; carbs: number; fat: number; fibre: number }[] = [];
    for (let i = span - 1; i >= 0; i--) {
      const d = shift(today, -i);
      const s = totals(inRange.filter((e) => e.eaten_on === d));
      out.push({ day: d, kcal: s.kcal, protein: s.protein, carbs: s.carbs, fat: s.fat, fibre: s.fibre });
    }
    return out;
  }, [inRange, span, today]);

  const logged = byDay.filter((d) => d.kcal > 0);
  const n = Math.max(1, logged.length);
  const avg = {
    kcal: logged.reduce((a, d) => a + d.kcal, 0) / n,
    protein: logged.reduce((a, d) => a + d.protein, 0) / n,
    carbs: logged.reduce((a, d) => a + d.carbs, 0) / n,
    fat: logged.reduce((a, d) => a + d.fat, 0) / n,
    fibre: logged.reduce((a, d) => a + d.fibre, 0) / n,
  };
  const onTarget = t.ready ? logged.filter((d) => Math.abs(d.kcal - t.kcal!) <= t.kcal! * 0.1).length : 0;
  const proteinHit = t.ready ? logged.filter((d) => d.protein >= t.protein! * 0.9).length : 0;

  const bars = byDay.map((d) => {
    const diff = t.ready ? Math.round(d.kcal - t.kcal!) : 0;
    return {
      label: span <= 7 ? WD[new Date(d.day + 'T00:00:00').getDay()] : nice(d.day),
      value: Math.round(d.kcal),
      caption: `${nice(d.day, true)}: ${Math.round(d.kcal)} kcal${d.kcal && t.ready ? `, ${Math.abs(diff)} ${diff > 0 ? 'over' : 'under'} goal` : d.kcal ? '' : ', nothing logged'}`,
    };
  });

  const macroKcal = avg.protein * 4 + avg.carbs * 4 + avg.fat * 9 || 1;
  const split = [
    { label: 'Protein', pct: (avg.protein * 4) / macroKcal, goal: t.ready ? (t.protein! * 4) / t.kcal! : 0, color: A.protein },
    { label: 'Carbs', pct: (avg.carbs * 4) / macroKcal, goal: t.ready ? (t.carbs! * 4) / t.kcal! : 0, color: A.carbs },
    { label: 'Fat', pct: (avg.fat * 9) / macroKcal, goal: t.ready ? (t.fat! * 9) / t.kcal! : 0, color: A.fat },
  ];

  const meals = MEALS.map((m) => ({ m, kcal: inRange.filter((e) => e.meal === m).reduce((a, e) => a + (Number(e.kcal) || 0), 0) }));
  const mealTotal = meals.reduce((a, x) => a + x.kcal, 0) || 1;
  const MEAL_COLORS: Record<string, string> = { breakfast: A.carbs, lunch: A.fibre, dinner: A.protein, snack: A.fat };

  const topFoods = useMemo(() => {
    const m = new Map<string, { kcal: number; protein: number; times: number }>();
    for (const e of inRange) {
      const k = e.name;
      const cur = m.get(k) ?? { kcal: 0, protein: 0, times: 0 };
      cur.kcal += Number(e.kcal) || 0; cur.protein += Number(e.protein_g) || 0; cur.times++;
      m.set(k, cur);
    }
    return [...m.entries()].sort((a, b) => b[1].kcal - a[1].kcal).slice(0, 5);
  }, [inRange]);

  const waterDays = byDay.map((d) => water[d.day] ?? 0).filter((v) => v > 0);
  const waterAvg = waterDays.length ? waterDays.reduce((a, b) => a + b, 0) / waterDays.length : 0;

  return (
    <>
      <Row style={{ gap: 6, marginTop: 18 }}>
        <Chip label="Last 7 days" active={span === 7} dot={A.carbs} onPress={() => setSpan(7)} />
        <Chip label="Last 30 days" active={span === 30} dot={A.carbs} onPress={() => setSpan(30)} />
      </Row>

      <Row style={{ gap: 10 }}>
        <Stat value={logged.length ? Math.round(avg.kcal) : '0'} label="Avg kcal a day" color={A.cardio} />
        <Stat value={`${logged.length}/${span}`} label="Days logged" color={A.water} />
        <Stat value={`${onTarget}`} label="Days on target" color={A.up} />
      </Row>

      <Section title="Calories" icon="flame" color={A.carbs} right={t.ready ? <Text style={st.small}>Goal {t.kcal} kcal</Text> : undefined}>
        <BarChart data={bars} height={120} color={A.cardio} reference={t.ready ? { value: t.kcal!, label: 'of your calorie goal' } : undefined} emptyText="Log food to see your calorie report" />
      </Section>

      {logged.length > 0 && (
        <>
          <Section title="Daily average vs goal" icon="speedometer-outline" color={A.carbs}>
            <Card style={{ gap: 12 }}>
              <AvgBar label="Protein" v={avg.protein} goal={t.protein} color={A.protein} />
              <AvgBar label="Carbs" v={avg.carbs} goal={t.carbs} color={A.carbs} />
              <AvgBar label="Fat" v={avg.fat} goal={t.fat} color={A.fat} />
              <AvgBar label="Fibre" v={avg.fibre} goal={t.fibre} color={A.fibre} />
              {t.ready && <Text style={st.small}>You hit your protein on {proteinHit} of {logged.length} logged days.</Text>}
            </Card>
          </Section>

          <Section title="Where your calories came from" icon="pie-chart-outline" color={A.fat}>
            <Card style={{ gap: 12 }}>
              <Stacked parts={split.map((p) => ({ v: p.pct, color: p.color, label: p.label }))} />
              <Row style={{ justifyContent: 'space-between' }}>
                {split.map((p) => (
                  <View key={p.label} style={{ flex: 1 }}>
                    <Text style={[st.legendV, { color: p.color }]}>{Math.round(p.pct * 100)}%</Text>
                    <Text style={st.small}>{p.label}{t.ready ? `, goal ${Math.round(p.goal * 100)}%` : ''}</Text>
                  </View>
                ))}
              </Row>
            </Card>
          </Section>

          <Section title="By meal" icon="restaurant-outline" color={A.up}>
            <Card style={{ gap: 12 }}>
              <Stacked parts={meals.map((x) => ({ v: x.kcal / mealTotal, color: MEAL_COLORS[x.m], label: MEAL_LABELS[x.m] }))} />
              <Row style={{ justifyContent: 'space-between' }}>
                {meals.map((x) => (
                  <View key={x.m} style={{ flex: 1 }}>
                    <Text style={[st.legendV, { color: MEAL_COLORS[x.m] }]}>{Math.round((x.kcal / mealTotal) * 100)}%</Text>
                    <Text style={st.small}>{MEAL_LABELS[x.m]}</Text>
                  </View>
                ))}
              </Row>
            </Card>
          </Section>

          <Section title="Highest in calories" icon="podium-outline" color={A.cardio}>
            <View>
              {topFoods.map(([name, v], i) => (
                <ListRow
                  key={name}
                  accent={[A.cardio, A.carbs, A.protein, A.fat, A.fibre][i]}
                  title={name}
                  subtitle={`${v.times} time${v.times === 1 ? '' : 's'} · ${Math.round(v.protein)} g protein`}
                  right={<Text style={st.hKg}>{Math.round(v.kcal)} kcal</Text>}
                />
              ))}
            </View>
          </Section>
        </>
      )}

      <Section title="Water" icon="water" color={A.water}>
        <Row style={{ gap: 10 }}>
          <Stat value={waterAvg ? `${(waterAvg / 1000).toFixed(1)} L` : '0 L'} label="Avg on days logged" color={A.water} />
          <Stat value={t.ready ? `${(t.water! / 1000).toFixed(1)} L` : '?'} label="Daily goal" color={A.water} />
        </Row>
      </Section>
    </>
  );
}

function AvgBar({ label, v, goal, color }: { label: string; v: number; goal?: number; color: string }) {
  const pct = goal ? v / goal : 0;
  return (
    <View style={{ gap: 5 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text style={st.barLabel}>{label}</Text>
        <Text style={st.small}><Text style={{ color: C.text, fontFamily: F.bodySemi }}>{Math.round(v)} g</Text>{goal ? ` of ${goal} g · ${Math.round(pct * 100)}%` : ''}</Text>
      </Row>
      <HoverTip lines={[`${label}: ${Math.round(v)} g${goal ? ` of ${goal} g` : ''}`, goal ? `${Math.round(pct * 100)}% of your daily goal` : '']}>
        <View style={st.track}><View style={[st.fill, { width: `${Math.min(100, Math.max(2, pct * 100))}%`, backgroundColor: pct > 1.15 && label !== 'Protein' && label !== 'Fibre' ? A.over : color }]} /></View>
      </HoverTip>
    </View>
  );
}

function Stacked({ parts }: { parts: { v: number; color: string; label?: string }[] }) {
  const shown = parts.filter((p) => p.v > 0);
  const total = shown.reduce((a, p) => a + p.v, 0) || 1;
  return (
    <View style={[st.track, { height: 12, flexDirection: 'row', gap: 2, backgroundColor: 'transparent', overflow: 'visible' }]}>
      {shown.map((p, i) => (
        <HoverTip key={i} style={{ flex: p.v }} align={i === 0 ? 'start' : i === shown.length - 1 ? 'end' : 'center'} lines={[`${p.label ? `${p.label}: ` : ''}${Math.round((p.v / total) * 100)}%`]}>
          <View style={{ flex: 1, backgroundColor: p.color, borderRadius: 3 }} />
        </HoverTip>
      ))}
    </View>
  );
}

// ---------------- Sleep and time ----------------

function clockToMin(t: string) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}
/** Average clock times that can wrap past midnight (e.g. 23:30 and 00:30 average to 00:00). */
function avgClock(times: string[]) {
  if (!times.length) return null;
  let sx = 0, sy = 0;
  for (const t of times) { const a = (clockToMin(t) / 1440) * 2 * Math.PI; sx += Math.cos(a); sy += Math.sin(a); }
  let a = Math.atan2(sy, sx); if (a < 0) a += 2 * Math.PI;
  const m = Math.round((a / (2 * Math.PI)) * 1440) % 1440;
  return fmt12(`${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`);
}

function SleepTab() {
  const { sleep, activities } = useStore();
  const today = todayISO();
  const nights = [];
  for (let i = 13; i >= 0; i--) {
    const d = shift(today, -i);
    const s = sleep.find((x) => x.night_of === d);
    const m = s?.minutes ?? 0;
    nights.push({ label: nice(d), value: Math.round((m / 60) * 10) / 10, caption: `${nice(d, true)}: ${m ? `${fmtMinutes(m)}${s?.bed_time ? `, ${fmt12(s.bed_time)} to ${fmt12(s.wake_time)}` : ''}` : 'not logged'}` });
  }
  const recent = sleep.filter((s) => s.night_of >= shift(today, -13) && s.minutes);
  const avgMin = recent.length ? Math.round(recent.reduce((a, s) => a + (s.minutes ?? 0), 0) / recent.length) : 0;
  const bed = avgClock(recent.map((s) => s.bed_time).filter((x): x is string => isTime(x)));
  const wake = avgClock(recent.map((s) => s.wake_time).filter((x): x is string => isTime(x)));
  const good = recent.filter((s) => (s.minutes ?? 0) >= 420).length;

  const weekStart = shift(today, -6);
  const weekActs = activities.filter((a) => a.day >= weekStart && a.minutes);
  const byCat = [...new Set(weekActs.map((a) => a.category ?? 'Other'))].map((c) => ({ c, min: weekActs.filter((a) => (a.category ?? 'Other') === c).reduce((x, a) => x + (a.minutes ?? 0), 0) })).filter((x) => x.min > 0);
  const weekTotal = byCat.reduce((a, x) => a + x.min, 0);
  const days7 = [];
  for (let i = 6; i >= 0; i--) {
    const d = shift(today, -i);
    const m = activities.filter((a) => a.day === d).reduce((x, a) => x + (a.minutes ?? 0), 0);
    days7.push({ label: WD[new Date(d + 'T00:00:00').getDay()], value: m, caption: `${nice(d, true)}: ${m ? fmtMinutes(m) : 'nothing tracked'}` });
  }
  const projects = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of weekActs) m.set(a.title, (m.get(a.title) ?? 0) + (a.minutes ?? 0));
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [weekActs]);

  return (
    <>
      <Row style={{ gap: 10, marginTop: 18 }}>
        <Stat value={avgMin ? `${(avgMin / 60).toFixed(1)}h` : '0h'} label="Avg a night" color={A.fat} />
        <Stat value={bed ?? '?'} label="Avg bedtime" color={A.protein} />
        <Stat value={wake ?? '?'} label="Avg wake up" color={A.carbs} />
      </Row>
      <Section title="Sleep · 14 nights" icon="moon" color={'#8f9bff'} right={recent.length ? <Text style={st.small}>{good} of {recent.length} nights 7h or more</Text> : undefined}>
        <BarChart data={nights} height={110} color={A.fat} reference={{ value: 8, label: 'of 8 hours' }} emptyText="Log your sleep on the Tracker tab to see it here" />
      </Section>

      <Section title="Time tracked · 7 days" icon="timer-outline" color={A.core} right={weekTotal ? <Text style={st.small}>{fmtMinutes(weekTotal)} total</Text> : undefined}>
        <BarChart data={days7} height={100} color={A.water} reference={{ value: 1440, label: 'of the day' }} emptyText="Use the Tracker tab to track your day" />
        {byCat.length > 0 && (
          <Card style={{ gap: 12 }}>
            <Stacked parts={byCat.map((x) => ({ v: x.min, color: catColor(x.c), label: x.c }))} />
            <Row wrap style={{ gap: 14 }}>
              {byCat.map((x) => (
                <View key={x.c}>
                  <Text style={[st.legendV, { color: catColor(x.c) }]}>{fmtMinutes(x.min)}</Text>
                  <Text style={st.small}>{x.c}</Text>
                </View>
              ))}
            </Row>
          </Card>
        )}
        {projects.length > 0 && (
          <View>
            {projects.map(([title, min]) => {
              const cat = weekActs.find((a) => a.title === title)?.category ?? 'Other';
              return <ListRow key={title} accent={catColor(cat)} title={title} subtitle={cat} right={<Text style={st.hKg}>{fmtMinutes(min)}</Text>} />;
            })}
          </View>
        )}
      </Section>
    </>
  );
}

// ---------------- Training ----------------

function TrainingTab() {
  const { logs, plan, visits } = useStore();
  const router = useRouter();

  const stats = useMemo(() => {
    const days = new Set(logs.map((l) => l.performed_on));
    const thisMon = iso(mondayOf(new Date()));
    const thisWeek = [...days].filter((d) => d >= thisMon).length;
    const cutoff = iso(new Date(Date.now() - 30 * 864e5));
    const sets30 = logs.filter((l) => l.performed_on >= cutoff).length;
    // consecutive weeks (ending this or last week) with at least one workout
    let streak = 0;
    const m = mondayOf(new Date());
    const weekHas = (start: Date) => {
      const a = iso(start); const e = new Date(start); e.setDate(e.getDate() + 7); const b = iso(e);
      return [...days].some((d) => d >= a && d < b);
    };
    if (!weekHas(m)) m.setDate(m.getDate() - 7);
    while (weekHas(m)) { streak++; m.setDate(m.getDate() - 7); }
    return { total: days.size, thisWeek, sets30, streak };
  }, [logs]);

  const weekly = useMemo(() => {
    const days = new Set(logs.map((l) => l.performed_on));
    const out = [];
    const start = mondayOf(new Date());
    start.setDate(start.getDate() - 7 * 9);
    for (let w = 0; w < 10; w++) {
      const a = new Date(start); a.setDate(start.getDate() + w * 7);
      const b = new Date(a); b.setDate(a.getDate() + 7);
      const n = [...days].filter((d) => d >= iso(a) && d < iso(b)).length;
      const lbl = `${a.getDate()} ${MONTHS[a.getMonth()]}`;
      out.push({ label: lbl, value: n, caption: `Week of ${lbl}: ${n} workout${n === 1 ? '' : 's'}` });
    }
    return out;
  }, [logs]);


  const gym = useMemo(() => {
    const byDate = secondsByDate(visits);
    const thisMon = iso(mondayOf(new Date()));
    const week = [...byDate.entries()].filter(([d]) => d >= thisMon).reduce((a, [, s]) => a + s, 0);
    const done = visits.filter((v) => v.ended_at);
    const avg = done.length ? Math.round(done.reduce((a, v) => a + visitSeconds(v), 0) / done.length) : 0;
    const bars = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = iso(d);
      const sec = byDate.get(key) ?? 0;
      const lbl = `${d.getDate()} ${MONTHS[d.getMonth()]}`;
      bars.push({ label: lbl, value: Math.round(sec / 60), caption: `${lbl}: ${sec ? fmtDuration(sec) : 'no gym time'}` });
    }
    const recent = [...byDate.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1)).slice(0, 7);
    return { week, avg, bars, recent, visitsByDate: visits };
  }, [visits]);

  // Exercises in the plan that are ready to go up.
  const ready = useMemo(() => {
    if (!plan) return [];
    const seen = new Set<string>();
    const out: { id: string; headline: string; detail: string; kind: string }[] = [];
    for (const d of plan.data.days) for (const s of d.sessions) for (const it of s.items) {
      if (seen.has(it.exerciseId)) continue;
      seen.add(it.exerciseId);
      const sg = suggest(logs, it.exerciseId, it.reps, it.sets, it.metric ?? metricFor(it.exerciseId));
      if (sg.kind === 'increase' || sg.kind === 'decrease') out.push({ id: it.exerciseId, headline: sg.headline, detail: sg.detail, kind: sg.kind });
    }
    return out;
  }, [plan, logs]);

  // Every exercise you've logged, most recent first.
  const lifts = useMemo(() => {
    const ids: string[] = [];
    for (const l of logs) if (!ids.includes(l.exercise_id)) ids.push(l.exercise_id);
    return ids.map((id) => {
      const ss = sessionsFor(logs, id);
      const last = ss[0];
      const trend = ss.slice(0, 6).reverse().map((s) => workingWeight(s));
      const first = trend[0];
      const lastW = trend[trend.length - 1];
      return { id, last, sessions: ss.length, trend, change: last && last.unit !== 'bw' && ss.length > 1 ? lastW - first : null };
    });
  }, [logs]);

  return (
    <>
      <H2 style={{ marginTop: 18 }}>{stats.total === 0 ? 'Start logging' : `${stats.total} workout${stats.total === 1 ? '' : 's'}`}</H2>
      {stats.total === 0 && <P muted>Open today's workout and tick off your sets. Your weights, reps and suggestions will show up here.</P>}

      <Row style={{ gap: 10, marginTop: 8 }}>
        <Stat value={stats.thisWeek} label="This week" color={A.up} />
        <Stat value={stats.streak} label={stats.streak === 1 ? 'Week streak' : 'Weeks streak'} color={A.up} />
        <Stat value={stats.sets30} label="Sets, 30 days" color={A.protein} />
      </Row>

      <Row style={{ gap: 10 }}>
        <Stat value={gym.week ? fmtDuration(gym.week) : '0m'} label="Gym time this week" color={A.water} />
        <Stat value={gym.avg ? fmtDuration(gym.avg) : '0m'} label="Average visit" color={A.water} />
      </Row>

      <Section title="Time in the gym · 14 days" icon="barbell-outline" color={A.fat}>
        <BarChart data={gym.bars} height={110} color={A.water} emptyText="Start the gym timer on a workout to track your time" />
        {gym.recent.length > 0 && (
          <View style={{ marginTop: 4 }}>
            {gym.recent.map(([date, sec]) => {
              const titles = [...new Set(visits.filter((v) => v.visit_date === date).map((v) => v.session_title).filter(Boolean))].join(' + ');
              const d = new Date(date + 'T00:00:00');
              return (
                <View key={date} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: C.border, gap: 12 }}>
                  <Text style={{ width: 64, color: C.muted, fontFamily: F.displayMed, fontSize: 13 }}>{d.getDate()} {MONTHS[d.getMonth()]}</Text>
                  <Text style={{ flex: 1, color: C.text, fontFamily: F.body, fontSize: 14 }} numberOfLines={1}>{titles || 'Workout'}</Text>
                  <Text style={{ color: C.text, fontFamily: F.displayMed, fontSize: 15 }}>{fmtDuration(sec)}</Text>
                </View>
              );
            })}
          </View>
        )}
      </Section>

      <Section title="Workouts per week" icon="calendar-outline" color={A.up}>
        <BarChart data={weekly} height={110} color={A.up} emptyText="Your weekly training will appear here" />
      </Section>

      {ready.length > 0 && (
        <Section title="Adjust next time" icon="swap-vertical" color={A.carbs}>
          {ready.map((r) => {
            const e = getExercise(r.id);
            return (
              <Card key={r.id} onPress={() => router.push(`/library/exercise/${encodeURIComponent(r.id)}`)}
                style={{ borderLeftWidth: 2, borderLeftColor: r.kind === 'increase' ? A.up : A.down }}>
                <Text style={{ color: C.muted, fontFamily: F.body, fontSize: 12 }}>{e?.name}</Text>
                <Text style={{ color: r.kind === 'increase' ? A.up : A.down, fontFamily: F.display, fontSize: 20, letterSpacing: -0.4 }}>{r.headline}</Text>
                <P muted style={{ fontSize: 13 }}>{r.detail}</P>
              </Card>
            );
          })}
        </Section>
      )}

      {lifts.length > 0 && (
        <Section title="Your lifts" icon="trophy-outline" color={A.up}>
          <View>
            {lifts.map((l) => {
              const e = getExercise(l.id);
              if (!e || !l.last) return null;
              const lastLine = l.last.sets.map((s) => (l.last.unit === 'bw' && !s.weight ? `${s.reps}` : `${fmtWeight(s.weight, l.last.unit)}×${s.reps}`)).join('  ');
              return (
                <ListRow
                  key={l.id}
                  onPress={() => router.push(`/library/exercise/${encodeURIComponent(l.id)}`)}
                  left={<ExerciseThumb exercise={e} size={44} />}
                  title={e.name}
                  subtitle={`${lastLine}  ·  ${l.sessions} session${l.sessions === 1 ? '' : 's'}`}
                  right={<Spark values={l.trend} change={l.change} unit={l.last.unit} />}
                />
              );
            })}
          </View>
        </Section>
      )}

      <Section title="When to add weight" icon="help-circle-outline" color={C.muted}>
        <P muted style={{ fontSize: 14 }}>
          The app uses double progression. Each exercise has a rep range, for example 8 to 12. Keep the same weight until you
          reach the top of the range (12) on every set. Then move up one step: 8 kg dumbbells become 9 kg, or the machine
          goes up one pin level. Your reps will drop to around 8. Build them back up to 12, then go up again.
        </P>
        <P muted style={{ fontSize: 14 }}>
          If you fall below the bottom of the range two sessions in a row, the app suggests going about 10% lighter. Good form
          always comes before more weight.
        </P>
      </Section>
    </>
  );
}

function Spark({ values, change, unit }: { values: number[]; change: number | null; unit: string }) {
  const max = Math.max(1, ...values);
  return (
    <View style={{ alignItems: 'flex-end', gap: 4 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 22 }}>
        {values.map((v, i) => (
          <View key={i} style={{ width: 4, height: Math.max(2, (v / max) * 22), backgroundColor: A.protein, opacity: i === values.length - 1 ? 1 : 0.45, borderRadius: 1 }} />
        ))}
      </View>
      {change != null && change !== 0 && (
        <Text style={{ color: change > 0 ? A.up : A.down, fontFamily: F.bodySemi, fontSize: 11 }}>{change > 0 ? '+' : ''}{Math.round(change * 10) / 10}{unit === 'level' ? ' lvl' : ' kg'}</Text>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  seg: { flexDirection: 'row', gap: 6, marginTop: 14, backgroundColor: C.card, borderRadius: R.lg, padding: 4, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border },
  segBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, paddingVertical: 8, borderRadius: R.md, borderWidth: 1, borderColor: 'transparent' },
  segText: { color: C.muted, fontFamily: F.bodySemi, fontSize: 13 },
  small: { color: C.muted, fontFamily: F.body, fontSize: 12, lineHeight: 17 },
  track: { height: 8, borderRadius: 4, backgroundColor: C.card2, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
  rangeBtn: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: R.sm },
  rangeText: { color: C.muted, fontFamily: F.bodySemi, fontSize: 11 },
  hRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  hDate: { flex: 1, color: C.muted, fontFamily: F.body, fontSize: 13 },
  hKg: { color: C.text, fontFamily: F.displayMed, fontSize: 15 },
  hDiff: { width: 44, textAlign: 'right', fontFamily: F.bodySemi, fontSize: 12 },
  barLabel: { color: C.text, fontFamily: F.bodySemi, fontSize: 13 },
  legendV: { fontFamily: F.display, fontSize: 18, letterSpacing: -0.4 },
});

const pst = StyleSheet.create({
  thumbWrap: { width: 104, borderRadius: R.md, borderWidth: 1, borderColor: C.border, overflow: 'hidden', backgroundColor: C.card },
  thumb: { width: '100%', height: 134 },
  thumbDate: { color: C.muted, fontFamily: F.body, fontSize: 11, textAlign: 'center', paddingVertical: 5 },
  backdrop: { flex: 1, backgroundColor: '#000000cc', alignItems: 'center', justifyContent: 'center', padding: 20 },
  viewer: { width: '100%', maxWidth: 420, backgroundColor: C.card, borderWidth: 1, borderColor: C.borderStrong, borderRadius: R.lg, padding: 14 },
  full: { width: '100%', height: 420, borderRadius: R.md, backgroundColor: C.bg },
});
