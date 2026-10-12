import Ionicons from '@expo/vector-icons/Ionicons';
import { usePathname, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, PanResponder, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, TextInputProps, TextStyle, useWindowDimensions, View, ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { A, C, F, R, TYPE } from '../lib/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

/** Smooth colour changes when the mouse moves over something (web only, harmless on phones). */
export const smooth: any = Platform.OS === 'web'
  ? { transitionProperty: 'background-color, border-color, opacity, transform', transitionDuration: '150ms', transitionTimingFunction: 'ease' }
  : {};

/** True while the mouse is over a Pressable. React Native Web passes this to the style function. */
export const hovered = (state: any) => !!state?.hovered;

/** The page is never wider than this, so on a tablet or desktop everything is sized from it, not from the whole window. */
export const PAGE_MAX = 720;

/** Width available to page content: the window (capped at PAGE_MAX) minus the 20px side gutters. */
export function usePageWidth() {
  const { width } = useWindowDimensions();
  return Math.min(width, PAGE_MAX) - 40;
}

/** Width of a tooltip: as wide as its text on the web, a fixed width on a phone. */
const TIP_W: any = Platform.OS === 'web' ? 'max-content' : 180;

/** The small white label that pops up over a bar, a chart or a ring. One line per entry. */
export function TipBubble({ lines }: { lines: string[] }) {
  return (
    <View pointerEvents="none" style={[s.tip, { width: TIP_W }]}>
      {lines.filter(Boolean).map((l, i) => <Text key={i} style={[s.tipText, i > 0 && s.tipPct]}>{l}</Text>)}
    </View>
  );
}

/**
 * The tooltip logic. Spread `hover` on a Pressable and put `bubble` inside it, to give something that is already
 * pressable a tooltip (a wrapper around a Pressable does not get the hover on the web). `flash` shows it for a moment,
 * which is how a tap works on a phone.
 */
export function useTip(lines: string[], align: 'start' | 'center' | 'end' = 'center') {
  const [on, setOn] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const place = align === 'start' ? { left: 0, alignItems: 'flex-start' as const } : align === 'end' ? { right: 0, alignItems: 'flex-end' as const } : { left: 0, right: 0, alignItems: 'center' as const };
  return {
    on,
    hover: { onHoverIn: () => setOn(true), onHoverOut: () => setOn(false) },
    flash: () => { setOn(true); if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(() => setOn(false), 2500); },
    bubble: on ? <View pointerEvents="none" style={[s.tipPos, place]}><TipBubble lines={lines} /></View> : null,
  };
}

/**
 * Shows a tooltip over whatever it wraps when the mouse is over it, and for a moment when it is tapped on a phone.
 * `align` says which side the label lines up with, so it stays on the screen for things near the edge.
 * Do not wrap something that is already pressable (use useTip on it instead), and use tap={false} if it would take a tap.
 */
export function HoverTip({ lines, children, align = 'center', style, tap = true }: {
  lines: string[]; children: React.ReactNode; align?: 'start' | 'center' | 'end'; style?: ViewStyle; tap?: boolean;
}) {
  const tip = useTip(lines, align);
  return (
    <Pressable
      {...tip.hover}
      onPress={tap ? tip.flash : undefined}
      accessible={false}
      focusable={false}
      style={[{ position: 'relative', zIndex: tip.on ? 30 : 0 }, style]}
    >
      {children}
      {tip.bubble}
    </Pressable>
  );
}

/** A small rounded square with a coloured icon in it, so each kind of thing has its own colour. */
export function IconBadge({ name, color, size = 40 }: { name: IconName; color: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: Math.round(size * 0.32), backgroundColor: color + '24', borderWidth: 1, borderColor: color + '55', alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={name} size={Math.round(size * 0.5)} color={color} />
    </View>
  );
}

export function Screen({ children, scroll = true, top = false }: { children: React.ReactNode; scroll?: boolean; top?: boolean }) {
  const insets = useSafeAreaInsets();
  const pad = top ? { paddingTop: insets.top + 24 } : null;
  // The non-scrolling inner view needs flex:1 of its own so a flex:1 child (the chat screen's message list)
  // has an actual height to expand into; s.inner alone only sizes to its content, which otherwise collapses
  // a flex:1 ScrollView to zero height instead of hiding it off screen, so nothing looks wrong until you
  // notice messages are simply never visible.
  if (!scroll) return <View style={s.screen}><View style={[s.inner, pad, { flex: 1 }]}>{children}</View></View>;
  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.inner, pad, { paddingBottom: 64 }]} keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  );
}

