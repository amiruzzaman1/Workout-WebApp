import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { dayLabel } from '../../../src/components/AppHeader';
import { catColor, useTimeCategories } from '../../../src/components/DayTrackers';
import { Button, Chip, Eyebrow, H1, hovered, HoverTip, Input, Label, P, Row, Screen, Section, smooth } from '../../../src/components/ui';
import { confirm } from '../../../src/lib/confirm';
import { useStore } from '../../../src/lib/store';
import { A, C, F, R } from '../../../src/lib/theme';
import { fmtMinutes, TaskItem } from '../../../src/lib/tracker';

const key = (t: string) => t.trim().toLowerCase().replace(/\s+/g, ' ');

/**
 * A tick box like Google Keep's: the box fills and a tick pops in, and a line is drawn through the middle of the
 * task while its words fade. Nothing is removed, so the task stays on the page, struck through, until you untick it.
 */
function TaskRow({ task, tracked, color, onToggle, onEdit, onDelete }: { task: TaskItem; tracked: number; color: string; onToggle: () => void; onEdit: () => void; onDelete: () => void }) {
  const p = useRef(new Animated.Value(task.done ? 1 : 0)).current;
  const still = useRef(false);
  useEffect(() => { AccessibilityInfo.isReduceMotionEnabled?.().then((v) => { still.current = v; }).catch(() => {}); }, []);
  useEffect(() => {
    Animated.timing(p, { toValue: task.done ? 1 : 0, duration: still.current ? 0 : task.done ? 380 : 220, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [task.done]);

  const fill = p.interpolate({ inputRange: [0, 1], outputRange: [color + '00', color] });
  const text = p.interpolate({ inputRange: [0, 1], outputRange: [C.text, C.faint] });
  const line = p.interpolate({ inputRange: [0, 0.35, 1], outputRange: ['0%', '0%', '100%'] });
  const pop = p.interpolate({ inputRange: [0, 0.5, 0.75, 1], outputRange: [0, 0, 1.25, 1] });

  return (
    <View style={[s.row, { borderTopColor: color }]}>
      <Pressable onPress={onToggle} hitSlop={8} accessibilityRole="checkbox" accessibilityState={{ checked: task.done }} accessibilityLabel={task.title} style={(st) => [s.hit, smooth, hovered(st) && { backgroundColor: color + '22' }]}>
        <Animated.View style={[s.box, { borderColor: task.done ? color : C.faint, backgroundColor: fill }]}>
          <Animated.View style={{ transform: [{ scale: pop }] }}>
            <Ionicons name="checkmark" size={16} color={C.inverseText} />
          </Animated.View>
        </Animated.View>
      </Pressable>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ alignSelf: 'flex-start', maxWidth: '100%' }}>
          <Animated.Text style={[s.title, { color: text }]} numberOfLines={2}>{task.title}</Animated.Text>
          <Animated.View pointerEvents="none" style={[s.strike, { width: line }]} />
        </View>
        <Text style={s.meta} numberOfLines={1}>
          {task.category ?? 'Other'}
          {task.target_minutes ? ` · target ${fmtMinutes(task.target_minutes)}` : ''}
          {tracked > 0 ? ` · tracked ${fmtMinutes(tracked)}` : ''}
        </Text>
      </View>
      <Pressable onPress={onEdit} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Edit ${task.title}`} style={(st) => [{ padding: 5, borderRadius: 999 }, smooth, hovered(st) && { backgroundColor: color + '22' }]}>
        {(st: any) => <Ionicons name="create-outline" size={17} color={hovered(st) ? color : C.faint} />}
      </Pressable>
      <Pressable onPress={onDelete} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Delete ${task.title}`} style={(st) => [{ padding: 5, borderRadius: 999 }, smooth, hovered(st) && { backgroundColor: A.over + '22' }]}>
        {(st: any) => <Ionicons name="trash-outline" size={16} color={hovered(st) ? A.over : C.faint} />}
      </Pressable>
    </View>
  );
}

