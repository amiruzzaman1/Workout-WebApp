import { Image, Text, View } from 'react-native';
import { MACHINE_BY_KEY } from '../data/machines';
import { GYM_PHOTOS } from '../data/gymPhotos';
import { Exercise, requiredKey } from '../lib/exercises';
import { C, F, R } from '../lib/theme';

/** The user's own photo of the gym equipment an exercise is done on, and its name, or null for bodyweight and unknown kit. */
export function gymPhotoFor(e: Exercise | undefined): { key: string; name: string; photos: NonNullable<(typeof GYM_PHOTOS)[string]> } | null {
  if (!e) return null;
  const key = requiredKey(e);
  if (!key || key === 'unknown') return null;
  const photos = GYM_PHOTOS[key];
  if (!photos?.length) return null;
  return { key, name: MACHINE_BY_KEY[key]?.name ?? key, photos };
}

/** A small square of your own gym photo, so you can see which machine to walk to. Nothing for exercises with no kit. */
export function GymThumb({ exercise, size = 52 }: { exercise: Exercise | undefined; size?: number }) {
  const g = gymPhotoFor(exercise);
  if (!g) return null;
  return (
    <View style={{ width: size, height: size, borderRadius: R.sm, overflow: 'hidden', backgroundColor: C.card2, borderWidth: 1, borderColor: C.border }}>
      <Image source={g.photos[0]} accessibilityLabel={`${g.name} at your gym`} resizeMode="cover" style={{ width: '100%', height: '100%' }} />
    </View>
  );
}

/** The photo with the machine's name under it, for places with room (the exercise page and the workout preview). */
export function GymCaption({ exercise }: { exercise: Exercise | undefined }) {
  const g = gymPhotoFor(exercise);
  if (!g) return null;
  return <Text style={{ color: C.muted, fontFamily: F.body, fontSize: 12 }} numberOfLines={1}>{g.name}</Text>;
}
