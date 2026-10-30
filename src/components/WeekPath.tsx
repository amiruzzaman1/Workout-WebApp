import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { DAY_SHORT, PlanDay, WEEK_ORDER } from '../lib/planner';
import { A, C, F, R } from '../lib/theme';
import { hovered, smooth } from './ui';

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

type NodeState = 'done' | 'today' | 'todayDone' | 'rest' | 'missed' | 'upcoming';

/** The training week as a row of round stops, like a path: ticked, today (bouncing, with a START bubble), rest, or still to come. */
export function WeekPath({ days, doneDates, today }: { days: PlanDay[]; doneDates: Set<string>; today: string }) {
  const router = useRouter();
  const bounce = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    AccessibilityInfo.isReduceMotionEnabled?.().then((still) => {
      if (still) return;
      loop = Animated.loop(Animated.sequence([
        Animated.timing(bounce, { toValue: 1, duration: 520, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(bounce, { toValue: 0, duration: 520, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ]));
      loop.start();
    }).catch(() => {});
    return () => { loop?.stop(); };
  }, []);

  const now = new Date(`${today}T12:00:00`);
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const nodes = WEEK_ORDER.map((dow, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const date = iso(d);
    const sessions = days.find((x) => x.day === dow)?.sessions ?? [];
    const planned = sessions.length > 0;
    const done = doneDates.has(date);
    let state: NodeState;
    if (date === today) state = done ? 'todayDone' : planned ? 'today' : 'rest';
    else if (!planned) state = 'rest';
    else if (done) state = 'done';
    else state = date < today ? 'missed' : 'upcoming';
    return { dow, date, state, planned, title: sessions[0]?.title ?? 'Rest day' };
  });
  const doneCount = nodes.filter((n) => n.state === 'done' || n.state === 'todayDone').length;
  const plannedCount = nodes.filter((n) => n.planned).length;

  return (
    <View style={s.card}>
      <View style={s.head}>
        <Text style={s.title}>Your week</Text>
        <Text style={s.sub}>{doneCount} of {plannedCount} workouts</Text>
      </View>
      <View style={s.row}>
        <View style={s.line} />
        {nodes.map((n) => {
          const isToday = n.state === 'today';
          const color = n.state === 'done' || n.state === 'todayDone' ? A.up : isToday ? A.carbs : n.state === 'rest' ? '#8f9bff' : n.state === 'missed' ? C.faint : C.borderStrong;
          const icon = n.state === 'done' || n.state === 'todayDone' ? 'checkmark' : isToday ? 'barbell' : n.state === 'rest' ? 'moon' : n.state === 'missed' ? 'remove' : 'barbell-outline';
          const filled = n.state === 'done' || n.state === 'todayDone' || isToday;
          return (
            <View key={n.date} style={s.col}>
              {isToday && (
                <Animated.View style={[s.startBubble, { transform: [{ translateY: bounce.interpolate({ inputRange: [0, 1], outputRange: [0, -5] }) }] }]}>
                  <Text style={s.startText}>START</Text>
                  <View style={s.startTip} />
                </Animated.View>
              )}
              <Animated.View style={isToday ? { transform: [{ translateY: bounce.interpolate({ inputRange: [0, 1], outputRange: [0, -3] }) }] } : undefined}>
                <Pressable
                  onPress={() => n.planned && router.push(`/workout/${n.dow}/0?date=${n.date}` as any)} disabled={!n.planned}
                  accessibilityRole="button" accessibilityLabel={`${DAY_SHORT[n.dow]}: ${n.title}${n.state === 'done' || n.state === 'todayDone' ? ', done' : ''}`}
                  style={(p) => [s.node, { borderColor: color, backgroundColor: filled ? color : C.card2 }, filled && { borderBottomColor: color + 'aa' }, smooth, hovered(p) && n.planned && { opacity: 0.85 }, p.pressed && n.planned && { transform: [{ translateY: 3 }], borderBottomWidth: 2 }]}
                >
                  <Ionicons name={icon as any} size={20} color={filled ? C.inverseText : color} />
                </Pressable>
              </Animated.View>
              <Text style={[s.day, isToday && { color: C.text }]}>{DAY_SHORT[n.dow]}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderTopWidth: 2, borderTopColor: A.up, borderRadius: R.lg, padding: 14, marginBottom: 14 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 },
  title: { color: C.text, fontFamily: F.display, fontSize: 17, letterSpacing: -0.3 },
  sub: { color: C.muted, fontFamily: F.body, fontSize: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 22 },
  line: { position: 'absolute', left: 20, right: 20, top: 22 + 21, height: 3, backgroundColor: C.border, borderRadius: 2 },
  col: { alignItems: 'center', gap: 6, width: 42 },
  node: { width: 42, height: 42, borderRadius: 21, borderWidth: 2, borderBottomWidth: 5, alignItems: 'center', justifyContent: 'center' },
  day: { color: C.muted, fontFamily: F.bodySemi, fontSize: 11 },
  startBubble: { position: 'absolute', top: -24, backgroundColor: C.inverse, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 3, zIndex: 2, alignItems: 'center' },
  startText: { color: C.inverseText, fontFamily: F.displayMed, fontSize: 9, letterSpacing: 0.8 },
  startTip: { position: 'absolute', bottom: -4, width: 8, height: 8, backgroundColor: C.inverse, transform: [{ rotate: '45deg' }] },
});