/** Change a task's name, category or target time in place. */
function EditTask({ task, categories, others, onCancel, onSave, onDelete }: { task: TaskItem; categories: string[]; others: TaskItem[]; onCancel: () => void; onSave: (ch: Partial<TaskItem>) => Promise<void>; onDelete: () => void }) {
  const [title, setTitle] = useState(task.title);
  const [cat, setCat] = useState<string | null>(task.category ?? null);
  const [target, setTarget] = useState(task.target_minutes ? String(task.target_minutes) : '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function save() {
    const name = title.trim().replace(/\s+/g, ' ');
    if (!name) return setError('Type the task first.');
    if (others.some((t) => t.id !== task.id && key(t.title) === key(name))) return setError('That task is already on this day.');
    setBusy(true);
    try {
      await onSave({ title: name.slice(0, 80), category: cat, target_minutes: Math.round(Number(target.replace(',', '.'))) || null });
    } catch (e: any) {
      setError(e?.message ?? 'Could not save. Check your connection and try again.');
      setBusy(false);
    }
  }
  return (
    <View style={[s.row, s.editBox, { borderTopColor: catColor(cat) }]}>
      <Label>Task</Label>
      <Input value={title} onChangeText={setTitle} onSubmitEditing={save} accessibilityLabel="Task name" />
      <Label>Category</Label>
      <Row wrap style={{ gap: 6 }}>
        {categories.map((c) => <Chip key={c} label={c} dot={catColor(c)} active={cat === c} onPress={() => setCat(cat === c ? null : c)} />)}
      </Row>
      <Label>Target time in minutes (optional)</Label>
      <Input value={target} onChangeText={(t) => setTarget(t.replace(/[^0-9]/g, ''))} keyboardType="number-pad" accessibilityLabel="Target minutes" />
      {!!error && <Text style={{ color: C.danger, fontFamily: F.body, fontSize: 13, marginTop: 6 }}>{error}</Text>}
      <Row style={{ gap: 8, marginTop: 12 }}>
        <Button small icon="checkmark" title="Save" onPress={save} loading={busy} />
        <Button small kind="secondary" title="Cancel" onPress={onCancel} />
        <View style={{ flex: 1 }} />
        <Button small kind="secondary" icon="trash-outline" tint={A.over} title="Delete" onPress={onDelete} />
      </Row>
    </View>
  );
}

