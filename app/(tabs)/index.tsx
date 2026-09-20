import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { Button, Card, H1, H2, P, Row, Screen } from '../../src/components/ui';
import { confirm } from '../../src/lib/confirm';
import { getExercise } from '../../src/lib/exercises';
import { DAY_NAMES, SPLIT_LABELS, uid, WEEK_ORDER } from '../../src/lib/planner';
import { useStore } from '../../src/lib/store';
import { C } from '../../src/lib/theme';

export default function PlanScreen() {
  const { plan, profile, regeneratePlan, savePlan } = useStore();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const today = new Date().getDay();

  async function rebuild() {
    if (!(await confirm('Rebuild plan?', 'This creates a fresh plan from your profile and replaces any edits you made.'))) return;
    setBusy(true);
    try { await regeneratePlan(); } finally { setBusy(false); }
  }

  async function addSession(day: number) {
    if (!plan) return;
    const existing = plan.data.days.find((d) => d.day === day);
    const newIdx = existing ? existing.sessions.length : 0;
    const session = { id: uid(), title: 'My workout', type: 'strength' as const, focus: [], items: [] };
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
        <Button title="Build my plan" onPress={() => regeneratePlan()} />
      </Screen>
    );
  }

  const days = WEEK_ORDER.map((d) => plan.data.days.find((x) => x.day === d) ?? { day: d, sessions: [] });

  return (
    <Screen>
      <H1>{profile?.display_name ? `${profile.display_name}'s week` : 'Your week'}</H1>
      <P muted>{SPLIT_LABELS[plan.data.split]} · {profile?.gym_name}</P>

      {days.map((d) => (
        <View key={d.day} style={{ gap: 8 }}>
          <Row>
            <H2 style={d.day === today ? { color: C.accent } : undefined}>{DAY_NAMES[d.day]}</H2>
            {d.day === today && <Text style={{ color: C.accent, fontWeight: '700' }}>· Today</Text>}
          </Row>
          {d.sessions.length === 0 ? (
            <Card style={{ opacity: 0.6 }}><P muted>Rest & recover</P></Card>
          ) : (
            d.sessions.map((s, i) => (
              <Card key={s.id} onPress={() => router.push(`/session/${d.day}/${i}`)} style={d.day === today ? { borderColor: C.accent } : undefined}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Text style={{ color: C.text, fontWeight: '700', fontSize: 16, flex: 1 }}>
                    {d.sessions.length > 1 ? (i === 0 ? 'AM · ' : 'PM · ') : ''}{s.title}
                  </Text>
                  <Text style={{ color: C.muted }}>{s.items.length} exercises ›</Text>
                </Row>
                <P muted style={{ fontSize: 13 }} >
                  {s.items.slice(0, 4).map((it) => getExercise(it.exerciseId)?.name ?? it.exerciseId).join(' · ')}
                  {s.items.length > 4 ? ' …' : ''}
                </P>
              </Card>
            ))
          )}
          {d.sessions.length < 2 && (
            <Button small kind="secondary" title={d.sessions.length ? '+ Add another session' : '+ Add a workout'} onPress={() => addSession(d.day)} style={{ alignSelf: 'flex-start' }} />
          )}
        </View>
      ))}

      {plan.data.notes.length > 0 && (
        <Card>
          <H2>Notes</H2>
          {plan.data.notes.map((n, i) => <P key={i} muted style={{ fontSize: 14 }}>• {n}</P>)}
        </Card>
      )}

      <Button kind="secondary" title="Rebuild plan from my profile" onPress={rebuild} loading={busy} />
    </Screen>
  );
}
