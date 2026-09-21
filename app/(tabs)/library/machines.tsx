import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Switch, View } from 'react-native';
import { ExerciseThumb } from '../../../src/components/ExerciseAnimation';
import { Button, Eyebrow, H1, ListRow, P, Screen, Section } from '../../../src/components/ui';
import { EquipmentKind, JETTS_NEWTOWN_TEMPLATE, MACHINES } from '../../../src/data/machines';
import { confirm } from '../../../src/lib/confirm';
import { getExercise } from '../../../src/lib/exercises';
import { useStore } from '../../../src/lib/store';
import { A, C } from '../../../src/lib/theme';

const SECTIONS: [EquipmentKind, string, React.ComponentProps<typeof Ionicons>['name'], string][] = [
  ['machine', 'Machines', 'hardware-chip-outline', A.protein],
  ['cable', 'Cable machines', 'git-pull-request-outline', A.fibre],
  ['cardio', 'Cardio', 'heart-outline', A.cardio],
  ['free', 'Free weights and other', 'barbell-outline', A.fat],
];

export default function Machines() {
  const { equipment, toggleEquipment, setEquipment, profile } = useStore();
  const router = useRouter();

  async function resetJetts() {
    if (await confirm('Use Jetts Newtown list?', 'Replace your ticked equipment with the default Jetts Newtown list?', { confirmText: 'Replace' })) await setEquipment(JETTS_NEWTOWN_TEMPLATE);
  }

  return (
    <Screen top>
      <Eyebrow>{profile?.gym_name || 'My gym'}</Eyebrow>
      <H1>Machines</H1>
      <P muted>Switch on what your gym has, because plans only use equipment that's on. Tap any machine for a step by step guide.</P>
      {SECTIONS.map(([kind, title, icon, color]) => (
        <Section key={kind} title={title} icon={icon} color={color}>
          <View>
            {MACHINES.filter((m) => m.kind === kind).map((m) => {
              const demo = m.exercises.map(getExercise).find(Boolean);
              const hasGuide = m.setup.length > 0 || m.howTo.length > 0;
              const on = equipment.has(m.key);
              return (
                <ListRow
                  key={m.key}
                  onPress={hasGuide ? () => router.push(`/library/machine/${m.key}`) : undefined}
                  left={demo ? <ExerciseThumb exercise={demo} /> : <View style={{ width: 52, height: 52, borderRadius: 4, backgroundColor: C.card2 }} />}
                  title={m.name}
                  subtitle={m.summary}
                  right={
                    <Switch value={on} onValueChange={() => toggleEquipment(m.key)} trackColor={{ true: A.up, false: C.border }} accessibilityLabel={`${m.name} available`}
                      thumbColor={on ? C.inverseText : C.muted} {...({ activeThumbColor: C.inverseText } as any)} />
                  }
                />
              );
            })}
          </View>
        </Section>
      ))}
      <Button kind="secondary" icon="refresh" title="Reset to Jetts Newtown list" onPress={resetJetts} style={{ marginTop: 24 }} />
      <P muted style={{ fontSize: 13 }}>The Jetts Newtown list is a best guess until it's confirmed with photos of the gym floor. After changing equipment, rebuild your plan from the Dashboard tab.</P>
    </Screen>
  );
}
