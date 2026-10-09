import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { SpaceGrotesk_500Medium } from '@expo-google-fonts/space-grotesk/500Medium';
import { SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk/700Bold';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import { ConfirmHost } from '../src/components/ConfirmHost';
import { Loading } from '../src/components/ui';
import { AiRuntimeProvider } from '../src/lib/aiRuntime';
import { StoreProvider, useStore } from '../src/lib/store';
import { C, F } from '../src/lib/theme';

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
