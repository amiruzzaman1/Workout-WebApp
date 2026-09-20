import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { ExerciseList } from '../../src/components/ExerciseList';
import { Button, Eyebrow, H1, Row } from '../../src/components/ui';

export default function Library() {
  const router = useRouter();
  return (
    <ExerciseList
      top
      onPick={(e) => router.push(`/exercise/${encodeURIComponent(e.id)}`)}
      header={
        <View style={{ gap: 6, marginBottom: 6 }}>
          <Eyebrow>Library</Eyebrow>
          <Row style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <H1>Exercises</H1>
            <Row>
              <Button kind="secondary" small title="Machines" onPress={() => router.push('/machines')} />
              <Button kind="secondary" small title="+ New" onPress={() => router.push('/custom-exercise')} />
            </Row>
          </Row>
        </View>
      }
    />
  );
}
