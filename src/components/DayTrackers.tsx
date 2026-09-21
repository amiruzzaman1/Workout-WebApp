import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ACTIVITY_CATEGORIES, ActivityLog, fmtMinutes, isTime, minutesBetween, nowClock, sleepVerdict } from '../lib/tracker';
import { useStore } from '../lib/store';
import { A, C, F, R } from '../lib/theme';
import { Button, Chip, Input, Label, P, Row, Section } from './ui';

export const CAT_COLORS: Record<string, string> = {
  Study: A.protein,
  Work: A.carbs,
  Project: A.fat,
  Admin: A.water,
  Rest: A.fibre,
  Other: '#8a8a8a',
};

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
      title="Sleep last night"
      right={
        <Pressable onPress={() => setOpen((o) => !o)}>
          <Text style={st.link}>{open ? 'Close' : savedMins ? 'Edit' : 'Add'}</Text>
        </Pressable>
      }
    >
      {savedMins != null && !open && (
        <Row style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <View>
            <Text style={[st.big, { color: A.fat }]}>{fmtMinutes(savedMins)}</Text>
            <Text style={st.meta}>{saved?.bed_time} to {saved?.wake_time}. {verdict?.hint}</Text>
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
              <Input value={bed} onChangeText={(t) => setBed(t.replace(/[^0-9:]/g, '').slice(0, 5))} placeholder="22:45" keyboardType="numbers-and-punctuation" />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Label>Woke up</Label>
              <Input value={wake} onChangeText={(t) => setWake(t.replace(/[^0-9:]/g, '').slice(0, 5))} placeholder="06:30" keyboardType="numbers-and-punctuation" />
            </View>
          </Row>
          <Row wrap style={{ gap: 6 }}>
            <Chip label="Bed now" onPress={() => setBed(nowClock())} />
            <Chip label="Woke now" onPress={() => setWake(nowClock())} />
          </Row>
          <Text style={st.meta}>{mins ? `That is ${fmtMinutes(mins)} of sleep.` : 'Use 24 hour time, for example 23:15.'}</Text>
          <Button small title="Save sleep" onPress={save} style={{ alignSelf: 'flex-start' }} />
        </View>
      )}
    </Section>
  );
}

