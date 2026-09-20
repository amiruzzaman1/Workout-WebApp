import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Text, View } from 'react-native';
import { BarChart } from '../../src/components/BarChart';
import { ExerciseAnimation } from '../../src/components/ExerciseAnimation';
import { Bullets, Button, Eyebrow, H1, P, Row, Screen, Section } from '../../src/components/ui';
import { MACHINE_BY_KEY } from '../../src/data/machines';
import { getExercise, isAvailable, requiredKey, titleCase } from '../../src/lib/exercises';
import { fmtWeight, sessionsFor, suggest, todayISO, workingWeight } from '../../src/lib/progress';
import { useStore } from '../../src/lib/store';
import { A, C, F } from '../../src/lib/theme';

export default function ExerciseDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { equipment, logs, plan } = useStore();
  const exId = decodeURIComponent(String(id));
  const e = getExercise(exId);

  const history = useMemo(() => sessionsFor(logs, exId), [logs, exId]);
  const planItem = useMemo(() => {
    for (const d of plan?.data.days ?? []) for (const s of d.sessions) for (const it of s.items) if (it.exerciseId === exId) return it;
    return undefined;
  }, [plan, exId]);
  const today = todayISO();
  const sug = useMemo(
    () => (planItem ? suggest(logs.filter((l) => l.performed_on < today), exId, planItem.reps, planItem.sets) : null),
    [logs, exId, planItem, today],
  );

  if (!e) return <Screen><P>Exercise not found.</P></Screen>;
  const key = requiredKey(e);
  const machine = key && key !== 'unknown' ? MACHINE_BY_KEY[key] : undefined;
  const available = isAvailable(e, equipment);
  const unit = history[0]?.unit ?? 'kg';
  const chart = history.slice(0, 12).reverse().map((s) => {
    const w = workingWeight(s);
    const best = Math.max(...s.sets.filter((x) => x.weight === w).map((x) => x.reps));
    return {
      label: s.date.slice(5).replace('-', '/'),
      value: unit === 'bw' ? best : w,
      caption: `${s.date}: ${unit === 'bw' ? `${best} reps best set` : `${fmtWeight(w, s.unit)}, best ${best} reps`}`,
    };
  });

  return (
    <Screen>
      <Stack.Screen options={{ title: '' }} />
      <ExerciseAnimation exercise={e} />
      <View style={{ gap: 6, marginTop: 8 }}>
        <Eyebrow>{[titleCase(e.level), titleCase(e.equipment), e.mechanic && titleCase(e.mechanic)].filter(Boolean).join(' · ')}</Eyebrow>
        <H1 style={{ fontSize: 32, lineHeight: 36 }}>{e.name}</H1>
        <P muted>
          {e.primary.map(titleCase).join(', ')}
          {e.secondary.length > 0 ? `. Also ${e.secondary.map(titleCase).join(', ').toLowerCase()}` : ''}
        </P>
        {!available && <Text style={{ color: C.muted, fontFamily: F.body, fontSize: 13 }}>Not marked as available at your gym.</Text>}
      </View>

      {machine && machine.setup.length > 0 && (
        <Row style={{ marginTop: 4 }}>
          <Button kind="secondary" small title={`How to set up the ${machine.name}`} onPress={() => router.push(`/machine/${machine.key}`)} />
        </Row>
      )}

      {sug && sug.kind !== 'none' && (
        <View style={{ borderLeftWidth: 2, borderLeftColor: sug.kind === 'increase' ? A.up : sug.kind === 'decrease' ? A.down : C.borderStrong, paddingLeft: 12, marginTop: 12, gap: 3 }}>
          <Eyebrow>Next time</Eyebrow>
          <Text style={{ color: sug.kind === 'increase' ? A.up : sug.kind === 'decrease' ? A.down : C.text, fontFamily: F.display, fontSize: 20, letterSpacing: -0.4 }}>{sug.headline}</Text>
          <P muted style={{ fontSize: 14 }}>{sug.detail}</P>
        </View>
      )}

      {history.length > 0 && (
        <Section title={unit === 'bw' ? 'Your reps over time' : 'Your working weight'}>
          <BarChart data={chart} height={120} color={A.protein} />
          <View style={{ marginTop: 6 }}>
            {history.slice(0, 6).map((s) => (
              <View key={s.date} style={{ flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: C.border, gap: 12 }}>
                <Text style={{ width: 56, color: C.muted, fontFamily: F.displayMed, fontSize: 13 }}>{s.date.slice(5).replace('-', '/')}</Text>
                <Text style={{ flex: 1, color: C.text, fontFamily: F.body, fontSize: 14 }}>
                  {s.sets.map((x) => `${fmtWeight(x.weight, s.unit)} × ${x.reps}`).join('   ')}
                </Text>
              </View>
            ))}
          </View>
        </Section>
      )}

      <Section title="How to do it">
        <Bullets items={e.steps.length ? e.steps : ['No instructions yet.']} numbered />
      </Section>
      {e.level === 'expert' && <P muted>This is an advanced movement, so learn the basics first.</P>}
    </Screen>
  );
}