/** The first page of each section, for when there is no earlier page to go back to. */
const SECTION_ROOT: Record<string, string> = { library: '/library', food: '/food', user: '/user', tracker: '/tracker', progress: '/progress' };

/**
 * A back arrow for detail pages. It goes to the page you came from. If there is none (the page was reloaded or
 * opened from a link), it goes to the top of the same section, so an exercise goes back to the Exercises list.
 */
export function HeaderBack({ onPress }: { onPress?: () => void }) {
  const router = useRouter();
  const path = usePathname();
  const go = () => {
    if (onPress) onPress();
    else if (router.canGoBack()) router.back();
    else router.replace((SECTION_ROOT[path.split('/')[1]] ?? '/') as any);
  };
  return (
    <Pressable
      onPress={go} hitSlop={10} accessibilityRole="button" accessibilityLabel="Back"
      style={(st) => [{ flexDirection: 'row', alignItems: 'center', paddingRight: 12, paddingVertical: 6, borderRadius: 999 }, smooth, hovered(st) && { backgroundColor: C.card2 }, st.pressed && { opacity: 0.7 }]}
    >
      <Ionicons name="chevron-back" size={22} color={C.text} />
      <Text style={{ color: C.text, fontFamily: F.bodyMed, fontSize: 15 }}>Back</Text>
    </Pressable>
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

/** `big` makes the heading a proper title in the display font, for pages where the headings are what you scan by (the Dashboard). */
export function Section({ title, right, children, icon, color, big }: { title: string; right?: React.ReactNode; children: React.ReactNode; icon?: IconName; color?: string; big?: boolean }) {
  return (
    <View style={{ gap: 10, marginTop: 20 }}>
      <View style={s.sectionHead}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1, minWidth: 0 }}>
          {!!icon && <Ionicons name={icon} size={big ? 20 : 15} color={color ?? C.muted} />}
          {big ? <Text style={s.sectionBig} accessibilityRole="header">{title}</Text> : <Eyebrow style={color ? { color } : undefined}>{title}</Eyebrow>}
        </View>
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
      <Pressable onPress={onPress} accessibilityRole="button" style={(st) => [s.card, smooth, style, hovered(st) && { backgroundColor: C.card2, borderColor: C.borderStrong }, st.pressed && { backgroundColor: C.card2 }]}>
        {children}
      </Pressable>
    );
  return <View style={[s.card, style]}>{children}</View>;
}

export function Button({
  title, onPress, kind = 'primary', loading, disabled, small, style, icon, tint, label, iconEnd,
}: {
  title: string; onPress: () => void; kind?: 'primary' | 'secondary' | 'ghost' | 'danger'; loading?: boolean; disabled?: boolean; small?: boolean; style?: ViewStyle;
  /** A small icon before the words. */
  icon?: IconName;
  /** Put the icon after the words instead of before them. */
  iconEnd?: boolean;
  /** Colours the icon and the hover border of a secondary button, so a food button and a water button do not look the same. */
  tint?: string;
  /** What a screen reader says. Needed when the button is only an icon (an empty title). */
  label?: string;
}) {
  const primary = kind === 'primary';
  const color = primary ? C.inverseText : kind === 'danger' ? C.muted : C.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={label ?? title}
      accessibilityState={{ disabled: !!(disabled || loading) }}
      style={(st) => [
        s.btn, small && s.btnSmall, smooth,
        primary && { backgroundColor: C.inverse },
        primary && hovered(st) && !disabled && { backgroundColor: '#dcdcdc' },
        kind === 'secondary' && { borderWidth: 1, borderColor: C.borderStrong },
        kind === 'secondary' && hovered(st) && !disabled && { backgroundColor: C.card2, borderColor: tint ?? C.text },
        kind === 'ghost' && hovered(st) && !disabled && { backgroundColor: C.card2 },
        kind === 'danger' && { borderWidth: 1, borderColor: C.border },
        kind === 'danger' && hovered(st) && !disabled && { borderColor: A.over, backgroundColor: A.over + '14' },
        (st.pressed || disabled) && { opacity: 0.55 }, style,
      ]}
    >
      {(st: any) => {
        const hot = kind === 'danger' && hovered(st);
        return loading ? <ActivityIndicator color={color} /> : (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {!!icon && !iconEnd && <Ionicons name={icon} size={small ? 15 : 18} color={hot ? A.over : tint && !primary ? tint : color} />}
            {!!title && <Text style={[s.btnText, small && { fontSize: 13 }, { color: hot ? A.over : color }]}>{title}</Text>}
            {!!icon && iconEnd && <Ionicons name={icon} size={small ? 15 : 18} color={hot ? A.over : tint && !primary ? tint : color} />}
          </View>
        );
      }}
    </Pressable>
  );
}

