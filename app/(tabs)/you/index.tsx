import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Card, Eyebrow, P, Row, Screen, Section } from '../../../src/components/ui';
import { computeTargets, JOB_LABELS, JobActivity } from '../../../src/lib/nutrition';
import { DAY_SHORT, SPLIT_LABELS, WEEK_ORDER } from '../../../src/lib/planner';
import { todayISO } from '../../../src/lib/progress';
import { useStore } from '../../../src/lib/store';
import { A, C, F, R } from '../../../src/lib/theme';

const GOAL: Record<string, string> = {
  general: 'General fitness',
  recomp: 'Lose fat and build muscle',
  muscle: 'Build muscle',
  fat_loss: 'Lose fat',
  strength: 'Get stronger',
};
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function shift(isoDay: string, days: number) {
  const d = new Date(isoDay + 'T00:00:00');
  d.setDate(d.getDate() + days);
  const z = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}

export default function ProfileScreen() {
  const { profile, session, signOut, foodEntries, logs, weights, sleep } = useStore();
  const router = useRouter();

  // Days in a row with anything logged: food, a workout, a weigh in or sleep.
  const { streak, loggedDays } = useMemo(() => {
    const days = new Set<string>([
      ...foodEntries.map((e) => e.eaten_on),
      ...logs.map((l) => l.performed_on),
      ...weights.map((w) => w.day),
      ...sleep.map((s) => s.night_of),
    ]);
    let d = todayISO();
    if (!days.has(d)) d = shift(d, -1);
    let n = 0;
    while (days.has(d)) { n++; d = shift(d, -1); }
    return { streak: n, loggedDays: days.size };
  }, [foodEntries, logs, weights, sleep]);

  if (!profile) return null;
  const t = computeTargets(profile as any);
  const name = profile.display_name || session?.user.email?.split('@')[0] || 'You';
  const initials = name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  const joined = session?.user.created_at ? new Date(session.user.created_at) : null;

  const withKg = weights.filter((w) => w.kg != null);
  const start = withKg[0]?.kg ?? (profile.weight_kg ? Number(profile.weight_kg) : null);
  const current = withKg[withKg.length - 1]?.kg ?? (profile.weight_kg ? Number(profile.weight_kg) : null);
  const goal = profile.target_weight_kg ? Number(profile.target_weight_kg) : null;
  const pct = goal != null && start != null && current != null && start !== goal
    ? Math.max(0, Math.min(1, (start - current) / (start - goal))) : null;

  const days = WEEK_ORDER.filter((d) => profile.training_days.includes(d)).map((d) => DAY_SHORT[d] + (profile.sessions_per_day > 1 && profile.double_days.includes(d) ? ' ×2' : ''));
  const workouts = new Set(logs.map((l) => l.performed_on)).size;
  const weekly = t.ready && t.weeklyKg ? `${t.weeklyKg > 0 ? 'Gain' : 'Lose'} ${Math.abs(t.weeklyKg).toFixed(2)} kg a week` : 'Hold steady';

  return (
    <Screen top>
      <View style={st.head}>
        <View style={st.avatarRing}>
          <View style={st.avatar}><Text style={st.initials}>{initials}</Text></View>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={st.name} numberOfLines={1}>{name}</Text>
          <Text style={st.meta} numberOfLines={1}>{session?.user.email}</Text>
          {joined && <Text style={st.meta}>Member since {MONTHS[joined.getMonth()]} {joined.getFullYear()}</Text>}
        </View>
      </View>

      <Row style={{ gap: 10, marginTop: 18 }}>
        <Badge value={streak} label="Day streak" color={A.cardio} icon="🔥" />
        <Badge value={workouts} label="Workouts" color={A.up} />
        <Badge value={loggedDays} label="Days logged" color={A.water} />
      </Row>
      <P muted style={{ fontSize: 12, marginTop: 6 }}>
        {streak > 0 ? `You have logged something ${streak} day${streak === 1 ? '' : 's'} in a row. Keep it going today.` : 'Log a meal, a workout or your weight today to start a streak.'}
      </P>

      <Section title="Goals" right={<Edit onPress={() => router.push('/food/nutrition')} />}>
        <Card style={{ paddingVertical: 4 }}>
          <Line k="Starting weight" v={start != null ? `${start} kg` : 'Not set'} />
          <Line k="Current weight" v={current != null ? `${current} kg` : 'Not set'} color={A.protein} onPress={() => router.push('/progress')} />
          <Line k="Goal weight" v={goal != null ? `${goal} kg` : 'Not set'} color={A.fat} />
          <Line k="Weekly goal" v={weekly} />
          <Line k="Activity level" v={profile.job_activity ? JOB_LABELS[profile.job_activity as JobActivity] : 'Not set'} />
          <Line k="Training goal" v={GOAL[profile.goal]} last={pct == null} />
          {pct != null && (
            <View style={{ paddingVertical: 12, gap: 8 }}>
              <View style={st.track}><View style={[st.fill, { width: `${Math.max(2, pct * 100)}%` }]} /></View>
              <Text style={st.meta}>
                {Math.round(pct * 100)}% of the way to {goal} kg{t.goalDate ? `, on pace for around ${t.goalDate}` : ''}.
              </Text>
            </View>
          )}
        </Card>
      </Section>

      <Section title="Daily nutrition goals" right={<Edit onPress={() => router.push('/food/nutrition')} />}>
        {t.ready ? (
          <Card style={{ gap: 14 }}>
            <Row style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <View>
                <Text style={st.big}>{t.kcal}</Text>
                <Text style={st.meta}>kcal a day</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[st.big, { color: A.water, fontSize: 22 }]}>{((t.water ?? 0) / 1000).toFixed(1)} L</Text>
                <Text style={st.meta}>water</Text>
              </View>
            </Row>
            <View style={st.split}>
              {[
                { l: 'Protein', g: t.protein!, k: t.protein! * 4, c: A.protein },
                { l: 'Carbs', g: t.carbs!, k: t.carbs! * 4, c: A.carbs },
                { l: 'Fat', g: t.fat!, k: t.fat! * 9, c: A.fat },
              ].map((m) => <View key={m.l} style={{ flex: m.k, backgroundColor: m.c, borderRadius: 3 }} />)}
            </View>
            <Row style={{ justifyContent: 'space-between' }}>
              {[
                { l: 'Protein', g: t.protein!, k: t.protein! * 4, c: A.protein },
                { l: 'Carbs', g: t.carbs!, k: t.carbs! * 4, c: A.carbs },
                { l: 'Fat', g: t.fat!, k: t.fat! * 9, c: A.fat },
                { l: 'Fibre', g: t.fibre!, k: 0, c: A.fibre },
              ].map((m) => (
                <View key={m.l} style={{ flex: 1 }}>
                  <Text style={[st.macroV, { color: m.c }]}>{m.g} g</Text>
                  <Text style={st.meta}>{m.l}{m.k ? ` · ${Math.round((m.k / t.kcal!) * 100)}%` : ''}</Text>
                </View>
              ))}
            </Row>
          </Card>
        ) : (
          <Card onPress={() => router.push('/food/nutrition')}>
            <P muted style={{ fontSize: 14 }}>Add your height, weight and date of birth to get your calorie and macro goals.</P>
          </Card>
        )}
      </Section>

      <Section title="Training" right={<Edit onPress={() => router.push('/you/onboarding')} />}>
        <Card style={{ paddingVertical: 4 }}>
          <Line k="Experience" v={profile.experience === 'beginner' ? 'Beginner' : 'Trained before'} />
          <Line k="Days" v={days.join(', ')} color={A.up} />
          <Line k="Session" v={`${profile.session_minutes} min`} />
          <Line k="Split" v={SPLIT_LABELS[profile.split]} />
          {!!profile.injuries && <Line k="Injuries" v={profile.injuries} />}
          <Line k="Gym" v={profile.gym_name ?? ''} last />
        </Card>
      </Section>

      <Section title="Settings">
        <Card style={{ paddingVertical: 0 }}>
          <Nav label="Edit profile and schedule" color={A.up} onPress={() => router.push('/you/onboarding')} />
          <Nav label="Body stats and daily targets" color={A.carbs} onPress={() => router.push('/food/nutrition')} />
          <Nav label="Progress and weigh ins" color={A.protein} onPress={() => router.push('/progress')} />
          <Nav label="My gym machines" color={A.fat} onPress={() => router.push('/library/machines')} />
          <Nav label="Sign out" color={A.over} onPress={signOut} last />
        </Card>
      </Section>
      <P muted style={{ fontSize: 12, marginTop: 20 }}>Exercise photos: free-exercise-db (public domain).</P>
    </Screen>
  );
}

