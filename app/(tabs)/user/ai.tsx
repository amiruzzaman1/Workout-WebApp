import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Eyebrow, H1, P, Row, Screen } from '../../../src/components/ui';
import { MODEL_SIZE_GB, MODEL_URL } from '../../../src/lib/aiAssistant';
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
  const [stuck, setStuck] = useState(false);
  const lastProgress = useRef({ value: 0, at: Date.now() });

  async function download() {
    setErr(null); setBusy(true); setStuck(false);
    try { await ai.download(); } catch (e: any) { setErr(e?.message ?? 'Could not download the model. Check your connection and try again.'); }
    finally { setBusy(false); }
  }
  async function cancel() {
    setBusy(true);
    try { await ai.cancelDownload(); } finally { setBusy(false); setStuck(false); }
  }

  // The native download can take a little while to report its first bytes even on a good connection, so
  // this only flags "stuck" once progress has genuinely gone nowhere for a while, giving a way out instead
  // of just watching 0% forever if the connection has actually stalled.
  useEffect(() => {
    if (ai.status !== 'downloading') { setStuck(false); return; }
    if (ai.progress !== lastProgress.current.value) lastProgress.current = { value: ai.progress, at: Date.now() };
    const id = setInterval(() => { setStuck(Date.now() - lastProgress.current.at > 25000); }, 2000);
    return () => clearInterval(id);
  }, [ai.status, ai.progress]);
  async function remove() {
    if (!(await confirm('Remove the AI model?', 'It will stop understanding anything word matching cannot, until you download it again.', { confirmText: 'Remove', danger: true }))) return;
    setBusy(true);
    try { await ai.remove(); } finally { setBusy(false); }
  }
  async function importLocalFile() {
    setErr(null); setBusy(true);
    try { await ai.importLocalFile(); } catch (e: any) { setErr(e?.message ?? 'Could not use that file. Make sure you picked the right one.'); }
    finally { setBusy(false); }
  }
  async function retryLoad() {
    setBusy(true);
    try { await ai.retryLoad(); } finally { setBusy(false); }
  }

  // Loading an already downloaded model into memory is usually quick, but the first time (fresh install,
  // or right after a manual file import) can genuinely take a couple of minutes while MediaPipe sets things
  // up, so this times how long it has been "Loading..." to tell the user that, rather than leaving them
  // guessing whether 5 minutes of nothing happening is normal or broken.
  const loadingSince = useRef<number | null>(null);
  const [loadingFor, setLoadingFor] = useState(0);
  const loading = ai.status === 'downloaded' && ai.enabled && !ai.isLoaded && !ai.loadError;
  useEffect(() => {
    if (!loading) { loadingSince.current = null; setLoadingFor(0); return; }
    if (loadingSince.current == null) loadingSince.current = Date.now();
    const id = setInterval(() => { setLoadingFor(Math.round((Date.now() - loadingSince.current!) / 1000)); }, 1000);
    return () => clearInterval(id);
  }, [loading]);

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
              <ManualImport onOpenLink={() => Linking.openURL(MODEL_URL)} onImport={importLocalFile} busy={busy} />
            </>
          )}
          {ai.status === 'downloading' && (
            <>
              <Row style={{ gap: 8 }}><Ionicons name="cloud-download" size={18} color={A.core} /><Text style={st.status}>Downloading…</Text></Row>
              <View style={st.track}><View style={[st.fill, { width: `${Math.round(ai.progress * 100)}%` }]} /></View>
              <P muted style={{ fontSize: 12 }}>{Math.round(ai.progress * 100)}% of {MODEL_SIZE_GB} GB. You can leave this page, it keeps going.</P>
              {stuck && (
                <>
                  <P style={{ fontSize: 13, color: C.danger }}>This has not moved for a while, it may be stuck. Check you are on Wi-Fi, then cancel and try again.</P>
                  <Button small icon="close" kind="secondary" tint={A.over} title="Cancel" onPress={cancel} loading={busy} style={{ marginTop: 4 }} />
                </>
              )}
            </>
          )}
          {ai.status === 'error' && (
            <>
              <Row style={{ gap: 8 }}><Ionicons name="alert-circle-outline" size={18} color={C.danger} /><Text style={st.status}>Download failed</Text></Row>
              <P muted style={{ fontSize: 13 }}>{ai.error ?? 'Something went wrong. Check your connection and try again.'}</P>
              <Button icon="refresh" title="Try again" onPress={download} loading={busy} style={{ marginTop: 4 }} />
              <ManualImport onOpenLink={() => Linking.openURL(MODEL_URL)} onImport={importLocalFile} busy={busy} />
            </>
          )}
          {ai.status === 'downloaded' && (
            <>
              <Row style={{ gap: 8 }}>
                <Ionicons
                  name={ai.loadError ? 'alert-circle-outline' : ai.enabled ? (ai.isLoaded ? 'checkmark-circle' : 'cloud-download') : 'pause-circle-outline'}
                  size={18} color={ai.loadError ? C.danger : ai.enabled ? A.up : C.muted}
                />
                <Text style={st.status}>{ai.loadError ? 'Could not load the model' : ai.enabled ? (ai.isLoaded ? 'Ready' : `Loading… (${loadingFor}s)`) : 'Downloaded, turned off'}</Text>
              </Row>
              {ai.loadError ? (
                <P style={{ fontSize: 13, color: C.danger }}>{ai.loadError}</P>
              ) : (
                <P muted style={{ fontSize: 13 }}>
                  {!ai.enabled ? 'Turn it on to let commands use it again.'
                    : !ai.isLoaded ? (loadingFor > 20 ? 'Still going, the first load after a fresh download can take a couple of minutes while it sets up. Leaving this page is fine.' : 'Setting up the model for the first time.')
                    : 'Voice and typed commands will ask it when word matching does not understand something.'}
                </P>
              )}
              <Row style={{ gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                {ai.loadError && <Button small icon="refresh" title="Try again" onPress={retryLoad} loading={busy} />}
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

/** Downloading inside the app can stall on a weak connection. This lets the user get the exact same file
 *  another way (their phone's own browser handles a 3 GB download far more reliably, with its own retry
 *  and resume) and just point the app at it, skipping the in-app downloader entirely. */
function ManualImport({ onOpenLink, onImport, busy }: { onOpenLink: () => void; onImport: () => void; busy: boolean }) {
  return (
    <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: C.border, gap: 8 }}>
      <Text style={{ color: C.muted, fontFamily: F.body, fontSize: 12 }}>
        If the download above will not finish, get the same file your own way (your phone's browser is usually more
        reliable for a file this size), then point the app at it.
      </Text>
      <Row style={{ gap: 8, flexWrap: 'wrap' }}>
        <Button small kind="secondary" icon="open-outline" title="Open the download link" onPress={onOpenLink} />
        <Button small kind="secondary" icon="folder-open-outline" title="Use a file I already downloaded" onPress={onImport} loading={busy} />
      </Row>
    </View>
  );
}

const st = StyleSheet.create({
  status: { color: C.text, fontFamily: F.display, fontSize: 16, letterSpacing: -0.3 },
  track: { height: 6, borderRadius: 3, backgroundColor: C.border, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3, backgroundColor: A.core },
});
