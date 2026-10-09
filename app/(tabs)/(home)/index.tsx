import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CoachCard } from '../../../src/components/CoachCard';
import { Dashboard } from '../../../src/components/Dashboard';
import { GroupIcon } from '../../../src/components/GroupIcon';
import { Button, Eyebrow, H1, IconBadge, P, Row, Screen, Section } from '../../../src/components/ui';
import { CoachContext, coachMessage, trainingStreak } from '../../../src/lib/coach';
import { useCoachStyle } from '../../../src/lib/coachStyle';
import { refreshTodayNotifications } from '../../../src/lib/dailyNotifications';
import { getExercise } from '../../../src/lib/exercises';
import { groupColor, sessionGroups } from '../../../src/lib/groups';
import { initNotifications, requestNotifyPermission } from '../../../src/lib/notify';
import { computeTargets, totals } from '../../../src/lib/nutrition';
import { refreshReminders } from '../../../src/lib/reminders';
import { VoiceCommand } from '../../../src/components/VoiceCommand';
import { PlanSession, uid, WEEK_ORDER } from '../../../src/lib/planner';
import { todayISO } from '../../../src/lib/progress';
import { QUOTE_EVERY_MS, randomQuote } from '../../../src/lib/quotes';
import { useStore } from '../../../src/lib/store';
import { A, C, F, R, TYPE } from '../../../src/lib/theme';

function isoOf(d: Date) {
  const z = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}

