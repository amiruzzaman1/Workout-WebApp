import React, { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, PanResponder, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, TextInputProps, TextStyle, View, ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, F, R } from '../lib/theme';

export function Screen({ children, scroll = true, top = false }: { children: React.ReactNode; scroll?: boolean; top?: boolean }) {
  const insets = useSafeAreaInsets();
  const pad = top ? { paddingTop: insets.top + 24 } : null;
  if (!scroll) return <View style={s.screen}><View style={[s.inner, pad]}>{children}</View></View>;
  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.inner, pad, { paddingBottom: 64 }]} keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  );
}

export function Eyebrow({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  return <Text style={[s.eyebrow, style]}>{children}</Text>;
}
export function H1({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  return <Text style={[s.h1, style]}>{children}</Text>;
}
export function H2({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  return <Text style={[s.h2, style]}>{children}</Text>;
}
export function P({ children, muted, style }: { children: React.ReactNode; muted?: boolean; style?: TextStyle | TextStyle[] }) {
  return <Text style={[s.p, muted && { color: C.muted }, style as any]}>{children}</Text>;
}

export function Section({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <View style={{ gap: 10, marginTop: 20 }}>
      <View style={s.sectionHead}>
        <Eyebrow>{title}</Eyebrow>
        {right}
      </View>
      {children}
    </View>
  );
}

export function Divider() {
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: C.border }} />;
}

export function Card({ children, style, onPress }: { children: React.ReactNode; style?: ViewStyle; onPress?: () => void }) {
  if (onPress)
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [s.card, style, pressed && { backgroundColor: C.card2 }]}>
        {children}
      </Pressable>
    );
  return <View style={[s.card, style]}>{children}</View>;
}

export function Button({
  title, onPress, kind = 'primary', loading, disabled, small, style,
}: {
  title: string; onPress: () => void; kind?: 'primary' | 'secondary' | 'ghost' | 'danger'; loading?: boolean; disabled?: boolean; small?: boolean; style?: ViewStyle;
}) {
  const primary = kind === 'primary';
  const color = primary ? C.inverseText : kind === 'danger' ? C.muted : C.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        s.btn, small && s.btnSmall,
        primary && { backgroundColor: C.inverse },
        kind === 'secondary' && { borderWidth: 1, borderColor: C.borderStrong },
        kind === 'danger' && { borderWidth: 1, borderColor: C.border },
        (pressed || disabled) && { opacity: 0.55 }, style,
      ]}
    >
      {loading ? <ActivityIndicator color={color} /> : <Text style={[s.btnText, small && { fontSize: 13 }, { color }]}>{title}</Text>}
    </Pressable>
  );
}

export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.chip, active && s.chipActive, pressed && { opacity: 0.7 }]}>
      <Text style={[s.chipText, active && { color: C.inverseText }]}>{label}</Text>
    </Pressable>
  );
}

export function Row({ children, style, wrap }: { children: React.ReactNode; style?: ViewStyle; wrap?: boolean }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 8 }, wrap && { flexWrap: 'wrap' }, style]}>{children}</View>;
}

export function Input(props: TextInputProps) {
  return <TextInput placeholderTextColor={C.faint} {...props} style={[s.input, props.style]} />;
}

export function Label({ children }: { children: React.ReactNode }) {
  return <Text style={[s.eyebrow, { marginTop: 14, marginBottom: 2 }]}>{children}</Text>;
}

