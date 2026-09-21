import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Switch, Text, View } from 'react-native';
import { ExerciseAnimation, ExerciseThumb } from '../../../../src/components/ExerciseAnimation';
import { Bullets, Eyebrow, H1, ListRow, P, Row, Screen, Section } from '../../../../src/components/ui';
import { MACHINE_BY_KEY } from '../../../../src/data/machines';
import { getExercise, titleCase } from '../../../../src/lib/exercises';
import { useStore } from '../../../../src/lib/store';
import { C, F } from '../../../../src/lib/theme';

export default function MachineDetail() {
  const { key } = useLocalSearchParams<{ key: string }>();
  const router = useRouter();
  const { equipment, toggleEquipment, profile } = useStore();
  const m = MACHINE_BY_KEY[String(key)];
  if (!m) return <Screen><P>Machine not found.</P></Screen>;
  const exs = m.exercises.map(getExercise).filter((e): e is NonNullable<typeof e> => !!e);
  const on = equipment.has(m.key);

  return (
    <Screen>
      <Stack.Screen options={{ title: '' }} />
      {exs[0] && <ExerciseAnimation exercise={exs[0]} />}
      <View style={{ gap: 6, marginTop: 8 }}>
        <Eyebrow>Machine guide{m.muscles.length ? ` · ${m.muscles.map(titleCase).join(', ')}` : ''}</Eyebrow>
        <H1 style={{ fontSize: 32, lineHeight: 36 }}>{m.name}</H1>
        <P muted>{m.summary}</P>
      </View>
      <Row style={{ justifyContent: 'space-between', paddingVertical: 12, borderTopWidth: 0.5, borderBottomWidth: 0.5, borderColor: C.border, marginTop: 8 }}>
        <Text style={{ color: C.text, fontFamily: F.bodyMed, flex: 1 }}>At {profile?.gym_name || 'my gym'}</Text>
        <Switch value={on} onValueChange={() => toggleEquipment(m.key)} trackColor={{ true: C.inverse, false: C.border }}
          thumbColor={on ? C.inverseText : C.muted} {...({ activeThumbColor: C.inverseText } as any)} />
      </Row>

      {m.setup.length > 0 && <Section title="Step 1: set it up"><Bullets items={m.setup} numbered /></Section>}
      {m.howTo.length > 0 && <Section title="Step 2: do the movement"><Bullets items={m.howTo} numbered /></Section>}
      {m.mistakes.length > 0 && <Section title="Avoid"><Bullets items={m.mistakes} /></Section>}
      {m.tip && (
        <View style={{ borderLeftWidth: 2, borderLeftColor: C.inverse, paddingLeft: 12, marginTop: 16 }}>
          <Eyebrow>Tip</Eyebrow>
          <P>{m.tip}</P>
        </View>
      )}

      {exs.length > 0 && (
        <Section title="Exercises on this machine">
          <View>
            {exs.map((e) => (
              <ListRow key={e.id} onPress={() => router.push(`/library/exercise/${encodeURIComponent(e.id)}`)} left={<ExerciseThumb exercise={e} />}
                title={e.name} subtitle={e.primary.map(titleCase).join(', ')} right={<Text style={{ color: C.faint, fontSize: 18 }}>›</Text>} />
            ))}
          </View>
        </Section>
      )}
      <P muted style={{ fontSize: 13, marginTop: 16 }}>Every brand is slightly different. Most machines have an instruction sticker, and Jetts staff can show you during staffed hours.</P>
    </Screen>
  );
}
