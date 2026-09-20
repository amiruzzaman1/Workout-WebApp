import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Eyebrow, H1, P, Row, Screen, Section } from '../../src/components/ui';
import { confirm } from '../../src/lib/confirm';
import { getExercise } from '../../src/lib/exercises';
import { DAY_NAMES, DAY_SHORT, PlanSession, SPLIT_LABELS, uid, WEEK_ORDER } from '../../src/lib/planner';
import { fmtDuration, secondsByDate, todayISO } from '../../src/lib/progress';
import { useStore } from '../../src/lib/store';
import { A, C, F } from '../../src/lib/theme';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function isoOf(d: Date) {
  const z = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}

export default function TodayScreen() {
  const { plan, profile, regeneratePlan, savePlan, logs, visits, activeVisit, startVisit } = useStore();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const now = new Date();
  const today = now.getDay();

  // Date of each weekday in the current (Mon-start) week, and which ones have logs.
  const weekDates = useMemo(() => {
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    const map: Record<number, string> = {};
    WEEK_ORDER.forEach((dow, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      map[dow] = isoOf(d);
    });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [today]);
  const loggedDates = useMemo(() => new Set(logs.map((l) => l.performed_on)), [logs]);
  const todaySets = logs.filter((l) => l.performed_on === todayISO()).length;
  const todaySecs = secondsByDate(visits).get(todayISO()) ?? 0;

  async function rebuild() {
    if (!(await confirm('Rebuild plan?', 'This creates a fresh plan from your profile and replaces any edits you made.'))) return;
    setBusy(true);
    try { await regeneratePlan(); } finally { setBusy(false); }
  }

  async function addSession(day: number) {
    if (!plan) return;
    const existing = plan.data.days.find((d) => d.day === day);
    const newIdx = existing ? existing.sessions.length : 0;
    const session: PlanSession = { id: uid(), title: 'My workout', type: 'strength', focus: [], items: [] };
    const days = existing
      ? plan.data.days.map((d) => (d.day === day ? { ...d, sessions: [...d.sessions, session] } : d))
      : [...plan.data.days, { day, sessions: [session] }];
    await savePlan({ ...plan.data, days });
    router.push(`/session/${day}/${newIdx}`);
  }

  const dateLine = `${DAY_NAMES[today]} · ${now.getDate()} ${MONTHS[now.getMonth()]}`;

  if (!plan) {
    return (
      <Screen top>
        <Eyebrow>{dateLine}</Eyebrow>
        <H1>No plan yet</H1>
        <Button title="Build my plan" onPress={() => regeneratePlan()} />
      </Screen>
    );
  }

  const days = WEEK_ORDER.map((d) => plan.data.days.find((x) => x.day === d) ?? { day: d, sessions: [] });
  const todays = days.find((d) => d.day === today)!;

  return (
    <Screen top>
      <Eyebrow>{dateLine}</Eyebrow>

      {todays.sessions.length === 0 ? (
        <>
          <H1>Rest day</H1>
          <P muted>Recovery is when muscle is built. Walk, stretch, sleep well.</P>
          <Row style={{ marginTop: 8 }}>
            <Button kind="secondary" small title="Train anyway" onPress={() => addSession(today)} />
          </Row>
        </>
      ) : (
        todays.sessions.map((s, i) => (
          <View key={s.id} style={{ gap: 10, marginBottom: todays.sessions.length > 1 ? 16 : 0 }}>
            {todays.sessions.length > 1 && <Eyebrow>{i === 0 ? 'Session 1 · morning' : 'Session 2 · later'}</Eyebrow>}
            <H1>{s.title}</H1>
            <P muted>
              {s.items.length} exercises · {s.items.reduce((a, it) => a + (it.sets || 0), 0)} sets
              {todaySets > 0 && i === 0 ? ` · ${todaySets} sets logged` : ''}
              {todaySecs > 0 && i === 0 ? ` · ${fmtDuration(todaySecs)} in the gym` : ''}
            </P>
            <Text style={st.preview} numberOfLines={2}>
              {s.items.map((it) => getExercise(it.exerciseId)?.name ?? it.exerciseId).join('  /  ')}
            </Text>
            <Row style={{ marginTop: 6 }}>
              <Button
                title={activeVisit || todaySets > 0 ? 'Continue workout' : 'Start workout'}
                onPress={() => { if (!activeVisit) startVisit(s.title); router.push(`/workout/${today}/${i}`); }}
                style={{ flex: 1 }}
              />
              <Button kind="secondary" title="Edit" onPress={() => router.push(`/session/${today}/${i}`)} />
            </Row>
          </View>
        ))
      )}

      <Section title="This week" right={<Text style={st.meta}>{SPLIT_LABELS[plan.data.split]}</Text>}>
        <View>
          {days.map((d) => {
            const done = loggedDates.has(weekDates[d.day]);
            const isToday = d.day === today;
            if (d.sessions.length === 0) {
              return (
                <Pressable key={d.day} onPress={() => addSession(d.day)} style={({ pressed }) => [st.dayRow, pressed && { backgroundColor: C.card }]}>
                  <Text style={[st.dayName, { color: isToday ? C.text : C.faint }]}>{DAY_SHORT[d.day]}</Text>
                  <Text style={[st.dayTitle, { color: C.faint, flex: 1 }]}>Rest</Text>
                  <Text style={st.meta}>+ Add</Text>
                </Pressable>
              );
            }
            return d.sessions.map((s, i) => (
              <Pressable key={s.id} onPress={() => router.push(`/workout/${d.day}/${i}`)} style={({ pressed }) => [st.dayRow, pressed && { backgroundColor: C.card }]}>
                <Text style={[st.dayName, { color: isToday ? C.text : C.muted }]}>{i === 0 ? DAY_SHORT[d.day] : ''}</Text>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={st.dayTitle}>{s.title}</Text>
                  <Text style={st.meta} numberOfLines={1}>{s.items.length} exercises{isToday ? ' · today' : ''}</Text>
                </View>
                {done && i === 0 ? <View style={st.doneDot}><Text style={st.doneText}>✓</Text></View> : <Text style={{ color: C.faint, fontSize: 18 }}>›</Text>}
              </Pressable>
            ));
          })}
        </View>
      </Section>

      {plan.data.notes.length > 0 && (
        <Section title="Notes">
          {plan.data.notes.map((n, i) => <P key={i} muted style={{ fontSize: 14 }}>{n}</P>)}
        </Section>
      )}

      <Card style={{ marginTop: 24 }}>
        <P style={{ fontFamily: F.bodySemi }}>Changed your schedule or gym?</P>
        <P muted style={{ fontSize: 14 }}>Rebuild the plan from your profile. Manual edits will be replaced.</P>
        <Row style={{ marginTop: 6 }}>
          <Button kind="secondary" small title="Rebuild plan" onPress={rebuild} loading={busy} />
          <Button kind="ghost" small title={`Edit profile${profile?.display_name ? '' : ''}`} onPress={() => router.push('/onboarding')} />
        </Row>
      </Card>
    </Screen>
  );
}

const st = StyleSheet.create({
  preview: { color: C.muted, fontFamily: F.body, fontSize: 13, lineHeight: 20 },
  meta: { color: C.muted, fontFamily: F.body, fontSize: 12 },
  dayRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  dayName: { width: 40, fontFamily: F.displayMed, fontSize: 14, letterSpacing: 0.5, textTransform: 'uppercase' },
  dayTitle: { color: C.text, fontFamily: F.bodySemi, fontSize: 15 },
  doneDot: { width: 22, height: 22, borderRadius: 11, backgroundColor: A.up, alignItems: 'center', justifyContent: 'center' },
  doneText: { color: C.inverseText, fontSize: 12, fontFamily: F.bodySemi },
});
