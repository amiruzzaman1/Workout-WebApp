import { Stack, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Button, Chip, Eyebrow, H1, Label, P, Row, Screen, Section, Slider } from '../../../src/components/ui';
import { DobInput, NumberField, WorkFields } from '../../../src/components/BodyFields';
import { ageFrom, cmToFtIn, computeTargets, ftInToCm } from '../../../src/lib/nutrition';
import { DEFAULT_PROFILE, useStore } from '../../../src/lib/store';
import { A, C, F, R } from '../../../src/lib/theme';

export default function Nutrition() {
  const { profile, saveProfile } = useStore();
  const router = useRouter();
  const [f, setF] = useState<any>({ ...DEFAULT_PROFILE, ...(profile ?? {}) });
  const [dob, setDob] = useState<string | null>(() => {
    const p: any = profile;
    if (p?.birth_date) return p.birth_date;
    const a = ageFrom(p?.birth_year); // older saves: keep the year, mid-year
    return a ? `${new Date().getFullYear() - a}-07-01` : null;
  });
  const [unit, setUnit] = useState<'cm' | 'ft'>('cm');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = (k: string, v: any) => setF((x: any) => ({ ...x, [k]: v }));

  // The profile may still be loading when this screen mounts.
  const [synced, setSynced] = useState(!!profile);
  useEffect(() => {
    if (synced || !profile) return;
    setF({ ...DEFAULT_PROFILE, ...profile });
    const p: any = profile;
    const a = ageFrom(p.birth_year);
    setDob(p.birth_date ?? (a ? `${new Date().getFullYear() - a}-07-01` : null));
    setSynced(true);
  }, [profile, synced]);

  const t = useMemo(() => computeTargets({ ...f, birth_date: dob }), [f, dob]);
  const weight = Number(f.weight_kg) || 0;
  const goalW = f.target_weight_kg ? Number(f.target_weight_kg) : null;
  const height = Number(f.height_cm) || 0;
  const { ft, inch } = cmToFtIn(height || 175);

  async function save() {
    setBusy(true); setErr(null);
    try {
      await saveProfile({
        height_cm: f.height_cm ? Number(f.height_cm) : null,
        weight_kg: f.weight_kg ? Number(f.weight_kg) : null,
        sex: f.sex ?? null,
        birth_date: dob,
        birth_year: dob ? Number(dob.slice(0, 4)) : null,
        job_activity: f.job_activity ?? 'light',
        work_hours_week: f.work_hours_week == null || f.work_hours_week === '' ? null : Number(f.work_hours_week),
        work_hours_by_day: f.work_hours_by_day ?? null,
        target_weight_kg: f.target_weight_kg ? Number(f.target_weight_kg) : null,
        calorie_override: f.calorie_override ? Number(f.calorie_override) : null,
        water_goal_ml: f.water_goal_ml ? Number(f.water_goal_ml) : null,
      });
      router.back();
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Targets' }} />
      <Eyebrow>Body & daily targets</Eyebrow>
      <H1>Your numbers</H1>
      <P muted>Everything updates as you change it. Nothing is saved until you press Save.</P>

      {/* ---------- height ---------- */}
      <Row style={{ justifyContent: 'space-between', marginTop: 18 }}>
        <Label>Height</Label>
        <Row style={{ gap: 0 }}>
          {(['cm', 'ft'] as const).map((u) => (
            <Pressable key={u} onPress={() => setUnit(u)} style={[st.seg, unit === u && st.segOn]}>
              <Text style={[st.segText, unit === u && { color: C.inverseText }]}>{u === 'cm' ? 'CM' : 'FT / IN'}</Text>
            </Pressable>
          ))}
        </Row>
      </Row>
      {unit === 'cm' ? (
        <>
          <Row style={{ gap: 12 }}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <NumberField value={height || null} onChange={(v) => set('height_cm', v)} step={1} min={100} max={250} decimals={1} placeholder="178" suffix="cm" />
            </View>
            <Text style={st.meta}>{height ? `${ft}′ ${inch}″` : ''}</Text>
          </Row>
          <Slider value={height || 175} min={130} max={215} step={1} onChange={(v) => set('height_cm', v)} />
        </>
      ) : (
        <>
        <Row style={{ gap: 10, alignItems: 'flex-start' }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={st.meta}>Feet</Text>
            <NumberField value={ft} decimals={0} step={1} min={4} max={7} suffix="ft"
              onChange={(v) => set('height_cm', ftInToCm(Math.min(7, Math.max(4, v ?? 5)), inch))} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={st.meta}>Inches</Text>
            <NumberField value={inch} decimals={0} step={1} min={0} max={11} suffix="in"
              onChange={(v) => set('height_cm', ftInToCm(ft, Math.min(11, Math.max(0, v ?? 0))))} />
          </View>
        </Row>
        <Text style={st.meta}>{height ? `${height} cm` : ''}</Text>
        </>
      )}

      {/* ---------- weight ---------- */}
      <Label>Weight now</Label>
      <NumberField value={weight || null} onChange={(v) => set('weight_kg', v)} step={0.5} min={30} max={300} placeholder="82" suffix="kg" />
      <Slider value={weight || 70} min={35} max={180} step={0.5} onChange={(v) => set('weight_kg', v)} />

      {/* ---------- goal weight ---------- */}
      <Row style={{ justifyContent: 'space-between' }}>
        <Label>Goal weight</Label>
        {goalW ? (
          <Text style={st.meta}>{goalW > weight ? '+' : ''}{Math.round((goalW - weight) * 10) / 10} kg from now</Text>
        ) : null}
      </Row>
      <Row style={{ gap: 10 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <NumberField value={goalW} onChange={(v) => set('target_weight_kg', v)} step={0.5} min={30} max={300} placeholder="76" suffix="kg" />
        </View>
        {goalW ? <Button small kind="secondary" title="Clear" onPress={() => set('target_weight_kg', null)} /> : null}
      </Row>
      <Slider value={goalW ?? (weight || 70)} min={35} max={180} step={0.5} onChange={(v) => set('target_weight_kg', v)} />
      <P muted style={{ fontSize: 13 }}>This sets your calories: below your current weight gives a deficit, above it gives a surplus.</P>

      {/* ---------- age / sex / job ---------- */}
      <Row style={{ gap: 8, marginTop: 10 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Label>Date of birth</Label>
          <DobInput value={dob} onChange={setDob} />
        </View>
      </Row>
      <Label>Sex</Label>
      <Row wrap>
        <Chip label="Male" active={f.sex === 'male'} onPress={() => set('sex', 'male')} />
        <Chip label="Female" active={f.sex === 'female'} onPress={() => set('sex', 'female')} />
      </Row>

      <View style={{ marginTop: 8 }}>
        <WorkFields
          job={f.job_activity ?? null}
          hoursWeek={f.work_hours_week == null ? null : Number(f.work_hours_week)}
          byDay={f.work_hours_by_day ?? null}
          onJob={(k) => set('job_activity', k)}
          onHoursWeek={(v) => set('work_hours_week', v)}
          onByDay={(v) => set('work_hours_by_day', v)}
        />
      </View>

      {t.ready ? (
        <>
          <Section title="Where you are">
            <BmiScale bmi={t.bmi!} label={t.bmiLabel!} />
            <P muted style={{ fontSize: 13 }}>
              A healthy BMI for your height is about {t.healthyRange![0]} to {t.healthyRange![1]} kg. It's a rough guide: it can't tell
              muscle from fat, so use it alongside the mirror and how your lifts are going.
            </P>
            <Row wrap style={{ gap: 20, marginTop: 6 }}>
              <Fact k="Resting" v={`${t.bmr} kcal`} />
              <Fact k="From work" v={`+${t.workKcal} kcal`} c={A.carbs} />
              <Fact k="From training" v={`+${t.trainKcal} kcal`} c={A.up} />
              <Fact k="Daily burn" v={`${t.tdee} kcal`} />
            </Row>
            <P muted style={{ fontSize: 13 }}>
              Work and training are spread across the week, so {t.workHours} hours of work and your gym sessions raise every day's
              number a little rather than only the days you do them. Change your hours or your job type and the calorie target moves with it.
            </P>
          </Section>

          <Section title={`Eat per day · ${GOAL_LABELS[(f.goal as string) ?? 'general']}`}>
            <Text style={st.bigValue}>{t.kcal}<Text style={st.bigUnit}> kcal</Text></Text>
            <Text style={st.meta}>{t.rationale}</Text>
            {t.goalNote && (
              <View style={st.noteBox}>
                <Text style={st.noteText}>{t.goalNote}</Text>
              </View>
            )}

            <View style={{ marginTop: 10 }}>
              <Slider value={t.kcal!} min={1200} max={4500} step={25} onChange={(v) => set('calorie_override', v)} />
              <Row style={{ justifyContent: 'space-between' }}>
                <Text style={st.meta}>Drag to set your own target</Text>
                {f.calorie_override ? (
                  <Pressable onPress={() => set('calorie_override', null)}><Text style={st.link}>Reset to recommended</Text></Pressable>
                ) : (
                  <Text style={st.meta}>Recommended</Text>
                )}
              </Row>
            </View>

            <MacroSplit protein={t.protein!} carbs={t.carbs!} fat={t.fat!} kcal={t.kcal!} />

            <View style={{ marginTop: 10 }}>
              <Line k="Protein" c={A.protein} v={`${t.protein} g`} why={t.direction === 'lose' ? 'Keeps your muscle while the fat comes off.' : 'The building material for new muscle.'} />
              <Line k="Carbs" c={A.carbs} v={`${t.carbs} g`} why="Your main fuel for lifting and for long shifts." />
              <Line k="Fat" c={A.fat} v={`${t.fat} g`} why="Needed for hormones, so treat this as a floor rather than a limit." />
              <Line k="Fibre" c={A.fibre} v={`${t.fibre} g`} why="Fruit, veg, oats, beans. Keeps you full and your gut happy." />
              <Line k="Water" c={A.water} v={`${(t.water! / 1000).toFixed(1)} L`} why="More on gym days and in a hot kitchen." />
            </View>
          </Section>

          {t.tips && t.tips.length > 0 && (
            <Section title="For your goal">
              <View>
                {t.tips.map((tip, i) => (
                  <View key={i} style={st.tipRow}>
                    <Text style={st.tipDash}>{'\u2022'}</Text>
                    <Text style={st.tipText}>{tip}</Text>
                  </View>
                ))}
              </View>
              <Button kind="secondary" small title="Change my goal" onPress={() => router.push('/you/onboarding')} style={{ alignSelf: 'flex-start', marginTop: 6 }} />
            </Section>
          )}

          {goalW && t.direction !== 'hold' && (
            <Section title="Getting there">
              <View style={[st.projection, { borderLeftColor: t.direction === 'lose' ? A.fibre : A.protein }]}>
                <Text style={st.projLead}>
                  {t.direction === 'lose' ? 'Losing' : 'Gaining'} about {Math.abs(t.weeklyKg!).toFixed(2)} kg a week
                </Text>
                <Text style={st.meta}>
                  {t.weeksToGoal != null
                    ? `${weight} kg → ${goalW} kg takes roughly ${t.weeksToGoal} week${t.weeksToGoal === 1 ? '' : 's'}, so around ${t.goalDate}.`
                    : 'Your calorie target moves you away from your goal weight, so drag it the other way.'}
                </Text>
                {t.weeksToGoal != null && <PaceBar weeks={t.weeksToGoal} />}
              </View>
            </Section>
          )}
        </>
      ) : (
        <View style={st.hint}>
          <Text style={st.hintText}>{t.problem ?? 'Add your height, weight, age and sex to see your BMI and daily targets.'}</Text>
        </View>
      )}

      {err && <Text style={{ color: C.danger, fontFamily: F.body }}>{err}</Text>}
      <Button title="Save" onPress={save} loading={busy} style={{ marginTop: 20 }} />
      <P muted style={{ fontSize: 12 }}>
        Estimates from the standard Mifflin-St Jeor formulas, not medical advice. If you have a health condition, or want a plan built
        around you, see a doctor or a registered dietitian.
      </P>
    </Screen>
  );
}

function BmiScale({ bmi, label }: { bmi: number; label: string }) {
  // 15 → 40 across the bar
  const pct = Math.min(1, Math.max(0, (bmi - 15) / 25));
  const bands = [
    { to: 18.5, label: 'Under' },
    { to: 25, label: 'Healthy' },
    { to: 30, label: 'Over' },
    { to: 40, label: 'Obese' },
  ];
  let start = 15;
  return (
    <View style={{ gap: 8 }}>
      <Row style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <Text style={st.bigValue}>{bmi.toFixed(1)}<Text style={st.bigUnit}> BMI</Text></Text>
        <Text style={[st.badge, { backgroundColor: bmi < 18.5 ? A.water : bmi < 25 ? A.fibre : bmi < 30 ? A.carbs : A.over }]}>{label}</Text>
      </Row>
      <View style={{ height: 10, flexDirection: 'row', gap: 2 }}>
        {bands.map((b, i) => {
          const w = (b.to - start) / 25;
          start = b.to;
          const fill = [A.water, A.fibre, A.carbs, A.over][i];
          return <View key={i} style={{ flex: w, backgroundColor: fill, opacity: 0.85, borderRadius: 2 }} />;
        })}
        <View style={[st.marker, { left: `${pct * 100}%` }]} />
      </View>
      <View style={{ height: 14 }}>
        {[15, 18.5, 25, 30, 40].map((v) => (
          <Text key={v} style={[st.tiny, st.axisLabel, { left: `${((v - 15) / 25) * 100}%` }]}>{v}</Text>
        ))}
      </View>
    </View>
  );
}

function MacroSplit({ protein, carbs, fat, kcal }: { protein: number; carbs: number; fat: number; kcal: number }) {
  const p = (protein * 4) / kcal, c = (carbs * 4) / kcal, f = (fat * 9) / kcal;
  const seg = [
    { k: 'Protein', v: p, fill: A.protein },
    { k: 'Carbs', v: c, fill: A.carbs },
    { k: 'Fat', v: f, fill: A.fat },
  ];
  return (
    <View style={{ marginTop: 16, gap: 8 }}>
      <View style={{ flexDirection: 'row', height: 14, gap: 2 }}>
        {seg.map((s) => <View key={s.k} style={{ flex: Math.max(0.02, s.v), backgroundColor: s.fill, borderRadius: 2 }} />)}
      </View>
      <Row wrap style={{ gap: 16 }}>
        {seg.map((s) => (
          <Row key={s.k} style={{ gap: 6 }}>
            <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: s.fill }} />
            <Text style={st.tiny}>{s.k} {Math.round(s.v * 100)}%</Text>
          </Row>
        ))}
      </Row>
    </View>
  );
}

function PaceBar({ weeks }: { weeks: number }) {
  const marks = Math.min(weeks, 26);
  return (
    <Row style={{ gap: 3, marginTop: 10, flexWrap: 'wrap' }}>
      {Array.from({ length: marks }, (_, i) => (
        <View key={i} style={{ width: 8, height: 16, borderRadius: 1, backgroundColor: i === marks - 1 ? C.inverse : '#3a3a3a' }} />
      ))}
      {weeks > 26 && <Text style={st.tiny}>+{weeks - 26} more</Text>}
    </Row>
  );
}

function Fact({ k, v, c }: { k: string; v: string; c?: string }) {
  return (
    <View>
      <Text style={st.tiny}>{k}</Text>
      <Text style={[st.factV, !!c && { color: c }]}>{v}</Text>
    </View>
  );
}

function Line({ k, v, why, c }: { k: string; v: string; why: string; c?: string }) {
  return (
    <View style={st.line}>
      <View style={{ width: 78, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {!!c && <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: c }} />}
        <Text style={[st.lineK, { width: undefined }]}>{k}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={st.lineV}>{v}</Text>
        <Text style={st.meta}>{why}</Text>
      </View>
    </View>
  );
}

const GOAL_LABELS: Record<string, string> = {
  recomp: 'Lose fat and build muscle',
  general: 'General fitness',
  muscle: 'Build muscle',
  fat_loss: 'Lose fat',
  strength: 'Get stronger',
};

const st = StyleSheet.create({
  meta: { color: C.muted, fontFamily: F.body, fontSize: 12, lineHeight: 18 },
  tiny: { color: C.muted, fontFamily: F.bodyMed, fontSize: 11 },
  readout: { color: C.text, fontFamily: F.display, fontSize: 24, letterSpacing: -0.6 },
  link: { color: C.text, fontFamily: F.bodySemi, fontSize: 12, textDecorationLine: 'underline' },
  seg: { paddingVertical: 6, paddingHorizontal: 12, borderWidth: 1, borderColor: C.border },
  segOn: { backgroundColor: C.inverse, borderColor: C.inverse },
  segText: { color: C.muted, fontFamily: F.bodySemi, fontSize: 10, letterSpacing: 1 },
  bigValue: { color: C.text, fontFamily: F.display, fontSize: 44, letterSpacing: -1.6 },
  bigUnit: { color: C.muted, fontFamily: F.body, fontSize: 15, letterSpacing: 0 },
  badge: { color: C.inverseText, backgroundColor: C.inverse, fontFamily: F.bodySemi, fontSize: 11, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 2, overflow: 'hidden' },
  noteBox: { borderWidth: StyleSheet.hairlineWidth, borderColor: C.borderStrong, borderRadius: R.sm, padding: 12, marginTop: 10 },
  noteText: { color: C.text, fontFamily: F.body, fontSize: 13, lineHeight: 19 },
  tipRow: { flexDirection: 'row', gap: 10, paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  tipDash: { color: C.faint, fontFamily: F.body, fontSize: 13 },
  tipText: { flex: 1, color: C.text, fontFamily: F.body, fontSize: 14, lineHeight: 20 },
  axisLabel: { position: 'absolute', width: 30, marginLeft: -15, textAlign: 'center' },
  marker: { position: 'absolute', top: -4, width: 2, height: 18, backgroundColor: C.text, marginLeft: -1 },
  factV: { color: C.text, fontFamily: F.displayMed, fontSize: 17 },
  line: { flexDirection: 'row', gap: 12, paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  lineK: { width: 78, color: C.muted, fontFamily: F.bodySemi, fontSize: 13 },
  lineV: { color: C.text, fontFamily: F.displayMed, fontSize: 16 },
  projection: { borderLeftWidth: 2, borderLeftColor: C.inverse, paddingLeft: 12, gap: 4 },
  projLead: { color: C.text, fontFamily: F.display, fontSize: 20, letterSpacing: -0.4 },
  hint: { borderWidth: StyleSheet.hairlineWidth, borderColor: C.borderStrong, borderRadius: R.md, padding: 14, marginTop: 18 },
  hintText: { color: C.text, fontFamily: F.body, fontSize: 14 },
});
