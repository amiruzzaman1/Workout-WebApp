import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { buildCoachPrompt } from '../../../src/lib/aiAssistant';
import { useAiRuntime } from '../../../src/lib/aiRuntime';
import { CoachCharacter } from '../../../src/components/CoachCharacter';
import { buildCoachContext } from '../../../src/lib/coach';
import { COACHES, useCoachStyle } from '../../../src/lib/coachStyle';
import { Button, Eyebrow, H1, Input, P, Row, Screen } from '../../../src/components/ui';
import { speak, stopSpeaking, useSpeakEnabled } from '../../../src/lib/speech';
import { useStore } from '../../../src/lib/store';
import { A, C, F, R } from '../../../src/lib/theme';

/**
 * Free form chat with your coach, in character, grounded in your real progress (buildCoachPrompt in
 * aiAssistant.ts). Separate from the voice command pipeline: nothing here is parsed into an action, it is
 * just conversation, so there is no confirm screen for it. Needs the AI model turned on (User settings); the
 * rule based word matching elsewhere in the app has no part in this screen.
 *
 * Saved per coach (table coach_messages, schema v18, store.tsx's loadCoachMessages/addCoachMessage), so the
 * conversation survives leaving the screen, and the last few turns are fed back into buildCoachPrompt so the
 * model has context, the honest on device version of "remembering the conversation".
 */
export default function CoachChat() {
  const router = useRouter();
  const store = useStore();
  const { plan, logs, profile, foodEntries, water, sleep, weights, coachMessages, loadCoachMessages, addCoachMessage } = store;
  const [coachStyle] = useCoachStyle();
  const ai = useAiRuntime();
  const [speakOn] = useSpeakEnabled();
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => stopSpeaking, []); // leaving the screen cuts off anything still being read out

  useEffect(() => {
    setHistoryLoaded(false);
    loadCoachMessages(coachStyle).catch((e: any) => setError(e?.message ?? 'Could not load earlier chat.')).finally(() => setHistoryLoaded(true));
  }, [coachStyle, loadCoachMessages]);

  const loggedDates = new Set(logs.map((l) => l.performed_on));
  const ctx = buildCoachContext({ plan, loggedDates, profile, foodEntries, water, sleep, weights });
  const name = COACHES[coachStyle].name;
  const ready = ai.available && ai.enabled && ai.isLoaded;

  async function send() {
    const q = input.trim();
    if (!q || thinking) return;
    setError(null);
    setInput('');
    setThinking(true);
    const history = coachMessages.map((m) => ({ role: m.role, text: m.text })); // the conversation so far, before this question
    try {
      await addCoachMessage(coachStyle, 'user', q);
      const raw = await ai.ask(buildCoachPrompt(q, coachStyle, ctx, history));
      const answer = raw.trim() || "Didn't quite land on an answer there, try asking again.";
      await addCoachMessage(coachStyle, 'coach', answer);
      if (speakOn) speak(answer);
    } catch (e: any) {
      setError(e?.message ?? 'Could not reach the model. Try again.');
    } finally {
      setThinking(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    }
  }

  return (
    <Screen scroll={false}>
      <Stack.Screen options={{ title: '' }} />
      <Row style={{ gap: 12 }}>
        <View style={{ width: 56, height: 72 }}>
          <CoachCharacter gender={coachStyle} tone="neutral" width={56} height={72} />
        </View>
        <View style={{ flex: 1 }}>
          <Eyebrow>Your coach</Eyebrow>
          <H1>Chat with {name}</H1>
        </View>
      </Row>

      {!ai.available && (
        <P muted style={{ fontSize: 13, marginTop: 10 }}>
          The AI model only runs on the Android app, so this has nothing to chat with here. Everything else about {name} still works the same.
        </P>
      )}
      {ai.available && !ready && (
        <View style={{ marginTop: 10, gap: 8 }}>
          <P muted style={{ fontSize: 13 }}>
            {ai.status === 'not_downloaded' ? `${name} needs the AI model downloaded and turned on before it can actually answer you.`
              : ai.status === 'downloading' ? `Still downloading, ${Math.round(ai.progress * 100)}%.`
              : !ai.enabled ? `The model is downloaded but turned off.`
              : `Loading the model into memory, this can take a minute.`}
          </P>
          <Button small icon="sparkles-outline" title="Open AI assistant settings" onPress={() => router.push('/user/ai')} style={{ alignSelf: 'flex-start' }} />
        </View>
      )}

      {ready && (
        <>
          <ScrollView ref={scrollRef} style={{ flex: 1, marginTop: 10 }} contentContainerStyle={{ gap: 10, paddingBottom: 10 }} onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}>
            {historyLoaded && coachMessages.length === 0 && (
              <P muted style={{ fontSize: 13 }}>
                Ask {name} anything about your training, food or motivation. It knows your streak, your goal progress, and today's numbers, but nothing else, so it can get things wrong; it is a small model.
              </P>
            )}
            {coachMessages.map((m) => <Bubble key={m.id} msg={m} />)}
            {thinking && (
              <Row style={{ gap: 8 }}>
                <ActivityIndicator size="small" color={C.muted} />
                <Text style={cs.thinkingText}>{name} is thinking…</Text>
              </Row>
            )}
            {!!error && <Text style={{ color: C.danger, fontFamily: F.body, fontSize: 13 }}>{error}</Text>}
          </ScrollView>

          <Row style={{ gap: 8, marginTop: 8 }}>
            <Input value={input} onChangeText={setInput} placeholder={`Ask ${name} something`} onSubmitEditing={send} returnKeyType="send" style={{ flex: 1 }} />
            <Button small icon="arrow-up" title="Send" onPress={send} disabled={!input.trim()} loading={thinking} />
          </Row>
        </>
      )}
    </Screen>
  );
}

function Bubble({ msg }: { msg: { role: 'user' | 'coach'; text: string } }) {
  const mine = msg.role === 'user';
  return (
    <View style={[cs.bubble, mine ? cs.bubbleMine : cs.bubbleCoach]}>
      <Text style={[cs.bubbleText, mine && { color: C.inverseText }]}>{msg.text}</Text>
    </View>
  );
}

const cs = StyleSheet.create({
  bubble: { maxWidth: '85%', borderRadius: R.lg, paddingVertical: 10, paddingHorizontal: 13 },
  bubbleMine: { alignSelf: 'flex-end', backgroundColor: C.inverse },
  bubbleCoach: { alignSelf: 'flex-start', backgroundColor: C.card, borderWidth: 1, borderColor: C.borderStrong },
  bubbleText: { color: C.text, fontFamily: F.body, fontSize: 14, lineHeight: 20 },
  thinkingText: { color: C.muted, fontFamily: F.body, fontSize: 13 },
});