function Badge({ value, label, color, icon }: { value: number; label: string; color: string; icon?: string }) {
  return (
    <View style={[st.badge, { borderColor: color + '55', backgroundColor: color + '14' }]}>
      <Text style={[st.badgeV, { color }]}>{icon ? `${icon} ` : ''}{value}</Text>
      <Text style={st.meta}>{label}</Text>
    </View>
  );
}

function Edit({ onPress }: { onPress: () => void }) {
  return <Pressable onPress={onPress} hitSlop={8}><Text style={st.edit}>Edit</Text></Pressable>;
}

function Line({ k, v, color, last, onPress }: { k: string; v: string; color?: string; last?: boolean; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={[st.line, last && { borderBottomWidth: 0 }]}>
      <Text style={st.k}>{k}</Text>
      <Text style={[st.v, !!color && { color }]} numberOfLines={2}>{v}</Text>
    </Pressable>
  );
}

function Nav({ label, color, onPress, last }: { label: string; color: string; onPress: () => void; last?: boolean }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [st.nav, last && { borderBottomWidth: 0 }, pressed && { opacity: 0.6 }]}>
      <View style={[st.dot, { backgroundColor: color }]} />
      <Text style={st.navText}>{label}</Text>
      <Text style={st.chev}>›</Text>
    </Pressable>
  );
}

