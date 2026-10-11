import type { Session } from '@supabase/supabase-js';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { JETTS_NEWTOWN_TEMPLATE } from '../data/machines';
import { Exercise, setCustomExercises } from './exercises';
import { generatePlan, PlanData, Profile } from './planner';
import { Food, FoodEntry } from './nutrition';
import { GymVisit, LogRow, todayISO } from './progress';
import { Recipe } from './recipes';
import { Alarm } from './alarms';
import { ProgressPhoto } from './photos';
import { Reminder } from './reminders';
import { ActivityLog, SleepLog, TaskItem, WeightLog } from './tracker';
import { supabase } from './supabase';

type PlanRow = { id: string; name: string; data: PlanData };

type Store = {
  ready: boolean;
  session: Session | null;
  profile: Profile | null;
  plan: PlanRow | null;
  customExercises: Exercise[];
  equipment: Set<string>;
  logs: LogRow[];
  addLog: (row: Omit<LogRow, 'id'>) => Promise<LogRow>;
  updateLog: (id: string, changes: Partial<LogRow>) => Promise<void>;
  deleteLog: (id: string) => Promise<void>;
  visits: GymVisit[];
  activeVisit: GymVisit | null;
  startVisit: (title?: string) => Promise<GymVisit | null>;
  endVisit: () => Promise<void>;
  foodEntries: FoodEntry[];
  myFoods: Food[];
  water: Record<string, number>;
  addFoodEntry: (e: Omit<FoodEntry, 'id'>) => Promise<void>;
  updateFoodEntry: (id: string, ch: Partial<FoodEntry>) => Promise<void>;
  deleteFoodEntry: (id: string) => Promise<void>;
  saveFood: (f: Food) => Promise<void>;
  /** The day picked in the header. Food, workouts, sleep, weight and time are saved to this day. */
  date: string;
  setDate: (d: string) => void;
  sharedFoods: Food[];
  addSharedFood: (f: Food) => Promise<Food>;
  updateSharedFood: (id: string, f: Food) => Promise<Food>;
  setWater: (day: string, ml: number) => Promise<void>;
  sleep: SleepLog[];
  activities: ActivityLog[];
  saveSleep: (row: SleepLog) => Promise<void>;
  addActivity: (row: Omit<ActivityLog, 'id'>) => Promise<ActivityLog>;
  updateActivity: (id: string, ch: Partial<ActivityLog>) => Promise<void>;
  deleteActivity: (id: string) => Promise<void>;
  recipes: Recipe[];
  saveRecipe: (r: Omit<Recipe, 'id'> & { id?: string }) => Promise<Recipe>;
  deleteRecipe: (id: string) => Promise<void>;
  tasks: TaskItem[];
  addTask: (row: Omit<TaskItem, 'id' | 'done' | 'done_at'>) => Promise<TaskItem>;
  updateTask: (id: string, ch: Partial<TaskItem>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  reminders: Reminder[];
  addReminder: (row: Omit<Reminder, 'id'>) => Promise<Reminder>;
  updateReminder: (id: string, ch: Partial<Reminder>) => Promise<void>;
  deleteReminder: (id: string) => Promise<void>;
  alarms: Alarm[];
  addAlarm: (row: Omit<Alarm, 'id'>) => Promise<Alarm>;
  updateAlarm: (id: string, ch: Partial<Alarm>) => Promise<void>;
  deleteAlarm: (id: string) => Promise<void>;
  refreshActivities: () => Promise<void>;
  weights: WeightLog[];
  logWeight: (row: WeightLog) => Promise<void>;
  deleteWeight: (day: string) => Promise<void>;
  saveProfile: (p: Partial<Profile>) => Promise<Profile>;
  uploadAvatar: (uri: string) => Promise<string>;
  removeAvatar: () => Promise<void>;
  progressPhotos: ProgressPhoto[];
  addProgressPhoto: (uri: string, day: string, note?: string | null) => Promise<ProgressPhoto>;
  deleteProgressPhoto: (id: string) => Promise<void>;
  /** Private bucket, so there is no public url; this signs however many ids are visible right now, good for an hour. */
  signProgressPhotos: (ids: string[]) => Promise<Record<string, string>>;
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
  height_cm: null,
  weight_kg: null,
  sex: null,
  birth_year: null,
  birth_date: null,
  job_activity: 'light',
  work_hours_week: null,
  work_hours_by_day: null,
  target_weight_kg: null,
  calorie_override: null,
  water_goal_ml: null,
  time_categories: null,
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

const FOOD_NUMBERS = ['kcal_100', 'protein_100', 'carbs_100', 'sugars_100', 'fat_100', 'sat_fat_100', 'fibre_100', 'sodium_100', 'serving_g'];

/** A row of the shared foods table as a Food, marked with who added or last edited it. */
function sharedFromRow(r: any, uid: string): Food {
  const o: any = { ...r };
  for (const k of FOOD_NUMBERS) if (o[k] != null) o[k] = Number(o[k]);
  const last = r.updated_by ?? r.created_by;
  const food: Food = {
    id: o.id, name: o.name, brand: o.brand, barcode: o.barcode,
    kcal_100: o.kcal_100, protein_100: o.protein_100, carbs_100: o.carbs_100, sugars_100: o.sugars_100,
    fat_100: o.fat_100, sat_fat_100: o.sat_fat_100, fibre_100: o.fibre_100, sodium_100: o.sodium_100,
    serving_g: o.serving_g, serving_label: o.serving_label, unit: o.unit, source: 'User added',
    shared: { action: r.updated_by ? 'edited' : 'added', by: last === uid ? 'you' : 'other', updated_at: r.updated_at },
  };
  return food;
}

/** Only the food fields go to the database. Who added or edited it is filled in there. */
function sharedRow(f: Food) {
  return {
    name: f.name, brand: f.brand ?? null, barcode: f.barcode ?? null,
    kcal_100: f.kcal_100, protein_100: f.protein_100, carbs_100: f.carbs_100, sugars_100: f.sugars_100 ?? null,
    fat_100: f.fat_100, sat_fat_100: f.sat_fat_100 ?? null, fibre_100: f.fibre_100 ?? null, sodium_100: f.sodium_100 ?? null,
    serving_g: f.serving_g ?? null, serving_label: f.serving_label ?? null, unit: f.unit ?? 'g',
  };
}

/** The fields of `next` that differ from `base`, so a save sends only what was edited. */
export function onlyChanged<T extends Record<string, any>>(base: Record<string, any> | null | undefined, next: T): Partial<T> {
  const out: Record<string, any> = {};
  for (const k of Object.keys(next)) if (JSON.stringify(base?.[k] ?? null) !== JSON.stringify(next[k] ?? null)) out[k] = next[k];
  return out as Partial<T>;
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [plan, setPlan] = useState<PlanRow | null>(null);
  const [customExercises, setCustom] = useState<Exercise[]>([]);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [visits, setVisits] = useState<GymVisit[]>([]);
  const [foodEntries, setFoodEntries] = useState<FoodEntry[]>([]);
  const [myFoods, setMyFoods] = useState<Food[]>([]);
  const [sharedFoods, setSharedFoods] = useState<Food[]>([]);
  const [date, setDate] = useState(() => {
    const n = new Date();
    const z = (v: number) => String(v).padStart(2, '0');
    return `${n.getFullYear()}-${z(n.getMonth() + 1)}-${z(n.getDate())}`;
  });
  const [water, setWaterState] = useState<Record<string, number>>({});
  const [sleep, setSleep] = useState<SleepLog[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [weights, setWeights] = useState<WeightLog[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [progressPhotos, setProgressPhotos] = useState<ProgressPhoto[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);

  const loadUserData = useCallback(async (s: Session | null) => {
    if (!s) {
      setProfile(null);
      setPlan(null);
      setCustom([]);
      setCustomExercises([]);
      setLogs([]);
      setVisits([]);
      setFoodEntries([]);
      setMyFoods([]);
      setSharedFoods([]);
      setWaterState({});
      setSleep([]);
      setActivities([]);
      setWeights([]);
      setTasks([]);
      setReminders([]);
      setAlarms([]);
      setProgressPhotos([]);
      setRecipes([]);
      return;
    }
    const since = new Date(Date.now() - 365 * 864e5).toISOString().slice(0, 10);
    const [pr, pl, cx, lg, gv, fe, fd, wl, sl, al, wt, sf, tk, rc] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', s.user.id).maybeSingle(),
      supabase.from('plans').select('id,name,data').eq('is_active', true).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('custom_exercises').select('*').order('created_at'),
      supabase.from('workout_logs').select('id,performed_on,exercise_id,set_number,reps,weight_kg,unit,session_title,target_reps,metric,created_at')
        .gte('performed_on', since).order('performed_on', { ascending: false }).limit(5000),
      supabase.from('gym_visits').select('id,visit_date,started_at,ended_at,session_title')
        .gte('visit_date', since).order('started_at', { ascending: false }).limit(1000),
      supabase.from('food_entries').select('*').gte('eaten_on', since).order('created_at', { ascending: true }).limit(5000),
      supabase.from('foods').select('*').order('created_at', { ascending: false }).limit(500),
      supabase.from('water_logs').select('day,ml').gte('day', since).limit(500),
      supabase.from('sleep_logs').select('night_of,bed_time,wake_time,minutes,note').gte('night_of', since).order('night_of', { ascending: false }).limit(400),
      supabase.from('activity_logs').select('id,day,title,description,category,started_at,ended_at,minutes,segments').gte('day', since).order('created_at', { ascending: true }).limit(2000),
      supabase.from('weight_logs').select('day,kg,waist_cm').order('day', { ascending: true }).limit(2000),
      supabase.from('shared_foods').select('*').order('updated_at', { ascending: false }).limit(3000),
      supabase.from('tasks').select('id,day,title,category,target_minutes,done,done_at').gte('day', since).order('created_at', { ascending: true }).limit(3000),
      supabase.from('recipes').select('id,name,servings,cooked_g,items,notes').order('updated_at', { ascending: false }).limit(500),
    ]);
    setRecipes(((rc.data ?? []) as any[]).map((r) => ({ ...r, servings: Number(r.servings), cooked_g: r.cooked_g == null ? null : Number(r.cooked_g), items: r.items ?? [] })));
    setTasks((tk.data ?? []) as TaskItem[]);
    const { data: rmData } = await supabase.from('reminders').select('id,title,remind_time,repeat,remind_date').order('created_at', { ascending: true });
    setReminders((rmData ?? []) as Reminder[]);
    const { data: alData } = await supabase.from('alarms').select('id,label,alarm_time,repeat,days,alarm_date,sound,vibrate,vibration_pattern,repeat_count,enabled').order('created_at', { ascending: true });
    setAlarms((alData ?? []) as Alarm[]);
    const { data: ppData } = await supabase.from('progress_photos').select('id,day,note,created_at').order('day', { ascending: false });
    setProgressPhotos((ppData ?? []) as ProgressPhoto[]);
    setSharedFoods(((sf.data ?? []) as any[]).map((r) => sharedFromRow(r, s.user.id)));
    setWeights(((wt.data ?? []) as any[]).map((r) => ({ day: r.day, kg: r.kg == null ? null : Number(r.kg), waist_cm: r.waist_cm == null ? null : Number(r.waist_cm) })));
    setSleep((sl.data ?? []) as SleepLog[]);
    setActivities((al.data ?? []) as ActivityLog[]);
    const numify = (r: any) => {
      const o: any = { ...r };
      for (const k of ['amount', 'kcal', 'protein_g', 'carbs_g', 'sugars_g', 'fat_g', 'sat_fat_g', 'fibre_g', 'sodium_mg'])
        if (o[k] != null) o[k] = Number(o[k]);
      return o as FoodEntry;
    };
    setFoodEntries(((fe.data ?? []) as any[]).map(numify));
    setMyFoods(((fd.data ?? []) as any[]).map((r) => {
      const o: any = { ...r };
      for (const k of ['kcal_100', 'protein_100', 'carbs_100', 'sugars_100', 'fat_100', 'sat_fat_100', 'fibre_100', 'sodium_100', 'serving_g'])
        if (o[k] != null) o[k] = Number(o[k]);
      return o as Food;
    }));
    setWaterState(Object.fromEntries(((wl.data ?? []) as any[]).map((r) => [r.day, Number(r.ml)])));
    // Close timers left running (forgot to press Finish): end them at the last set logged, or after 90 min.
    const vis = (gv.data ?? []) as GymVisit[];
    const logRows = (lg.data ?? []) as any[];
    for (const v of vis) {
      if (v.ended_at) continue;
      const start = new Date(v.started_at).getTime();
      if (Date.now() - start < 4 * 3600e3) continue;
      const lastSet = logRows
        .filter((r) => r.created_at && new Date(r.created_at).getTime() > start && new Date(r.created_at).getTime() < start + 4 * 3600e3)
        .map((r) => new Date(r.created_at).getTime())
        .sort((a, b) => b - a)[0];
      const end = new Date(lastSet ? lastSet + 3 * 60e3 : start + 90 * 60e3).toISOString();
      v.ended_at = end;
      supabase.from('gym_visits').update({ ended_at: end }).eq('id', v.id).then(() => {});
    }
    setVisits(vis);
    setLogs(((lg.data ?? []) as any[]).map((r) => ({ ...r, weight_kg: r.weight_kg == null ? null : Number(r.weight_kg) })));
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

  // Only the fields you changed are sent. Sending a whole stale copy of the profile from an old screen
  // used to wipe out things saved somewhere else in the meantime, like your body stats.
  const saveProfile = useCallback(
    async (changes: Partial<Profile>) => {
      if (!session) throw new Error('Not signed in');
      if (!ready) throw new Error('Still loading your profile. Try again in a moment.');
      const { id: _ignored, ...fields } = changes as any;
      const stamp = { updated_at: new Date().toISOString() };
      const query = profile
        ? supabase.from('profiles').update({ ...fields, ...stamp }).eq('id', session.user.id)
        : supabase.from('profiles').upsert({ ...DEFAULT_PROFILE, ...fields, id: session.user.id, ...stamp });
      const { data, error } = await query.select().single();
      if (error) throw new Error(error.message);
      setProfile(data as Profile);
      return data as Profile;
    },
    [session, profile, ready],
  );

  /** Picked photo (a local file or blob address) uploaded as this user's avatar. Returns the address to show it from. */
  const uploadAvatar = useCallback(
    async (uri: string) => {
      if (!session) throw new Error('Not signed in');
      const res = await fetch(uri);
      const blob = await res.blob();
      const path = `${session.user.id}/avatar.jpg`;
      const { error } = await supabase.storage.from('avatars').upload(path, blob, { contentType: blob.type || 'image/jpeg', upsert: true });
      if (error) throw new Error(error.message);
      // Same file name every time a photo is changed, so a fresh tag on the end is what makes the new one actually show instead of a cached old one.
      const url = `${supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl}?t=${Date.now()}`;
      await saveProfile({ avatar_url: url });
      return url;
    },
    [session, saveProfile],
  );

  const removeAvatar = useCallback(async () => {
    if (!session) throw new Error('Not signed in');
    await supabase.storage.from('avatars').remove([`${session.user.id}/avatar.jpg`]);
    await saveProfile({ avatar_url: null });
  }, [session, saveProfile]);

  // Unlike the avatar, this bucket is private (nobody else can see these, not even other signed in users),
  // so the row is inserted first to get a real id, which also becomes the file's own name, then the file is
  // uploaded under it; if the upload fails the row is removed again rather than left pointing at nothing.
  const addProgressPhoto = useCallback(
    async (uri: string, day: string, note?: string | null) => {
      if (!session) throw new Error('Not signed in');
      const { data: row, error: insertErr } = await supabase.from('progress_photos').insert({ day, note: note ?? null }).select('id,day,note,created_at').single();
      if (insertErr) throw new Error(insertErr.message);
      try {
        const res = await fetch(uri);
        const blob = await res.blob();
        const path = `${session.user.id}/${row.id}.jpg`;
        const { error: upErr } = await supabase.storage.from('progress_photos').upload(path, blob, { contentType: blob.type || 'image/jpeg' });
        if (upErr) throw new Error(upErr.message);
      } catch (e) {
        await supabase.from('progress_photos').delete().eq('id', row.id);
        throw e;
      }
      setProgressPhotos((l) => [row as ProgressPhoto, ...l].sort((a, b) => b.day.localeCompare(a.day)));
      return row as ProgressPhoto;
    },
    [session],
  );

  const deleteProgressPhoto = useCallback(async (id: string) => {
    if (!session) throw new Error('Not signed in');
    setProgressPhotos((l) => l.filter((p) => p.id !== id));
    await supabase.storage.from('progress_photos').remove([`${session.user.id}/${id}.jpg`]);
    const { error } = await supabase.from('progress_photos').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }, [session]);

  const signProgressPhotos = useCallback(
    async (ids: string[]) => {
      if (!session || ids.length === 0) return {};
      const paths = ids.map((id) => `${session.user.id}/${id}.jpg`);
      const { data, error } = await supabase.storage.from('progress_photos').createSignedUrls(paths, 3600);
      if (error || !data) return {};
      const out: Record<string, string> = {};
      data.forEach((d, i) => { if (d.signedUrl) out[ids[i]] = d.signedUrl; });
      return out;
    },
    [session],
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

  const addLog = useCallback(async (row: Omit<LogRow, 'id'>) => {
    const { data, error } = await supabase.from('workout_logs').insert(row).select().single();
    if (error) throw new Error(error.message);
    const r = { ...(data as any), weight_kg: data.weight_kg == null ? null : Number(data.weight_kg) } as LogRow;
    setLogs((l) => [r, ...l]);
    return r;
  }, []);

  const updateLog = useCallback(async (id: string, changes: Partial<LogRow>) => {
    setLogs((l) => l.map((r) => (r.id === id ? { ...r, ...changes } : r)));
    const { error } = await supabase.from('workout_logs').update(changes).eq('id', id);
    if (error) throw new Error(error.message);
  }, []);

  const deleteLog = useCallback(async (id: string) => {
    setLogs((l) => l.filter((r) => r.id !== id));
    const { error } = await supabase.from('workout_logs').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }, []);

  const activeVisit = useMemo(() => visits.find((v) => !v.ended_at) ?? null, [visits]);

  const startVisit = useCallback(async (title?: string) => {
    const open = visits.find((v) => !v.ended_at);
    if (open) return open;
    const { data, error } = await supabase
      .from('gym_visits')
      .insert({ visit_date: todayISO(), started_at: new Date().toISOString(), session_title: title ?? null })
      .select('id,visit_date,started_at,ended_at,session_title')
      .single();
    if (error) { console.warn(error.message); return null; }
    setVisits((vs) => [data as GymVisit, ...vs]);
    return data as GymVisit;
  }, [visits]);

  const endVisit = useCallback(async () => {
    const open = visits.find((v) => !v.ended_at);
    if (!open) return;
    const end = new Date().toISOString();
    setVisits((vs) => vs.map((v) => (v.id === open.id ? { ...v, ended_at: end } : v)));
    const { error } = await supabase.from('gym_visits').update({ ended_at: end }).eq('id', open.id);
    if (error) console.warn(error.message);
  }, [visits]);

  const addFoodEntry = useCallback(async (e: Omit<FoodEntry, 'id'>) => {
    const { data, error } = await supabase.from('food_entries').insert(e).select().single();
    if (error) throw new Error(error.message);
    setFoodEntries((l) => [...l, data as FoodEntry]);
  }, []);

  const updateFoodEntry = useCallback(async (id: string, ch: Partial<FoodEntry>) => {
    setFoodEntries((l) => l.map((r) => (r.id === id ? { ...r, ...ch } : r)));
    const { error } = await supabase.from('food_entries').update(ch).eq('id', id);
    if (error) throw new Error(error.message);
  }, []);

  const deleteFoodEntry = useCallback(async (id: string) => {
    setFoodEntries((l) => l.filter((r) => r.id !== id));
    const { error } = await supabase.from('food_entries').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }, []);

  const saveFood = useCallback(async (f: Food) => {
    const row: any = { ...f };
    delete row.id;
    delete row._nz;
    delete row.shared;
    const { data, error } = await supabase
      .from('foods')
      .upsert(row, f.barcode ? { onConflict: 'user_id,barcode' } : undefined)
      .select()
      .single();
    if (error) { console.warn(error.message); return; }
    setMyFoods((l) => [data as Food, ...l.filter((x) => x.id !== (data as Food).id && (!f.barcode || x.barcode !== f.barcode))]);
  }, []);

  // Foods anyone added. The database records who added and who last edited each one.
  const addSharedFood = useCallback(async (f: Food) => {
    if (!session) throw new Error('Not signed in');
    const { data, error } = await supabase.from('shared_foods').insert(sharedRow(f)).select().single();
    if (error) throw new Error(error.message);
    const food = sharedFromRow(data, session.user.id);
    setSharedFoods((l) => [food, ...l]);
    return food;
  }, [session]);

  const updateSharedFood = useCallback(async (id: string, f: Food) => {
    if (!session) throw new Error('Not signed in');
    const { data, error } = await supabase.from('shared_foods').update(sharedRow(f)).eq('id', id).select().single();
    if (error) throw new Error(error.message);
    const food = sharedFromRow(data, session.user.id);
    setSharedFoods((l) => [food, ...l.filter((x) => x.id !== id)]);
    return food;
  }, [session]);

  const setWater = useCallback(async (day: string, ml: number) => {
    const v = Math.max(0, Math.round(ml));
    setWaterState((w) => ({ ...w, [day]: v }));
    const { error } = await supabase.from('water_logs').upsert({ day, ml: v }, { onConflict: 'user_id,day' });
    if (error) console.warn(error.message);
  }, []);

  const saveSleep = useCallback(async (row: SleepLog) => {
    setSleep((l) => [row, ...l.filter((x) => x.night_of !== row.night_of)]);
    const { error } = await supabase.from('sleep_logs').upsert(row, { onConflict: 'user_id,night_of' });
    if (error) console.warn(error.message);
  }, []);

  const addActivity = useCallback(async (row: Omit<ActivityLog, 'id'>) => {
    const { data, error } = await supabase.from('activity_logs').insert(row).select().single();
    if (error) throw new Error(error.message);
    setActivities((l) => [...l, data as ActivityLog]);
    return data as ActivityLog;
  }, []);

  const updateActivity = useCallback(async (id: string, ch: Partial<ActivityLog>) => {
    setActivities((l) => l.map((r) => (r.id === id ? { ...r, ...ch } : r)));
    const { error } = await supabase.from('activity_logs').update(ch).eq('id', id);
    if (error) throw new Error(error.message);
  }, []);

  const deleteActivity = useCallback(async (id: string) => {
    setActivities((l) => l.filter((r) => r.id !== id));
    const { error } = await supabase.from('activity_logs').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }, []);

  const addReminder = useCallback(async (row: Omit<Reminder, 'id'>) => {
    const { data, error } = await supabase.from('reminders').insert(row).select('id,title,remind_time,repeat,remind_date').single();
    if (error) throw new Error(error.message);
    setReminders((l) => [...l, data as Reminder]);
    return data as Reminder;
  }, []);

  const updateReminder = useCallback(async (id: string, ch: Partial<Reminder>) => {
    setReminders((l) => l.map((r) => (r.id === id ? { ...r, ...ch } : r)));
    const { error } = await supabase.from('reminders').update(ch).eq('id', id);
    if (error) throw new Error(error.message);
  }, []);

  const deleteReminder = useCallback(async (id: string) => {
    setReminders((l) => l.filter((r) => r.id !== id));
    const { error } = await supabase.from('reminders').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }, []);

  const ALARM_COLS = 'id,label,alarm_time,repeat,days,alarm_date,sound,vibrate,vibration_pattern,repeat_count,enabled';
  const addAlarm = useCallback(async (row: Omit<Alarm, 'id'>) => {
    const { data, error } = await supabase.from('alarms').insert(row).select(ALARM_COLS).single();
    if (error) throw new Error(error.message);
    setAlarms((l) => [...l, data as Alarm]);
    return data as Alarm;
  }, []);

  const updateAlarm = useCallback(async (id: string, ch: Partial<Alarm>) => {
    setAlarms((l) => l.map((a) => (a.id === id ? { ...a, ...ch } : a)));
    const { error } = await supabase.from('alarms').update(ch).eq('id', id);
    if (error) throw new Error(error.message);
  }, []);

  const deleteAlarm = useCallback(async (id: string) => {
    setAlarms((l) => l.filter((a) => a.id !== id));
    const { error } = await supabase.from('alarms').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }, []);

  const addTask = useCallback(async (row: Omit<TaskItem, 'id' | 'done' | 'done_at'>) => {
    const { data, error } = await supabase.from('tasks').insert(row).select('id,day,title,category,target_minutes,done,done_at').single();
    if (error) throw new Error(error.message);
    setTasks((l) => [...l, data as TaskItem]);
    return data as TaskItem;
  }, []);

  const updateTask = useCallback(async (id: string, ch: Partial<TaskItem>) => {
    setTasks((l) => l.map((r) => (r.id === id ? { ...r, ...ch } : r)));
    const { error } = await supabase.from('tasks').update(ch).eq('id', id);
    if (error) throw new Error(error.message);
  }, []);

  const deleteTask = useCallback(async (id: string) => {
    setTasks((l) => l.filter((r) => r.id !== id));
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }, []);

  const saveRecipe = useCallback(async (r: Omit<Recipe, 'id'> & { id?: string }) => {
    const row = { name: r.name, servings: r.servings, cooked_g: r.cooked_g ?? null, items: r.items, notes: r.notes ?? null, updated_at: new Date().toISOString() };
    const q = r.id ? supabase.from('recipes').update(row).eq('id', r.id) : supabase.from('recipes').insert(row);
    const { data, error } = await q.select('id,name,servings,cooked_g,items,notes').single();
    if (error) throw new Error(error.message);
    const saved = { ...(data as any), servings: Number((data as any).servings), cooked_g: (data as any).cooked_g == null ? null : Number((data as any).cooked_g) } as Recipe;
    setRecipes((l) => [saved, ...l.filter((x) => x.id !== saved.id)]);
    return saved;
  }, []);

  const deleteRecipe = useCallback(async (id: string) => {
    setRecipes((l) => l.filter((r) => r.id !== id));
    const { error } = await supabase.from('recipes').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }, []);

  // A timer started on another device shows up here when the app comes back to the front.
  const refreshActivities = useCallback(async () => {
    const since = new Date(Date.now() - 365 * 864e5).toISOString().slice(0, 10);
    const { data, error } = await supabase.from('activity_logs').select('id,day,title,description,category,started_at,ended_at,minutes,segments')
      .gte('day', since).order('created_at', { ascending: true }).limit(2000);
    if (!error && data) setActivities(data as ActivityLog[]);
  }, []);

  const logWeight = useCallback(async (row: WeightLog) => {
    const next = [...weights.filter((w) => w.day !== row.day), row].sort((a, b) => (a.day < b.day ? -1 : 1));
    setWeights(next);
    const { error } = await supabase.from('weight_logs').upsert(row, { onConflict: 'user_id,day' });
    if (error) throw new Error(error.message);
    // The newest weigh in becomes your current weight, so calorie targets follow it.
    const latest = [...next].reverse().find((w) => w.kg != null);
    if (latest && latest.day === row.day && row.kg != null && Number(profile?.weight_kg) !== row.kg) await saveProfile({ weight_kg: row.kg });
  }, [weights, profile, saveProfile]);

  const deleteWeight = useCallback(async (day: string) => {
    setWeights((l) => l.filter((w) => w.day !== day));
    const { error } = await supabase.from('weight_logs').delete().eq('day', day);
    if (error) throw new Error(error.message);
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const equipment = useMemo(() => new Set(profile?.equipment ?? []), [profile]);

  const value: Store = {
    ready, session, profile, plan, customExercises, equipment, logs, addLog, updateLog, deleteLog, visits, activeVisit, startVisit, endVisit,
    foodEntries, myFoods, water, addFoodEntry, updateFoodEntry, deleteFoodEntry, saveFood, sharedFoods, addSharedFood, updateSharedFood, setWater, date, setDate,
    sleep, activities, saveSleep, addActivity, updateActivity, deleteActivity, tasks, addTask, updateTask, deleteTask, reminders, addReminder, updateReminder, deleteReminder, alarms, addAlarm, updateAlarm, deleteAlarm, recipes, saveRecipe, deleteRecipe, refreshActivities, weights, logWeight, deleteWeight,
    saveProfile, uploadAvatar, removeAvatar, progressPhotos, addProgressPhoto, deleteProgressPhoto, signProgressPhotos, savePlan, regeneratePlan, toggleEquipment, setEquipment, addCustomExercise, signOut,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore outside provider');
  return s;
}