/** `dot` colours the chip when selected. `swatch` adds a small round colour marker and keeps the chip plain white and black. */
export function Chip({ label, active, onPress, dot, icon, swatch }: { label: string; active?: boolean; onPress?: () => void; dot?: string; icon?: (active: boolean) => React.ReactNode; swatch?: string }) {
  return (
    <Pressable
      onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: !!active }}
      style={(st) => [s.chip, smooth, hovered(st) && !active && { backgroundColor: C.card2, borderColor: dot ?? swatch ?? C.text }, active && s.chipActive, active && !!dot && { backgroundColor: dot, borderColor: dot }, st.pressed && { opacity: 0.7 }]}
    >
      {!!dot && !active && !icon && <View style={{ width: 7, height: 7, borderRadius: 2, backgroundColor: dot, marginRight: 7 }} />}
      {!!icon && <View style={{ marginRight: 7 }}>{icon(!!active)}</View>}
      <Text style={[s.chipText, active && { color: C.inverseText }]}>{label}</Text>
      {!!swatch && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: swatch, marginLeft: 8 }} />}
    </Pressable>
  );
}

export function Row({ children, style, wrap }: { children: React.ReactNode; style?: ViewStyle; wrap?: boolean }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 8 }, wrap && { flexWrap: 'wrap' }, style]}>{children}</View>;
}

export function Input(props: TextInputProps) {
  const [focus, setFocus] = useState(false);
  return (
    <TextInput
      placeholderTextColor={C.faint}
      {...props}
      onFocus={(e) => { setFocus(true); props.onFocus?.(e); }}
      onBlur={(e) => { setFocus(false); props.onBlur?.(e); }}
      style={[s.input, smooth, focus && { borderColor: C.text }, props.style]}
    />
  );
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
  left, title, subtitle, right, onPress, accent,
}: { left?: React.ReactNode; title: string; subtitle?: string; right?: React.ReactNode; onPress?: () => void; accent?: string }) {
  return (
    <Pressable
      onPress={onPress} disabled={!onPress} accessibilityRole={onPress ? 'button' : undefined}
      style={(st) => [
        accent ? s.rowCard : s.listRow, smooth, !!accent && { borderTopColor: accent },
        (st.pressed || hovered(st)) && !!onPress && (accent ? { backgroundColor: C.card2, borderColor: accent } : { backgroundColor: C.card2 }),
      ]}
    >
      {left}
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={s.rowTitle} numberOfLines={2}>{title}</Text>
        {!!subtitle && <Text style={s.rowSub} numberOfLines={2}>{subtitle}</Text>}
      </View>
      {right}
    </Pressable>
  );
}

/**
 * A choice shown as a small card with a coloured line along the top, the same look as the Streak and This week tiles
 * on the Dashboard and the numbers on the Progress page. Used for things you pick between that each have their own
 * colour, like a muscle group or a time category. The picked one is tinted in its colour.
 */
