// Built in food lists that work offline: ingredients with household measures (USDA), South Asian dishes (Indian Nutrient
// Databank) and Bangladeshi foods (Food Composition Table for Bangladesh). See scripts/build-food-data.py for the sources.
import bdRaw from '../data/bdfoods.json';
import dishRaw from '../data/dishes.json';
import ingRaw from '../data/ingredients.json';
import { Food } from './nutrition';

export type LibKind = 'ingredient' | 'bangladesh' | 'dish';

/** Values are per 100 g. `d` is grams in one ml (for liquids and powders), `pc` is grams in one piece, `g` is grams in one serving. */
export type LibItem = {
  kind: LibKind; id: string; name: string; aka: string; group: string;
  k: number; p: number; c: number; f: number; su?: number; sf?: number; fi?: number; so?: number;
  d?: number; pc?: number; u?: string; g?: number;
};

export const SOURCE_LABEL: Record<LibKind, string> = {
  ingredient: 'USDA FoodData Central',
  bangladesh: 'Bangladesh Food Composition Table',
  dish: 'Indian Nutrient Databank',
};

const all: LibItem[] = [
  ...(ingRaw as any[]).map((x) => ({ ...x, kind: 'ingredient' as const })),
  ...(bdRaw as any[]).map((x) => ({ ...x, kind: 'bangladesh' as const })),
  ...(dishRaw as any[]).map((x) => ({ ...x, kind: 'dish' as const, aka: '', group: 'South Asian dishes' })),
];

const norm = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/['’`]/g, '').replace(/[^a-z0-9% ]+/g, ' ').replace(/\s+/g, ' ').trim();
const index = all.map((x) => ({ x, hay: ` ${norm(`${x.name} ${x.aka}`)} `, name: norm(x.name) }));

/** Foods whose name or other names (Bengali, Hindi) contain every word typed. Best matches first. */
export function searchLibrary(query: string, kinds: LibKind[], limit = 8): LibItem[] {
  const words = norm(query).split(' ').filter(Boolean);
  if (!words.length) return [];
  const out: { x: LibItem; score: number }[] = [];
  for (const e of index) {
    if (!kinds.includes(e.x.kind)) continue;
    if (!words.every((w) => e.hay.includes(w))) continue;
    const starts = e.name.startsWith(words[0]) ? 0 : e.hay.includes(` ${words[0]}`) ? 1 : 2;
    out.push({ x: e.x, score: starts * 1000 + e.name.length });
  }
  return out.sort((a, b) => a.score - b.score).slice(0, limit).map((o) => o.x);
}

export const ingredientById = (id: string) => all.find((x) => x.id === id);

/** A library item as a Food the rest of the app understands (per 100 g, or the dish's own serving). */
export function libToFood(i: LibItem): Food {
  return {
    name: i.name, brand: i.kind === 'dish' ? 'South Asian dish' : null, barcode: null,
    kcal_100: i.k, protein_100: i.p, carbs_100: i.c, fat_100: i.f,
    sugars_100: i.su ?? null, sat_fat_100: i.sf ?? null, fibre_100: i.fi ?? null, sodium_100: i.so ?? null,
    serving_g: i.g && i.g > 0 ? i.g : null, serving_label: i.u && i.g ? `1 ${i.u}` : null,
    unit: 'g', source: SOURCE_LABEL[i.kind],
    measures: i.d || i.pc ? { d: i.d, pc: i.pc } : undefined,
  };
}
