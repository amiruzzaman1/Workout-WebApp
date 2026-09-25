import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button, Chip, Eyebrow, H1, hovered, Input, Label, P, Row, Screen, Section, smooth } from '../../../src/components/ui';
import { confirm } from '../../../src/lib/confirm';
import { libToFood, searchLibrary } from '../../../src/lib/foodData';
import { entryToFood, Food, round } from '../../../src/lib/nutrition';
import { searchFoods } from '../../../src/lib/off';
import { foodToItem, gramsOf, itemKcal, Recipe, RecipeItem, RecipeUnit, totalsOf, UNIT_LABEL, unitsFor } from '../../../src/lib/recipes';
import { useStore } from '../../../src/lib/store';
import { A, C, F, R } from '../../../src/lib/theme';

const num = (s: string) => Number(s.replace(',', '.')) || 0;

/** Pick how much of an ingredient goes in, in grams, spoons, cups or pieces, and see its calories straight away. */
function AmountStep({ name, item, onDone, onCancel, doneLabel }: {
  name: string; item: RecipeItem; onDone: (amount: number, unit: RecipeUnit) => void; onCancel: () => void; doneLabel: string;
}) {
  const wholePiece = item.pc === 100 && !item.d && item.unit === 'piece';
  const units: RecipeUnit[] = wholePiece ? ['piece'] : unitsFor(item);
  const [unit, setUnit] = useState<RecipeUnit>(units.includes(item.unit) ? item.unit : units[0]);
  const [amount, setAmount] = useState(String(item.amount || ''));
  const now: RecipeItem = { ...item, unit, amount: num(amount) };
  const g = gramsOf(now);
  const k = g / 100;
  return (
    <View style={s.amountBox}>
      <Text style={s.itemName} numberOfLines={2}>{name}</Text>
      <Label>How much</Label>
      <Row wrap style={{ gap: 6 }}>
        {units.map((u) => <Chip key={u} label={UNIT_LABEL[u]} active={unit === u} onPress={() => setUnit(u)} />)}
      </Row>
      <Input value={amount} onChangeText={(t) => setAmount(t.replace(/[^0-9.,]/g, ''))} keyboardType="decimal-pad" placeholder={unit === 'tbsp' ? 'e.g. 2' : 'amount'} autoFocus accessibilityLabel="Amount" style={{ marginTop: 8 }} />
      <Text style={s.meta}>
        {g > 0 ? `${Math.round(item.n.k * k)} kcal · P ${round(item.n.p * k, 1)} C ${round(item.n.c * k, 1)} F ${round(item.n.f * k, 1)}${unit !== 'g' ? ` · about ${round(g, g < 10 ? 1 : 0)} g` : ''}` : 'Type an amount'}
      </Text>
      <Row style={{ gap: 8, marginTop: 10 }}>
        <Button small icon="checkmark" title={doneLabel} onPress={() => num(amount) > 0 && onDone(num(amount), unit)} disabled={!(num(amount) > 0)} />
        <Button small kind="secondary" title="Cancel" onPress={onCancel} />
      </Row>
    </View>
  );
}

