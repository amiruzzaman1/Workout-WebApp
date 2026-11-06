// Turns the text read off a nutrition label photo into numbers for the Quick add form. Plain word and number
// matching, no model, so it never invents a value: anything it cannot find stays empty and the person types it.
// Everything it returns is only a suggestion; the form boxes stay editable before saving.
//
// Photo readers (OCR) are good at words and weak at small numbers: they drop decimal points ("2.1 g" comes back as
// "21g") and read the g after a number as a 9 ("7.0 g" becomes "7.09"). So each gram value is turned into a few
// likely readings and the one that fits the rest of the label best is kept: per serving against per 100 g must match
// the serving size, nothing per 100 g can pass 100, and the macros must roughly add up to the energy.

export type LabelRead = {
  /** kcal when the label prints it, otherwise kJ. */
  energy: { value: number; unit: 'kcal' | 'kJ' } | null;
  protein: number | null;
  fat: number | null;
  satFat: number | null;
  carbs: number | null;
  sugars: number | null;
  fibre: number | null;
  sodiumMg: number | null;
  /** The amount the numbers are for: 100 g, 100 ml, or the serving size when the label has no per 100 column. */
  per: number | null;
  perUnit: 'g' | 'ml';
  /** Things the person should look at again. */
  notes: string[];
  /** How many of the 8 nutrition boxes were filled. */
  found: number;
};

type Qty = { value: number; unit: string };
type Col = { index: number | null; columns: number | null };

const QTY = /(\d+(?:\.\d+)?)\s*(kj|kl|k\]|kcal|cal|mg)(?![a-z])/g;

/** OCR often swaps look alike characters inside numbers. Fix the common ones before matching. */
function clean(text: string): string {
  return text
    .replace(/\r/g, '')
    .toLowerCase()
    .replace(/(\d)[,](\d)/g, '$1.$2')
    .replace(/[|¦]/g, ' ')
    .replace(/[ \t]+/g, ' ');
}

function energyQuantities(line: string): Qty[] {
  const out: Qty[] = [];
  for (const m of line.matchAll(QTY)) {
    const unit = m[2] === 'kl' || m[2] === 'k]' ? 'kj' : m[2];
    out.push({ value: Number(m[1]), unit });
  }
  return out;
}

