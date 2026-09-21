import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Logo } from '../src/components/Logo';
import { PasswordHelp } from '../src/components/PasswordHelp';
import { Button, hovered, Input, Label, Screen, smooth } from '../src/components/ui';
import { checkPassword } from '../src/lib/password';
import { supabase } from '../src/lib/supabase';
import { APP_NAME, C, F, R } from '../src/lib/theme';

type Mode = 'signin' | 'signup';

export default function Login() {
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [again, setAgain] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null);

  const switchTo = (m: Mode) => { setMode(m); setMsg(null); };
  // Only a new password has to be strong. Signing in accepts whatever you set before.
  const check = checkPassword(password, email);

  // Google sends you to its own page, then back to this site signed in. Web only for now.
  async function google() {
    setMsg(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin, queryParams: { prompt: 'select_account' } },
    });
    if (error) setMsg({ text: error.message, error: true });
  }

  async function submit() {
    setMsg(null);
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setMsg({ text: 'Enter a valid email address.', error: true });
    if (mode === 'signin' && !password) return setMsg({ text: 'Enter your password.', error: true });
    if (mode === 'signup' && !check.valid) return setMsg({ text: 'Your password is not strong enough yet. Every item in the list needs a tick.', error: true });
    if (mode === 'signup' && password !== again) return setMsg({ text: 'The two passwords do not match.', error: true });
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
    <Screen>
      <View style={s.brand}>
        <View style={s.logoBox}><Logo size={52} /></View>
        <Text style={s.name}>{APP_NAME}</Text>
        <Text style={s.tag}>Train. Log. Progress.</Text>
      </View>

      <View style={s.card}>
        <View style={s.seg} accessibilityRole="tablist">
          {([['signin', 'Sign in'], ['signup', 'Create account']] as [Mode, string][]).map(([k, label], i) => (
            <Pressable key={k} onPress={() => switchTo(k)} accessibilityRole="tab" accessibilityState={{ selected: mode === k }} style={(p) => [s.segItem, smooth, i > 0 && s.segDivider, hovered(p) && mode !== k && { backgroundColor: C.card2 }, mode === k && s.segOn]}>
              <Text style={[s.segText, mode === k && { color: C.inverseText }]}>{label}</Text>
            </Pressable>
          ))}
        </View>

        {Platform.OS === 'web' && (
          <>
            <Pressable onPress={google} style={(p) => [s.google, smooth, hovered(p) && { backgroundColor: C.card2, borderColor: C.text }, p.pressed && { opacity: 0.7 }]} accessibilityRole="button">
              <Ionicons name="logo-google" size={18} color={C.text} />
              <Text style={s.googleText}>Continue with Google</Text>
            </Pressable>
            <View style={s.or}>
              <View style={s.orLine} />
              <Text style={s.orText}>or use email</Text>
              <View style={s.orLine} />
            </View>
          </>
        )}

        <Label>Email</Label>
        <Input value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" placeholder="you@example.com" />

        <View style={s.labelRow}>
          <Label>Password</Label>
          <Pressable onPress={() => setShow(!show)} hitSlop={8} accessibilityRole="button" accessibilityLabel={show ? 'Hide password' : 'Show password'}><Text style={s.link}>{show ? 'Hide' : 'Show'}</Text></Pressable>
        </View>
        <Input value={password} onChangeText={(t) => { setPassword(t); if (msg?.error) setMsg(null); }} secureTextEntry={!show} autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} placeholder={mode === 'signin' ? 'Your password' : 'At least 8, mixed characters'} onSubmitEditing={mode === 'signin' ? submit : undefined} />
        {mode === 'signup' && <PasswordHelp check={check} />}

        {mode === 'signup' && (
          <>
            <Label>Confirm password</Label>
            <Input value={again} onChangeText={setAgain} secureTextEntry={!show} autoComplete="new-password" placeholder="Type it again" onSubmitEditing={submit} />
          </>
        )}

        {msg && <Text style={{ color: msg.error ? C.danger : C.text, fontFamily: F.body, marginTop: 8 }}>{msg.text}</Text>}

        <Button icon={mode === 'signin' ? 'log-in-outline' : 'person-add-outline'} title={mode === 'signin' ? 'Sign in' : 'Create account'} onPress={submit} loading={busy} style={{ marginTop: 18 }} />

        {mode === 'signup' && <Text style={s.note}>Next you will add a few basic details, so the app can work out your daily calories and plan.</Text>}
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  brand: { alignItems: 'center', gap: 8, marginTop: 36, marginBottom: 26 },
  logoBox: { width: 92, height: 92, borderRadius: 24, borderWidth: 1, borderColor: C.borderStrong, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  name: { color: C.inverse, fontFamily: F.display, fontSize: 40, letterSpacing: -1.5 },
  tag: { color: C.muted, fontFamily: F.bodyMed, fontSize: 15, letterSpacing: 0.4 },
  card: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: R.lg, padding: 18, gap: 4 },
  seg: { flexDirection: 'row', borderWidth: 1, borderColor: C.borderStrong, borderRadius: R.md, overflow: 'hidden', marginBottom: 6 },
  segItem: { flex: 1, minHeight: 46, alignItems: 'center', justifyContent: 'center' },
  segDivider: { borderLeftWidth: 1, borderLeftColor: C.borderStrong },
  segOn: { backgroundColor: C.inverse },
  segText: { color: C.text, fontFamily: F.bodySemi, fontSize: 14 },
  google: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, minHeight: 48, borderWidth: 1, borderColor: C.borderStrong, borderRadius: R.md, marginTop: 8 },
  googleText: { color: C.text, fontFamily: F.bodySemi, fontSize: 15 },
  or: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 12 },
  orLine: { flex: 1, height: 1, backgroundColor: C.border },
  orText: { color: C.muted, fontFamily: F.body, fontSize: 12 },
  labelRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  link: { color: C.muted, fontFamily: F.bodySemi, fontSize: 12, textDecorationLine: 'underline' },
  note: { color: C.muted, fontFamily: F.body, fontSize: 13, lineHeight: 19, marginTop: 12, textAlign: 'center' },
});
