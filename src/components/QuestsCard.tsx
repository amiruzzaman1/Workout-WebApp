import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { banterLine } from '../lib/banter';
import { useCoachStyle } from '../lib/coachStyle';
import { playSfx, useSfxEnabled } from '../lib/sfx';
import { computeTargets } from '../lib/nutrition';
import { todayISO } from '../lib/progress';
import { useStore } from '../lib/store';
import { currentStreak, loggedDaySet } from '../lib/streak';
import { tasksForDay } from '../lib/tracker';
import { A, C, F, R } from '../lib/theme';
import { achievementsFor, levelInfo, Quest, QuestKey, questsFor, totalXp, XpInput } from '../lib/xp';
import { Celebration, CelebrationModal } from './Celebrate';
import { hovered, Row, smooth } from './ui';

const KEY = 'forge.celebrated';
type Seen = { ach: string[]; level: number; perfect: string };

/** Everything the XP system reads, from the store, in one place (also used by the achievements page). */
export function useXpInput(): XpInput {
  const { foodEntries, water, sleep, weights, logs, visits, tasks, profile } = useStore();
  const targets = useMemo(() => computeTargets(profile as any), [profile]);
  return useMemo(() => ({
    foodEntries, water, sleep, weights, logs, visits, tasks,
    targets: { protein: targets.ready ? targets.protein : undefined, water: targets.ready ? targets.water : undefined },
  }), [foodEntries, water, sleep, weights, logs, visits, tasks, targets]);
}

/** How many of today's quests are still open, for the notifications to nag about. */
export function useQuestsLeft(workoutPlanned: boolean): number {
  const input = useXpInput();
  const { tasks } = useStore();
  const today = todayISO();
  const tasksToday = useMemo(() => tasksForDay(tasks, today, today), [tasks, today]);
  return useMemo(() => questsFor(today, input, { workoutPlanned, tasksToday, sleepNightOf: today }).filter((q) => !q.done).length, [input, today, workoutPlanned, tasksToday]);
}

/**
 * Level, XP and today's quests: the small wins that add up. Tapping a quest does it (water adds a glass, the
 * rest open the right screen). A level up, a new badge or a perfect day gets a celebration, once.
 */
