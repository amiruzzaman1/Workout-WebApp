// Open Food Facts client (free, open database; good coverage of NZ supermarket barcodes).
// Read-only endpoints need no key. Rate limits: ~15 product lookups and ~10 searches per minute.
import { Food } from './nutrition';

const num = (v: any): number | null => {
  const x = Number(v);
  return v == null || v === '' || !Number.isFinite(x) ? null : x;
};

function fromOFF(p: any): Food | null {
  if (!p) return null;
  const nut = p.nutriments ?? {};
  // Many NZ labels only list kJ. Kept to one decimal so converting back to kJ for the cross check stays close to the label.
  const kj = num(nut['energy_100g']) ?? num(nut['energy-kj_100g']);
  const kcal = num(nut['energy-kcal_100g']) ?? (kj != null ? Math.round((kj / 4.184) * 10) / 10 : null);
  const name = (p.product_name_en || p.product_name || '').trim();
  if (!name && kcal == null) return null;
  const sodiumMg = num(nut.sodium_100g) != null ? num(nut.sodium_100g)! * 1000 : num(nut.salt_100g) != null ? (num(nut.salt_100g)! * 1000) / 2.5 : null;
  const servingG = num(p.serving_quantity);
  return {
    name: name || 'Unnamed product',
    // The classic service sends brands as "A,B", the newer search sends a list.
    brand: (Array.isArray(p.brands) ? String(p.brands[0] ?? '') : String(p.brands || '').split(',')[0]).trim() || null,
    barcode: p.code ?? null,
    kcal_100: kcal ?? 0,
    protein_100: num(nut.proteins_100g) ?? 0,
    carbs_100: num(nut.carbohydrates_100g) ?? 0,
    sugars_100: num(nut.sugars_100g),
    fat_100: num(nut.fat_100g) ?? 0,
    sat_fat_100: num(nut['saturated-fat_100g']),
    fibre_100: num(nut.fiber_100g),
    sodium_100: sodiumMg == null ? null : Math.round(sodiumMg),
    serving_g: servingG && servingG > 0 ? servingG : null,
    serving_label: p.serving_size || null,
    unit: (p.quantity || '').toLowerCase().includes('ml') ? 'ml' : 'g',
    source: 'Open Food Facts',
  };
}

const FIELDS = 'code,product_name,product_name_en,brands,quantity,serving_size,serving_quantity,nutriments,countries_tags,generic_name,categories';

async function getJSON(url: string, timeoutMs = 12000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`Open Food Facts returned ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

/** Look up a barcode. Returns null when the product isn't in the database yet. */
export async function lookupBarcode(barcode: string): Promise<Food | null> {
  const code = barcode.replace(/\D/g, '');
  if (code.length < 6) throw new Error('That barcode looks too short.');
  const j = await getJSON(`https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=${FIELDS}`);
  if (j?.status === 0 || !j?.product) return null;
  const f = fromOFF({ ...j.product, code });
  return f;
}

// Lower case, no apostrophes or hyphens, so "Pam's" matches "pams" and "Weet-Bix" matches "weetbix".
// All the spellings of yoghurt count as one word, since the same product is "yogurt" on one label and "yoghurt" on another.
const norm = (s: string) => s.toLowerCase().replace(/['\u2019`]/g, '').replace(/-/g, '').replace(/[^a-z0-9\s]/g, ' ').replace(/yo(?:u)?g(?:h)?o?u?rt/g, 'yogurt');

/** What a product can be matched on: its name and brand, plus the category and generic name Open Food Facts files it under. A product called just "Epic Greek Unsweetened" by "The Collective" is still found by "yogurt" because its category is Greek yogurts. */
type Hit = { f: Food; hay: string };
const hitOf = (p: any, f: Food): Hit => ({
  f: { ...f, _nz: !!p.countries_tags?.includes('en:new-zealand') } as Food,
  hay: norm(`${f.name} ${f.brand ?? ''} ${p.generic_name ?? ''} ${typeof p.categories === 'string' ? p.categories : ''}`),
});

/** The classic search needs every word to match, which is what a shopping search should do. */
async function classicSearch(q: string, nzOnly: boolean): Promise<Hit[]> {
  let url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=25&fields=${FIELDS}`;
  if (nzOnly) url += '&tagtype_0=countries&tag_contains_0=contains&tag_0=new-zealand';
  const j = await getJSON(url);
  const out: Hit[] = [];
  for (const p of j?.products ?? []) {
    const f = fromOFF(p);
    if (f) out.push(hitOf(p, f));
  }
  return out;
}

/** The newer search service is quick and matches any one word, so it is how a search that came up short gets a second chance. */
async function modernSearch(q: string): Promise<Hit[]> {
  const j = await getJSON(`https://search.openfoodfacts.org/search?q=${encodeURIComponent(q)}&page_size=25&fields=${FIELDS}`);
  const out: Hit[] = [];
  for (const h of j?.hits ?? []) {
    const f = fromOFF(h);
    if (f) out.push(hitOf(h, f));
  }
  return out;
}

/** Text search. Products sold in New Zealand first, then the rest of the world. Every word you typed should appear (a half typed word still matches); if that finds fewer than 5, products missing just one word of a long search (3 or more words) are listed after them. */
export async function searchFoods(term: string, nzFirst = true): Promise<Food[]> {
  const q = term.trim();
  if (q.length < 2) return [];
  const words = norm(q).split(/\s+/).filter(Boolean);
  const same = (a: Food, b: Food) => (a.barcode && a.barcode === b.barcode) || (a.name === b.name && a.brand === b.brand);

  const exact: Food[] = [];
  const near: Food[] = [];
  const add = (hits: Hit[]) => {
    for (const { f, hay } of hits) {
      if (!(f.kcal_100 > 0) || exact.some((o) => same(o, f)) || near.some((o) => same(o, f))) continue;
      const matched = words.filter((w) => hay.includes(w)).length;
      if (matched === words.length) exact.push(f);
      else if (words.length >= 3 && matched >= words.length - 1) near.push(f);
    }
  };

  let lastErr: unknown = null;
  let answered = 0; // sources that replied, even with nothing useful
  try { add(await classicSearch(q, true)); answered++; } catch (e) { lastErr = e; }
  if (exact.length < 5) {
    try { add(await classicSearch(q, false)); answered++; } catch (e) { lastErr = e; }
  }
  // The quick service backs up the classic one when it is down or came up short.
  if (answered === 0 || exact.length < 5) {
    try { add(await modernSearch(q)); answered++; } catch (e) { lastErr = e; }
  }
  if (answered === 0 && lastErr) throw lastErr;
  const order = (list: Food[]) => (nzFirst ? [...list.filter((f: any) => f._nz), ...list.filter((f: any) => !f._nz)] : list);
  return [...order(exact), ...(exact.length < 5 ? order(near) : [])];
}
