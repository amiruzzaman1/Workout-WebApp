// Turning a session's focus into the app's display groups and colours.
import { GROUP_COLORS } from './theme';

const FOCUS_TO_GROUP: Record<string, string> = {
  chest: 'Chest',
  back: 'Back',
  shoulders: 'Shoulders',
  biceps: 'Arms',
  triceps: 'Arms',
  quads: 'Legs',
  hamstrings: 'Legs',
  glutes: 'Legs',
  calves: 'Legs',
  core: 'Core',
  cardio: 'Cardio',
};

export function sessionGroups(focus: string[]): string[] {
  const out: string[] = [];
  for (const f of focus) {
    const g = FOCUS_TO_GROUP[f];
    if (g && !out.includes(g)) out.push(g);
  }
  return out;
}

export function groupColor(group: string) {
  return GROUP_COLORS[group] ?? '#8a8a8a';
}

/** One colour for a whole session. Full-body days stay white. */
export function sessionColor(focus: string[]) {
  const g = sessionGroups(focus);
  if (g.length === 0) return '#8a8a8a';
  if (g.length >= 4) return '#f5f5f5';
  return groupColor(g[0]);
}
