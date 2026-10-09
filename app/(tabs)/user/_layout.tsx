import { Stack } from 'expo-router';
import { stackOptionsNoAppHeader } from '../../../src/components/StackHeader';

export const unstable_settings = { initialRouteName: 'index' };

export default function YouStack() {
  return (
    <Stack screenOptions={stackOptionsNoAppHeader}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
}
