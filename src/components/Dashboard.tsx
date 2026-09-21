import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { computeTargets, totals } from '../lib/nutrition';
import { fmtDuration, secondsByDate, todayISO } from '../lib/progress';
import { useStore } from '../lib/store';
import { A, C, F, R } from '../lib/theme';
import { fmtMinutes, sleepVerdict } from '../lib/tracker';
import { catColor, fmtClock, TimeChart, useRunningTimer, useTimeSlices } from './DayTrackers';
import { Button, hovered, HoverTip, Section, smooth, usePageWidth, useTip } from './ui';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const TICKS = 60;
const TRACK = '#2e2e2e';

/**
 * A dial made of small bars, like a car speedometer. The bars light up in the nutrient's colour as you
 * eat towards the goal. With no goal yet every bar shows the colour faintly, so the dials still look different.
 */
function Ring({ value, target, color = C.inverse, size, big, label }: {
  value: number; target: number; color?: string; size: number; big: string; label: string;
}) {
  const hasGoal = target > 0;
  const pct = hasGoal ? Math.min(1, value / target) : 0;
  const lit = Math.round(pct * TICKS);
  const arc = hasGoal && value > target ? A.over : color;
  const len = Math.max(7, Math.round(size * 0.1));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {Array.from({ length: TICKS }, (_, i) => (
        <View key={i} style={[StyleSheet.absoluteFill, { alignItems: 'center', transform: [{ rotate: `${(360 / TICKS) * i}deg` }] }]}>
          <View
            style={{
              width: 3, height: len, borderRadius: 2,
              backgroundColor: i < lit ? arc : hasGoal ? TRACK : color,
              opacity: hasGoal || i < lit ? 1 : 0.3,
            }}
          />
        </View>
      ))}
      <Text style={[d.ringBig, { fontSize: Math.min(20, size * 0.24) }]} numberOfLines={1}>{big}</Text>
      <Text style={d.ringLabel}>{label}</Text>
    </View>
  );
}

/** A dial with "X g left" under it, so you know how much more to eat. */
function Nutrient({ value, target, color, size, big, label, unit, decimals = 0, align = 'center' }: {
  value: number; target: number; color?: string; size: number; big: string; label: string; unit: string; decimals?: number; align?: 'start' | 'center' | 'end';
}) {
  const diff = target - value;
  const round = (n: number) => (decimals ? (Math.round(n * 10 ** decimals) / 10 ** decimals).toFixed(decimals) : Math.round(n).toLocaleString());
  return (
    <View style={{ alignItems: 'center', gap: 8 }}>
      {target > 0 ? (
        <HoverTip
          align={align}
          lines={[
            `${label === 'cal' ? 'Calories' : label.replace(' L', '').replace(/^./, (c) => c.toUpperCase())}: ${round(value)} of ${round(target)} ${unit}`,
            `${Math.round((value / target) * 100)}% of your goal`,
          ]}
        >
          <Ring value={value} target={target} color={color} size={size} big={big} label={label} />
        </HoverTip>
      ) : (
        <Ring value={value} target={target} color={color} size={size} big={big} label={label} />
      )}
      {target > 0 ? (
        <Text style={[d.left, diff < 0 && { color: A.over }]}>
          {diff >= 0 ? `${round(diff)} ${unit} left` : `${round(-diff)} ${unit} over`}
        </Text>
      ) : (
        <Text style={d.left}> </Text>
      )}
    </View>
  );
}

function Bar({ pct, color = C.inverse }: { pct: number; color?: string }) {
  return (
    <View style={d.barTrack}>
      <View style={[d.barFill, { width: `${Math.min(1, Math.max(0, pct)) * 100}%`, backgroundColor: color }]} />
    </View>
  );
}

function Tile({ label, value, sub, pct, pctLabel, color, onPress, icon }: {
  label: string; value: string; sub?: string; pct?: number; pctLabel?: string; color: string; onPress?: () => void; icon: IconName;
}) {
  const tip = useTip(pct != null ? [`${label}: ${value}`, `${Math.round(pct * 100)}% ${pctLabel ?? ''}`.trim()] : [], 'start');
  return (
    <Pressable
      {...(pct != null ? tip.hover : {})}
      onPress={onPress} disabled={!onPress} accessibilityRole={onPress ? 'button' : undefined}
      style={(st) => [d.tile, smooth, { borderTopColor: color, borderTopWidth: 2, zIndex: tip.on ? 30 : 0 }, onPress && hovered(st) && { backgroundColor: C.card2, borderColor: color }, st.pressed && !!onPress && { backgroundColor: C.card2 }]}
    >
      <View style={d.tileHead}>
        <Ionicons name={icon} size={15} color={color} />
        <Text style={[d.tileLabel, { color }]}>{label}</Text>
        {!!onPress && <Ionicons name="chevron-forward" size={13} color={C.faint} style={{ marginLeft: 'auto' }} />}
      </View>
      <Text style={d.tileValue} numberOfLines={1}>{value}</Text>
      {pct != null && <Bar pct={pct} color={color} />}
      {!!sub && <Text style={d.tileSub} numberOfLines={1}>{sub}</Text>}
      {tip.bubble}
    </Pressable>
  );
}

