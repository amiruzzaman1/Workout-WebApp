import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { EventsTab } from '../../../src/components/career/EventsTab';
import { ExamsTab } from '../../../src/components/career/ExamsTab';
import { PlanTab } from '../../../src/components/career/PlanTab';
import { ResourcesTab } from '../../../src/components/career/ResourcesTab';
import { Eyebrow, H1, hovered, P, Screen, smooth } from '../../../src/components/ui';
import { isOwner } from '../../../src/lib/owner';
import { useStore } from '../../../src/lib/store';
import { A, C, F, R } from '../../../src/lib/theme';

type Tab = 'plan' | 'events' | 'exams' | 'resources';
const TABS: { key: Tab; label: string; color: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { key: 'plan', label: 'Plan', color: A.protein, icon: 'checkbox-outline' },
  { key: 'events', label: 'Events', color: A.up, icon: 'people-outline' },
  { key: 'exams', label: 'Exams', color: A.cardio, icon: 'ribbon-outline' },
  { key: 'resources', label: 'Resources', color: A.fibre, icon: 'library-outline' },
];
const TAB_KEYS = TABS.map((t) => t.key);

/**
 * The Career tab: Amir's 14 week plan to a Software Engineer job in NZ. Private to one account (isOwner), so
 * every other account sees a plain "not available" page, and the tab itself is hidden in app/(tabs)/_layout.tsx.
 */
export default function Career() {
  const { session } = useStore();
  if (!isOwner(session)) {
    return (
      <Screen>
        <H1>Not available</H1>
        <P muted>This page is private to one account.</P>
      </Screen>
    );
  }
  return <CareerPage />;
}

function CareerPage() {
  const { tab: tabParam } = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<Tab>(() => (TAB_KEYS.includes(tabParam as Tab) ? (tabParam as Tab) : 'plan'));
  // Four buttons with icons do not fit on one row of a phone, so the icons go and the words stay.
  const compact = useWindowDimensions().width < 440;
  // The bottom bar keeps this screen mounted, so a link with ?tab= needs to switch the tab itself.
  useEffect(() => {
    if (TAB_KEYS.includes(tabParam as Tab)) setTab(tabParam as Tab);
  }, [tabParam]);

  return (
    <Screen>
      <Eyebrow>Career</Eyebrow>
      <H1>Software Engineer in NZ</H1>
      <View style={s.seg}>
        {TABS.map((t) => {
          const on = t.key === tab;
          return (
            <Pressable key={t.key} onPress={() => setTab(t.key)} accessibilityRole="tab" accessibilityState={{ selected: on }} style={(p) => [s.segBtn, compact && s.segBtnCompact, smooth, hovered(p) && !on && { backgroundColor: C.card2, borderColor: t.color + '88' }, on && { backgroundColor: t.color + '26', borderColor: t.color }]}>
              {!compact && <Ionicons name={t.icon} size={16} color={on ? t.color : C.muted} />}
              <Text style={[s.segText, on && { color: t.color }]}>{t.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {tab === 'plan' && <PlanTab />}
      {tab === 'events' && <EventsTab />}
      {tab === 'exams' && <ExamsTab />}
      {tab === 'resources' && <ResourcesTab />}
    </Screen>
  );
}

const s = StyleSheet.create({
  seg: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  segBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: R.md, borderWidth: 1, borderColor: C.border, backgroundColor: C.card },
  segBtnCompact: { flex: 1, justifyContent: 'center', paddingHorizontal: 6 },
  segText: { color: C.muted, fontFamily: F.bodySemi, fontSize: 13 },
});
