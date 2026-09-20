import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { C, F } from '../lib/theme';

export type Bar = { label: string; value: number; caption: string };

/** Single-series monochrome bar chart. Tap a bar to read its value. */
export function BarChart({ data, height = 120, emptyText = 'No data yet', color = C.inverse }: { data: Bar[]; height?: number; emptyText?: string; color?: string }) {
  const [sel, setSel] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));
  const active = sel ?? data.length - 1;
  if (data.length === 0 || data.every((d) => d.value === 0)) {
    return (
      <View style={[st.empty, { height }]}>
        <Text style={st.caption}>{emptyText}</Text>
      </View>
    );
  }
  return (
    <View style={{ gap: 8 }}>
      <Text style={st.readout}>{data[active]?.caption}</Text>
      <View style={[st.plot, { height }]}>
        {data.map((d, i) => {
          const h = d.value === 0 ? 2 : Math.max(4, (d.value / max) * (height - 4));
          const on = i === active;
          return (
            <Pressable key={i} onPress={() => setSel(i)} style={st.hit}>
              <View style={[st.bar, { height: h, backgroundColor: d.value === 0 ? C.border : color, opacity: on ? 1 : 0.45 }]} />
            </Pressable>
          );
        })}
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
