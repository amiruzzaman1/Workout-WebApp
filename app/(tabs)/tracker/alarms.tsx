import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { Alarm, AlarmRepeat, isSkipping, nextRing, REPEAT_LABEL, SNOOZE_CHOICES, testAlarm, toggleSkipChanges, VIBRATION_LABEL } from '../../../src/lib/alarms';
import { BreakCard } from '../../../src/components/BreakCard';
import { dayText } from '../../../src/lib/onBreak';
import { ALARM_SOUNDS, playSound, soundLabel, stopSound } from '../../../src/lib/alarmSounds';
import { CalendarModal } from '../../../src/components/CalendarModal';
import { TimeField } from '../../../src/components/TimeField';
import { Button, Chip, Eyebrow, H1, hovered, Input, Label, P, Row, Screen, Section, smooth, Stepper } from '../../../src/components/ui';
import { AlarmVibration, MAX_ALARM_REPEATS } from '../../../src/lib/notify';
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
    <Pressable
      onPress={onToggle} accessibilityRole="switch" accessibilityState={{ checked: on }} hitSlop={8}
      style={(st) => [{ borderRadius: 15, padding: 2 }, smooth, hovered(st) && { backgroundColor: C.card2 }]}
    >
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
  const when = nextRing(a);
  if (!when) return a.repeat === 'once' ? `Already happened, ${time}` : `No ring in the next two weeks, ${time}`;
  const md = when.toLocaleDateString('en-NZ', { weekday: 'short', day: 'numeric', month: 'short' });
  return `${md}, ${time}`;
}

