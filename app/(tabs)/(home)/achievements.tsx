import { Stack } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useXpInput } from '../../../src/components/QuestsCard';
import { Eyebrow, H1, P, Screen } from '../../../src/components/ui';
import { useStore } from '../../../src/lib/store';
import { loggedDaySet } from '../../../src/lib/streak';
import { A, C, F, R } from '../../../src/lib/theme';
import { achievementsFor, levelInfo, totalXp } from '../../../src/lib/xp';

export default function Achievements() {
  const input = useXpInput();
  const { total } = useMemo(() => totalXp(input), [input]);
  const days = useMemo(() => loggedDaySet({ foodEntries: input.foodEntries, logs: input.logs, weights: input.weights, sleep: input.sleep }), [input]);
  const list = useMemo(() => achievementsFor(input, days), [input, days]);
  const lvl = levelInfo(total);
  const done = list.filter((a) => a.done).length;
  useStore();
  return (
    <Screen>
      <Stack.Screen options={{ title: '' }} />
      <Eyebrow>Level {lvl.level} · {lvl.title}</Eyebrow>
      <H1>Badges</H1>
      <P muted style={{ fontSize: 13 }}>{done} of {list.length} unlocked. {total} XP in total. Badges come from what you really log, so there is nothing to claim and nothing to cheat.</P>
      <View style={{ gap: 8, marginTop: 8 }}>
        {[...list].sort((a, b) => Number(b.done) - Number(a.done)).map((a) => (
          <View key={a.id} style={[s.row, a.done && { borderColor: A.carbs }]}>
            <Text style={[s.emoji, !a.done && { opacity: 0.3 }]}>{a.emoji}</Text>
            <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
              <Text style={[s.title, !a.done && { color: C.muted }]}>{a.title}</Text>
              <Text style={s.desc}>{a.desc}</Text>
              {!a.done && (
                <View style={s.track}><View style={[s.fill, { width: `${(a.have / a.need) * 100}%` }]} /></View>
              )}
            </View>
            <Text style={[s.count, a.done && { color: A.up }]}>{a.done ? 'Done' : `${a.have}/${a.need}`}</Text>
          </View>
        ))}
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: R.lg, padding: 12 },
  emoji: { fontSize: 28 },
  title: { color: C.text, fontFamily: F.bodySemi, fontSize: 15 },
  desc: { color: C.muted, fontFamily: F.body, fontSize: 12 },
  track: { height: 4, borderRadius: 2, backgroundColor: C.border, overflow: 'hidden' },
  fill: { height: 4, backgroundColor: A.carbs },
  count: { color: C.muted, fontFamily: F.displayMed, fontSize: 13 },
});
