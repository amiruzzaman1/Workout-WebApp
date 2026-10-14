import { useRouter } from 'expo-router';
import { SleepCard, TimeTrackerCard } from '../../../src/components/DayTrackers';
import { Button, H1, P, Screen } from '../../../src/components/ui';
import { ALL_TASK_IDS } from '../../../src/data/careerPlan';
import { isOwner } from '../../../src/lib/owner';
import { useStore } from '../../../src/lib/store';
import { A } from '../../../src/lib/theme';

export default function TimeScreen() {
  const { date, tasks, alarms, careerDone, session } = useStore();
  const router = useRouter();
  const careerCount = ALL_TASK_IDS.filter((id) => careerDone[id]).length;
  const day = tasks.filter((t) => t.day === date);
  const left = day.filter((t) => !t.done).length;
  return (
    <Screen>
      <H1>Tracker</H1>
      <P muted>Start a timer for study, work or a project. It keeps counting until you press Stop.</P>
      <Button
        kind="secondary" icon="checkbox-outline" tint={A.core}
        title={day.length ? `Tasks: ${left} to do, ${day.length - left} done` : 'Plan tasks for this day'}
        onPress={() => router.push('/tracker/tasks')}
      />
      <Button
        kind="secondary" icon="alarm-outline" tint={A.core}
        title={alarms.length ? `Alarms: ${alarms.filter((a) => a.enabled).length} on` : 'Set up an alarm'}
        onPress={() => router.push('/tracker/alarms')}
      />
      {isOwner(session) && (
        <Button
          kind="secondary" icon="briefcase-outline" tint={A.protein}
          title={careerCount ? `Career plan: ${Math.round((careerCount / ALL_TASK_IDS.length) * 100)}% done` : 'Career plan'}
          onPress={() => router.push('/tracker/career')}
        />
      )}
      <TimeTrackerCard date={date} />
      <SleepCard date={date} />
    </Screen>
  );
}
