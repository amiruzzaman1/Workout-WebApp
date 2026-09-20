import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { ExerciseThumb } from '../../../src/components/ExerciseAnimation';
import { ExerciseList } from '../../../src/components/ExerciseList';
import { Button, Card, Input, Label, P, Row, Screen } from '../../../src/components/ui';
import { confirm } from '../../../src/lib/confirm';
import { Exercise, getExercise, titleCase } from '../../../src/lib/exercises';
import { alternativesFor, DAY_NAMES, PlanData, PlanItem, PlanSession, uid } from '../../../src/lib/planner';
import { useStore } from '../../../src/lib/store';
import { C } from '../../../src/lib/theme';

export default function SessionEditor() {
  const params = useLocalSearchParams<{ day: string; idx: string }>();
  const day = Number(params.day);
  const idx = Number(params.idx);
  const router = useRouter();
  const { plan, savePlan, equipment } = useStore();
  const [picker, setPicker] = useState<{ mode: 'add' } | { mode: 'swap'; uid: string } | null>(null);
  const [swapOpen, setSwapOpen] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const session = plan?.data.days.find((d) => d.day === day)?.sessions[idx];
  const [draft, setDraft] = useState<PlanSession | undefined>(session);
  useEffect(() => setDraft(session), [session]);

  if (!plan || !session || !draft) return <Screen><P>Session not found.</P></Screen>;

  async function commit(next: PlanSession) {
    setDraft(next);
    const data: PlanData = {
      ...plan!.data,
      days: plan!.data.days.map((d) => (d.day === day ? { ...d, sessions: d.sessions.map((s, i) => (i === idx ? next : s)) } : d)),
    };
    try { setErr(null); await savePlan(data); } catch (e: any) { setErr('Could not save: ' + e.message); }
  }

  const updateItem = (u: string, changes: Partial<PlanItem>, save = true) => {
    const next = { ...draft, items: draft.items.map((it) => (it.uid === u ? { ...it, ...changes } : it)) };
    if (save) commit(next); else setDraft(next);
  };
  const move = (i: number, dir: -1 | 1) => {
    const items = [...draft.items];
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    [items[i], items[j]] = [items[j], items[i]];
    commit({ ...draft, items });
  };
  const remove = (u: string) => commit({ ...draft, items: draft.items.filter((it) => it.uid !== u) });

  function onPicked(e: Exercise) {
    if (!picker) return;
    if (picker.mode === 'add') {
      commit({ ...draft!, items: [...draft!.items, { uid: uid(), exerciseId: e.id, sets: 3, reps: '10-12', restSec: 75 }] });
    } else {
      updateItem(picker.uid, { exerciseId: e.id });
    }
    setPicker(null);
    setSwapOpen(null);
  }

  async function deleteSession() {
    if (!(await confirm('Delete this session?', 'It will be removed from your weekly plan.'))) return;
    const data: PlanData = {
      ...plan!.data,
      days: plan!.data.days.map((d) => (d.day === day ? { ...d, sessions: d.sessions.filter((_, i) => i !== idx) } : d)),
    };
    await savePlan(data);
    router.back();
  }

  return (
    <>
      <Stack.Screen options={{ title: `${DAY_NAMES[day]}` }} />
      <Screen>
        <Label>Session name</Label>
        <Input value={draft.title} onChangeText={(t) => setDraft({ ...draft, title: t })} onBlur={() => commit(draft)} />
        {draft.warmup && <P muted style={{ fontSize: 14 }}>Warm-up: {draft.warmup}</P>}
        {err && <Text style={{ color: C.danger }}>{err}</Text>}

        {draft.items.map((it, i) => {
          const e = getExercise(it.exerciseId);
          const alts = swapOpen === it.uid ? alternativesFor(it, equipment) : [];
          return (
            <Card key={it.uid}>
              <Pressable onPress={() => e && router.push(`/exercise/${encodeURIComponent(e.id)}`)} style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                {e && <ExerciseThumb exercise={e} />}
                <View style={{ flex: 1 }}>
                  <Text style={{ color: C.text, fontWeight: '700', fontSize: 16 }}>{i + 1}. {e?.name ?? it.exerciseId} ›</Text>
                  <Text style={{ color: C.muted, fontSize: 13 }}>{e?.primary.map(titleCase).join(', ')} · tap for animation & how-to</Text>
                </View>
              </Pressable>

              <Row style={{ marginTop: 6 }}>
                <View style={{ flex: 1 }}>
                  <Label>Sets</Label>
                  <Input value={String(it.sets)} keyboardType="number-pad"
                    onChangeText={(t) => updateItem(it.uid, { sets: Number(t.replace(/\D/g, '')) || 0 }, false)}
                    onBlur={() => commit(draft)} />
                </View>
                <View style={{ flex: 2 }}>
                  <Label>Reps / time</Label>
                  <Input value={it.reps} onChangeText={(t) => updateItem(it.uid, { reps: t }, false)} onBlur={() => commit(draft)} />
                </View>
                <View style={{ flex: 1 }}>
                  <Label>Rest (s)</Label>
                  <Input value={String(it.restSec)} keyboardType="number-pad"
                    onChangeText={(t) => updateItem(it.uid, { restSec: Number(t.replace(/\D/g, '')) || 0 }, false)}
                    onBlur={() => commit(draft)} />
                </View>
              </Row>
              {it.note && <P muted style={{ fontSize: 13 }}>{it.note}</P>}

              <Row wrap style={{ marginTop: 6 }}>
                <Button small kind="secondary" title="↑" onPress={() => move(i, -1)} />
                <Button small kind="secondary" title="↓" onPress={() => move(i, 1)} />
                <Button small kind="secondary" title={swapOpen === it.uid ? 'Close' : 'Swap'} onPress={() => setSwapOpen(swapOpen === it.uid ? null : it.uid)} />
                <Button small kind="danger" title="Remove" onPress={() => remove(it.uid)} />
              </Row>

              {swapOpen === it.uid && (
                <View style={{ gap: 6, marginTop: 6 }}>
                  {alts.length > 0 && <Label>Similar exercises</Label>}
                  {alts.map((id) => {
                    const a = getExercise(id)!;
                    return (
                      <Pressable key={id} onPress={() => { updateItem(it.uid, { exerciseId: id }); setSwapOpen(null); }}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8, borderRadius: 10, backgroundColor: C.card2 }}>
                        <ExerciseThumb exercise={a} size={40} />
                        <Text style={{ color: C.text, flex: 1 }}>{a.name}</Text>
                      </Pressable>
                    );
                  })}
                  <Button small kind="secondary" title="Choose any exercise…" onPress={() => setPicker({ mode: 'swap', uid: it.uid })} />
                </View>
              )}
            </Card>
          );
        })}

        <Button title="+ Add exercise" onPress={() => setPicker({ mode: 'add' })} />
        <Button kind="danger" title="Delete this session" onPress={deleteSession} />
      </Screen>

      <Modal visible={!!picker} animationType="slide" onRequestClose={() => setPicker(null)}>
        <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: 12 }}>
          <Row style={{ paddingHorizontal: 16, justifyContent: 'space-between', width: '100%', maxWidth: 760, alignSelf: 'center' }}>
            <Text style={{ color: C.text, fontSize: 18, fontWeight: '700' }}>{picker?.mode === 'add' ? 'Add exercise' : 'Swap exercise'}</Text>
            <Button small kind="secondary" title="Cancel" onPress={() => setPicker(null)} />
          </Row>
          <ExerciseList onPick={onPicked} />
        </View>
      </Modal>
    </>
  );
}
