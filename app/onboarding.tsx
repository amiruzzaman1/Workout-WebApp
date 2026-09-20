import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Button, Card, Chip, H1, Input, Label, P, Row, Screen } from '../src/components/ui';
import { DobInput, NumberField, WorkFields } from '../src/components/BodyFields';
import { confirm } from '../src/lib/confirm';
import { DAY_SHORT, Profile, SPLIT_LABELS, SplitChoice, WEEK_ORDER } from '../src/lib/planner';
import { ageFrom, cmToFtIn, ftInToCm } from '../src/lib/nutrition';
import { DEFAULT_PROFILE, useStore } from '../src/lib/store';
import { C } from '../src/lib/theme';

const GOALS: [Profile['goal'], string][] = [
  ['general', 'General fitness'],
  ['recomp', 'Lose fat and build muscle'],
  ['muscle', 'Build muscle'],
  ['fat_loss', 'Lose fat'],
  ['strength', 'Get stronger'],
];
const MINUTES = [30, 45, 60, 75, 90];

export default function Onboarding() {
  const { profile, plan, saveProfile, regeneratePlan } = useStore();
  const router = useRouter();
  const start = { ...DEFAULT_PROFILE, ...(profile ?? {}) };
  const [f, setF] = useState(start);
  const [busy, setBusy] = useState(false);
  const [dob, setDob] = useState<string | null>(() => {
    const p: any = profile;
    if (p?.birth_date) return p.birth_date;
    const a = ageFrom(p?.birth_year);
    return a ? `${new Date().getFullYear() - a}-07-01` : null;
  });
  const [hUnit, setHUnit] = useState<'cm' | 'ft'>('cm');
  const [err, setErr] = useState<string | null>(null);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));

  const [synced, setSynced] = useState(!!profile);
  useEffect(() => {
    if (synced || !profile) return;
    setF({ ...DEFAULT_PROFILE, ...profile });
    const p: any = profile;
    const a = ageFrom(p.birth_year);
    setDob(p.birth_date ?? (a ? `${new Date().getFullYear() - a}-07-01` : null));
    setSynced(true);
  }, [profile, synced]);

  const toggleDay = (d: number) => {
    const has = f.training_days.includes(d);
    const days = has ? f.training_days.filter((x) => x !== d) : [...f.training_days, d];
    setF((x) => ({ ...x, training_days: days, double_days: x.double_days.filter((dd) => days.includes(dd)) }));
  };
  const toggleDouble = (d: number) =>
    set('double_days', f.double_days.includes(d) ? f.double_days.filter((x) => x !== d) : [...f.double_days, d]);

  async function save() {
    setErr(null);
    if (f.training_days.length === 0) return setErr('Pick at least one training day.');
    if (f.sessions_per_day > 1 && f.double_days.length === 0) return setErr('Pick which days you train twice, or choose 1 session per day.');
    setBusy(true);
    try {
      const planFields: (keyof Profile)[] = ['experience', 'goal', 'training_days', 'sessions_per_day', 'double_days', 'session_minutes', 'split', 'injuries'];
      const changed = !profile || planFields.some((k) => JSON.stringify((profile as any)[k]) !== JSON.stringify((f as any)[k]));
      const saved = await saveProfile({ ...f, birth_date: dob, birth_year: dob ? Number(dob.slice(0, 4)) : null });
      if (!plan) await regeneratePlan(saved);
      else if (changed && (await confirm('Rebuild your plan?', 'Your settings changed. Rebuild the weekly plan to match? Any manual edits to the plan will be replaced.')))
        await regeneratePlan(saved);
      router.replace('/');
    } catch (e: any) {
      setErr(e.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      {!profile && (
        <>
          <H1>Let's set you up</H1>
          <P muted>This builds your first weekly plan. You can change everything later.</P>
        </>
      )}
      <Card>
        <Label>Your name</Label>
        <Input value={f.display_name ?? ''} onChangeText={(t) => set('display_name', t)} placeholder="Name" />

        <Label>Experience</Label>
        <Row wrap>
          <Chip label="Complete beginner" active={f.experience === 'beginner'} onPress={() => set('experience', 'beginner')} />
          <Chip label="Trained before (6+ months)" active={f.experience === 'intermediate'} onPress={() => set('experience', 'intermediate')} />
        </Row>

        <Label>Main goal</Label>
        <Row wrap>
          {GOALS.map(([k, l]) => <Chip key={k} label={l} active={f.goal === k} onPress={() => set('goal', k)} />)}
        </Row>
      </Card>

      <Card>
        <Label>Which days can you train?</Label>
        <Row wrap>
          {WEEK_ORDER.map((d) => <Chip key={d} label={DAY_SHORT[d]} active={f.training_days.includes(d)} onPress={() => toggleDay(d)} />)}
        </Row>

        <Label>Sessions per day</Label>
        <Row wrap>
          <Chip label="1 session" active={f.sessions_per_day === 1} onPress={() => set('sessions_per_day', 1)} />
          <Chip label="2 sessions on some days" active={f.sessions_per_day === 2} onPress={() => set('sessions_per_day', 2)} />
        </Row>
        {f.sessions_per_day === 2 && (
          <>
            <Label>Which days twice?</Label>
            <Row wrap>
              {WEEK_ORDER.filter((d) => f.training_days.includes(d)).map((d) => (
                <Chip key={d} label={DAY_SHORT[d]} active={f.double_days.includes(d)} onPress={() => toggleDouble(d)} />
              ))}
            </Row>
            {f.experience === 'beginner' && (
              <P muted style={{ fontSize: 13 }}>As a beginner, your second session will be light cardio and mobility so your muscles can recover.</P>
            )}
          </>
        )}

        <Label>Minutes per session</Label>
        <Row wrap>
          {MINUTES.map((m) => <Chip key={m} label={`${m}`} active={f.session_minutes === m} onPress={() => set('session_minutes', m)} />)}
        </Row>

        <Label>How to split the week</Label>
        <Row wrap>
          {(Object.keys(SPLIT_LABELS) as SplitChoice[]).map((k) => (
            <Chip key={k} label={SPLIT_LABELS[k]} active={f.split === k} onPress={() => set('split', k)} />
          ))}
        </Row>
        <P muted style={{ fontSize: 13 }}>
          "One body part a day" = Chest, Back, Legs, Shoulders, Arms days. "Pick for me" chooses based on how many days you train.
        </P>
      </Card>

      <Card>
        <Label>Your body (for calories and macros)</Label>
        <P muted style={{ fontSize: 13 }}>Used for BMI and your daily food targets. You can skip this and add it later.</P>
        <Row style={{ justifyContent: 'space-between', marginTop: 8 }}>
          <Label>Height</Label>
          <Row>
            <Chip label="cm" active={hUnit === 'cm'} onPress={() => setHUnit('cm')} />
            <Chip label="ft / in" active={hUnit === 'ft'} onPress={() => setHUnit('ft')} />
          </Row>
        </Row>
        {hUnit === 'cm' ? (
          <NumberField value={Number(f.height_cm) || null} onChange={(v) => set('height_cm', v as any)} step={1} min={100} max={250} placeholder="178" suffix="cm" />
        ) : (
          <Row style={{ gap: 10 }}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <NumberField value={cmToFtIn(Number(f.height_cm) || 175).ft} decimals={0} step={1} min={4} max={7} suffix="ft"
                onChange={(v) => set('height_cm', ftInToCm(Math.min(7, Math.max(4, v ?? 5)), cmToFtIn(Number(f.height_cm) || 175).inch) as any)} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <NumberField value={cmToFtIn(Number(f.height_cm) || 175).inch} decimals={0} step={1} min={0} max={11} suffix="in"
                onChange={(v) => set('height_cm', ftInToCm(cmToFtIn(Number(f.height_cm) || 175).ft, Math.min(11, Math.max(0, v ?? 0))) as any)} />
            </View>
          </Row>
        )}

        <Row style={{ gap: 10 }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Label>Weight now</Label>
            <NumberField value={Number(f.weight_kg) || null} onChange={(v) => set('weight_kg', v as any)} step={0.5} min={30} max={300} placeholder="82" suffix="kg" />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Label>Goal weight</Label>
            <NumberField value={Number(f.target_weight_kg) || null} onChange={(v) => set('target_weight_kg', v as any)} step={0.5} min={30} max={300} placeholder="optional" suffix="kg" />
          </View>
        </Row>

        <Label>Date of birth</Label>
        <DobInput value={dob} onChange={setDob} />

        <Label>Sex</Label>
        <Row wrap>
          <Chip label="Male" active={f.sex === 'male'} onPress={() => set('sex', 'male' as any)} />
          <Chip label="Female" active={f.sex === 'female'} onPress={() => set('sex', 'female' as any)} />
        </Row>

        <WorkFields
          job={(f as any).job_activity ?? null}
          hoursWeek={(f as any).work_hours_week == null ? null : Number((f as any).work_hours_week)}
          byDay={(f as any).work_hours_by_day ?? null}
          onJob={(k) => set('job_activity', k as any)}
          onHoursWeek={(v) => set('work_hours_week', v as any)}
          onByDay={(v) => set('work_hours_by_day', v as any)}
        />
      </Card>

      <Card>
        <Label>Injuries or pain (optional)</Label>
        <Input value={f.injuries ?? ''} onChangeText={(t) => set('injuries', t)} placeholder="e.g. sore left knee, lower back" multiline />
        <Label>Gym</Label>
        <Input value={f.gym_name ?? ''} onChangeText={(t) => set('gym_name', t)} placeholder="Gym name" />
        <P muted style={{ fontSize: 13 }}>Machines start from the Jetts Newtown list. Adjust them in the Machines tab.</P>
      </Card>

      {err && <Text style={{ color: C.danger }}>{err}</Text>}
      <Button title={profile ? 'Save' : 'Build my plan'} onPress={save} loading={busy} />
    </Screen>
  );
}
