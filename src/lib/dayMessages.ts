// Short lines for the three daily check in notifications (morning, midday, evening), in the same two voices as the
// Dashboard coach (src/lib/coach.ts): Goku pushes with insults and rage bait, Mirko pushes with care. Same rules as
// that file: about effort, never body or identity, no dashes.
import { CoachStyle } from './coachStyle';

const GOKU_MORNING = [
  "Up already? Good. Lying there longer was not going to build anything.",
  "Morning. Today either moves you forward or it does not. Choose forward.",
  "Rise and work. Nobody remembers the day you almost started.",
  "New day, same test. Are you someone who trains, or someone who talks about it?",
  "Good morning. Go prove yesterday was not your best.",
  "Eyes open, excuses closed. Let us go.",
  "Another morning you got for free. Do not waste it being soft on yourself.",
  "Get up. The version of you that skips today is not who we are building.",
];
const MIRKO_MORNING = [
  "Good morning. Whatever today brings, you have already shown up for worse and kept going.",
  "A new day. Be kind to yourself and steady with your effort, both at once.",
  "Morning. One good choice today is enough to build on, you do not need all of them.",
  "You woke up, that is the first win. Carry that forward gently.",
  "Good morning. Today does not need to be perfect, just honest.",
  "Rise slowly if you need to. What matters is that you keep choosing yourself.",
  "A fresh day. I believe you can meet it well, even the small parts of it.",
  "Good morning. You are allowed to be proud of just trying today.",
];
const GOKU_MIDDAY = [
  "Halfway through the day. Have you actually done anything, or just planned to?",
  "Midday check. If today's workout or food is still not logged, that is on you, not the day.",
  "The day is not over, so neither is your excuse window closing. Fix it now.",
  "Still time to make today count. Do not let the afternoon finish what the morning started slacking on.",
  "Check in with yourself. Soft morning, soft afternoon, soft results. Change it.",
  "Midday. Momentum does not wait for you to feel ready.",
];
const MIRKO_MIDDAY = [
  "Just checking in. However the morning went, the afternoon is still yours to shape.",
  "Midday. If you have not eaten well or moved yet, there is still plenty of day left, no rush.",
  "A gentle reminder: log what you have eaten so far, it only takes a moment and it helps.",
  "Halfway through. Take a breath, drink some water, and keep going at your own pace.",
  "Checking in on you. Small good choices this afternoon still count for a lot.",
  "Midday. You do not have to have it all figured out yet, just the next step.",
];
const GOKU_EVENING = [
  "Day's almost done. Was today effort, or was it noise?",
  "Evening check. Log your food and your workout now, memory gets convenient later.",
  "Before you call it a day, be honest with yourself about what you actually did.",
  "Tonight is where today either counts or quietly disappears. Log it.",
  "Evening. Close today out properly, or tomorrow starts from a lie.",
  "Last chance today to act like you meant it. Use it.",
];
const MIRKO_EVENING = [
  "Evening. Before you rest, take a moment to log today, it helps future you see the pattern.",
  "However today went, you are still here, still trying. That matters.",
  "A gentle evening check in: how did eating and moving go today? Worth a quick log either way.",
  "Winding down soon. Log what you can, forgive what you cannot, and rest well.",
  "Evening. Today is nearly done, be proud of the parts that went well.",
  "Before bed, a small check in: you showed up today, in whatever way you could. That counts.",
];

const SLOTS = {
  morning: { goku: GOKU_MORNING, mirko: MIRKO_MORNING, title: 'Good morning' },
  midday: { goku: GOKU_MIDDAY, mirko: MIRKO_MIDDAY, title: 'Midday check in' },
  evening: { goku: GOKU_EVENING, mirko: MIRKO_EVENING, title: 'Evening check in' },
} as const;

export type DaySlot = keyof typeof SLOTS;

/** One random line in the chosen coach's voice for a time of day slot, with the notification title to go with it. */
export function dayMessage(slot: DaySlot, style: CoachStyle): { title: string; body: string } {
  const s = SLOTS[slot];
  const lines = style === 'male' ? s.goku : s.mirko;
  return { title: s.title, body: lines[Math.floor(Math.random() * lines.length)] };
}
