import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useMemo, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { confirm } from '../lib/confirm';
import { fmtDuration, todayISO, visitSeconds } from '../lib/progress';
import { useStore } from '../lib/store';
import { A, C, F, R } from '../lib/theme';
import {
  ACTIVITY_CATEGORIES, ActivityLog, clockOf, fmt12, fmtMinutes, hhmmOf, isTime, minutesBetween, nowClock, rangeText, Segment, segmentsOf, sleepVerdict,
} from '../lib/tracker';
import { dayLabel } from './AppHeader';
import { TimeField } from './TimeField';
import { AccentTile, Button, Chip, hovered, Input, Label, P, Row, Section, smooth } from './ui';

export const CAT_COLORS: Record<string, string> = {
  Study: A.protein,
  Work: A.carbs,
  Project: A.fat,
  Admin: A.water,
  Rest: A.fibre,
  Other: '#8a8a8a',
};

// Categories you add yourself get a colour from this list, the same one every time.
const EXTRA_COLORS = [A.core, A.cardio, '#c9b458', '#7a9ed9', '#c58bd6', '#6fc7a8'];

export function catColor(name: string | null | undefined) {
  const n = name ?? 'Other';
  if (CAT_COLORS[n]) return CAT_COLORS[n];
  let h = 0;
  for (const ch of n) h = (h * 31 + ch.charCodeAt(0)) % 997;
  return EXTRA_COLORS[h % EXTRA_COLORS.length];
}