/** Search your foods, the built in Indian, Bangladeshi and spice lists, and the online database for an ingredient. */
function IngredientSearch({ onPick }: { onPick: (f: Food) => void }) {
  const { myFoods, sharedFoods, foodEntries } = useStore();
  const [q, setQ] = useState('');
  const [online, setOnline] = useState<Food[]>([]);
  const [busy, setBusy] = useState(false);
  const cache = useRef(new Map<string, Food[]>());
  const reqId = useRef(0);
  const term = q.trim().toLowerCase();

  useEffect(() => {
    const id = ++reqId.current;
    if (term.length < 3) { setOnline([]); setBusy(false); return; }
    const cached = cache.current.get(term);
    if (cached) { setOnline(cached); setBusy(false); return; }
    setBusy(true);
    const t = setTimeout(async () => {
      try {
        const r = await searchFoods(term);
        cache.current.set(term, r);
        if (id === reqId.current) setOnline(r);
      } catch {
        if (id === reqId.current) setOnline([]);
      } finally {
        if (id === reqId.current) setBusy(false);
      }
    }, 500);
    return () => clearTimeout(t);
  }, [term]);

  const spice = useMemo(() => searchLibrary(q, ['ingredient'], 6).map(libToFood), [q]);
  const south = useMemo(() => searchLibrary(q, ['dish', 'bangladesh'], 6).map(libToFood), [q]);
  const mine = useMemo(() => {
    if (!term) return [];
    const words = term.split(/\s+/);
    const seen = new Set<string>();
    const recents = [...foodEntries].reverse().slice(0, 200).map(entryToFood);
    return [...sharedFoods, ...myFoods, ...recents].filter((f) => {
      const key = (f.name + (f.brand ?? '')).toLowerCase();
      if (seen.has(key) || !words.every((w) => key.includes(w))) return false;
      seen.add(key);
      return true;
    }).slice(0, 5);
  }, [term, sharedFoods, myFoods, foodEntries]);

  const Group = ({ title, foods }: { title: string; foods: Food[] }) => foods.length === 0 ? null : (
    <View style={{ marginTop: 6 }}>
      <Text style={s.panelLabel}>{title}</Text>
      {foods.map((f, i) => (
        <Pressable key={f.name + i} onPress={() => onPick(f)} accessibilityRole="button" style={(p) => [s.pick, smooth, (p.pressed || hovered(p)) && { backgroundColor: C.card2 }]}>
          <View style={{ flex: 1 }}>
            <Text style={s.pickName} numberOfLines={2}>{f.name}</Text>
            <Text style={s.meta} numberOfLines={1}>{f.brand ? `${f.brand} · ` : ''}{Math.round(f.kcal_100)} kcal / {f.unit === 'piece' ? 'piece' : `100 ${f.unit ?? 'g'}`}</Text>
          </View>
          <Ionicons name="add-circle-outline" size={20} color={C.muted} />
        </Pressable>
      ))}
    </View>
  );

  return (
    <View>
      <View>
        <Ionicons name="search" size={18} color={C.muted} style={{ position: 'absolute', left: 13, top: 15, zIndex: 1 }} />
        <Input value={q} onChangeText={setQ} placeholder="Search, e.g. olive oil, turmeric, okra, hilsa" style={{ paddingLeft: 40 }} accessibilityLabel="Search ingredients" />
      </View>
      {!term && <P muted style={{ fontSize: 12, marginTop: 6 }}>Oils, salt, spices, vegetables, meat, rice, dal, milk and more are built in, with calories worked out from the amount. You can also search Bangladeshi and Indian foods, your own foods and the online database.</P>}
      <Group title="Ingredients and spices" foods={spice} />
      <Group title="South Asian dishes and foods" foods={south} />
      <Group title="Your foods" foods={mine} />
      {term.length >= 3 && (online.length > 0 || busy) && <Group title={`Online${busy ? ' · searching' : ''}`} foods={online.slice(0, 6)} />}
      {busy && online.length === 0 && <ActivityIndicator color={C.text} style={{ marginTop: 8 }} />}
    </View>
  );
}

