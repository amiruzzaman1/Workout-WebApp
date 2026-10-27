import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getExercise, groupOf } from '../lib/exercises';
import { groupColor } from '../lib/groups';
import { METRIC_SHORT, metricFor, PlanSession } from '../lib/planner';
import { A, C, F, R } from '../lib/theme';
import { ExerciseThumb } from './ExerciseAnimation';
import { GymCaption, GymThumb } from './GymPhoto';
import { Button, Eyebrow, H1, hovered, Row, smooth } from './ui';

/**
 * Everything in a workout, laid out before you start: the warm up, then the working exercises, each with its
 * demo, your photo of the machine it is done on, and the sets and reps. Tap an exercise to read how it is done.
 */
export function SessionPreview({ session, visible, onClose, onOpenExercise, onStart, startLabel }: {
  session: PlanSession | null; visible: boolean; onClose: () => void; onOpenExercise: (id: string) => void; onStart: () => void; startLabel: string;
}) {
  const insets = useSafeAreaInsets();
  if (!session) return null;
  const warm = session.items.filter((i) => i.phase === 'warmup');
  const main = session.items.filter((i) => i.phase !== 'warmup');
  const row = (it: PlanSession['items'][number], i: number) => {
    const e = getExercise(it.exerciseId);
    if (!e) return null;
    const metric = it.metric ?? metricFor(it.exerciseId);
    return (
      <Pressable key={it.uid} onPress={() => onOpenExercise(e.id)} accessibilityRole="button" accessibilityLabel={`How to do ${e.name}`}
        style={(p) => [{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: C.border, borderRadius: R.sm }, smooth, hovered(p) && { backgroundColor: C.card }]}>
        <Text style={{ width: 20, color: C.faint, fontFamily: F.displayMed, fontSize: 13, textAlign: 'center' }}>{i + 1}</Text>
        <ExerciseThumb exercise={e} size={52} />
        <GymThumb exercise={e} size={52} />
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Text style={{ color: groupColor(groupOf(e)), fontFamily: F.displayMed, fontSize: 11, letterSpacing: 1 }}>{groupOf(e).toUpperCase()}</Text>
          <Text style={{ color: C.text, fontFamily: F.bodySemi, fontSize: 15 }} numberOfLines={2}>{e.name}</Text>
          <Text style={{ color: C.muted, fontFamily: F.body, fontSize: 12 }} numberOfLines={1}>
            {it.sets} × {it.reps} {METRIC_SHORT[metric]}{it.restSec ? ` · rest ${it.restSec}s` : ''}
          </Text>
          <GymCaption exercise={e} />
        </View>
      </Pressable>
    );
  };
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top + 8 }}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 110, width: '100%', maxWidth: 720, alignSelf: 'center', gap: 4 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Eyebrow>Today's workout</Eyebrow>
            <Button small kind="secondary" icon="close" title="Close" onPress={onClose} />
          </Row>
          <H1>{session.title}</H1>
          <Text style={{ color: C.muted, fontFamily: F.body, fontSize: 13, marginBottom: 6 }}>
            {main.length} exercises, {main.reduce((a, it) => a + (it.sets || 0), 0)} sets. The first photo is your gym's machine for it, so you know where to go.
          </Text>
          {warm.length > 0 && (
            <>
              <Text style={{ color: A.cardio, fontFamily: F.bodySemi, fontSize: 11, letterSpacing: 1.4, marginTop: 14 }}>WARM UP</Text>
              {warm.map(row)}
            </>
          )}
          <Text style={{ color: A.fat, fontFamily: F.bodySemi, fontSize: 11, letterSpacing: 1.4, marginTop: 18 }}>WORKING SETS</Text>
          {main.map(row)}
        </ScrollView>
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, paddingBottom: insets.bottom + 16, backgroundColor: C.bg, borderTopWidth: 0.5, borderTopColor: C.border }}>
          <Button icon="play" title={startLabel} onPress={onStart} />
        </View>
      </View>
    </Modal>
  );
}
