import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { C, F } from '../lib/theme';

/** A progress ring, like the ones on a fitness dashboard. */
export function Ring({
  value, target, color, size = 108, stroke = 9, label, sub, big,
}: {
  value: number;
  target: number;
  color: string;
  size?: number;
  stroke?: number;
  label?: string;
  sub?: string;
  big?: string;
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct = target > 0 ? Math.min(1, value / target) : 0;
  const over = target > 0 && value > target;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={C.card2} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={over ? '#e0796b' : color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${circ * pct} ${circ}`}
          fill="none"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <Text style={[st.value, big ? { fontSize: 26 } : null]} numberOfLines={1}>{big ?? Math.round(value)}</Text>
      {!!sub && <Text style={st.sub}>{sub}</Text>}
      {!!label && <Text style={st.label}>{label}</Text>}
    </View>
  );
}

const st = StyleSheet.create({
  value: { color: C.text, fontFamily: F.display, fontSize: 22, letterSpacing: -0.6 },
  sub: { color: C.muted, fontFamily: F.body, fontSize: 11 },
  label: { color: C.muted, fontFamily: F.bodySemi, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', marginTop: 2 },
});
