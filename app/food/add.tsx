import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { BarcodeScanner } from '../../src/components/BarcodeScanner';
import { Button, Chip, Eyebrow, H1, Input, Label, P, Row, Screen } from '../../src/components/ui';
import { Food, MEAL_LABELS, Meal, round, scaleFood } from '../../src/lib/nutrition';
import { lookupBarcode, searchFoods } from '../../src/lib/off';
import { todayISO } from '../../src/lib/progress';
import { useStore } from '../../src/lib/store';
import { C, F, R } from '../../src/lib/theme';

type Mode = 'scan' | 'search' | 'mine' | 'quick';

export default function AddFood() {
  const { meal = 'snack', date = todayISO(), edit } = useLocalSearchParams<{ meal?: Meal; date?: string; edit?: string }>();
  const router = useRouter();
  const { myFoods, foodEntries, addFoodEntry, updateFoodEntry, saveFood } = useStore();
  const editing = edit ? foodEntries.find((e) => e.id === edit) : undefined;

  const [mode, setMode] = useState<Mode>('search');
  const [food, setFood] = useState<Food | null>(null);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Food[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [notFound, setNotFound] = useState<string | null>(null);

  // Editing an entry: rebuild a food from the saved per-portion numbers.
  useEffect(() => {
    if (!editing) return;
    const k = 100 / (Number(editing.amount) || 100);
    setFood({
      name: editing.name, brand: editing.brand, barcode: editing.barcode,
      kcal_100: Number(editing.kcal) * k, protein_100: Number(editing.protein_g) * k, carbs_100: Number(editing.carbs_g) * k,
      sugars_100: editing.sugars_g == null ? null : Number(editing.sugars_g) * k,
      fat_100: Number(editing.fat_g) * k,
      sat_fat_100: editing.sat_fat_g == null ? null : Number(editing.sat_fat_g) * k,
      fibre_100: editing.fibre_g == null ? null : Number(editing.fibre_g) * k,
      sodium_100: editing.sodium_mg == null ? null : Number(editing.sodium_mg) * k,
      serving_g: null, serving_label: editing.serving_label, unit: editing.unit, source: editing.source,
    });
  }, [edit]);

  const recents = useMemo(() => {
    const seen = new Set<string>();
    const out: Food[] = [];
    for (let i = foodEntries.length - 1; i >= 0 && out.length < 25; i--) {
      const e = foodEntries[i];
      const key = (e.name + (e.brand ?? '')).toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      const k = 100 / (Number(e.amount) || 100);
      out.push({
        name: e.name, brand: e.brand, barcode: e.barcode,
        kcal_100: Number(e.kcal) * k, protein_100: Number(e.protein_g) * k, carbs_100: Number(e.carbs_g) * k,
        sugars_100: e.sugars_g == null ? null : Number(e.sugars_g) * k, fat_100: Number(e.fat_g) * k,
        sat_fat_100: e.sat_fat_g == null ? null : Number(e.sat_fat_g) * k,
        fibre_100: e.fibre_g == null ? null : Number(e.fibre_g) * k,
        sodium_100: e.sodium_mg == null ? null : Number(e.sodium_mg) * k,
        serving_g: null, serving_label: e.serving_label, unit: e.unit, source: e.source,
      });
    }
    return out;
  }, [foodEntries]);

  async function onBarcode(code: string) {
    setBusy(true); setErr(null); setNotFound(null);
    try {
      const f = await lookupBarcode(code);
      if (!f) setNotFound(code);
      else { setFood(f); saveFood(f); }
    } catch (e: any) {
      setErr(e.message ?? 'Lookup failed. Check your connection.');
    } finally { setBusy(false); }
  }

  async function runSearch() {
    if (q.trim().length < 2) return;
    setBusy(true); setErr(null); setResults([]);
    try {
      setResults(await searchFoods(q));
    } catch (e: any) {
      setErr(e.message ?? 'Search failed. Try again in a moment.');
    } finally { setBusy(false); }
  }

  if (food) {
    return (
      <Portion
        food={food}
        meal={(meal as Meal) ?? 'snack'}
        date={String(date)}
        initialAmount={editing ? Number(editing.amount) : undefined}
        onBack={() => (editing ? router.back() : setFood(null))}
        onSave={async (entry) => {
          if (editing) await updateFoodEntry(editing.id, entry);
          else await addFoodEntry({ ...entry, eaten_on: String(date), meal: (meal as Meal) ?? 'snack' } as any);
          router.back();
        }}
      />
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: `Add to ${MEAL_LABELS[(meal as Meal) ?? 'snack']}` }} />
      <Eyebrow>{MEAL_LABELS[(meal as Meal) ?? 'snack']} · {date === todayISO() ? 'today' : date}</Eyebrow>
      <H1>Add food</H1>

      <Row wrap style={{ marginTop: 6 }}>
        <Chip label="Search" active={mode === 'search'} onPress={() => setMode('search')} />
        <Chip label="Scan barcode" active={mode === 'scan'} onPress={() => setMode('scan')} />
        <Chip label="My foods" active={mode === 'mine'} onPress={() => setMode('mine')} />
        <Chip label="Quick add" active={mode === 'quick'} onPress={() => setMode('quick')} />
      </Row>

      {mode === 'scan' && (
        <View style={{ gap: 12, marginTop: 10 }}>
          <BarcodeScanner onCode={onBarcode} onCancel={() => setMode('search')} />
          {notFound && (
            <View style={st.note}>
              <Text style={st.noteTitle}>Barcode {notFound} isn't in the database</Text>
              <P muted style={{ fontSize: 13 }}>Open Food Facts is missing this product. Add it by hand with Quick add, then it's saved to My foods for next time.</P>
              <Button small kind="secondary" title="Quick add instead" onPress={() => { setMode('quick'); setNotFound(null); }} style={{ alignSelf: 'flex-start' }} />
            </View>
          )}
        </View>
      )}

      {mode === 'search' && (
        <View style={{ gap: 10, marginTop: 10 }}>
          <Row>
            <Input value={q} onChangeText={setQ} placeholder="e.g. weet-bix, anchor milk, pams tuna" style={{ flex: 1, minWidth: 0 }} onSubmitEditing={runSearch} returnKeyType="search" />
            <Button small title="Search" onPress={runSearch} />
          </Row>
          <P muted style={{ fontSize: 12 }}>Products sold in New Zealand are listed first.</P>
          <FoodList foods={results} onPick={setFood} />
        </View>
      )}

      {mode === 'mine' && (
        <View style={{ gap: 10, marginTop: 10 }}>
          {myFoods.length > 0 && <Label>Saved foods</Label>}
          <FoodList foods={myFoods} onPick={setFood} />
          {recents.length > 0 && <Label>Recently eaten</Label>}
          <FoodList foods={recents} onPick={setFood} />
          {myFoods.length === 0 && recents.length === 0 && <P muted>Foods you scan or add will show up here.</P>}
        </View>
      )}

      {mode === 'quick' && <QuickAdd onDone={(f) => { setFood(f); saveFood(f); }} />}

      {busy && <ActivityIndicator color={C.text} style={{ marginTop: 16 }} />}
      {err && <Text style={{ color: C.danger, fontFamily: F.body, marginTop: 10 }}>{err}</Text>}
    </Screen>
  );
}

