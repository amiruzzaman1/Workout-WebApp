import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button, Card, Eyebrow, H1, P, Row, Screen } from '../../../src/components/ui';
import { MODEL_SIZE_GB } from '../../../src/lib/aiAssistant';
import { useAiRuntime } from '../../../src/lib/aiRuntime';
import { confirm } from '../../../src/lib/confirm';
import { A, C, F, R } from '../../../src/lib/theme';

/**
 * The optional on-device model (a small AI, Gemma 3n, running fully on your phone). Off by default, a 3 GB
 * one-off download, and only ever asked when the instant word matching behind voice commands has already
 * given up on a phrase, since that free, built in matching already covers most of what you would say.
 */
export default function AiSettings() {
  const ai = useAiRuntime();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function download() {
    setErr(null); setBusy(true);
    try { await ai.download(); } catch (e: any) { setErr(e?.message ?? 'Could not download the model. Check your connection and try again.'); }
    finally { setBusy(false); }
  }
  async function remove() {
    if (!(await confirm('Remove the AI model?', 'It will stop understanding anything word matching cannot, until you download it again.', { confirmText: 'Remove', danger: true }))) return;
    setBusy(true);
    try { await ai.remove(); } finally { setBusy(false); }
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: '' }} />
      <Eyebrow>User</Eyebrow>
      <H1>AI assistant</H1>
      <P muted style={{ fontSize: 13, lineHeight: 19 }}>
        Voice and typed commands already understand a lot without this, through plain word matching, free and
        instant. This adds a small AI model (Gemma 3n) that only gets asked when that matching genuinely does
        not understand a phrase. It runs entirely on your phone, nothing is sent anywhere, and everything it
        proposes still goes through the same confirm screen before anything saves.
      </P>

      {!ai.available && (
        <Card style={{ marginTop: 14 }}>
          <Text style={st.status}>Only available on the Android app</Text>
          <P muted style={{ fontSize: 13, marginTop: 4 }}>The model needs the phone's own hardware to run on. This has no effect on the website.</P>
        </Card>
      )}

      {ai.available && (
        <Card style={{ marginTop: 14, gap: 10 }}>
          {ai.status === 'not_downloaded' && (
            <>
              <Row style={{ gap: 8 }}><Ionicons name="cloud-download-outline" size={18} color={C.muted} /><Text style={st.status}>Not downloaded</Text></Row>
              <P muted style={{ fontSize: 13 }}>A {MODEL_SIZE_GB} GB one-off download, Wi-Fi recommended. It stays on your phone after that, no further downloads.</P>
              <Button icon="cloud-download-outline" title={`Download the model (${MODEL_SIZE_GB} GB)`} onPress={download} loading={busy} style={{ marginTop: 4 }} />
            </>
          )}
          {ai.status === 'downloading' && (
            <>
              <Row style={{ gap: 8 }}><Ionicons name="cloud-download" size={18} color={A.core} /><Text style={st.status}>Downloading…</Text></Row>
              <View style={st.track}><View style={[st.fill, { width: `${Math.round(ai.progress * 100)}%` }]} /></View>
              <P muted style={{ fontSize: 12 }}>{Math.round(ai.progress * 100)}% of {MODEL_SIZE_GB} GB. You can leave this page, it keeps going.</P>
            </>
          )}
          {ai.status === 'error' && (
            <>
              <Row style={{ gap: 8 }}><Ionicons name="alert-circle-outline" size={18} color={C.danger} /><Text style={st.status}>Download failed</Text></Row>
              <P muted style={{ fontSize: 13 }}>{ai.error ?? 'Something went wrong. Check your connection and try again.'}</P>
              <Button icon="refresh" title="Try again" onPress={download} loading={busy} style={{ marginTop: 4 }} />
            </>
          )}
          {ai.status === 'downloaded' && (
            <>
              <Row style={{ gap: 8 }}>
                <Ionicons name={ai.enabled ? 'checkmark-circle' : 'pause-circle-outline'} size={18} color={ai.enabled ? A.up : C.muted} />
                <Text style={st.status}>{ai.enabled ? (ai.isLoaded ? 'Ready' : 'Loading…') : 'Downloaded, turned off'}</Text>
              </Row>
              <P muted style={{ fontSize: 13 }}>
                {ai.enabled ? 'Voice and typed commands will ask it when word matching does not understand something.' : 'Turn it on to let commands use it again.'}
              </P>
              <Row style={{ gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                <Button small icon={ai.enabled ? 'pause' : 'play'} kind="secondary" title={ai.enabled ? 'Turn off' : 'Turn on'} onPress={() => ai.setEnabled(!ai.enabled)} />
                <Button small kind="secondary" icon="trash-outline" tint={A.over} title="Remove model" onPress={remove} loading={busy} />
              </Row>
            </>
          )}
          {!!err && <Text style={{ color: C.danger, fontFamily: F.body, fontSize: 13 }}>{err}</Text>}
        </Card>
      )}

      <P muted style={{ fontSize: 12, marginTop: 14 }}>
        Google's Gemma 3n, run through Google's on-device MediaPipe LLM Inference API. Like any small model, it can
        get things wrong, which is exactly why nothing it proposes skips the confirm screen.
      </P>
    </Screen>
  );
}

const st = StyleSheet.create({
  status: { color: C.text, fontFamily: F.display, fontSize: 16, letterSpacing: -0.3 },
  track: { height: 6, borderRadius: 3, backgroundColor: C.border, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3, backgroundColor: A.core },
});
