import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import { Loading } from '../src/components/ui';
import { StoreProvider, useStore } from '../src/lib/store';
import { C } from '../src/lib/theme';

function Gate() {
  const { ready, session, profile } = useStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    const top = segments[0] as string | undefined;
    if (!session && top !== 'login') router.replace('/login');
    else if (session && !profile && top !== 'onboarding') router.replace('/onboarding');
    else if (session && profile && top === 'login') router.replace('/');
  }, [ready, session, profile, segments, router]);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: C.bg },
          headerTintColor: C.text,
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: C.bg },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ title: 'Your profile' }} />
        <Stack.Screen name="exercise/[id]" options={{ title: 'Exercise' }} />
        <Stack.Screen name="machine/[key]" options={{ title: 'Machine guide' }} />
        <Stack.Screen name="session/[day]/[idx]" options={{ title: 'Session' }} />
        <Stack.Screen name="custom-exercise" options={{ title: 'Add my own exercise' }} />
      </Stack>
      {!ready && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
          <Loading />
        </View>
      )}
    </View>
  );
}

export default function RootLayout() {
  return (
    <StoreProvider>
      <StatusBar style="light" />
      <Gate />
    </StoreProvider>
  );
}
