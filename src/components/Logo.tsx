import { View } from 'react-native';
import { C } from '../lib/theme';

/** The Forge logo: a barbell drawn from plain Views. The app icon files are drawn to match. */
export function Logo({ size = 26 }: { size?: number }) {
  const u = size / 26;
  const plate = (h: number) => <View style={{ width: 4 * u, height: h * u, borderRadius: 1.5 * u, backgroundColor: C.inverse }} />;
  return (
    <View style={{ width: size, height: size, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 1.5 * u }}>
      {plate(12)}
      {plate(20)}
      <View style={{ width: 6 * u, height: 3 * u, backgroundColor: C.inverse }} />
      {plate(20)}
      {plate(12)}
    </View>
  );
}