export function AccentTile({ label, color, active, onPress, icon, dashed }: {
  label: string; color: string; active?: boolean; onPress?: () => void; icon?: React.ReactNode; dashed?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: !!active }}
      style={(st) => [
        s.tile, smooth, { borderTopColor: color }, dashed && { borderStyle: 'dashed' },
        hovered(st) && !active && { backgroundColor: C.card2, borderColor: color },
        active && { backgroundColor: color + '26', borderColor: color },
        st.pressed && { opacity: 0.75 },
      ]}
    >
      {icon}
      <Text style={[s.tileText, active && { color: C.inverse }]}>{label}</Text>
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
      <Pressable onPress={() => onChange(value - step)} accessibilityRole="button" accessibilityLabel="Less" style={(st) => [s.stepBtn, smooth, { borderTopLeftRadius: R.sm, borderBottomLeftRadius: R.sm }, (hovered(st) || st.pressed) && { backgroundColor: C.card2 }]}>
        <Text style={s.stepText}>−</Text>
      </Pressable>
      <View style={s.stepValue}><Text style={s.stepValueText}>{Math.round(value * 10) / 10}{suffix}</Text></View>
      <Pressable onPress={() => onChange(value + step)} accessibilityRole="button" accessibilityLabel="More" style={(st) => [s.stepBtn, smooth, { borderTopRightRadius: R.sm, borderBottomRightRadius: R.sm }, (hovered(st) || st.pressed) && { backgroundColor: C.card2 }]}>
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
  h1: { color: C.text, fontFamily: F.display, fontSize: TYPE.page, lineHeight: 26, letterSpacing: -0.5 },
  h2: { color: C.text, fontFamily: F.display, fontSize: TYPE.heading, lineHeight: 22, letterSpacing: -0.4 },
  p: { color: C.text, fontFamily: F.body, fontSize: 15, lineHeight: 23 },
  num: { color: C.faint, fontFamily: F.displayMed, fontSize: 13, width: 22, paddingTop: 3 },
  sectionBig: { color: C.text, fontFamily: F.display, fontSize: TYPE.heading, lineHeight: 22, letterSpacing: -0.4 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border, paddingBottom: 8 },
  card: { backgroundColor: C.card, borderRadius: R.md, padding: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border, gap: 6 },
  btn: { paddingVertical: 15, paddingHorizontal: 20, borderRadius: R.sm, alignItems: 'center', justifyContent: 'center' },
  btnSmall: { paddingVertical: 8, paddingHorizontal: 12 },
  btnText: { fontFamily: F.bodySemi, fontSize: 15, letterSpacing: 0.2 },
  chip: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: C.border },
  chipActive: { backgroundColor: C.inverse, borderColor: C.inverse },
  chipText: { color: C.text, fontFamily: F.bodyMed, fontSize: 13 },
  input: { minWidth: 0, width: '100%', backgroundColor: C.card, color: C.text, borderWidth: 1, borderColor: C.border, borderRadius: R.sm, paddingHorizontal: 12, paddingVertical: 12, fontSize: 16, fontFamily: F.body },
  stat: { flex: 1, paddingVertical: 14, paddingHorizontal: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border, borderRadius: R.md, gap: 4 },
  statValue: { color: C.text, fontFamily: F.display, fontSize: 20, letterSpacing: -0.5 },
  statLabel: { color: C.muted, fontFamily: F.bodyMed, fontSize: 12 },
  sliderHit: { height: 40, justifyContent: 'center' },
  sliderTrack: { height: 4, backgroundColor: C.card2, borderRadius: 2, overflow: 'hidden' },
  sliderFill: { height: 4, backgroundColor: C.inverse },
  sliderKnob: { position: 'absolute', width: 22, height: 22, borderRadius: 11, backgroundColor: C.inverse, marginLeft: -11, borderWidth: 3, borderColor: C.bg },
  stepBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.borderStrong },
  stepText: { color: C.text, fontFamily: F.bodySemi, fontSize: 18 },
  stepValue: { minWidth: 72, height: 44, alignItems: 'center', justifyContent: 'center', borderTopWidth: 1, borderBottomWidth: 1, borderColor: C.borderStrong, paddingHorizontal: 8 },
  stepValueText: { color: C.text, fontFamily: F.displayMed, fontSize: 16 },
  tip: { backgroundColor: C.inverse, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10, maxWidth: 200, gap: 1 },
  tipText: { color: C.inverseText, fontFamily: F.bodyMed, fontSize: 11, lineHeight: 15, textAlign: 'center' },
  tipPct: { fontFamily: F.bodySemi },
  tipPos: { position: 'absolute', bottom: '100%', marginBottom: 6, zIndex: 50 },
  tile: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: C.card, borderRadius: R.lg, borderWidth: 1, borderColor: C.border, borderTopWidth: 2 },
  tileText: { color: C.text, fontFamily: F.bodySemi, fontSize: 13 },
  rowCard: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 12, marginBottom: 10, backgroundColor: C.card, borderRadius: R.lg, borderWidth: 1, borderColor: C.border, borderTopWidth: 2 },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  rowTitle: { color: C.text, fontFamily: F.bodySemi, fontSize: 15 },
  rowSub: { color: C.muted, fontFamily: F.body, fontSize: 13 },
});
