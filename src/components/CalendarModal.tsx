import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { todayISO } from '../lib/progress';
import { hovered, smooth } from './ui';
import { C, F, R } from '../lib/theme';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const z = (n: number) => String(n).padStart(2, '0');
const iso = (y: number, m: number, d: number) => `${y}-${z(m + 1)}-${z(d)}`;

/** A month calendar for picking any day, past or future. */
export function CalendarModal({ visible, value, onPick, onClose }: {
  visible: boolean; value: string; onPick: (date: string) => void; onClose: () => void;
}) {
  const start = new Date(`${value}T12:00:00`);
  const [year, setYear] = useState(start.getFullYear());
  const [month, setMonth] = useState(start.getMonth());

  // Open on the month of the day that is currently picked.
  useEffect(() => {
    if (!visible) return;
    const d = new Date(`${value}T12:00:00`);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  }, [visible, value]);

  const step = (dm: number) => {
    const d = new Date(year, month + dm, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  };

  const lead = (new Date(year, month, 1).getDay() + 6) % 7; // Monday first
  const count = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(lead).fill(null), ...Array.from({ length: count }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);
  const today = todayISO();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose}>
        <Pressable style={s.card} onPress={() => {}}>
          <View style={s.head}>
            <Pressable onPress={() => step(-12)} hitSlop={6} style={(p) => [s.nav, smooth, hovered(p) && { backgroundColor: C.card2 }]} accessibilityRole="button" accessibilityLabel="Previous year"><Text style={s.navText}>«</Text></Pressable>
            <Pressable onPress={() => step(-1)} hitSlop={6} style={(p) => [s.nav, smooth, hovered(p) && { backgroundColor: C.card2 }]} accessibilityRole="button" accessibilityLabel="Previous month"><Text style={s.navText}>‹</Text></Pressable>
            <Text style={s.title}>{MONTHS[month]} {year}</Text>
            <Pressable onPress={() => step(1)} hitSlop={6} style={(p) => [s.nav, smooth, hovered(p) && { backgroundColor: C.card2 }]} accessibilityRole="button" accessibilityLabel="Next month"><Text style={s.navText}>›</Text></Pressable>
            <Pressable onPress={() => step(12)} hitSlop={6} style={(p) => [s.nav, smooth, hovered(p) && { backgroundColor: C.card2 }]} accessibilityRole="button" accessibilityLabel="Next year"><Text style={s.navText}>»</Text></Pressable>
          </View>

          <View style={s.row}>
            {WEEK.map((w) => <Text key={w} style={s.weekday}>{w}</Text>)}
          </View>

          {Array.from({ length: cells.length / 7 }, (_, r) => (
            <View key={r} style={s.row}>
              {cells.slice(r * 7, r * 7 + 7).map((d, i) => {
                if (d == null) return <View key={i} style={s.cell} />;
                const date = iso(year, month, d);
                const on = date === value;
                return (
                  <Pressable key={i} onPress={() => onPick(date)} style={s.cell} accessibilityRole="button" accessibilityLabel={`${d} ${MONTHS[month]} ${year}`} accessibilityState={{ selected: on }}>
                    {(p: any) => (
                      <View style={[s.day, smooth, date === today && s.dayToday, hovered(p) && !on && { backgroundColor: C.card2, borderColor: C.text, borderWidth: 1 }, on && s.dayOn]}>
                        <Text style={[s.dayText, on && { color: C.inverseText, fontFamily: F.bodySemi }]}>{d}</Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          ))}

          <View style={s.foot}>
            <Pressable onPress={() => onPick(today)} hitSlop={8} accessibilityRole="button" style={(p) => [s.linkBtn, smooth, hovered(p) && { backgroundColor: C.card2 }]}><Text style={s.link}>Go to today</Text></Pressable>
            <Pressable onPress={onClose} hitSlop={8} accessibilityRole="button" style={(p) => [s.linkBtn, smooth, hovered(p) && { backgroundColor: C.card2 }]}><Text style={s.link}>Close</Text></Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  card: { width: '100%', maxWidth: 360, backgroundColor: C.card, borderWidth: 1, borderColor: C.borderStrong, borderRadius: R.lg, padding: 14, gap: 4 },
  head: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  nav: { width: 34, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: R.sm },
  linkBtn: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: R.sm },
  navText: { color: C.text, fontFamily: F.bodySemi, fontSize: 20 },
  title: { flex: 1, textAlign: 'center', color: C.text, fontFamily: F.display, fontSize: 16, letterSpacing: -0.3 },
  row: { flexDirection: 'row' },
  weekday: { flex: 1, textAlign: 'center', color: C.muted, fontFamily: F.bodySemi, fontSize: 11, paddingVertical: 6 },
  cell: { flex: 1, height: 42, alignItems: 'center', justifyContent: 'center' },
  day: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'transparent' },
  dayToday: { borderColor: C.muted },
  dayOn: { backgroundColor: C.inverse, borderColor: C.inverse },
  dayText: { color: C.text, fontFamily: F.body, fontSize: 14 },
  foot: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 10, paddingHorizontal: 4 },
  link: { color: C.text, fontFamily: F.bodySemi, fontSize: 13, textDecorationLine: 'underline' },
});
