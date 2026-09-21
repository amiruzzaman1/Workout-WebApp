import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import data from '../data/groupIcons.json';

type Part =
  | { t: 'fill'; d: string }
  | { t: 'line'; d: string; w: number }
  | { t: 'cut'; d: string; w: number }
  | { t: 'circle'; cx: number; cy: number; r: number }
  | { t: 'rect'; x: number; y: number; w: number; h: number; rx: number };

const ICONS = data.icons as unknown as Record<string, Part[]>;

/**
 * A bold brush stroke icon for each muscle group, drawn to fill its box: hooked chest arcs, the V of the back with the
 * spine, the shoulder sweep, a six pack, a leg. The shapes live in src/data/groupIcons.json (Arms uses a flexed arm).
 * `cut` is the colour of the thin lines cut out of a shape (the heartbeat), which should match what sits behind it.
 */
export function GroupIcon({ group, size = 24, color, cut = '#000000' }: { group: string; size?: number; color: string; cut?: string }) {
  if (group === 'Arms') return <MaterialCommunityIcons name="arm-flex" size={size + 2} color={color} />;
  const parts = ICONS[group];
  if (!parts) return <Ionicons name="body" size={size} color={color} />;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {parts.map((p, i) => {
        if (p.t === 'fill') return <Path key={i} d={p.d} fill={color} />;
        if (p.t === 'circle') return <Circle key={i} cx={p.cx} cy={p.cy} r={p.r} fill={color} />;
        if (p.t === 'rect') return <Rect key={i} x={p.x} y={p.y} width={p.w} height={p.h} rx={p.rx} fill={color} />;
        return <Path key={i} d={p.d} stroke={p.t === 'cut' ? cut : color} strokeWidth={p.w} strokeLinecap="round" strokeLinejoin="round" fill="none" />;
      })}
    </Svg>
  );
}
