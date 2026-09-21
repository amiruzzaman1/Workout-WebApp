import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { ConfirmOptions, registerConfirmHost } from '../lib/confirm';
import { A, C, F, R } from '../lib/theme';
import { hovered, smooth } from './ui';

type Ask = { title: string; message: string; options: ConfirmOptions };

/** Mounted once at the top of the app. It shows the questions asked through confirm(). */
export function ConfirmHost() {
  const [ask, setAsk] = useState<Ask | null>(null);
  const resolver = useRef<((ok: boolean) => void) | null>(null);

  useEffect(() => {
    registerConfirmHost((title, message, options) => {
      resolver.current?.(false); // a new question replaces one that is still open
      return new Promise<boolean>((resolve) => {
        resolver.current = resolve;
        setAsk({ title, message, options });
      });
    });
    return () => registerConfirmHost(null);
  }, []);

  const close = (ok: boolean) => {
    resolver.current?.(ok);
    resolver.current = null;
    setAsk(null);
  };

  const danger = !!ask?.options.danger;

  return (
    <Modal visible={!!ask} transparent animationType="fade" onRequestClose={() => close(false)}>
      <Pressable style={s.backdrop} onPress={() => close(false)}>
        <Pressable style={s.card} onPress={() => {}} accessibilityRole="alert">
          <View style={[s.bar, danger && { backgroundColor: A.over }]} />
          <Text style={s.title}>{ask?.title}</Text>
          <Text style={s.message}>{ask?.message}</Text>
          <View style={s.buttons}>
            <Pressable onPress={() => close(false)} style={(p) => [s.btn, s.cancel, smooth, hovered(p) && { backgroundColor: C.card2, borderColor: C.text }, p.pressed && { opacity: 0.7 }]} accessibilityRole="button">
              <Text style={s.cancelText}>{ask?.options.cancelText ?? 'Cancel'}</Text>
            </Pressable>
            <Pressable onPress={() => close(true)} style={(p) => [s.btn, danger ? s.danger : s.ok, smooth, hovered(p) && { opacity: 0.85, transform: [{ translateY: -1 }] }, p.pressed && { opacity: 0.8 }]} accessibilityRole="button">
              <Text style={s.okText}>{ask?.options.confirmText ?? 'OK'}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 380, backgroundColor: C.card, borderWidth: 1, borderColor: C.borderStrong, borderRadius: R.lg, padding: 22, gap: 10, overflow: 'hidden' },
  bar: { position: 'absolute', top: 0, left: 0, right: 0, height: 2, backgroundColor: C.inverse },
  title: { color: C.inverse, fontFamily: F.display, fontSize: 18, letterSpacing: -0.4, marginTop: 4 },
  message: { color: C.muted, fontFamily: F.body, fontSize: 15, lineHeight: 22 },
  buttons: { flexDirection: 'row', gap: 10, marginTop: 14 },
  btn: { flex: 1, minHeight: 48, borderRadius: R.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  cancel: { borderWidth: 1, borderColor: C.borderStrong },
  cancelText: { color: C.text, fontFamily: F.bodySemi, fontSize: 15 },
  ok: { backgroundColor: C.inverse },
  danger: { backgroundColor: A.over },
  okText: { color: C.inverseText, fontFamily: F.bodySemi, fontSize: 15 },
});
