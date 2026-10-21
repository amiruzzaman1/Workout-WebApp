import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { CAREER_START, CareerTask } from '../../data/careerPlan';
import { C, F, R } from '../../lib/theme';
import { hovered, smooth } from '../ui';

export const DAY = 86400000;
export const START = new Date(`${CAREER_START}T00:00:00`);
export const weekStart = (i: number) => new Date(START.getTime() + i * 7 * DAY);
export const fmtDay = (d: Date) => d.toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' });
export const fmtLong = (d: Date) => d.toLocaleDateString('en-NZ', { weekday: 'short', day: 'numeric', month: 'short' });
export const isoDate = (s: string) => new Date(`${s}T00:00:00`);
/** 1 based week of the plan a date falls in. Below 1 is before the plan starts, above 14 is after it ends. */
export const weekOf = (d: Date) => Math.floor((d.getTime() - START.getTime()) / (7 * DAY)) + 1;
export const todayMidnight = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
export const open = (url: string) => { Linking.openURL(url).catch(() => {}); };

export function LinkChip({ label, url, kind, color }: { label: string; url: string; kind?: string; color: string }) {
  return (
    <Pressable onPress={() => open(url)} accessibilityRole="link" accessibilityLabel={label} style={(st) => [k.link, smooth, hovered(st) && { borderColor: color, backgroundColor: C.card2 }]}>
      {(st: any) => (
        <>
          {!!kind && <Text style={[k.linkKind, { color }]}>{kind}</Text>}
          <Text style={[k.linkText, hovered(st) && { color: C.text }]}>{label}</Text>
          <Ionicons name="open-outline" size={11} color={hovered(st) ? C.text : C.faint} />
        </>
      )}
    </Pressable>
  );
}

export function Tag({ text, color, solid }: { text: string; color: string; solid?: boolean }) {
  return (
    <View style={[k.tag, { borderColor: color + (solid ? '' : '88') }, solid && { backgroundColor: color }]}>
      <Text style={[k.tagText, { color: solid ? C.inverseText : color }]}>{text}</Text>
    </View>
  );
}

/**
 * A tick box like the Tasks page: the box fills, a tick pops in and a line is drawn through the words. Under it,
 * Steps opens the how to and the time it should take, and the links to the resource.
 */
export function PlanTask({ task, done, color, onToggle }: { task: CareerTask; done: boolean; color: string; onToggle: () => void }) {
  const p = useRef(new Animated.Value(done ? 1 : 0)).current;
  const still = useRef(false);
  const [more, setMore] = useState(false);
  useEffect(() => { AccessibilityInfo.isReduceMotionEnabled?.().then((v) => { still.current = v; }).catch(() => {}); }, []);
  useEffect(() => {
    Animated.timing(p, { toValue: done ? 1 : 0, duration: still.current ? 0 : done ? 380 : 220, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [done]);
  const fill = p.interpolate({ inputRange: [0, 1], outputRange: [color + '00', color] });
  const text = p.interpolate({ inputRange: [0, 1], outputRange: [C.text, C.faint] });
  const line = p.interpolate({ inputRange: [0, 0.35, 1], outputRange: ['0%', '0%', '100%'] });
  const pop = p.interpolate({ inputRange: [0, 0.5, 0.75, 1], outputRange: [0, 0, 1.25, 1] });
  const hasMore = !!task.how || task.links.length > 0;

  return (
    <View style={k.task}>
      <Pressable onPress={onToggle} hitSlop={8} accessibilityRole="checkbox" accessibilityState={{ checked: done }} accessibilityLabel={task.text} style={(st) => [k.hit, smooth, hovered(st) && { backgroundColor: color + '22' }]}>
        <Animated.View style={[k.box, { borderColor: done ? color : C.faint, backgroundColor: fill }]}>
          <Animated.View style={{ transform: [{ scale: pop }] }}>
            <Ionicons name="checkmark" size={15} color={C.inverseText} />
          </Animated.View>
        </Animated.View>
      </Pressable>
      <View style={{ flex: 1, minWidth: 0, gap: 5 }}>
        <Pressable onPress={onToggle} accessible={false} style={{ alignSelf: 'flex-start', maxWidth: '100%' }}>
          <Animated.Text style={[k.taskText, { color: text }]}>{task.text}</Animated.Text>
          <Animated.View pointerEvents="none" style={[k.strike, { width: line }]} />
        </Pressable>
        <View style={k.metaRow}>
          {!!task.time && (
            <View style={k.time}>
              <Ionicons name="time-outline" size={12} color={C.muted} />
              <Text style={k.timeText}>{task.time}</Text>
            </View>
          )}
          {hasMore && (
            <Pressable onPress={() => setMore((v) => !v)} accessibilityRole="button" accessibilityState={{ expanded: more }} accessibilityLabel={`Steps for ${task.text}`} style={(st) => [k.steps, smooth, hovered(st) && { backgroundColor: color + '22' }]}>
              <Text style={[k.stepsText, { color }]}>{more ? 'Hide steps' : 'Steps and links'}</Text>
              <Ionicons name={more ? 'chevron-up' : 'chevron-down'} size={13} color={color} />
            </Pressable>
          )}
        </View>
        {more && (
          <View style={[k.how, { borderLeftColor: color }]}>
            {!!task.how && <Text style={k.howText}>{task.how}</Text>}
            {task.links.length > 0 && (
              <View style={k.links}>
                {task.links.map((l) => <LinkChip key={l.url + l.label} label={l.label} url={l.url} kind={l.kind} color={color} />)}
              </View>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

export const k = StyleSheet.create({
  meta: { color: C.muted, fontFamily: F.body, fontSize: 12 },
  panel: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: R.lg, padding: 14, gap: 8 },
  panelTitle: { color: C.text, fontFamily: F.bodySemi, fontSize: 15 },
  body: { color: C.muted, fontFamily: F.body, fontSize: 13, lineHeight: 19 },
  task: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 8 },
  hit: { padding: 3, borderRadius: 999 },
  box: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  taskText: { fontFamily: F.body, fontSize: 14, lineHeight: 20 },
  strike: { position: 'absolute', left: 0, top: 10, height: 2, marginTop: -1, borderRadius: 1, backgroundColor: C.muted },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10 },
  time: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timeText: { color: C.muted, fontFamily: F.body, fontSize: 12 },
  steps: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999 },
  stepsText: { fontFamily: F.bodySemi, fontSize: 12 },
  how: { borderLeftWidth: 2, paddingLeft: 10, gap: 8, marginTop: 2 },
  howText: { color: C.soft, fontFamily: F.body, fontSize: 13, lineHeight: 20 },
  links: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  link: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: C.border, borderRadius: R.sm, paddingHorizontal: 7, paddingVertical: 4 },
  linkKind: { fontFamily: F.bodySemi, fontSize: 9, letterSpacing: 0.6, textTransform: 'uppercase' },
  linkText: { color: C.muted, fontFamily: F.bodyMed, fontSize: 12 },
  tag: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 },
  tagText: { fontFamily: F.bodySemi, fontSize: 10, letterSpacing: 0.4, textTransform: 'uppercase' },
});
