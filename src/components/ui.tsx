import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle } from 'react-native';
import { C } from '../lib/theme';

export function Screen({ children, scroll = true }: { children: React.ReactNode; scroll?: boolean }) {
  if (!scroll) return <View style={s.screen}><View style={s.inner}>{children}</View></View>;
  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.inner, { paddingBottom: 48 }]} keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  );
}

export function H1({ children }: { children: React.ReactNode }) {
  return <Text style={s.h1}>{children}</Text>;
}
export function H2({ children, style }: { children: React.ReactNode; style?: any }) {
  return <Text style={[s.h2, style]}>{children}</Text>;
}
export function P({ children, muted, style }: { children: React.ReactNode; muted?: boolean; style?: any }) {
  return <Text style={[s.p, muted && { color: C.muted }, style]}>{children}</Text>;
}

export function Card({ children, style, onPress }: { children: React.ReactNode; style?: ViewStyle; onPress?: () => void }) {
  if (onPress)
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [s.card, style, pressed && { opacity: 0.8 }]}>
        {children}
      </Pressable>
    );
  return <View style={[s.card, style]}>{children}</View>;
}

export function Button({
  title, onPress, kind = 'primary', loading, disabled, small, style,
}: {
  title: string; onPress: () => void; kind?: 'primary' | 'secondary' | 'danger'; loading?: boolean; disabled?: boolean; small?: boolean; style?: ViewStyle;
}) {
  const bg = kind === 'primary' ? C.accent : kind === 'danger' ? 'transparent' : C.card2;
  const color = kind === 'primary' ? C.accentText : kind === 'danger' ? C.danger : C.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        s.btn, small && s.btnSmall, { backgroundColor: bg }, kind === 'danger' && { borderWidth: 1, borderColor: C.danger },
        (pressed || disabled) && { opacity: 0.6 }, style,
      ]}
    >
      {loading ? <ActivityIndicator color={color} /> : <Text style={[s.btnText, small && { fontSize: 14 }, { color }]}>{title}</Text>}
    </Pressable>
  );
}

export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={[s.chip, active && { backgroundColor: C.accent, borderColor: C.accent }]}>
      <Text style={[s.chipText, active && { color: C.accentText, fontWeight: '700' }]}>{label}</Text>
    </Pressable>
  );
}

export function Row({ children, style, wrap }: { children: React.ReactNode; style?: ViewStyle; wrap?: boolean }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 8 }, wrap && { flexWrap: 'wrap' }, style]}>{children}</View>;
}

export function Input(props: TextInputProps) {
  return <TextInput placeholderTextColor={C.muted} {...props} style={[s.input, props.style]} />;
}

export function Label({ children }: { children: React.ReactNode }) {
  return <Text style={s.label}>{children}</Text>;
}

export function Loading() {
  return (
    <View style={[s.screen, { alignItems: 'center', justifyContent: 'center' }]}>
      <ActivityIndicator color={C.accent} size="large" />
    </View>
  );
}

export function Bullets({ items, numbered }: { items: string[]; numbered?: boolean }) {
  return (
    <View style={{ gap: 8 }}>
      {items.map((t, i) => (
        <Row key={i} style={{ alignItems: 'flex-start' }}>
          <Text style={[s.p, { color: C.accent, width: 22, fontWeight: '700' }]}>{numbered ? `${i + 1}.` : '•'}</Text>
          <Text style={[s.p, { flex: 1 }]}>{t}</Text>
        </Row>
      ))}
    </View>
  );
}

export const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  inner: { padding: 16, gap: 12, width: '100%', maxWidth: 760, alignSelf: 'center' },
  h1: { color: C.text, fontSize: 26, fontWeight: '800' },
  h2: { color: C.text, fontSize: 18, fontWeight: '700', marginTop: 4 },
  p: { color: C.text, fontSize: 15, lineHeight: 22 },
  card: { backgroundColor: C.card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: C.border, gap: 6 },
  btn: { paddingVertical: 13, paddingHorizontal: 18, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  btnSmall: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10 },
  btnText: { fontSize: 16, fontWeight: '700' },
  chip: { paddingVertical: 7, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: C.border, backgroundColor: C.card },
  chipText: { color: C.text, fontSize: 14 },
  input: { backgroundColor: C.card, color: C.text, borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 16 },
  label: { color: C.muted, fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 8 },
});
