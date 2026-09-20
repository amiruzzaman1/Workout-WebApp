import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { Button, Eyebrow, H1, P, Screen, Section } from '../../src/components/ui';
import { DAY_SHORT, SPLIT_LABELS, WEEK_ORDER } from '../../src/lib/planner';
import { useStore } from '../../src/lib/store';
import { C, F } from '../../src/lib/theme';

const GOAL: Record<string, string> = {
  general: 'General fitness',
  recomp: 'Lose fat and build muscle',
  muscle: 'Build muscle',
  fat_loss: 'Lose fat',
  strength: 'Get stronger',
};

function Line({ k, v }: { k: string; v: string }) {
  return (
    <View style={{ flexDirection: 'row', paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: C.border, gap: 12 }}>
      <Text style={{ width: 120, color: C.muted, fontFamily: F.body, fontSize: 14 }}>{k}</Text>
      <Text style={{ flex: 1, color: C.text, fontFamily: F.bodyMed, fontSize: 14 }}>{v}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const { profile, session, signOut } = useStore();
  const router = useRouter();
  if (!profile) return null;
  const days = WEEK_ORDER.filter((d) => profile.training_days.includes(d)).map((d) => DAY_SHORT[d] + (profile.sessions_per_day > 1 && profile.double_days.includes(d) ? ' ×2' : ''));
  return (
    <Screen top>
      <Eyebrow>{session?.user.email}</Eyebrow>
      <H1>{profile.display_name || 'You'}</H1>
      <Section title="Training">
        <View>
          <Line k="Experience" v={profile.experience === 'beginner' ? 'Beginner' : 'Trained before'} />
          <Line k="Goal" v={GOAL[profile.goal]} />
          <Line k="Days" v={days.join(', ')} />
          <Line k="Session" v={`${profile.session_minutes} min`} />
          <Line k="Split" v={SPLIT_LABELS[profile.split]} />
          {!!profile.injuries && <Line k="Injuries" v={profile.injuries} />}
          <Line k="Gym" v={profile.gym_name ?? ''} />
        </View>
      </Section>
      <Button title="Edit profile & schedule" onPress={() => router.push('/onboarding')} style={{ marginTop: 20 }} />
      <Button kind="secondary" title="Body stats & daily targets" onPress={() => router.push('/nutrition')} />
      <Button kind="secondary" title="My gym machines" onPress={() => router.push('/machines')} />
      <Button kind="danger" title="Sign out" onPress={signOut} />
      <P muted style={{ fontSize: 12, marginTop: 20 }}>Exercise photos: free-exercise-db (public domain).</P>
    </Screen>
  );
}