export default function DashboardScreen() {
  const { plan, logs, savePlan, regeneratePlan, activeVisit, startVisit, date, profile, foodEntries, tasks, reminders, water, sleep, weights } = useStore();
  const router = useRouter();
  const [coachStyle] = useCoachStyle();
  const [quote, setQuote] = useState(() => randomQuote());
  const [seed, setSeed] = useState(() => Math.random());
  useEffect(() => {
    // A new quote and a new coach line every few minutes.
    const id = setInterval(() => { setQuote((q) => randomQuote(q)); setSeed(Math.random()); }, QUOTE_EVERY_MS);
    return () => clearInterval(id);
  }, []);

  // Daily check ins and the "did you log today" nudges. No server behind these, so this just works out the
  // next one each time the Dashboard is open and (re)schedules it; see src/lib/notify.ts for what that means
  // on the web versus on the phone.
  const todayLogged = useMemo(() => foodEntries.some((e) => e.eaten_on === todayISO()), [foodEntries]);
  const todayTasks = useMemo(() => tasks.filter((t) => t.day === todayISO()), [tasks]);
  const todayUndone = todayTasks.filter((t) => !t.done).length;
  useEffect(() => {
    initNotifications();
    requestNotifyPermission().then((ok) => {
      if (!ok) return;
      refreshTodayNotifications(todayLogged, todayTasks);
      refreshReminders(reminders);
    });
  }, [todayLogged, todayUndone, reminders]);

  const isToday = date === todayISO();
  const dow = new Date(`${date}T12:00:00`).getDay();
  const loggedDates = useMemo(() => new Set(logs.map((l) => l.performed_on)), [logs]);
  const daySets = logs.filter((l) => l.performed_on === date).length;

  // Date of each weekday in the current week (Monday first), to count workouts done.
  const week = useMemo(() => {
    const now = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    const dates: Record<number, string> = {};
    WEEK_ORDER.forEach((d, i) => {
      const x = new Date(monday);
      x.setDate(monday.getDate() + i);
      dates[d] = isoOf(x);
    });
    return dates;
  }, [todayISO()]);

  async function addSession(day: number) {
    if (!plan) return;
    const existing = plan.data.days.find((d) => d.day === day);
    const newIdx = existing ? existing.sessions.length : 0;
    const session: PlanSession = { id: uid(), title: 'My workout', type: 'strength', focus: [], items: [] };
    const days = existing
      ? plan.data.days.map((d) => (d.day === day ? { ...d, sessions: [...d.sessions, session] } : d))
      : [...plan.data.days, { day, sessions: [session] }];
    await savePlan({ ...plan.data, days });
    router.push(`/session/${day}/${newIdx}`);
  }

  if (!plan) {
    return (
      <Screen>
        <H1>No plan yet</H1>
        <Button icon="sparkles" title="Build my plan" onPress={() => regeneratePlan()} />
      </Screen>
    );
  }

  const planDays = plan.data.days;
  const plannedDays = planDays.filter((d) => d.sessions.length > 0);
  const weekPlanned = plannedDays.length;
  const weekDone = plannedDays.filter((d) => loggedDates.has(week[d.day])).length;
  // What the coach knows about how you are doing, so its lines can react to your progress.
  const today = todayISO();
  const now = new Date();
  const targets = computeTargets(profile as any);
  const eatenToday = foodEntries.filter((e) => e.eaten_on === today);
  const eaten = totals(eatenToday);
  const lastWorkout = [...loggedDates].sort().pop();
  const kgs = weights.filter((w) => w.kg != null).map((w) => Number(w.kg));
  const startKg = kgs[0] ?? (profile?.weight_kg ? Number(profile.weight_kg) : null);
  const nowKg = kgs.length ? kgs[kgs.length - 1] : startKg;
  const goalKg = profile?.target_weight_kg ? Number(profile.target_weight_kg) : null;
  const hasGoal = startKg != null && nowKg != null && goalKg != null && startKg !== goalKg;
  const coachContext: CoachContext = {
    hour: now.getHours(),
    weekday: now.getDay(),
    weekDone,
    weekPlanned,
    totalWorkouts: loggedDates.size,
    daysSinceLast: lastWorkout ? Math.round((new Date(`${today}T12:00:00`).getTime() - new Date(`${lastWorkout}T12:00:00`).getTime()) / 864e5) : null,
    foodLogged: eatenToday.length > 0,
    proteinPct: targets.ready && targets.protein ? eaten.protein / targets.protein : null,
    waterPct: targets.water ? (water[today] ?? 0) / targets.water : null,
    sleepMinutes: sleep.find((x) => x.night_of === today && x.minutes)?.minutes ?? null,
    kgToward: hasGoal ? (startKg! - nowKg!) * (startKg! > goalKg! ? 1 : -1) : null,
    goalPct: hasGoal ? Math.max(0, Math.min(1, (startKg! - nowKg!) / (startKg! - goalKg!))) : null,
  };
  const coach = coachMessage(planDays, loggedDates, seed, undefined, coachStyle, coachContext);
  const { streak } = trainingStreak(planDays, loggedDates);
  const sessions = planDays.find((d) => d.day === dow)?.sessions ?? [];
  const startLabel = isToday
    ? activeVisit || daySets > 0 ? 'Continue workout' : 'Start workout'
    : daySets > 0 ? 'Continue logging' : date > todayISO() ? 'Open workout' : 'Log this workout';

  return (
    <>
    <Screen>
      <Section title="Your coach" icon="megaphone" color={A.cardio} big>
        <CoachCard coach={coach} gender={coachStyle} onReroll={() => setSeed(Math.random())} />
      </Section>

      <Dashboard date={date} weekDone={weekDone} weekPlanned={weekPlanned} streak={streak} />


      <Section title="Today's Quote" icon="chatbubble-ellipses" color={A.carbs} big>
        <View style={st.quote}>
          <Text style={st.quoteMark}>“</Text>
          <Text style={st.quoteText}>{quote.text}</Text>
          {!!quote.author && (
            <View style={st.quoteBy}>
              <View style={st.quoteRule} />
              <Text style={st.quoteAuthor} numberOfLines={1}>{quote.author}</Text>
            </View>
          )}
        </View>
      </Section>

      <Section title={isToday ? "Today's workout" : date > todayISO() ? 'Workout planned' : 'Workout on this day'} icon="barbell" color={A.fat} big>
        {sessions.length === 0 ? (
          <>
            <Row style={{ gap: 14 }}>
              <IconBadge name="moon" color="#8f9bff" size={48} />
              <H1 style={st.workoutTitle}>Rest day</H1>
            </Row>
            <P muted style={{ fontSize: 13, lineHeight: 19 }}>Recovery is when muscle is built. Walk, stretch, sleep well.</P>
            <Row style={{ marginTop: 4 }}>
              <Button kind="secondary" small icon="barbell-outline" tint={A.fat} title="Train anyway" onPress={() => addSession(dow)} />
            </Row>
          </>
        ) : (
          sessions.map((s, i) => {
            const work = s.items.filter((x) => x.phase !== 'warmup');
            return (
              <View key={s.id} style={{ gap: 10, marginBottom: sessions.length > 1 ? 16 : 0 }}>
                {sessions.length > 1 && <Eyebrow>{i === 0 ? 'Session 1 · morning' : 'Session 2 · later'}</Eyebrow>}
                <Row wrap style={{ gap: 6 }}>
                  {sessionGroups(s.focus).map((g) => (
                    <View key={g} style={[st.tag, { borderColor: groupColor(g) }]}>
                      <GroupIcon group={g} size={24} color={C.inverse} />
                      <Text style={[st.tagText, { color: groupColor(g) }]}>{g}</Text>
                    </View>
                  ))}
                </Row>
                <H1 style={st.workoutTitle}>{s.title}</H1>
                <P muted style={{ fontSize: 13, lineHeight: 19 }}>
                  {work.length} exercises · {work.reduce((a, it) => a + (it.sets || 0), 0)} sets
                  {daySets > 0 && i === 0 ? ` · ${daySets} sets logged` : ''}
                </P>
                <Text style={st.preview} numberOfLines={2}>
                  {work.map((it) => getExercise(it.exerciseId)?.name ?? it.exerciseId).join('  /  ')}
                </Text>
                <Row style={{ marginTop: 6 }}>
                  <Button
                    icon="play"
                    title={startLabel}
                    onPress={() => { if (isToday && !activeVisit) startVisit(s.title); router.push(`/workout/${dow}/${i}?date=${date}`); }}
                    style={{ flex: 1 }}
                  />
                  <Button kind="secondary" icon="create-outline" title="Edit" onPress={() => router.push(`/session/${dow}/${i}`)} />
                </Row>
              </View>
            );
          })
        )}
      </Section>
    </Screen>
    <VoiceCommand />
    </>
  );
}