export function Stat({ value, label, color }: { value: string | number; label: string; color?: string }) {
  return (
    <View style={[s.stat, !!color && { borderTopWidth: 2, borderTopColor: color }]}>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

export function ListRow({
  left, title, subtitle, right, onPress,
}: { left?: React.ReactNode; title: string; subtitle?: string; right?: React.ReactNode; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [s.listRow, pressed && onPress && { backgroundColor: C.card2 }]}>
      {left}
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={s.rowTitle} numberOfLines={2}>{title}</Text>
        {!!subtitle && <Text style={s.rowSub} numberOfLines={2}>{subtitle}</Text>}
      </View>
      {right}
    </Pressable>
  );
}

/** Drag or tap anywhere on the track. */
export function Slider({
  value, min, max, step = 1, onChange,
}: { value: number; min: number; max: number; step?: number; onChange: (v: number) => void }) {
  const [width, setWidth] = useState(0);
  const w = useRef(0);
  w.current = width;
  const clamp = (v: number) => Math.min(max, Math.max(min, Math.round(v / step) * step));
  const fromX = (x: number) => clamp(min + (Math.min(Math.max(x, 0), w.current) / (w.current || 1)) * (max - min));
  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (e) => onChange(fromX(e.nativeEvent.locationX)),
        onPanResponderMove: (e, g) => {
          const x = (e.nativeEvent as any).locationX ?? g.moveX;
          onChange(fromX(x));
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [min, max, step, onChange],
  );
  const pct = max > min ? (value - min) / (max - min) : 0;
  return (
    <View style={s.sliderHit} onLayout={(e) => setWidth(e.nativeEvent.layout.width)} {...pan.panHandlers}>
      <View style={s.sliderTrack}>
        <View style={[s.sliderFill, { width: `${Math.min(1, Math.max(0, pct)) * 100}%` }]} />
      </View>
      <View style={[s.sliderKnob, { left: `${Math.min(1, Math.max(0, pct)) * 100}%` }]} />
    </View>
  );
}

export function Stepper({ value, onChange, step = 1, suffix = '' }: { value: number; onChange: (v: number) => void; step?: number; suffix?: string }) {
  return (
    <Row style={{ gap: 0 }}>
      <Pressable onPress={() => onChange(value - step)} style={[s.stepBtn, { borderTopLeftRadius: R.sm, borderBottomLeftRadius: R.sm }]}>
        <Text style={s.stepText}>−</Text>
      </Pressable>
      <View style={s.stepValue}><Text style={s.stepValueText}>{Math.round(value * 10) / 10}{suffix}</Text></View>
      <Pressable onPress={() => onChange(value + step)} style={[s.stepBtn, { borderTopRightRadius: R.sm, borderBottomRightRadius: R.sm }]}>
        <Text style={s.stepText}>+</Text>
      </Pressable>
    </Row>
  );
}

export function Loading() {
  return (
    <View style={[s.screen, { alignItems: 'center', justifyContent: 'center' }]}>
      <ActivityIndicator color={C.text} />
    </View>
  );
}

export function Bullets({ items, numbered }: { items: string[]; numbered?: boolean }) {
  return (
    <View style={{ gap: 12 }}>
      {items.map((t, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
          <Text style={[s.num]}>{numbered ? String(i + 1).padStart(2, '0') : '\u2022'}</Text>
          <Text style={[s.p, { flex: 1 }]}>{t}</Text>
        </View>
      ))}
    </View>
  );
}

/** Photos from the dataset are colour; render them monochrome to match the app. */
export const mono: any = Platform.OS === 'web' ? { filter: 'grayscale(1) contrast(1.05)' } : {};

export const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  inner: { paddingHorizontal: 20, paddingTop: 16, gap: 12, width: '100%', maxWidth: 720, alignSelf: 'center' },
  eyebrow: { color: C.muted, fontFamily: F.bodySemi, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase' },
  h1: { color: C.text, fontFamily: F.display, fontSize: 38, lineHeight: 42, letterSpacing: -1.2 },
  h2: { color: C.text, fontFamily: F.display, fontSize: 22, lineHeight: 26, letterSpacing: -0.5 },
  p: { color: C.text, fontFamily: F.body, fontSize: 15, lineHeight: 23 },
  num: { color: C.faint, fontFamily: F.displayMed, fontSize: 13, width: 22, paddingTop: 3 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border, paddingBottom: 8 },
  card: { backgroundColor: C.card, borderRadius: R.md, padding: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border, gap: 6 },
  btn: { paddingVertical: 15, paddingHorizontal: 20, borderRadius: R.sm, alignItems: 'center', justifyContent: 'center' },
  btnSmall: { paddingVertical: 8, paddingHorizontal: 12 },
  btnText: { fontFamily: F.bodySemi, fontSize: 15, letterSpacing: 0.2 },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: C.border },
  chipActive: { backgroundColor: C.inverse, borderColor: C.inverse },
  chipText: { color: C.text, fontFamily: F.bodyMed, fontSize: 13 },
  input: { minWidth: 0, width: '100%', backgroundColor: C.card, color: C.text, borderWidth: 1, borderColor: C.border, borderRadius: R.sm, paddingHorizontal: 12, paddingVertical: 12, fontSize: 16, fontFamily: F.body },
  stat: { flex: 1, paddingVertical: 14, paddingHorizontal: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border, borderRadius: R.md, gap: 4 },
  statValue: { color: C.text, fontFamily: F.display, fontSize: 30, letterSpacing: -1 },
  statLabel: { color: C.muted, fontFamily: F.bodyMed, fontSize: 12 },
  sliderHit: { height: 40, justifyContent: 'center' },
  sliderTrack: { height: 4, backgroundColor: C.card2, borderRadius: 2, overflow: 'hidden' },
  sliderFill: { height: 4, backgroundColor: C.inverse },
  sliderKnob: { position: 'absolute', width: 22, height: 22, borderRadius: 11, backgroundColor: C.inverse, marginLeft: -11, borderWidth: 3, borderColor: C.bg },
  stepBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.borderStrong },
  stepText: { color: C.text, fontFamily: F.bodySemi, fontSize: 18 },
  stepValue: { minWidth: 72, height: 44, alignItems: 'center', justifyContent: 'center', borderTopWidth: 1, borderBottomWidth: 1, borderColor: C.borderStrong, paddingHorizontal: 8 },
  stepValueText: { color: C.text, fontFamily: F.displayMed, fontSize: 16 },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  rowTitle: { color: C.text, fontFamily: F.bodySemi, fontSize: 15 },
  rowSub: { color: C.muted, fontFamily: F.body, fontSize: 13 },
});
