import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ageFromDate, DAY_LABELS, isValidDate, JOB_DESCRIPTIONS, JOB_LABELS, JobActivity } from '../lib/nutrition';
import { C, F } from '../lib/theme';
import { Chip, Input, Label, Row } from './ui';

/** A number you can type, with − / + buttons for small adjustments. */
export function NumberField({
  value, onChange, step = 1, suffix, placeholder, min = 0, max = 100000, decimals = 1,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  step?: number;
  suffix?: string;
  placeholder?: string;
  min?: number;
  max?: number;
  decimals?: number;
}) {
  const fmt = (v: number) => String(Math.round(v * 10 ** decimals) / 10 ** decimals);
  const [text, setText] = useState(value == null ? '' : fmt(value));

  // Keep in sync when the value changes elsewhere (slider, stepper, profile load).
  useEffect(() => {
    const asNum = Number(text.replace(',', '.'));
    if (value == null && text !== '') setText('');
    else if (value != null && (Number.isNaN(asNum) || Math.abs(asNum - value) > 1e-6)) setText(fmt(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // While typing, don't clamp, because "8" on its way to "82" must not jump to the minimum.
  const commit = (raw: string, final = false) => {
    const n = Number(raw.replace(',', '.'));
    if (raw.trim() === '' || Number.isNaN(n)) return onChange(null);
    onChange(final ? Math.min(max, Math.max(min, n)) : Math.min(max, n));
  };
  const bump = (d: number) => {
    const base = value ?? (Number(text.replace(',', '.')) || 0);
    const next = Math.min(max, Math.max(min, Math.round((base + d) * 10 ** decimals) / 10 ** decimals));
    setText(fmt(next));
    onChange(next);
  };

  return (
    <Row style={{ gap: 0 }}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Input
          value={text}
          onChangeText={(t) => { const c = t.replace(/[^0-9.,]/g, ''); setText(c); commit(c); }}
          onBlur={() => commit(text, true)}
          keyboardType="decimal-pad"
          placeholder={placeholder}
          style={{ borderTopRightRadius: 0, borderBottomRightRadius: 0, borderRightWidth: 0 }}
        />
        {!!suffix && <Text style={st.suffix}>{suffix}</Text>}
      </View>
      <Pressed label="−" onPress={() => bump(-step)} />
      <Pressed label="+" onPress={() => bump(step)} last />
    </Row>
  );
}

function Pressed({ label, onPress, last }: { label: string; onPress: () => void; last?: boolean }) {
  return (
    <Text
      onPress={onPress}
      suppressHighlighting
      style={[st.btn, last && { borderTopRightRadius: 4, borderBottomRightRadius: 4 }, !last && { borderRightWidth: 0 }]}
    >
      {label}
    </Text>
  );
}

/** Small number box that keeps what you typed (so "5." can become "5.5"). */
export function HoursInput({ value, onChange, placeholder = '0' }: { value: number | null; onChange: (v: number | null) => void; placeholder?: string }) {
  const [text, setText] = useState(value == null ? '' : String(value));
  useEffect(() => {
    const asNum = Number(text.replace(',', '.'));
    if (value == null && text !== '') setText('');
    else if (value != null && (Number.isNaN(asNum) || Math.abs(asNum - value) > 1e-6)) setText(String(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <Input
      value={text}
      onChangeText={(t) => {
        const c = t.replace(/[^0-9.,]/g, '').replace(',', '.');
        setText(c);
        const n = Number(c);
        onChange(c === '' || Number.isNaN(n) ? null : Math.min(24, n));
      }}
      onBlur={() => {
        const n = Number(text.replace(',', '.'));
        if (text !== '' && !Number.isNaN(n)) { const v = Math.min(24, Math.max(0, n)); setText(String(v)); onChange(v); }
      }}
      keyboardType="decimal-pad"
      placeholder={placeholder}
      style={{ textAlign: 'center' }}
    />
  );
}

/** Day / month / year of birth, with the age shown underneath. */
export function DobInput({ value, onChange }: { value: string | null; onChange: (iso: string | null) => void }) {
  const parts = value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value.split('-') : null;
  const [d, setD] = useState(parts ? String(Number(parts[2])) : '');
  const [m, setM] = useState(parts ? String(Number(parts[1])) : '');
  const [y, setY] = useState(parts ? parts[0] : '');

  useEffect(() => {
    if (!value) return;
    const p = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!p) return;
    if (`${Number(p[3])}` !== d || `${Number(p[2])}` !== m || p[1] !== y) {
      setD(String(Number(p[3]))); setM(String(Number(p[2]))); setY(p[1]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const push = (dd: string, mm: string, yy: string) => {
    const D = Number(dd), M = Number(mm), Y = Number(yy);
    if (yy.length === 4 && isValidDate(Y, M, D)) {
      onChange(`${Y}-${String(M).padStart(2, '0')}-${String(D).padStart(2, '0')}`);
    } else onChange(null);
  };

  const age = ageFromDate(value);
  const complete = d !== '' && m !== '' && y.length === 4;

  return (
    <View style={{ gap: 6 }}>
      <Row style={{ gap: 8 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={st.tiny}>Day</Text>
          <Input value={d} onChangeText={(t) => { const v = t.replace(/\D/g, '').slice(0, 2); setD(v); push(v, m, y); }} keyboardType="number-pad" placeholder="20" />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={st.tiny}>Month</Text>
          <Input value={m} onChangeText={(t) => { const v = t.replace(/\D/g, '').slice(0, 2); setM(v); push(d, v, y); }} keyboardType="number-pad" placeholder="12" />
        </View>
        <View style={{ flex: 1.3, minWidth: 0 }}>
          <Text style={st.tiny}>Year</Text>
          <Input value={y} onChangeText={(t) => { const v = t.replace(/\D/g, '').slice(0, 4); setY(v); push(d, m, v); }} keyboardType="number-pad" placeholder="1999" />
        </View>
      </Row>
      {age != null ? (
        <Text style={st.age}>{age} years old</Text>
      ) : complete ? (
        <Text style={[st.age, { color: C.danger }]}>That date doesn't look right.</Text>
      ) : null}
    </View>
  );
}

const st = StyleSheet.create({
  tiny: { color: C.muted, fontFamily: F.bodyMed, fontSize: 11, marginBottom: 4 },
  age: { color: C.muted, fontFamily: F.bodyMed, fontSize: 12 },
  suffix: { position: 'absolute', right: 12, top: 13, color: C.muted, fontFamily: F.body, fontSize: 13 },
  btn: {
    width: 46, height: 46, lineHeight: 44, textAlign: 'center', color: C.text, fontFamily: F.bodySemi, fontSize: 18,
    borderWidth: 1, borderColor: C.borderStrong, backgroundColor: C.card,
  },
});

/** Job type with an explanation, plus optional work hours (weekly total or per day). */
export function WorkFields({
  job, hoursWeek, byDay, onJob, onHoursWeek, onByDay,
}: {
  job: JobActivity | null;
  hoursWeek: number | null;
  byDay: (number | null)[] | null;
  onJob: (j: JobActivity) => void;
  onHoursWeek: (v: number | null) => void;
  onByDay: (v: (number | null)[] | null) => void;
}) {
  const perDay = !!byDay;
  const total = byDay ? byDay.reduce((a: number, v) => a + (Number(v) || 0), 0) : null;
  const selected = job ?? 'light';

  return (
    <View style={{ gap: 8 }}>
      <Label>Your work</Label>
      <Row wrap>
        {(Object.keys(JOB_LABELS) as JobActivity[]).map((k) => (
          <Chip key={k} label={JOB_LABELS[k]} active={selected === k} onPress={() => onJob(k)} />
        ))}
      </Row>
      <View style={st2.explain}>
        <Text style={st2.explainTitle}>{JOB_LABELS[selected]}</Text>
        <Text style={st2.explainBody}>{JOB_DESCRIPTIONS[selected]}</Text>
      </View>

      <Row style={{ justifyContent: 'space-between', marginTop: 6 }}>
        <Label>Hours you work a week</Label>
        <Text
          onPress={() => (perDay ? onByDay(null) : onByDay([null, null, null, null, null, null, null]))}
          suppressHighlighting
          style={st2.link}
        >
          {perDay ? 'Use a weekly total' : 'Set hours per day'}
        </Text>
      </Row>

      {perDay ? (
        <View style={{ gap: 8 }}>
          <Row wrap style={{ gap: 8 }}>
            {DAY_LABELS.map((d, i) => (
              <View key={d} style={{ width: 78 }}>
                <Text style={st2.dayLabel}>{d}</Text>
                <HoursInput
                  value={byDay![i] == null ? null : Number(byDay![i])}
                  onChange={(v) => onByDay(byDay!.map((x, j) => (j === i ? v : x)))}
                />
              </View>
            ))}
          </Row>
          <Text style={st2.total}>{total ? `${Math.round(total * 10) / 10} hours a week` : 'Fill in the days you work. Half hours are fine (5.5)'}</Text>
        </View>
      ) : (
        <>
          <NumberField value={hoursWeek} onChange={onHoursWeek} step={0.5} min={0} max={100} decimals={1} placeholder="23" suffix="h / week" />
          <Text style={st2.hint}>Optional, and half hours are fine (23.5). Left blank, the app assumes a normal full-time week (38 hours).</Text>
        </>
      )}
    </View>
  );
}

const st2 = StyleSheet.create({
  explain: { borderLeftWidth: 2, borderLeftColor: C.borderStrong, paddingLeft: 12, gap: 2, paddingVertical: 2 },
  explainTitle: { color: C.text, fontFamily: F.bodySemi, fontSize: 13 },
  explainBody: { color: C.muted, fontFamily: F.body, fontSize: 13, lineHeight: 19 },
  link: { color: C.text, fontFamily: F.bodySemi, fontSize: 12, textDecorationLine: 'underline' },
  dayLabel: { color: C.muted, fontFamily: F.bodyMed, fontSize: 11, marginBottom: 4 },
  total: { color: C.text, fontFamily: F.bodyMed, fontSize: 13 },
  hint: { color: C.muted, fontFamily: F.body, fontSize: 12 },
});
