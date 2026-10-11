import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Coach } from '../lib/coach';
import { COACHES, CoachStyle, setCoachStyle } from '../lib/coachStyle';
import { C, F, R } from '../lib/theme';
import { CoachCharacter } from './CoachCharacter';
import { hovered, smooth, usePageWidth } from './ui';


const LABEL: Record<CoachStyle, Record<Coach['tone'], string>> = {
  male: { good: 'Goku: not bad', bad: 'Goku is furious', neutral: 'Goku' },
  female: { good: 'Mirko is proud of you', bad: 'Mirko is checking in', neutral: 'Mirko' },
};

/** Your coach as an animated character with a speech bubble. Tap the small button to swap between Goku and
 *  Mirko, tap the bubble for another line, or Chat to actually ask it something (needs the AI model turned
 *  on in User settings; onChat is only passed in where that is checked). */
export function CoachCard({ coach, gender = 'male', onReroll, onChat }: { coach: Coach; gender?: CoachStyle; onReroll?: () => void; onChat?: () => void }) {
  const other: CoachStyle = gender === 'male' ? 'female' : 'male';
  // The picture takes about a third of the card, between a small phone and a big screen.
  const stageW = Math.max(92, Math.min(128, Math.round((usePageWidth() + 40) * 0.32)));
  const stageH = Math.round(stageW * 1.5);
  return (
    <View style={s.card} accessibilityRole="summary">
      <View style={s.row}>
        <View style={{ width: stageW, height: stageH }}>
          <CoachCharacter gender={gender} tone={coach.tone} width={stageW} height={stageH} />
        </View>
        <Pressable
          onPress={onReroll}
          disabled={!onReroll}
          accessibilityRole="button"
          accessibilityLabel="Show another line"
          style={(p) => [s.bubble, smooth, !!onReroll && hovered(p) && { borderColor: C.text }]}
        >
          <View style={s.tail} />
          <Text style={s.label}>{LABEL[gender][coach.tone]}</Text>
          <Text style={s.title}>{coach.title}</Text>
          <Text style={s.line}>{coach.line}</Text>
        </Pressable>
      </View>
      <View style={s.buttonRow}>
        {!!onChat && (
          <Pressable
            onPress={onChat}
            accessibilityRole="button"
            accessibilityLabel={`Chat with ${COACHES[gender].name}`}
            style={(p) => [s.switch, smooth, hovered(p) && { backgroundColor: C.card2, borderColor: C.text }, p.pressed && { opacity: 0.7 }]}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={14} color={C.text} />
            <Text style={s.switchText}>Chat with {COACHES[gender].name}</Text>
          </Pressable>
        )}
        <Pressable
          onPress={() => setCoachStyle(other)}
          accessibilityRole="button"
          accessibilityLabel={`Switch coach to ${COACHES[other].name}`}
          style={(p) => [s.switch, smooth, hovered(p) && { backgroundColor: C.card2, borderColor: C.text }, p.pressed && { opacity: 0.7 }]}
        >
          <Ionicons name="swap-horizontal" size={14} color={C.text} />
          <Text style={s.switchText}>Try {COACHES[other].name}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: C.card, borderWidth: 1, borderColor: C.borderStrong, borderRadius: R.lg, padding: 10, paddingLeft: 6, gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bubble: { flex: 1, minWidth: 0, backgroundColor: C.card2, borderWidth: 1, borderColor: C.borderStrong, borderRadius: 16, paddingVertical: 10, paddingHorizontal: 12, gap: 3 },
  tail: { position: 'absolute', left: -7, top: 38, width: 12, height: 12, backgroundColor: C.card2, borderColor: C.borderStrong, borderLeftWidth: 1, borderBottomWidth: 1, transform: [{ rotate: '45deg' }] },
  label: { color: C.soft, fontFamily: F.display, fontSize: 10, letterSpacing: 1.1, textTransform: 'uppercase' },
  title: { color: C.inverse, fontFamily: F.display, fontSize: 16, lineHeight: 20, letterSpacing: -0.4 },
  line: { color: C.muted, fontFamily: F.body, fontSize: 12, lineHeight: 18 },
  buttonRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignSelf: 'flex-end' },
  switch: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: C.borderStrong, borderRadius: 999, paddingVertical: 5, paddingHorizontal: 11 },
  switchText: { color: C.text, fontFamily: F.bodySemi, fontSize: 12 },
});
