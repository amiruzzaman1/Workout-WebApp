import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AFTER_EXAM, CERT_NAME, COURSES, EXAM_FACTS, EXAM_NAME, EXAM_PLAN, SAVE_MONEY } from '../../data/careerGuide';
import { A, C, F, R } from '../../lib/theme';
import { hovered, P, Section, smooth } from '../ui';
import { fmtDay, fmtLong, isoDate, k, LinkChip, open, Tag, todayMidnight, weekStart } from './shared';

export function ExamsTab() {
  const today = todayMidnight();
  const nextIdx = EXAM_PLAN.findIndex((st) => isoDate(st.date).getTime() >= today.getTime());

  return (
    <View style={{ gap: 4 }}>
      <P muted style={{ fontSize: 13, lineHeight: 19 }}>
        One certification, booked at the right time, plus the courses that get you there and when to start each. Facts below are from Microsoft's own AI-103 pages, checked on 21 October 2026.
      </P>

      <Section title="Your exam" icon="ribbon-outline" color={A.cardio}>
        <View style={[k.panel, { borderTopColor: A.cardio, borderTopWidth: 2 }]}>
          <Text style={k.panelTitle}>{EXAM_NAME}</Text>
          <Text style={k.meta}>{CERT_NAME}</Text>
          <View style={{ gap: 10, marginTop: 6 }}>
            {EXAM_FACTS.map((f) => (
              <View key={f.label} style={s.fact}>
                <Text style={s.factLabel}>{f.label}</Text>
                <Text style={[k.body, { flex: 1, minWidth: 0, color: C.soft }]}>{f.value}</Text>
              </View>
            ))}
          </View>
        </View>
      </Section>

      <Section title="Exam plan, step by step" icon="calendar-outline" color={A.cardio}>
        {EXAM_PLAN.map((st, i) => {
          const past = isoDate(st.date).getTime() < today.getTime();
          const next = i === nextIdx;
          return (
            <View key={st.title} style={[k.panel, s.step, next && { borderColor: A.cardio, borderTopColor: A.cardio }, past && { opacity: 0.6 }]}>
              <View style={s.tags}>
                <Tag text={past ? 'Done by now' : next ? 'Next step' : 'Later'} color={past ? C.muted : next ? A.cardio : C.muted} solid={next} />
                <Tag text={`Week ${st.week}`} color={C.muted} />
              </View>
              <Text style={s.stepDate}>{fmtLong(isoDate(st.date))}</Text>
              <Text style={k.panelTitle}>{st.title}</Text>
              <Text style={k.body}>{st.detail}</Text>
              <View style={k.links}>{st.links.map((l) => <LinkChip key={l.url + l.label} label={l.label} url={l.url} color={A.cardio} />)}</View>
            </View>
          );
        })}
      </Section>

      <Section title="Courses and when to start" icon="school-outline" color={A.protein}>
        <P muted style={{ fontSize: 13, lineHeight: 19 }}>Every one of these is free. Start each in the week shown, and the plan tab tells you exactly what to do inside it.</P>
        {COURSES.map((c) => {
          const when = weekStart(c.week - 1);
          const started = when.getTime() <= today.getTime();
          return (
            <Pressable key={c.name} onPress={() => open(c.url)} accessibilityRole="link" accessibilityLabel={c.name} style={(st) => [s.course, smooth, hovered(st) && { backgroundColor: C.card2, borderColor: A.protein }]}>
              <View style={s.weekBadge}>
                <Text style={s.weekBadgeLabel}>WEEK</Text>
                <Text style={s.weekBadgeNum}>{c.week}</Text>
              </View>
              <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                <Text style={s.courseName}>{c.name}</Text>
                <Text style={k.meta}>Start {fmtDay(when)}{started ? ' (already open)' : ''} · about {c.hours} hours · Free</Text>
                <Text style={[k.body, { color: C.soft }]}>{c.why}</Text>
              </View>
              <Ionicons name="open-outline" size={14} color={C.faint} style={{ marginTop: 2 }} />
            </Pressable>
          );
        })}
      </Section>

      <Section title="Pay less for the exam" icon="pricetag-outline" color={A.carbs}>
        {SAVE_MONEY.map((m) => (
          <Pressable key={m.label} onPress={() => open(m.url)} accessibilityRole="link" style={(st) => [k.panel, smooth, hovered(st) && { backgroundColor: C.card2 }]}>
            <Text style={k.panelTitle}>{m.label}</Text>
            <Text style={k.body}>{m.note}</Text>
          </Pressable>
        ))}
      </Section>

      <Section title="After the exam" icon="flag-outline" color={A.up}>
        <View style={k.panel}>
          {AFTER_EXAM.map((t, i) => <Text key={i} style={[k.body, { color: C.soft }]}>• {t}</Text>)}
        </View>
      </Section>
    </View>
  );
}

const s = StyleSheet.create({
  fact: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  factLabel: { color: C.text, fontFamily: F.bodySemi, fontSize: 13, width: 92 },
  step: { marginBottom: 10, borderTopWidth: 2, borderTopColor: C.border },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  stepDate: { color: A.cardio, fontFamily: F.bodySemi, fontSize: 12 },
  course: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: R.lg, padding: 12, marginBottom: 8 },
  weekBadge: { width: 42, alignItems: 'center', paddingVertical: 4, borderRadius: R.sm, backgroundColor: C.card2, borderWidth: 1, borderColor: C.borderStrong },
  weekBadgeLabel: { color: C.muted, fontFamily: F.bodySemi, fontSize: 8, letterSpacing: 0.8 },
  weekBadgeNum: { color: A.protein, fontFamily: F.display, fontSize: 17 },
  courseName: { color: C.text, fontFamily: F.bodySemi, fontSize: 14, lineHeight: 20 },
});
