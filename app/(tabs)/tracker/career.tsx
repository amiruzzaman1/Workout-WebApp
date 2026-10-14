import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Eyebrow, H1, hovered, HoverTip, P, Screen, Section, smooth, useTip } from '../../../src/components/ui';
import { ALL_TASK_IDS, CAREER_START, CAREER_WEEKS, CareerTask, CareerWeek, LIBRARY, PHASES, PLAN, RHYTHM } from '../../../src/data/careerPlan';
import { isOwner } from '../../../src/lib/owner';
import { useStore } from '../../../src/lib/store';
import { A, C, F, R } from '../../../src/lib/theme';

const DAY = 86400000;
const START = new Date(`${CAREER_START}T00:00:00`);
const weekStart = (i: number) => new Date(START.getTime() + i * 7 * DAY);
const fmtDay = (d: Date) => d.toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' });
const open = (url: string) => { Linking.openURL(url).catch(() => {}); };

/** The same Keep style tick as the Tasks page: the box fills, a tick pops in and a line is drawn through the words. */
function PlanTask({ task, done, color, onToggle }: { task: CareerTask; done: boolean; color: string; onToggle: () => void }) {
  const p = useRef(new Animated.Value(done ? 1 : 0)).current;
  const still = useRef(false);
  useEffect(() => { AccessibilityInfo.isReduceMotionEnabled?.().then((v) => { still.current = v; }).catch(() => {}); }, []);
  useEffect(() => {
    Animated.timing(p, { toValue: done ? 1 : 0, duration: still.current ? 0 : done ? 380 : 220, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [done]);
  const fill = p.interpolate({ inputRange: [0, 1], outputRange: [color + '00', color] });
  const text = p.interpolate({ inputRange: [0, 1], outputRange: [C.text, C.faint] });
  const line = p.interpolate({ inputRange: [0, 0.35, 1], outputRange: ['0%', '0%', '100%'] });
  const pop = p.interpolate({ inputRange: [0, 0.5, 0.75, 1], outputRange: [0, 0, 1.25, 1] });

  return (
    <View style={s.task}>
      <Pressable onPress={onToggle} hitSlop={8} accessibilityRole="checkbox" accessibilityState={{ checked: done }} accessibilityLabel={task.text} style={(st) => [s.hit, smooth, hovered(st) && { backgroundColor: color + '22' }]}>
        <Animated.View style={[s.box, { borderColor: done ? color : C.faint, backgroundColor: fill }]}>
          <Animated.View style={{ transform: [{ scale: pop }] }}>
            <Ionicons name="checkmark" size={15} color={C.inverseText} />
          </Animated.View>
        </Animated.View>
      </Pressable>
      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
        <Pressable onPress={onToggle} accessible={false} style={{ alignSelf: 'flex-start', maxWidth: '100%' }}>
          <Animated.Text style={[s.taskText, { color: text }]}>{task.text}</Animated.Text>
          <Animated.View pointerEvents="none" style={[s.strike, { width: line }]} />
        </Pressable>
        {task.links.length > 0 && (
          <View style={s.links}>
            {task.links.map((l) => (
              <Pressable key={l.url + l.label} onPress={() => open(l.url)} accessibilityRole="link" accessibilityLabel={l.label} style={(st) => [s.link, smooth, hovered(st) && { borderColor: color, backgroundColor: C.card2 }]}>
                {(st: any) => (
                  <>
                    {!!l.kind && <Text style={[s.linkKind, { color }]}>{l.kind}</Text>}
                    <Text style={[s.linkText, hovered(st) && { color: C.text }]}>{l.label}</Text>
                    <Ionicons name="open-outline" size={11} color={hovered(st) ? C.text : C.faint} />
                  </>
                )}
              </Pressable>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

function WeekCard({ week, expanded, isNow, done, onHeader, onToggle }: { week: CareerWeek; expanded: boolean; isNow: boolean; done: Record<string, string>; onHeader: () => void; onToggle: (id: string) => void }) {
  const ph = PHASES[week.phase];
  const n = week.tasks.filter((t) => done[t.id]).length;
  const pct = n / week.tasks.length;
  const s0 = weekStart(week.n - 1), s1 = new Date(s0.getTime() + 6 * DAY);
  const tip = useTip([`Week ${week.n}: ${n} of ${week.tasks.length} done`, `${Math.round(pct * 100)}% of the week`], 'end');
  return (
    <View style={[s.week, { borderTopColor: ph.color }, expanded && { borderColor: ph.color + '66', borderTopColor: ph.color }]}>
      <Pressable
        {...tip.hover}
        onPress={onHeader} accessibilityRole="button" accessibilityState={{ expanded }} accessibilityLabel={`Week ${week.n}, ${week.title}`}
        style={(st) => [s.weekHead, smooth, hovered(st) && { backgroundColor: C.card2 }, { zIndex: tip.on ? 30 : 0 }]}
      >
        <Text style={[s.weekNum, { color: ph.color }]}>W{week.n}</Text>
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Text style={s.weekTitle} numberOfLines={2}>{week.title}</Text>
          <Text style={s.meta} numberOfLines={1}>
            {fmtDay(s0)} to {fmtDay(s1)} · <Text style={{ color: ph.color }}>{ph.label}</Text>
            {isNow ? ' · this week' : ''}
            {week.events.length ? ` · ${week.events.length} ${week.events.length > 1 ? 'events' : 'event'}` : ''}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 6 }}>
          <Text style={[s.meta, n === week.tasks.length && { color: A.up }]}>{n}/{week.tasks.length}</Text>
          <View style={s.mini}><View style={[s.miniFill, { width: `${pct * 100}%`, backgroundColor: ph.color }]} /></View>
        </View>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={C.faint} />
        {tip.bubble}
      </Pressable>
      {expanded && (
        <View style={s.weekBody}>
          <P muted style={{ fontSize: 13, lineHeight: 19 }}>{week.goal}</P>
          <View style={{ gap: 2 }}>
            {week.tasks.map((t) => <PlanTask key={t.id} task={t} done={!!done[t.id]} color={ph.color} onToggle={() => onToggle(t.id)} />)}
          </View>
          {week.events.length > 0 && (
            <View style={s.events}>
              <Eyebrow>Events this week</Eyebrow>
              {week.events.map((e) => (
                <Pressable key={e.when + e.text} onPress={() => open(e.url)} accessibilityRole="link" style={(st) => [s.event, smooth, hovered(st) && { backgroundColor: C.card2 }]}>
                  <Ionicons name="calendar-outline" size={15} color={A.cardio} style={{ marginTop: 2 }} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[s.meta, { color: A.cardio }]}>{e.when}</Text>
                    <Text style={s.eventText}>{e.text}</Text>
                  </View>
                  <Ionicons name="open-outline" size={13} color={C.faint} style={{ marginTop: 2 }} />
                </Pressable>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

function StripCell({ week, pct, isNow, onPress }: { week: CareerWeek; pct: number; isNow: boolean; onPress: () => void }) {
  const ph = PHASES[week.phase];
  const align = week.n <= 3 ? 'start' : week.n >= 12 ? 'end' : 'center';
  const tip = useTip([`Week ${week.n}: ${week.title}`, `${Math.round(pct * 100)}% done`], align);
  return (
    <Pressable {...tip.hover} onPress={() => { onPress(); tip.flash(); }} accessibilityRole="button" accessibilityLabel={`Week ${week.n}`} style={{ flex: 1, minWidth: 0, gap: 4, zIndex: tip.on ? 30 : 0 }}>
      {(st: any) => (
        <>
          <View style={[s.cell, smooth, isNow && { borderColor: C.text }, hovered(st) && { borderColor: ph.color }]}>
            <View style={[s.cellFill, { height: `${pct * 100}%`, backgroundColor: ph.color }]} />
          </View>
          <Text style={[s.cellLbl, isNow && { color: C.text }]}>{week.n}</Text>
          {tip.bubble}
        </>
      )}
    </Pressable>
  );
}

/** Amir's 14 week plan to a Software Engineer job in NZ, ticked off task by task and saved to the account. */
export default function Career() {
  const { careerDone, setCareerTask, session } = useStore();
  if (!isOwner(session)) {
    return (
      <Screen>
        <Stack.Screen options={{ title: '' }} />
        <H1>Not available</H1>
        <P muted>This page is private to one account.</P>
      </Screen>
    );
  }
  return <CareerPlan careerDone={careerDone} setCareerTask={setCareerTask} />;
}

function CareerPlan({ careerDone, setCareerTask }: { careerDone: Record<string, string>; setCareerTask: (id: string, done: boolean) => Promise<void> }) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const rawIdx = Math.floor((today.getTime() - START.getTime()) / (7 * DAY));
  const nowIdx = Math.max(0, Math.min(CAREER_WEEKS - 1, rawIdx));
  const started = rawIdx >= 0, finished = rawIdx >= CAREER_WEEKS;
  const [expanded, setExpanded] = useState<Set<number>>(() => new Set([nowIdx + 1]));
  const [error, setError] = useState<string | null>(null);

  const total = ALL_TASK_IDS.filter((id) => careerDone[id]).length;
  const pct = total / ALL_TASK_IDS.length;
  const now = PLAN[nowIdx];
  const nowLeft = now.tasks.filter((t) => !careerDone[t.id]).length;
  const daysToExam = Math.ceil((weekStart(7).getTime() - today.getTime()) / DAY);
  const daysLeft = Math.ceil((weekStart(CAREER_WEEKS).getTime() - today.getTime()) / DAY);
  const weekPct = (w: CareerWeek) => w.tasks.filter((t) => careerDone[t.id]).length / w.tasks.length;

  const flip = (n: number) => setExpanded((cur) => { const next = new Set(cur); if (next.has(n)) next.delete(n); else next.add(n); return next; });
  const toggle = (id: string) => {
    setError(null);
    setCareerTask(id, !careerDone[id]).catch(() => setError('Could not save that tick. Check your connection and try again.'));
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: '' }} />
      <Eyebrow>{fmtDay(START)} 2026 to {fmtDay(new Date(weekStart(CAREER_WEEKS).getTime() - DAY))} 2027 · Tracker</Eyebrow>
      <H1>Career plan</H1>
      <P muted style={{ fontSize: 13, lineHeight: 19 }}>
        Goal: a Software Engineer role in NZ paying $73k or more, the Skilled Migrant wage line. Azure AI-103, Python, TypeScript, PostgreSQL, Docker and GitHub Actions, with 4 gym sessions a week.
      </P>

      <View style={s.hero}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 14 }}>
          <Text style={s.big}>{Math.round(pct * 100)}%</Text>
          <View style={{ flex: 1, minWidth: 0, paddingBottom: 4 }}>
            <Text style={s.heroLine}>{total} of {ALL_TASK_IDS.length} tasks done</Text>
            <Text style={s.meta}>{!started ? `Starts ${fmtDay(START)}` : finished ? 'Block complete' : `Week ${nowIdx + 1} of ${CAREER_WEEKS}`}</Text>
          </View>
        </View>
        <HoverTip align="start" lines={[`${total} of ${ALL_TASK_IDS.length} tasks done`, `${Math.round(pct * 100)}% of the whole plan`]}>
          <View style={s.track}><View style={[s.fill, { width: `${pct * 100}%` }]} /></View>
        </HoverTip>
        {!!error && <Text style={{ color: C.danger, fontFamily: F.body, fontSize: 13 }}>{error}</Text>}
      </View>

      <Section title="The block, week by week" icon="barbell-outline" color={A.protein}>
        <View style={s.strip}>
          {PLAN.map((w, i) => <StripCell key={w.n} week={w} pct={weekPct(w)} isNow={started && !finished && i === nowIdx} onPress={() => setExpanded((cur) => new Set(cur).add(w.n))} />)}
        </View>
        <View style={s.legend}>
          {(Object.keys(PHASES) as (keyof typeof PHASES)[]).map((k) => (
            <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 9, height: 9, borderRadius: 2, backgroundColor: PHASES[k].color }} />
              <Text style={s.meta}>{PHASES[k].label}: {PHASES[k].blurb}</Text>
            </View>
          ))}
        </View>
      </Section>

      <Section title={started && !finished ? 'This week' : !started ? 'First week' : 'Last week'} icon="flag-outline" color={PHASES[now.phase].color}>
        <View style={[s.nowCard, { borderTopColor: PHASES[now.phase].color }]}>
          <Text style={s.weekTitle}>W{now.n}: {now.title}</Text>
          <Text style={s.meta}>{nowLeft ? `${nowLeft} tasks left this week` : 'Every task done this week'}</Text>
          {daysToExam > 0 && <Text style={s.meta}>{daysToExam} days to the AI-103 exam week</Text>}
          {daysLeft > 0 && <Text style={s.meta}>{daysLeft} days left in the block</Text>}
        </View>
      </Section>

      <Section title="The weeks" icon="list-outline" color={A.protein}>
        {PLAN.map((w, i) => (
          <WeekCard key={w.n} week={w} expanded={expanded.has(w.n)} isNow={started && !finished && i === nowIdx} done={careerDone} onHeader={() => flip(w.n)} onToggle={toggle} />
        ))}
      </Section>

      <Section title="Daily rhythm" icon="time-outline" color={A.water}>
        <P muted style={{ fontSize: 13, lineHeight: 19 }}>Six days on, Sunday is review and planning. If your Master's still needs time, take it out of the build block, never out of gym or sleep.</P>
        <View style={s.table}>
          {RHYTHM.map(([time, block, what], i) => (
            <View key={time} style={[s.tr, i === RHYTHM.length - 1 && { borderBottomWidth: 0 }]}>
              <Text style={s.trTime}>{time}</Text>
              <Text style={s.trBlock}>{block}</Text>
              <Text style={s.trWhat}>{what}</Text>
            </View>
          ))}
        </View>
      </Section>

      <Section title="Free resources" icon="library-outline" color={A.fibre}>
        {LIBRARY.map((g) => (
          <View key={g.title} style={s.group}>
            <Text style={s.groupTitle}>{g.title}</Text>
            {g.items.map((it) => (
              <Pressable key={it.url + it.label} onPress={() => open(it.url)} accessibilityRole="link" style={(st) => [s.libRow, smooth, hovered(st) && { backgroundColor: C.card2 }]}>
                {(st: any) => (
                  <>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={[s.libLabel, hovered(st) && { color: A.fibre }]}>{it.label}</Text>
                      {!!it.note && <Text style={s.meta}>{it.note}</Text>}
                    </View>
                    <Ionicons name="open-outline" size={14} color={hovered(st) ? A.fibre : C.faint} />
                  </>
                )}
              </Pressable>
            ))}
          </View>
        ))}
        <P muted style={{ fontSize: 12, lineHeight: 18 }}>
          All free. The AI-103 exam fee is the only cost, so watch for Microsoft Virtual Training Day discounts before booking. Event dates came from public listings in October 2026, so confirm them on the organiser's page. For the visa, check immigration.govt.nz or a licensed adviser.
        </P>
      </Section>
    </Screen>
  );
}

const s = StyleSheet.create({
  meta: { color: C.muted, fontFamily: F.body, fontSize: 12 },
  hero: { backgroundColor: C.card, borderWidth: 1, borderColor: C.borderStrong, borderRadius: R.lg, padding: 16, gap: 12, marginTop: 8 },
  big: { color: C.text, fontFamily: F.display, fontSize: 24, lineHeight: 28 },
  heroLine: { color: C.text, fontFamily: F.bodySemi, fontSize: 14 },
  track: { height: 6, borderRadius: 3, backgroundColor: C.borderStrong, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3, backgroundColor: A.up },
  strip: { flexDirection: 'row', gap: 3 },
  cell: { height: 40, borderRadius: R.sm, backgroundColor: C.card2, borderWidth: 1, borderColor: C.border, overflow: 'hidden', justifyContent: 'flex-end' },
  cellFill: { width: '100%' },
  cellLbl: { color: C.faint, fontFamily: F.body, fontSize: 10, textAlign: 'center' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, columnGap: 14 },
  nowCard: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderTopWidth: 2, borderRadius: R.lg, padding: 14, gap: 4 },
  week: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderTopWidth: 2, borderRadius: R.lg, overflow: 'visible' },
  weekHead: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: R.lg, position: 'relative' },
  weekNum: { fontFamily: F.display, fontSize: 18, width: 38 },
  weekTitle: { color: C.text, fontFamily: F.bodySemi, fontSize: 15 },
  mini: { width: 64, height: 4, borderRadius: 2, backgroundColor: C.borderStrong, overflow: 'hidden' },
  miniFill: { height: 4, borderRadius: 2 },
  weekBody: { paddingHorizontal: 12, paddingBottom: 14, gap: 10 },
  task: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 7 },
  hit: { padding: 3, borderRadius: 999 },
  box: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  taskText: { fontFamily: F.body, fontSize: 14, lineHeight: 20 },
  strike: { position: 'absolute', left: 0, top: 10, height: 2, marginTop: -1, borderRadius: 1, backgroundColor: C.muted },
  links: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  link: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: C.border, borderRadius: R.sm, paddingHorizontal: 7, paddingVertical: 4 },
  linkKind: { fontFamily: F.bodySemi, fontSize: 9, letterSpacing: 0.6, textTransform: 'uppercase' },
  linkText: { color: C.muted, fontFamily: F.bodyMed, fontSize: 12 },
  events: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.borderStrong, paddingTop: 10, gap: 4 },
  event: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 8, borderRadius: R.md },
  eventText: { color: C.text, fontFamily: F.body, fontSize: 13, lineHeight: 19 },
  table: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: R.lg },
  tr: { flexDirection: 'row', gap: 12, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.borderStrong },
  trTime: { color: C.text, fontFamily: F.bodyMed, fontSize: 13, width: 70 },
  trBlock: { color: A.water, fontFamily: F.bodySemi, fontSize: 13, width: 52 },
  trWhat: { flex: 1, minWidth: 0, color: C.muted, fontFamily: F.body, fontSize: 13, lineHeight: 19 },
  group: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: R.lg, padding: 8, gap: 2 },
  groupTitle: { color: C.text, fontFamily: F.display, fontSize: 16, paddingHorizontal: 8, paddingTop: 6, paddingBottom: 4 },
  libRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 8, paddingVertical: 8, borderRadius: R.md },
  libLabel: { color: C.text, fontFamily: F.bodyMed, fontSize: 14 },
});