/** What you spent the day on: a running timer, or a finished block you type in. */
export function TimeTrackerCard({ date }: { date: string }) {
  const { activities, addActivity, updateActivity, deleteActivity } = useStore();
  const today = activities.filter((a) => a.day === date);
  const running = today.find((a) => a.started_at && !a.ended_at);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [cat, setCat] = useState('Study');
  const [mins, setMins] = useState('');
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setTick((n) => n + 1), 30000);
    return () => clearInterval(id);
  }, [running]);

  const runningMins = running?.started_at ? Math.max(0, Math.round((Date.now() - new Date(running.started_at).getTime()) / 60000)) : 0;
  const total = today.reduce((a, x) => a + (x.minutes ?? 0), 0) + (running ? runningMins : 0);

  async function start() {
    if (!title.trim()) return;
    await addActivity({ day: date, title: title.trim(), description: desc.trim() || null, category: cat, started_at: new Date().toISOString(), ended_at: null, minutes: null });
    setTitle(''); setDesc(''); setOpen(false);
  }
  async function addFinished() {
    const m = Number(mins.replace(',', '.'));
    if (!title.trim() || !Number.isFinite(m) || m <= 0) return;
    await addActivity({ day: date, title: title.trim(), description: desc.trim() || null, category: cat, started_at: null, ended_at: null, minutes: Math.round(m) });
    setTitle(''); setDesc(''); setMins(''); setOpen(false);
  }
  async function stop() {
    if (!running) return;
    await updateActivity(running.id, { ended_at: new Date().toISOString(), minutes: Math.max(1, runningMins) });
  }

  return (
    <Section
      title="Time tracker"
      right={<Text style={st.meta}>{total > 0 ? `${fmtMinutes(total)} tracked` : 'nothing yet'}</Text>}
    >
      {running && (
        <Pressable onPress={stop} style={[st.running, { borderColor: CAT_COLORS[running.category ?? 'Other'] }]}>
          <View style={{ flex: 1 }}>
            <Text style={st.runLabel}>RUNNING · {(running.category ?? 'Other').toUpperCase()}</Text>
            <Text style={st.runTitle}>{running.title}</Text>
          </View>
          <Text style={[st.big, { fontSize: 24, color: CAT_COLORS[running.category ?? 'Other'] }]}>{fmtMinutes(runningMins)}</Text>
          <Text style={[st.link, { marginLeft: 10 }]}>Stop</Text>
        </Pressable>
      )}

      <View>
        {today.filter((a) => a !== running).map((a) => (
          <ActivityRow key={a.id} a={a} onDelete={() => deleteActivity(a.id)} />
        ))}
      </View>

      {!open ? (
        <Button small kind="secondary" title="+ Track something" onPress={() => setOpen(true)} style={{ alignSelf: 'flex-start' }} />
      ) : (
        <View style={{ gap: 8 }}>
          <Label>What are you doing?</Label>
          <Input value={title} onChangeText={setTitle} placeholder="e.g. Dissertation, chapter 3" />
          <Label>Notes (optional)</Label>
          <Input value={desc} onChangeText={setDesc} placeholder="What exactly you worked on" multiline />
          <Row wrap>
            {ACTIVITY_CATEGORIES.map((c) => (
              <Chip key={c} label={c} active={cat === c} dot={CAT_COLORS[c]} onPress={() => setCat(c)} />
            ))}
          </Row>
          <Row style={{ gap: 10, alignItems: 'flex-end' }}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Label>Or log minutes you already did</Label>
              <Input value={mins} onChangeText={(t) => setMins(t.replace(/[^0-9]/g, ''))} keyboardType="number-pad" placeholder="90" />
            </View>
            <Button small kind="secondary" title="Add" onPress={addFinished} />
          </Row>
          <Row>
            <Button small title="Start timer" onPress={start} />
            <Button small kind="secondary" title="Cancel" onPress={() => setOpen(false)} />
          </Row>
        </View>
      )}
    </Section>
  );
}

function ActivityRow({ a, onDelete }: { a: ActivityLog; onDelete: () => void }) {
  const col = CAT_COLORS[a.category ?? 'Other'];
  return (
    <View style={st.row}>
      <View style={[st.bar, { backgroundColor: col }]} />
      <View style={{ flex: 1 }}>
        <Text style={st.rowTitle} numberOfLines={1}>{a.title}</Text>
        {!!a.description && <Text style={st.meta} numberOfLines={2}>{a.description}</Text>}
      </View>
      <Text style={[st.rowTime, { color: col }]}>{fmtMinutes(a.minutes)}</Text>
      <Pressable onPress={onDelete} hitSlop={8} style={{ paddingHorizontal: 6 }}>
        <Text style={{ color: C.faint, fontSize: 15 }}>✕</Text>
      </Pressable>
    </View>
  );
}

const st = StyleSheet.create({
  link: { color: C.text, fontFamily: F.bodySemi, fontSize: 12, textDecorationLine: 'underline' },
  meta: { color: C.muted, fontFamily: F.body, fontSize: 12, lineHeight: 18 },
  big: { color: C.text, fontFamily: F.display, fontSize: 30, letterSpacing: -1 },
  badge: { fontFamily: F.bodySemi, fontSize: 11, borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  running: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: R.md, padding: 12, gap: 8 },
  runLabel: { color: C.muted, fontFamily: F.bodySemi, fontSize: 10, letterSpacing: 1.2 },
  runTitle: { color: C.text, fontFamily: F.bodySemi, fontSize: 15 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  bar: { width: 3, alignSelf: 'stretch', borderRadius: 2 },
  rowTitle: { color: C.text, fontFamily: F.bodySemi, fontSize: 14 },
  rowTime: { fontFamily: F.displayMed, fontSize: 14 },
});