function FoodList({ foods, onPick }: { foods: Food[]; onPick: (f: Food) => void }) {
  return (
    <View>
      {foods.map((f, i) => (
        <Pressable key={(f.barcode ?? f.name) + i} onPress={() => onPick(f)} style={({ pressed }) => [st.row, pressed && { backgroundColor: C.card }]}>
          <View style={{ flex: 1 }}>
            <Text style={st.rowTitle} numberOfLines={2}>{f.name}</Text>
            <Text style={st.meta} numberOfLines={1}>
              {f.brand ? `${f.brand} · ` : ''}{Math.round(f.kcal_100)} kcal / 100 {f.unit ?? 'g'} · P {round(f.protein_100)} C {round(f.carbs_100)} F {round(f.fat_100)}
            </Text>
          </View>
          <Text style={{ color: C.faint, fontSize: 18 }}>›</Text>
        </Pressable>
      ))}
    </View>
  );
}

function QuickAdd({ onDone }: { onDone: (f: Food) => void }) {
  const [v, setV] = useState({ name: '', brand: '', kcal: '', p: '', c: '', f: '', per: '100' });
  const set = (k: keyof typeof v) => (t: string) => setV((x) => ({ ...x, [k]: t }));
  const num = (s: string) => Number(s.replace(',', '.')) || 0;
  return (
    <View style={{ gap: 4, marginTop: 10 }}>
      <P muted style={{ fontSize: 13 }}>Type what's on the label. Enter the numbers for the amount shown (usually per 100 g).</P>
      <Label>Food name</Label>
      <Input value={v.name} onChangeText={set('name')} placeholder="e.g. Chicken breast, cooked" />
      <Label>Brand (optional)</Label>
      <Input value={v.brand} onChangeText={set('brand')} placeholder="e.g. Tegel" />
      <Label>Numbers are per (g or ml)</Label>
      <Input value={v.per} onChangeText={set('per')} keyboardType="decimal-pad" />
      <Row style={{ gap: 8 }}>
        <View style={{ flex: 1, minWidth: 0 }}><Label>Calories</Label><Input value={v.kcal} onChangeText={set('kcal')} keyboardType="decimal-pad" placeholder="kcal" /></View>
        <View style={{ flex: 1, minWidth: 0 }}><Label>Protein g</Label><Input value={v.p} onChangeText={set('p')} keyboardType="decimal-pad" /></View>
      </Row>
      <Row style={{ gap: 8 }}>
        <View style={{ flex: 1, minWidth: 0 }}><Label>Carbs g</Label><Input value={v.c} onChangeText={set('c')} keyboardType="decimal-pad" /></View>
        <View style={{ flex: 1, minWidth: 0 }}><Label>Fat g</Label><Input value={v.f} onChangeText={set('f')} keyboardType="decimal-pad" /></View>
      </Row>
      <Button
        title="Continue"
        style={{ marginTop: 14 }}
        onPress={() => {
          const per = num(v.per) || 100;
          const k = 100 / per;
          onDone({
            name: v.name.trim() || 'My food', brand: v.brand.trim() || null, barcode: null,
            kcal_100: num(v.kcal) * k, protein_100: num(v.p) * k, carbs_100: num(v.c) * k, fat_100: num(v.f) * k,
            sugars_100: null, sat_fat_100: null, fibre_100: null, sodium_100: null,
            serving_g: per, serving_label: `${per} g`, unit: 'g', source: 'Added by me',
          });
        }}
      />
    </View>
  );
}

