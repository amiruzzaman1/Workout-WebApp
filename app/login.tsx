import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Button, Input, Label, P, Screen } from '../src/components/ui';
import { supabase } from '../src/lib/supabase';
import { C, F } from '../src/lib/theme';

export default function Login() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null);

  async function submit() {
    setMsg(null);
    if (!email || password.length < 6) {
      setMsg({ text: 'Enter your email and a password of at least 6 characters.', error: true });
      return;
    }
    setBusy(true);
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      } else {
        const redirect = typeof window !== 'undefined' ? window.location.origin : undefined;
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: redirect } });
        if (error) throw error;
        if (!data.session) setMsg({ text: 'Account created. Check your email for the confirmation link, then sign in.' });
      }
    } catch (e: any) {
      setMsg({ text: e.message ?? String(e), error: true });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen top>
      <View style={{ marginTop: 40, marginBottom: 32, gap: 14 }}>
        <Text style={{ color: C.text, fontFamily: F.display, fontSize: 64, lineHeight: 62, letterSpacing: -3 }}>
          Train.{'\n'}Log.{'\n'}Progress.
        </Text>
        <P muted>Your weekly plan, how-to animations for every exercise, and machine guides for your gym.</P>
      </View>
      <Label>Email</Label>
      <Input value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" placeholder="you@example.com" />
      <Label>Password</Label>
      <Input value={password} onChangeText={setPassword} secureTextEntry placeholder="At least 6 characters" onSubmitEditing={submit} />
      {msg && <Text style={{ color: msg.error ? C.danger : C.text, fontFamily: F.body, marginTop: 4 }}>{msg.text}</Text>}
      <Button title={mode === 'signin' ? 'Sign in' : 'Create account'} onPress={submit} loading={busy} style={{ marginTop: 16 }} />
      <Pressable onPress={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setMsg(null); }} style={{ paddingVertical: 12, alignItems: 'center' }}>
        <Text style={{ color: C.muted, fontFamily: F.body }}>
          {mode === 'signin' ? 'New here? ' : 'Have an account? '}
          <Text style={{ color: C.text, fontFamily: F.bodySemi, textDecorationLine: 'underline' }}>{mode === 'signin' ? 'Create an account' : 'Sign in'}</Text>
        </Text>
      </Pressable>
    </Screen>
  );
}
