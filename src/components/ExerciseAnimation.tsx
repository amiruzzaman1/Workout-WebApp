import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Exercise, imageUrls } from '../lib/exercises';
import { C, F, R } from '../lib/theme';
import { mono } from './ui';

/**
 * Plays the exercise's start/end photos as a looping cross-fade,
 * which reads as a simple animation of the movement. Tap to pause.
 */
export function ExerciseAnimation({ exercise, height = 280 }: { exercise: Exercise; height?: number }) {
  const urls = imageUrls(exercise);
  const fade = useRef(new Animated.Value(0)).current;
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (urls.length < 2 || paused) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(450),
        Animated.timing(fade, { toValue: 1, duration: 650, useNativeDriver: false }),
        Animated.delay(450),
        Animated.timing(fade, { toValue: 0, duration: 650, useNativeDriver: false }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [urls.length, paused, fade]);

  if (urls.length === 0) {
    return (
      <View style={[st.box, { height, alignItems: 'center', justifyContent: 'center', backgroundColor: C.card }]}>
        <Text style={{ color: C.muted, fontFamily: F.body }}>No animation for this exercise</Text>
      </View>
    );
  }

  return (
    <Pressable onPress={() => setPaused((p) => !p)} style={[st.box, { height }]}>
      <Image source={{ uri: urls[0] }} style={[st.img, mono]} resizeMode="contain" />
      {urls[1] && <Animated.Image source={{ uri: urls[1] }} style={[st.img, mono, { opacity: fade }]} resizeMode="contain" />}
      <View style={st.badge}>
        <Text style={st.badgeText}>{paused ? 'PAUSED · TAP TO PLAY' : 'TAP TO PAUSE'}</Text>
      </View>
    </Pressable>
  );
}

export function ExerciseThumb({ exercise, size = 52 }: { exercise: Exercise; size?: number }) {
  const url = imageUrls(exercise)[0];
  if (!url) {
    return (
      <View style={{ width: size, height: size, borderRadius: R.sm, backgroundColor: C.card2, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: C.muted, fontFamily: F.display, fontSize: size / 3 }}>{exercise.name.slice(0, 1)}</Text>
      </View>
    );
  }
  return <Image source={{ uri: url }} style={[{ width: size, height: size, borderRadius: R.sm, backgroundColor: '#fff' }, mono]} />;
}

const st = StyleSheet.create({
  box: { width: '100%', backgroundColor: '#fff', borderRadius: R.md, overflow: 'hidden' },
  img: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },
  badge: { position: 'absolute', left: 10, bottom: 10, backgroundColor: '#000', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 2 },
  badgeText: { color: '#fff', fontSize: 10, fontFamily: F.bodySemi, letterSpacing: 1 },
});
