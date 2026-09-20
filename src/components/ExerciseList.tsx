import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { allExercises, Exercise, isAvailable, MUSCLE_GROUPS, titleCase } from '../lib/exercises';
import { useStore } from '../lib/store';
import { C } from '../lib/theme';
import { ExerciseThumb } from './ExerciseAnimation';
import { Chip, Input, Row } from './ui';

const LEVELS = ['beginner', 'intermediate', 'expert'] as const;

export function ExerciseList({ onPick, header }: { onPick: (e: Exercise) => void; header?: React.ReactElement }) {
  const { equipment, customExercises } = useStore();
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
      contentContainerStyle={{ padding: 16, gap: 8, width: '100%', maxWidth: 760, alignSelf: 'center' }}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={
        <View style={{ gap: 10, marginBottom: 6 }}>
          {header}
          <Input placeholder="Search exercises…" value={q} onChangeText={setQ} />
          <Row wrap>
            <Chip label="All" active={!group} onPress={() => setGroup(null)} />
            {Object.keys(MUSCLE_GROUPS).map((g) => (
              <Chip key={g} label={g} active={group === g} onPress={() => setGroup(group === g ? null : g)} />
            ))}
          </Row>
          <Row wrap>
            <Chip label="✓ My gym only" active={onlyMine} onPress={() => setOnlyMine(!onlyMine)} />
            <Chip label="Beginner" active={beginnerOnly} onPress={() => setBeginnerOnly(!beginnerOnly)} />
            <Chip label="Stretches" active={includeStretch} onPress={() => setIncludeStretch(!includeStretch)} />
          </Row>
          <Text style={{ color: C.muted }}>{list.length} exercises</Text>
        </View>
      }
      renderItem={({ item }) => (
        <Pressable
          onPress={() => onPick(item)}
          style={({ pressed }) => ({
            flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 12,
            backgroundColor: pressed ? C.card2 : C.card, borderWidth: 1, borderColor: C.border,
          })}
        >
          <ExerciseThumb exercise={item} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: C.text, fontWeight: '700', fontSize: 15 }}>{item.name}</Text>
            <Text style={{ color: C.muted, fontSize: 13 }}>
              {item.custom ? 'My exercise · ' : ''}
              {item.primary.map(titleCase).join(', ')} · {titleCase(item.equipment)} · {titleCase(item.level)}
            </Text>
          </View>
        </Pressable>
      )}
    />
  );
}
