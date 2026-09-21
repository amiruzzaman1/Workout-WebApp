import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Eyebrow, H1, P, Row, Screen, Section } from '../../../src/components/ui';
import { computeTargets, FoodEntry, MEAL_LABELS, MEALS, round, totals } from '../../../src/lib/nutrition';
import { todayISO } from '../../../src/lib/progress';
import { useStore } from '../../../src/lib/store';
import { A, C, F, R } from '../../../src/lib/theme';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const GLASS = 250;

function shiftISO(iso: string, days: number) {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + days);
  const z = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}

export default function FoodScreen() {
  const { foodEntries, profile, water, setWater, deleteFoodEntry } = useStore();
  const router = useRouter();
  const [date, setDate] = useState(todayISO());
  const t = useMemo(() => computeTargets(profile as any), [profile]);

  const dayEntries = useMemo(() => foodEntries.filter((e) => e.eaten_on === date), [foodEntries, date]);
  const sum = totals(dayEntries);
  const ml = water[date] ?? 0;
  const d = new Date(date + 'T00:00:00');
  const isToday = date === todayISO();

  return (
    <Screen top>
      <Row style={{ justifyContent: 'space-between' }}>
        <Eyebrow>{isToday ? 'Today' : `${d.getDate()} ${MONTHS[d.getMonth()]}`} · Food</Eyebrow>
        <Row>
          <Pressable onPress={() => setDate(shiftISO(date, -1))} style={st.nav}><Text style={st.navText}>‹</Text></Pressable>
          <Pressable onPress={() => setDate(shiftISO(date, 1))} disabled={isToday} style={[st.nav, isToday && { opacity: 0.35 }]}><Text style={st.navText}>›</Text></Pressable>
        </Row>
      </Row>

      {t.ready ? (
        <>
          <H1>{Math.round(sum.kcal)} <Text style={st.of}>/ {t.kcal} kcal</Text></H1>
          <Meter value={sum.kcal} target={t.kcal!} />
          <P muted>
            {sum.kcal <= (t.kcal ?? 0)
              ? `${Math.round((t.kcal ?? 0) - sum.kcal)} kcal left today`
              : `${Math.round(sum.kcal - (t.kcal ?? 0))} kcal over`}
          </P>

          <Row style={{ gap: 10, marginTop: 14, alignItems: 'flex-start' }}>
            <Macro label="Protein" value={sum.protein} target={t.protein!} color={A.protein} />
            <Macro label="Carbs" value={sum.carbs} target={t.carbs!} color={A.carbs} />
            <Macro label="Fat" value={sum.fat} target={t.fat!} color={A.fat} />
          </Row>

          <Row wrap style={{ marginTop: 12, gap: 14 }}>
            <Mini label="Fibre" v={`${round(sum.fibre)} / ${t.fibre} g`} color={A.fibre} />
            <Mini label="Sugars" v={`${round(sum.sugars)} g`} color={A.carbs} />
            <Mini label="Sat fat" v={`${round(sum.satFat)} g`} color={A.fat} />
            <Mini label="Sodium" v={`${round(sum.sodium)} mg`} />
          </Row>
        </>
      ) : (
        <>
          <H1>Food</H1>
          <Card>
            <P style={{ fontFamily: F.bodySemi }}>Set up your targets</P>
            <P muted style={{ fontSize: 14 }}>Add your height, weight, age and how active your work is, and the app works out your calories, protein, carbs, fat and water for the day.</P>
            <Button small title="Add my details" onPress={() => router.push('/food/nutrition')} style={{ alignSelf: 'flex-start', marginTop: 6 }} />
          </Card>
        </>
      )}

      <Section title="Water" right={<Text style={st.meta}>{(ml / 1000).toFixed(2)} L{t.water ? ` / ${(t.water / 1000).toFixed(1)} L` : ''}</Text>}>
        <Row wrap style={{ gap: 6 }}>
          {Array.from({ length: t.water ? Math.ceil(t.water / GLASS) : 8 }, (_, i) => {
            const filled = ml >= (i + 1) * GLASS;
            return (
              <Pressable key={i} onPress={() => setWater(date, filled ? i * GLASS : (i + 1) * GLASS)} style={[st.glass, filled && { backgroundColor: A.water, borderColor: A.water }]} />
            );
          })}
        </Row>
        <Row style={{ marginTop: 8 }}>
          <Button small kind="secondary" title="− 250 ml" onPress={() => setWater(date, Math.max(0, ml - GLASS))} />
          <Button small kind="secondary" title="+ 250 ml" onPress={() => setWater(date, ml + GLASS)} />
          <Button small kind="secondary" title="+ 500 ml" onPress={() => setWater(date, ml + 500)} />
        </Row>
      </Section>

      {MEALS.map((meal) => {
        const items = dayEntries.filter((e) => e.meal === meal);
        const mt = totals(items);
        return (
          <Section key={meal} title={MEAL_LABELS[meal]} right={<Text style={st.meta}>{Math.round(mt.kcal)} kcal</Text>}>
            {items.length > 0 && (
              <Row wrap style={{ gap: 8, marginBottom: 2 }}>
                <Text style={st.summary} numberOfLines={1}>
                  {items[0].name}{items.length > 1 ? ` and ${items.length - 1} more` : ''}
                </Text>
                <Text style={[st.pct, { color: A.protein }]}>P {pctOf(mt.protein * 4, mt.kcal)}%</Text>
                <Text style={[st.pct, { color: A.carbs }]}>C {pctOf(mt.carbs * 4, mt.kcal)}%</Text>
                <Text style={[st.pct, { color: A.fat }]}>F {pctOf(mt.fat * 9, mt.kcal)}%</Text>
              </Row>
            )}
            <View>
              {items.map((e) => (
                <EntryRow key={e.id} e={e} onDelete={() => deleteFoodEntry(e.id)} onPress={() => router.push(`/food/add?meal=${meal}&date=${date}&edit=${e.id}`)} />
              ))}
            </View>
            <Button small kind="secondary" title="+ Add food" onPress={() => router.push(`/food/add?meal=${meal}&date=${date}`)} style={{ alignSelf: 'flex-start' }} />
          </Section>
        );
      })}

      <Button kind="secondary" title="Your targets & body stats" onPress={() => router.push('/food/nutrition')} style={{ marginTop: 24 }} />
      <P muted style={{ fontSize: 12 }}>Food data from Open Food Facts, an open database. Numbers are estimates, so check the label if something looks off.</P>
    </Screen>
  );
}

