import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Image, Platform, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Coach } from '../lib/coach';
import type { CoachStyle } from '../lib/coachStyle';
import { A } from '../lib/theme';

type Tone = Coach['tone'];

const native = Platform.OS !== 'web';


/** The two coach pictures. `ratio` is width divided by height, so each one is shown whole, never stretched or cropped. */
const ART: Record<CoachStyle, { source: number; ratio: number }> = {
  male: { source: require('../../assets/Goku.png'), ratio: 711 / 1024 },
  female: { source: require('../../assets/Mirko.png'), ratio: 315 / 793 },
};

/** A slow flip between 0 and 1, used for small changes like twinkling sparkles. */
function useBeat(ms: number, on: boolean) {
  const [f, setF] = useState(0);
  useEffect(() => {
    if (!on) { setF(0); return; }
    const id = setInterval(() => setF((x) => (x + 1) % 2), ms);
    return () => clearInterval(id);
  }, [ms, on]);
  return f;
}

/**
 * How the picture moves. Goku bounces when you did well and shakes when you skipped. Mirko stays calm: she floats softly and sways. Both breathe.
 * A picture cannot change its face, so the mood shows in the movement and, for Goku when you skipped, the anger marks.
 */
function useMotion(gender: CoachStyle, tone: Tone, on: boolean) {
  const v = useRef(new Animated.Value(0)).current;
  const breath = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    v.setValue(0);
    breath.setValue(0);
    if (!on) return;
    const t = (val: Animated.Value, to: number, duration: number, easing = Easing.inOut(Easing.quad)) => Animated.timing(val, { toValue: to, duration, easing, useNativeDriver: native });
    const shake = gender === 'male' && tone === 'bad';
    const b = Animated.loop(Animated.sequence([t(breath, 1, shake ? 650 : 1600), t(breath, 0, shake ? 650 : 1600)]));
    let m: Animated.CompositeAnimation | null = null;
    if (shake) m = Animated.loop(Animated.sequence([t(v, 1, 50), t(v, -1, 50), t(v, 1, 50), t(v, -1, 50), t(v, 0, 50), Animated.delay(1300)]));
    else if (gender === 'male' && tone === 'good') m = Animated.loop(Animated.sequence([t(v, 1, 240, Easing.out(Easing.quad)), t(v, 0, 240, Easing.in(Easing.quad)), Animated.delay(700)]));
    else if (tone === 'good') m = Animated.loop(Animated.sequence([t(v, 1, 1300), t(v, 0, 1300)]));
    else m = Animated.loop(Animated.sequence([t(v, 1, 2400), t(v, -1, 2400)]));
    b.start();
    m?.start();
    return () => { b.stop(); m?.stop(); };
  }, [gender, tone, on, v, breath]);

  const scale = breath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.02] });
  if (gender === 'male' && tone === 'bad') return { transform: [{ translateX: v.interpolate({ inputRange: [-1, 1], outputRange: [-3, 3] }) }, { scale }] };
  if (gender === 'male' && tone === 'good') return { transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -6] }) }, { scale }] };
  if (tone === 'good') return { transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -3] }) }, { scale }] };
  return { transform: [{ rotate: v.interpolate({ inputRange: [-1, 1], outputRange: ['-1deg', '1deg'] }) }, { scale }] };
}

/**
 * The coach picture: Goku (male) or Mirko (female), shown whole inside a box of `width` by `height`.
 * They keep their own colours on the black card. Their movement and the anger marks follow the mood. Every move stops when the phone or
 * browser is set to reduce motion.
 */
export function CoachCharacter({ gender = 'male', tone, width = 120, height = 170 }: { gender?: CoachStyle; tone: Tone; width?: number; height?: number }) {
  const [still, setStill] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled?.().then(setStill).catch(() => {});
  }, []);
  const live = !still;
  const angry = gender === 'male' && tone === 'bad';
  const beat = useBeat(380, live && angry);
  const motion = useMotion(gender, tone, live);

  const art = ART[gender];
  const w = Math.min(width, height * art.ratio);
  const h = w / art.ratio;

  return (
    <View style={{ width, height, alignItems: 'center', justifyContent: 'flex-end' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Animated.View style={[{ width: w, height: h }, motion]}>
        <Image source={art.source} style={{ width: w, height: h }} resizeMode="contain" />
        {/* when you skipped: an anger mark and shout lines */}
        {angry && (
          <Svg width={w} height={h} viewBox={`0 0 100 ${100 / art.ratio}`} preserveAspectRatio="xMidYMid meet" style={{ position: 'absolute', left: 0, top: 0, opacity: beat === 0 ? 1 : 0.55 }}>
            <Path d="M78 8 Q82 13 78 18 M88 8 Q84 13 88 18 M76 10 Q83 6 90 10 M76 16 Q83 20 90 16" stroke={A.over} strokeWidth={2.2} strokeLinecap="round" fill="none" />
            <Path d="M10 22 L2 18 M11 30 L1 30 M13 38 L4 43" stroke={A.over} strokeWidth={2.2} strokeLinecap="round" fill="none" />
          </Svg>
        )}
      </Animated.View>
    </View>
  );
}
