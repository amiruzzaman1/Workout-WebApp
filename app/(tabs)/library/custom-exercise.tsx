import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';
import { Button, Card, Chip, Eyebrow, H1, Input, Label, Row, Screen } from '../../../src/components/ui';
import { MUSCLE_GROUPS, titleCase } from '../../../src/lib/exercises';
import { useStore } from '../../../src/lib/store';
import { C } from '../../../src/lib/theme';

const MUSCLES = Object.values(MUSCLE_GROUPS).flat();
const EQUIP = ['machine', 'cable', 'dumbbell', 'barbell', 'body only', 'kettlebells', 'bands', 'other'];

export default function CustomExercise() {
  const { addCustomExercise } = useStore();
  const router = useRouter();
  const [name, setName] = useState('');
  const [muscles, setMuscles] = useState<string[]>([]);
  const [equipment, setEquipment] = useState('machine');
  const [steps, setSteps] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    if (!name.trim() || muscles.length === 0) return setErr('Add a name and at least one muscle.');
    setBusy(true);
    try {
      await addCustomExercise({ name: name.trim(), primary: muscles, equipment, steps: steps.split('\n').map((s) => s.trim()).filter(Boolean) });
      router.back();
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }

  return (
    <Screen>
      <Eyebrow>Library</Eyebrow>
      <H1>New exercise</H1>
      <Card>
        <Label>Name</Label>
        <Input value={name} onChangeText={setName} placeholder="e.g. Jetts glute kickback machine" />
        <Label>Muscles</Label>
        <Row wrap>
          {MUSCLES.map((m) => (
            <Chip key={m} label={titleCase(m)} active={muscles.includes(m)} onPress={() => setMuscles(muscles.includes(m) ? muscles.filter((x) => x !== m) : [...muscles, m])} />
          ))}
        </Row>
        <Label>Equipment</Label>
        <Row wrap>{EQUIP.map((e) => <Chip key={e} label={titleCase(e)} active={equipment === e} onPress={() => setEquipment(e)} />)}</Row>
        <Label>Steps (one per line)</Label>
        <Input value={steps} onChangeText={setSteps} multiline style={{ minHeight: 120, textAlignVertical: 'top' }} />
      </Card>
      {err && <Text style={{ color: C.danger }}>{err}</Text>}
      <Button icon="checkmark" title="Save exercise" onPress={save} loading={busy} />
    </Screen>
  );
}
