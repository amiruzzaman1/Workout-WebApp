import { useRouter } from 'expo-router';
import { Pressable, Switch, Text, View } from 'react-native';
import { ExerciseThumb } from '../../src/components/ExerciseAnimation';
import { Button, H2, P, Screen } from '../../src/components/ui';
import { EquipmentKind, JETTS_NEWTOWN_TEMPLATE, MACHINES } from '../../src/data/machines';
import { confirm } from '../../src/lib/confirm';
import { getExercise } from '../../src/lib/exercises';
import { useStore } from '../../src/lib/store';
import { C } from '../../src/lib/theme';

const SECTIONS: [EquipmentKind, string][] = [
  ['machine', 'Machines'],
  ['cable', 'Cable machines'],
  ['cardio', 'Cardio'],
  ['free', 'Free weights & other'],
];

export default function Machines() {
  const { equipment, toggleEquipment, setEquipment, profile } = useStore();
  const router = useRouter();

  async function resetJetts() {
    if (await confirm('Use Jetts Newtown list?', 'Replace your ticked equipment with the default Jetts Newtown list?')) await setEquipment(JETTS_NEWTOWN_TEMPLATE);
  }

  return (
    <Screen>
      <P muted>
        Tick what {profile?.gym_name || 'your gym'} has — your plan only uses ticked equipment. Tap a machine for a how-to guide.
        Rebuild your plan (My Plan tab) after changing this.
      </P>
      {SECTIONS.map(([kind, title]) => (
        <View key={kind} style={{ gap: 8 }}>
          <H2>{title}</H2>
          {MACHINES.filter((m) => m.kind === kind).map((m) => {
            const demo = m.exercises.map(getExercise).find(Boolean);
            const hasGuide = m.setup.length > 0 || m.howTo.length > 0;
            return (
              <Pressable
                key={m.key}
                onPress={() => hasGuide && router.push(`/machine/${m.key}`)}
                style={({ pressed }) => ({
                  flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 12,
                  backgroundColor: pressed && hasGuide ? C.card2 : C.card, borderWidth: 1, borderColor: C.border,
                })}
              >
                {demo ? <ExerciseThumb exercise={demo} /> : <View style={{ width: 56, height: 56, borderRadius: 8, backgroundColor: C.card2 }} />}
                <View style={{ flex: 1 }}>
                  <Text style={{ color: C.text, fontWeight: '700', fontSize: 15 }}>{m.name}{hasGuide ? ' ›' : ''}</Text>
                  <Text style={{ color: C.muted, fontSize: 13 }} numberOfLines={2}>{m.summary}</Text>
                </View>
                <Switch
                  value={equipment.has(m.key)}
                  onValueChange={() => toggleEquipment(m.key)}
                  trackColor={{ true: C.accent, false: C.border }}
                  thumbColor="#fff" {...({ activeThumbColor: "#fff" } as any)}
                />
              </Pressable>
            );
          })}
        </View>
      ))}
      <Button kind="secondary" title="Reset to Jetts Newtown list" onPress={resetJetts} />
      <P muted style={{ fontSize: 13 }}>The Jetts Newtown list is a best guess until we confirm it with photos of the gym floor.</P>
    </Screen>
  );
}