export function Dashboard({ date, weekDone, weekPlanned, streak }: {
  date: string; weekDone: number; weekPlanned: number; streak: number;
}) {
  const router = useRouter();
  // Three rings sit in a row inside the summary card, so they shrink on a narrow phone and stop growing on a big screen.
  const inner = usePageWidth() - 30;
  const ringS = Math.max(64, Math.min(88, Math.floor(inner / 3) - 6));
  const ringL = Math.max(76, Math.min(104, Math.round(ringS * 1.2)));
  const { profile, foodEntries, water, setWater, weights, sleep, logs, visits, activities } = useStore();
  const targets = useMemo(() => computeTargets(profile as any), [profile]);
  const eaten = useMemo(() => totals(foodEntries.filter((e) => e.eaten_on === date)), [foodEntries, date]);
  const ml = water[date] ?? 0;
  const { running, seconds } = useRunningTimer();
  const daySecs = secondsByDate(visits).get(date) ?? 0;
  const daySets = logs.filter((l) => l.performed_on === date).length;
  const trackedMins = activities.filter((a) => a.day === date && a.id !== running?.id).reduce((a, x) => a + (x.minutes ?? 0), 0)
    + (running && running.day === date ? Math.floor(seconds / 60) : 0);
  const when = date === todayISO() ? 'today' : 'that day';
  const slices = useTimeSlices(date);

  const latestWeight = weights.length ? weights[weights.length - 1].kg : null;
  const kg = latestWeight ?? (profile as any)?.weight_kg ?? null;
  const goalKg = (profile as any)?.target_weight_kg ?? null;
  const lastSleep = sleep.find((x) => x.night_of === date && x.minutes) ?? null;

  const kcalTarget = targets.kcal ?? 0;
  const left = Math.round(kcalTarget - eaten.kcal);
  // No goals until body stats are saved, so every ring behaves the same.
  const waterGoal = targets.water ?? 0;

  return (
    <View>
      {running && (
        <Pressable onPress={() => router.push('/tracker')} accessibilityRole="button" style={(st) => [d.timer, smooth, { borderColor: catColor(running.category) }, (st.pressed || hovered(st)) && { backgroundColor: C.card2 }]}>
          <View style={[d.timerDot, { backgroundColor: catColor(running.category) }]} />
          <View style={{ flex: 1 }}>
            <Text style={d.tileLabel}>Timer running</Text>
            <Text style={d.timerTitle} numberOfLines={1}>{running.title}</Text>
          </View>
          <Text style={d.timerClock}>{fmtClock(seconds)}</Text>
        </Pressable>
      )}

      <Section title="Nutrition and water" icon="nutrition" color={A.carbs} big>
      <View style={d.summary}>
        <View style={d.ringRow}>
          <Nutrient value={eaten.carbs} target={targets.carbs ?? 0} color={A.carbs} size={ringS} big={String(Math.round(eaten.carbs))} label="carbs" unit="g" align="start" />
          <Nutrient value={eaten.fat} target={targets.fat ?? 0} color={A.fat} size={ringS} big={String(Math.round(eaten.fat))} label="fat" unit="g" />
          <Nutrient value={eaten.protein} target={targets.protein ?? 0} color={A.protein} size={ringS} big={String(Math.round(eaten.protein))} label="protein" unit="g" align="end" />
        </View>
        <View style={d.ringRow}>
          <Nutrient value={eaten.kcal} target={kcalTarget} size={ringL} big={Math.round(eaten.kcal).toLocaleString()} label="cal" unit="kcal" align="start" />
          <Nutrient value={ml / 1000} target={waterGoal / 1000} color={A.water} size={ringL} big={(ml / 1000).toFixed(2)} label="water L" unit="L" decimals={1} align="end" />
        </View>
        {targets.ready ? (
          <Text style={d.goalsNote}>{`Goals: ${kcalTarget.toLocaleString()} kcal and ${(waterGoal / 1000).toFixed(1)} L of water a day.`}</Text>
        ) : (
          // Only shown until height, weight, sex and date of birth are saved.
          <View style={d.setup}>
            <Text style={d.setupTitle}>Set your targets</Text>
            <Text style={d.summaryNote}>Add your height, weight, sex and date of birth so the rings have goals to fill.</Text>
            <Button small icon="body-outline" title="Set my targets" onPress={() => router.push('/food/nutrition')} />
          </View>
        )}
        <View style={d.actions}>
          <Button small kind="secondary" icon="restaurant" tint={A.carbs} title="Log food" onPress={() => router.push(`/food/add?date=${date}`)} />
          <Button small kind="secondary" icon="water" iconEnd tint={A.water} title="+ 250 ml water" onPress={() => setWater(date, ml + 250)} />
        </View>
      </View>
      </Section>

      <Section title="Your progress" icon="stats-chart" color={A.protein} big>
      <View style={{ gap: 12 }}>
      <View style={d.grid}>
        <Tile icon="flame" color={A.cardio} label="Streak" value={`${streak} ${streak === 1 ? 'session' : 'sessions'}`} sub="in a row" />
        <Tile icon="calendar" color={A.up} label="This week" value={`${weekDone} / ${weekPlanned}`} sub="workouts done" pct={weekPlanned ? weekDone / weekPlanned : 0} pctLabel="of this week's workouts" onPress={() => router.push('/week')} />
      </View>
      <View style={d.grid}>
        <Tile icon="barbell" color={A.fat} label={`Gym ${when}`} value={daySecs ? fmtDuration(daySecs) : '0m'} sub={daySets ? `${daySets} sets logged` : 'No sets yet'} />
        <Tile icon="timer" color={A.core} label="Time tracked" value={trackedMins ? fmtMinutes(trackedMins) : '0m'} sub={running ? 'Timer running' : 'Tap to open'} onPress={() => router.push('/tracker')} />
      </View>
      <View style={d.grid}>
        <Tile
          icon="scale" color={A.protein}
          label="Weight"
          value={kg ? `${Math.round(kg * 10) / 10} kg` : 'Not set'}
          sub={goalKg ? `Goal ${Math.round(goalKg * 10) / 10} kg` : 'Tap to log'}
          onPress={() => router.push('/progress')}
        />
        <Tile
          icon="moon" color="#8f9bff"
          label="Sleep"
          value={lastSleep ? fmtMinutes(lastSleep.minutes) : 'Not logged'}
          sub={lastSleep ? sleepVerdict(lastSleep.minutes!).label : 'Tap to log'}
          pct={lastSleep ? (lastSleep.minutes ?? 0) / (8 * 60) : undefined}
          pctLabel="of 8 hours"
          onPress={() => router.push('/tracker')}
        />
      </View>

      </View>
      </Section>

      <Section title="Your day" icon="time" color={A.core} big>
        <TimeChart slices={slices} />
      </Section>
    </View>
  );
}

