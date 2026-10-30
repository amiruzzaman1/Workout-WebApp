// What the coach says in the speech bubble above today's quests, like the little character in a language app:
// cheeky when you have done nothing, hyped as you go, and delighted when you finish. Goku is loud and angry,
// Mirko is flirty and sweet. About effort, never about bodies, and no dashes.
import { CoachStyle } from './coachStyle';

export type BanterState = 'start' | 'going' | 'almost' | 'perfect';

const GOKU: Record<BanterState, string[]> = {
  start: [
    'Zero quests done, {name}? My power level is higher than your motivation 😤',
    'The quests are not going to finish themselves. MOVE 💢',
    '{left} quests waiting. Do not make me come over there 🔥',
    'Even Krillin has done something today. Start with ONE 😡',
    'Day is young and so are your excuses. Pick a quest, any quest 💪',
    'Level up or stay a Rookie. Your call, {name} 😤',
  ],
  going: [
    '{done} down, {left} to go. Do not stop now 🔥',
    'Not bad, {name}. Not good either. Keep going 😤',
    'I see progress. Do not get cocky 💢',
    'More! The quests are not scared of you yet 💪',
    'Momentum is building. Ride it 🚀',
    '{left} left. Finish them before the day finishes you 😡',
  ],
  almost: [
    'ONE quest left. Finish it. NOW 🔥',
    'So close I can taste it. One more, {name}! 💪',
    'Do not choke on the last one 😤',
    'The final quest is looking at you. Look back 😡',
    'One. More. Quest. Go go go! 💢',
    'Perfect day is right there. Grab it 🏆',
  ],
  perfect: [
    'PERFECT DAY! I am almost proud of you, {name} 🏆',
    'Every quest done. That is how a Saiyan trains 🔥',
    'Hmph. Fine. That was impressive. Do it again tomorrow 💪',
    'Perfect day! Rest, eat, sleep, repeat 😤',
    'Nothing left to yell about. Suspicious... great job, {name} 🌟',
    'All done! Your future self owes you a thank you 👑',
  ],
};

const MIRKO: Record<BanterState, string[]> = {
  start: [
    'Good day, {name} 😘 {left} little quests are waiting for you',
    'Start with the easiest one for me? 🥰',
    'I believe in you, cutie. One quest and you are rolling 💕',
    'Today is a blank page and I would love to read it 😉',
    'Pick one quest and I will cheer so loud 📣',
    'Come on, {name}, make me smile with your first win ✨',
  ],
  going: [
    '{done} done already? I am so proud of you 😘',
    'Look at you go, {name}! {left} more and you shine 💖',
    'You are doing great, gorgeous. Keep that rhythm 🥰',
    'I love this energy. Another one? 😏',
    'Slow and steady looks so good on you 💕',
    '{left} to go and you have got this, cutie ✨',
  ],
  almost: [
    'Just ONE more, {name}! I will be right here 🥺',
    'So close, gorgeous. Finish it for me? 😘',
    'The last quest is blushing, go say hi 💕',
    'You are one step from a perfect day 🌟',
    'One more and I will give you my biggest cheer 📣',
    'Almost there, cutie. Do not stop now 🥰',
  ],
  perfect: [
    'PERFECT DAY, {name}! Come here for a kiss on the cheek 😘',
    'Every single quest, wow. You are amazing 🌟',
    'I could not be prouder. Rest well tonight 💖',
    'You did it all! Treat yourself to something lovely 🥰',
    'A perfect day looks so good on you 😏🏆',
    'All done! Tomorrow I will be cheering again 💕',
  ],
};

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export function stateOf(done: number, total: number): BanterState {
  if (total > 0 && done >= total) return 'perfect';
  if (total - done === 1 && done > 0) return 'almost';
  return done === 0 ? 'start' : 'going';
}

/** One line for the bubble. The same moment gives the same line (so it does not flicker), a new moment a new one. */
export function banterLine(style: CoachStyle, done: number, total: number, name: string, day: string): string {
  const state = stateOf(done, total);
  const pool = (style === 'male' ? GOKU : MIRKO)[state];
  const line = pool[hash(`${day}${state}${done}`) % pool.length];
  return line.replace(/\{name\}/g, name).replace(/\{left\}/g, String(Math.max(0, total - done))).replace(/\{done\}/g, String(done));
}
