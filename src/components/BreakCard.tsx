import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { addDaysISO, breakEndOf, dayText } from '../lib/onBreak';
import { todayISO } from '../lib/progress';
import { useStore } from '../lib/store';
import { A, C, F, R } from '../lib/theme';
import { CalendarModal } from './CalendarModal';
import { Button, Chip, Row, hovered, smooth } from './ui';

/**
 * The On break switch, for a tour or a holiday: no alarms, reminders, or nudges from now until the end of the day you
 * pick, then everything comes back by itself the next day. You can turn it back on yourself before that.
 */
export function BreakCard() {
  const { profile, saveProfile } = useStore();
  const until = profile?.break_until ?? null;
  const active = !!breakEndOf(until);
  const [picking, setPicking] = useState(false);
  const [calendar, setCalendar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const today = todayISO();

  async function set(day: string | null) {
    setBusy(true);
    setError(null);
    try {
      await saveProfile({ break_until: day } as any);
      setPicking(false);
    } catch (e: any) {
      setError(/break_until|column/i.test(e?.message ?? '') ? 'Run the v23 SQL in Supabase first (it adds the break column), then try again.' : e?.message ?? 'Could not save.');
    } finally {
      setBusy(false);
    }
  }

  if (active && until) {
    return (
      <View style={[s.card, { borderTopColor: A.cardio }]}>
        <Row style={{ gap: 10 }}>
          <Ionicons name="airplane" size={22} color={A.cardio} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.title}>On break until the end of {dayText(until)}</Text>
            <Text style={s.sub}>No alarms, reminders or notifications. Everything comes back on {dayText(addDaysISO(until, 1))} by itself.</Text>
          </View>
        </Row>
        <Row style={{ gap: 8, marginTop: 8 }}>
          <Button small icon="notifications" title="Turn back on now" onPress={() => set(null)} loading={busy} />
          <Button small kind="secondary" icon="calendar-outline" title="Change day" onPress={() => setCalendar(true)} />
        </Row>
        {!!error && <Text style={s.err}>{error}</Text>}
        <CalendarModal visible={calendar} value={until} onPick={(d) => { setCalendar(false); if (d >= today) set(d); }} onClose={() => setCalendar(false)} />
      </View>
    );
  }

  return (
    <View style={[s.card, { borderTopColor: C.borderStrong }]}>
      <Row style={{ gap: 10 }}>
        <Ionicons name="airplane-outline" size={22} color={C.muted} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.title}>On break</Text>
          <Text style={s.sub}>Going away? Switch off every alarm, reminder and notification until a day you choose. They come back on their own.</Text>
        </View>
      </Row>
      {picking ? (
        <View style={{ gap: 8, marginTop: 8 }}>
          <Text style={s.sub}>Quiet until the end of:</Text>
          <Row wrap style={{ gap: 6 }}>
            <Chip label={`Tomorrow, ${dayText(addDaysISO(today, 1))}`} active={false} onPress={() => set(addDaysISO(today, 1))} />
            <Chip label={`Day after, ${dayText(addDaysISO(today, 2))}`} active={false} onPress={() => set(addDaysISO(today, 2))} />
            <Chip label="Pick a day" active={false} onPress={() => setCalendar(true)} />
            <Chip label="Cancel" active={false} onPress={() => setPicking(false)} />
          </Row>
          {!!error && <Text style={s.err}>{error}</Text>}
          <CalendarModal visible={calendar} value={addDaysISO(today, 3)} onPick={(d) => { setCalendar(false); if (d >= today) set(d); }} onClose={() => setCalendar(false)} />
        </View>
      ) : (
        <Row style={{ marginTop: 8 }}>
          <Button small kind="secondary" icon="airplane-outline" tint={A.cardio} title="I'm on a break" onPress={() => setPicking(true)} />
        </Row>
      )}
    </View>
  );
}

/** A thin strip for the Dashboard while on a break, so it is never forgotten. Tap it to change or end the break. */
export function BreakBanner({ onPress }: { onPress: () => void }) {
  const { profile } = useStore();
  const until = profile?.break_until ?? null;
  if (!breakEndOf(until) || !until) return null;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel="On break, tap to change" style={(p) => [s.banner, smooth, hovered(p) && { backgroundColor: C.card2 }]}>
      <Ionicons name="airplane" size={18} color={A.cardio} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={s.title}>On break until the end of {dayText(until)}</Text>
        <Text style={s.sub} numberOfLines={1}>Alarms and notifications are off. Tap to change or turn back on.</Text>
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderTopWidth: 2, borderRadius: R.lg, padding: 14, marginTop: 6, marginBottom: 6 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.card, borderWidth: 1, borderColor: A.cardio, borderRadius: R.lg, padding: 12, marginTop: 4, marginBottom: 10 },
  title: { color: C.text, fontFamily: F.bodySemi, fontSize: 14 },
  sub: { color: C.muted, fontFamily: F.body, fontSize: 12, lineHeight: 17 },
  err: { color: C.danger, fontFamily: F.body, fontSize: 12, marginTop: 6 },
});
