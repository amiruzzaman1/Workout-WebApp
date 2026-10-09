import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DAY_NAMES } from '../lib/planner';
import { todayISO } from '../lib/progress';
import { useStore } from '../lib/store';
import { A, APP_NAME, C, F, R, TYPE } from '../lib/theme';
import { CalendarModal } from './CalendarModal';
import { hovered, smooth } from './ui';
import { Logo } from './Logo';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const z = (n: number) => String(n).padStart(2, '0');
const iso = (d: Date) => `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
const noon = (s: string) => new Date(`${s}T12:00:00`);

/** The quick choices. Anything else is picked from the calendar. */
const OFFSETS = [-2, -1, 0, 1, 2];
const QUICK_NAMES: Record<number, string> = { [-2]: 'Day before yesterday', 2: 'Day after tomorrow' };

function dayFor(offset: number) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + offset);
  return d;
}

/** Words only, never a date: Today, Yesterday, a weekday name, or how many days ago. The date lives in the dropdown. */
export function dayLabel(date: string) {
  const diff = Math.round((noon(date).getTime() - noon(todayISO()).getTime()) / 864e5);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  if (diff < -6) return `${-diff} days ago`;
  if (diff > 6) return `In ${diff} days`;
  return DAY_NAMES[noon(date).getDay()];
}

/**
 * The bar at the top of every tab: your profile, the app name, and the day you are working on.
 * Whatever day you pick here is the day food, workouts, sleep, weight and time get saved to.
 */
export function AppHeader() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { profile, session, date, setDate } = useStore();
  const [open, setOpen] = useState(false);
  const [calendar, setCalendar] = useState(false);
  // On a small phone the name and the day pill would touch, so the name shrinks and sits between them instead of over the middle.
  const winW = useWindowDimensions().width;
  const narrow = winW < 400;
  const tiny = winW < 340;

  // Nothing to show until the profile exists (the sign up screen).
  if (!profile) return <View style={{ height: insets.top, backgroundColor: C.bg }} />;

  const name = profile.display_name || session?.user.email?.split('@')[0] || 'You';
  const initials = name.split(/\s+/).map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
  const notToday = date !== todayISO();
  const quickDates = OFFSETS.map((o) => iso(dayFor(o)));
  const pickedElsewhere = !quickDates.includes(date);
  const shown = noon(date);

  return (
    <View style={{ backgroundColor: C.bg, paddingTop: insets.top + 12, paddingBottom: 6 }}>
      <View style={s.bar}>
        <Pressable onPress={() => router.push('/user')} style={(st) => [s.avatar, smooth, hovered(st) && { borderColor: A.protein, backgroundColor: C.border }, st.pressed && { opacity: 0.7 }]} accessibilityRole="button" accessibilityLabel="User page">
          {profile.avatar_url ? <Image source={{ uri: profile.avatar_url }} style={s.avatarImg} /> : <Text style={s.initials}>{initials}</Text>}
        </Pressable>

        <View style={[s.brand, narrow && s.brandFlow]} pointerEvents="none">
          <Logo size={tiny ? 28 : narrow ? 30 : 34} />
          <Text style={[s.name, tiny && { fontSize: 26 }]}>{APP_NAME}</Text>
        </View>

        <Pressable onPress={() => setOpen(true)} style={(st) => [s.pill, smooth, hovered(st) && !notToday && { backgroundColor: C.card2, borderColor: C.text }, notToday && s.pillOn, hovered(st) && notToday && { backgroundColor: '#dcdcdc' }, st.pressed && { opacity: 0.7 }]} accessibilityRole="button" accessibilityLabel="Choose the day">
          <Text style={[s.pillText, notToday && { color: C.inverseText }]} numberOfLines={1}>{dayLabel(date)}</Text>
          <Ionicons name="chevron-down" size={14} color={notToday ? C.inverseText : C.text} />
        </Pressable>
      </View>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={s.backdrop} onPress={() => setOpen(false)}>
          <View style={[s.menu, { top: insets.top + 70, maxHeight: height * 0.62 }]}>
            <Text style={s.menuHead}>Add or view records for</Text>
            <ScrollView>
              {OFFSETS.map((o) => {
                const d = iso(dayFor(o));
                const on = d === date;
                const dt = dayFor(o);
                return (
                  <Pressable key={o} onPress={() => { setDate(d); setOpen(false); }} style={(st) => [s.item, smooth, (st.pressed || hovered(st)) && { backgroundColor: C.card2 }]} accessibilityRole="button" accessibilityState={{ selected: on }}>
                    <Text style={[s.itemText, on && { fontFamily: F.bodySemi }]}>
                      {QUICK_NAMES[o] ?? dayLabel(d)} <Text style={s.itemDate}>({dt.getDate()} {MONTHS[dt.getMonth()]})</Text>
                    </Text>
                    {on && <Ionicons name="checkmark" size={16} color={C.inverse} />}
                  </Pressable>
                );
              })}
            </ScrollView>
            <View style={s.sep} />
            <Pressable
              onPress={() => { setOpen(false); setTimeout(() => setCalendar(true), 250); }}
              style={(st) => [s.item, smooth, (st.pressed || hovered(st)) && { backgroundColor: C.card2 }]}
              accessibilityRole="button"
            >
              <Ionicons name="calendar-outline" size={18} color={C.text} />
              <Text style={[s.itemText, pickedElsewhere && { fontFamily: F.bodySemi }]}>
                Pick a date{pickedElsewhere ? <Text style={s.itemDate}> ({shown.getDate()} {MONTHS[shown.getMonth()]} {shown.getFullYear()})</Text> : ''}
              </Text>
              {pickedElsewhere && <Ionicons name="checkmark" size={16} color={C.inverse} />}
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <CalendarModal visible={calendar} value={date} onPick={(d) => { setDate(d); setCalendar(false); }} onClose={() => setCalendar(false)} />
    </View>
  );
}

const s = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44, width: '100%', maxWidth: 720, alignSelf: 'center', paddingHorizontal: 20 },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: C.card2, borderWidth: 1, borderColor: C.borderStrong, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImg: { width: '100%', height: '100%' },
  initials: { color: C.text, fontFamily: F.display, fontSize: 14, letterSpacing: -0.3 },
  brand: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  brandFlow: { position: 'relative', flex: 1 },
  name: { color: C.inverse, fontFamily: F.display, fontSize: TYPE.app, letterSpacing: -0.8 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: C.borderStrong, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 12, maxWidth: 130 },
  pillOn: { backgroundColor: C.inverse, borderColor: C.inverse },
  pillText: { color: C.text, fontFamily: F.bodySemi, fontSize: 13 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  menu: { position: 'absolute', right: 20, width: 250, backgroundColor: C.card, borderWidth: 1, borderColor: C.borderStrong, borderRadius: R.lg, paddingVertical: 6, overflow: 'hidden' },
  menuHead: { color: C.muted, fontFamily: F.bodySemi, fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6 },
  sep: { height: 1, backgroundColor: C.border, marginVertical: 4 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 16 },
  itemText: { flex: 1, color: C.text, fontFamily: F.body, fontSize: 15 },
  itemDate: { color: C.muted, fontFamily: F.body, fontSize: 13 },
});
