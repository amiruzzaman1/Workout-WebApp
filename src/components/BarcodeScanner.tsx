import { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { C, F, R } from '../lib/theme';
import { Button, Input, P, Row } from './ui';

/**
 * Barcode scanning on the web uses the browser's built-in BarcodeDetector.
 * Chrome on Android and desktop support it; Safari on iPhone does not, so
 * there you type the number under the barcode instead.
 */
export function BarcodeScanner({ onCode, onCancel }: { onCode: (code: string) => void; onCancel: () => void }) {
  const supported = Platform.OS === 'web' && typeof window !== 'undefined' && 'BarcodeDetector' in window && !!navigator.mediaDevices?.getUserMedia;
  const [scanning, setScanning] = useState(false);
  const [manual, setManual] = useState('');
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const stop = useRef(() => {});

  useEffect(() => () => stop.current(), []);

  async function start() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      setScanning(true);
      const Detector = (window as any).BarcodeDetector;
      const det = new Detector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'itf'] });
      let active = true;
      stop.current = () => {
        active = false;
        stream.getTracks().forEach((t) => t.stop());
        setScanning(false);
      };
      setTimeout(async () => {
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          video.setAttribute('playsinline', 'true');
          await video.play().catch(() => {});
        }
        while (active) {
          try {
            const codes = await det.detect(video);
            if (codes && codes.length) {
              const value = String(codes[0].rawValue || '').replace(/\D/g, '');
              if (value.length >= 6) {
                stop.current();
                onCode(value);
                return;
              }
            }
          } catch {
            /* frame not ready */
          }
          await new Promise((r) => setTimeout(r, 250));
        }
      }, 60);
    } catch (e: any) {
      setError(e?.message?.includes('Permission') ? 'Camera permission was blocked. Allow the camera, or type the number below.' : 'Could not open the camera. Type the number below instead.');
      setScanning(false);
    }
  }

  return (
    <View style={{ gap: 12 }}>
      {supported ? (
        scanning ? (
          <View style={st.viewport}>
            {/* web-only element; ignored on native builds */}
            {/* @ts-ignore */}
            <video ref={videoRef} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted autoPlay playsInline />
            <View style={st.reticle} />
          </View>
        ) : (
          <Button title="Open camera and scan" onPress={start} />
        )
      ) : (
        <P muted style={{ fontSize: 13 }}>
          This browser can't use the camera for barcodes (iPhone Safari doesn't support it yet). Type the number printed under the barcode.
        </P>
      )}
      {error && <Text style={{ color: C.danger, fontFamily: F.body, fontSize: 13 }}>{error}</Text>}

      <Row>
        <Input
          value={manual}
          onChangeText={(t) => setManual(t.replace(/\D/g, ''))}
          placeholder="Barcode number, e.g. 9414659000015"
          keyboardType="number-pad"
          style={{ flex: 1, minWidth: 0 }}
          onSubmitEditing={() => manual.length >= 6 && onCode(manual)}
        />
        <Button small title="Find" onPress={() => manual.length >= 6 && onCode(manual)} />
      </Row>
      <Button kind="secondary" small title={scanning ? 'Stop camera' : 'Cancel'} onPress={() => { stop.current(); onCancel(); }} />
    </View>
  );
}

const st = StyleSheet.create({
  viewport: { width: '100%', aspectRatio: 4 / 3, backgroundColor: '#000', borderRadius: R.md, overflow: 'hidden', borderWidth: 1, borderColor: C.borderStrong },
  reticle: { position: 'absolute', left: '10%', right: '10%', top: '32%', height: '36%', borderWidth: 2, borderColor: '#fff', borderRadius: 6, opacity: 0.85 },
});
