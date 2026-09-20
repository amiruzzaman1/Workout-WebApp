import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Text } from 'react-native';
import { ExerciseAnimation } from '../../src/components/ExerciseAnimation';
import { Bullets, Button, Card, H1, H2, P, Screen } from '../../src/components/ui';
import { MACHINE_BY_KEY } from '../../src/data/machines';
import { getExercise, isAvailable, requiredKey, titleCase } from '../../src/lib/exercises';
import { useStore } from '../../src/lib/store';
import { C } from '../../src/lib/theme';

export default function ExerciseDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { equipment } = useStore();
  const e = getExercise(decodeURIComponent(String(id)));
  if (!e) return <Screen><P>Exercise not found.</P></Screen>;

  const key = requiredKey(e);
  const machine = key && key !== 'unknown' ? MACHINE_BY_KEY[key] : undefined;
  const available = isAvailable(e, equipment);

  return (
    <Screen>
      <Stack.Screen options={{ title: e.name }} />
      <ExerciseAnimation exercise={e} />
      <H1>{e.name}</H1>
      <P muted>
        {titleCase(e.level)} · {titleCase(e.equipment)}{e.mechanic ? ` · ${titleCase(e.mechanic)}` : ''}
      </P>
      <Card>
        <P><Text style={{ fontWeight: '700' }}>Main muscles: </Text>{e.primary.map(titleCase).join(', ') || '—'}</P>
        {e.secondary.length > 0 && <P muted><Text style={{ fontWeight: '700' }}>Also works: </Text>{e.secondary.map(titleCase).join(', ')}</P>}
        {!available && <Text style={{ color: C.danger }}>Not ticked as available at your gym.</Text>}
      </Card>
      {machine && (machine.setup.length > 0) && (
        <Button kind="secondary" title={`How to use the ${machine.name} ›`} onPress={() => router.push(`/machine/${machine.key}`)} />
      )}
      <H2>How to do it</H2>
      <Card><Bullets items={e.steps.length ? e.steps : ['No instructions yet.']} numbered /></Card>
      {e.level === 'expert' && <P muted>This is an advanced movement — learn the basics first.</P>}
    </Screen>
  );
}
