import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';
import type { checkPassword } from '../lib/password';
import { A, C, F } from '../lib/theme';

const STRENGTH_COLOR: Record<string, string> = { Weak: A.over, Fair: A.carbs, Good: A.protein, Strong: A.up };

/**
 * A strength meter and the list of rules, ticked off live as you type a new password. Used wherever a new password
 * is chosen: creating an account, choosing one after a reset link, and changing it on the User page.
 */
export function PasswordHelp({ check }: { check: ReturnType<typeof checkPassword> }) {
  const col = STRENGTH_COLOR[check.label] ?? C.muted;
  const filled = check.score <= 0 ? 0 : check.score <= 2 ? 1 : check.score <= 4 ? 2 : check.score === 5 ? 3 : 4;
  return (
    <View style={s.help} accessibilityLiveRegion="polite">
      <View style={s.meterRow}>
        <View style={s.meter}>
          {[0, 1, 2, 3].map((i) => <View key={i} style={[s.meterSeg, { backgroundColor: check.label && i < filled ? col : C.card2 }]} />)}
        </View>
        <Text style={[s.meterLabel, { color: check.label ? col : C.muted }]}>{check.label || 'Strength'}</Text>
      </View>
      {check.rules.map((r) => (
        <View key={r.key} style={s.ruleRow}>
          <Ionicons name={r.ok ? 'checkmark-circle' : 'ellipse-outline'} size={15} color={r.ok ? A.up : C.faint} />
          <Text style={[s.rule, r.ok && { color: C.text }]}>{r.label}</Text>
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  help: { gap: 6, marginTop: 8, marginBottom: 4 },
  meterRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  meter: { flex: 1, flexDirection: 'row', gap: 4 },
  meterSeg: { flex: 1, height: 4, borderRadius: 2 },
  meterLabel: { width: 56, textAlign: 'right', fontFamily: F.bodySemi, fontSize: 12 },
  ruleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rule: { color: C.muted, fontFamily: F.body, fontSize: 12 },
});
