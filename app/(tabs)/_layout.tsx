import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router/js-tabs';
import { StyleSheet, View } from 'react-native';
import { A, C, F } from '../../src/lib/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];
const icon = (on: IconName, off: IconName, tint: string) =>
  ({ size, focused }: { color: any; size: number; focused: boolean }) => (
    <View style={[st.iconWrap, focused && { backgroundColor: tint + '26' }]}>
      <Ionicons name={focused ? on : off} color={focused ? tint : C.faint} size={size - 4} />
    </View>
  );

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: C.bg, borderTopColor: C.border, borderTopWidth: StyleSheet.hairlineWidth, height: 68, paddingTop: 8 },
        tabBarLabelStyle: { fontFamily: F.bodySemi, fontSize: 10, letterSpacing: 0.2, marginTop: 2 },
        tabBarActiveTintColor: C.text,
        tabBarInactiveTintColor: C.faint,
        sceneStyle: { backgroundColor: C.bg },
      }}
    >
      <Tabs.Screen name="(home)" options={{ title: 'Today', tabBarIcon: icon('today', 'today-outline', A.up), tabBarActiveTintColor: A.up }} />
      <Tabs.Screen name="food" options={{ title: 'Food', tabBarIcon: icon('nutrition', 'nutrition-outline', A.carbs), tabBarActiveTintColor: A.carbs }} />
      <Tabs.Screen name="progress" options={{ title: 'Progress', tabBarIcon: icon('stats-chart', 'stats-chart-outline', A.protein), tabBarActiveTintColor: A.protein }} />
      <Tabs.Screen name="library" options={{ title: 'Exercises', tabBarIcon: icon('barbell', 'barbell-outline', A.fat), tabBarActiveTintColor: A.fat }} />
      <Tabs.Screen name="you" options={{ title: 'You', tabBarIcon: icon('person', 'person-outline', A.water), tabBarActiveTintColor: A.water }} />
    </Tabs>
  );
}

const st = StyleSheet.create({
  iconWrap: { width: 46, height: 28, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
});
