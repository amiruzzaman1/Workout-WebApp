import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Eyebrow, H1, P, Row, Screen, Section, Stat } from '../../../src/components/ui';
import { confirm } from '../../../src/lib/confirm';
import { getExercise } from '../../../src/lib/exercises';
import { DAY_NAMES, DAY_SHORT, PlanSession, SPLIT_LABELS, uid, WEEK_ORDER } from '../../../src/lib/planner';
import { fmtDuration, secondsByDate, todayISO } from '../../../src/lib/progress';
import { sessionColor, sessionGroups, groupColor } from '../../../src/lib/groups';
import { currentQuote, msUntilNextQuote } from '../../../src/lib/quotes';
import { SleepCard, TimeTrackerCard } from '../../../src/components/DayTrackers';
import { computeTargets, totals } from '../../../src/lib/nutrition';
import { useStore } from '../../../src/lib/store';
import { A, C, F, R } from '../../../src/lib/theme';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function isoOf(d: Date) {
  const z = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}

export default function TodayScreen() {
  const { plan, profile, regeneratePlan, savePlan, logs, visits, activeVisit, startVisit, foodEntries } = useStore();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [quote, setQuote] = useState(() => currentQuote());
  useEffect(() => {
    let id: any;
    const schedule = () => {
      id = setTimeout(() => { setQuote(currentQuote()); schedule(); }, msUntilNextQuote());
    };
    schedule();
    return () => clearTimeout(id);
  }, []);
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
  const targets = useMemo(() => computeTargets(profile as any), [profile]);
  const eaten = useMemo(() => totals(foodEntries.filter((e) => e.eaten_on === todayISO())), [foodEntries]);

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
            <Row wrap style={{ gap: 6 }}>
              {sessionGroups(s.focus).map((g) => (
                <View key={g} style={[st.tag, { borderColor: groupColor(g) }]}>
                  <View style={[st.tagDot, { backgroundColor: groupColor(g) }]} />
                  <Text style={[st.tagText, { color: groupColor(g) }]}>{g}</Text>
                </View>
              ))}
            </Row>
            <H1>{s.title}</H1>
            <P muted>
              {s.items.filter((x) => x.phase !== 'warmup').length} exercises · {s.items.filter((x) => x.phase !== 'warmup').reduce((a, it) => a + (it.sets || 0), 0)} sets
              {todaySets > 0 && i === 0 ? ` · ${todaySets} sets logged` : ''}
              {todaySecs > 0 && i === 0 ? ` · ${fmtDuration(todaySecs)} in the gym` : ''}
            </P>
            <Text style={st.preview} numberOfLines={2}>
              {s.items.filter((x) => x.phase !== 'warmup').map((it) => getExercise(it.exerciseId)?.name ?? it.exerciseId).join('  /  ')}
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

      <View style={st.quote}>
        <Text style={st.quoteLabel}>Today's reminder</Text>
        <Text style={st.quoteText}>{quote.text}</Text>
      </View>

      {targets.ready && (
        <Row style={{ gap: 10, marginTop: 14 }}>
          <Stat value={Math.max(0, Math.round((targets.kcal ?? 0) - eaten.kcal))} label="kcal left" />
          <Stat value={`${Math.round(eaten.protein)}/${targets.protein}`} label="Protein g" color={A.protein} />
          <Stat value={todaySecs ? fmtDuration(todaySecs) : '0m'} label="Gym today" color={A.water} />
        </Row>
      )}

      <Section title="This week" right={<Text style={st.meta}>{SPLIT_LABELS[plan.data.split]}</Text>}>
        <Row style={{ gap: 6, marginBottom: 6 }}>
          {days.map((d) => {
            const first = d.sessions[0];
            const col = first ? sessionColor(first.focus) : C.border;
            const done = loggedDates.has(weekDates[d.day]);
            const isToday = d.day === today;
            return (
              <Pressable
                key={d.day}
                onPress={() => (first ? router.push(`/workout/${d.day}/0`) : addSession(d.day))}
                style={({ pressed }) => [st.pill, pressed && { opacity: 0.7 }]}
              >
                <Text style={[st.pillDay, isToday && { color: C.text }]}>{DAY_SHORT[d.day].slice(0, 1)}</Text>
                <View
                  style={[
                    st.circle,
                    { borderColor: first ? col : C.border },
                    done && { backgroundColor: A.up, borderColor: A.up },
                    isToday && !done && { borderWidth: 2 },
                  ]}
                >
                  <Text style={[st.circleText, { color: done ? C.inverseText : first ? col : C.faint }]}>
                    {done ? '✓' : first ? String(first.items.filter((x) => x.phase !== 'warmup').length) : ''}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </Row>

        <View style={{ gap: 10, marginTop: 6 }}>
          {days.map((d) => {
            const done = loggedDates.has(weekDates[d.day]);
            const isToday = d.day === today;
            if (d.sessions.length === 0) {
              return (
                <Pressable key={d.day} onPress={() => addSession(d.day)} style={({ pressed }) => [st.restCard, pressed && { backgroundColor: C.card }]}>
                  <Text style={[st.cardDay, { color: isToday ? C.text : C.faint }]}>{DAY_SHORT[d.day]}</Text>
                  <Text style={[st.restText, isToday && { color: C.muted }]}>Rest and recover</Text>
                  <Text style={st.meta}>+ Add</Text>
                </Pressable>
              );
            }
            return d.sessions.map((s2, i) => {
              const col = sessionColor(s2.focus);
              const groups = sessionGroups(s2.focus);
              const work = s2.items.filter((x) => x.phase !== 'warmup');
              return (
                <Pressable
                  key={s2.id}
                  onPress={() => router.push(`/workout/${d.day}/${i}`)}
                  style={({ pressed }) => [st.card2, { borderLeftColor: col }, isToday && { backgroundColor: C.card }, pressed && { backgroundColor: C.card2 }]}
                >
                  <Row style={{ justifyContent: 'space-between' }}>
                    <Text style={[st.cardDay, { color: isToday ? C.text : C.muted }]}>
                      {DAY_SHORT[d.day]}{d.sessions.length > 1 ? ` · ${i === 0 ? 'AM' : 'PM'}` : ''}{isToday ? ' · TODAY' : ''}
                    </Text>
                    {done && i === 0 ? <Text style={[st.cardDay, { color: A.up }]}>DONE ✓</Text> : null}
                  </Row>
                  <Text style={st.cardTitle}>{s2.title}</Text>
                  <Row wrap style={{ gap: 5, marginTop: 2 }}>
                    {groups.map((g) => (
                      <View key={g} style={[st.tag, { borderColor: groupColor(g) }]}>
                        <View style={[st.tagDot, { backgroundColor: groupColor(g) }]} />
                        <Text style={[st.tagText, { color: groupColor(g) }]}>{g}</Text>
                      </View>
                    ))}
                  </Row>
                  <Text style={st.meta}>
                    {work.length} exercises · {work.reduce((a, x) => a + (x.sets || 0), 0)} sets
                    {s2.items.some((x) => x.phase === 'warmup') ? ' · warm-up included' : ''}
                  </Text>
                </Pressable>
              );
            });
          })}
        </View>
      </Section>

      <SleepCard date={todayISO()} />
      <TimeTrackerCard date={todayISO()} />

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
          <Button kind="ghost" small title={`Edit profile${profile?.display_name ? '' : ''}`} onPress={() => router.push('/you/onboarding')} />
        </Row>
      </Card>
    </Screen>
  );
}

const st = StyleSheet.create({
  pill: { flex: 1, alignItems: 'center', gap: 7, paddingVertical: 4 },
  pillDay: { color: C.faint, fontFamily: F.displayMed, fontSize: 12 },
  circle: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  circleText: { fontFamily: F.bodySemi, fontSize: 12 },
  quote: { marginTop: 22, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: C.border, paddingVertical: 16, gap: 8 },
  quoteLabel: { color: C.muted, fontFamily: F.bodySemi, fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase' },
  quoteText: { color: C.text, fontFamily: F.display, fontSize: 19, lineHeight: 26, letterSpacing: -0.35 },
  card2: { borderLeftWidth: 3, borderRadius: R.sm, paddingVertical: 12, paddingHorizontal: 14, gap: 3, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border },
  restCard: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderRadius: R.sm, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border, borderStyle: 'dashed' },
  restText: { flex: 1, color: C.faint, fontFamily: F.body, fontSize: 14 },
  cardDay: { fontFamily: F.bodySemi, fontSize: 10, letterSpacing: 1.2 },
  cardTitle: { color: C.text, fontFamily: F.display, fontSize: 19, letterSpacing: -0.4 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  tagDot: { width: 6, height: 6, borderRadius: 3 },
  tagText: { fontFamily: F.bodySemi, fontSize: 10, letterSpacing: 0.6 },
  preview: { color: C.muted, fontFamily: F.body, fontSize: 13, lineHeight: 20 },
  meta: { color: C.muted, fontFamily: F.body, fontSize: 12 },
});
