import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { dayLabel } from '../../../src/components/AppHeader';
import { BarcodeScanner } from '../../../src/components/BarcodeScanner';
import { Button, Chip, Eyebrow, H1, hovered, IconBadge, Input, Label, P, Row, Screen, smooth } from '../../../src/components/ui';
import { MEAL_STYLE } from '../../../src/lib/meals';
import { computeTargets, fmtAmount, Food, FoodEntry, MEAL_LABELS, MEALS, Meal, round, scaleFood } from '../../../src/lib/nutrition';
import { lookupBarcode, searchFoods } from '../../../src/lib/off';
import { todayISO } from '../../../src/lib/progress';
import { useStore } from '../../../src/lib/store';
import { A, C, F, R } from '../../../src/lib/theme';

type Mode = 'scan' | 'search' | 'mine' | 'quick';

/** A sensible starting meal for the time of day, until you pick one. */
function mealForNow(): Meal {
  const h = new Date().getHours();
  return h < 11 ? 'breakfast' : h < 16 ? 'lunch' : h < 21 ? 'dinner' : 'snack';
}

/** Lower case, no apostrophes or hyphens, so "Pam's" matches "pams". */
const normText = (t: string) => t.toLowerCase().replace(/['\u2019`-]/g, '');
const foodKey = (f: Food) => normText(f.name + (f.brand ?? ''));

/** "Added by you", "Edited by someone else" and so on, with a caution sign when it was not you. */
function sharedLabel(f: Food) {
  if (!f.shared) return '';
  const who = f.shared.by === 'you' ? 'you' : 'someone else';
  return `${f.shared.action === 'added' ? 'Added' : 'Edited'} by ${who}${f.shared.by === 'you' ? '' : ' \u26A0\uFE0F'}`;
}

/** Rebuilds a Food from a logged entry's saved totals, so picking it again scales from the same numbers. */
function entryToFood(e: FoodEntry): Food {
  const amount = Number(e.amount) || (e.unit === 'piece' ? 1 : 100);
  const k = e.unit === 'piece' ? 1 / amount : 100 / amount;
  return {
    name: e.name, brand: e.brand, barcode: e.barcode,
    kcal_100: Number(e.kcal) * k, protein_100: Number(e.protein_g) * k, carbs_100: Number(e.carbs_g) * k,
    sugars_100: e.sugars_g == null ? null : Number(e.sugars_g) * k,
    fat_100: Number(e.fat_g) * k,
    sat_fat_100: e.sat_fat_g == null ? null : Number(e.sat_fat_g) * k,
    fibre_100: e.fibre_g == null ? null : Number(e.fibre_g) * k,
    sodium_100: e.sodium_mg == null ? null : Number(e.sodium_mg) * k,
    serving_g: null, serving_label: e.serving_label, unit: e.unit, source: e.source,
  };
}

export default function AddFood() {
  const { meal: mealParam, date: dateParam, edit } = useLocalSearchParams<{ meal?: Meal; date?: string; edit?: string }>();
  const router = useRouter();
  const { myFoods, foodEntries, addFoodEntry, updateFoodEntry, saveFood, sharedFoods, addSharedFood, updateSharedFood, date: selectedDate } = useStore();
  const date = dateParam ?? selectedDate;
  const editing = edit ? foodEntries.find((e) => e.id === edit) : undefined;
  const [meal, setMeal] = useState<Meal>(() => (MEALS.includes(mealParam as Meal) ? (mealParam as Meal) : (editing?.meal as Meal) ?? mealForNow()));

  const [mode, setMode] = useState<Mode>('search');
  const [food, setFood] = useState<Food | null>(null);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Food[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [notFound, setNotFound] = useState<string | null>(null);
  const [editShared, setEditShared] = useState<Food | null>(null);
  const [notFoundCode, setNotFoundCode] = useState<string | null>(null);

  // Editing an entry: rebuild a food from the saved per-portion numbers.
  useEffect(() => {
    if (!editing) return;
    setFood(entryToFood(editing));
  }, [edit]);

  const recents = useMemo(() => {
    const seen = new Set<string>();
    const out: Food[] = [];
    for (let i = foodEntries.length - 1; i >= 0 && out.length < 25; i--) {
      const e = foodEntries[i];
      const key = (e.name + (e.brand ?? '')).toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(entryToFood(e));
    }
    return out;
  }, [foodEntries]);

  async function onBarcode(code: string) {
    setBusy(true); setErr(null); setNotFound(null);
    try {
      const f = await lookupBarcode(code);
      const digits = code.replace(/\D/g, '');
      const userFood = f ? null : sharedFoods.find((x) => x.barcode === digits);
      if (userFood) setFood(userFood);
      else if (!f) { setNotFound(digits); setNotFoundCode(digits); }
      else { setFood(f); saveFood(f); }
    } catch (e: any) {
      setErr(e.message ?? 'Lookup failed. Check your connection.');
    } finally { setBusy(false); }
  }

  // Suggestions appear while you type. Waits for a short pause so the free food database isn't hammered.
  const cache = useRef(new Map<string, Food[]>());
  const reqId = useRef(0);
  useEffect(() => {
    if (mode !== 'search') return;
    const term = q.trim().toLowerCase();
    const id = ++reqId.current;
    if (term.length < 3) { setResults([]); setBusy(false); setErr(null); return; }
    const cached = cache.current.get(term);
    if (cached) { setResults(cached); setBusy(false); setErr(null); return; }
    setBusy(true);
    const t = setTimeout(async () => {
      try {
        const r = await searchFoods(term);
        cache.current.set(term, r);
        if (id === reqId.current) { setResults(r); setErr(null); }
      } catch (e: any) {
        if (id === reqId.current) setErr('Could not reach the food database right now.');
      } finally {
        if (id === reqId.current) setBusy(false);
      }
    }, 500);
    return () => clearTimeout(t);
  }, [q, mode]);

  // Foods users added. The ones you added or edited come first. With nothing typed, only yours show.
  const sharedHits = useMemo(() => {
    const words = normText(q).split(/\s+/).filter(Boolean);
    const list = sharedFoods.filter((f) => (words.length ? words.every((w) => normText(`${f.name} ${f.brand ?? ''}`).includes(w)) : f.shared?.by === 'you'));
    const mine = list.filter((f) => f.shared?.by === 'you');
    return [...mine, ...list.filter((f) => f.shared?.by !== 'you')].slice(0, 10);
  }, [q, sharedFoods]);

  // Foods you already know show up straight away, before the online results arrive.
  const local = useMemo(() => {
    const term = normText(q.trim());
    const shared = new Set(sharedFoods.map(foodKey));
    const pool = [...myFoods, ...recents].filter((f) => !shared.has(foodKey(f)));
    if (!term) return recents.filter((f) => !shared.has(foodKey(f))).slice(0, 8);
    const seen = new Set<string>();
    return pool.filter((f) => {
      const key = foodKey(f);
      if (seen.has(key) || !normText(`${f.name} ${f.brand ?? ''}`).includes(term)) return false;
      seen.add(key);
      return true;
    }).slice(0, 5);
  }, [q, myFoods, recents, sharedFoods]);
  const online = useMemo(() => {
    const known = new Set(local.map((f) => (f.name + (f.brand ?? '')).toLowerCase()));
    return results.filter((f) => !known.has((f.name + (f.brand ?? '')).toLowerCase()));
  }, [results, local]);

  if (editShared) {
    return (
      <Screen>
        <Stack.Screen options={{ headerShown: false }} />
        <Eyebrow>Edit food</Eyebrow>
        <H1>{editShared.name}</H1>
        <View style={st.warn}>
          <Text style={st.warnText}>{'\u26A0\uFE0F'} Everyone using the app sees your changes, so please check the numbers against the label.</Text>
        </View>
        <QuickAdd
          initial={editShared}
          submitLabel="Save changes"
          onCancel={() => setEditShared(null)}
          onDone={async (f) => {
            const updated = await updateSharedFood(editShared.id!, f);
            setFood(updated);
            setEditShared(null);
          }}
        />
      </Screen>
    );
  }

  if (food) {
    return (
      <Portion
        food={food}
        meal={meal}
        onMeal={setMeal}
        date={String(date)}
        initialAmount={editing ? Number(editing.amount) : undefined}
        onBack={() => (editing ? router.back() : setFood(null))}
        onEdit={food.shared ? () => setEditShared(food) : undefined}
        onSave={async (entry) => {
          if (editing) await updateFoodEntry(editing.id, { ...entry, meal });
          else await addFoodEntry({ ...entry, eaten_on: String(date), meal } as any);
          router.back();
        }}
      />
    );
  }

  const MODES: [Mode, string, React.ComponentProps<typeof Ionicons>['name']][] = [['search', 'Search', 'search'], ['scan', 'Scan', 'barcode-outline'], ['mine', 'My foods', 'bookmark-outline'], ['quick', 'Quick add', 'add-circle-outline']];

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ gap: 2 }}>
        <Eyebrow>Logging food for</Eyebrow>
        <H1>{dayLabel(String(date))}</H1>
      </View>

      <View style={st.step}>
        <StepHead title="Meal" icon="time-outline" color={A.carbs} />
        <MealPicker meal={meal} onMeal={setMeal} />
      </View>

      <View style={st.step}>
        <StepHead title="Food" icon="nutrition-outline" color={A.up} />
        <View style={st.tabs} accessibilityRole="tablist">
          {MODES.map(([k, label, icon]) => (
            <Pressable key={k} onPress={() => setMode(k)} accessibilityRole="tab" accessibilityState={{ selected: mode === k }} style={(p) => [st.tab, smooth, hovered(p) && mode !== k && { backgroundColor: C.card2 }, mode === k && st.tabOn]}>
              <Ionicons name={icon} size={17} color={mode === k ? A.carbs : C.muted} />
              <Text style={[st.tabText, mode === k && { color: C.text }]} numberOfLines={1}>{label}</Text>
            </Pressable>
          ))}
        </View>

        {mode === 'scan' && (
          <View style={{ gap: 12 }}>
            <BarcodeScanner onCode={onBarcode} onCancel={() => setMode('search')} />
            {notFound && (
              <View style={st.note}>
                <Text style={st.noteTitle}>We don't have this one yet 👉👈🥺</Text>
                <P muted style={{ fontSize: 13 }}>Barcode {notFound} isn't in the database. Would you add it for us? Everyone using the app can then find it.</P>
                <Button small kind="secondary" icon="add-circle-outline" tint={A.carbs} title="Add this food" onPress={() => { setMode('quick'); setNotFound(null); }} style={{ alignSelf: 'flex-start' }} />
              </View>
            )}
          </View>
        )}

        {mode === 'search' && (
          <View style={{ gap: 10 }}>
            <View>
              <Ionicons name="search" size={18} color={C.muted} style={{ position: 'absolute', left: 13, top: 15, zIndex: 1 }} />
              <Input value={q} onChangeText={setQ} placeholder="Search, e.g. weet-bix or pams tuna" autoFocus returnKeyType="search" style={{ paddingLeft: 40 }} accessibilityLabel="Search foods" />
            </View>
            {sharedHits.length > 0 && (
              <View style={st.panel}>
                <Text style={st.panelLabel}>{q.trim() ? 'User added foods' : 'Added or edited by you'}</Text>
                <FoodList foods={sharedHits} onPick={setFood} />
              </View>
            )}
            {local.length > 0 && (
              <View style={st.panel}>
                <Text style={st.panelLabel}>{q.trim() ? 'Your foods' : 'Recently eaten'}</Text>
                <FoodList foods={local} onPick={setFood} />
              </View>
            )}
            {q.trim().length >= 3 && (online.length > 0 || busy) && (
              <View style={st.panel}>
                <Text style={st.panelLabel}>Suggestions{busy ? ' · searching' : ''}</Text>
                <FoodList foods={online} onPick={setFood} />
              </View>
            )}
            {q.trim().length >= 3 && !busy && online.length === 0 && local.length === 0 && sharedHits.length === 0 && (
              <View style={st.note}>
                <Text style={st.noteTitle}>{err ? 'Search is not working right now' : `Can't find "${q.trim()}"`} 👉👈🥺</Text>
                <P muted style={{ fontSize: 13 }}>
                  {err ? 'Check your connection and try again, or ' : ''}
                  {err ? 'add it yourself.' : 'Pretty please add it yourself.'} Everyone using the app can then find it.
                </P>
                <Button small kind="secondary" icon="add-circle-outline" tint={A.carbs} title="Add this food" onPress={() => setMode('quick')} style={{ alignSelf: 'flex-start' }} />
              </View>
            )}
            <P muted style={{ fontSize: 12 }}>Products sold in New Zealand are listed first.</P>
          </View>
        )}

        {mode === 'mine' && (
          <View style={{ gap: 10 }}>
            {sharedFoods.some((f) => f.shared?.by === 'you') && <Label>Added or edited by you</Label>}
            <FoodList foods={sharedFoods.filter((f) => f.shared?.by === 'you')} onPick={setFood} />
            {myFoods.length > 0 && <Label>Saved foods</Label>}
            <FoodList foods={myFoods} onPick={setFood} />
            {recents.length > 0 && <Label>Recently eaten</Label>}
            <FoodList foods={recents} onPick={setFood} />
            {myFoods.length === 0 && recents.length === 0 && !sharedFoods.some((f) => f.shared?.by === 'you') && <P muted>Foods you scan or add will show up here.</P>}
          </View>
        )}

        {mode === 'quick' && <QuickAdd initialName={q.trim()} initialBarcode={notFoundCode} onDone={async (f) => { setFood(await addSharedFood(f)); }} />}

        {busy && mode !== 'search' && <ActivityIndicator color={C.text} style={{ marginTop: 8 }} />}
        {err && (mode !== 'search' || online.length > 0 || local.length > 0) && <Text style={{ color: C.danger, fontFamily: F.body }}>{err}</Text>}
      </View>
    </Screen>
  );
}