function pctOf(part: number, whole: number) {
  return whole > 0 ? Math.round((part / whole) * 100) : 0;
}

function EntryRow({ e, onPress, onDelete }: { e: FoodEntry; onPress: () => void; onDelete: () => void }) {
  return (
    <View style={st.entry}>
      <Pressable onPress={onPress} style={{ flex: 1 }}>
        <Text style={st.entryName} numberOfLines={1}>{e.name}</Text>
        <Text style={st.meta} numberOfLines={1}>
          {e.brand ? `${e.brand} · ` : ''}{round(e.amount)} {e.unit}
          {' · '}P {round(e.protein_g)} C {round(e.carbs_g)} F {round(e.fat_g)}
        </Text>
      </Pressable>
      <Text style={st.kcal}>{Math.round(e.kcal)}</Text>
      <Pressable onPress={onDelete} hitSlop={8} style={{ paddingHorizontal: 6 }}>
        <Text style={{ color: C.faint, fontSize: 16 }}>✕</Text>
      </Pressable>
    </View>
  );
}

function Meter({ value, target }: { value: number; target: number }) {
  const pct = Math.min(1, target ? value / target : 0);
  const over = value > target;
  return (
    <View style={st.track}>
      <View style={[st.fill, { width: `${pct * 100}%`, backgroundColor: over ? A.over : C.inverse }]} />
    </View>
  );
}

function Macro({ label, value, target, color }: { label: string; value: number; target: number; color: string }) {
  const pct = Math.min(1, target ? value / target : 0);
  return (
    <View style={{ flex: 1, gap: 6 }}>
      <Row style={{ gap: 6 }}>
        <View style={[st.dot, { backgroundColor: color }]} />
        <Text style={st.macroLabel}>{label}</Text>
      </Row>
      <Text style={st.macroValue}>{Math.round(value)}<Text style={st.macroTarget}> / {target} g</Text></Text>
      <View style={st.track}><View style={[st.fill, { width: `${pct * 100}%`, backgroundColor: color }]} /></View>
    </View>
  );
}

function Mini({ label, v, color }: { label: string; v: string; color?: string }) {
  return (
    <View>
      <Row style={{ gap: 5 }}>
        {!!color && <View style={[st.dot, { backgroundColor: color }]} />}
        <Text style={st.macroLabel}>{label}</Text>
      </Row>
      <Text style={{ color: C.text, fontFamily: F.bodyMed, fontSize: 13 }}>{v}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  of: { color: C.muted, fontFamily: F.display, fontSize: 20 },
  meta: { color: C.muted, fontFamily: F.body, fontSize: 12 },
  nav: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border, borderRadius: R.sm },
  navText: { color: C.text, fontSize: 18, lineHeight: 20 },
  track: { height: 4, backgroundColor: C.card2, borderRadius: 2, overflow: 'hidden' },
  fill: { height: 4, backgroundColor: C.inverse },
  macroLabel: { color: C.muted, fontFamily: F.bodySemi, fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase' },
  macroValue: { color: C.text, fontFamily: F.display, fontSize: 20, letterSpacing: -0.5 },
  macroTarget: { color: C.muted, fontFamily: F.body, fontSize: 12 },
  entry: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  entryName: { color: C.text, fontFamily: F.bodySemi, fontSize: 14 },
  kcal: { color: C.text, fontFamily: F.displayMed, fontSize: 15 },
  glass: { width: 26, height: 34, borderRadius: 4, borderWidth: 1, borderColor: C.borderStrong },
  dot: { width: 8, height: 8, borderRadius: 2 },
  summary: { flex: 1, minWidth: 120, color: C.muted, fontFamily: F.body, fontSize: 12 },
  pct: { fontFamily: F.bodySemi, fontSize: 11 },
});
