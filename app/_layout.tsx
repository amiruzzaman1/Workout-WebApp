import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { SpaceGrotesk_500Medium } from '@expo-google-fonts/space-grotesk/500Medium';
import { SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk/700Bold';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { ConfirmHost } from '../src/components/ConfirmHost';
import { Loading } from '../src/components/ui';
import { AiRuntimeProvider } from '../src/lib/aiRuntime';
import { snoozeAlarm } from '../src/lib/alarms';
import { ACTION, cancelByPrefix, onNotificationAction } from '../src/lib/notify';
import { todayISO } from '../src/lib/progress';
import { StoreProvider, useStore } from '../src/lib/store';
import { C, F } from '../src/lib/theme';

/**
 * Handles a tap on one of the action buttons a notification can have (src/lib/notify.ts's CATEGORY/ACTION),
 * while the app is already running or one cold started it (onNotificationAction covers both). The quick
 * water button genuinely logs it right away rather than just opening the Food tab, since that one button is
 * the whole point: everything else just takes you to the right screen. A ref holds the latest store so the
 * handler (set up once, not re-subscribed on every store change) never acts on stale water data.
 */
function NotificationActions() {
  const router = useRouter();
  const store = useStore();
  const storeRef = useRef(store);
  storeRef.current = store;

  useEffect(() => {
    if (!store.ready) return;
    return onNotificationAction((actionId, data) => {
      const s = storeRef.current;
      const alarm = data?.alarmId ? s.alarms.find((x) => x.id === data.alarmId) : undefined;
      switch (actionId) {
        case ACTION.snooze:
          // The Snooze button: stop this ring's other copies and ring again after the alarm's own snooze time.
          if (alarm) {
            cancelByPrefix(`alarm-${alarm.id}-${data?.n ?? 0}-`);
            snoozeAlarm(alarm, alarm.snooze_minutes ?? 10);
          }
          break;
        case ACTION.stopAlarm:
          if (alarm) {
            cancelByPrefix(`alarm-${alarm.id}-${data?.n ?? 0}-`);
            cancelByPrefix(`alarm-snooze-${alarm.id}-`);
            cancelByPrefix(`alarm-test-${alarm.id}-`);
          }
          break;
        case ACTION.addWater: {
          const today = todayISO();
          s.setWater(today, (s.water[today] ?? 0) + 250).catch(() => {});
          router.push('/');
          break;
        }
        case ACTION.openFood: router.push('/food/add'); break;
        case ACTION.openWorkout: router.push('/'); break;
        case ACTION.openWeight: router.push('/progress?tab=weight'); break;
        case ACTION.openPhotos: router.push('/progress?tab=photos'); break;
        case ACTION.openChat: router.push('/coach-chat'); break;
      }
    });
  }, [store.ready]);
  return null;
}

function Gate() {
  const { ready, session, profile } = useStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    const top = segments[0] as string | undefined;
    if (!session && top !== 'login') router.replace('/login');
    else if (session && !profile && top !== 'welcome' && !(segments as string[]).includes('onboarding')) router.replace('/welcome');
    else if (session && profile && top === 'login') router.replace('/');
  }, [ready, session, profile, segments, router]);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <NotificationActions />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: C.bg },
          headerTintColor: C.text,
          headerShadowVisible: false,
          headerTitleStyle: { fontFamily: F.displayMed, fontSize: 17 },
          headerBackTitle: 'Back',
          contentStyle: { backgroundColor: C.bg },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="welcome" options={{ headerShown: false }} />
      </Stack>
      <ConfirmHost />
      {!ready && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
          <Loading />
        </View>
      )}
    </View>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, SpaceGrotesk_500Medium, SpaceGrotesk_700Bold });
  if (!loaded) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  return (
    <StoreProvider>
      <AiRuntimeProvider>
        <StatusBar style="light" />
        <Gate />
      </AiRuntimeProvider>
    </StoreProvider>
  );
}
