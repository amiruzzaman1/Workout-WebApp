import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Button, Eyebrow, H1, hovered, P, Row, Screen, smooth } from '../../../src/components/ui';
import { confirm } from '../../../src/lib/confirm';
import { fmtEnergy, round } from '../../../src/lib/nutrition';
import { Recipe, totalsOf } from '../../../src/lib/recipes';
import { useStore } from '../../../src/lib/store';
import { A, C, F, R } from '../../../src/lib/theme';

/** Your recipes and usuals: tap Log to add one to a meal, or edit the ingredients. */
export default function Recipes() {
  const router = useRouter();
  const { recipes, deleteRecipe, date } = useStore();

  const remove = async (r: Recipe) => {
    if (await confirm('Delete this recipe?', `${r.name} will be removed. Meals you already logged with it stay.`, { confirmText: 'Delete', danger: true })) await deleteRecipe(r.id);
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: '' }} />
      <Eyebrow>Food</Eyebrow>
      <H1>My recipes and usuals</H1>
      <P muted style={{ fontSize: 13, lineHeight: 19 }}>Build a dish from its ingredients and the calories add up for you, or save something you always have, like your morning milk, so it is one tap to log.</P>
      <Button icon="add" title="New recipe" onPress={() => router.push('/food/recipe')} style={{ marginTop: 6 }} />

      <View style={{ marginTop: 16 }}>
        {recipes.map((r) => {
          const t = totalsOf(r.items);
          const sv = r.servings || 1;
          return (
            <View key={r.id} style={s.row}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.name} numberOfLines={2}>{r.name}</Text>
                <Text style={s.meta} numberOfLines={1}>
                  {fmtEnergy(t.kcal / sv)}{sv !== 1 ? ' per serving' : ''} · P {round(t.protein / sv, 0)} C {round(t.carbs / sv, 0)} F {round(t.fat / sv, 0)}
                </Text>
                <Text style={s.meta} numberOfLines={1}>{r.items.length} ingredient{r.items.length === 1 ? '' : 's'}{sv !== 1 ? ` · makes ${round(sv, 2)} servings` : ''}</Text>
              </View>
              <Button small icon="add" title="Log" onPress={() => router.push(`/food/add?recipe=${r.id}&date=${date}`)} />
              <Pressable onPress={() => router.push(`/food/recipe?id=${r.id}`)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Edit ${r.name}`} style={(p) => [{ padding: 5, borderRadius: 999 }, smooth, hovered(p) && { backgroundColor: A.carbs + '22' }]}>
                {(p: any) => <Ionicons name="create-outline" size={17} color={hovered(p) ? A.carbs : C.faint} />}
              </Pressable>
              <Pressable onPress={() => remove(r)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Delete ${r.name}`} style={(p) => [{ padding: 5, borderRadius: 999 }, smooth, hovered(p) && { backgroundColor: A.over + '22' }]}>
                {(p: any) => <Ionicons name="trash-outline" size={16} color={hovered(p) ? A.over : C.faint} />}
              </Pressable>
            </View>
          );
        })}
        {recipes.length === 0 && (
          <View style={s.empty}>
            <Text style={s.name}>Nothing saved yet</Text>
            <P muted style={{ fontSize: 13 }}>Try an okra curry: olive oil, onion, okra, turmeric, chilli and salt. Or on the food screen, tap "Save as my usual" after picking a food you have often.</P>
          </View>
        )}
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, marginBottom: 10, backgroundColor: C.card, borderRadius: R.lg, borderWidth: 1, borderColor: C.border, borderTopWidth: 2, borderTopColor: A.carbs },
  name: { color: C.text, fontFamily: F.bodySemi, fontSize: 15 },
  meta: { color: C.muted, fontFamily: F.body, fontSize: 12, lineHeight: 18 },
  empty: { borderLeftWidth: 2, borderLeftColor: C.borderStrong, paddingLeft: 12, gap: 6 },
});
