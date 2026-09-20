import type { Session } from '@supabase/supabase-js';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { JETTS_NEWTOWN_TEMPLATE } from '../data/machines';
import { Exercise, setCustomExercises } from './exercises';
import { generatePlan, PlanData, Profile } from './planner';
import { supabase } from './supabase';

type PlanRow = { id: string; name: string; data: PlanData };

type Store = {
  ready: boolean;
  session: Session | null;
  profile: Profile | null;
  plan: PlanRow | null;
  customExercises: Exercise[];
  equipment: Set<string>;
  saveProfile: (p: Partial<Profile>) => Promise<Profile>;
  savePlan: (data: PlanData) => Promise<void>;
  regeneratePlan: (p?: Profile) => Promise<void>;
  toggleEquipment: (key: string) => Promise<void>;
  setEquipment: (keys: string[]) => Promise<void>;
  addCustomExercise: (e: { name: string; primary: string[]; equipment: string; steps: string[] }) => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<Store | null>(null);

export const DEFAULT_PROFILE: Omit<Profile, 'id'> = {
  display_name: '',
  experience: 'beginner',
  goal: 'general',
  training_days: [1, 3, 5],
  sessions_per_day: 1,
  double_days: [],
  session_minutes: 60,
  split: 'auto',
  injuries: '',
  gym_name: 'Jetts Newtown',
  equipment: JETTS_NEWTOWN_TEMPLATE,
};

function toExercise(r: any): Exercise {
  return {
    id: 'custom:' + r.id,
    name: r.name,
    level: 'beginner',
    equipment: r.equipment ?? 'other',
    category: 'strength',
    force: null,
    mechanic: null,
    primary: r.primary_muscles ?? [],
    secondary: [],
    steps: r.instructions ?? [],
    images: [],
    custom: true,
  };
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [plan, setPlan] = useState<PlanRow | null>(null);
  const [customExercises, setCustom] = useState<Exercise[]>([]);

  const loadUserData = useCallback(async (s: Session | null) => {
    if (!s) {
      setProfile(null);
      setPlan(null);
      setCustom([]);
      setCustomExercises([]);
      return;
    }
    const [pr, pl, cx] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', s.user.id).maybeSingle(),
      supabase.from('plans').select('id,name,data').eq('is_active', true).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('custom_exercises').select('*').order('created_at'),
    ]);
    if (pr.error) console.warn(pr.error.message);
    setProfile((pr.data as Profile) ?? null);
    setPlan((pl.data as PlanRow) ?? null);
    const list = (cx.data ?? []).map(toExercise);
    setCustomExercises(list);
    setCustom(list);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      await loadUserData(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        setSession(s);
        setReady(false);
        loadUserData(s).finally(() => setReady(true));
      } else if (event === 'TOKEN_REFRESHED') {
        setSession(s);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [loadUserData]);

  const saveProfile = useCallback(
    async (changes: Partial<Profile>) => {
      if (!session) throw new Error('Not signed in');
      const next = { ...DEFAULT_PROFILE, ...(profile ?? {}), ...changes, id: session.user.id } as Profile;
      const { data, error } = await supabase
        .from('profiles')
        .upsert({ ...next, updated_at: new Date().toISOString() })
        .select()
        .single();
      if (error) throw new Error(error.message);
      setProfile(data as Profile);
      return data as Profile;
    },
    [session, profile],
  );

  const savePlan = useCallback(
    async (data: PlanData) => {
      if (!session) throw new Error('Not signed in');
      if (plan) {
        setPlan({ ...plan, data }); // optimistic
        const { error } = await supabase.from('plans').update({ data, updated_at: new Date().toISOString() }).eq('id', plan.id);
        if (error) throw new Error(error.message);
      } else {
        const { data: row, error } = await supabase.from('plans').insert({ name: 'My plan', data }).select('id,name,data').single();
        if (error) throw new Error(error.message);
        setPlan(row as PlanRow);
      }
    },
    [session, plan],
  );

  const regeneratePlan = useCallback(
    async (p?: Profile) => {
      const prof = p ?? profile;
      if (!prof) return;
      await savePlan(generatePlan(prof));
    },
    [profile, savePlan],
  );

  const setEquipment = useCallback(async (keys: string[]) => {
    await saveProfile({ equipment: keys });
  }, [saveProfile]);

  const toggleEquipment = useCallback(
    async (key: string) => {
      const cur = new Set(profile?.equipment ?? []);
      if (cur.has(key)) cur.delete(key);
      else cur.add(key);
      await saveProfile({ equipment: [...cur] });
    },
    [profile, saveProfile],
  );

  const addCustomExercise = useCallback(
    async (e: { name: string; primary: string[]; equipment: string; steps: string[] }) => {
      const { data, error } = await supabase
        .from('custom_exercises')
        .insert({ name: e.name, primary_muscles: e.primary, equipment: e.equipment, instructions: e.steps })
        .select()
        .single();
      if (error) throw new Error(error.message);
      const list = [...customExercises, toExercise(data)];
      setCustomExercises(list);
      setCustom(list);
    },
    [customExercises],
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const equipment = useMemo(() => new Set(profile?.equipment ?? []), [profile]);

  const value: Store = {
    ready, session, profile, plan, customExercises, equipment,
    saveProfile, savePlan, regeneratePlan, toggleEquipment, setEquipment, addCustomExercise, signOut,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore outside provider');
  return s;
}