export function fmtClock(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const z = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${z(m)}:${z(sec % 60)}` : `${m}:${z(sec % 60)}`;
}

/**
 * The timer that is running right now, and its total time. Only start times are saved (in the database) and
 * the clock is worked out from them every second, so it keeps counting with the screen locked, the app closed
 * or the computer off, and it shows up on your other devices too. It stops only when you press Stop.
 * `seconds` includes time already logged on that task, so continuing a task keeps counting from there.
 */
export function useRunningTimer() {
  const { activities, refreshActivities } = useStore();
  const running = useMemo(
    () => activities.filter((a) => a.started_at && !a.ended_at).sort((a, b) => (a.started_at! < b.started_at! ? 1 : -1))[0] ?? null,
    [activities],
  );
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!running) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [running?.id]);

  // Coming back to the app: catch up the clock and pick up a timer started on another device.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') { setNow(Date.now()); refreshActivities().catch(() => {}); }
    });
    return () => sub.remove();
  }, [refreshActivities]);

  const base = running?.minutes ?? 0;
  const since = running?.started_at ? Math.max(0, Math.floor((now - new Date(running.started_at).getTime()) / 1000)) : 0;
  return { running, seconds: base * 60 + since, sinceStart: since };
}

/** The built in categories, the ones you added, and any used before. */
export function useTimeCategories() {
  const { profile, activities, saveProfile } = useStore();
  const custom = profile?.time_categories ?? [];
  const categories = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const c of [...ACTIVITY_CATEGORIES, ...custom, ...activities.map((a) => a.category ?? '')]) {
      if (!c || seen.has(c.toLowerCase())) continue;
      seen.add(c.toLowerCase());
      out.push(c);
    }
    return out;
  }, [custom.join('|'), activities]);

  /** Returns a message if the name can't be used, otherwise saves it. */
  async function addCategory(raw: string): Promise<string | null> {
    const name = raw.trim().replace(/\s+/g, ' ').slice(0, 24);
    if (!name) return 'Type a name for the category.';
    if (categories.some((c) => c.toLowerCase() === name.toLowerCase())) return 'That category already exists.';
    await saveProfile({ time_categories: [...custom, name] } as any);
    return null;
  }
  return { categories, addCategory };
}

/** Last night's sleep: bedtime, wake time, hours. */
export function SleepCard({ date }: { date: string }) {
  const { sleep, saveSleep } = useStore();
  const saved = sleep.find((s) => s.night_of === date);
  const [bed, setBed] = useState(saved?.bed_time ?? '');
  const [wake, setWake] = useState(saved?.wake_time ?? '');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setBed(saved?.bed_time ?? '');
    setWake(saved?.wake_time ?? '');
  }, [saved?.bed_time, saved?.wake_time]);

  const mins = isTime(bed) && isTime(wake) ? minutesBetween(bed, wake) : null;
  const savedMins = saved?.minutes ?? null;
  const verdict = savedMins ? sleepVerdict(savedMins) : null;

  async function save() {
    await saveSleep({ night_of: date, bed_time: bed || null, wake_time: wake || null, minutes: mins });
    setOpen(false);
  }

  return (
    <Section
      title={date === todayISO() ? 'Sleep last night' : 'Sleep the night before'}
      icon="moon" color="#8f9bff"
      right={
        <Pressable onPress={() => setOpen((o) => !o)} accessibilityRole="button" style={(p) => [st.linkBtn, smooth, hovered(p) && { backgroundColor: C.card2 }]}>
          <Text style={st.link}>{open ? 'Close' : savedMins ? 'Edit' : 'Add'}</Text>
        </Pressable>
      }
    >
      {savedMins != null && !open && (
        <Row style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <View>
            <Text style={[st.big, { color: A.fat }]}>{fmtMinutes(savedMins)}</Text>
            <Text style={st.meta}>{fmt12(saved?.bed_time)} to {fmt12(saved?.wake_time)}. {verdict?.hint}</Text>
          </View>
          <Text style={[st.badge, { color: A.fat, borderColor: A.fat }]}>{verdict?.label}</Text>
        </Row>
      )}
      {savedMins == null && !open && <P muted style={{ fontSize: 13 }}>Log when you went to bed and when you woke up. Sleep is where training turns into muscle.</P>}

      {open && (
        <View style={{ gap: 8 }}>
          <Row style={{ gap: 10 }}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Label>Went to bed</Label>
              <TimeField value={bed} onChange={setBed} placeholder="10:45" />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Label>Woke up</Label>
              <TimeField value={wake} onChange={setWake} placeholder="6:30" />
            </View>
          </Row>
          <Row wrap style={{ gap: 6 }}>
            <Chip label="Bed now" icon={() => <Ionicons name="bed-outline" size={15} color={C.muted} />} onPress={() => setBed(nowClock())} />
            <Chip label="Woke now" icon={() => <Ionicons name="sunny-outline" size={15} color={C.muted} />} onPress={() => setWake(nowClock())} />
          </Row>
          <Text style={st.meta}>{mins ? `That is ${fmtMinutes(mins)} of sleep.` : 'Type the time, then pick AM or PM, for example 11:15 PM.'}</Text>
          <Button small icon="checkmark" title="Save sleep" onPress={save} style={{ alignSelf: 'flex-start' }} />
        </View>
      )}
    </Section>
  );
}

export type Slice = { name: string; color: string; min: number; tasks: { title: string; min: number }[] };

/** Minutes per category for a day, with the tasks inside each one. Gym time is its own slice. */
export function useTimeSlices(date: string): Slice[] {
  const { activities, visits } = useStore();
  const { running, seconds } = useRunningTimer();
  const minute = Math.floor(seconds / 60);
  return useMemo(() => {
    const by = new Map<string, Slice>();
    const add = (name: string, color: string, title: string, min: number) => {
      if (min <= 0) return;
      const sl = by.get(name) ?? { name, color, min: 0, tasks: [] };
      sl.min += min;
      sl.tasks.push({ title, min });
      by.set(name, sl);
    };
    for (const a of activities) if (a.day === date && a.id !== running?.id) add(a.category ?? 'Other', catColor(a.category), a.title, a.minutes ?? 0);
    if (running && running.day === date) add(running.category ?? 'Other', catColor(running.category), running.title, minute);
    for (const v of visits) if (v.visit_date === date) add('Workout', A.up, v.session_title || 'Gym', Math.round(visitSeconds(v) / 60));
    const list = [...by.values()].sort((x, y) => y.min - x.min);
    for (const sl of list) sl.tasks.sort((x, y) => y.min - x.min);
    return list;
  }, [activities, visits, date, running?.id, minute]);
}

type How = 'timer' | 'range' | 'minutes';
const key = (s: string) => s.trim().toLowerCase();

/**
 * What you spent the day on. Pick a category, say what you are doing, then start a timer, add a from and to
 * time, or type minutes. The same task on the same day keeps adding to one entry, and any entry can be continued.
 */
export function TimeTrackerCard({ date }: { date: string }) {
  const { activities, addActivity, updateActivity, deleteActivity, visits, tasks } = useStore();
  const { running, seconds } = useRunningTimer();
  const { categories, addCategory } = useTimeCategories();
  const isToday = date === todayISO();

  const [cat, setCat] = useState('Study');
  const [adding, setAdding] = useState(false);
  const [newCat, setNewCat] = useState('');
  const [title, setTitle] = useState('');
  const [how, setHow] = useState<How>(isToday ? 'timer' : 'range');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [mins, setMins] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // A timer only makes sense for today. Other days are filled in with times or minutes.
  useEffect(() => { if (!isToday && how === 'timer') setHow('range'); }, [isToday]);

  // Names used before in this category, newest first, for the suggestions under the box.
  const names = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (let i = activities.length - 1; i >= 0; i--) {
      const a = activities[i];
      if ((a.category ?? 'Other') !== cat || !a.title) continue;
      const k = key(a.title);
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(a.title);
    }
    return out;
  }, [activities, cat]);

  const q = key(title);
  // Tasks planned for this day come first (not done, then done), then names used before in this category.
  const planned = useMemo(() => {
    const day = tasks.filter((t) => t.day === date && key(t.title) !== q && (!q || key(t.title).includes(q)));
    return [...day.filter((t) => !t.done), ...day.filter((t) => t.done)].slice(0, 4);
  }, [tasks, date, q]);
  const suggestions = useMemo(() => {
    const taken = new Set(planned.map((t) => key(t.title)));
    const rest = names.filter((n) => !taken.has(key(n)));
    if (!q) return rest.slice(0, Math.max(1, 5 - planned.length));
    const hits = rest.filter((n) => key(n).includes(q) && key(n) !== q);
    return [...hits.filter((n) => key(n).startsWith(q)), ...hits.filter((n) => !key(n).startsWith(q))].slice(0, Math.max(1, 5 - planned.length));
  }, [names, q, planned]);

  // The same task, same category, same day: new time is added to it instead of starting another entry.
  const findSame = () => (q ? activities.find((a) => a.day === date && (a.category ?? 'Other') === cat && key(a.title) === q) : undefined);
  const same = findSame();

  const dayEntries = activities.filter((a) => a.day === date && a.id !== running?.id);
  const gym = visits.filter((v) => v.visit_date === date).sort((a, b) => (a.started_at < b.started_at ? -1 : 1));
  const gymMins = Math.round(gym.reduce((sum, v) => sum + visitSeconds(v), 0) / 60);
  const total = dayEntries.reduce((sum, a) => sum + (a.minutes ?? 0), 0) + (running && running.day === date ? Math.floor(seconds / 60) : 0) + gymMins;

  const slices = useTimeSlices(date);

  async function run(work: () => Promise<void>) {
    setError(null);
    setBusy(true);
    try { await work(); } catch (e: any) { setError(e?.message ?? 'Could not save. Check your connection and try again.'); } finally { setBusy(false); }
  }

  /** Add finished time to the matching task, or make a new one. */
  async function addTime(minutes: number, seg?: Segment) {
    const match = findSame();
    if (match) {
      await updateActivity(match.id, { minutes: (match.minutes ?? 0) + minutes, segments: seg ? [...segmentsOf(match), seg] : segmentsOf(match) });
    } else {
      await addActivity({
        day: date, title: title.trim(), description: null, category: cat,
        started_at: seg?.s ?? null, ended_at: seg?.e ?? null, minutes, segments: seg ? [seg] : [],
      });
    }
    setTitle(''); setFrom(''); setTo(''); setMins('');
  }

  const startTimer = () => run(async () => {
    if (!title.trim()) throw new Error('Type what you are doing first.');
    const now = new Date().toISOString();
    const match = findSame();
    if (match) await updateActivity(match.id, { started_at: now, ended_at: null, segments: segmentsOf(match) });
    else await addActivity({ day: date, title: title.trim(), description: null, category: cat, started_at: now, ended_at: null, minutes: null, segments: [] });
    setTitle('');
  });

  const addRange = () => run(async () => {
    if (!title.trim()) throw new Error('Type what you did first.');
    if (!isTime(from) || !isTime(to)) throw new Error('Enter both times, with AM or PM, for example 2:30 PM.');
    const m = minutesBetween(from, to);
    if (!m) throw new Error('The end time must be after the start time.');
    const s = new Date(`${date}T${from.trim().padStart(5, '0')}:00`);
    await addTime(m, { s: s.toISOString(), e: new Date(s.getTime() + m * 60000).toISOString() });
  });

  const addMinutes = () => run(async () => {
    if (!title.trim()) throw new Error('Type what you did first.');
    const m = Math.round(Number(mins.replace(',', '.')));
    if (!Number.isFinite(m) || m <= 0) throw new Error('Enter the number of minutes.');
    await addTime(m);
  });

  const stop = () => run(async () => {
    if (!running?.started_at) return;
    const end = new Date();
    const elapsed = Math.round((end.getTime() - new Date(running.started_at).getTime()) / 60000);
    await updateActivity(running.id, {
      ended_at: end.toISOString(),
      minutes: Math.max(1, (running.minutes ?? 0) + elapsed),
      segments: [...(running.segments ?? []), { s: running.started_at, e: end.toISOString() }],
    });
  });

  const continueTask = (a: ActivityLog) => run(async () => {
    await updateActivity(a.id, { started_at: new Date().toISOString(), ended_at: null, segments: segmentsOf(a) });
  });

  async function removeEntry(a: ActivityLog) {
    if (await confirm('Delete this entry?', `${a.title} (${fmtMinutes(a.minutes)}) will be removed.`, { confirmText: 'Delete', danger: true })) await deleteActivity(a.id);
  }

  async function saveCategory() {
    setError(null);
    try {
      const problem = await addCategory(newCat);
      if (problem) return setError(problem);
      setCat(newCat.trim().replace(/\s+/g, ' ').slice(0, 24));
      setNewCat('');
      setAdding(false);
    } catch (e: any) {
      setError(e?.message ?? 'Could not save the category.');
    }
  }

  const rangeMins = isTime(from) && isTime(to) ? minutesBetween(from, to) : null;
  const HOW_ICON: Record<How, React.ComponentProps<typeof Ionicons>['name']> = { timer: 'timer-outline', range: 'time-outline', minutes: 'hourglass-outline' };
  const HOWS: [How, string][] = isToday ? [['timer', 'Timer'], ['range', 'From and to'], ['minutes', 'Minutes']] : [['range', 'From and to'], ['minutes', 'Minutes']];

  return (
    <>
      {running && (
        <View style={[st.running, { borderColor: catColor(running.category) }]}>
          <Text style={[st.runLabel, { color: catColor(running.category) }]}>RUNNING · {(running.category ?? 'Other').toUpperCase()}</Text>
          <Text style={st.clock}>{fmtClock(seconds)}</Text>
          <Text style={st.runTitle}>{running.title}</Text>
          {(running.minutes ?? 0) > 0 && <Text style={st.meta}>Continuing from {fmtMinutes(running.minutes)} already logged.</Text>}
          <Text style={st.meta}>It keeps running with your screen locked or the app closed, until you press Stop.</Text>
          <Button icon="stop" title="Stop" onPress={stop} loading={busy} style={{ marginTop: 6 }} />
        </View>
      )}

      <View style={st.form}>
        <Label>Category</Label>
        <Row wrap style={{ gap: 8 }}>
          {categories.map((c) => <AccentTile key={c} label={c} color={catColor(c)} active={cat === c} onPress={() => setCat(c)} />)}
          <AccentTile label="New" color={C.borderStrong} dashed icon={<Ionicons name="add" size={16} color={C.text} />} onPress={() => setAdding(true)} />
        </Row>
        {adding && (
          <Row style={{ gap: 8 }}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Input value={newCat} onChangeText={setNewCat} placeholder="New category, e.g. Reading" autoFocus onSubmitEditing={saveCategory} />
            </View>
            <Button small icon="add" title="Add" onPress={saveCategory} />
            <Button small kind="secondary" title="Cancel" onPress={() => { setAdding(false); setNewCat(''); }} />
          </Row>
        )}

        <Label>What are you doing?</Label>
        <Input value={title} onChangeText={setTitle} placeholder="e.g. WorkoutApp, chapter 3, gym admin" autoCapitalize="sentences" />
        {(suggestions.length > 0 || planned.length > 0) && (
          <View>
            <Text style={st.panelLabel}>{q ? 'Suggestions' : planned.length ? 'Planned and recent' : `Recent in ${cat}`}</Text>
            {planned.map((t) => (
              <Pressable key={t.id} onPress={() => { setTitle(t.title); if (t.category && categories.includes(t.category)) setCat(t.category); }} style={(p) => [st.suggest, smooth, (p.pressed || hovered(p)) && { backgroundColor: C.card2 }]} accessibilityRole="button" accessibilityLabel={`Planned task ${t.title}`}>
                <Ionicons name={t.done ? 'checkbox' : 'square-outline'} size={16} color={t.done ? C.faint : catColor(t.category)} />
                <Text style={[st.suggestText, t.done && { color: C.faint, textDecorationLine: 'line-through' }]} numberOfLines={1}>{t.title}</Text>
                <Text style={st.plannedTag}>Planned</Text>
              </Pressable>
            ))}
            {suggestions.map((n) => (
              <Pressable key={n} onPress={() => setTitle(n)} style={(p) => [st.suggest, smooth, (p.pressed || hovered(p)) && { backgroundColor: C.card2 }]} accessibilityRole="button">
                <Text style={st.suggestText} numberOfLines={1}>{n}</Text>
                <Ionicons name="arrow-up-outline" size={14} color={C.faint} style={{ transform: [{ rotate: '-45deg' }] }} />
              </Pressable>
            ))}
          </View>
        )}
        {!!same && <Text style={st.meta}>You already have {same.title} today ({fmtMinutes(same.minutes)}). New time is added to it.</Text>}

        <View style={st.seg} accessibilityRole="tablist">
          {HOWS.map(([k, label], i) => (
            <Pressable key={k} onPress={() => setHow(k)} accessibilityRole="tab" accessibilityState={{ selected: how === k }} style={(p) => [st.segItem, smooth, i > 0 && st.segDivider, hovered(p) && how !== k && { backgroundColor: C.card2 }, how === k && st.segOn]}>
              <Ionicons name={HOW_ICON[k]} size={16} color={how === k ? C.inverseText : C.muted} />
              <Text style={[st.segText, how === k && { color: C.inverseText }]}>{label}</Text>
            </Pressable>
          ))}
        </View>

        {how === 'timer' && (
          running
            ? <Text style={st.meta}>A timer is already running. Stop it to start another.</Text>
            : <Button icon="play" title="Start timer" onPress={startTimer} loading={busy} />
        )}

        {how === 'range' && (
          <View style={{ gap: 8 }}>
            <Row style={{ gap: 10 }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Label>From</Label>
                <TimeField value={from} onChange={setFrom} placeholder="2:00" />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Label>To</Label>
                <TimeField value={to} onChange={setTo} placeholder="3:00" />
              </View>
            </Row>
            <Row wrap style={{ gap: 6 }}>
              <Chip label="From now" icon={() => <Ionicons name="time-outline" size={15} color={C.muted} />} onPress={() => setFrom(nowClock())} />
              <Chip label="To now" icon={() => <Ionicons name="time-outline" size={15} color={C.muted} />} onPress={() => setTo(nowClock())} />
            </Row>
            <Text style={st.meta}>{rangeMins ? `That is ${fmtMinutes(rangeMins)}.` : 'Type the time, then pick AM or PM, for example 2:30 PM.'}</Text>
            <Button icon="add" title="Add time" onPress={addRange} loading={busy} />
          </View>
        )}

        {how === 'minutes' && (
          <View style={{ gap: 8 }}>
            <Label>Minutes</Label>
            <Input value={mins} onChangeText={(t) => setMins(t.replace(/[^0-9]/g, ''))} keyboardType="number-pad" placeholder="60" />
            <Button icon="add" title="Add time" onPress={addMinutes} loading={busy} />
          </View>
        )}

        {!!error && <Text style={{ color: C.danger, fontFamily: F.body, fontSize: 13 }}>{error}</Text>}
      </View>

      <TimeChart slices={slices} />

      <Section title={dayLabel(date)} icon="list" color={A.core} right={<Text style={st.meta}>{total > 0 ? `${fmtMinutes(total)} tracked` : 'nothing yet'}</Text>}>
        <View>
          {dayEntries.map((a) => (
            editing === a.id ? (
              <EditEntry
                key={a.id}
                a={a}
                categories={categories}
                onCancel={() => setEditing(null)}
                onSave={async (ch) => { await updateActivity(a.id, ch); setEditing(null); }}
              />
            ) : (
              <ActivityRow
                key={a.id}
                a={a}
                onContinue={isToday && !running ? () => continueTask(a) : undefined}
                onEdit={() => setEditing(a.id)}
                onDelete={() => removeEntry(a)}
              />
            )
          ))}
          {gym.map((v) => (
            <View key={v.id} style={[st.row, { borderTopColor: A.up }]}>
              <View style={{ flex: 1 }}>
                <Text style={st.rowTitle} numberOfLines={1}>{v.session_title || 'Workout'}</Text>
                <Text style={st.meta}>Gym · {clockOf(v.started_at)} to {v.ended_at ? clockOf(v.ended_at) : 'now'}</Text>
              </View>
              <Text style={[st.rowTime, { color: A.up }]}>{fmtDuration(visitSeconds(v))}</Text>
            </View>
          ))}
          {dayEntries.length === 0 && gym.length === 0 && <P muted style={{ fontSize: 13 }}>Nothing tracked for this day yet.</P>}
        </View>
      </Section>
    </>
  );
}

/**
 * A donut of your 24 hours. The whole ring is the day, each coloured slice is time you tracked, and what is left
 * of the ring is untracked time. Under it, each category with the tasks done in it.
 */
export function TimeChart({ slices }: { slices: Slice[] }) {
  const total = slices.reduce((a, x) => a + x.min, 0);
  if (total <= 0) return null;
  const DAY = 24 * 60;
  const size = 148;
  const stroke = 24;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const scale = Math.max(1, total / DAY); // more than 24 hours only if entries overlap
  const gap = slices.length > 1 ? 2 : 0;
  const left = Math.max(0, DAY - total);
  let acc = 0;
  return (
    <View style={st.chart}>
      <Text style={st.chartTitle}>Your 24 hours</Text>
      <View style={st.chartBody}>
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
          <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
            <Circle cx={size / 2} cy={size / 2} r={r} stroke="#262626" strokeWidth={stroke} fill="none" />
            {slices.map((x) => {
              const len = (x.min / (DAY * scale)) * circ;
              const seg = (
                <Circle
                  key={x.name}
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  stroke={x.color}
                  strokeWidth={stroke}
                  fill="none"
                  strokeDasharray={`${Math.max(len - gap, 1)} ${circ}`}
                  strokeDashoffset={-acc}
                  transform={`rotate(-90 ${size / 2} ${size / 2})`}
                />
              );
              acc += len;
              return seg;
            })}
          </Svg>
          <Text style={st.chartBig}>{fmtMinutes(total)}</Text>
          <Text style={st.meta}>of 24h</Text>
        </View>

        <View style={{ flex: 1, minWidth: 150, gap: 12 }}>
          {slices.map((x) => (
            <View key={x.name} style={{ gap: 2 }}>
              <View style={st.legendRow}>
                <View style={[st.legendDot, { backgroundColor: x.color }]} />
                <Text style={st.legendName} numberOfLines={1}>{x.name}</Text>
                <Text style={st.legendTime}>{fmtMinutes(x.min)} · {Math.round((x.min / DAY) * 100)}%</Text>
              </View>
              <Text style={st.meta} numberOfLines={2}>
                {x.tasks.slice(0, 3).map((t) => `${t.title} ${fmtMinutes(t.min)}`).join(', ')}{x.tasks.length > 3 ? ` and ${x.tasks.length - 3} more` : ''}
              </Text>
            </View>
          ))}
          <View style={st.legendRow}>
            <View style={[st.legendDot, { backgroundColor: '#262626' }]} />
            <Text style={[st.legendName, { color: C.muted, fontFamily: F.body }]}>Untracked</Text>
            <Text style={[st.legendTime, { color: C.muted }]}>{fmtMinutes(left)}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

/**
 * Edit one finished entry in place: its name, its category, and each block of time (from and to). Minutes that
 * were added without times (the Minutes option) stay as a separate number. Saving rebuilds the total from the blocks.
 */
function EditEntry({ a, categories, onCancel, onSave }: { a: ActivityLog; categories: string[]; onCancel: () => void; onSave: (ch: Partial<ActivityLog>) => Promise<void> }) {
  const col = catColor(a.category);
  const segs = segmentsOf(a);
  const segTotal = segs.reduce((sum, x) => sum + Math.max(0, Math.round((new Date(x.e).getTime() - new Date(x.s).getTime()) / 60000)), 0);
  const [title, setTitle] = useState(a.title);
  const [cat, setCat] = useState(a.category ?? 'Other');
  const [blocks, setBlocks] = useState(segs.map((x) => ({ from: hhmmOf(x.s), to: hhmmOf(x.e) })));
  const [extra, setExtra] = useState(String(Math.max(0, (a.minutes ?? 0) - segTotal)));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const setBlock = (i: number, k: 'from' | 'to') => (v: string) => setBlocks((b) => b.map((x, j) => (j === i ? { ...x, [k]: v } : x)));

  async function save() {
    setError(null);
    if (!title.trim()) return setError('Type what you did.');
    const out: Segment[] = [];
    let total = Math.round(Number(extra.replace(',', '.'))) || 0;
    for (const b of blocks) {
      if (!isTime(b.from) || !isTime(b.to)) return setError('Every block needs a start and an end time, with AM or PM.');
      const m = minutesBetween(b.from, b.to);
      if (!m) return setError('Each end time must be after its start time, and under 16 hours.');
      const s = new Date(`${a.day}T${b.from.trim().padStart(5, '0')}:00`);
      out.push({ s: s.toISOString(), e: new Date(s.getTime() + m * 60000).toISOString() });
      total += m;
    }
    if (total <= 0) return setError('Add some time, or delete the entry.');
    setBusy(true);
    try {
      await onSave({ title: title.trim(), category: cat, minutes: total, segments: out, started_at: out[0]?.s ?? null, ended_at: out.length ? out[out.length - 1].e : null });
    } catch (e: any) {
      setError(e?.message ?? 'Could not save. Check your connection and try again.');
      setBusy(false);
    }
  }

  return (
    <View style={[st.row, st.editBox, { borderTopColor: col }]}>
      <Label>Name</Label>
      <Input value={title} onChangeText={setTitle} />
      <Label>Category</Label>
      <Row wrap style={{ gap: 6 }}>
        {categories.map((c) => <Chip key={c} label={c} dot={catColor(c)} active={cat === c} onPress={() => setCat(c)} />)}
      </Row>
      {blocks.map((b, i) => (
        <View key={i} style={{ gap: 4 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Label>{blocks.length > 1 ? `Block ${i + 1}` : 'Time'}</Label>
            <Pressable onPress={() => setBlocks((x) => x.filter((_, j) => j !== i))} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Remove block ${i + 1}`} style={(p) => [{ padding: 4, borderRadius: 999, marginTop: 14 }, smooth, hovered(p) && { backgroundColor: A.over + '22' }]}>
              {(p: any) => <Ionicons name="trash-outline" size={15} color={hovered(p) ? A.over : C.faint} />}
            </Pressable>
          </Row>
          <Row style={{ gap: 10, alignItems: 'flex-start' }}>
            <View style={{ flex: 1, minWidth: 0 }}><Text style={st.meta}>From</Text><TimeField value={b.from} onChange={setBlock(i, 'from')} /></View>
            <View style={{ flex: 1, minWidth: 0 }}><Text style={st.meta}>To</Text><TimeField value={b.to} onChange={setBlock(i, 'to')} /></View>
          </Row>
        </View>
      ))}
      <Label>{blocks.length ? 'Extra minutes without times' : 'Minutes'}</Label>
      <Input value={extra} onChangeText={(t) => setExtra(t.replace(/[^0-9]/g, ''))} keyboardType="number-pad" />
      {!!error && <Text style={{ color: C.danger, fontFamily: F.body, fontSize: 13 }}>{error}</Text>}
      <Row style={{ gap: 8, marginTop: 8 }}>
        <Button small icon="checkmark" title="Save" onPress={save} loading={busy} />
        <Button small kind="secondary" title="Cancel" onPress={onCancel} />
      </Row>
    </View>
  );
}

