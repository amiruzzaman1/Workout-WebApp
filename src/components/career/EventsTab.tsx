import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CareerEvent, EVENTS, FIND_MORE, GROUPS, PAID_SKIP, PLAYBOOK } from '../../data/careerEvents';
import { A, C, F, R } from '../../lib/theme';
import { hovered, P, Section, smooth } from '../ui';
import { DAY, fmtLong, isoDate, k, LinkChip, open, Tag, todayMidnight, weekOf } from './shared';

function dateLine(e: CareerEvent) {
  const d = isoDate(e.date);
  const range = e.endDate ? `${fmtLong(d)} to ${fmtLong(isoDate(e.endDate))}` : fmtLong(d);
  return e.time ? `${range}, ${e.time}` : range;
}

function EventCard({ e, today }: { e: CareerEvent; today: Date }) {
  const starts = Math.round((isoDate(e.date).getTime() - today.getTime()) / DAY);
  const when = starts <= 0 ? 'On now' : starts === 1 ? 'Tomorrow' : starts < 14 ? `In ${starts} days` : '';
  const color = e.must ? A.up : e.cost === 'Free' ? A.fibre : e.cost === 'Paid' ? A.carbs : C.muted;
  const wk = weekOf(isoDate(e.date));
  return (
    <Pressable onPress={() => open(e.url)} accessibilityRole="link" accessibilityLabel={`${e.name}, ${dateLine(e)}`} style={(st) => [s.event, { borderTopColor: color }, smooth, hovered(st) && { backgroundColor: C.card2, borderColor: color }]}>
      <View style={s.tags}>
        {e.must && <Tag text="Must go" color={A.up} solid />}
        <Tag text={e.cost === 'Paid' ? `Paid ${e.price ?? ''}`.trim() : e.cost === 'Free' ? 'Free' : 'Check cost'} color={color} />
        {e.where === 'Online' && <Tag text="Online" color={C.muted} />}
        {wk >= 1 && wk <= 14 && <Tag text={`Week ${wk}`} color={C.muted} />}
        {!!when && <Tag text={when} color={A.cardio} />}
      </View>
      <Text style={s.eventName}>{e.name}</Text>
      <Text style={k.meta}>{dateLine(e)}</Text>
      <Text style={k.meta}>{e.where}</Text>
      <Text style={s.why}>{e.why}</Text>
      <View style={s.go}>
        <Text style={[s.goText, { color }]}>Details and tickets</Text>
        <Ionicons name="open-outline" size={13} color={color} />
      </View>
    </Pressable>
  );
}

export function EventsTab() {
  const today = todayMidnight();
  const upcoming = EVENTS.filter((e) => isoDate(e.endDate ?? e.date).getTime() >= today.getTime()).sort((a, b) => a.date.localeCompare(b.date));
  const inPerson = upcoming.filter((e) => e.where !== 'Online');
  const online = upcoming.filter((e) => e.where === 'Online');
  const free = upcoming.filter((e) => e.cost === 'Free').length;

  return (
    <View style={{ gap: 4 }}>
      <P muted style={{ fontSize: 13, lineHeight: 19 }}>
        Mostly free Wellington events for meeting the people who hire in .NET, Azure and AI. {upcoming.length} coming up, {free} free. Dates, times and prices were checked on 21 October 2026, so open the link to confirm before you go.
      </P>

      <Section title="Coming up in Wellington" icon="location-outline" color={A.up}>
        {inPerson.map((e) => <EventCard key={e.date + e.name} e={e} today={today} />)}
        {inPerson.length === 0 && <P muted style={{ fontSize: 13 }}>Nothing listed right now. Check the sites under Find more dates.</P>}
      </Section>

      <Section title="Online and free" icon="videocam-outline" color={A.water}>
        {online.map((e) => <EventCard key={e.date + e.name} e={e} today={today} />)}
        {online.length === 0 && <P muted style={{ fontSize: 13 }}>Nothing listed right now.</P>}
      </Section>

      <Section title="Groups to join today" icon="people-outline" color={A.fat}>
        <P muted style={{ fontSize: 13, lineHeight: 19 }}>Join these now so new event dates reach you as soon as they are posted. The first two matter most for your plan.</P>
        {GROUPS.map((g, i) => (
          <View key={g.name} style={[k.panel, i < 2 && { borderTopColor: A.up, borderTopWidth: 2 }]}>
            <Text style={k.panelTitle}>{g.name}</Text>
            <Text style={k.body}>{g.what}</Text>
            <Text style={k.meta}>{g.often} · {g.cost}</Text>
            <Text style={s.why}>{g.why}</Text>
            <View style={k.links}><LinkChip label="Open group" url={g.url} color={A.fat} /></View>
          </View>
        ))}
      </Section>

      <Section title="Find more dates" icon="search-outline" color={A.protein}>
        <View style={k.links}>
          {FIND_MORE.map((f) => <LinkChip key={f.url} label={f.label} url={f.url} color={A.protein} />)}
        </View>
        {FIND_MORE.map((f) => <Text key={f.label} style={k.meta}>{f.label}: {f.note}</Text>)}
      </Section>

      <Section title="How to work an event" icon="chatbubbles-outline" color={A.cardio}>
        <View style={k.panel}>
          {PLAYBOOK.map((step, i) => (
            <View key={i} style={s.step}>
              <Text style={s.stepNum}>{i + 1}</Text>
              <Text style={[k.body, { flex: 1, minWidth: 0, color: C.soft }]}>{step}</Text>
            </View>
          ))}
        </View>
      </Section>

      <Section title="Paid events, probably skip" icon="cash-outline" color={A.carbs}>
        {PAID_SKIP.map((e) => (
          <Pressable key={e.name} onPress={() => open(e.url)} accessibilityRole="link" style={(st) => [k.panel, smooth, hovered(st) && { backgroundColor: C.card2 }]}>
            <Text style={k.panelTitle}>{e.name}</Text>
            <Text style={k.meta}>{e.when} · {e.price}</Text>
            <Text style={k.body}>{e.note}</Text>
          </Pressable>
        ))}
      </Section>
    </View>
  );
}

const s = StyleSheet.create({
  event: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderTopWidth: 2, borderRadius: R.lg, padding: 14, gap: 4, marginBottom: 10 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
  eventName: { color: C.text, fontFamily: F.bodySemi, fontSize: 15, lineHeight: 21 },
  why: { color: C.soft, fontFamily: F.body, fontSize: 13, lineHeight: 19, marginTop: 4 },
  go: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  goText: { fontFamily: F.bodySemi, fontSize: 12 },
  step: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  stepNum: { color: A.cardio, fontFamily: F.display, fontSize: 16, width: 18 },
});
