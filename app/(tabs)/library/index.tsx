import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { ExerciseList } from '../../../src/components/ExerciseList';
import { Button, Eyebrow, H1, Row } from '../../../src/components/ui';
import { A } from '../../../src/lib/theme';

export default function Library() {
  const router = useRouter();
  return (
    <ExerciseList
      onPick={(e) => router.push(`/library/exercise/${encodeURIComponent(e.id)}`)}
      header={
        <View style={{ gap: 6, marginBottom: 6 }}>
          <Eyebrow>Library</Eyebrow>
          <Row wrap style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <H1>Exercises</H1>
            <Row>
              <Button kind="secondary" small icon="hardware-chip-outline" tint={A.fat} title="Machines" onPress={() => router.push('/library/machines')} />
              <Button kind="secondary" small icon="add" tint={A.up} title="New" onPress={() => router.push('/library/custom-exercise')} />
            </Row>
          </Row>
        </View>
      }
    />
  );
}
