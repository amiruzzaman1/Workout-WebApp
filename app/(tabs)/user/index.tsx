import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { CoachCharacter } from '../../../src/components/CoachCharacter';
import { Card, Eyebrow, hovered, HoverTip, P, Row, Screen, Section, smooth, usePageWidth } from '../../../src/components/ui';
import { COACHES, CoachStyle, useCoachStyle } from '../../../src/lib/coachStyle';
import { confirm } from '../../../src/lib/confirm';
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

export default function UserScreen() {
  const { profile, session, signOut, uploadAvatar, removeAvatar, foodEntries, logs, weights, sleep } = useStore();
  const router = useRouter();
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [coachStyle, setCoachStyle] = useCoachStyle();
  // Two coach cards side by side: each picture fills its card, and never gets taller than it needs to be.
  const coachW = Math.floor((usePageWidth() - 12) / 2) - 20;
  const coachH = Math.min(210, Math.round(coachW * 1.4));

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

  /** Picks a photo from the gallery (works the same in a browser and on the phone) and uploads it as the avatar. */
  async function changePhoto() {
    setAvatarError(null);
    if (Platform.OS !== 'web') {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) { setAvatarError('Allow photo access in your phone settings to change your picture.'); return; }
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.6 });
    if (result.canceled || !result.assets?.length) return;
    setAvatarBusy(true);
    try {
      await uploadAvatar(result.assets[0].uri);
    } catch (e: any) {
      setAvatarError(e?.message ?? 'Could not upload that photo. Check your connection and try again.');
    } finally {
      setAvatarBusy(false);
    }
  }

  async function removePhoto() {
    setAvatarError(null);
    if (await confirm('Remove your photo?', 'Your initials will show instead.', { confirmText: 'Remove' })) {
      setAvatarBusy(true);
      try {
        await removeAvatar();
      } catch (e: any) {
        setAvatarError(e?.message ?? 'Could not remove the photo.');
      } finally {
        setAvatarBusy(false);
      }
    }
  }

  async function logOut() {
    if (await confirm('Log out?', 'You will need to sign in again to see your data.', { confirmText: 'Log out' })) await signOut();
  }

  return (
    <Screen top>
      <Eyebrow>User</Eyebrow>
      <View style={st.head}>
        <Pressable onPress={changePhoto} disabled={avatarBusy} accessibilityRole="button" accessibilityLabel="Change your photo" style={(p) => [st.avatarRing, smooth, hovered(p) && { borderColor: A.up }, p.pressed && { opacity: 0.85 }]}>
          <View style={st.avatar}>
            {profile.avatar_url ? <Image source={{ uri: profile.avatar_url }} style={st.avatarImg} /> : <Text style={st.initials}>{initials}</Text>}
            {avatarBusy && <View style={st.avatarBusy}><ActivityIndicator color={C.text} /></View>}
          </View>
          <View style={st.avatarBadge}><Ionicons name="camera" size={13} color={C.inverseText} /></View>
        </Pressable>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={st.nameRow}>
            <Text style={st.name} numberOfLines={1}>{name}</Text>
            <Pressable onPress={logOut} hitSlop={8} accessibilityRole="button" accessibilityLabel="Log out" style={(p) => [st.logout, smooth, hovered(p) && { borderColor: A.over, backgroundColor: A.over + '14' }, p.pressed && { opacity: 0.6 }]}>
              {(p: any) => <>
                <Ionicons name="log-out-outline" size={16} color={hovered(p) ? A.over : C.text} />
                <Text style={[st.logoutText, hovered(p) && { color: A.over }]}>Log out</Text>
              </>}
            </Pressable>
          </View>
          <Text style={st.meta} numberOfLines={1}>{session?.user.email}</Text>
          {joined && <Text style={st.meta}>Member since {MONTHS[joined.getMonth()]} {joined.getFullYear()}</Text>}
          <Row style={{ gap: 10, marginTop: 4 }}>
            <Pressable onPress={changePhoto} hitSlop={6} accessibilityRole="button" style={(p) => [smooth, hovered(p) && { opacity: 0.8 }]}><Text style={st.photoLink}>Change photo</Text></Pressable>
            {!!profile.avatar_url && (
              <Pressable onPress={removePhoto} hitSlop={6} accessibilityRole="button" style={(p) => [smooth, hovered(p) && { opacity: 0.8 }]}><Text style={[st.photoLink, { color: C.muted }]}>Remove</Text></Pressable>
            )}
          </Row>
          {!!avatarError && <Text style={st.avatarError}>{avatarError}</Text>}
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

      <Section title="Goals" icon="flag" color={A.protein} right={<Edit onPress={() => router.push('/food/nutrition')} />}>
        <Card style={{ paddingVertical: 4 }}>
          <Line k="Starting weight" v={start != null ? `${start} kg` : 'Not set'} />
          <Line k="Current weight" v={current != null ? `${current} kg` : 'Not set'} color={A.protein} onPress={() => router.push('/progress')} />
          <Line k="Goal weight" v={goal != null ? `${goal} kg` : 'Not set'} color={A.fat} />
          <Line k="Weekly goal" v={weekly} />
          <Line k="Activity level" v={profile.job_activity ? JOB_LABELS[profile.job_activity as JobActivity] : 'Not set'} />
          <Line k="Training goal" v={GOAL[profile.goal]} last={pct == null} />
          {pct != null && (
            <View style={{ paddingVertical: 12, gap: 8 }}>
              <HoverTip lines={[`${Math.round(pct * 100)}% of the way to ${goal} kg`, `Started at ${start} kg, now ${current} kg`]}>
                <View style={st.track}><View style={[st.fill, { width: `${Math.max(2, pct * 100)}%` }]} /></View>
              </HoverTip>
              <Text style={st.meta}>
                {Math.round(pct * 100)}% of the way to {goal} kg{t.goalDate ? `, on pace for around ${t.goalDate}` : ''}.
              </Text>
            </View>
          )}
        </Card>
      </Section>

      <Section title="Daily nutrition goals" icon="nutrition" color={A.carbs} right={<Edit onPress={() => router.push('/food/nutrition')} />}>
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
              ].map((m, i, all) => (
                <HoverTip key={m.l} style={{ flex: m.k }} align={i === 0 ? 'start' : i === all.length - 1 ? 'end' : 'center'} lines={[`${m.l}: ${m.g} g`, `${Math.round((m.k / t.kcal!) * 100)}% of your calories`]}>
                  <View style={{ flex: 1, backgroundColor: m.c, borderRadius: 3 }} />
                </HoverTip>
              ))}
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

      <Section title="Training" icon="barbell" color={A.up} right={<Edit onPress={() => router.push('/user/onboarding')} />}>
        <Card style={{ paddingVertical: 4 }}>
          <Line k="Experience" v={profile.experience === 'beginner' ? 'Beginner' : 'Trained before'} />
          <Line k="Days" v={days.join(', ')} color={A.up} />
          <Line k="Session" v={`${profile.session_minutes} min`} />
          <Line k="Split" v={SPLIT_LABELS[profile.split]} />
          {!!profile.injuries && <Line k="Injuries" v={profile.injuries} />}
          <Line k="Gym" v={profile.gym_name ?? ''} last />
        </Card>
      </Section>

      <Section title="Your coach" icon="megaphone" color={A.cardio}>
        <Row style={{ gap: 12, alignItems: 'stretch' }}>
          {(['male', 'female'] as CoachStyle[]).map((k) => {
            const on = coachStyle === k;
            const col = C.text;
            return (
              <Pressable
                key={k}
                onPress={() => setCoachStyle(k)}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`${COACHES[k].name}. ${COACHES[k].blurb}`}
                style={(p) => [st.coach, smooth, hovered(p) && !on && { backgroundColor: C.card2, borderColor: col + '99' }, on && { borderColor: col, backgroundColor: col + '14' }]}
              >
                <View style={[st.coachStage, { height: coachH + 8 }]}><CoachCharacter gender={k} tone="neutral" width={coachW} height={coachH} /></View>
                <Row style={{ gap: 6 }}>
                  <Text style={st.coachName}>{COACHES[k].name}</Text>
                  {on && <Ionicons name="checkmark-circle" size={16} color={col} />}
                </Row>
                <Text style={st.coachBlurb}>{COACHES[k].blurb}</Text>
              </Pressable>
            );
          })}
        </Row>
      </Section>

      <Section title="Settings" icon="settings" color={A.fat}>
        <View style={{ gap: 10 }}>
          <Setting
            icon="person-circle-outline" color={A.up} title="Profile and schedule"
            sub={`${profile.training_days.length} training days, ${profile.session_minutes} minute sessions`}
            onPress={() => router.push('/user/onboarding')}
          />
          <Setting
            icon="body-outline" color={A.carbs} title="Body stats and targets"
            sub={t.ready ? `${t.kcal} kcal a day, ${t.protein} g protein` : 'Not set up yet. Add your details.'} warn={!t.ready}
            onPress={() => router.push('/food/nutrition')}
          />
          <Setting
            icon="calendar-outline" color={A.fat} title="Weekly plan"
            sub={`${SPLIT_LABELS[profile.split]}. Notes and rebuild.`}
            onPress={() => router.push('/week')}
          />
          <Setting
            icon="stats-chart-outline" color={A.protein} title="Progress and weigh ins"
            sub={current != null ? `${current} kg now${goal != null ? `, goal ${goal} kg` : ''}` : 'Log your first weigh in'}
            onPress={() => router.push('/progress')}
          />
          <Setting
            icon="barbell-outline" color={A.core} title="My gym machines"
            sub={profile.gym_name || 'Choose your equipment'}
            onPress={() => router.push('/library/machines')}
          />
          <Setting
            icon="key-outline" color={A.water} title="Change password"
            sub="Sign in with a new password"
            onPress={() => router.push('/user/password')}
          />
        </View>
      </Section>
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
  return (
    <Pressable onPress={onPress} hitSlop={8} accessibilityRole="button" accessibilityLabel="Edit" style={(p) => [{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: R.sm }, smooth, hovered(p) && { backgroundColor: C.card2 }]}>
      <Ionicons name="create-outline" size={14} color={C.text} />
      <Text style={st.edit}>Edit</Text>
    </Pressable>
  );
}

