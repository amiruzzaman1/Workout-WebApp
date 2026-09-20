import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Exercise, imageUrls } from '../lib/exercises';
import { C } from '../lib/theme';

/**
 * Plays the exercise's start/end photos as a looping cross-fade,
 * which reads as a simple animation of the movement. Tap to pause.
 */
export function ExerciseAnimation({ exercise, height = 260 }: { exercise: Exercise; height?: number }) {
  const urls = imageUrls(exercise);
  const fade = useRef(new Animated.Value(0)).current;
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (urls.length < 2 || paused) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(500),
        Animated.timing(fade, { toValue: 1, duration: 700, useNativeDriver: false }),
        Animated.delay(500),
        Animated.timing(fade, { toValue: 0, duration: 700, useNativeDriver: false }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [urls.length, paused, fade]);

  if (urls.length === 0) {
    return (
      <View style={[st.box, { height, alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ color: C.muted }}>No animation for this exercise</Text>
      </View>
    );
  }

  return (
    <Pressable onPress={() => setPaused((p) => !p)} style={[st.box, { height }]}>
      <Image source={{ uri: urls[0] }} style={st.img} resizeMode="contain" />
      {urls[1] && <Animated.Image source={{ uri: urls[1] }} style={[st.img, { opacity: fade }]} resizeMode="contain" />}
      <View style={st.badge}>
        <Text style={st.badgeText}>{paused ? '▶ Tap to play' : 'Tap to pause'}</Text>
      </View>
    </Pressable>
  );
}

export function ExerciseThumb({ exercise, size = 56 }: { exercise: Exercise; size?: number }) {
  const url = imageUrls(exercise)[0];
  if (!url) return <View style={{ width: size, height: size, borderRadius: 8, backgroundColor: C.card2 }} />;
  return <Image source={{ uri: url }} style={{ width: size, height: size, borderRadius: 8, backgroundColor: '#fff' }} />;
}

const st = StyleSheet.create({
  box: { width: '100%', backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden' },
  img: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },
  badge: { position: 'absolute', right: 8, bottom: 8, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  badgeText: { color: '#fff', fontSize: 12 },
});
