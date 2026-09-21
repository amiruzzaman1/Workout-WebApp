import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { C, F } from '../lib/theme';
import { TipBubble } from './ui';

export type Point = { x: number; y: number; caption: string; note?: string };

const TIP_BOX = 200;

/** A simple trend line with an optional goal line. Tap to read a point. */
export function LineChart({
  points, height = 150, color, goal, goalLabel, emptyText = 'No data yet', startLabel, endLabel,
}: {
  points: Point[]; height?: number; color: string; goal?: number | null; goalLabel?: string; emptyText?: string; startLabel?: string; endLabel?: string;
}) {
  const [w, setW] = useState(0);
  const [sel, setSel] = useState<number | null>(null);
  const [tip, setTip] = useState<number | null>(null);
  if (points.length === 0) {
    return (
      <View style={[st.empty, { height }]}>
        <Text style={st.caption}>{emptyText}</Text>
      </View>
    );
  }
  const ys = points.map((p) => p.y).concat(goal != null ? [goal] : []);
  let lo = Math.min(...ys), hi = Math.max(...ys);
  if (hi - lo < 2) { lo -= 1; hi += 1; }
  const padY = (hi - lo) * 0.12;
  lo -= padY; hi += padY;
  const x0 = points[0].x, x1 = points[points.length - 1].x;
  const pad = 8;
  const X = (x: number) => (x1 === x0 ? w / 2 : pad + ((x - x0) / (x1 - x0)) * (w - pad * 2));
  const Y = (y: number) => pad + (1 - (y - lo) / (hi - lo)) * (height - pad * 2);
  const active = tip ?? sel ?? points.length - 1;
  
  function pick(locX: number) {
    let best = 0, bd = Infinity;
    points.forEach((p, i) => { const dd = Math.abs(X(p.x) - locX); if (dd < bd) { bd = dd; best = i; } });
    setSel(best);
  }

  return (
    <View style={{ gap: 8 }}>
      <Text style={st.readout}>{points[active]?.caption}</Text>
      <Pressable onLayout={(e) => setW(e.nativeEvent.layout.width)} onPress={(e) => pick(e.nativeEvent.locationX)} style={{ height, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.borderStrong }}>
        {w > 0 && goal != null && (
          <View style={[st.goalLine, { top: Y(goal) }]} />
        )}
        {w > 0 && points.slice(1).map((p, i) => {
          const a = points[i];
          const ax = X(a.x), ay = Y(a.y), bx = X(p.x), by = Y(p.y);
          const len = Math.hypot(bx - ax, by - ay);
          const ang = Math.atan2(by - ay, bx - ax);
          return (
            <View key={'s' + i} pointerEvents="none" style={{
              position: 'absolute', left: (ax + bx) / 2 - len / 2, top: (ay + by) / 2 - 1.25,
              width: len, height: 2.5, borderRadius: 2, backgroundColor: color, transform: [{ rotate: `${ang}rad` }],
            }} />
          );
        })}
        {w > 0 && points.map((p, i) => {
          const on = i === active;
          const r = on ? 5 : points.length > 40 ? 0 : 3;
          if (!r) return null;
          return (
            <View key={'d' + i} pointerEvents="none" style={{
              position: 'absolute', left: X(p.x) - r, top: Y(p.y) - r, width: r * 2, height: r * 2, borderRadius: r,
              backgroundColor: on ? color : C.bg, borderWidth: 1.5, borderColor: color,
            }} />
          );
        })}
        {/* one invisible column per point, so hovering anywhere along the line picks the nearest point */}
        {w > 0 && points.map((p, i) => {
          const left = i === 0 ? 0 : (X(points[i - 1].x) + X(p.x)) / 2;
          const right = i === points.length - 1 ? w : (X(p.x) + X(points[i + 1].x)) / 2;
          return (
            <Pressable
              key={'h' + i}
              onHoverIn={() => setTip(i)}
              onHoverOut={() => setTip((t) => (t === i ? null : t))}
              onPress={() => { setSel(i); setTip(i); setTimeout(() => setTip((t) => (t === i ? null : t)), 2500); }}
              style={{ position: 'absolute', left, width: Math.max(4, right - left), top: 0, bottom: 0 }}
            />
          );
        })}
        {tip != null && w > 0 && points[tip] && (() => {
          const p = points[tip];
          const yy = Y(p.y);
          const left = Math.max(0, Math.min(w - TIP_BOX, X(p.x) - TIP_BOX / 2));
          return (
            <View pointerEvents="none" style={{ position: 'absolute', left, width: TIP_BOX, alignItems: 'center', zIndex: 40, ...(yy > 58 ? { bottom: height - yy + 8 } : { top: yy + 10 }) }}>
              <TipBubble lines={[p.caption, p.note ?? '']} />
            </View>
          );
        })()}
        {goal != null && w > 0 && (
          <Text style={[st.goal, { top: Math.max(0, Math.min(height - 16, Y(goal) - 16)) }]}>{goalLabel ?? `Goal ${goal}`}</Text>
        )}
      </Pressable>
      <View style={st.axis}>
        <Text style={st.caption}>{startLabel ?? ''}</Text>
        <Text style={st.caption}>{endLabel ?? ''}</Text>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  axis: { flexDirection: 'row', justifyContent: 'space-between' },
  caption: { color: C.muted, fontFamily: F.body, fontSize: 11 },
  readout: { color: C.text, fontFamily: F.bodyMed, fontSize: 13 },
  goalLine: { position: 'absolute', left: 0, right: 0, height: 0, borderTopWidth: 1, borderColor: C.muted, borderStyle: 'dashed' },
  goal: { position: 'absolute', right: 0, color: C.muted, fontFamily: F.bodySemi, fontSize: 10 },
  empty: { alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: C.border, borderStyle: 'dashed', borderRadius: 8, paddingHorizontal: 16 },
});