/** Plan tasks for the day picked at the top. They show up as suggestions in the time tracker while you type. */
export default function Tasks() {
  const { date, tasks, activities, addTask, updateTask, deleteTask } = useStore();
  const { categories } = useTimeCategories();
  const [title, setTitle] = useState('');
  const [cat, setCat] = useState<string | null>(null);
  const [target, setTarget] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);

  const day = tasks.filter((t) => t.day === date);
  const done = day.filter((t) => t.done).length;
  const trackedFor = (t: TaskItem) => activities.filter((a) => a.day === date && key(a.title) === key(t.title)).reduce((n, a) => n + (a.minutes ?? 0), 0);

  async function add() {
    setError(null);
    const name = title.trim().replace(/\s+/g, ' ');
    if (!name) return setError('Type the task first.');
    if (day.some((t) => key(t.title) === key(name))) return setError('That task is already on this day.');
    setBusy(true);
    try {
      const m = Math.round(Number(target.replace(',', '.'))) || null;
      await addTask({ day: date, title: name.slice(0, 80), category: cat, target_minutes: m });
      setTitle(''); setTarget('');
    } catch (e: any) {
      setError(e?.message ?? 'Could not save. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  const toggle = (t: TaskItem) => updateTask(t.id, { done: !t.done, done_at: t.done ? null : new Date().toISOString() }).catch((e) => setError(e?.message ?? 'Could not save.'));
  const remove = async (t: TaskItem) => {
    if (await confirm('Delete this task?', `${t.title} will be removed from ${dayLabel(date)}.`, { confirmText: 'Delete', danger: true })) await deleteTask(t.id);
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: '' }} />
      <Eyebrow>{dayLabel(date)} · Tracker</Eyebrow>
      <H1>Tasks</H1>
      <P muted style={{ fontSize: 13, lineHeight: 19 }}>Plan what you want to get done. Pick another day at the top to plan ahead. These show up as suggestions when you start the time tracker.</P>

      <View style={s.form}>
        <Label>New task</Label>
        <Input value={title} onChangeText={setTitle} placeholder="e.g. Finish chapter 3" onSubmitEditing={add} returnKeyType="done" accessibilityLabel="New task" />
        <Label>Category (optional)</Label>
        <Row wrap style={{ gap: 6 }}>
          {categories.map((c) => <Chip key={c} label={c} dot={catColor(c)} active={cat === c} onPress={() => setCat(cat === c ? null : c)} />)}
        </Row>
        <Label>Target time in minutes (optional)</Label>
        <Input value={target} onChangeText={(t) => setTarget(t.replace(/[^0-9]/g, ''))} keyboardType="number-pad" placeholder="e.g. 90" />
        {!!error && <Text style={{ color: C.danger, fontFamily: F.body, fontSize: 13, marginTop: 6 }}>{error}</Text>}
        <Button icon="add" title="Add task" onPress={add} loading={busy} style={{ marginTop: 14 }} />
      </View>

      <Section
        title={dayLabel(date)} icon="checkbox-outline" color={A.core}
        right={<Text style={s.meta}>{day.length ? `${done} of ${day.length} done` : 'no tasks yet'}</Text>}
      >
        {day.length > 0 && (
          <HoverTip align="start" lines={[`${done} of ${day.length} tasks done`, `${Math.round((done / day.length) * 100)}% of the day's tasks`]}>
            <View style={s.track}><View style={[s.fill, { width: `${(done / day.length) * 100}%` }]} /></View>
          </HoverTip>
        )}
        <View>
          {day.map((t) => (
            editing === t.id ? (
              <EditTask key={t.id} task={t} categories={categories} others={day} onCancel={() => setEditing(null)} onDelete={() => remove(t).then(() => setEditing(null))} onSave={async (ch) => { await updateTask(t.id, ch); setEditing(null); }} />
            ) : (
              <TaskRow key={t.id} task={t} tracked={trackedFor(t)} color={catColor(t.category)} onToggle={() => toggle(t)} onEdit={() => setEditing(t.id)} onDelete={() => remove(t)} />
            )
          ))}
          {day.length === 0 && <P muted style={{ fontSize: 13 }}>Nothing planned for this day yet.</P>}
        </View>
      </Section>
    </Screen>
  );
}

const s = StyleSheet.create({
  form: { backgroundColor: C.card, borderWidth: 1, borderColor: C.borderStrong, borderRadius: R.lg, padding: 16, gap: 2, marginTop: 8 },
  meta: { color: C.muted, fontFamily: F.body, fontSize: 12 },
  track: { height: 4, borderRadius: 2, backgroundColor: C.borderStrong, overflow: 'hidden' },
  fill: { height: 4, borderRadius: 2, backgroundColor: A.up },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, marginBottom: 10, backgroundColor: C.card, borderRadius: R.lg, borderWidth: 1, borderColor: C.border, borderTopWidth: 2 },
  editBox: { flexDirection: 'column', alignItems: 'stretch', gap: 2, paddingBottom: 14 },
  hit: { padding: 4, borderRadius: 999 },
  box: { width: 24, height: 24, borderRadius: 7, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: F.bodySemi, fontSize: 15 },
  strike: { position: 'absolute', left: 0, top: '50%', height: 2, marginTop: -1, borderRadius: 1, backgroundColor: C.muted },
});
