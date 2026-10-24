import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { cardioKind, distanceFor, estimateCardio, heartTarget, Intensity, kcalFor, LEVEL_LABEL, MODE_DEFAULTS, MODE_LABEL, TreadMode, Who } from '../lib/cardio';
import { PlanItem } from '../lib/planner';
import { A, C, F } from '../lib/theme';
import { Button, Chip, Input, Label, Row } from './ui';

const EFFORTS: [Intensity, string][] = [['easy', 'Easy'], ['steady', 'Steady'], ['hard', 'Hard']];

/** The minutes of a target such as "20" or "15-20" (the middle of a range). */
export function minutesOf(reps: string): number {
  const n = (String(reps).match(/\d+(\.\d+)?/g) ?? []).map(Number);
  if (!n.length) return 0;
  return n.reduce((a, b) => a + b, 0) / n.length;
}

function NumField({ label, value, onCommit }: { label: string; value: number | undefined; onCommit: (n: number | undefined) => void }) {
  const [t, setT] = useState(value == null ? '' : String(value));
  useEffect(() => setT(value == null ? '' : String(value)), [value]);
  return (
    <View style={{ flex: 1, minWidth: 90 }}>
      <Label>{label}</Label>
      <Input
        value={t}
        onChangeText={(x) => setT(x.replace(/[^0-9.,]/g, ''))}
        onBlur={() => {
          const n = parseFloat(t.replace(',', '.'));
          onCommit(Number.isFinite(n) ? n : undefined);
        }}
        keyboardType="decimal-pad"
        accessibilityLabel={label}
      />
    </View>
  );
}

/**
 * Cardio numbers for one plan item: effort, minutes, speed and incline (treadmill) or level (other machines),
 * target heart rate and calories. Each is an estimate from your weight and age until you type your own.
 * Calories follow the minutes, speed and incline unless you type a figure, which then sticks.
 */
export function CardioFields({ item, who, onChange }: { item: PlanItem; who: Who; onChange: (changes: Partial<PlanItem>) => void }) {
  const kind = cardioKind(item.exerciseId);
  if (!kind) return null;
  const c = item.cardio ?? {};
  const effort = c.intensity ?? 'steady';
  const est = estimateCardio(item.exerciseId, effort, who.age);
  const minutes = minutesOf(item.reps);
  const [hrLo, hrHi] = heartTarget(c, who.age);
  const kcal = kcalFor(item.exerciseId, minutes, who, c);
  // Only offer the reset once something differs from the estimate.
  const differs = (a: number | undefined, b: number | undefined) => a != null && b != null && a !== b;
  const edited = !!(c.kcalManual || c.distanceManual || c.mode || differs(c.speedKmh, est.speedKmh) || differs(c.incline, est.incline) || differs(c.level, est.level) || differs(c.hrLow, est.hrLow) || differs(c.hrHigh, est.hrHigh));
  const set = (changes: Partial<NonNullable<PlanItem['cardio']>>) => onChange({ cardio: { ...c, ...changes } });

  return (
    <View style={{ gap: 8, paddingVertical: 4 }}>
      <Row wrap style={{ gap: 6 }}>
        <Text style={{ color: C.muted, fontFamily: F.body, fontSize: 12, marginRight: 4 }}>Effort</Text>
        {EFFORTS.map(([k, label]) => (
          <Chip key={k} label={label} active={effort === k} onPress={() => onChange({ cardio: { ...estimateCardio(item.exerciseId, k, who.age), intensity: k } })} />
        ))}
      </Row>
      {kind === 'treadmill' && (
        <Row wrap style={{ gap: 6 }}>
          <Text style={{ color: C.muted, fontFamily: F.body, fontSize: 12, marginRight: 4 }}>Style</Text>
          {(Object.keys(MODE_LABEL) as TreadMode[]).map((m) => (
            <Chip key={m} label={MODE_LABEL[m]} active={(c.mode ?? (est.speedKmh && est.speedKmh >= 9 ? 'run' : est.speedKmh && est.speedKmh >= 7 ? 'jog' : 'walk')) === m}
              onPress={() => onChange({ cardio: { ...c, mode: m, ...MODE_DEFAULTS[m], distanceManual: false, distanceKm: undefined, kcalManual: false, kcal: undefined } })} />
          ))}
        </Row>
      )}
      <Row wrap style={{ gap: 10 }}>
        <NumField label="Minutes" value={minutes || undefined} onCommit={(n) => onChange({ reps: String(n ?? 0), metric: 'minutes' })} />
        {kind === 'treadmill' && <NumField label="Speed (km/h)" value={c.speedKmh ?? est.speedKmh} onCommit={(n) => set({ speedKmh: n })} />}
        {kind === 'treadmill' && <NumField label="Incline (%)" value={c.incline ?? est.incline} onCommit={(n) => set({ incline: n })} />}
        {kind === 'treadmill' && <NumField label={c.distanceManual ? 'Distance km (yours)' : 'Distance km (estimate)'} value={distanceFor(minutes, c)} onCommit={(n) => set(n == null ? { distanceManual: false, distanceKm: undefined } : { distanceKm: n, distanceManual: true })} />}
        {LEVEL_LABEL[kind] !== '' && <NumField label={LEVEL_LABEL[kind]} value={c.level ?? est.level} onCommit={(n) => set({ level: n })} />}
      </Row>
      {kind === 'treadmill' && c.mode === 'intervals' && (
        <Row wrap style={{ gap: 10 }}>
          <NumField label="Fast speed (km/h)" value={c.fastKmh ?? 8} onCommit={(n) => set({ fastKmh: n })} />
          <NumField label="Fast minutes" value={c.fastMin ?? 1} onCommit={(n) => set({ fastMin: n })} />
          <NumField label="Easy minutes" value={c.easyMin ?? 2} onCommit={(n) => set({ easyMin: n })} />
        </Row>
      )}
      <Row wrap style={{ gap: 10 }}>
        <NumField label="Heart rate low (bpm)" value={hrLo} onCommit={(n) => set({ hrLow: n, hrHigh: c.hrHigh ?? hrHi })} />
        <NumField label="Heart rate high (bpm)" value={hrHi} onCommit={(n) => set({ hrHigh: n, hrLow: c.hrLow ?? hrLo })} />
        <NumField label={c.kcalManual ? 'Calories (yours)' : 'Calories (estimate)'} value={kcal} onCommit={(n) => set(n == null ? { kcalManual: false, kcal: undefined } : { kcal: n, kcalManual: true })} />
      </Row>
      {edited && (
        <Row>
          <Button small kind="secondary" icon="refresh" title="Back to estimates" onPress={() => onChange({ cardio: { ...estimateCardio(item.exerciseId, effort, who.age), intensity: effort } })} />
        </Row>
      )}
      <Text style={{ color: A.cardio, fontFamily: F.body, fontSize: 12 }}>
        Estimated for {Math.round(who.weightKg)} kg and age {who.age}. Calories are the extra ones you burn, so the treadmill screen will read higher. Change any box to use your own number.
      </Text>
    </View>
  );
}