const st = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatarRing: { width: 76, height: 76, borderRadius: 38, borderWidth: 2, borderColor: A.protein, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: C.card2, alignItems: 'center', justifyContent: 'center' },
  initials: { color: C.text, fontFamily: F.display, fontSize: 24, letterSpacing: -0.5 },
  name: { color: C.text, fontFamily: F.display, fontSize: 28, letterSpacing: -0.8 },
  meta: { color: C.muted, fontFamily: F.body, fontSize: 12, lineHeight: 17 },
  badge: { flex: 1, borderWidth: 1, borderRadius: R.lg, paddingVertical: 12, paddingHorizontal: 12, gap: 2 },
  badgeV: { fontFamily: F.display, fontSize: 22, letterSpacing: -0.5 },
  edit: { color: C.text, fontFamily: F.bodySemi, fontSize: 12, textDecorationLine: 'underline' },
  line: { flexDirection: 'row', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border, gap: 12 },
  k: { width: 130, color: C.muted, fontFamily: F.body, fontSize: 14 },
  v: { flex: 1, color: C.text, fontFamily: F.bodyMed, fontSize: 14, textAlign: 'right' },
  track: { height: 8, borderRadius: 4, backgroundColor: C.card2, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4, backgroundColor: A.up },
  big: { color: C.text, fontFamily: F.display, fontSize: 34, letterSpacing: -1 },
  split: { flexDirection: 'row', height: 10, gap: 2 },
  macroV: { fontFamily: F.display, fontSize: 17, letterSpacing: -0.3 },
  nav: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 15, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  dot: { width: 8, height: 8, borderRadius: 2 },
  navText: { flex: 1, color: C.text, fontFamily: F.bodyMed, fontSize: 15 },
  chev: { color: C.faint, fontSize: 20 },
});
