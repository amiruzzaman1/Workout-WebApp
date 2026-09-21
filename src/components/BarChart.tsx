import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { C, F } from '../lib/theme';
import { TipBubble } from './ui';

export type Bar = { label: string; value: number; caption: string };

const TIP_BOX = 200;

/**
 * A single series bar chart. Hover a bar (or tap it on a phone) to see its value and what percent it is of a reference,
 * like your goal. With no reference it is the percent of the highest bar you can see.
 */
export function BarChart({ data, height = 120, emptyText = 'No data yet', color = C.inverse, reference }: {
  data: Bar[]; height?: number; emptyText?: string; color?: string; reference?: { value: number; label: string };
}) {
  const [sel, setSel] = useState<number | null>(null);
  const [tip, setTip] = useState<number | null>(null);
  const [w, setW] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const max = Math.max(1, ...data.map((d) => d.value));
  const active = tip ?? sel ?? data.length - 1;
  const ref = reference && reference.value > 0 ? reference : { value: max, label: 'of your best' };
  if (data.length === 0 || data.every((d) => d.value === 0)) {
    return (
      <View style={[st.empty, { height }]}>
        <Text style={st.caption}>{emptyText}</Text>
      </View>
    );
  }
  const barH = (v: number) => (v === 0 ? 2 : Math.max(4, (v / max) * (height - 4)));
  return (
    <View style={{ gap: 8 }}>
      <Text style={st.readout}>{data[active]?.caption}</Text>
      <View style={[st.plot, { height }]} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
        {data.map((d, i) => {
          const on = i === active;
          return (
            <Pressable
              key={i}
              onPress={() => { setSel(i); setTip(i); if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(() => setTip(null), 2500); }}
              onHoverIn={() => setTip(i)}
              onHoverOut={() => setTip((t) => (t === i ? null : t))}
              accessibilityRole="button"
              accessibilityLabel={d.caption}
              style={st.hit}
            >
              <View style={[st.bar, { height: barH(d.value), backgroundColor: d.value === 0 ? C.border : color, opacity: on ? 1 : 0.45 }]} />
            </Pressable>
          );
        })}
        {tip != null && w > 0 && data[tip] && (() => {
          const d = data[tip];
          const left = Math.max(0, Math.min(w - TIP_BOX, ((tip + 0.5) * w) / data.length - TIP_BOX / 2));
          const lines = [d.caption];
          if (d.value > 0) lines.push(`${Math.round((d.value / ref.value) * 100)}% ${ref.label}`);
          return (
            <View pointerEvents="none" style={{ position: 'absolute', left, width: TIP_BOX, alignItems: 'center', bottom: barH(d.value) + 8, zIndex: 40 }}>
              <TipBubble lines={lines} />
            </View>
          );
        })()}
      </View>
      <View style={st.axis}>
        <Text style={st.caption}>{data[0].label}</Text>
        <Text style={st.caption}>{data[data.length - 1].label}</Text>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  plot: { flexDirection: 'row', alignItems: 'flex-end', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.borderStrong },
  hit: { flex: 1, height: '100%', justifyContent: 'flex-end', alignItems: 'center', paddingHorizontal: 1 },
  bar: { width: '100%', maxWidth: 28, borderTopLeftRadius: 2, borderTopRightRadius: 2 },
  axis: { flexDirection: 'row', justifyContent: 'space-between' },
  caption: { color: C.muted, fontFamily: F.body, fontSize: 11 },
  readout: { color: C.text, fontFamily: F.bodyMed, fontSize: 13 },
  empty: { alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: C.border, borderStyle: 'dashed', borderRadius: 8 },
});