function Portion({
  food, meal, date, initialAmount, onBack, onSave,
}: { food: Food; meal: Meal; date: string; initialAmount?: number; onBack: () => void; onSave: (e: any) => Promise<void> }) {
  const serving = food.serving_g && food.serving_g > 0 ? food.serving_g : null;
  const [amount, setAmount] = useState(String(initialAmount ?? serving ?? 100));
  const [busy, setBusy] = useState(false);
  const grams = Number(amount.replace(',', '.')) || 0;
  const m = scaleFood(food, grams);
  const unit = food.unit ?? 'g';

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Portion' }} />
      <Eyebrow>{food.brand ? `${food.brand} · ` : ''}{food.source ?? 'Food'}</Eyebrow>
      <H1 style={{ fontSize: 30, lineHeight: 34 }}>{food.name}</H1>

      <Row wrap style={{ marginTop: 10 }}>
        {serving && <Chip label={`1 serving (${round(serving)} ${unit})`} active={grams === serving} onPress={() => setAmount(String(serving))} />}
        {serving && <Chip label="2 servings" active={grams === serving * 2} onPress={() => setAmount(String(serving * 2))} />}
        <Chip label={`100 ${unit}`} active={grams === 100} onPress={() => setAmount('100')} />
        <Chip label={`200 ${unit}`} active={grams === 200} onPress={() => setAmount('200')} />
      </Row>

      <Label>Amount ({unit})</Label>
      <Input value={amount} onChangeText={(t) => setAmount(t.replace(/[^0-9.,]/g, ''))} keyboardType="decimal-pad" />
      {food.serving_label && <P muted style={{ fontSize: 12 }}>Label serving: {food.serving_label}</P>}

      <View style={st.macros}>
        <Big label="Calories" value={`${m.kcal}`} unit="kcal" />
        <Row style={{ gap: 10, marginTop: 4 }}>
          <Big small label="Protein" value={`${m.protein_g}`} unit="g" />
          <Big small label="Carbs" value={`${m.carbs_g}`} unit="g" />
          <Big small label="Fat" value={`${m.fat_g}`} unit="g" />
        </Row>
        <Row wrap style={{ gap: 14, marginTop: 12 }}>
          {m.sugars_g != null && <Small label="Sugars" v={`${m.sugars_g} g`} />}
          {m.sat_fat_g != null && <Small label="Saturated fat" v={`${m.sat_fat_g} g`} />}
          {m.fibre_g != null && <Small label="Fibre" v={`${m.fibre_g} g`} />}
          {m.sodium_mg != null && <Small label="Sodium" v={`${m.sodium_mg} mg`} />}
        </Row>
      </View>

      <Button
        title={`Add to ${MEAL_LABELS[meal]}`}
        loading={busy}
        style={{ marginTop: 20 }}
        onPress={async () => {
          setBusy(true);
          try {
            await onSave({
              name: food.name, brand: food.brand ?? null, barcode: food.barcode ?? null,
              amount: grams, unit, serving_label: food.serving_label ?? null,
              ...m, source: food.source ?? null,
            });
          } finally { setBusy(false); }
        }}
      />
      <Button kind="secondary" title="Back" onPress={onBack} />
    </Screen>
  );
}