export function QuestsCard({ workoutPlanned, workoutRoute }: { workoutPlanned: boolean; workoutRoute: string }) {
  const router = useRouter();
  // A celebration waits until you are back on this screen, so it never pops up in the middle of a workout.
  const focused = useIsFocused();
  const { ready, water, setWater, tasks, startVisit, activeVisit, profile } = useStore();
  const [coachStyle] = useCoachStyle();
  const [sfx, setSfx] = useSfxEnabled();
  const pop = useRef(new Animated.Value(0)).current;
  const input = useXpInput();
  const today = todayISO();
  const tasksToday = useMemo(() => tasksForDay(tasks, today, today), [tasks, today]);
  const xp = useMemo(() => totalXp(input), [input]);
  const lvl = levelInfo(xp.total);
  const quests = useMemo(() => questsFor(today, input, { workoutPlanned, tasksToday, sleepNightOf: today }), [input, today, workoutPlanned, tasksToday]);
  const loggedDays = useMemo(() => loggedDaySet({ foodEntries: input.foodEntries, logs: input.logs, weights: input.weights, sleep: input.sleep }), [input]);
  const achievements = useMemo(() => achievementsFor(input, loggedDays), [input, loggedDays]);
  const doneQuests = quests.filter((q) => q.done).length;
  const perfect = quests.length > 0 && doneQuests === quests.length;
  const streak = currentStreak(loggedDays, today);

  // ---- celebrations
  const [queue, setQueue] = useState<Celebration[]>([]);
  const [banner, setBanner] = useState<string | null>(null);
  const prevDone = useRef<Record<string, boolean> | null>(null);
  const baseline = useRef(false);

  useEffect(() => {
    if (!ready) return;
    // A quest that turns done while you are looking: a small banner.
    const now: Record<string, boolean> = Object.fromEntries(quests.map((q) => [q.key, q.done]));
    if (prevDone.current) {
      const fresh = quests.filter((q) => q.done && !prevDone.current![q.key]);
      if (fresh.length) {
        setBanner(`Quest done: ${fresh[0].title}  +${fresh[0].xp} XP`);
        playSfx('ding');
        pop.setValue(0);
        Animated.spring(pop, { toValue: 1, friction: 4, tension: 120, useNativeDriver: true }).start();
        setTimeout(() => setBanner(null), 3500);
      }
    }
    prevDone.current = now;
  }, [quests, ready]);

  useEffect(() => {
    if (!ready) return;
    const doneIds = achievements.filter((a) => a.done).map((a) => a.id);
    (async () => {
      let seen: Seen | null = null;
      try { seen = JSON.parse((await AsyncStorage.getItem(KEY)) ?? 'null'); } catch { /* start fresh */ }
      const next: Seen = { ach: doneIds, level: lvl.level, perfect: seen?.perfect ?? '' };
      if (!seen) {
        // First time on this device: nothing counts as new, so an existing history does not fire a pile of celebrations.
        baseline.current = true;
        if (perfect) next.perfect = today;
        await AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
        return;
      }
      const add: Celebration[] = [];
      for (const a of achievements) if (a.done && !seen.ach.includes(a.id)) add.push({ emoji: a.emoji, title: `Badge unlocked: ${a.title}`, lines: [a.desc] });
      if (lvl.level > seen.level) add.push({ emoji: '🆙', title: `Level ${lvl.level}: ${lvl.title}`, lines: [`${xp.total} XP and climbing.`, 'Every healthy day adds up.'] });
      if (perfect && seen.perfect !== today) { add.push({ emoji: '🌟', title: 'Perfect day', lines: [`Every quest done today.`, streak > 1 ? `${streak} day streak, keep it burning.` : 'This is how habits are built.'] }); next.perfect = today; }
      else next.perfect = seen.perfect;
      next.ach = [...new Set([...seen.ach, ...doneIds])];
      next.level = Math.max(seen.level, lvl.level);
      if (add.length) { playSfx('levelup'); setQueue((q) => [...q, ...add]); await AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {}); }
      else if (next.ach.length !== seen.ach.length || next.level !== seen.level) await AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
    })();
  }, [ready, achievements.filter((a) => a.done).length, lvl.level, perfect]);

  function act(q: Quest) {
    const k: QuestKey = q.key;
    if (k === 'water') { setWater(today, (water[today] ?? 0) + 250).catch(() => {}); return; }
    if (k === 'meals' || k === 'protein') router.push('/food/add');
    else if (k === 'workout') { if (!activeVisit) startVisit('Workout'); router.push(workoutRoute as any); }
    else if (k === 'sleep') router.push('/tracker');
    else if (k === 'tasks') router.push('/tracker/tasks');
  }

  const next = quests.find((q) => !q.done);
  const firstName = (profile?.display_name ?? '').trim().split(/\s+/)[0] || 'champ';
  const say = banterLine(coachStyle, doneQuests, quests.length, firstName, today);
  return (
    <View style={s.card}>
      <Row style={{ gap: 12 }}>
        <View style={s.badge}><Text style={s.badgeNum}>{lvl.level}</Text></View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.title}>Level {lvl.level} · {lvl.title}</Text>
          <Text style={s.sub}>{xp.total} XP · +{xp.today(today)} today</Text>
        </View>
        <Pressable onPress={() => router.push('/achievements')} accessibilityRole="button" accessibilityLabel="See badges" style={(p) => [s.trophy, smooth, hovered(p) && { backgroundColor: C.card2 }]}>
          <Ionicons name="trophy-outline" size={18} color={A.carbs} />
          <Text style={s.trophyText}>{achievements.filter((a) => a.done).length}/{achievements.length}</Text>
        </Pressable>
      </Row>
      <View style={s.track}><View style={[s.fill, { width: `${Math.round(lvl.pct * 100)}%` }]} /></View>
      <Text style={s.tiny}>{lvl.into} of {lvl.need} XP to level {lvl.level + 1}</Text>

      {/* The coach talks, like the character in a language app. */}
      <View style={s.say}>
        <Image source={coachStyle === 'male' ? require('../../assets/Goku.png') : require('../../assets/Mirko.png')} resizeMode="contain" style={s.mascot} accessibilityLabel="Your coach" />
        <View style={s.bubble}><View style={s.bubbleTip} /><Text style={s.bubbleText}>{say}</Text></View>
        <Pressable onPress={() => setSfx(!sfx)} hitSlop={8} accessibilityRole="switch" accessibilityState={{ checked: sfx }} accessibilityLabel="Sound effects">
          <Ionicons name={sfx ? 'volume-medium-outline' : 'volume-mute-outline'} size={18} color={sfx ? C.muted : C.faint} />
        </Pressable>
      </View>

      {!!banner && (
        <Animated.View style={[s.banner, { transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }] }]}>
          <Ionicons name="checkmark-circle" size={16} color={A.up} /><Text style={s.bannerText}>{banner}</Text>
        </Animated.View>
      )}

      <Text style={s.heading}>Today's quests · {doneQuests} of {quests.length}</Text>
      {quests.map((q) => (
        <Pressable key={q.key} onPress={() => act(q)} disabled={q.done} accessibilityRole="button" accessibilityLabel={`${q.title}, ${q.done ? 'done' : q.detail}`}
          style={(p) => [s.quest, smooth, !q.done && hovered(p) && { backgroundColor: C.card2 }, q.done && { opacity: 0.55 }]}>
          <Ionicons name={q.done ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={q.done ? A.up : C.faint} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[s.qTitle, q.done && { textDecorationLine: 'line-through' }]} numberOfLines={1}>{q.title}</Text>
            <Text style={s.qSub} numberOfLines={1}>{q.key === 'water' && !q.done ? `${q.detail}, tap for +250 ml` : q.detail}</Text>
          </View>
          <Text style={[s.xp, q.done && { color: A.up }]}>+{q.xp}</Text>
        </Pressable>
      ))}
      {perfect ? <Text style={[s.tiny, { color: A.carbs, marginTop: 6 }]}>Perfect day! Every quest is done.</Text>
        : next && <Text style={[s.tiny, { marginTop: 6 }]}>Next up: {next.title.toLowerCase()}</Text>}

      <CelebrationModal item={focused ? queue[0] ?? null : null} onClose={() => setQueue((q) => q.slice(1))} />
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderTopWidth: 2, borderTopColor: A.carbs, borderRadius: R.lg, padding: 14, marginBottom: 14, gap: 6 },
  badge: { width: 46, height: 46, borderRadius: 23, borderWidth: 2, borderColor: A.carbs, alignItems: 'center', justifyContent: 'center', backgroundColor: A.carbs + '1f' },
  badgeNum: { color: A.carbs, fontFamily: F.display, fontSize: 22, letterSpacing: -0.5 },
  title: { color: C.text, fontFamily: F.display, fontSize: 17, letterSpacing: -0.3 },
  sub: { color: C.muted, fontFamily: F.body, fontSize: 12 },
  trophy: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1, borderColor: C.border },
  trophyText: { color: C.text, fontFamily: F.bodySemi, fontSize: 12 },
  track: { height: 6, borderRadius: 3, backgroundColor: C.border, overflow: 'hidden', marginTop: 4 },
  fill: { height: 6, backgroundColor: A.carbs },
  tiny: { color: C.muted, fontFamily: F.body, fontSize: 12 },
  heading: { color: C.muted, fontFamily: F.bodySemi, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', marginTop: 10 },
  quest: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingHorizontal: 6, borderRadius: R.sm },
  qTitle: { color: C.text, fontFamily: F.bodySemi, fontSize: 14 },
  qSub: { color: C.muted, fontFamily: F.body, fontSize: 12 },
  xp: { color: A.carbs, fontFamily: F.displayMed, fontSize: 13 },
  say: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  mascot: { width: 54, height: 54 },
  bubble: { flex: 1, minWidth: 0, backgroundColor: C.card2, borderRadius: R.md, paddingVertical: 8, paddingHorizontal: 12 },
  bubbleTip: { position: 'absolute', left: -5, top: 20, width: 10, height: 10, backgroundColor: C.card2, transform: [{ rotate: '45deg' }] },
  bubbleText: { color: C.text, fontFamily: F.bodyMed, fontSize: 13, lineHeight: 18 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: A.up + '1f', borderRadius: R.sm, paddingVertical: 8, paddingHorizontal: 10, marginTop: 6 },
  bannerText: { color: A.up, fontFamily: F.bodySemi, fontSize: 13, flex: 1 },
});
