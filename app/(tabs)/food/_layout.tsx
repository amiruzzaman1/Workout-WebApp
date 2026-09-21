import { Stack } from 'expo-router';
import { C, F } from '../../../src/lib/theme';

export default function FoodStack() {
  return (
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
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
}
