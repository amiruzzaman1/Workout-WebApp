import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { PasswordHelp } from '../../../src/components/PasswordHelp';
import { Button, Card, Eyebrow, H1, Input, Label, P, Screen } from '../../../src/components/ui';
import { checkPassword } from '../../../src/lib/password';
import { useStore } from '../../../src/lib/store';
import { supabase, verifyPassword } from '../../../src/lib/supabase';
import { A, C, F } from '../../../src/lib/theme';

/**
 * Change your password from the User page. An account that only ever signed in with Google has no password yet,
 * so it skips the current password box and can add one, to sign in with an email as well.
 */
export default function ChangePassword() {
  const { session } = useStore();
  const email = session?.user.email ?? '';
  const providers = ((session?.user.app_metadata as any)?.providers ?? []) as string[];
  const hasPassword = providers.includes('email');
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null);
  const check = checkPassword(next, email);

  async function save() {
    setMsg(null);
    if (hasPassword && !current) return setMsg({ text: 'Enter your current password.', error: true });
    if (!check.valid) return setMsg({ text: 'Your new password is not strong enough yet. Every item in the list needs a tick.', error: true });
    if (next !== again) return setMsg({ text: 'The two new passwords do not match.', error: true });
    if (hasPassword && next === current) return setMsg({ text: 'Choose a password you are not using now.', error: true });
    setBusy(true);
    try {
      if (hasPassword && !(await verifyPassword(email, current))) return setMsg({ text: 'Your current password is not right.', error: true });
      const { error } = await supabase.auth.updateUser({ password: next });
      if (error) throw error;
      setCurrent(''); setNext(''); setAgain('');
      setMsg({ text: hasPassword ? 'Your password is changed. Use the new one next time you sign in.' : 'Your password is set. You can now sign in with your email and it.' });
    } catch (e: any) {
      setMsg({ text: e.message ?? String(e), error: true });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: '' }} />
      <Eyebrow>User</Eyebrow>
      <H1>{hasPassword ? 'Change password' : 'Set a password'}</H1>
      <P muted style={{ fontSize: 13, lineHeight: 19 }}>
        {hasPassword ? `Signed in as ${email}.` : `You sign in with Google as ${email}. You can also set a password, so you can sign in with your email as well.`}
      </P>

      <Card style={{ gap: 4 }}>
        <Pressable onPress={() => setShow(!show)} hitSlop={8} accessibilityRole="button" accessibilityLabel={show ? 'Hide passwords' : 'Show passwords'} style={s.showRow}>
          <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={15} color={C.muted} />
          <Text style={s.link}>{show ? 'Hide passwords' : 'Show passwords'}</Text>
        </Pressable>

        {hasPassword && (
          <>
            <Label>Current password</Label>
            <Input value={current} onChangeText={(t) => { setCurrent(t); if (msg?.error) setMsg(null); }} secureTextEntry={!show} autoComplete="current-password" placeholder="Your password now" />
          </>
        )}

        <Label>New password</Label>
        <Input value={next} onChangeText={(t) => { setNext(t); if (msg?.error) setMsg(null); }} secureTextEntry={!show} autoComplete="new-password" placeholder="At least 8, mixed characters" />
        <PasswordHelp check={check} />

        <Label>Confirm new password</Label>
        <Input value={again} onChangeText={setAgain} secureTextEntry={!show} autoComplete="new-password" placeholder="Type it again" onSubmitEditing={save} />

        {msg && (
          <View style={s.msgRow}>
            <Ionicons name={msg.error ? 'alert-circle-outline' : 'checkmark-circle'} size={16} color={msg.error ? C.danger : A.up} />
            <Text style={[s.msg, { color: msg.error ? C.danger : C.text }]}>{msg.text}</Text>
          </View>
        )}

        <Button icon="checkmark" title={hasPassword ? 'Change password' : 'Set password'} onPress={save} loading={busy} style={{ marginTop: 16 }} />
      </Card>
    </Screen>
  );
}

const s = StyleSheet.create({
  showRow: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-end' },
  link: { color: C.muted, fontFamily: F.bodySemi, fontSize: 12, textDecorationLine: 'underline' },
  msgRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 10 },
  msg: { flex: 1, fontFamily: F.body, fontSize: 13, lineHeight: 19 },
});
