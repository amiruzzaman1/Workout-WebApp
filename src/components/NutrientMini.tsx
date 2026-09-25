import { StyleSheet, Text, View } from 'react-native';
import { A, C, F } from '../lib/theme';
import { round } from '../lib/nutrition';
import { HoverTip, Row } from './ui';

/**
 * A small nutrient readout with a thin hover bar, used on the Dashboard and the Food tab. Fibre is a goal
 * (more is good, up to a point); sugars, saturated fat and sodium are limits (staying under is the healthy
 * range), so `limit` flips the colour and the wording to "under" once you go past the target.
 */
export function NutrientMini({ label, value, target, unit, color, limit }: {
  label: string; value: number; target?: number; unit: string; color: string; limit?: boolean;
}) {
  const hasTarget = !!target;
  const pct = hasTarget ? Math.min(1, value / target!) : 0;
  const over = hasTarget && !!limit && value > target!;
  return (
    <View style={{ minWidth: 84 }}>
      <Row style={{ gap: 5 }}>
        <View style={[s.dot, { backgroundColor: color }]} />
        <Text style={s.label}>{label}</Text>
      </Row>
      <Text style={{ color: over ? A.over : C.text, fontFamily: F.bodyMed, fontSize: 13 }}>
        {round(value)}{hasTarget ? ` / ${limit ? 'under ' : ''}${round(target!)} ${unit}` : ` ${unit}`}
      </Text>
      {hasTarget && (
        <HoverTip align="start" lines={[`${label}: ${round(value)} of ${limit ? 'under ' : ''}${round(target!)} ${unit}`, `${Math.round(pct * 100)}% of your ${limit ? 'limit' : 'goal'}`]}>
          <View style={[s.track, { marginTop: 4 }]}><View style={[s.fill, { width: `${pct * 100}%`, backgroundColor: over ? A.over : color }]} /></View>
        </HoverTip>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  dot: { width: 8, height: 8, borderRadius: 2 },
  label: { color: C.muted, fontFamily: F.bodySemi, fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase' },
  track: { height: 4, backgroundColor: C.card2, borderRadius: 2, overflow: 'hidden' },
  fill: { height: 4, backgroundColor: C.inverse },
});
