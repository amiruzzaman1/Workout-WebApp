import { SleepCard, TimeTrackerCard } from '../../src/components/DayTrackers';
import { H1, P, Screen } from '../../src/components/ui';
import { useStore } from '../../src/lib/store';

export default function TimeScreen() {
  const { date } = useStore();
  return (
    <Screen>
      <H1>Tracker</H1>
      <P muted>Start a timer for study, work or a project. It keeps counting until you press Stop.</P>
      <TimeTrackerCard date={date} />
      <SleepCard date={date} />
    </Screen>
  );
}