function ActivityRow({ a, onContinue, onEdit, onDelete }: { a: ActivityLog; onContinue?: () => void; onEdit: () => void; onDelete: () => void }) {
  const col = catColor(a.category);
  const ranges = rangeText(segmentsOf(a));
  return (
    <View style={[st.row, { borderTopColor: col, flexWrap: 'wrap' }]}>
      <View style={{ flexGrow: 1, flexBasis: 150, minWidth: 0 }}>
        <Text style={st.rowTitle} numberOfLines={1}>{a.title}</Text>
        <Text style={st.meta} numberOfLines={2}>{a.category ?? 'Other'}{ranges ? ` · ${ranges}` : ''}</Text>
      </View>
      <Text style={[st.rowTime, { color: col }]}>{fmtMinutes(a.minutes)}</Text>
      {onContinue && (
        <Pressable onPress={onContinue} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Continue ${a.title}`} style={(p) => [{ padding: 3, borderRadius: 999 }, smooth, hovered(p) && { backgroundColor: col + '22' }]}>
          <Ionicons name="play-circle-outline" size={24} color={col} />
        </Pressable>
      )}
      <Pressable onPress={onEdit} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Edit ${a.title}`} style={(p) => [{ padding: 5, borderRadius: 999 }, smooth, hovered(p) && { backgroundColor: col + '22' }]}>
        {(p: any) => <Ionicons name="create-outline" size={17} color={hovered(p) ? col : C.faint} />}
      </Pressable>
      <Pressable onPress={onDelete} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Delete ${a.title}`} style={(p) => [{ padding: 5, borderRadius: 999 }, smooth, hovered(p) && { backgroundColor: A.over + '22' }]}>
        {(p: any) => <Ionicons name="trash-outline" size={16} color={hovered(p) ? A.over : C.faint} />}
      </Pressable>
    </View>
  );
}

const st = StyleSheet.create({
  link: { color: C.text, fontFamily: F.bodySemi, fontSize: 12, textDecorationLine: 'underline' },
  linkBtn: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: R.sm },
  meta: { color: C.muted, fontFamily: F.body, fontSize: 12, lineHeight: 18 },
  big: { color: C.text, fontFamily: F.display, fontSize: 22, letterSpacing: -0.6 },
  badge: { fontFamily: F.bodySemi, fontSize: 11, borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  running: { borderWidth: 1, borderRadius: R.lg, padding: 18, gap: 6, backgroundColor: C.card },
  clock: { color: C.inverse, fontFamily: F.display, fontSize: 24, letterSpacing: -0.7, lineHeight: 30 },
  runLabel: { color: C.muted, fontFamily: F.bodySemi, fontSize: 10, letterSpacing: 1.2 },
  runTitle: { color: C.text, fontFamily: F.bodySemi, fontSize: 15 },
  form: { backgroundColor: C.card, borderWidth: 1, borderColor: C.borderStrong, borderRadius: R.lg, padding: 16, gap: 10 },
  panelLabel: { color: C.muted, fontFamily: F.bodySemi, fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 2 },
  suggest: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, minHeight: 44, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  plannedTag: { color: C.muted, fontFamily: F.bodySemi, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' },
  suggestText: { flex: 1, color: C.text, fontFamily: F.bodyMed, fontSize: 15 },
  seg: { flexDirection: 'row', borderWidth: 1, borderColor: C.borderStrong, borderRadius: R.md, overflow: 'hidden', marginTop: 4 },
  segItem: { flex: 1, minHeight: 52, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, gap: 3 },
  segDivider: { borderLeftWidth: 1, borderLeftColor: C.borderStrong },
  segOn: { backgroundColor: C.inverse },
  segText: { color: C.text, fontFamily: F.bodySemi, fontSize: 12 },
  chart: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: R.lg, padding: 16, gap: 14 },
  chartTitle: { color: C.muted, fontFamily: F.bodySemi, fontSize: 11, letterSpacing: 1.6, textTransform: 'uppercase' },
  chartBody: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 20 },
  chartBig: { color: C.inverse, fontFamily: F.display, fontSize: 20, letterSpacing: -0.6 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 10, height: 10, borderRadius: 3 },
  legendName: { flex: 1, color: C.text, fontFamily: F.bodySemi, fontSize: 14 },
  legendTime: { color: C.text, fontFamily: F.bodyMed, fontSize: 13 },
  editBox: { flexDirection: 'column', alignItems: 'stretch', gap: 2, paddingBottom: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, marginBottom: 10, backgroundColor: C.card, borderRadius: R.lg, borderWidth: 1, borderColor: C.border, borderTopWidth: 2 },
  rowTitle: { color: C.text, fontFamily: F.bodySemi, fontSize: 14 },
  rowTime: { fontFamily: F.displayMed, fontSize: 14 },
});