function Big({ label, value, unit, small }: { label: string; value: string; unit: string; small?: boolean }) {
  return (
    <View style={{ flex: small ? 1 : undefined, gap: 2 }}>
      <Text style={st.macroLabel}>{label}</Text>
      <Text style={[st.big, small && { fontSize: 22 }]}>{value}<Text style={st.bigUnit}> {unit}</Text></Text>
    </View>
  );
}
function Small({ label, v }: { label: string; v: string }) {
  return (
    <View>
      <Text style={st.macroLabel}>{label}</Text>
      <Text style={{ color: C.text, fontFamily: F.bodyMed, fontSize: 13 }}>{v}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  rowTitle: { color: C.text, fontFamily: F.bodySemi, fontSize: 14 },
  meta: { color: C.muted, fontFamily: F.body, fontSize: 12 },
  note: { borderLeftWidth: 2, borderLeftColor: C.borderStrong, paddingLeft: 12, gap: 6 },
  noteTitle: { color: C.text, fontFamily: F.bodySemi, fontSize: 14 },
  macros: { marginTop: 20, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: C.border, paddingVertical: 16, borderRadius: R.sm },
  macroLabel: { color: C.muted, fontFamily: F.bodySemi, fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase' },
  big: { color: C.text, fontFamily: F.display, fontSize: 38, letterSpacing: -1.2 },
  bigUnit: { color: C.muted, fontFamily: F.body, fontSize: 14, letterSpacing: 0 },
});
