import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router/js-tabs';
import { StyleSheet } from 'react-native';
import { C, F } from '../../src/lib/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];
const icon = (on: IconName, off: IconName) => ({ color, size, focused }: { color: any; size: number; focused: boolean }) => (
  <Ionicons name={focused ? on : off} color={color} size={size - 2} />
);

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: C.bg, borderTopColor: C.border, borderTopWidth: StyleSheet.hairlineWidth, height: 62, paddingTop: 6 },
        tabBarLabelStyle: { fontFamily: F.bodyMed, fontSize: 11 },
        tabBarActiveTintColor: C.text,
        tabBarInactiveTintColor: C.faint,
        sceneStyle: { backgroundColor: C.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Today', tabBarIcon: icon('today', 'today-outline') }} />
      <Tabs.Screen name="food" options={{ title: 'Food', tabBarIcon: icon('nutrition', 'nutrition-outline') }} />
      <Tabs.Screen name="progress" options={{ title: 'Progress', tabBarIcon: icon('stats-chart', 'stats-chart-outline') }} />
      <Tabs.Screen name="library" options={{ title: 'Exercises', tabBarIcon: icon('barbell', 'barbell-outline') }} />
      <Tabs.Screen name="machines" options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ title: 'You', tabBarIcon: icon('person', 'person-outline') }} />
    </Tabs>
  );
}
