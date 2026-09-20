import { useState } from 'react';
import { Text, View } from 'react-native';
import { Button, Card, H1, Input, Label, P, Screen } from '../src/components/ui';
import { supabase } from '../src/lib/supabase';
import { C } from '../src/lib/theme';

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
        if (!data.session) setMsg({ text: 'Account created. Check your email and click the confirmation link, then sign in.' });
      }
    } catch (e: any) {
      setMsg({ text: e.message ?? String(e), error: true });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <View style={{ height: 40 }} />
      <H1>🏋️ Workout</H1>
      <P muted>Your plan, exercise animations and machine guides — all in one place.</P>
      <Card style={{ marginTop: 16, gap: 10 }}>
        <Label>Email</Label>
        <Input value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" placeholder="you@example.com" />
        <Label>Password</Label>
        <Input value={password} onChangeText={setPassword} secureTextEntry placeholder="At least 6 characters" onSubmitEditing={submit} />
        {msg && <Text style={{ color: msg.error ? C.danger : C.good, marginTop: 4 }}>{msg.text}</Text>}
        <Button title={mode === 'signin' ? 'Sign in' : 'Create account'} onPress={submit} loading={busy} style={{ marginTop: 8 }} />
        <Button
          kind="secondary"
          title={mode === 'signin' ? "New here? Create an account" : 'Already have an account? Sign in'}
          onPress={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setMsg(null); }}
        />
      </Card>
    </Screen>
  );
}
