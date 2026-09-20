import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, Switch, Text, View } from 'react-native';
import { ExerciseAnimation, ExerciseThumb } from '../../src/components/ExerciseAnimation';
import { Bullets, Card, H1, H2, P, Row, Screen } from '../../src/components/ui';
import { MACHINE_BY_KEY } from '../../src/data/machines';
import { getExercise, titleCase } from '../../src/lib/exercises';
import { useStore } from '../../src/lib/store';
import { C } from '../../src/lib/theme';

export default function MachineDetail() {
  const { key } = useLocalSearchParams<{ key: string }>();
  const router = useRouter();
  const { equipment, toggleEquipment, profile } = useStore();
  const m = MACHINE_BY_KEY[String(key)];
  if (!m) return <Screen><P>Machine not found.</P></Screen>;
  const exs = m.exercises.map(getExercise).filter((e): e is NonNullable<typeof e> => !!e);

  return (
    <Screen>
      <Stack.Screen options={{ title: m.name }} />
      {exs[0] && <ExerciseAnimation exercise={exs[0]} />}
      <H1>{m.name}</H1>
      {m.muscles.length > 0 && <P muted>Works: {m.muscles.map(titleCase).join(', ')}</P>}
      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <P style={{ flex: 1 }}>Available at {profile?.gym_name || 'my gym'}</P>
          <Switch value={equipment.has(m.key)} onValueChange={() => toggleEquipment(m.key)} trackColor={{ true: C.accent, false: C.border }} thumbColor="#fff" {...({ activeThumbColor: "#fff" } as any)} />
        </Row>
      </Card>
      <P>{m.summary}</P>

      {m.setup.length > 0 && (<><H2>1. Set it up</H2><Card><Bullets items={m.setup} numbered /></Card></>)}
      {m.howTo.length > 0 && (<><H2>2. Do the movement</H2><Card><Bullets items={m.howTo} numbered /></Card></>)}
      {m.mistakes.length > 0 && (<><H2>Common mistakes</H2><Card><Bullets items={m.mistakes} /></Card></>)}
      {m.tip && <Card style={{ borderColor: C.accent }}><P>💡 {m.tip}</P></Card>}

      {exs.length > 0 && (
        <>
          <H2>Exercises on this machine</H2>
          <View style={{ gap: 8 }}>
            {exs.map((e) => (
              <Pressable key={e.id} onPress={() => router.push(`/exercise/${encodeURIComponent(e.id)}`)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 12, backgroundColor: C.card, borderWidth: 1, borderColor: C.border }}>
                <ExerciseThumb exercise={e} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: C.text, fontWeight: '700' }}>{e.name}</Text>
                  <Text style={{ color: C.muted, fontSize: 13 }}>{e.primary.map(titleCase).join(', ')}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        </>
      )}
      <P muted style={{ fontSize: 13 }}>Every brand is slightly different — most machines have an instruction sticker, and Jetts staff can show you during staffed hours.</P>
    </Screen>
  );
}