const st = StyleSheet.create({
  quote: { backgroundColor: C.card, borderWidth: 1, borderColor: C.borderStrong, borderRadius: R.lg, borderTopWidth: 2, borderTopColor: C.inverse, paddingHorizontal: 18, paddingTop: 40, paddingBottom: 16, gap: 10, overflow: 'hidden' },
  quoteMark: { position: 'absolute', left: 14, top: 4, color: C.inverse, fontFamily: F.display, fontSize: 26, lineHeight: 32 },
  quoteLabel: { color: C.muted, fontFamily: F.bodySemi, fontSize: 10, letterSpacing: 1.6, textTransform: 'uppercase' },
  quoteText: { color: C.inverse, fontFamily: F.display, fontSize: 16, lineHeight: 24, letterSpacing: -0.3 },
  quoteBy: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  quoteRule: { width: 24, height: 1, backgroundColor: C.muted },
  quoteAuthor: { flex: 1, color: C.muted, fontFamily: F.bodySemi, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase' },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1, borderRadius: 999, paddingLeft: 8, paddingRight: 12, paddingVertical: 4 },
  tagDot: { width: 6, height: 6, borderRadius: 3 },
  tagText: { fontFamily: F.bodySemi, fontSize: 10, letterSpacing: 0.6 },
  workoutTitle: { fontSize: TYPE.sub, lineHeight: 20, letterSpacing: -0.3 },
  preview: { color: C.muted, fontFamily: F.body, fontSize: 12, lineHeight: 18 },
});
