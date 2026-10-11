import { Stack } from 'expo-router';
import { Text } from 'react-native';
import { Eyebrow, H1, P, Screen, Section } from '../../../src/components/ui';
import { A, C, F } from '../../../src/lib/theme';

/**
 * A plain, honest privacy policy for a small personal app, not a published product: what is collected, where
 * it lives, and who can see what. Written for the one friend who might also sign up, not a legal department.
 */
export default function Privacy() {
  return (
    <Screen>
      <Stack.Screen options={{ title: '' }} />
      <Eyebrow>User</Eyebrow>
      <H1>Privacy policy</H1>
      <P muted style={{ fontSize: 13, lineHeight: 19 }}>
        Forge is a personal project built by Amir for his own use and one friend's, not a published app or a
        business. This page explains what it keeps, where, and who can see it, in plain language.
      </P>

      <Section title="What is stored" icon="server-outline" color={A.protein}>
        <P style={{ fontSize: 14, lineHeight: 21 }}>
          Your account email, the body stats and goals you enter, your workout, food, water, sleep and time
          tracking logs, weigh ins, any custom exercises, recipes or foods you add, your reminders and alarms,
          and any photos you choose to upload (a profile picture, progress photos). Everything lives in one
          Supabase database and storage project that Amir owns and manages. There is no analytics, no
          advertising, and nothing is sold or shared with any other company.
        </P>
      </Section>

      <Section title="Who can see what" icon="eye-outline" color={A.carbs}>
        <P style={{ fontSize: 14, lineHeight: 21 }}>
          Your body stats, goals, logs, weigh ins, reminders, alarms and progress photos are private: only you
          can see them, enforced by the database itself (row level security), not just by the app's screens.
        </P>
        <P style={{ fontSize: 14, lineHeight: 21 }}>
          Two things are shared on purpose, so people using the app together can build up a food list faster:
          your profile picture and any food you add to the shared food list are visible to everyone else
          signed in to the app, the same way they are the other way round. Nothing else works like this.
        </P>
      </Section>

      <Section title="The on device AI model" icon="sparkles-outline" color="#8f9bff">
        <P style={{ fontSize: 14, lineHeight: 21 }}>
          If you turn it on, the small AI model (Android only) downloads once and runs entirely on your own
          phone. What you say or type to it, and anything it works out from your data to answer you, never
          leaves your device. It is not connected to the internet while running.
        </P>
      </Section>

      <Section title="Notifications" icon="notifications-outline" color={A.fibre}>
        <P style={{ fontSize: 14, lineHeight: 21 }}>
          Reminders and alarms are scheduled on your own phone (or, on the web, your own browser tab) through
          the normal Android notification system. No server sends these; nothing about them is sent anywhere.
        </P>
      </Section>

      <Section title="Deleting your data" icon="trash-outline" color={A.over}>
        <P style={{ fontSize: 14, lineHeight: 21 }}>
          Deleting something in the app (a log, a photo, a reminder) deletes it for good, right away. Deleting
          your whole account is not yet a button in the app; ask Amir directly and it will be removed by hand.
        </P>
      </Section>

      <Text style={{ fontFamily: F.body, fontSize: 12, color: C.faint, marginTop: 20 }}>
        Questions about any of this: ask Amir directly, he built and runs the whole thing.
      </Text>
    </Screen>
  );
}
