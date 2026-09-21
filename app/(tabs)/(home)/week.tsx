import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Eyebrow, H1, hovered, P, Row, Screen, Section, smooth } from '../../../src/components/ui';
import { GroupIcon } from '../../../src/components/GroupIcon';
import { confirm } from '../../../src/lib/confirm';
import { groupColor, sessionColor, sessionGroups } from '../../../src/lib/groups';
import { DAY_SHORT, PlanSession, SPLIT_LABELS, uid, WEEK_ORDER } from '../../../src/lib/planner';
import { useStore } from '../../../src/lib/store';
import { A, C, F, R } from '../../../src/lib/theme';

function isoOf(d: Date) {
  const z = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}

/** The whole training week, the plan notes, and rebuilding the plan. */
export default function WeekScreen() {
  const { plan, regeneratePlan, savePlan, logs } = useStore();
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

  async function rebuild() {
    if (!(await confirm('Rebuild plan?', 'This creates a fresh plan from your profile and replaces any edits you made.', { confirmText: 'Rebuild' }))) return;
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

  if (!plan) {
    return (
      <Screen>
        <H1>No plan yet</H1>
        <Button icon="sparkles" title="Build my plan" onPress={() => regeneratePlan()} />
      </Screen>
    );
  }

  const days = WEEK_ORDER.map((d) => plan.data.days.find((x) => x.day === d) ?? { day: d, sessions: [] });

  return (
    <Screen>
      <Eyebrow>{SPLIT_LABELS[plan.data.split]}</Eyebrow>
      <H1>This week</H1>

      <Row style={{ gap: 6, marginBottom: 6, marginTop: 8 }}>
        {days.map((d) => {
          const first = d.sessions[0];
          const col = first ? sessionColor(first.focus) : C.border;
          const done = loggedDates.has(weekDates[d.day]);
          const isToday = d.day === today;
          return (
            <Pressable
              key={d.day}
              onPress={() => (first ? router.push(`/workout/${d.day}/0?date=${weekDates[d.day]}`) : addSession(d.day))}
              accessibilityRole="button"
              accessibilityLabel={`${DAY_SHORT[d.day]}: ${first ? first.title : 'rest day'}${done ? ', done' : ''}`}
              style={(p) => [st.pill, smooth, hovered(p) && { transform: [{ translateY: -2 }] }, p.pressed && { opacity: 0.7 }]}
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

      <Row style={{ gap: 14, marginBottom: 4 }} wrap>
        <Row style={{ gap: 6 }}><View style={[st.legend, { borderColor: A.protein }]} /><Text style={st.meta}>Number of exercises</Text></Row>
        <Row style={{ gap: 6 }}><View style={[st.legend, { backgroundColor: A.up, borderColor: A.up }]} /><Text style={st.meta}>Done</Text></Row>
      </Row>

      <View style={{ gap: 10, marginTop: 6 }}>
        {days.map((d) => {
          const done = loggedDates.has(weekDates[d.day]);
          const isToday = d.day === today;
          if (d.sessions.length === 0) {
            return (
              <Pressable key={d.day} onPress={() => addSession(d.day)} accessibilityRole="button" accessibilityLabel={`Add a workout on ${DAY_SHORT[d.day]}`} style={(p) => [st.restCard, smooth, (hovered(p) || p.pressed) && { backgroundColor: C.card, borderColor: C.borderStrong }]}>
                <Ionicons name="moon-outline" size={16} color={isToday ? C.text : C.faint} />
                <Text style={[st.cardDay, { color: isToday ? C.text : C.faint, width: 30 }]}>{DAY_SHORT[d.day]}</Text>
                <Text style={[st.restText, isToday && { color: C.muted }]}>Rest and recover</Text>
                <Ionicons name="add-circle-outline" size={16} color={C.muted} />
                <Text style={st.meta}>Add</Text>
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
                onPress={() => router.push(`/workout/${d.day}/${i}?date=${weekDates[d.day]}`)}
                accessibilityRole="button"
                style={(p) => [st.card2, smooth, { borderLeftColor: col }, isToday && { backgroundColor: C.card }, (hovered(p) || p.pressed) && { backgroundColor: C.card2, borderColor: col }]}
              >
                <Row style={{ justifyContent: 'space-between' }}>
                  <Text style={[st.cardDay, { color: isToday ? C.text : C.muted }]}>
                    {DAY_SHORT[d.day]}{d.sessions.length > 1 ? ` · ${i === 0 ? 'AM' : 'PM'}` : ''}{isToday ? ' · TODAY' : ''}
                  </Text>
                  {done && i === 0 ? <Row style={{ gap: 4 }}><Ionicons name="checkmark-circle" size={14} color={A.up} /><Text style={[st.cardDay, { color: A.up }]}>DONE</Text></Row> : <Ionicons name="chevron-forward" size={14} color={C.faint} />}
                </Row>
                <Text style={st.cardTitle}>{s2.title}</Text>
                <Row wrap style={{ gap: 5, marginTop: 2 }}>
                  {groups.map((g) => (
                    <View key={g} style={[st.tag, { borderColor: groupColor(g) }]}>
                      <GroupIcon group={g} size={24} color={C.inverse} />
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

      {plan.data.notes.length > 0 && (
        <Section title="Notes" icon="document-text-outline" color={A.carbs}>
          {plan.data.notes.map((n, i) => <P key={i} muted style={{ fontSize: 14 }}>{n}</P>)}
        </Section>
      )}

      <Card style={{ marginTop: 24 }}>
        <P style={{ fontFamily: F.bodySemi }}>Changed your schedule or gym?</P>
        <P muted style={{ fontSize: 14 }}>Rebuild the plan from your profile. Manual edits will be replaced.</P>
        <Row style={{ marginTop: 6 }}>
          <Button kind="secondary" small icon="refresh" tint={A.up} title="Rebuild plan" onPress={rebuild} loading={busy} />
          <Button kind="ghost" small icon="person-outline" title="Edit profile" onPress={() => router.push('/user/onboarding')} />
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
  card2: { borderLeftWidth: 3, borderRadius: R.sm, paddingVertical: 12, paddingHorizontal: 14, gap: 3, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border },
  restCard: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderRadius: R.sm, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border, borderStyle: 'dashed' },
  restText: { flex: 1, color: C.faint, fontFamily: F.body, fontSize: 14 },
  cardDay: { fontFamily: F.bodySemi, fontSize: 10, letterSpacing: 1.2 },
  cardTitle: { color: C.text, fontFamily: F.display, fontSize: 19, letterSpacing: -0.4 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1, borderRadius: 999, paddingLeft: 8, paddingRight: 12, paddingVertical: 4 },
  tagDot: { width: 6, height: 6, borderRadius: 3 },
  tagText: { fontFamily: F.bodySemi, fontSize: 10, letterSpacing: 0.6 },
  meta: { color: C.muted, fontFamily: F.body, fontSize: 12 },
  legend: { width: 12, height: 12, borderRadius: 6, borderWidth: 1.5 },
});
