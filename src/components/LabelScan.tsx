import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Image, Platform, StyleSheet, Text, View } from 'react-native';
import { recognizeText } from '../lib/labelOcr';
import { LabelRead, parseLabel } from '../lib/labelParse';
import { A, C, F, R } from '../lib/theme';
import { Button, Row } from './ui';

/**
 * Take a photo of a nutrition label, or pick one from the gallery, and hand the numbers read from it to the form.
 * The reading is only a suggestion: the parent fills its own boxes, which stay editable before anything is saved.
 */
export function LabelScan({ onRead }: { onRead: (r: LabelRead) => void }) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ text: string; bad?: boolean } | null>(null);

  async function pick(source: 'camera' | 'library') {
    setMsg(null);
    if (Platform.OS !== 'web') {
      const perm = source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        setMsg({ text: source === 'camera' ? 'Allow camera access in your phone settings to photograph a label.' : 'Allow photo access in your phone settings to pick a label picture.', bad: true });
        return;
      }
    }
    // Cropping to just the nutrition table (where the picker offers it) makes the reading a lot more accurate.
    const opts = { mediaTypes: ['images'] as ImagePicker.MediaType[], allowsEditing: true, quality: 1 };
    let result: ImagePicker.ImagePickerResult;
    try {
      result = source === 'camera' ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    } catch (e: any) {
      setMsg({ text: e?.message ?? 'Could not open the camera or pictures.', bad: true });
      return;
    }
    if (result.canceled || !result.assets?.length) return;
    const uri = result.assets[0].uri;
    setPhoto(uri);
    setBusy(true);
    setStatus('Reading the label');
    try {
      const text = await recognizeText(uri, setStatus);
      const read = parseLabel(text);
      if (read.found === 0) {
        setMsg({ text: 'Could not read any nutrition numbers. Try a closer, brighter, flatter photo of just the nutrition table, or type the numbers below.', bad: true });
      } else {
        onRead(read);
        const filled = `Filled in ${read.found} of 8 boxes from the photo.`;
        setMsg({ text: `${filled} Check every box against the label before saving.${read.notes.length ? ' ' + read.notes.join(' ') : ''}` });
      }
    } catch (e: any) {
      setMsg({ text: `Could not read that picture (${e?.message ?? 'unknown error'}). You can still type the numbers below.`, bad: true });
    } finally {
      setBusy(false);
      setStatus('');
    }
  }

  return (
    <View style={st.card}>
      <Row style={{ gap: 8, alignItems: 'center' }}>
        <Ionicons name="scan-outline" size={18} color={A.protein} />
        <Text style={st.title}>Read the nutrition label</Text>
      </Row>
      <Text style={st.help}>Take a photo of the nutrition table or pick a picture of it, and the numbers fill in below. Everything stays editable, so fix anything it got wrong before you save. The picture is read on your device and is not uploaded.</Text>
      <Row style={{ gap: 8 }}>
        <View style={{ flex: 1, minWidth: 0 }}><Button small icon="camera-outline" tint={A.protein} kind="secondary" title="Take photo" onPress={() => pick('camera')} loading={busy} /></View>
        <View style={{ flex: 1, minWidth: 0 }}><Button small icon="image-outline" tint={A.protein} kind="secondary" title="Upload picture" onPress={() => pick('library')} loading={busy} /></View>
      </Row>
      {busy && <Text style={st.status}>{status}</Text>}
      {!!photo && <Image source={{ uri: photo }} style={st.photo} resizeMode="contain" accessibilityLabel="The label photo, to compare against the boxes below" />}
      {!!msg && <Text style={[st.msg, msg.bad && { color: C.danger }]}>{msg.text}</Text>}
    </View>
  );
}

const st = StyleSheet.create({
  card: { borderWidth: 1, borderColor: C.border, borderRadius: R.md, backgroundColor: C.card, padding: 14, gap: 10, marginBottom: 10 },
  title: { color: C.text, fontFamily: F.bodySemi, fontSize: 14 },
  help: { color: C.muted, fontFamily: F.body, fontSize: 12, lineHeight: 18 },
  status: { color: C.muted, fontFamily: F.bodyMed, fontSize: 12 },
  photo: { width: '100%', height: 200, borderRadius: R.sm, backgroundColor: C.card2 },
  msg: { color: C.text, fontFamily: F.body, fontSize: 12, lineHeight: 18 },
});