/** Which of the value columns is the per 100 one: from a header like "per serving   per 100 g", otherwise unknown. */
function per100Column(lines: string[]): Col {
  for (const l of lines) {
    if (!/per|avg|average|qty|quantity|typical/.test(l) || !/100\s*(g|ml)/.test(l)) continue;
    const a = l.search(/100\s*(g|ml)/);
    const b = l.search(/serv|portion|pack|biscuit|slice|piece|cup|each|\b\d+\s*(g|ml)\s*(serv|portion)/);
    if (b >= 0 && b !== a) return { index: a < b ? 0 : 1, columns: 2 };
    return { index: 0, columns: 1 };
  }
  return { index: null, columns: null };
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** The likely true values for one number the reader gave, most likely first. */
function readings(raw: string): number[] {
  const t = raw.replace(/[^0-9.]/g, '');
  if (!t || t === '.') return [];
  const out: number[] = [];
  const add = (s: string) => {
    const n = Number(s);
    if (Number.isFinite(n) && n >= 0 && !out.includes(round1(n))) out.push(round1(n));
  };
  const dec = t.includes('.') ? t.split('.')[1].length : 0;
  const digits = t.replace('.', '');
  // Two decimals ending in 9 is nearly always a one decimal value with the g read as a 9: "7.09" is 7.0 g.
  if (dec >= 2 && t.endsWith('9')) add(t.slice(0, -1));
  add(t);
  // A lost decimal point leaves a whole number one tenth too big: "21" is 2.1, "180" is 18.0.
  if (!t.includes('.') && digits.length >= 2) add(`${digits.slice(0, -1)}.${digits.slice(-1)}`);
  // A g read as a 9 sticks to the end: "409" is 4.0 g, "309" is 3.0 g, "1.29" is 1.2 g.
  if (t.endsWith('9') && digits.length >= 2) {
    const s = t.slice(0, -1);
    if (!s.includes('.') && s.length >= 2) add(`${s.slice(0, -1)}.${s.slice(-1)}`);
    else if (!s.includes('.') && s.length === 1) add(`${s}.0`);
    add(s);
  }
  return out;
}

/** Number tokens on the rest of a label row (after the nutrient name), without percentages or other units. */
function rowNumbers(rest: string): string[] {
  const out: string[] = [];
  for (const m of rest.matchAll(/(\d+(?:\.\d+)?)\s*([a-z%¢]*)/g)) {
    const suffix = m[2];
    if (suffix.startsWith('%') || /^(kj|kl|kcal|cal)/.test(suffix)) continue;
    if (/^mg/.test(suffix)) { out.push(String(Number(m[1]) / 1000)); continue; }
    out.push(m[1]);
  }
  return out;
}

/** Picks the reading of each column that fits together best. `servingG` is the serving size, when it was read. */
function resolveRow(tokens: string[], col: Col, servingG: number | null, cap = 100): number | null {
  if (tokens.length === 0) return null;
  const cands = tokens.slice(0, 3).map(readings);
  if (cands.some((c) => c.length === 0)) return null;
  // Which token is per 100: the header's column, otherwise the second of two.
  const idx = tokens.length >= 2 ? (col.index != null ? Math.min(col.index, tokens.length - 1) : 1) : 0;
  const hasPair = tokens.length >= 2;
  const other = hasPair ? (idx === 0 ? 1 : 0) : -1;
  const ratio = servingG ? servingG / 100 : null;
  let best: { v: number; score: number } | null = null;
  const ownList = cands[idx];
  const otherList = other >= 0 ? cands[other] : [0];
  ownList.forEach((v100, i) => {
    otherList.forEach((vs, j) => {
      let score = i * 0.05 + (other >= 0 ? j * 0.05 : 0);
      if (v100 > cap) score += 20;
      // A serving can not hold more grams of a nutrient than the serving weighs.
      if (other >= 0 && servingG != null && vs > servingG * 1.02) score += 20;
      // And a serving that is almost all one nutrient (30 g of fat in a 30 g serving) is a misread, not a food.
      else if (other >= 0 && servingG != null && vs >= servingG * 0.9) score += 0.5;
      if (other >= 0) {
        if (ratio != null && v100 > 0) score += (Math.abs(vs / v100 - ratio) / ratio) * 6;
        else if (vs > v100 + 0.05) score += 5;
      }
      if (!best || score < best.score) best = { v: v100, score };
    });
  });
  return best ? (best as { v: number; score: number }).v : null;
}

export function parseLabel(raw: string): LabelRead {
  const text = clean(raw);
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const notes: string[] = [];
  const col = per100Column(lines);
  const hasPer100 = /100\s*(g|ml)/.test(text);

  const sv = /(?:serving size|serve size|serving|per serve|per serving)\D{0,14}(\d+(?:\.\d+)?)\s*(g|ml)/.exec(text);
  const servingG = sv ? Number(sv[1]) : null;
  const servingUnit: 'g' | 'ml' = sv && sv[2] === 'ml' ? 'ml' : 'g';

  const kjRows: Qty[][] = [];
  const kcalRows: Qty[][] = [];
  const sodiumRows: Qty[][] = [];
  const rows: Record<'protein' | 'fat' | 'sat' | 'carbs' | 'sugars' | 'fibre' | 'salt', string[]> = { protein: [], fat: [], sat: [], carbs: [], sugars: [], fibre: [], salt: [] };
  // The part of the row after the nutrient name is where its numbers are.
  const after = (l: string, re: RegExp) => l.slice((re.exec(l)?.index ?? 0) + (re.exec(l)?.[0].length ?? 0));

  for (const l of lines) {
    if (/saturat|sat\.? ?fat/.test(l)) { rows.sat.push(after(l, /saturat\w*|sat\.? ?fat/)); continue; }
    if (/trans|mono|poly|omega|cholest/.test(l)) continue;
    if (/sugar/.test(l)) { if (!/added/.test(l)) rows.sugars.push(after(l, /sugars?/)); continue; }
    if (/fib(re|er)/.test(l)) { rows.fibre.push(after(l, /fib(re|er)/)); continue; }
    if (/sodium/.test(l)) { const q = energyQuantities(after(l, /sodium/)).filter((x) => x.unit === 'mg'); if (q.length) sodiumRows.push(q); else rows.salt.push(''); continue; }
    if (/\bsalt/.test(l)) { rows.salt.push(after(l, /\bsalt/)); continue; }
    if (/protein/.test(l)) { rows.protein.push(after(l, /protein/)); continue; }
    if (/carbohydrate|carbs?\b/.test(l)) { rows.carbs.push(after(l, /carbohydrates?|carbs?/)); continue; }
    if (/\bfat\b|fat,|total fat/.test(l)) { rows.fat.push(after(l, /fat,?( total)?/)); continue; }
    if (/energy|kilojoule|calories/.test(l) || (!kjRows.length && !kcalRows.length && /\d\s*(kj|kcal)/.test(l))) {
      const q = energyQuantities(l);
      const kj = q.filter((x) => x.unit === 'kj');
      const kc = q.filter((x) => x.unit === 'kcal' || x.unit === 'cal');
      if (kj.length) kjRows.push(kj);
      if (kc.length) kcalRows.push(kc);
    }
  }

  const pickEnergy = (rs: Qty[][]): number | null => {
    for (const r of rs) {
      const vals = r.map((x) => x.value);
      if (vals.length >= 2 && col.index != null) return vals[Math.min(col.index, vals.length - 1)];
      if (vals.length >= 2) return vals[1];
      return vals[0];
    }
    return null;
  };
  const kcal = pickEnergy(kcalRows);
  const kj = pickEnergy(kjRows);
  const energy: LabelRead['energy'] = kcal != null ? { value: kcal, unit: 'kcal' } : kj != null ? { value: kj, unit: 'kJ' } : null;
  if (kcal != null && kj != null && Math.abs(kj / 4.184 - kcal) > Math.max(15, kcal * 0.15)) notes.push('The kJ and kcal on the label do not match, so check the energy.');

  const gram = (list: string[], cap = 100): number | null => {
    for (const rest of list) {
      const v = resolveRow(rowNumbers(rest), col, hasPer100 ? servingG : null, cap);
      if (v != null) return v;
    }
    return null;
  };
  const protein = gram(rows.protein);
  const fat = gram(rows.fat);
  // Saturated fat is part of the fat, and sugars are part of the carbs, so they can never be more than those.
  const satFat = gram(rows.sat, fat ?? 100);
  const carbs = gram(rows.carbs);
  const sugars = gram(rows.sugars, carbs ?? 100);
  const fibre = gram(rows.fibre);

  let sodiumMg: number | null = null;
  for (const r of sodiumRows) {
    const vals = r.map((x) => x.value);
    sodiumMg = Math.round(vals.length >= 2 ? vals[col.index != null ? Math.min(col.index, vals.length - 1) : 1] : vals[0]);
    break;
  }
  if (sodiumMg == null) {
    const salt = gram(rows.salt.filter(Boolean));
    if (salt != null) { sodiumMg = Math.round(salt * 393.4); notes.push('Sodium was worked out from the salt on the label.'); }
  }

  if (sugars != null && carbs != null && sugars > carbs) notes.push('Sugars came out higher than carbs. One of them was misread.');
  if (satFat != null && fat != null && satFat > fat) notes.push('Saturated fat came out higher than total fat. One of them was misread.');
  // Fat, carbs and protein have to roughly add up to the energy, so a mismatch means a number was misread.
  const kcalValue = energy ? (energy.unit === 'kcal' ? energy.value : energy.value / 4.184) : null;
  if (kcalValue != null && protein != null && carbs != null && fat != null) {
    const est = protein * 4 + carbs * 4 + fat * 9;
    if (Math.abs(est - kcalValue) > Math.max(25, kcalValue * 0.25)) notes.push('The protein, carbs and fat do not add up to the energy, so a number was probably misread. Compare each box with the label.');
  }

  // What the numbers are per: 100 g or 100 ml when that column exists, otherwise the serving size.
  let perUnit: 'g' | 'ml' = /100\s*ml/.test(text) && !/100\s*g/.test(text) ? 'ml' : 'g';
  let per: number | null = hasPer100 ? 100 : null;
  if (!hasPer100) {
    if (servingG != null) {
      per = servingG;
      perUnit = servingUnit;
      notes.push(`There is no per 100 column, so these numbers are for one serving (${per} ${servingUnit}).`);
    } else if (energy || protein != null || carbs != null) {
      notes.push('Could not tell what amount the numbers are for. Check the "Numbers are per" box.');
    }
  }

  const found = [energy, protein, fat, carbs, sugars, satFat, fibre, sodiumMg].filter((x) => x != null).length;
  return { energy, protein, fat, satFat, carbs, sugars, fibre, sodiumMg, per, perUnit, notes, found };
}
