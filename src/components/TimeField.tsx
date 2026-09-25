import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { fmt12, to24 } from '../lib/tracker';
import { C, F, R } from '../lib/theme';
import { hovered, Input, smooth } from './ui';

/** Split a 24 hour "HH:MM" into what the box shows ("2:30") and whether it is PM. */
function split(v: string) {
  const [h, m] = fmt12(v).split(/[: ]/);
  return { text: v ? `${h}:${m}` : '', pm: /PM/.test(fmt12(v)) };
}

/**
 * A time of day in 12 hour form: type the hour and minutes, then pick AM or PM. The value it hands back (and
 * takes) is the 24 hour "HH:MM" the app saves, or an empty string until what is typed is a real time.
 */
export function TimeField({ value, onChange, placeholder = '2:30' }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [text, setText] = useState(() => split(value).text);
  const [pm, setPm] = useState(() => split(value).pm);

  // A "now" button or a reset changed the value from outside: show it.
  useEffect(() => {
    if (value === to24(text, pm)) return;
    const s = split(value);
    setText(s.text); setPm(s.pm);
  }, [value]);

  const edit = (t: string, p: boolean) => { setText(t); setPm(p); onChange(to24(t, p)); };

  return (
    <View style={{ gap: 6 }}>
      <Input value={text} onChangeText={(t) => edit(t.replace(/[^0-9:]/g, '').slice(0, 5), pm)} placeholder={placeholder} keyboardType="numbers-and-punctuation" accessibilityLabel="Time of day" />
      <View style={s.seg} accessibilityRole="radiogroup">
        {([false, true] as const).map((isPm, i) => (
          <Pressable
            key={String(isPm)} onPress={() => edit(text, isPm)} accessibilityRole="radio" accessibilityState={{ selected: pm === isPm }}
            style={(p) => [s.item, smooth, i > 0 && s.divider, hovered(p) && pm !== isPm && { backgroundColor: C.card2 }, pm === isPm && s.on]}
          >
            <Text style={[s.text, pm === isPm && { color: C.inverseText }]}>{isPm ? 'PM' : 'AM'}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  seg: { flexDirection: 'row', borderWidth: 1, borderColor: C.borderStrong, borderRadius: R.md, overflow: 'hidden' },
  item: { flex: 1, minHeight: 36, alignItems: 'center', justifyContent: 'center' },
  divider: { borderLeftWidth: 1, borderLeftColor: C.borderStrong },
  on: { backgroundColor: C.inverse },
  text: { color: C.text, fontFamily: F.bodySemi, fontSize: 13 },
});
