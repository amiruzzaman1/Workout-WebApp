// Recipes and usuals: a list of ingredients with amounts. The nutrition of every ingredient is copied in when the recipe
// is saved, so the total is worked out from the amounts and never changes if a food it used is edited later.
import { Food } from './nutrition';

export type RecipeUnit = 'g' | 'ml' | 'tsp' | 'tbsp' | 'cup' | 'piece';

/** Nutrition of one ingredient per 100 g. Sugars, saturated fat, fibre and sodium stay empty when the source did not have them. */
export type Per100 = { k: number; p: number; c: number; f: number; su?: number | null; sf?: number | null; fi?: number | null; so?: number | null };

export type RecipeItem = {
  name: string;
  amount: number;
  unit: RecipeUnit;
  d?: number;   // grams in 1 ml, needed for ml, tsp, tbsp and cup
  pc?: number;  // grams in 1 piece
  n: Per100;
};

export type Recipe = {
  id: string;
  name: string;
  servings: number;
  cooked_g?: number | null;
  items: RecipeItem[];
  notes?: string | null;
};

/** New Zealand household measures in ml. */
export const ML_PER: Record<'tsp' | 'tbsp' | 'cup', number> = { tsp: 5, tbsp: 15, cup: 250 };

export const UNIT_LABEL: Record<RecipeUnit, string> = { g: 'g', ml: 'ml', tsp: 'tsp', tbsp: 'tbsp', cup: 'cup', piece: 'piece' };

/** Which units an ingredient can be measured in, from what its source knows. */
export function unitsFor(it: { d?: number; pc?: number }): RecipeUnit[] {
  const u: RecipeUnit[] = ['g'];
  if (it.d) u.push('ml', 'tsp', 'tbsp', 'cup');
  if (it.pc) u.push('piece');
  return u;
}

/** Grams in an amount of an ingredient. Without a known density, 1 ml counts as 1 g. */
export function gramsOf(it: Pick<RecipeItem, 'amount' | 'unit' | 'd' | 'pc'>): number {
  const a = Number(it.amount) || 0;
  const d = it.d || 1;
  switch (it.unit) {
    case 'g': return a;
    case 'ml': return a * d;
    case 'tsp': case 'tbsp': case 'cup': return a * ML_PER[it.unit] * d;
    case 'piece': return a * (it.pc || 0);
  }
}

const NULLABLE = ['su', 'sf', 'fi', 'so'] as const;

export type Totals = { kcal: number; protein: number; carbs: number; fat: number; sugars: number | null; satFat: number | null; fibre: number | null; sodium: number | null; grams: number };

export function totalsOf(items: RecipeItem[]): Totals {
  const t = { kcal: 0, protein: 0, carbs: 0, fat: 0, su: null as number | null, sf: null as number | null, fi: null as number | null, so: null as number | null, grams: 0 };
  for (const it of items) {
    const g = gramsOf(it);
    const k = g / 100;
    t.grams += g;
    t.kcal += it.n.k * k; t.protein += it.n.p * k; t.carbs += it.n.c * k; t.fat += it.n.f * k;
    for (const key of NULLABLE) if (it.n[key] != null) t[key] = (t[key] ?? 0) + (it.n[key] as number) * k;
  }
  return { kcal: t.kcal, protein: t.protein, carbs: t.carbs, fat: t.fat, sugars: t.su, satFat: t.sf, fibre: t.fi, sodium: t.so, grams: t.grams };
}

/** One ingredient's own nutrition for its amount, shown next to it in the list. */
export function itemKcal(it: RecipeItem) {
  return Math.round((it.n.k * gramsOf(it)) / 100);
}

/**
 * The recipe as a Food you can log. With a cooked weight it is per 100 g (so you can log by weight or by serving);
 * without one it is per serving, counted like a whole item (1, 2 or 0.5 servings).
 */
export function recipeToFood(r: Recipe): Food {
  const t = totalsOf(r.items);
  const servings = r.servings > 0 ? r.servings : 1;
  const base = { name: r.name, brand: 'My recipe', barcode: null, source: 'My recipe', recipe_id: r.id };
  const or = (v: number | null, k: number) => (v == null ? null : v * k);
  if (r.cooked_g && r.cooked_g > 0) {
    const k = 100 / r.cooked_g;
    return {
      ...base, kcal_100: t.kcal * k, protein_100: t.protein * k, carbs_100: t.carbs * k, fat_100: t.fat * k,
      sugars_100: or(t.sugars, k), sat_fat_100: or(t.satFat, k), fibre_100: or(t.fibre, k), sodium_100: or(t.sodium, k),
      serving_g: r.cooked_g / servings, serving_label: '1 serving', unit: 'g',
    };
  }
  const k = 1 / servings;
  return {
    ...base, kcal_100: t.kcal * k, protein_100: t.protein * k, carbs_100: t.carbs * k, fat_100: t.fat * k,
    sugars_100: or(t.sugars, k), sat_fat_100: or(t.satFat, k), fibre_100: or(t.fibre, k), sodium_100: or(t.sodium, k),
    serving_g: null, serving_label: 'serving', unit: 'piece',
  };
}

/** A food as one ingredient line at a given amount, ready to add to a recipe. */
export function foodToItem(f: Food, amount: number, unit: RecipeUnit): RecipeItem {
  const piece = f.unit === 'piece';
  return {
    name: f.name, amount, unit,
    d: f.measures?.d ?? (f.unit === 'ml' ? 1 : undefined),
    pc: f.measures?.pc,
    // A piece food already holds its numbers per piece, so 1 piece is 100 g here and the line stays a piece.
    n: {
      k: f.kcal_100, p: f.protein_100, c: f.carbs_100, f: f.fat_100,
      su: f.sugars_100 ?? null, sf: f.sat_fat_100 ?? null, fi: f.fibre_100 ?? null, so: f.sodium_100 ?? null,
    },
    ...(piece ? { pc: 100, d: undefined } : {}),
  };
}
