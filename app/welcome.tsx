import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { DobInput, NumberField } from '../src/components/BodyFields';
import { Logo } from '../src/components/Logo';
import { Button, hovered, Input, Label, P, Row, Screen, smooth } from '../src/components/ui';
import { cmToFtIn, ftInToCm } from '../src/lib/nutrition';
import { useStore } from '../src/lib/store';
import { APP_NAME, C, F, R } from '../src/lib/theme';

/** The first thing a new account sees: the basics the app needs to work out calories and targets. */
export default function Welcome() {
  const { saveProfile, signOut, session } = useStore();
  const router = useRouter();
  const meta: any = session?.user.user_metadata ?? {};
  const [name, setName] = useState<string>(String(meta.full_name ?? meta.name ?? '').split(' ')[0]);
  const [sex, setSex] = useState<'male' | 'female' | null>(null);
  const [dob, setDob] = useState<string | null>(null);
  const [height, setHeight] = useState<number | null>(null);
  const [unit, setUnit] = useState<'cm' | 'ft'>('cm');
  const [weight, setWeight] = useState<number | null>(null);
  const [goal, setGoal] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const { ft, inch } = cmToFtIn(height || 175);

  async function next() {
    setErr(null);
    if (!name.trim()) return setErr('Tell us your name.');
    if (!sex) return setErr('Pick male or female. It is used in the calorie formula.');
    if (!dob) return setErr('Enter your full date of birth.');
    if (!height || height < 100 || height > 250) return setErr('Enter your height (100 to 250 cm).');
    if (!weight || weight < 30 || weight > 300) return setErr('Enter your weight in kilograms.');
    setBusy(true);
    try {
      await saveProfile({
        display_name: name.trim(),
        sex,
        birth_date: dob,
        birth_year: Number(dob.slice(0, 4)),
        height_cm: height,
        weight_kg: weight,
        target_weight_kg: goal,
      } as any);
      router.replace('/user/onboarding?new=1');
    } catch (e: any) {
      setErr(e.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <View style={s.brand}>
        <Logo size={34} />
        <Text style={s.name}>{APP_NAME}</Text>
      </View>
      <Text style={s.title}>Welcome. Let's get the basics.</Text>
      <P muted>These work out your daily calories, protein and water. You can change them any time.</P>

      <View style={s.card}>
        <Label>Your name</Label>
        <Input value={name} onChangeText={setName} placeholder="Name" autoComplete="given-name" />

        <Label>Sex</Label>
        <View style={s.seg} accessibilityRole="radiogroup">
          {([['male', 'Male'], ['female', 'Female']] as ['male' | 'female', string][]).map(([k, label], i) => (
            <Pressable key={k} onPress={() => setSex(k)} accessibilityRole="radio" accessibilityState={{ selected: sex === k }} style={(p) => [s.segItem, smooth, i > 0 && s.segDivider, hovered(p) && sex !== k && { backgroundColor: C.card2 }, sex === k && s.segOn]}>
              <Text style={[s.segText, sex === k && { color: C.inverseText }]}>{label}</Text>
            </Pressable>
          ))}
        </View>

        <Label>Date of birth</Label>
        <DobInput value={dob} onChange={setDob} />
      </View>

      <View style={s.card}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Label>Height</Label>
          <View style={[s.seg, { marginTop: 8 }]}>
            {(['cm', 'ft'] as const).map((u, i) => (
              <Pressable key={u} onPress={() => setUnit(u)} style={(p) => [s.unit, smooth, i > 0 && s.segDivider, hovered(p) && unit !== u && { backgroundColor: C.card2 }, unit === u && s.segOn]}>
                <Text style={[s.segText, { fontSize: 12 }, unit === u && { color: C.inverseText }]}>{u === 'cm' ? 'cm' : 'ft / in'}</Text>
              </Pressable>
            ))}
          </View>
        </Row>
        {unit === 'cm' ? (
          <NumberField value={height} onChange={setHeight} step={1} min={100} max={250} placeholder="178" suffix="cm" />
        ) : (
          <Row style={{ gap: 10 }}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <NumberField value={height ? ft : null} decimals={0} step={1} min={4} max={7} suffix="ft" placeholder="5"
                onChange={(v) => setHeight(ftInToCm(Math.min(7, Math.max(4, v ?? 5)), inch))} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <NumberField value={height ? inch : null} decimals={0} step={1} min={0} max={11} suffix="in" placeholder="9"
                onChange={(v) => setHeight(ftInToCm(ft, Math.min(11, Math.max(0, v ?? 0))))} />
            </View>
          </Row>
        )}

        <Label>Weight now</Label>
        <NumberField value={weight} onChange={setWeight} step={0.5} min={30} max={300} placeholder="82" suffix="kg" />

        <Label>Goal weight (optional)</Label>
        <NumberField value={goal} onChange={setGoal} step={0.5} min={30} max={300} placeholder="76" suffix="kg" />
      </View>

      {!!err && <Text style={{ color: C.danger, fontFamily: F.body }}>{err}</Text>}
      <Button icon="arrow-forward" title="Continue" onPress={next} loading={busy} style={{ marginTop: 6 }} />
      <Pressable onPress={signOut} accessibilityRole="button" style={(p) => [{ paddingVertical: 12, alignItems: 'center', borderRadius: 8 }, smooth, hovered(p) && { backgroundColor: C.card2 }]}>
        <Text style={{ color: C.muted, fontFamily: F.body, fontSize: 13, textDecorationLine: 'underline' }}>Use a different account</Text>
      </Pressable>
    </Screen>
  );
}

const s = StyleSheet.create({
  brand: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 8, marginBottom: 6 },
  name: { color: C.inverse, fontFamily: F.display, fontSize: 28, letterSpacing: -0.8 },
  title: { color: C.text, fontFamily: F.display, fontSize: 22, lineHeight: 26, letterSpacing: -0.5 },
  card: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: R.lg, padding: 16, gap: 4, marginTop: 8 },
  seg: { flexDirection: 'row', borderWidth: 1, borderColor: C.borderStrong, borderRadius: R.md, overflow: 'hidden' },
  segItem: { flex: 1, minHeight: 46, alignItems: 'center', justifyContent: 'center' },
  unit: { minHeight: 34, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  segDivider: { borderLeftWidth: 1, borderLeftColor: C.borderStrong },
  segOn: { backgroundColor: C.inverse },
  segText: { color: C.text, fontFamily: F.bodySemi, fontSize: 14 },
});
