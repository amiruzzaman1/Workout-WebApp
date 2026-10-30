import { Stack } from 'expo-router';
import { stackOptions } from '../../../src/components/StackHeader';

export const unstable_settings = { initialRouteName: 'index' };

export default function HomeStack() {
  return (
    <Stack screenOptions={stackOptions}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="workout/[day]/[idx]" options={{ title: '' }} />
      <Stack.Screen name="session/[day]/[idx]" options={{ title: 'Edit session' }} />
      <Stack.Screen name="exercise/[id]" options={{ title: '' }} />
      <Stack.Screen name="achievements" options={{ title: '' }} />
      <Stack.Screen name="week" options={{ title: '' }} />
    </Stack>
  );
}
