import { StyleSheet, Text, View } from 'react-native';
import { LIBRARY, RHYTHM } from '../../data/careerPlan';
import { A, C, F, R } from '../../lib/theme';
import { P, Section } from '../ui';
import { k, LinkChip } from './shared';

export function ResourcesTab() {
  return (
    <View style={{ gap: 4 }}>
      <P muted style={{ fontSize: 13, lineHeight: 19 }}>
        Every link here is free. The Plan tab links the right one to each task, so use this page when you want more of something.
      </P>

      <Section title="Daily rhythm" icon="time-outline" color={A.water}>
        <P muted style={{ fontSize: 13, lineHeight: 19 }}>Six days on, Sunday is review and planning. If your Master's still needs time, take it out of the build block, never out of gym or sleep.</P>
        <View style={s.table}>
          {RHYTHM.map(([time, block, what], i) => (
            <View key={time} style={[s.tr, i === RHYTHM.length - 1 && { borderBottomWidth: 0 }]}>
              <Text style={s.trTime}>{time}</Text>
              <Text style={s.trBlock}>{block}</Text>
              <Text style={s.trWhat}>{what}</Text>
            </View>
          ))}
        </View>
      </Section>

      <Section title="Free resources" icon="library-outline" color={A.fibre}>
        {LIBRARY.map((g) => (
          <View key={g.title} style={k.panel}>
            <Text style={s.groupTitle}>{g.title}</Text>
            {g.items.map((it) => (
              <View key={it.url + it.label} style={s.libRow}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.libLabel}>{it.label}</Text>
                  {!!it.note && <Text style={k.meta}>{it.note}</Text>}
                </View>
                <LinkChip label="Open" url={it.url} color={A.fibre} />
              </View>
            ))}
          </View>
        ))}
        <P muted style={{ fontSize: 12, lineHeight: 18 }}>
          The AI-103 exam fee is the only cost in the plan. For the visa, check immigration.govt.nz or a licensed adviser for your own case.
        </P>
      </Section>
    </View>
  );
}

const s = StyleSheet.create({
  table: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: R.lg },
  tr: { flexDirection: 'row', gap: 12, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.borderStrong },
  trTime: { color: C.text, fontFamily: F.bodyMed, fontSize: 13, width: 70 },
  trBlock: { color: A.water, fontFamily: F.bodySemi, fontSize: 13, width: 52 },
  trWhat: { flex: 1, minWidth: 0, color: C.muted, fontFamily: F.body, fontSize: 13, lineHeight: 19 },
  groupTitle: { color: C.text, fontFamily: F.display, fontSize: 16 },
  libRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  libLabel: { color: C.text, fontFamily: F.bodyMed, fontSize: 14 },
});