export default function RecipeScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const { recipes, saveRecipe, deleteRecipe } = useStore();
  const existing = id ? recipes.find((r) => r.id === id) : undefined;

  const [name, setName] = useState(existing?.name ?? '');
  const [servings, setServings] = useState(existing ? String(existing.servings) : '1');
  const [cooked, setCooked] = useState(existing?.cooked_g ? String(existing.cooked_g) : '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [items, setItems] = useState<RecipeItem[]>(existing?.items ?? []);
  const [picked, setPicked] = useState<Food | null>(null);
  const [editing, setEditing] = useState<number | null>(null);
  const [adding, setAdding] = useState(!existing);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // The recipe may still be loading when this screen opens.
  const [synced, setSynced] = useState(!!existing || !id);
  useEffect(() => {
    if (synced || !existing) return;
    setName(existing.name); setServings(String(existing.servings)); setCooked(existing.cooked_g ? String(existing.cooked_g) : '');
    setNotes(existing.notes ?? ''); setItems(existing.items); setAdding(false); setSynced(true);
  }, [existing, synced]);

  const sv = Math.max(0.01, num(servings) || 1);
  const t = totalsOf(items);
  const per = (v: number | null) => (v == null ? null : v / sv);

  function addPicked(amount: number, unit: RecipeUnit) {
    if (!picked) return;
    const isPiece = picked.unit === 'piece';
    setItems((l) => [...l, foodToItem(picked, amount, isPiece ? 'piece' : unit)]);
    setPicked(null);
    setAdding(false);
  }

  async function save() {
    setError(null);
    if (!name.trim()) return setError('Give the recipe a name.');
    if (items.length === 0) return setError('Add at least one ingredient.');
    setBusy(true);
    try {
      await saveRecipe({ id: existing?.id, name: name.trim(), servings: sv, cooked_g: num(cooked) > 0 ? num(cooked) : null, items, notes: notes.trim() || null });
      router.back();
    } catch (e: any) {
      setError(e?.message ?? 'Could not save. Check your connection and try again.');
      setBusy(false);
    }
  }

  async function remove() {
    if (!existing) return;
    if (await confirm('Delete this recipe?', `${existing.name} will be removed. Meals you already logged with it stay.`, { confirmText: 'Delete', danger: true })) {
      await deleteRecipe(existing.id);
      router.back();
    }
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: '' }} />
      <Eyebrow>Recipes and usuals</Eyebrow>
      <H1>{existing ? 'Edit recipe' : 'New recipe'}</H1>
      <P muted style={{ fontSize: 13, lineHeight: 19 }}>List what goes in, like 2 tbsp of olive oil, a teaspoon of turmeric and 300 g of okra. The calories, protein and the rest are worked out for you. A single food you always have, like a glass of milk, works too.</P>

      <View style={s.form}>
        <Label>Name</Label>
        <Input value={name} onChangeText={setName} placeholder="e.g. Okra curry, or Morning milk" accessibilityLabel="Recipe name" />
        <Row style={{ gap: 10, alignItems: 'flex-start' }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Label>Servings it makes</Label>
            <Input value={servings} onChangeText={(v) => setServings(v.replace(/[^0-9.,]/g, ''))} keyboardType="decimal-pad" accessibilityLabel="Servings" />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Label>Cooked weight g (optional)</Label>
            <Input value={cooked} onChangeText={(v) => setCooked(v.replace(/[^0-9.,]/g, ''))} keyboardType="decimal-pad" placeholder="e.g. 900" accessibilityLabel="Cooked weight" />
          </View>
        </Row>
        <P muted style={{ fontSize: 12, marginTop: 4 }}>With a cooked weight you can log it by grams as well as by serving. Without one you log it by serving.</P>
      </View>

      <Section title="Ingredients" icon="list" color={A.carbs} right={<Text style={s.meta}>{items.length ? `${Math.round(t.kcal)} kcal in total` : ''}</Text>}>
        <View>
          {items.map((it, i) => (
            editing === i ? (
              <AmountStep
                key={i} name={it.name} item={it} doneLabel="Save"
                onCancel={() => setEditing(null)}
                onDone={(amount, unit) => { setItems((l) => l.map((x, j) => (j === i ? { ...x, amount, unit } : x))); setEditing(null); }}
              />
            ) : (
              <View key={i} style={s.row}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.itemName} numberOfLines={2}>{it.name}</Text>
                  <Text style={s.meta} numberOfLines={1}>{round(it.amount, 2)} {UNIT_LABEL[it.unit]}  · {itemKcal(it)} kcal</Text>
                </View>
                <Pressable onPress={() => setEditing(i)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Edit ${it.name}`} style={(p) => [{ padding: 5, borderRadius: 999 }, smooth, hovered(p) && { backgroundColor: A.carbs + '22' }]}>
                  {(p: any) => <Ionicons name="create-outline" size={17} color={hovered(p) ? A.carbs : C.faint} />}
                </Pressable>
                <Pressable onPress={() => setItems((l) => l.filter((_, j) => j !== i))} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Remove ${it.name}`} style={(p) => [{ padding: 5, borderRadius: 999 }, smooth, hovered(p) && { backgroundColor: A.over + '22' }]}>
                  {(p: any) => <Ionicons name="trash-outline" size={16} color={hovered(p) ? A.over : C.faint} />}
                </Pressable>
              </View>
            )
          ))}
          {items.length === 0 && !adding && <P muted style={{ fontSize: 13 }}>No ingredients yet.</P>}
        </View>

        {picked ? (
          <AmountStep
            name={picked.name} doneLabel="Add to recipe"
            item={{ ...foodToItem(picked, 0, picked.unit === 'piece' ? 'piece' : 'g') }}
            onCancel={() => setPicked(null)} onDone={addPicked}
          />
        ) : adding ? (
          <View style={s.form}>
            <IngredientSearch onPick={setPicked} />
            {items.length > 0 && <Button small kind="secondary" title="Close search" onPress={() => setAdding(false)} style={{ alignSelf: 'flex-start', marginTop: 10 }} />}
          </View>
        ) : (
          <Button kind="secondary" icon="add-circle-outline" tint={A.carbs} title="Add an ingredient" onPress={() => setAdding(true)} style={{ alignSelf: 'flex-start' }} />
        )}
      </Section>

      {items.length > 0 && (
        <Section title={sv === 1 ? 'Nutrition' : 'Nutrition per serving'} icon="nutrition" color={A.up}>
          <View style={s.totals}>
            <Text style={s.big}>{Math.round(t.kcal / sv)}<Text style={s.unit}> kcal</Text></Text>
            <Row style={{ gap: 10, marginTop: 6 }}>
              <Stat label="Protein" v={`${round(t.protein / sv, 1)} g`} />
              <Stat label="Carbs" v={`${round(t.carbs / sv, 1)} g`} />
              <Stat label="Fat" v={`${round(t.fat / sv, 1)} g`} />
            </Row>
            <Row wrap style={{ gap: 14, marginTop: 12 }}>
              {per(t.sugars) != null && <Stat label="Sugars" v={`${round(per(t.sugars)!, 1)} g`} small />}
              {per(t.satFat) != null && <Stat label="Saturated fat" v={`${round(per(t.satFat)!, 1)} g`} small />}
              {per(t.fibre) != null && <Stat label="Fibre" v={`${round(per(t.fibre)!, 1)} g`} small />}
              {per(t.sodium) != null && <Stat label="Sodium" v={`${Math.round(per(t.sodium)!)} mg`} small />}
            </Row>
            {sv !== 1 && <Text style={[s.meta, { marginTop: 10 }]}>Whole recipe: {Math.round(t.kcal)} kcal, {round(t.protein, 0)} g protein, {round(t.carbs, 0)} g carbs, {round(t.fat, 0)} g fat, {Math.round(t.grams)} g of ingredients.</Text>}
            <Text style={[s.meta, { marginTop: 6 }]}>Worked out from the amounts above. Cooking oil left in the pan and water lost while cooking are not counted.</Text>
          </View>
        </Section>
      )}

      <Label>Notes (optional)</Label>
      <Input value={notes} onChangeText={setNotes} placeholder="e.g. cook on low heat for 20 minutes" multiline style={{ minHeight: 60 }} accessibilityLabel="Notes" />

      {!!error && <Text style={{ color: C.danger, fontFamily: F.body, marginTop: 10 }}>{error}</Text>}
      <Button icon="checkmark" title="Save recipe" onPress={save} loading={busy} style={{ marginTop: 18 }} />
      {existing && <Button kind="secondary" icon="trash-outline" tint={A.over} title="Delete recipe" onPress={remove} />}
    </Screen>
  );
}