function StepHead({ title, icon, color }: { title: string; icon: React.ComponentProps<typeof Ionicons>['name']; color: string }) {
  return (
    <Row style={{ gap: 10 }}>
      <IconBadge name={icon} color={color} size={32} />
      <Text style={st.stepTitle}>{title}</Text>
    </Row>
  );
}

/** One row of four buttons, joined together, so it looks nothing like the food search below it. */
function MealPicker({ meal, onMeal }: { meal: Meal; onMeal: (m: Meal) => void }) {
  return (
    <View style={st.seg} accessibilityRole="radiogroup">
      {MEALS.map((m, i) => {
        const on = meal === m;
        return (
          <Pressable
            key={m}
            onPress={() => onMeal(m)}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            style={(p) => [st.segItem, smooth, i > 0 && st.segDivider, hovered(p) && !on && { backgroundColor: C.card2 }, on && st.segOn]}
          >
            <Ionicons name={MEAL_STYLE[m].icon} size={18} color={on ? C.inverseText : MEAL_STYLE[m].color} />
            <Text style={[st.segText, on && { color: C.inverseText }]} numberOfLines={1}>{MEAL_LABELS[m]}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function FoodList({ foods, onPick }: { foods: Food[]; onPick: (f: Food) => void }) {
  return (
    <View>
      {foods.map((f, i) => (
        <Pressable key={(f.barcode ?? f.name) + i} onPress={() => onPick(f)} accessibilityRole="button" style={(p) => [st.row, smooth, (p.pressed || hovered(p)) && { backgroundColor: C.card2 }]}>
          <View style={{ flex: 1 }}>
            <Text style={st.rowTitle} numberOfLines={2}>{f.name}</Text>
            <Text style={st.meta} numberOfLines={1}>
              {f.brand ? `${f.brand} · ` : ''}{Math.round(f.kcal_100)} kcal {f.unit === 'piece' ? `/ ${f.serving_label || 'piece'}` : `/ 100 ${f.unit ?? 'g'}`} · P {round(f.protein_100)} C {round(f.carbs_100)} F {round(f.fat_100)}
            </Text>
            {!!f.shared && (
              <Text style={[st.who, { color: f.shared.by === 'you' ? C.muted : A.carbs }]}>{sharedLabel(f)}</Text>
            )}
          </View>
          <Ionicons name="chevron-forward" size={18} color={C.faint} />
        </Pressable>
      ))}
    </View>
  );
}

type Basis = 'weight' | 'piece';
type PerUnit = 'g' | 'ml' | 'kg' | 'L';

function QuickAdd({ onDone, initialName = '', initialBarcode = null, initial, submitLabel = 'Continue', onCancel }: {
  onDone: (f: Food) => void | Promise<void>; initialName?: string; initialBarcode?: string | null; initial?: Food; submitLabel?: string; onCancel?: () => void;
}) {
  const fmt = (n: number | null | undefined) => (n == null ? '' : String(Math.round(Number(n) * 10) / 10));
  const [basis, setBasis] = useState<Basis>(initial?.unit === 'piece' ? 'piece' : 'weight');
  const [perUnit, setPerUnit] = useState<PerUnit>(initial?.unit === 'ml' ? 'ml' : 'g');
  const [v, setV] = useState({
    name: initial?.name ?? initialName, brand: initial?.brand ?? '',
    kcal: fmt(initial?.kcal_100), p: fmt(initial?.protein_100), c: fmt(initial?.carbs_100), f: fmt(initial?.fat_100), per: '100',
    sugars: fmt(initial?.sugars_100), satFat: fmt(initial?.sat_fat_100), fibre: fmt(initial?.fibre_100), sodium: fmt(initial?.sodium_100),
    pieceLabel: initial?.unit === 'piece' ? initial?.serving_label ?? '' : '',
  });
  const [showMore, setShowMore] = useState(!!(initial?.fibre_100 || initial?.sodium_100));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof v) => (t: string) => setV((x) => ({ ...x, [k]: t }));
  const num = (s: string) => Number(s.replace(',', '.')) || 0;
  const numOrNull = (s: string) => (s.trim() ? num(s) : null);

  async function submit() {
    const isPiece = basis === 'piece';
    // Bulk foods are sometimes labelled per kg or per litre; convert to the per 100 g/ml the app stores.
    const per = isPiece ? 1 : num(v.per) || 100;
    const perBase = perUnit === 'kg' || perUnit === 'L' ? per * 1000 : per;
    const k = isPiece ? 1 : 100 / perBase;
    const unit = isPiece ? 'piece' : perUnit === 'kg' ? 'g' : perUnit === 'L' ? 'ml' : perUnit;
    const pieceLabel = v.pieceLabel.trim();
    const food: Food = {
      name: v.name.trim() || 'My food', brand: v.brand.trim() || null, barcode: initial?.barcode ?? initialBarcode ?? null,
      kcal_100: num(v.kcal) * k, protein_100: num(v.p) * k, carbs_100: num(v.c) * k, fat_100: num(v.f) * k,
      sugars_100: numOrNull(v.sugars) == null ? null : numOrNull(v.sugars)! * k,
      sat_fat_100: numOrNull(v.satFat) == null ? null : numOrNull(v.satFat)! * k,
      fibre_100: numOrNull(v.fibre) == null ? null : numOrNull(v.fibre)! * k,
      sodium_100: numOrNull(v.sodium) == null ? null : numOrNull(v.sodium)! * k,
      serving_g: isPiece ? null : (initial ? initial.serving_g ?? null : perBase),
      serving_label: isPiece ? (pieceLabel || '1 piece') : (initial ? initial.serving_label ?? null : `${per} ${perUnit}`),
      unit, source: 'User added',
    };
    const capName = isPiece ? 'one piece' : `100 ${unit}`;
    if (food.kcal_100 > (isPiece ? 3000 : 1000) || (!isPiece && (food.protein_100 > 100 || food.carbs_100 > 100 || food.fat_100 > 100))) {
      setError(`Those numbers look too high for ${capName}. Double check what you typed.`);
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await onDone(food);
    } catch (e: any) {
      setError(e?.message ?? 'Could not save. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={{ gap: 4 }}>
      <P muted style={{ fontSize: 13 }}>Type what's on the label. Everyone using the app will see this food, so please double check the numbers.</P>
      <Label>Food name</Label>
      <Input value={v.name} onChangeText={set('name')} placeholder="e.g. Chicken breast, cooked" />
      <Label>Brand (optional)</Label>
      <Input value={v.brand} onChangeText={set('brand')} placeholder="e.g. Tegel" />

      <Label>How is it measured?</Label>
      <Seg
        value={basis} onChange={setBasis}
        options={[['weight', 'By weight'], ['piece', 'Whole item']]}
      />

      {basis === 'weight' ? (
        <>
          <Label>Numbers are per</Label>
          <Row style={{ gap: 8 }}>
            <View style={{ flex: 1, minWidth: 0 }}><Input value={v.per} onChangeText={set('per')} keyboardType="decimal-pad" /></View>
            <View style={{ flex: 1.4, minWidth: 0 }}>
              <Seg value={perUnit} onChange={setPerUnit} options={[['g', 'g'], ['ml', 'ml'], ['kg', 'kg'], ['L', 'L']]} />
            </View>
          </Row>
        </>
      ) : (
        <>
          <Label>What is one piece? (optional)</Label>
          <Input value={v.pieceLabel} onChangeText={set('pieceLabel')} placeholder="e.g. 1 kebab, 1 slice, 1 can" />
          <P muted style={{ fontSize: 12 }}>The numbers below are for one whole piece, however big it really is, not for a weight.</P>
        </>
      )}

      <Row style={{ gap: 8 }}>
        <View style={{ flex: 1, minWidth: 0 }}><Label>Calories</Label><Input value={v.kcal} onChangeText={set('kcal')} keyboardType="decimal-pad" placeholder="kcal" /></View>
        <View style={{ flex: 1, minWidth: 0 }}><Label>Protein g</Label><Input value={v.p} onChangeText={set('p')} keyboardType="decimal-pad" /></View>
      </Row>
      <Row style={{ gap: 8, alignItems: 'flex-start' }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Label>Carbs g</Label>
          <Input value={v.c} onChangeText={set('c')} keyboardType="decimal-pad" />
          <SubField label="Sugars g" value={v.sugars} onChangeText={set('sugars')} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Label>Fat g</Label>
          <Input value={v.f} onChangeText={set('f')} keyboardType="decimal-pad" />
          <SubField label="Saturated g" value={v.satFat} onChangeText={set('satFat')} />
        </View>
      </Row>
      <P muted style={{ fontSize: 11, marginTop: 2 }}>Sugars and saturated are part of the carbs and fat above, not extra, so on the label look for "of which sugars" and "of which saturates".</P>

      <Pressable onPress={() => setShowMore((s) => !s)} accessibilityRole="button" style={(p) => [st.moreRow, smooth, hovered(p) && { backgroundColor: C.card2 }]}>
        <Ionicons name={showMore ? 'chevron-down' : 'chevron-forward'} size={16} color={C.muted} />
        <Text style={st.moreText}>More nutrition (optional): fibre, sodium</Text>
      </Pressable>
      {showMore && (
        <Row style={{ gap: 8 }}>
          <View style={{ flex: 1, minWidth: 0 }}><Label>Fibre g</Label><Input value={v.fibre} onChangeText={set('fibre')} keyboardType="decimal-pad" /></View>
          <View style={{ flex: 1, minWidth: 0 }}><Label>Sodium mg</Label><Input value={v.sodium} onChangeText={set('sodium')} keyboardType="decimal-pad" /></View>
        </Row>
      )}

      {!!error && <Text style={{ color: C.danger, fontFamily: F.body, marginTop: 8 }}>{error}</Text>}
      <Button title={submitLabel} loading={saving} style={{ marginTop: 14 }} onPress={submit} />
      {onCancel && <Button kind="secondary" title="Cancel" onPress={onCancel} />}
    </View>
  );
}

/**
 * A smaller, indented box under a macro's Input, joined to it with a corner connector, for a nutrient that
 * is part of that macro rather than an amount of its own, e.g. Saturated is part of Fat, not on top of it.
 */
function SubField({ label, value, onChangeText }: { label: string; value: string; onChangeText: (t: string) => void }) {
  return (
    <View style={st.subRow}>
      <View style={st.subConnector} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={st.subLabel}>{label} <Text style={st.subOptional}>optional</Text></Text>
        <Input value={value} onChangeText={onChangeText} keyboardType="decimal-pad" style={st.subInput} />
      </View>
    </View>
  );
}

/** A row of equal segments, joined together, for a small set of exclusive choices. */
function Seg<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: [T, string][] }) {
  return (
    <View style={st.seg2} accessibilityRole="radiogroup">
      {options.map(([k, label], i) => {
        const on = value === k;
        return (
          <Pressable key={k} onPress={() => onChange(k)} accessibilityRole="radio" accessibilityState={{ selected: on }} style={(p) => [st.seg2Item, smooth, i > 0 && st.segDivider, hovered(p) && !on && { backgroundColor: C.card2 }, on && st.segOn]}>
            <Text style={[st.segText, { fontSize: 13 }, on && { color: C.inverseText }]} numberOfLines={1}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Portion({
  food, meal, onMeal, date, initialAmount, onBack, onEdit, onSave,
}: { food: Food; meal: Meal; onMeal: (m: Meal) => void; date: string; initialAmount?: number; onBack: () => void; onEdit?: () => void; onSave: (e: any) => Promise<void> }) {
  const { profile } = useStore();
  const t = computeTargets(profile as any);
  const isPiece = food.unit === 'piece';
  const serving = !isPiece && food.serving_g && food.serving_g > 0 ? food.serving_g : null;
  const unit = food.unit ?? 'g';
  const bigUnit = unit === 'ml' ? 'L' : 'kg';
  const [amount, setAmount] = useState(String(initialAmount ?? serving ?? (isPiece ? 1 : 100)));
  const [scaleUnit, setScaleUnit] = useState<'base' | 'big'>('base');
  const [busy, setBusy] = useState(false);
  const typed = Number(amount.replace(',', '.')) || 0;
  const qty = scaleUnit === 'big' ? typed * 1000 : typed; // the count (piece) or amount in g/ml (weight)
  const m = scaleFood(food, qty);

  /** Switching between g/ml and kg/L converts the number shown, so 500 g becomes 0.5 kg and back. */
  function changeScaleUnit(next: 'base' | 'big') {
    if (next === scaleUnit) return;
    const converted = next === 'big' ? typed / 1000 : typed * 1000;
    setAmount(String(Math.round(converted * 1000) / 1000));
    setScaleUnit(next);
  }
  const pickBase = (v: number) => { setScaleUnit('base'); setAmount(String(v)); };

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: false }} />
      <Eyebrow>{food.brand ? `${food.brand} · ` : ''}{food.source ?? 'Food'}</Eyebrow>
      <H1>{food.name}</H1>
      {!!food.shared && (
        <View style={st.warn}>
          <Text style={st.warnTitle}>{'\u26A0\uFE0F'} Added by a user, not from the food database</Text>
          <Text style={st.warnText}>The calories might be wrong. Double check the label before adding it.</Text>
          {onEdit && <Button small kind="secondary" icon="create-outline" title="Edit this food" onPress={onEdit} style={{ alignSelf: 'flex-start' }} />}
          <Text style={[st.who, { color: food.shared.by === 'you' ? C.muted : A.carbs }]}>{sharedLabel(food)}</Text>
        </View>
      )}

      <Row wrap style={{ marginTop: 10 }}>
        {isPiece ? (
          [1, 2, 3].map((n) => <Chip key={n} label={fmtAmount(n, 'piece', food.serving_label)} active={scaleUnit === 'base' && typed === n} onPress={() => pickBase(n)} />)
        ) : (
          <>
            {serving && <Chip label={`1 serving (${round(serving)} ${unit})`} active={scaleUnit === 'base' && typed === serving} onPress={() => pickBase(serving)} />}
            {serving && <Chip label="2 servings" active={scaleUnit === 'base' && typed === serving * 2} onPress={() => pickBase(serving * 2)} />}
            <Chip label={`100 ${unit}`} active={scaleUnit === 'base' && typed === 100} onPress={() => pickBase(100)} />
            <Chip label={`200 ${unit}`} active={scaleUnit === 'base' && typed === 200} onPress={() => pickBase(200)} />
          </>
        )}
      </Row>

      <Label>Meal</Label>
      <MealPicker meal={meal} onMeal={onMeal} />

      <Label>{isPiece ? 'How many?' : `Amount (${scaleUnit === 'big' ? bigUnit : unit})`}</Label>
      {isPiece ? (
        <Input value={amount} onChangeText={(t) => setAmount(t.replace(/[^0-9.,]/g, ''))} keyboardType="decimal-pad" />
      ) : (
        <Row style={{ gap: 8, alignItems: 'flex-start' }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Input value={amount} onChangeText={(t) => setAmount(t.replace(/[^0-9.,]/g, ''))} keyboardType="decimal-pad" />
          </View>
          <View style={{ width: 110 }}>
            <Seg value={scaleUnit} onChange={changeScaleUnit} options={[['base', unit], ['big', bigUnit]]} />
          </View>
        </Row>
      )}
      {food.serving_label && !isPiece && <P muted style={{ fontSize: 12 }}>Label serving: {food.serving_label}</P>}

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

      {t.ready && (
        <View style={{ marginTop: 18, gap: 10 }}>
          <Text style={st.macroLabel}>Percent of your daily targets</Text>
          <GoalBar label="Calories" value={m.kcal} target={t.kcal!} color={C.inverse} unit="kcal" />
          <GoalBar label="Protein" value={m.protein_g} target={t.protein!} color={A.protein} unit="g" />
          <GoalBar label="Carbs" value={m.carbs_g} target={t.carbs!} color={A.carbs} unit="g" />
          <GoalBar label="Fat" value={m.fat_g} target={t.fat!} color={A.fat} unit="g" />
        </View>
      )}

      <Button
        icon="add"
        title={`Add to ${MEAL_LABELS[meal]}`}
        loading={busy}
        style={{ marginTop: 20 }}
        onPress={async () => {
          setBusy(true);
          try {
            await onSave({
              name: food.name, brand: food.brand ?? null, barcode: food.barcode ?? null,
              amount: qty, unit, serving_label: food.serving_label ?? null,
              ...m, source: food.source ?? null,
            });
          } finally { setBusy(false); }
        }}
      />
      <Button kind="secondary" icon="arrow-back" title="Back" onPress={onBack} />
    </Screen>
  );
}

function GoalBar({ label, value, target, color, unit }: { label: string; value: number; target: number; color: string; unit: string }) {
  const pct = target > 0 ? Math.min(1, value / target) : 0;
  return (
    <View style={{ gap: 5 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text style={{ color: C.text, fontFamily: F.body, fontSize: 13 }}>{label}</Text>
        <Text style={{ color: C.muted, fontFamily: F.bodyMed, fontSize: 12 }}>
          {Math.round(value)} {unit} · {Math.round(pct * 100)}% of {Math.round(target)}
        </Text>
      </Row>
      <View style={{ height: 4, backgroundColor: C.card2, borderRadius: 2, overflow: 'hidden' }}>
        <View style={{ height: 4, width: `${pct * 100}%`, backgroundColor: color }} />
      </View>
    </View>
  );
}

function Big({ label, value, unit, small }: { label: string; value: string; unit: string; small?: boolean }) {
  return (
    <View style={{ flex: small ? 1 : undefined, gap: 2 }}>
      <Text style={st.macroLabel}>{label}</Text>
      <Text style={[st.big, small && { fontSize: 18 }]}>{value}<Text style={st.bigUnit}> {unit}</Text></Text>
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
  step: { backgroundColor: C.card, borderWidth: 1, borderColor: C.borderStrong, borderRadius: R.lg, padding: 16, gap: 14, marginTop: 8 },
  stepTitle: { color: C.text, fontFamily: F.display, fontSize: 18, letterSpacing: -0.4 },
  seg: { flexDirection: 'row', borderWidth: 1, borderColor: C.borderStrong, borderRadius: R.md, overflow: 'hidden' },
  segItem: { flex: 1, minHeight: 56, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2, gap: 3 },
  segDivider: { borderLeftWidth: 1, borderLeftColor: C.borderStrong },
  segOn: { backgroundColor: C.inverse },
  segText: { color: C.text, fontFamily: F.bodySemi, fontSize: 13 },
  seg2: { flexDirection: 'row', borderWidth: 1, borderColor: C.borderStrong, borderRadius: R.md, overflow: 'hidden', marginTop: 4 },
  seg2Item: { flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  moreRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, borderRadius: R.sm, marginTop: 10 },
  moreText: { color: C.muted, fontFamily: F.bodyMed, fontSize: 12 },
  subRow: { flexDirection: 'row', gap: 6, marginTop: 8 },
  subConnector: { width: 12, height: 16, marginTop: 1, borderLeftWidth: 1, borderBottomWidth: 1, borderColor: C.border, borderBottomLeftRadius: 6 },
  subLabel: { color: C.faint, fontFamily: F.bodySemi, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 3 },
  subOptional: { color: C.faint, fontFamily: F.body, textTransform: 'none', letterSpacing: 0 },
  subInput: { minHeight: 34, paddingVertical: 6, paddingHorizontal: 10, fontSize: 13, borderColor: C.border },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.border },
  tab: { flex: 1, minHeight: 50, alignItems: 'center', justifyContent: 'center', gap: 2, borderBottomWidth: 2, borderBottomColor: 'transparent', marginBottom: -1 },
  tabOn: { borderBottomColor: A.carbs },
  tabText: { color: C.muted, fontFamily: F.bodySemi, fontSize: 12 },
  panel: { paddingTop: 4 },
  who: { alignSelf: 'flex-end', fontFamily: F.bodyMed, fontSize: 11, marginTop: 2 },
  warn: { borderWidth: 1, borderColor: A.carbs, borderRadius: R.md, padding: 12, gap: 6, backgroundColor: C.card },
  warnTitle: { color: A.carbs, fontFamily: F.bodySemi, fontSize: 14 },
  warnText: { color: C.muted, fontFamily: F.body, fontSize: 13, lineHeight: 19 },
  panelLabel: { color: C.muted, fontFamily: F.bodySemi, fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  rowTitle: { color: C.text, fontFamily: F.bodySemi, fontSize: 14 },
  meta: { color: C.muted, fontFamily: F.body, fontSize: 12 },
  note: { borderLeftWidth: 2, borderLeftColor: C.borderStrong, paddingLeft: 12, gap: 6 },
  noteTitle: { color: C.text, fontFamily: F.bodySemi, fontSize: 14 },
  macros: { marginTop: 20, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: C.border, paddingVertical: 16, borderRadius: R.sm },
  macroLabel: { color: C.muted, fontFamily: F.bodySemi, fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase' },
  big: { color: C.text, fontFamily: F.display, fontSize: 24, letterSpacing: -0.8 },
  bigUnit: { color: C.muted, fontFamily: F.body, fontSize: 14, letterSpacing: 0 },
});