function AlarmRow({ a, onToggle, onEdit, onDelete, onSkip, onCopy, onTest }: { a: Alarm; onToggle: () => void; onEdit: () => void; onDelete: () => void; onSkip: () => void; onCopy: () => void; onTest: () => void }) {
  const color = A.core;
  const skipping = isSkipping(a);
  return (
    <View style={[s.row, { borderTopColor: color, flexDirection: 'column', alignItems: 'stretch' }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, opacity: a.enabled ? 1 : 0.6 }}>
      <Pressable onPress={onEdit} style={(st) => [{ flex: 1, minWidth: 0, borderRadius: R.sm }, smooth, hovered(st) && { backgroundColor: C.card2 }]}>
        <Row style={{ gap: 10 }}>
          <Text style={s.time}>{fmt12(a.alarm_time)}</Text>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.title} numberOfLines={1}>{a.label || 'Alarm'}</Text>
            <Text style={s.meta} numberOfLines={2}>{fmtWhen(a)}{skipping && a.skip_date ? ` · skipping ${dayText(a.skip_date)}` : ''}</Text>
          </View>
        </Row>
        <Row style={{ gap: 10, marginTop: 6 }}>
          <Ionicons name={a.sound ? 'volume-high-outline' : 'volume-mute-outline'} size={14} color={a.sound ? C.muted : C.faint} />
          {a.sound && <Text style={s.metaSmall}>{soundLabel(a.sound_id)}</Text>}
          <Ionicons name="phone-portrait-outline" size={14} color={a.vibrate ? C.muted : C.faint} />
          {a.vibrate && <Text style={s.metaSmall}>{VIBRATION_LABEL[a.vibration_pattern]}</Text>}
          <Text style={s.metaSmall}>· rings {a.repeat_count}×{a.snooze_minutes ? ` · snooze ${a.snooze_minutes} min` : ''}</Text>
        </Row>
      </Pressable>
      <AlarmSwitch on={a.enabled} onToggle={onToggle} />
      <Pressable onPress={onDelete} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Delete ${a.label || 'alarm'}`} style={(st) => [{ padding: 5, borderRadius: 999, marginLeft: 4 }, smooth, hovered(st) && { backgroundColor: A.over + '22' }]}>
        {(st: any) => <Ionicons name="trash-outline" size={16} color={hovered(st) ? A.over : C.faint} />}
      </Pressable>
      </View>
      <Row wrap style={{ gap: 6, marginTop: 10 }}>
        <Button small kind="secondary" icon={skipping ? 'arrow-undo' : 'play-skip-forward'} tint={A.cardio} title={skipping ? 'Undo skip' : 'Skip next'} onPress={onSkip} disabled={!a.enabled} />
        <Button small kind="secondary" icon="volume-high-outline" title="Test" onPress={onTest} />
        <Button small kind="secondary" icon="copy-outline" title="Copy" onPress={onCopy} />
      </Row>
    </View>
  );
}

const REPEATS: [AlarmRepeat, string][] = [['once', 'Once'], ['daily', 'Every day'], ['weekly', 'Certain days']];
const VIBRATIONS: [Exclude<AlarmVibration, 'none'>, string][] = [['short', 'Short pulse'], ['double', 'Double pulse'], ['long', 'Long buzz']];

/** Add or edit an alarm: a label, a time, once/daily/certain days, and sound and vibration you can each turn
 *  on or off, with its own repeat count, since the two are controlled independently. */
function AlarmForm({ initial, groups, defaultGroup, onCancel, onSave, onDelete }: { initial?: Alarm; groups: string[]; defaultGroup?: string; onCancel: () => void; onSave: (row: Omit<Alarm, 'id'>) => Promise<void>; onDelete?: () => void }) {
  const [label, setLabel] = useState(initial?.label ?? '');
  const [time, setTime] = useState(initial?.alarm_time ?? '07:00');
  const [repeat, setRepeat] = useState<AlarmRepeat>(initial?.repeat ?? 'once');
  const [days, setDays] = useState<number[]>(initial?.days ?? []);
  const [date, setDate] = useState(initial?.alarm_date ?? todayISO());
  const [calendar, setCalendar] = useState(false);
  const [sound, setSound] = useState(initial?.sound ?? true);
  const [soundId, setSoundId] = useState<string>(initial?.sound_id ?? 'default');
  const [playing, setPlaying] = useState<string | null>(null);
  useEffect(() => () => stopSound(), []);
  const [group, setGroup] = useState<string>(initial?.group_name ?? (defaultGroup && defaultGroup !== '__new__' ? defaultGroup : ''));
  const [newGroup, setNewGroup] = useState('');
  const [makingGroup, setMakingGroup] = useState(defaultGroup === '__new__');
  const [snooze, setSnooze] = useState<number | null>(initial?.snooze_minutes ?? null);
  const [customSnooze, setCustomSnooze] = useState(initial?.snooze_minutes && !SNOOZE_CHOICES.includes(initial.snooze_minutes) ? String(initial.snooze_minutes) : '');
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
    if (makingGroup && !newGroup.trim()) return setError('Type a name for the new group, or pick None.');
    setBusy(true);
    try {
      await onSave({
        label: label.trim().slice(0, 80), alarm_time: time, repeat,
        days: repeat === 'weekly' ? days : [], alarm_date: repeat === 'once' ? date : null,
        group_name: (makingGroup ? newGroup.trim().replace(/\s+/g, ' ').slice(0, 24) : group) || null, snooze_minutes: snooze, skip_date: initial?.skip_date ?? null,
        sound, sound_id: soundId, vibrate, vibration_pattern: pattern, repeat_count: repeatCount, enabled: initial?.enabled ?? true,
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
        <Chip label="Off" active={!sound} onPress={() => { setSound(false); stopSound(); setPlaying(null); }} />
      </Row>
      {sound && (
        <View style={{ gap: 6, marginTop: 4 }}>
          <Label>Pick a sound</Label>
          {ALARM_SOUNDS.map((snd) => {
            const on = soundId === snd.id;
            return (
              <View key={snd.id} style={[s.soundRow, on && { borderColor: A.core, backgroundColor: A.core + '14' }]}>
                <Pressable onPress={() => setSoundId(snd.id)} accessibilityRole="radio" accessibilityState={{ selected: on }} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <Ionicons name={on ? 'radio-button-on' : 'radio-button-off'} size={18} color={on ? A.core : C.faint} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={s.title} numberOfLines={1}>{snd.label}</Text>
                    <Text style={s.metaSmall} numberOfLines={1}>{snd.hint}</Text>
                  </View>
                </Pressable>
                {snd.file != null && (
                  <Pressable
                    onPress={() => { if (playing === snd.id) { stopSound(); setPlaying(null); } else { setSoundId(snd.id); playSound(snd.id); setPlaying(snd.id); setTimeout(() => setPlaying((p) => (p === snd.id ? null : p)), 4000); } }}
                    accessibilityRole="button" accessibilityLabel={`${playing === snd.id ? 'Stop' : 'Play'} ${snd.label}`} hitSlop={6}
                    style={(st) => [{ padding: 8, borderRadius: 999 }, smooth, hovered(st) && { backgroundColor: C.card2 }]}
                  >
                    <Ionicons name={playing === snd.id ? 'stop-circle-outline' : 'play-circle-outline'} size={26} color={playing === snd.id ? A.over : C.text} />
                  </Pressable>
                )}
              </View>
            );
          })}
          <Text style={s.metaSmall}>The sound plays in full when the alarm goes off. Picking a sound that is not the phone default needs the latest Forge app on Android; the web plays it while the page is open.</Text>
        </View>
      )}

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

      <Label>Snooze button</Label>
      <Row wrap style={{ gap: 6 }}>
        <Chip label="None" active={snooze == null} onPress={() => { setSnooze(null); setCustomSnooze(''); }} />
        {SNOOZE_CHOICES.map((m) => <Chip key={m} label={`${m} min`} active={snooze === m} onPress={() => { setSnooze(m); setCustomSnooze(''); }} />)}
        <Chip label="Your own" active={snooze != null && !SNOOZE_CHOICES.includes(snooze)} onPress={() => { const n = Number(customSnooze) || 7; setSnooze(n); setCustomSnooze(String(n)); }} />
      </Row>
      {snooze != null && !SNOOZE_CHOICES.includes(snooze) && (
        <Row style={{ gap: 8, alignItems: 'center' }}>
          <View style={{ width: 90 }}>
            <Input value={customSnooze} keyboardType="number-pad" accessibilityLabel="Snooze minutes"
              onChangeText={(t) => { const d = t.replace(/\D/g, '').slice(0, 3); setCustomSnooze(d); setSnooze(d ? Math.max(1, Math.min(120, Number(d))) : 1); }} />
          </View>
          <Text style={s.meta}>minutes (1 to 120)</Text>
        </Row>
      )}
      {snooze != null && <Text style={s.metaSmall}>The notification gets a Snooze button that rings it again after {snooze} min, and a Stop button.</Text>}

      <Label>Group (optional)</Label>
      <Row wrap style={{ gap: 6 }}>
        <Chip label="None" active={!makingGroup && !group} onPress={() => { setGroup(''); setMakingGroup(false); }} />
        {groups.map((g) => <Chip key={g} label={g} active={!makingGroup && group === g} onPress={() => { setGroup(g); setMakingGroup(false); }} />)}
        <Chip label="New group" active={makingGroup} onPress={() => setMakingGroup(true)} />
      </Row>
      {makingGroup && <Input value={newGroup} onChangeText={setNewGroup} placeholder="e.g. Wake Up, Gym, Study" accessibilityLabel="New group name" />}
      <Text style={s.metaSmall}>Alarms in a group can be skipped, turned off, tested or deleted together.</Text>

      <Label>Rings and buzzes this many times</Label>
      <Stepper value={repeatCount} onChange={(v) => setRepeatCount(Math.max(1, Math.min(MAX_ALARM_REPEATS, Math.round(v))))} />

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
  const [adding, setAdding] = useState<string | false>(false); // '' new on its own, a group name, or '__new__' for a new group
  const [error, setError] = useState<string | null>(null);

  const byTime = (list: Alarm[]) => [...list].sort((x, y) => x.alarm_time.localeCompare(y.alarm_time));
  const groupNames = [...new Set(alarms.map((a) => a.group_name).filter((g): g is string => !!g))].sort();
  const single = byTime(alarms.filter((a) => !a.group_name));
  const guard = (p: Promise<unknown>) => p.catch((e) => setError(/skip_date|snooze_minutes|group_name|column/i.test(e?.message ?? '') ? 'Run the v23 SQL in Supabase first (it adds the snooze, group and skip columns), then try again.' : e?.message ?? 'Could not save.'));

  const copy = (a: Alarm) => { const { id: _id, ...rest } = a; return guard(addAlarm({ ...rest, label: `${a.label || 'Alarm'} copy`, skip_date: null })); };
  const skip = (a: Alarm) => guard(updateAlarm(a.id, toggleSkipChanges(a)));
  async function removeAlarm(a: Alarm) {
    if (await confirm('Delete this alarm?', `${a.label || 'This alarm'} will be removed.`, { confirmText: 'Delete', danger: true })) { await deleteAlarm(a.id); setEditing(null); }
  }
  const skipGroup = (list: Alarm[]) => {
    const live = list.filter((a) => a.enabled);
    const allSkipping = live.length > 0 && live.every((a) => isSkipping(a));
    return guard(Promise.all(live.map((a) => (allSkipping ? updateAlarm(a.id, { skip_date: null }) : isSkipping(a) ? Promise.resolve() : updateAlarm(a.id, toggleSkipChanges(a))))));
  };
  const toggleGroup = (list: Alarm[]) => { const on = !list.some((a) => a.enabled); return guard(Promise.all(list.map((a) => updateAlarm(a.id, { enabled: on })))); };
  const testGroup = (list: Alarm[]) => byTime(list).forEach((a, i) => testAlarm(a, 3 + i * 4));
  async function removeGroup(name: string, list: Alarm[]) {
    if (await confirm(`Delete the ${name} group?`, `All ${list.length} alarms in it will be deleted.`, { confirmText: 'Delete all', danger: true })) await guard(Promise.all(list.map((a) => deleteAlarm(a.id))));
  }

  const renderAlarm = (a: Alarm) => (editing === a.id ? (
    <AlarmForm
      key={a.id} initial={a} groups={groupNames} onCancel={() => setEditing(null)}
      onDelete={() => removeAlarm(a)}
      onSave={async (row) => { await updateAlarm(a.id, row); setEditing(null); }}
    />
  ) : (
    <AlarmRow
      key={a.id} a={a} onEdit={() => setEditing(a.id)}
      onToggle={() => guard(updateAlarm(a.id, { enabled: !a.enabled }))}
      onDelete={() => removeAlarm(a)} onSkip={() => skip(a)} onCopy={() => copy(a)} onTest={() => testAlarm(a)}
    />
  ));

  return (
    <Screen>
      <Stack.Screen options={{ title: '' }} />
      <Eyebrow>Tracker</Eyebrow>
      <H1>Alarms</H1>
      <P muted style={{ fontSize: 13, lineHeight: 19 }}>
        Alarms are scheduled on your phone itself, a week ahead, so they ring even if you do not open Forge. They are not push notifications and nothing comes from a server. On Android they ring on the alarm volume, even on silent, but show as a notification you can swipe away. The Snooze and Stop buttons open Forge for a moment.
      </P>

      <BreakCard />
      {!!error && <Text style={{ color: C.danger, fontFamily: F.body, fontSize: 13 }}>{error}</Text>}

      {groupNames.map((g) => {
        const list = byTime(alarms.filter((a) => a.group_name === g));
        const anyOn = list.some((a) => a.enabled);
        const live = list.filter((a) => a.enabled);
        const allSkipping = live.length > 0 && live.every((a) => isSkipping(a));
        return (
          <Section key={g} title={g} icon="albums-outline" color={A.core} right={<Text style={s.meta}>{list.length} alarm{list.length === 1 ? '' : 's'}</Text>}>
            <Row wrap style={{ gap: 6, marginBottom: 10 }}>
              <Button small kind="secondary" icon={allSkipping ? 'arrow-undo' : 'play-skip-forward'} tint={A.cardio} title={allSkipping ? 'Undo skip for all' : 'Skip next for all'} onPress={() => skipGroup(list)} disabled={!anyOn} />
              <Button small kind="secondary" icon={anyOn ? 'notifications-off-outline' : 'notifications-outline'} title={anyOn ? 'Turn all off' : 'Turn all on'} onPress={() => toggleGroup(list)} />
              <Button small kind="secondary" icon="volume-high-outline" title="Test all" onPress={() => testGroup(list)} />
              <Button small kind="secondary" icon="add-circle-outline" title="Add to group" onPress={() => setAdding(g)} />
              <Button small kind="secondary" icon="trash-outline" tint={A.over} title="Delete group" onPress={() => removeGroup(g, list)} />
            </Row>
            <View>{list.map(renderAlarm)}</View>
            {adding === g && <AlarmForm groups={groupNames} defaultGroup={g} onCancel={() => setAdding(false)} onSave={async (row) => { await addAlarm(row); setAdding(false); }} />}
          </Section>
        );
      })}

      <Section title={groupNames.length ? 'Single alarms' : 'Your alarms'} icon="alarm" color={A.core} right={<Text style={s.meta}>{single.length || ''}</Text>}>
        <View>
          {single.map(renderAlarm)}
          {alarms.length === 0 && adding === false && <P muted style={{ fontSize: 13 }}>No alarms yet.</P>}
        </View>
        {adding === '' || adding === '__new__' ? (
          <AlarmForm groups={groupNames} defaultGroup={adding} onCancel={() => setAdding(false)} onSave={async (row) => { await addAlarm(row); setAdding(false); }} />
        ) : (
          <Row wrap style={{ gap: 8 }}>
            <Button kind="secondary" icon="add-circle-outline" tint={A.core} title="New alarm" onPress={() => setAdding('')} />
            <Button kind="secondary" icon="albums-outline" tint={A.core} title="New group, like Wake Up" onPress={() => setAdding('__new__')} />
          </Row>
        )}
      </Section>
    </Screen>
  );
}

const s = StyleSheet.create({
  meta: { color: C.muted, fontFamily: F.body, fontSize: 12 },
  metaSmall: { color: C.faint, fontFamily: F.body, fontSize: 11 },
  soundRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, paddingHorizontal: 10, borderRadius: R.md, borderWidth: 1, borderColor: C.border, backgroundColor: C.card },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, marginBottom: 10, backgroundColor: C.card, borderRadius: R.lg, borderWidth: 1, borderColor: C.border, borderTopWidth: 2 },
  editBox: { flexDirection: 'column', alignItems: 'stretch', gap: 2, paddingBottom: 14 },
  time: { color: C.text, fontFamily: F.display, fontSize: 20, letterSpacing: -0.4 },
  title: { color: C.text, fontFamily: F.bodySemi, fontSize: 14 },
  dateBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: C.borderStrong, borderRadius: R.sm, paddingHorizontal: 12, paddingVertical: 12, marginTop: 2 },
  dateBtnText: { color: C.text, fontFamily: F.bodyMed, fontSize: 14 },
  switchTrack: { width: 44, height: 26, borderRadius: 13, padding: 2, justifyContent: 'center' },
  switchKnob: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff' },
});
