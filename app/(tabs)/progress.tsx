import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Text, View } from 'react-native';
import { BarChart } from '../../src/components/BarChart';
import { ExerciseThumb } from '../../src/components/ExerciseAnimation';
import { Card, Eyebrow, H1, ListRow, P, Row, Screen, Section, Stat } from '../../src/components/ui';
import { getExercise } from '../../src/lib/exercises';
import { fmtDuration, fmtWeight, secondsByDate, sessionsFor, suggest, visitSeconds, workingWeight } from '../../src/lib/progress';
import { useStore } from '../../src/lib/store';
import { A, C, F } from '../../src/lib/theme';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function mondayOf(d: Date) {
  const m = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  m.setDate(m.getDate() - ((m.getDay() + 6) % 7));
  return m;
}
function iso(d: Date) {
  const z = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}

export default function ProgressScreen() {
  const { logs, plan, visits } = useStore();
  const router = useRouter();

  const stats = useMemo(() => {
    const days = new Set(logs.map((l) => l.performed_on));
    const thisMon = iso(mondayOf(new Date()));
    const thisWeek = [...days].filter((d) => d >= thisMon).length;
    const cutoff = iso(new Date(Date.now() - 30 * 864e5));
    const sets30 = logs.filter((l) => l.performed_on >= cutoff).length;
    // consecutive weeks (ending this or last week) with at least one workout
    let streak = 0;
    const m = mondayOf(new Date());
    const weekHas = (start: Date) => {
      const a = iso(start); const e = new Date(start); e.setDate(e.getDate() + 7); const b = iso(e);
      return [...days].some((d) => d >= a && d < b);
    };
    if (!weekHas(m)) m.setDate(m.getDate() - 7);
    while (weekHas(m)) { streak++; m.setDate(m.getDate() - 7); }
    return { total: days.size, thisWeek, sets30, streak };
  }, [logs]);

  const weekly = useMemo(() => {
    const days = new Set(logs.map((l) => l.performed_on));
    const out = [];
    const start = mondayOf(new Date());
    start.setDate(start.getDate() - 7 * 9);
    for (let w = 0; w < 10; w++) {
      const a = new Date(start); a.setDate(start.getDate() + w * 7);
      const b = new Date(a); b.setDate(a.getDate() + 7);
      const n = [...days].filter((d) => d >= iso(a) && d < iso(b)).length;
      const lbl = `${a.getDate()} ${MONTHS[a.getMonth()]}`;
      out.push({ label: lbl, value: n, caption: `Week of ${lbl}: ${n} workout${n === 1 ? '' : 's'}` });
    }
    return out;
  }, [logs]);


  const gym = useMemo(() => {
    const byDate = secondsByDate(visits);
    const thisMon = iso(mondayOf(new Date()));
    const week = [...byDate.entries()].filter(([d]) => d >= thisMon).reduce((a, [, s]) => a + s, 0);
    const done = visits.filter((v) => v.ended_at);
    const avg = done.length ? Math.round(done.reduce((a, v) => a + visitSeconds(v), 0) / done.length) : 0;
    const bars = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = iso(d);
      const sec = byDate.get(key) ?? 0;
      const lbl = `${d.getDate()} ${MONTHS[d.getMonth()]}`;
      bars.push({ label: lbl, value: Math.round(sec / 60), caption: `${lbl}: ${sec ? fmtDuration(sec) : 'no gym time'}` });
    }
    const recent = [...byDate.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1)).slice(0, 7);
    return { week, avg, bars, recent, visitsByDate: visits };
  }, [visits]);

  // Exercises in the plan that are ready to go up.
  const ready = useMemo(() => {
    if (!plan) return [];
    const seen = new Set<string>();
    const out: { id: string; headline: string; detail: string; kind: string }[] = [];
    for (const d of plan.data.days) for (const s of d.sessions) for (const it of s.items) {
      if (seen.has(it.exerciseId)) continue;
      seen.add(it.exerciseId);
      const sg = suggest(logs, it.exerciseId, it.reps, it.sets);
      if (sg.kind === 'increase' || sg.kind === 'decrease') out.push({ id: it.exerciseId, headline: sg.headline, detail: sg.detail, kind: sg.kind });
    }
    return out;
  }, [plan, logs]);

  // Every exercise you've logged, most recent first.
  const lifts = useMemo(() => {
    const ids: string[] = [];
    for (const l of logs) if (!ids.includes(l.exercise_id)) ids.push(l.exercise_id);
    return ids.map((id) => {
      const ss = sessionsFor(logs, id);
      const last = ss[0];
      const trend = ss.slice(0, 6).reverse().map((s) => workingWeight(s));
      const first = trend[0];
      const lastW = trend[trend.length - 1];
      return { id, last, sessions: ss.length, trend, change: last && last.unit !== 'bw' && ss.length > 1 ? lastW - first : null };
    });
  }, [logs]);

  return (
    <Screen top>
      <Eyebrow>Progress</Eyebrow>
      <H1>{stats.total === 0 ? 'Start logging' : `${stats.total} workout${stats.total === 1 ? '' : 's'}`}</H1>
      {stats.total === 0 && <P muted>Open today's workout and tick off your sets. Your weights, reps and suggestions will show up here.</P>}

      <Row style={{ gap: 10, marginTop: 8 }}>
        <Stat value={stats.thisWeek} label="This week" color={A.up} />
        <Stat value={stats.streak} label={stats.streak === 1 ? 'Week streak' : 'Weeks streak'} color={A.up} />
        <Stat value={stats.sets30} label="Sets, 30 days" color={A.protein} />
      </Row>

      <Row style={{ gap: 10 }}>
        <Stat value={gym.week ? fmtDuration(gym.week) : '0m'} label="Gym time this week" color={A.water} />
        <Stat value={gym.avg ? fmtDuration(gym.avg) : '0m'} label="Average visit" color={A.water} />
      </Row>

      <Section title="Time in the gym · 14 days">
        <BarChart data={gym.bars} height={110} color={A.water} emptyText="Start the gym timer on a workout to track your time" />
        {gym.recent.length > 0 && (
          <View style={{ marginTop: 4 }}>
            {gym.recent.map(([date, sec]) => {
              const titles = [...new Set(visits.filter((v) => v.visit_date === date).map((v) => v.session_title).filter(Boolean))].join(' + ');
              const d = new Date(date + 'T00:00:00');
              return (
                <View key={date} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: C.border, gap: 12 }}>
                  <Text style={{ width: 64, color: C.muted, fontFamily: F.displayMed, fontSize: 13 }}>{d.getDate()} {MONTHS[d.getMonth()]}</Text>
                  <Text style={{ flex: 1, color: C.text, fontFamily: F.body, fontSize: 14 }} numberOfLines={1}>{titles || 'Workout'}</Text>
                  <Text style={{ color: C.text, fontFamily: F.displayMed, fontSize: 15 }}>{fmtDuration(sec)}</Text>
                </View>
              );
            })}
          </View>
        )}
      </Section>

      <Section title="Workouts per week">
        <BarChart data={weekly} height={110} color={A.up} emptyText="Your weekly training will appear here" />
      </Section>

      {ready.length > 0 && (
        <Section title="Adjust next time">
          {ready.map((r) => {
            const e = getExercise(r.id);
            return (
              <Card key={r.id} onPress={() => router.push(`/exercise/${encodeURIComponent(r.id)}`)}
                style={{ borderLeftWidth: 2, borderLeftColor: r.kind === 'increase' ? A.up : A.down }}>
                <Text style={{ color: C.muted, fontFamily: F.body, fontSize: 12 }}>{e?.name}</Text>
                <Text style={{ color: r.kind === 'increase' ? A.up : A.down, fontFamily: F.display, fontSize: 20, letterSpacing: -0.4 }}>{r.headline}</Text>
                <P muted style={{ fontSize: 13 }}>{r.detail}</P>
              </Card>
            );
          })}
        </Section>
      )}

      {lifts.length > 0 && (
        <Section title="Your lifts">
          <View>
            {lifts.map((l) => {
              const e = getExercise(l.id);
              if (!e || !l.last) return null;
              const lastLine = l.last.sets.map((s) => (l.last.unit === 'bw' && !s.weight ? `${s.reps}` : `${fmtWeight(s.weight, l.last.unit)}×${s.reps}`)).join('  ');
              return (
                <ListRow
                  key={l.id}
                  onPress={() => router.push(`/exercise/${encodeURIComponent(l.id)}`)}
                  left={<ExerciseThumb exercise={e} size={44} />}
                  title={e.name}
                  subtitle={`${lastLine}  ·  ${l.sessions} session${l.sessions === 1 ? '' : 's'}`}
                  right={<Spark values={l.trend} change={l.change} unit={l.last.unit} />}
                />
              );
            })}
          </View>
        </Section>
      )}

      <Section title="When to add weight">
        <P muted style={{ fontSize: 14 }}>
          The app uses double progression. Each exercise has a rep range, for example 8 to 12. Keep the same weight until you
          reach the top of the range (12) on every set. Then move up one step: 8 kg dumbbells become 9 kg, or the machine
          goes up one pin level. Your reps will drop to around 8. Build them back up to 12, then go up again.
        </P>
        <P muted style={{ fontSize: 14 }}>
          If you fall below the bottom of the range two sessions in a row, the app suggests going about 10% lighter. Good form
          always comes before more weight.
        </P>
      </Section>
    </Screen>
  );
}

function Spark({ values, change, unit }: { values: number[]; change: number | null; unit: string }) {
  const max = Math.max(1, ...values);
  return (
    <View style={{ alignItems: 'flex-end', gap: 4 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 22 }}>
        {values.map((v, i) => (
          <View key={i} style={{ width: 4, height: Math.max(2, (v / max) * 22), backgroundColor: A.protein, opacity: i === values.length - 1 ? 1 : 0.45, borderRadius: 1 }} />
        ))}
      </View>
      {change != null && change !== 0 && (
        <Text style={{ color: change > 0 ? A.up : A.down, fontFamily: F.bodySemi, fontSize: 11 }}>{change > 0 ? '+' : ''}{Math.round(change * 10) / 10}{unit === 'level' ? ' lvl' : ' kg'}</Text>
      )}
    </View>
  );
}