function Line({ k, v, color, last, onPress }: { k: string; v: string; color?: string; last?: boolean; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} accessibilityRole={onPress ? 'button' : undefined} style={(p) => [st.line, smooth, last && { borderBottomWidth: 0 }, !!onPress && hovered(p) && { backgroundColor: C.card2 }]}>
      <Text style={st.k}>{k}</Text>
      <Text style={[st.v, !!color && { color }]} numberOfLines={2}>{v}</Text>
    </Pressable>
  );
}

/** One setting: a coloured icon, what it is, what it is set to now. */
function Setting({ icon, color, title, sub, warn, onPress }: {
  icon: React.ComponentProps<typeof Ionicons>['name']; color: string; title: string; sub: string; warn?: boolean; onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={(p) => [st.setting, smooth, hovered(p) && { backgroundColor: C.card2, borderColor: color + '88' }, p.pressed && { backgroundColor: C.card2 }]}>
      <View style={[st.settingIcon, { backgroundColor: color + '24', borderColor: color + '55' }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text style={st.settingTitle} numberOfLines={1}>{title}</Text>
        <Text style={[st.settingSub, warn && { color: A.carbs }]} numberOfLines={2}>{sub}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={C.muted} />
    </Pressable>
  );
}

const st = StyleSheet.create({
  nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  logout: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: C.borderStrong, borderRadius: 999, paddingVertical: 7, paddingHorizontal: 12 },
  logoutText: { color: C.text, fontFamily: F.bodySemi, fontSize: 13 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatarRing: { width: 76, height: 76, borderRadius: 38, borderWidth: 2, borderColor: A.protein, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: C.card2, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImg: { width: '100%', height: '100%' },
  avatarBusy: { ...StyleSheet.absoluteFill, backgroundColor: C.bg + 'aa', alignItems: 'center', justifyContent: 'center' },
  avatarBadge: { position: 'absolute', right: -2, bottom: -2, width: 24, height: 24, borderRadius: 12, backgroundColor: A.up, borderWidth: 2, borderColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  photoLink: { color: A.up, fontFamily: F.bodySemi, fontSize: 12 },
  avatarError: { color: C.danger, fontFamily: F.body, fontSize: 12, marginTop: 4 },
  initials: { color: C.text, fontFamily: F.display, fontSize: 24, letterSpacing: -0.5 },
  name: { color: C.text, fontFamily: F.display, fontSize: 22, letterSpacing: -0.5 },
  meta: { color: C.muted, fontFamily: F.body, fontSize: 12, lineHeight: 17 },
  badge: { flex: 1, borderWidth: 1, borderRadius: R.lg, paddingVertical: 14, paddingHorizontal: 14, gap: 2 },
  badgeV: { fontFamily: F.display, fontSize: 20, letterSpacing: -0.5 },
  edit: { color: C.text, fontFamily: F.bodySemi, fontSize: 12, textDecorationLine: 'underline' },
  line: { flexDirection: 'row', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border, gap: 12 },
  k: { width: 130, color: C.muted, fontFamily: F.body, fontSize: 14 },
  v: { flex: 1, color: C.text, fontFamily: F.bodyMed, fontSize: 14, textAlign: 'right' },
  track: { height: 8, borderRadius: 4, backgroundColor: C.card2, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4, backgroundColor: A.up },
  big: { color: C.text, fontFamily: F.display, fontSize: 22, letterSpacing: -0.6 },
  split: { flexDirection: 'row', height: 10, gap: 2 },
  macroV: { fontFamily: F.display, fontSize: 17, letterSpacing: -0.3 },
  coach: { flex: 1, minWidth: 0, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: R.lg, padding: 10, gap: 6 },
  coachStage: { paddingBottom: 4, borderRadius: R.md, backgroundColor: '#0b0b0b', overflow: 'hidden', alignItems: 'center', justifyContent: 'flex-end' },
  coachName: { color: C.text, fontFamily: F.display, fontSize: 18, letterSpacing: -0.4 },
  coachBlurb: { color: C.muted, fontFamily: F.body, fontSize: 12, lineHeight: 17 },
  setting: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: R.lg },
  settingIcon: { width: 46, height: 46, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  settingTitle: { color: C.text, fontFamily: F.bodySemi, fontSize: 16 },
  settingSub: { color: C.muted, fontFamily: F.body, fontSize: 13, lineHeight: 18 },
});
