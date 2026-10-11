import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { Alarm, AlarmRepeat, nextOccurrence, REPEAT_LABEL, VIBRATION_LABEL } from '../../../src/lib/alarms';
import { CalendarModal } from '../../../src/components/CalendarModal';
import { TimeField } from '../../../src/components/TimeField';
import { Button, Chip, Eyebrow, H1, hovered, Input, Label, P, Row, Screen, Section, smooth, Stepper } from '../../../src/components/ui';
import { AlarmVibration } from '../../../src/lib/notify';
import { DAY_SHORT, WEEK_ORDER } from '../../../src/lib/planner';
import { confirm } from '../../../src/lib/confirm';
import { todayISO } from '../../../src/lib/progress';
import { useStore } from '../../../src/lib/store';
import { A, C, F, R } from '../../../src/lib/theme';
import { fmt12 } from '../../../src/lib/tracker';

/** A small on/off switch, the track slides colour and the knob slides across, same idea as a phone's own
 *  alarm toggle. Honours reduce motion, same as TaskRow's tick box. */
function AlarmSwitch({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  const p = useRef(new Animated.Value(on ? 1 : 0)).current;
  const still = useRef(false);
  useEffect(() => { AccessibilityInfo.isReduceMotionEnabled?.().then((v) => { still.current = v; }).catch(() => {}); }, []);
  useEffect(() => {
    Animated.timing(p, { toValue: on ? 1 : 0, duration: still.current ? 0 : 160, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [on]);
  const track = p.interpolate({ inputRange: [0, 1], outputRange: [C.border, A.up] });
  const knob = p.interpolate({ inputRange: [0, 1], outputRange: [2, 20] });
  return (
    <Pressable onPress={onToggle} accessibilityRole="switch" accessibilityState={{ checked: on }} hitSlop={8}>
      <Animated.View style={[s.switchTrack, { backgroundColor: track }]}>
        <Animated.View style={[s.switchKnob, { transform: [{ translateX: knob }] }]} />
      </Animated.View>
    </Pressable>
  );
}

/** "Every day, 7:00 AM" / "Mon, Wed, Fri, 7:00 AM" / "Thu 15 Oct, 7:00 AM", or "Already happened" for a past once. */
function fmtWhen(a: Alarm) {
  const time = fmt12(a.alarm_time);
  if (!a.enabled) return `Off · ${time}`;
  if (a.repeat === 'daily') return `Every day, ${time}`;
  if (a.repeat === 'weekly') {
    if (!a.days.length) return `No days picked, ${time}`;
    const names = WEEK_ORDER.filter((d) => a.days.includes(d)).map((d) => DAY_SHORT[d]);
    return `${names.join(', ')}, ${time}`;
  }
  const when = nextOccurrence(a);
  if (!when) return `Already happened, ${time}`;
  const md = when.toLocaleDateString('en-NZ', { weekday: 'short', day: 'numeric', month: 'short' });
  return `${md}, ${time}`;
}

function AlarmRow({ a, onToggle, onEdit, onDelete }: { a: Alarm; onToggle: () => void; onEdit: () => void; onDelete: () => void }) {
  const color = A.core;
  return (
    <View style={[s.row, { borderTopColor: color, opacity: a.enabled ? 1 : 0.6 }]}>
      <Pressable onPress={onEdit} style={{ flex: 1, minWidth: 0 }}>
        <Row style={{ gap: 10 }}>
          <Text style={s.time}>{fmt12(a.alarm_time)}</Text>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.title} numberOfLines={1}>{a.label || 'Alarm'}</Text>
            <Text style={s.meta} numberOfLines={1}>{fmtWhen(a)}</Text>
          </View>
        </Row>
        <Row style={{ gap: 10, marginTop: 6 }}>
          <Ionicons name={a.sound ? 'volume-high-outline' : 'volume-mute-outline'} size={14} color={a.sound ? C.muted : C.faint} />
          <Ionicons name="phone-portrait-outline" size={14} color={a.vibrate ? C.muted : C.faint} />
          {a.vibrate && <Text style={s.metaSmall}>{VIBRATION_LABEL[a.vibration_pattern]}</Text>}
          <Text style={s.metaSmall}>· rings {a.repeat_count}×</Text>
        </Row>
      </Pressable>
      <AlarmSwitch on={a.enabled} onToggle={onToggle} />
      <Pressable onPress={onDelete} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Delete ${a.label || 'alarm'}`} style={(st) => [{ padding: 5, borderRadius: 999, marginLeft: 4 }, smooth, hovered(st) && { backgroundColor: A.over + '22' }]}>
        {(st: any) => <Ionicons name="trash-outline" size={16} color={hovered(st) ? A.over : C.faint} />}
      </Pressable>
    </View>
  );
}

const REPEATS: [AlarmRepeat, string][] = [['once', 'Once'], ['daily', 'Every day'], ['weekly', 'Certain days']];
const VIBRATIONS: [Exclude<AlarmVibration, 'none'>, string][] = [['short', 'Short pulse'], ['double', 'Double pulse'], ['long', 'Long buzz']];

/** Add or edit an alarm: a label, a time, once/daily/certain days, and sound and vibration you can each turn
 *  on or off, with its own repeat count, since the two are controlled independently. */
function AlarmForm({ initial, onCancel, onSave, onDelete }: { initial?: Alarm; onCancel: () => void; onSave: (row: Omit<Alarm, 'id'>) => Promise<void>; onDelete?: () => void }) {
  const [label, setLabel] = useState(initial?.label ?? '');
  const [time, setTime] = useState(initial?.alarm_time ?? '07:00');
  const [repeat, setRepeat] = useState<AlarmRepeat>(initial?.repeat ?? 'once');
  const [days, setDays] = useState<number[]>(initial?.days ?? []);
  const [date, setDate] = useState(initial?.alarm_date ?? todayISO());
  const [calendar, setCalendar] = useState(false);
  const [sound, setSound] = useState(initial?.sound ?? true);
  const [vibrate, setVibrate] = useState(initial?.vibrate ?? true);
  const [pattern, setPattern] = useState<Exclude<AlarmVibration, 'none'>>(initial?.vibration_pattern ?? 'short');
  const [repeatCount, setRepeatCount] = useState(initial?.repeat_count ?? 3);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function toggleDay(d: number) {
    setDays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]));
  }

  async function save() {
    if (repeat === 'weekly' && days.length === 0) return setError('Pick at least one day.');
    if (!sound && !vibrate) return setError('Turn on sound, vibration, or both.');
    setBusy(true);
    try {
      await onSave({
        label: label.trim().slice(0, 80), alarm_time: time, repeat,
        days: repeat === 'weekly' ? days : [], alarm_date: repeat === 'once' ? date : null,
        sound, vibrate, vibration_pattern: pattern, repeat_count: repeatCount, enabled: initial?.enabled ?? true,
      });
    } catch (e: any) {
      setError(e?.message ?? 'Could not save. Check your connection and try again.');
      setBusy(false);
    }
  }

  return (
    <View style={[s.row, s.editBox, { borderTopColor: A.core }]}>
      <Label>Label (optional)</Label>
      <Input value={label} onChangeText={setLabel} placeholder="e.g. Take vitamins, Leave for the gym" accessibilityLabel="Alarm label" />
      <Label>Time</Label>
      <TimeField value={time} onChange={setTime} />
      <Label>How often</Label>
      <Row wrap style={{ gap: 6 }}>
        {REPEATS.map(([k, l]) => <Chip key={k} label={l} active={repeat === k} onPress={() => setRepeat(k)} />)}
      </Row>
      {repeat === 'weekly' && (
        <Row wrap style={{ gap: 6, marginTop: 2 }}>
          {WEEK_ORDER.map((d) => <Chip key={d} label={DAY_SHORT[d]} active={days.includes(d)} onPress={() => toggleDay(d)} />)}
        </Row>
      )}
      {repeat === 'once' && (
        <>
          <Pressable onPress={() => setCalendar(true)} accessibilityRole="button" style={(p) => [s.dateBtn, smooth, hovered(p) && { borderColor: C.text }]}>
            <Ionicons name="calendar-outline" size={16} color={C.muted} />
            <Text style={s.dateBtnText}>{new Date(`${date}T12:00:00`).toLocaleDateString('en-NZ', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
          </Pressable>
          <CalendarModal visible={calendar} value={date} onPick={(d) => { setDate(d); setCalendar(false); }} onClose={() => setCalendar(false)} />
        </>
      )}

      <Label>Sound</Label>
      <Row style={{ gap: 6 }}>
        <Chip label="On" active={sound} onPress={() => setSound(true)} />
        <Chip label="Off" active={!sound} onPress={() => setSound(false)} />
      </Row>

      <Label>Vibration</Label>
      <Row style={{ gap: 6 }}>
        <Chip label="On" active={vibrate} onPress={() => setVibrate(true)} />
        <Chip label="Off" active={!vibrate} onPress={() => setVibrate(false)} />
      </Row>
      {vibrate && (
        <Row wrap style={{ gap: 6, marginTop: 2 }}>
          {VIBRATIONS.map(([k, l]) => <Chip key={k} label={l} active={pattern === k} onPress={() => setPattern(k)} />)}
        </Row>
      )}

      <Label>Rings and buzzes this many times</Label>
      <Stepper value={repeatCount} onChange={(v) => setRepeatCount(Math.max(1, Math.min(6, Math.round(v))))} />

      {!!error && <Text style={{ color: C.danger, fontFamily: F.body, fontSize: 13, marginTop: 6 }}>{error}</Text>}
      <Row style={{ gap: 8, marginTop: 12 }}>
        <Button small icon="checkmark" title="Save" onPress={save} loading={busy} />
        <Button small kind="secondary" title="Cancel" onPress={onCancel} />
        {onDelete && <View style={{ flex: 1 }} />}
        {onDelete && <Button small kind="secondary" icon="trash-outline" tint={A.over} title="Delete" onPress={onDelete} />}
      </Row>
    </View>
  );
}

export default function Alarms() {
  const { alarms, addAlarm, updateAlarm, deleteAlarm } = useStore();
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const sorted = [...alarms].sort((a, b) => a.alarm_time.localeCompare(b.alarm_time));

  return (
    <Screen>
      <Stack.Screen options={{ title: '' }} />
      <Eyebrow>Tracker</Eyebrow>
      <H1>Alarms</H1>
      <P muted style={{ fontSize: 13, lineHeight: 19 }}>
        Once, every day, or certain days of the week, with sound and vibration you can each turn on or off. On
        Android this rings through the phone's alarm volume, even on silent, but it still shows as a
        notification rather than taking over the screen like the built in clock app, so it can be swiped away
        to stop it.
      </P>

      <Section title="Your alarms" icon="alarm" color={A.core} right={<Text style={s.meta}>{alarms.length || ''}</Text>}>
        <View>
          {sorted.map((a) => (
            editing === a.id ? (
              <AlarmForm
                key={a.id} initial={a} onCancel={() => setEditing(null)}
                onDelete={async () => {
                  if (await confirm('Delete this alarm?', `${a.label || 'This alarm'} will be removed.`, { confirmText: 'Delete', danger: true })) { await deleteAlarm(a.id); setEditing(null); }
                }}
                onSave={async (row) => { await updateAlarm(a.id, row); setEditing(null); }}
              />
            ) : (
              <AlarmRow
                key={a.id} a={a} onEdit={() => setEditing(a.id)}
                onToggle={() => updateAlarm(a.id, { enabled: !a.enabled })}
                onDelete={async () => {
                  if (await confirm('Delete this alarm?', `${a.label || 'This alarm'} will be removed.`, { confirmText: 'Delete', danger: true })) await deleteAlarm(a.id);
                }}
              />
            )
          ))}
          {alarms.length === 0 && !adding && <P muted style={{ fontSize: 13 }}>No alarms yet.</P>}
        </View>
        {adding ? (
          <AlarmForm onCancel={() => setAdding(false)} onSave={async (row) => { await addAlarm(row); setAdding(false); }} />
        ) : (
          <Button kind="secondary" icon="add-circle-outline" tint={A.core} title="New alarm" onPress={() => setAdding(true)} style={{ alignSelf: 'flex-start' }} />
        )}
      </Section>
    </Screen>
  );
}

const s = StyleSheet.create({
  meta: { color: C.muted, fontFamily: F.body, fontSize: 12 },
  metaSmall: { color: C.faint, fontFamily: F.body, fontSize: 11 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, marginBottom: 10, backgroundColor: C.card, borderRadius: R.lg, borderWidth: 1, borderColor: C.border, borderTopWidth: 2 },
  editBox: { flexDirection: 'column', alignItems: 'stretch', gap: 2, paddingBottom: 14 },
  time: { color: C.text, fontFamily: F.display, fontSize: 20, letterSpacing: -0.4 },
  title: { color: C.text, fontFamily: F.bodySemi, fontSize: 14 },
  dateBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: C.borderStrong, borderRadius: R.sm, paddingHorizontal: 12, paddingVertical: 12, marginTop: 2 },
  dateBtnText: { color: C.text, fontFamily: F.bodyMed, fontSize: 14 },
  switchTrack: { width: 44, height: 26, borderRadius: 13, padding: 2, justifyContent: 'center' },
  switchKnob: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff' },
});
