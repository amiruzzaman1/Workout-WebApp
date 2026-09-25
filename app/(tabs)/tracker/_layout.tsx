import { Stack } from 'expo-router';
import { stackOptions } from '../../../src/components/StackHeader';

export const unstable_settings = { initialRouteName: 'index' };

export default function TrackerStack() {
  return (
    <Stack screenOptions={stackOptions}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
}
