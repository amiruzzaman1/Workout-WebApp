import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { allExercises, Exercise, groupOf, isAvailable, MUSCLE_GROUPS, titleCase } from '../lib/exercises';
import { useStore } from '../lib/store';
import { C, GROUP_COLORS } from '../lib/theme';
import { GroupIcon } from './GroupIcon';
import { ExerciseThumb } from './ExerciseAnimation';
import { AccentTile, hovered, Input, ListRow, Row, smooth } from './ui';
import { F } from '../lib/theme';

const LEVELS = ['beginner', 'intermediate', 'expert'] as const;

export function ExerciseList({ onPick, header, top }: { onPick: (e: Exercise) => void; header?: React.ReactElement; top?: boolean }) {
  const { equipment, customExercises } = useStore();
  const insets = useSafeAreaInsets();
  const [q, setQ] = useState('');
  const [group, setGroup] = useState<string | null>(null);
  const [onlyMine, setOnlyMine] = useState(true);
  const [beginnerOnly, setBeginnerOnly] = useState(false);
  const [includeStretch, setIncludeStretch] = useState(false);

  const list = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    const muscles = group ? MUSCLE_GROUPS[group] : null;
    return allExercises()
      .filter((e) => (includeStretch ? true : e.category !== 'stretching'))
      .filter((e) => (muscles ? e.primary.some((m) => muscles.includes(m)) : true))
      .filter((e) => (beginnerOnly ? e.level === 'beginner' : true))
      .filter((e) => (onlyMine ? isAvailable(e, equipment) : true))
      .filter((e) => words.every((w) => e.name.toLowerCase().includes(w)))
      .sort((a, b) => Number(!!b.custom) - Number(!!a.custom) || LEVELS.indexOf(a.level) - LEVELS.indexOf(b.level) || a.name.localeCompare(b.name));
    // customExercises in deps so new ones show up
  }, [q, group, onlyMine, beginnerOnly, includeStretch, equipment, customExercises]);

  return (
    <FlatList
      data={list}
      keyExtractor={(e) => e.id}
      initialNumToRender={20}
      style={{ flex: 1, backgroundColor: C.bg }}
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: top ? insets.top + 24 : 16, paddingBottom: 64, width: '100%', maxWidth: 720, alignSelf: 'center' }}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={
        <View style={{ gap: 22, marginBottom: 12 }}>
          {header}

          {/* search */}
          <View>
            <Ionicons name="search" size={18} color={C.muted} style={{ position: 'absolute', left: 13, top: 15, zIndex: 1 }} />
            <Input placeholder="Search exercises" value={q} onChangeText={setQ} style={{ paddingLeft: 40 }} accessibilityLabel="Search exercises" />
          </View>

          {/* muscle group */}
          <View style={f.section}>
            <Text style={f.label}>Muscle group</Text>
            <Row wrap>
              <AccentTile label="All" color={C.inverse} active={!group} onPress={() => setGroup(null)} />
              {Object.keys(MUSCLE_GROUPS).map((g) => (
                <AccentTile key={g} label={g} color={GROUP_COLORS[g]} active={group === g} onPress={() => setGroup(group === g ? null : g)} icon={<GroupIcon group={g} size={22} color={C.inverse} />} />
              ))}
            </Row>
          </View>

          {/* what to include */}
          <View style={f.section}>
            <Text style={f.label}>Show only</Text>
            <View style={f.toggles}>
              <Toggle label="My gym" on={onlyMine} onPress={() => setOnlyMine(!onlyMine)} />
              <Toggle label="Beginner" on={beginnerOnly} onPress={() => setBeginnerOnly(!beginnerOnly)} />
              <Toggle label="Include stretches" on={includeStretch} onPress={() => setIncludeStretch(!includeStretch)} />
            </View>
          </View>

          <Text style={f.count}>{list.length} exercises</Text>
        </View>
      }
      renderItem={({ item }) => (
        <ListRow
          accent={GROUP_COLORS[groupOf(item)]}
          onPress={() => onPick(item)}
          left={<ExerciseThumb exercise={item} />}
          title={item.name}
          subtitle={`${item.custom ? 'My exercise · ' : ''}${item.primary.map(titleCase).join(', ')} · ${titleCase(item.equipment)} · ${titleCase(item.level)}`}
          right={<Ionicons name="chevron-forward" size={18} color={C.muted} />}
        />
      )}
    />
  );
}

/** A checkbox style switch, so the on and off filters do not look like the muscle group chips above them. */
function Toggle({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="checkbox" accessibilityState={{ checked: on }} style={(p) => [f.toggle, smooth, hovered(p) && { backgroundColor: C.card2, borderColor: C.text }, on && f.toggleOn, p.pressed && { opacity: 0.7 }]}>
      <View style={[f.box, on && f.boxOn]}>{on && <Ionicons name="checkmark" size={14} color={C.inverseText} />}</View>
      <Text style={[f.toggleText, on && { color: C.text }]}>{label}</Text>
    </Pressable>
  );
}

const f = StyleSheet.create({
  section: { gap: 10, paddingTop: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border },
  label: { color: C.muted, fontFamily: F.bodySemi, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase' },
  toggles: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderColor: C.border, backgroundColor: C.card },
  toggleOn: { borderColor: C.borderStrong },
  box: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, borderColor: C.faint, alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: C.inverse, borderColor: C.inverse },
  toggleText: { color: C.muted, fontFamily: F.bodySemi, fontSize: 14 },
  count: { color: C.muted, fontFamily: F.body, fontSize: 13 },
});
