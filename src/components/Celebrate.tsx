import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, Easing, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { A, C, F, R } from '../lib/theme';
import { Button } from './ui';

const BITS = ['🎉', '✨', '⭐', '💪', '🔥', '🏆', '🎊', '💥'];

/** A burst of emoji that fall once. Honours reduce motion (then it just shows nothing, the card still celebrates). */
function Confetti() {
  const items = useRef(Array.from({ length: 22 }, (_, i) => ({
    x: Math.random() * 100, delay: Math.random() * 500, dur: 1600 + Math.random() * 1400, size: 18 + Math.random() * 16, emoji: BITS[i % BITS.length],
    v: new Animated.Value(0), drift: (Math.random() - 0.5) * 60,
  }))).current;
  const still = useRef(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled?.().then((v) => { still.current = v; }).catch(() => {});
    items.forEach((it) => Animated.timing(it.v, { toValue: 1, duration: it.dur, delay: it.delay, easing: Easing.in(Easing.quad), useNativeDriver: true }).start());
  }, []);
  if (still.current) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {items.map((it, i) => (
        <Animated.Text key={i} style={{
          position: 'absolute', top: -30, left: `${it.x}%`, fontSize: it.size,
          opacity: it.v.interpolate({ inputRange: [0, 0.1, 0.85, 1], outputRange: [0, 1, 1, 0] }),
          transform: [{ translateY: it.v.interpolate({ inputRange: [0, 1], outputRange: [0, 620] }) }, { translateX: it.v.interpolate({ inputRange: [0, 1], outputRange: [0, it.drift] }) }, { rotate: it.v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${it.drift * 6}deg`] }) }],
        }}>{it.emoji}</Animated.Text>
      ))}
    </View>
  );
}

export type Celebration = { emoji: string; title: string; lines: string[] };

/** A centred card with confetti for the big moments: a level up, a new badge, a perfect day, a finished workout. */
export function CelebrationModal({ item, onClose, buttonLabel = 'Nice' }: { item: Celebration | null; onClose: () => void; buttonLabel?: string }) {
  const pop = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!item) return;
    pop.setValue(0);
    Animated.spring(pop, { toValue: 1, friction: 5, tension: 90, useNativeDriver: true }).start();
  }, [item]);
  if (!item) return null;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose} accessibilityLabel="Close celebration">
        <Confetti />
        <Animated.View style={[s.card, { transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) }], opacity: pop }]}>
          <Text style={s.emoji}>{item.emoji}</Text>
          <Text style={s.title}>{item.title}</Text>
          {item.lines.map((l, i) => <Text key={i} style={s.line}>{l}</Text>)}
          <Button title={buttonLabel} onPress={onClose} style={{ marginTop: 14, alignSelf: 'stretch' }} />
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#000000cc', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 360, backgroundColor: C.card, borderRadius: R.lg, borderWidth: 1, borderColor: A.carbs, padding: 22, alignItems: 'center', gap: 6 },
  emoji: { fontSize: 54 },
  title: { color: C.text, fontFamily: F.display, fontSize: 22, letterSpacing: -0.4, textAlign: 'center' },
  line: { color: C.muted, fontFamily: F.body, fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