const d = StyleSheet.create({
  summary: { backgroundColor: C.card, borderRadius: R.lg, borderWidth: 1, borderColor: C.borderStrong, paddingVertical: 16, paddingHorizontal: 14, gap: 16 },
  summaryTitle: { color: C.muted, fontFamily: F.bodySemi, fontSize: 11, letterSpacing: 1.6, textTransform: 'uppercase', textAlign: 'center' },
  ringRow: { flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center' },
  ringBig: { color: C.inverse, fontFamily: F.display, letterSpacing: -0.8 },
  ringLabel: { color: C.muted, fontFamily: F.bodyMed, fontSize: 12, marginTop: 1 },
  setup: { alignItems: 'center', gap: 8, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 14 },
  setupTitle: { color: C.text, fontFamily: F.bodySemi, fontSize: 15 },
  left: { color: C.muted, fontFamily: F.bodyMed, fontSize: 12 },
  goalsNote: { color: C.text, fontFamily: F.bodyMed, fontSize: 13, lineHeight: 19, textAlign: 'center' },
  summaryNote: { color: C.muted, fontFamily: F.body, fontSize: 12, textAlign: 'center' },
  actions: { flexDirection: 'row', justifyContent: 'center', gap: 8, flexWrap: 'wrap' },
  timer: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.card, borderWidth: 1, borderRadius: R.lg, paddingVertical: 12, paddingHorizontal: 16 },
  timerDot: { width: 8, height: 8, borderRadius: 4 },
  timerTitle: { color: C.text, fontFamily: F.bodySemi, fontSize: 14 },
  timerClock: { color: C.inverse, fontFamily: F.display, fontSize: 16, letterSpacing: -0.4 },
  grid: { flexDirection: 'row', gap: 12 },
  tile: { flex: 1, backgroundColor: C.card, borderRadius: R.lg, borderWidth: 1, borderColor: C.border, padding: 12, gap: 5, minHeight: 84 },
  tileHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tileLabel: { color: C.muted, fontFamily: F.bodySemi, fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase' },
  tileValue: { color: C.inverse, fontFamily: F.display, fontSize: 17, letterSpacing: -0.4 },
  tileSub: { color: C.muted, fontFamily: F.body, fontSize: 12 },
  barTrack: { height: 4, borderRadius: 2, backgroundColor: C.borderStrong, overflow: 'hidden' },
  barFill: { height: 4, borderRadius: 2 },
});
