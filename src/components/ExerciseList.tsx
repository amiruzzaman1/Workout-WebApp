import React, { useMemo, useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { allExercises, Exercise, groupOf, isAvailable, MUSCLE_GROUPS, titleCase } from '../lib/exercises';
import { useStore } from '../lib/store';
import { C, GROUP_COLORS } from '../lib/theme';
import { ExerciseThumb } from './ExerciseAnimation';
import { Chip, Input, ListRow, Row } from './ui';
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
        <View style={{ gap: 12, marginBottom: 8 }}>
          {header}
          <Input placeholder="Search exercises…" value={q} onChangeText={setQ} />
          <Row wrap>
            <Chip label="All" active={!group} onPress={() => setGroup(null)} />
            {Object.keys(MUSCLE_GROUPS).map((g) => (
              <Chip key={g} label={g} active={group === g} onPress={() => setGroup(group === g ? null : g)} dot={GROUP_COLORS[g]} />
            ))}
          </Row>
          <Row wrap>
            <Chip label="My gym only" active={onlyMine} onPress={() => setOnlyMine(!onlyMine)} />
            <Chip label="Beginner" active={beginnerOnly} onPress={() => setBeginnerOnly(!beginnerOnly)} />
            <Chip label="Stretches" active={includeStretch} onPress={() => setIncludeStretch(!includeStretch)} />
          </Row>
          <Text style={{ color: C.muted, fontFamily: F.body, fontSize: 13, marginTop: 4 }}>{list.length} exercises</Text>
        </View>
      }
      renderItem={({ item }) => (
        <ListRow
          accent={GROUP_COLORS[groupOf(item)]}
          onPress={() => onPick(item)}
          left={<ExerciseThumb exercise={item} />}
          title={item.name}
          subtitle={`${item.custom ? 'My exercise · ' : ''}${item.primary.map(titleCase).join(', ')} · ${titleCase(item.equipment)} · ${titleCase(item.level)}`}
          right={<Text style={{ color: C.faint, fontSize: 18 }}>›</Text>}
        />
      )}
    />
  );
}
