import { useRouter } from 'expo-router';
import { ExerciseList } from '../../src/components/ExerciseList';
import { Button } from '../../src/components/ui';

export default function Library() {
  const router = useRouter();
  return (
    <ExerciseList
      onPick={(e) => router.push(`/exercise/${encodeURIComponent(e.id)}`)}
      header={<Button kind="secondary" small title="+ Add my own exercise" onPress={() => router.push('/custom-exercise')} />}
    />
  );
}
