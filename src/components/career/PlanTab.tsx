import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ALL_TASK_IDS, CAREER_WEEKS, CareerWeek, PHASES, PLAN } from '../../data/careerPlan';
import { EVENTS } from '../../data/careerEvents';
import { useStore } from '../../lib/store';
import { A, C, F, R } from '../../lib/theme';
import { Eyebrow, hovered, HoverTip, P, Section, smooth, useTip } from '../ui';
import { fmtDay, fmtLong, isoDate, k, open, PlanTask, START, Tag, todayMidnight, weekOf, weekStart, DAY } from './shared';

const eventsInWeek = (n: number) => EVENTS.filter((e) => weekOf(isoDate(e.date)) === n);

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

function WeekCard({ week, expanded, isNow, done, onHeader, onToggle }: { week: CareerWeek; expanded: boolean; isNow: boolean; done: Record<string, string>; onHeader: () => void; onToggle: (id: string) => void }) {
  const ph = PHASES[week.phase];
  const n = week.tasks.filter((t) => done[t.id]).length;
  const pct = n / week.tasks.length;
  const s0 = weekStart(week.n - 1), s1 = new Date(s0.getTime() + 6 * DAY);
  const ev = eventsInWeek(week.n);
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
          <Text style={k.meta} numberOfLines={1}>
            {fmtDay(s0)} to {fmtDay(s1)} · <Text style={{ color: ph.color }}>{ph.label}</Text>
            {isNow ? ' · this week' : ''}
            {ev.length ? ` · ${ev.length} ${ev.length > 1 ? 'events' : 'event'}` : ''}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 6 }}>
          <Text style={[k.meta, n === week.tasks.length && { color: A.up }]}>{n}/{week.tasks.length}</Text>
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
          {ev.length > 0 && (
            <View style={s.events}>
              <Eyebrow>Wellington events this week</Eyebrow>
              {ev.map((e) => (
                <Pressable key={e.date + e.name} onPress={() => open(e.url)} accessibilityRole="link" style={(st) => [s.event, smooth, hovered(st) && { backgroundColor: C.card2 }]}>
                  <Ionicons name="calendar-outline" size={15} color={A.up} style={{ marginTop: 2 }} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[k.meta, { color: A.up }]}>{fmtLong(isoDate(e.date))}{e.time ? `, ${e.time}` : ''} · {e.cost === 'Paid' ? e.price : e.cost === 'Free' ? 'Free' : 'Check cost'}</Text>
                    <Text style={s.eventText}>{e.name}</Text>
                  </View>
                  <Ionicons name="open-outline" size={13} color={C.faint} style={{ marginTop: 2 }} />
                </Pressable>
              ))}
              <Text style={k.meta}>All the events and the groups are on the Events tab.</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

export function PlanTab() {
  const { careerDone, setCareerTask } = useStore();
  const today = todayMidnight();
  const rawIdx = Math.floor((today.getTime() - START.getTime()) / (7 * DAY));
  const nowIdx = Math.max(0, Math.min(CAREER_WEEKS - 1, rawIdx));
  const started = rawIdx >= 0, finished = rawIdx >= CAREER_WEEKS;
  const [expanded, setExpanded] = useState<Set<number>>(() => new Set([nowIdx + 1]));
  const [error, setError] = useState<string | null>(null);

  const total = ALL_TASK_IDS.filter((id) => careerDone[id]).length;
  const pct = total / ALL_TASK_IDS.length;
  const now = PLAN[nowIdx];
  const nowLeft = now.tasks.filter((t) => !careerDone[t.id]);
  const daysToExam = Math.ceil((new Date('2026-12-11T00:00:00').getTime() - today.getTime()) / DAY);
  const daysLeft = Math.ceil((weekStart(CAREER_WEEKS).getTime() - today.getTime()) / DAY);
  const weekPct = (w: CareerWeek) => w.tasks.filter((t) => careerDone[t.id]).length / w.tasks.length;

  const flip = (n: number) => setExpanded((cur) => { const next = new Set(cur); if (next.has(n)) next.delete(n); else next.add(n); return next; });
  const toggle = (id: string) => {
    setError(null);
    setCareerTask(id, !careerDone[id]).catch(() => setError('Could not save that tick. Check your connection and try again.'));
  };

  return (
    <View style={{ gap: 4 }}>
      <P muted style={{ fontSize: 13, lineHeight: 19 }}>
        Goal: a Software Engineer role in NZ paying $73k or more, the Skilled Migrant wage line. C# and ASP.NET Core, Azure with the AI-103 cert, React and TypeScript, SQL, Docker and GitHub Actions, with 4 gym sessions a week. Open Steps and links under any task for exactly how to do it.
      </P>

      <View style={s.hero}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 14 }}>
          <Text style={s.big}>{Math.round(pct * 100)}%</Text>
          <View style={{ flex: 1, minWidth: 0, paddingBottom: 4 }}>
            <Text style={s.heroLine}>{total} of {ALL_TASK_IDS.length} tasks done</Text>
            <Text style={k.meta}>{!started ? `Starts ${fmtDay(START)}` : finished ? 'Block complete' : `Week ${nowIdx + 1} of ${CAREER_WEEKS}`}</Text>
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
          {(Object.keys(PHASES) as (keyof typeof PHASES)[]).map((key) => (
            <View key={key} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 9, height: 9, borderRadius: 2, backgroundColor: PHASES[key].color }} />
              <Text style={k.meta}>{PHASES[key].label}: {PHASES[key].blurb}</Text>
            </View>
          ))}
        </View>
      </Section>

      <Section title={started && !finished ? 'Next up this week' : !started ? 'First week' : 'Last week'} icon="flag-outline" color={PHASES[now.phase].color}>
        <View style={[s.nowCard, { borderTopColor: PHASES[now.phase].color }]}>
          <Text style={s.weekTitle}>W{now.n}: {now.title}</Text>
          <Text style={k.meta}>{nowLeft.length ? `${nowLeft.length} tasks left this week` : 'Every task done this week'}</Text>
          {daysToExam > 0 && <Text style={k.meta}>{daysToExam} days to exam day (Friday 11 December)</Text>}
          {daysLeft > 0 && <Text style={k.meta}>{daysLeft} days left in the block</Text>}
          {nowLeft.slice(0, 3).map((t) => (
            <Text key={t.id} style={s.next} numberOfLines={2}>• {t.text}</Text>
          ))}
        </View>
      </Section>

      <Section title="All the weeks" icon="list-outline" color={A.protein}>
        {PLAN.map((w, i) => (
          <WeekCard key={w.n} week={w} expanded={expanded.has(w.n)} isNow={started && !finished && i === nowIdx} done={careerDone} onHeader={() => flip(w.n)} onToggle={toggle} />
        ))}
      </Section>
    </View>
  );
}

const s = StyleSheet.create({
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
  next: { color: C.soft, fontFamily: F.body, fontSize: 13, lineHeight: 19, marginTop: 4 },
  week: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderTopWidth: 2, borderRadius: R.lg, overflow: 'visible', marginBottom: 10 },
  weekHead: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: R.lg, position: 'relative' },
  weekNum: { fontFamily: F.display, fontSize: 18, width: 38 },
  weekTitle: { color: C.text, fontFamily: F.bodySemi, fontSize: 15 },
  mini: { width: 64, height: 4, borderRadius: 2, backgroundColor: C.borderStrong, overflow: 'hidden' },
  miniFill: { height: 4, borderRadius: 2 },
  weekBody: { paddingHorizontal: 12, paddingBottom: 14, gap: 10 },
  events: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.borderStrong, paddingTop: 10, gap: 4 },
  event: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 8, borderRadius: R.md },
  eventText: { color: C.text, fontFamily: F.body, fontSize: 13, lineHeight: 19 },
});
