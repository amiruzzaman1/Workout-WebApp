import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router/js-tabs';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { AppHeader } from '../../src/components/AppHeader';
import { hovered, smooth } from '../../src/components/ui';
import { VoiceCommand } from '../../src/components/VoiceCommand';
import { isOwner } from '../../src/lib/owner';
import { useStore } from '../../src/lib/store';
import { A, C, F, R } from '../../src/lib/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];
const icon = (on: IconName, off: IconName, tint: string) =>
  ({ size, focused }: { color: any; size: number; focused: boolean }) => (
    <Ionicons name={focused ? on : off} color={focused ? tint : C.muted} size={size - 2} />
  );

/**
 * One tab as a small card with a coloured line along the top, the same look as the tiles on the Dashboard and the
 * Progress page. Every tab has its own colour. The tab you are on is tinted in it, and hovering colours the border.
 */
function TabTile({ color, style, children, onPress, onLongPress, accessibilityState, accessibilityLabel, testID }: any) {
  const focused = !!accessibilityState?.selected;
  return (
    <View style={[style, { padding: 3 }]}>
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        testID={testID}
        accessibilityRole="tab"
        accessibilityState={accessibilityState}
        accessibilityLabel={accessibilityLabel}
        style={(p) => [
          t.tile, smooth,
          { borderTopColor: focused ? color : color + '88' },
          hovered(p) && !focused && { backgroundColor: C.card2, borderColor: color },
          focused && { backgroundColor: color + '26', borderColor: color },
          p.pressed && { opacity: 0.75 },
        ]}
      >
        {children}
      </Pressable>
    </View>
  );
}

const tab = (title: string, on: IconName, off: IconName, color: string) => ({
  title,
  tabBarIcon: icon(on, off, color),
  tabBarActiveTintColor: color,
  tabBarButton: (props: any) => <TabTile {...props} color={color} />,
});

export default function TabsLayout() {
  // The Career tab is private to one account, so only that account gets a sixth tab and the rest see five.
  const owner = isOwner(useStore().session);
  // The tabs share the width, so on a small phone the labels get a touch smaller instead of being cut off.
  const narrow = useWindowDimensions().width < (owner ? 400 : 360);
  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: true,
          header: () => <AppHeader />,
          tabBarStyle: { backgroundColor: C.bg, borderTopColor: C.border, borderTopWidth: StyleSheet.hairlineWidth, height: 72, paddingTop: 4, paddingBottom: 4, paddingHorizontal: 4 },
          tabBarLabelStyle: { fontFamily: F.bodySemi, fontSize: narrow ? 9 : 10, letterSpacing: narrow ? 0 : 0.2, marginTop: 1 },
          tabBarActiveTintColor: C.text,
          tabBarInactiveTintColor: C.muted,
          sceneStyle: { backgroundColor: C.bg },
        }}
      >
        <Tabs.Screen name="(home)" options={tab('Dashboard', 'grid', 'grid-outline', A.up)} />
        <Tabs.Screen name="food" options={tab('Food', 'nutrition', 'nutrition-outline', A.carbs)} />
        <Tabs.Screen name="progress" options={tab('Progress', 'stats-chart', 'stats-chart-outline', A.protein)} />
        <Tabs.Screen name="tracker" options={tab('Tracker', 'timer', 'timer-outline', A.core)} />
        <Tabs.Screen name="library" options={tab('Exercises', 'barbell', 'barbell-outline', A.fat)} />
        <Tabs.Screen name="career" options={owner ? tab('Career', 'briefcase', 'briefcase-outline', A.water) : { title: 'Career', headerShown: false, tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
        {/* Your profile opens from the icon in the top left, so it has no tab of its own. */}
        <Tabs.Screen name="user" options={{ title: 'User', headerShown: false, tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
      </Tabs>
      {/* A sibling of the tab navigator, not inside any one tab's own screen, so it floats above every page
          in every tab (including pushed detail pages in a tab's own Stack) instead of just the Dashboard. */}
      <VoiceCommand />
    </>
  );
}

const t = StyleSheet.create({
  tile: { flex: 1, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', backgroundColor: C.card, borderRadius: R.md, borderWidth: 1, borderColor: C.border, borderTopWidth: 2 },
});
