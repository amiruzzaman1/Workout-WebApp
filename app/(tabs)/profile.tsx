import { useRouter } from 'expo-router';
import { Button, Card, H1, P, Screen } from '../../src/components/ui';
import { DAY_SHORT, SPLIT_LABELS, WEEK_ORDER } from '../../src/lib/planner';
import { useStore } from '../../src/lib/store';

const GOAL: Record<string, string> = { general: 'General fitness', muscle: 'Build muscle', fat_loss: 'Lose fat', strength: 'Get stronger' };

export default function ProfileScreen() {
  const { profile, session, signOut } = useStore();
  const router = useRouter();
  if (!profile) return null;
  const days = WEEK_ORDER.filter((d) => profile.training_days.includes(d)).map((d) => DAY_SHORT[d] + (profile.sessions_per_day > 1 && profile.double_days.includes(d) ? ' ×2' : ''));
  return (
    <Screen>
      <H1>{profile.display_name || 'Profile'}</H1>
      <P muted>{session?.user.email}</P>
      <Card>
        <P>Experience: {profile.experience === 'beginner' ? 'Beginner' : 'Trained before'}</P>
        <P>Goal: {GOAL[profile.goal]}</P>
        <P>Days: {days.join(', ')}</P>
        <P>Session length: {profile.session_minutes} min</P>
        <P>Split: {SPLIT_LABELS[profile.split]}</P>
        {!!profile.injuries && <P>Injuries: {profile.injuries}</P>}
        <P>Gym: {profile.gym_name}</P>
      </Card>
      <Button title="Edit profile & schedule" onPress={() => router.push('/onboarding')} />
      <Button kind="danger" title="Sign out" onPress={signOut} />
    </Screen>
  );
}