function Stat({ label, v, small }: { label: string; v: string; small?: boolean }) {
  return (
    <View style={small ? undefined : { flex: 1 }}>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={small ? s.smallV : s.statV}>{v}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  form: { backgroundColor: C.card, borderWidth: 1, borderColor: C.borderStrong, borderRadius: R.lg, padding: 16, gap: 2, marginTop: 8 },
  amountBox: { backgroundColor: C.card, borderWidth: 1, borderColor: A.carbs, borderRadius: R.lg, padding: 14, gap: 4, marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, marginBottom: 10, backgroundColor: C.card, borderRadius: R.lg, borderWidth: 1, borderColor: C.border, borderTopWidth: 2, borderTopColor: A.carbs },
  itemName: { color: C.text, fontFamily: F.bodySemi, fontSize: 15 },
  meta: { color: C.muted, fontFamily: F.body, fontSize: 12, lineHeight: 18 },
  panelLabel: { color: C.muted, fontFamily: F.bodySemi, fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase', marginTop: 8 },
  pick: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  pickName: { color: C.text, fontFamily: F.bodyMed, fontSize: 14 },
  totals: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: R.lg, padding: 16 },
  big: { color: C.text, fontFamily: F.display, fontSize: 24, letterSpacing: -0.8 },
  unit: { color: C.muted, fontFamily: F.body, fontSize: 14, letterSpacing: 0 },
  statLabel: { color: C.muted, fontFamily: F.bodySemi, fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase' },
  statV: { color: C.text, fontFamily: F.display, fontSize: 18, letterSpacing: -0.4 },
  smallV: { color: C.text, fontFamily: F.bodyMed, fontSize: 13 },
});
