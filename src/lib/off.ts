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
  const kcal = num(nut['energy-kcal_100g']) ?? (num(nut['energy_100g']) != null ? Math.round(num(nut['energy_100g'])! / 4.184) : null);
  const name = (p.product_name_en || p.product_name || '').trim();
  if (!name && kcal == null) return null;
  const sodiumMg = num(nut.sodium_100g) != null ? num(nut.sodium_100g)! * 1000 : num(nut.salt_100g) != null ? (num(nut.salt_100g)! * 1000) / 2.5 : null;
  const servingG = num(p.serving_quantity);
  return {
    name: name || 'Unnamed product',
    brand: (p.brands || '').split(',')[0]?.trim() || null,
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

const FIELDS = 'code,product_name,product_name_en,brands,quantity,serving_size,serving_quantity,nutriments,countries_tags';

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

/** Text search. Tries the newer search service first, then the classic endpoint. */
export async function searchFoods(term: string, nzFirst = true): Promise<Food[]> {
  const q = term.trim();
  if (q.length < 2) return [];
  const out: Food[] = [];
  try {
    const j = await getJSON(
      `https://search.openfoodfacts.org/search?q=${encodeURIComponent(q)}&page_size=25&fields=${FIELDS}`,
    );
    for (const h of j?.hits ?? []) {
      const f = fromOFF(h);
      if (f) out.push({ ...f, ...(h.countries_tags ? { _nz: h.countries_tags.includes('en:new-zealand') } as any : {}) });
    }
  } catch {
    // ignore and fall back
  }
  if (out.length === 0) {
    const j = await getJSON(
      `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=25&fields=${FIELDS}`,
    );
    for (const p of j?.products ?? []) {
      const f = fromOFF(p);
      if (f) out.push({ ...f, ...(p.countries_tags ? { _nz: p.countries_tags.includes('en:new-zealand') } as any : {}) });
    }
  }
  const usable = out.filter((f) => f.kcal_100 > 0);
  if (!nzFirst) return usable;
  // Products sold in New Zealand first, with the rest underneath.
  return [...usable.filter((f: any) => f._nz), ...usable.filter((f: any) => !f._nz)];
}
