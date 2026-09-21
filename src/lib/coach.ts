// The dashboard's coach. Goku (male) pushes with insults and ego. Mirko (female) is soft spoken and motivating.
import type { CoachStyle } from './coachStyle';
import { todayISO } from './progress';

export type Tone = 'good' | 'bad' | 'neutral';
export type Coach = { tone: Tone; title: string; line: string; streak: number };

type PlanDay = { day: number; sessions: unknown[] };

/** What the coach knows about your progress, besides which days you trained. Anything unknown is null. */
export type CoachContext = {
  hour: number;                 // 0 to 23, local time
  weekday: number;              // 0 is Sunday
  weekDone: number;             // workouts done this week
  weekPlanned: number;          // workouts planned this week
  totalWorkouts: number;        // days with a workout, ever
  daysSinceLast: number | null; // days since the last workout
  foodLogged: boolean;          // any food logged today
  proteinPct: number | null;    // protein eaten today, as 0 to 1 of the target
  waterPct: number | null;      // water drunk today, as 0 to 1 of the target
  sleepMinutes: number | null;  // last night
  kgToward: number | null;      // kg moved toward your goal weight (negative is the wrong way)
  goalPct: number | null;       // how far you are to your goal weight, 0 to 1
};

const z = (n: number) => String(n).padStart(2, '0');
const iso = (d: Date) => `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
function daysBack(from: string, n: number) {
  const d = new Date(`${from}T12:00:00`);
  d.setDate(d.getDate() - n);
  return d;
}

/** Streak = planned sessions done in a row, ignoring rest days. Any missed planned day ends it. */
export function trainingStreak(days: PlanDay[], logged: Set<string>, today = todayISO()) {
  const planned = (d: Date) => days.some((x) => x.day === d.getDay() && x.sessions.length > 0);
  let streak = logged.has(today) ? 1 : 0;
  let missedWeek = 0;
  let missedYesterday = false;
  let open = true;
  for (let n = 1; n <= 60; n++) {
    const d = daysBack(today, n);
    const done = logged.has(iso(d));
    if (planned(d) && !done) {
      if (n <= 7) missedWeek++;
      if (n === 1) missedYesterday = true;
      open = false;
    } else if (done && open) streak++;
  }
  return { streak, missedWeek, missedYesterday };
}

const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ''));

/** A repeatable pseudo random number from 0 to 1, so one seed always gives the same pick until the seed changes. */
const rand = (seed: number, k: number) => {
  const x = Math.sin(seed * 12.9898 + k * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

type Line = { titles: string[]; lines: string[] };
const L = (titles: string | string[], lines: string[]): Line => ({ titles: Array.isArray(titles) ? titles : [titles], lines });

/**
 * Each situation is something true about you right now. The main ones come from your workouts, the rest from your
 * food, water, sleep, weight and the clock. Placeholders: {n} streak, {m} missed in 7 days, {t} total workouts,
 * {d} days since the last workout, {w} of {p} workouts this week, {kg} kg toward goal, {pct} percent to goal,
 * {prot} percent of protein, {h} hours slept.
 */
type Situation =
  | 'dayOne' | 'streakBig' | 'streakMid' | 'done' | 'restMissed' | 'rest' | 'missedYesterday' | 'missedMany' | 'streakOn' | 'waiting'
  | 'lateEvening' | 'morningPush' | 'weekBehind' | 'weekComplete' | 'longGap' | 'milestone'
  | 'proteinLow' | 'noFood' | 'waterLow' | 'sleepPoor' | 'goalHalf' | 'weightMoving' | 'weightWrong' | 'wildcard';

const TONE: Record<Situation, Tone> = {
  dayOne: 'neutral', streakBig: 'good', streakMid: 'good', done: 'good', restMissed: 'bad', rest: 'neutral', missedYesterday: 'bad', missedMany: 'bad',
  streakOn: 'good', waiting: 'neutral', lateEvening: 'bad', morningPush: 'neutral', weekBehind: 'bad', weekComplete: 'good', longGap: 'bad', milestone: 'good',
  proteinLow: 'neutral', noFood: 'bad', waterLow: 'neutral', sleepPoor: 'neutral', goalHalf: 'good', weightMoving: 'good', weightWrong: 'bad', wildcard: 'neutral',
};

/**
 * Goku: aggressive, insulting, ego clashing, and he loves to rage bait. He goes after your effort and your excuses,
 * never your body or who you are.
 */
const GOKU: Record<Situation, Line> = {
  dayOne: L(['Day one', 'Empty log', 'Zero workouts'], [
    'Zero workouts logged. Big talk, empty log. My warm up is harder than your whole week. Lift something.',
    'Nothing on the board. Everyone in that gym started at zero and still showed up. What is your excuse?',
    'I bet you find a reason to start tomorrow. Prove me wrong. Move.',
    'An empty log and a full imagination. Pick up a weight and make one of them real.',
    'You downloaded a workout app and did nothing with it. Impressive. Sad, but impressive.',
    'Day one is free. Most people still cannot afford it. Are you most people?',
    'Nobody is coming to do it for you. Start.',
    'You will never be as strong as you plan to be. Change that today.',
  ]),
  streakBig: L(['Not bad. {n} in a row', 'Do not get cocky', '{n} sessions straight'], [
    '{n} in a row. Fine. The guy who trained twice today is not impressed. Do more.',
    'Streak of {n}. Do not get cocky. Cocky is how strong people get lazy.',
    '{n} sessions. Do you want applause? Go and earn the next one.',
    'You have been consistent. It is the only nice thing I will say all week, so enjoy it.',
    '{n} in a row and you think you are a machine. Machines do not complain on rest days.',
    'Good. Now stop admiring the streak and go put more weight on the bar.',
    'This is what showing up looks like. Somehow it is still not my limit for you.',
    'You are on fire. Try staying on fire for a month before you tell anyone.',
  ]),
  streakMid: L(['Finally acting like an athlete', 'Now you have something to lose', '{n} sessions'], [
    '{n} in a row. Now you have something to lose. Keep pushing or watch it die.',
    '{n} sessions. Do you want a trophy or another set? Guess which one I am handing you.',
    'Look at that, a streak. Do not celebrate yet. Streaks are easy to lose and you are easy to distract.',
    'A few sessions is a habit trying to happen. Do not strangle it.',
    'You are improving. I hate that I noticed. Keep going before I change my mind.',
    'Nice start. Every quitter also had a nice start.',
    '{n} in a row. Good. Now do the boring part, which is doing it again tomorrow.',
    'A streak of {n} is not impressive yet. Come back to me at ten.',
  ]),
  done: L(['Done. So what?', 'Session logged', 'That is the minimum'], [
    'Session logged. Want a medal? Do it again tomorrow and beat your numbers. Your limit is a lie.',
    'You showed up. That is the minimum. Anything less would have been embarrassing.',
    'One workout down. A real athlete is already thinking about the next one.',
    'Finished? Check your numbers. If they did not go up, you just went through the motions.',
    'Good. Now eat properly and sleep, or all of that was for nothing.',
    'You trained. Congratulations on doing the thing you signed up for.',
    'Do not tell me you are tired. Tell me you left nothing in the tank.',
    'That was the easy day. Wait until you see what I plan for the next one.',
    'Work done. Do not celebrate by wrecking it with junk food.',
    'You did it once. Anyone can do it once. Come back and prove it was not luck.',
  ]),
  restMissed: L(['Rest day? Not yours', 'You call this rest?'], [
    'You skipped {m} sessions in the last 7 days. You are not resting, you are hiding.',
    '{m} missed in 7 days. Rest is for people who trained. What are you resting from?',
    'A rest day after {m} skipped sessions is just another skipped session with a nicer name.',
    'Your whole week has been a rest day. Do not lie to yourself on the actual one.',
    'Enjoy your day off. You have earned nothing yet, but enjoy it.',
    'Rest today, then explain to me tomorrow why you missed {m} sessions.',
  ]),
  rest: L(['Rest day', 'Recovery, not a vacation'], [
    'Enjoy the day off. Your rivals are not taking one. Eat, sleep, and come back hungry.',
    'Recovery is not laziness, so do not treat it like a holiday. Be back here tomorrow.',
    'Rest day. Sleep, eat, stretch. Do not sit there planning excuses for tomorrow.',
    'Your muscles grow while you rest. Your excuses grow while you scroll. Choose what you feed.',
    'Take the day, then take the next one seriously.',
    'Someone out there is training on their rest day. I am not saying you should. I am saying they exist.',
    'Rest hard. It is the only thing I will let you do hard without me.',
    'Recovery day. If you feel guilty, good. Use it tomorrow.',
  ]),
  missedYesterday: L(['You skipped yesterday', 'Yesterday called', 'Where were you?'], [
    'Yesterday you chose the couch. It says thanks for the loyalty.',
    'Going soft already? Everyone noticed. Fix it today.',
    'One missed day is an accident. Two is who you are. Pick one.',
    'You skipped yesterday. The weights did not miss you. They never do.',
    'Yesterday is gone and you spent it doing nothing. Do not repeat it out of habit.',
    'I did not see you yesterday. I hope the couch is a better training partner than I am.',
    'A missed session does not disappear. It sits there and waits for you to make it two.',
    'You call that discipline? Discipline does not take a day off when it is convenient.',
    'Miss one, feel fine. Miss two, feel normal. That is how it starts. Do not let it start.',
    'Yesterday was a weak effort. Erase it by training twice as hard today.',
  ]),
  missedMany: L(['{m} sessions missed in 7 days', 'Is this a hobby?', 'Attendance report'], [
    'Is this a goal or a hobby? Because a hobby does not need a coach.',
    'You have skipped more than you finished. Say something. Oh right, you were not there.',
    'Your excuses show up on time every day. Your training does not. Think about that.',
    'Even the guy who gets punched for a living skips fewer sessions than you. Get up.',
    '{m} sessions missed. I would ask if you are okay, but I already know the answer is the couch.',
    'Your plan is not the problem. You are the problem. Solve it by showing up.',
    'At this rate you will reach your goal in never. Change the rate.',
    'Every skipped session is a vote for the person you are trying not to be.',
    'You keep saying tomorrow. Tomorrow has been busy lying to you.',
    '{m} missed this week. What is it this time, the weather, your mood, or the sun coming up?',
  ]),
  streakOn: L(['{n} in a row', 'Do not break it'], [
    'Break it and I will never let you forget it.',
    'Streak of {n}. One lazy day and it is gone. Go on, be predictable.',
    'You have a streak of {n} and a workout waiting. Do the math, then do the workout.',
    '{n} sessions of effort, and you are about to throw it away for a nap. Prove me wrong.',
    'The streak survives only if you show up today. It does not care how you feel.',
    'A streak of {n} plus a skipped day equals zero. Move.',
    'Everyone can start a streak. Only a few can keep one alive on a bad day.',
    'I am watching. Do not make me watch you quit.',
  ]),
  waiting: L(['You are late', 'What are you waiting for?', 'Your workout is waiting'], [
    'Everyone else already started. Late again. Move.',
    'Scared of the weights? Walk in there and prove me wrong.',
    'The weights are not going to lift themselves. Neither are you, apparently.',
    'Your workout is sitting there. Your excuse is still warming up. Which one wins today?',
    'Nobody ever regretted a workout. Everybody regrets the scrolling. Choose.',
    'You have a plan for today. A plan is just a wish until you move.',
    'Stop stretching your excuses and start stretching your muscles.',
    'Get in there. Or should I tell everyone you were not ready?',
  ]),
  lateEvening: L(['Running out of day', 'Evening already?'], [
    'It is evening and you still have not trained. The day is almost over. Are you?',
    'Tick tock. The gym closes and your excuses do not.',
    'You had the whole day. Now you have a few hours and an attitude. Go anyway.',
    'Late is still better than never, but only barely. Get moving.',
    'The sun is going down and your workout is still on the list. Embarrassing.',
    'You are one shower away from admitting you skipped. Do not shower. Train.',
  ]),
  morningPush: L(['Rise up', 'Morning'], [
    'Good morning. Your competition is already up. You are not. Fix that.',
    'Morning is when winners train and everyone else negotiates with their alarm.',
    'You will not feel like it. Do it anyway. That is the entire secret.',
    'The first hour decides the day. Do not give it to your bed.',
  ]),
  weekBehind: L(['You are behind', 'Week check'], [
    '{w} of {p} workouts this week. The week is almost over. Do the math and feel bad.',
    'You planned {p} sessions and did {w}. That is not a plan, that is a suggestion.',
    'The week is running out and so is your credibility. {w} of {p}. Catch up.',
    'Only {w} of {p} done. The rest of the week called, it wants its effort back.',
    '{w} of {p}. If effort were money, you would be broke by Thursday.',
    'You are behind on your own plan. Nobody set it but you. Explain that.',
  ]),
  weekComplete: L(['Week complete', 'All {p} done'], [
    'All {p} workouts done this week. Fine. Reset the counter and do it again.',
    'You finished your week. Do not expect a parade. A good week is just the baseline.',
    'Full week done. Now do something you are scared of next week, like adding weight.',
    'You did what you said you would do. That is rare. Do not waste it.',
    '{p} out of {p}. I would say well done, but I am saving it for when you do it for a month.',
    'Week done. Sleep, eat, and come back with a bigger number on the bar.',
  ]),
  longGap: L(['{d} days off', 'Long gap'], [
    '{d} days since your last workout. The dust on your shoes is training harder than you.',
    'It has been {d} days. Your muscles filed a missing person report.',
    '{d} days without training. That is not a break, that is a retirement. Did you retire?',
    'Last workout: {d} days ago. Your strength is leaving without saying goodbye.',
    'After {d} days off, the first session will hurt. Good. You earned that pain.',
    '{d} days. Every one of them was a choice. Choose differently today.',
  ]),
  milestone: L(['Workout number {t}', '{t} workouts'], [
    '{t} workouts logged. Not bad for someone who started as a beginner. Now stop being one.',
    'Workout number {t}. That is real work. Do not let it turn into a nice story you tell instead of a habit.',
    '{t} sessions in the bank. Now go and spend them on a heavier weight.',
    'You have logged {t} workouts. That makes you dangerous to your old self. Keep going.',
  ]),
  proteinLow: L(['Protein check', 'Feed the muscle'], [
    'You have hit {prot} percent of your protein. Muscles do not grow on hope.',
    'Lifting hard and eating soft. That is how you waste a good workout. Protein, now.',
    '{prot} percent of your protein by this hour. Your muscles are filing a complaint.',
    'You want gains on {prot} percent of the fuel? Bold. Wrong, but bold.',
    'Nobody ever got big on good intentions. Eat the protein.',
    'Half a target is half a result. Finish your protein.',
  ]),
  noFood: L(['Nothing logged', 'Are you even eating?'], [
    'Not one meal logged today. If you are not tracking it, you are guessing, and guessing is for beginners.',
    'Your food log is empty. Either you did not eat, or you did not care. Both are a problem.',
    'No meals logged. Your discipline stops at the kitchen door, does it?',
    'You track your workouts but hide your food. Nice try. Log it.',
    'An empty food log at this hour. Log every bite, or admit you are winging it.',
  ]),
  waterLow: L(['Drink up', 'Water check'], [
    'You are barely hydrated and you want to train hard. Drink water, champion.',
    'Your water bar is nearly empty. A camel would be embarrassed for you.',
    'Almost no water today. Your body needs it and you are ignoring it. Drink.',
    'You want performance on an empty tank? Drink your water first.',
    'Sipping like a tourist. Finish your water goal.',
  ]),
  sleepPoor: L(['Sleep debt', 'Barely slept'], [
    '{h} hours of sleep and you expect to train like a beast? Recovery does not run on caffeine.',
    'You slept {h} hours. Tired is not a personality, and it is not an excuse either. Still train, just smarter.',
    '{h} hours. You are building muscle with a broken factory. Fix your sleep tonight.',
    'Poor sleep, weak session, same excuses. Go to bed on time tonight. No arguments.',
    'Short on sleep? Great. Show me what you do when you are tired. That is where strength is built.',
  ]),
  goalHalf: L(['Halfway there', '{pct} percent to goal'], [
    'You are {pct} percent of the way to your goal. The second half is where people quit. Are you people?',
    '{pct} percent done. Do not slow down now. The finish line loves a quitter.',
    'Over halfway to your goal weight. Do not celebrate, finish.',
    'You are {pct} percent there. That means you did the easy part. Now the real work starts.',
  ]),
  weightMoving: L(['The scale moved', '{kg} kg'], [
    '{kg} kg closer to your goal. It means nothing if you stop now.',
    'You moved {kg} kg toward your goal. Nice. Do it again, harder.',
    'The scale says {kg} kg in the right direction. The scale can also change its mind. Keep pushing.',
    '{kg} kg of progress and you think you are done? You are just getting started.',
  ]),
  weightWrong: L(['Wrong direction', 'The scale disagrees'], [
    'The scale is moving the wrong way, {kg} kg. Your food log knows why.',
    '{kg} kg in the wrong direction. Hard work does not cancel out bad choices.',
    'You are drifting away from your goal by {kg} kg. Turn the ship around.',
    'Wrong direction, {kg} kg. Either train harder or eat smarter. Ideally both.',
  ]),
  wildcard: L(['Listen up', 'Hey', 'Reminder', 'Still here?'], [
    'Somewhere right now, someone is training harder than you. Do not let them win.',
    'You are not tired. You are bored of trying. Big difference, so try again.',
    'Motivation is a liar. Discipline is the one that shows up. Be disciplined.',
    'You could be stronger than yesterday. You just have to want it more than the couch.',
    'Everyone wants results. Almost nobody wants the sessions that create them.',
    'Comfort is a slow way to lose. Get uncomfortable.',
    'I have seen stronger excuses than yours and beaten them all. Try harder.',
    'Pain is temporary. Regret about not training is annoyingly permanent.',
    'Do not talk to me about goals. Show me reps.',
    'You think you are working hard? Wait until you find out what hard actually is.',
  ]),
};

/**
 * Mirko: soft spoken, calm and warm. She motivates by believing in you and making the next step feel small.
 * The opposite of Goku. She never shames or shouts, and she looks after your effort, your rest and your feelings.
 */
const MIRKO: Record<Situation, Line> = {
  dayOne: L(['Welcome, day one', 'A fresh beginning', 'Your first step'], [
    'Every journey begins with a single step, and you are taking it today. I am right here with you.',
    'There is no perfect start and no pressure. Show up today, and we will build something wonderful from there.',
    'You do not have to be ready. You only have to begin, and I will be beside you.',
    'A blank log is not empty. It is a page waiting for your story.',
    'The first workout is the bravest one. Take it slowly, and be proud that you came.',
    'Nothing to prove today. Just move your body and see how good it feels.',
    'Every strong person you admire started exactly where you are now.',
    'Begin gently. Consistency will grow from one kind session after another.',
  ]),
  streakBig: L(['You are glowing', 'So proud of you', '{n} in a row'], [
    '{n} sessions in a row. I am so proud of how consistent you have been. Please rest well too.',
    'Streak of {n}. Discipline like this changes lives, and you should feel really good about it.',
    '{n} sessions in a row. That kind of care for yourself is beautiful to watch.',
    'You have shown up again and again. Please notice how much you have grown.',
    'Look how far your dedication has taken you. I hope you feel as proud as I do.',
    'A streak of {n} is a lot of promises kept. Take a deep breath and enjoy that.',
    'You make it look effortless, and I know it is not. Thank you for your effort.',
    'Remember to rest and to celebrate. Strong people need both.',
  ]),
  streakMid: L(['Look at you go', 'Beautiful momentum', 'Keep glowing'], [
    '{n} in a row. You are building something real, and I can see how hard you are working.',
    '{n} sessions already. Every one of them is a promise you kept to yourself.',
    'You are building a rhythm, and it suits you. Keep listening to your body.',
    '{n} sessions strong. Momentum is a gentle thing, and you are carrying it well.',
    'I can feel your confidence growing. Let it lead the way today.',
    'Each session is a small act of kindness toward your future self.',
    'You are doing wonderfully. Trust the process, and trust yourself.',
    'Habits take time, and you are giving yourself that time. That is wisdom.',
  ]),
  done: L(['Beautifully done', 'Well done, you', 'You showed up'], [
    'You showed up for yourself today. That matters more than any number on the bar.',
    'Session logged. Drink some water, eat something nourishing, and be proud of yourself.',
    'That was lovely work. Rest a little, and let your body soak it in.',
    'Every rep was a choice you made for yourself. I hope you can feel that.',
    'You did something good for your body today. Be gentle with it now.',
    'Thank you for showing up. Stretch, breathe, and enjoy the glow.',
    'Today counts, exactly as it was. Not perfect, just yours.',
    'You finished what you started. That quiet strength is what carries you far.',
    'Refuel with something nourishing, and treat yourself kindly this evening.',
    'Proud of you. Truly. Rest well and we will meet again soon.',
  ]),
  restMissed: L(['A gentle check in', 'No judgement here'], [
    'It has been a busy stretch, {m} sessions missed in the last 7 days. That is okay. How are you feeling?',
    '{m} missed lately, and there is no judgement at all. When you are ready, we start again softly.',
    'It has been quiet lately, {m} sessions missed. Rest is welcome, and so is coming back.',
    'Life gets full sometimes, and that is okay. Take today gently, and tomorrow we begin again.',
    'Let us not worry about {m} missed sessions. Let us think about one small step tomorrow.',
    'You are not behind. You are simply between sessions. Whenever you are ready, I am here.',
  ]),
  rest: L(['Rest day', 'Time to recover', 'Be gentle today'], [
    'Rest is part of getting stronger. Breathe, stretch, and be gentle with yourself today.',
    'Your body is rebuilding today. Sleep well, you have earned it.',
    'Rest is not falling behind. It is how strength quietly grows.',
    'Let today be soft. A slow walk, a warm drink, a long stretch.',
    'You have earned a slow day. Breathe deeply and let your muscles rebuild.',
    'Listen to your body today. It knows what it needs, and it is asking for rest.',
    'Take care of yourself the way you would care for someone you love.',
    'Rest well, and tomorrow we will meet a stronger you.',
  ]),
  missedYesterday: L(['It is okay about yesterday', 'A fresh start', 'New day, new chance'], [
    'Yesterday did not go to plan, and that is alright. Today is a fresh start, and I believe in you.',
    'Life gets heavy sometimes. Even a short session today counts, and I am with you.',
    'Missing one day does not undo your progress. It only asks you to begin again, and you can.',
    'Yesterday is behind us. Today is kind and open. Come as you are.',
    'I am not disappointed. I am glad you are here now.',
    'Even five minutes today would be a lovely way to start over.',
    'You do not need to make up for yesterday. Just show up for today.',
    'Some days are for resting, whether we planned them or not. Let us move forward gently.',
    'Be kind to yourself. Progress is built on returning, not on being perfect.',
    'You are still on your path. One step today and you are right back.',
  ]),
  missedMany: L(['Let us reset together', 'Come back gently', 'We start again'], [
    'Something has been in the way lately, {m} sessions in 7 days. Want to start with just ten minutes today?',
    'Small steps still move you forward. Ten easy minutes is a wonderful place to begin.',
    '{m} sessions missed, and that is okay. I would love to hear what has been hard.',
    'You have not failed. You have only paused. Let us pick up softly today.',
    'Something has been heavy lately. Would a short, easy session help you feel lighter?',
    'There is no shame in a hard week. There is only a fresh chance to begin.',
    'Let us make it smaller. Ten minutes, an easy pace, and be proud you came.',
    'I believe in you more than you believe in your missed days. Come back when you are ready.',
    'Sometimes we need a slow week to make a strong month. Let us begin again with care.',
    'You matter more than any schedule. Move when it feels right, and I will cheer you on.',
  ]),
  streakOn: L(['{n} in a row', 'Keep it going'], [
    'You are doing so well. Keep that gentle momentum going today.',
    'Streak of {n}. I am cheering for you. One calm session and you carry it on.',
    'Your streak of {n} is a lovely thing. Today is one more chance to protect it.',
    'You are doing so well. A calm session today keeps that beautiful rhythm alive.',
    'You have built something special over {n} sessions. Let us carry it forward.',
    'One more session, and one more piece of your promise kept. You can do this.',
    'I am proud of your consistency. Come and add one more today.',
    'The streak matters, but you matter more. Move in a way that feels good today.',
  ]),
  waiting: L(['Today is waiting', 'Whenever you are ready', 'Your workout awaits'], [
    'Whenever you are ready, I am here. Start with a warm up and see how you feel.',
    'No pressure. Just begin, and the rest tends to follow. You have got this.',
    'Your workout is here whenever you are. There is no rush, just a warm welcome.',
    'Take a breath, put on something comfortable, and begin with a few easy movements.',
    'You have got this. Start small, and let your body warm up to the idea.',
    'Today is a good day to move. I will be right here cheering for you.',
    'Even a short session counts. Begin, and see how you feel.',
    'You do not have to be perfect. You only have to begin.',
  ]),
  lateEvening: L(['A calm evening', 'There is still time', 'Evening check in'], [
    'It is evening, and there is still time for something gentle. Even a short session counts.',
    'The day may have been full, and that is okay. A little movement tonight can feel wonderful.',
    'If you have the energy, a light workout would be lovely. If not, be kind to yourself.',
    'No pressure tonight. A short walk or an easy set is a beautiful way to end the day.',
    'Evening is a lovely time to move slowly and let the day melt away.',
    'Your workout is still here. Give yourself ten easy minutes and see how you feel.',
  ]),
  morningPush: L(['Good morning', 'A new day'], [
    'Good morning. Today is a fresh page, and I am so glad you are here.',
    'Start with water, a stretch, and a smile. Your workout will feel lighter for it.',
    'A morning session is a gift to your whole day. Begin whenever you feel ready.',
    'The day is full of possibility. Take one gentle step toward it.',
    'Rise softly. You have everything you need for a wonderful day of training.',
  ]),
  weekBehind: L(['A gentle week check', 'You can still get there'], [
    '{w} of {p} workouts so far this week. Be kind to yourself, and see what feels possible.',
    'You have done {w} out of {p} this week. That is something to be proud of, and there is still time.',
    'The week has been full, and that is alright. One more session would be a lovely thing.',
    '{w} of {p} is a start, not a failure. Let us add one gentle session today.',
    'You do not have to catch up on everything. Just take the next step, and it will be enough.',
    'Progress is not always a straight line. {w} of {p} this week, and I am still cheering for you.',
  ]),
  weekComplete: L(['Week complete', 'All {p} done', 'What a week'], [
    'All {p} workouts done this week. Please take a moment to feel proud.',
    'You finished your whole week. That takes real care and commitment.',
    'What a beautiful week of showing up for yourself. Rest well, you have earned it.',
    '{p} out of {p}. I hope you can feel how strong you are becoming.',
    'Your week is complete. Celebrate quietly, and be gentle with yourself now.',
    'You did everything you set out to do. That is wonderful. Thank you for your dedication.',
  ]),
  longGap: L(['Welcome back', 'It has been {d} days', 'No worries at all'], [
    'It has been {d} days, and that is okay. I am so glad to see you again.',
    '{d} days away does not erase what you have built. It is all still here, waiting for you.',
    'Coming back after {d} days takes courage. Start easy, and be proud you returned.',
    'Life gets busy, and {d} days passed. Let us begin again gently, with no pressure.',
    'Your body remembers more than you think. Ease in slowly after {d} days, and enjoy it.',
    'Welcome back. There is no catching up to do, only a warm and simple restart.',
  ]),
  milestone: L(['Workout number {t}', '{t} workouts'], [
    '{t} workouts logged. Please look at how much care you have put into yourself.',
    'Workout number {t}. Each one was a promise you kept. I am so proud of you.',
    'You have shown up {t} times. That is a quiet kind of strength, and it is beautiful.',
    '{t} sessions and counting. Look at the person you have become along the way.',
    'What a milestone. {t} workouts, and every one of them mattered.',
  ]),
  proteinLow: L(['A little nourishment', 'Feed your strength'], [
    'You are at {prot} percent of your protein. A nourishing meal or snack would help you feel strong.',
    'Your body is working hard for you. Give it some protein to rebuild, when you are ready.',
    '{prot} percent of your protein so far. There is still time to nourish yourself well today.',
    'A little more protein tonight would be a lovely gift to your muscles.',
    'Fuel is part of care. Something warm and rich in protein would be wonderful right now.',
    'You are doing well, and your muscles would love a bit more protein before the day ends.',
  ]),
  noFood: L(['A gentle reminder', 'Nourish yourself', 'Have you eaten?'], [
    'I have not seen a meal logged yet. Have you eaten today? Please nourish yourself.',
    'Your body deserves good fuel. When you have a moment, log what you have eaten.',
    'Take a little time to eat something good. Then log it, if you feel like it.',
    'No meals logged yet, and that is alright. Be sure to feed yourself well today.',
    'Eating well is part of training well. I hope you are taking care of yourself.',
    'A calm meal and a glass of water can change your whole afternoon. Please look after yourself.',
  ]),
  waterLow: L(['A sip of water', 'Stay hydrated'], [
    'Your water is a little low today. A slow glass right now would feel lovely.',
    'Please remember to drink some water. Your body works so hard for you.',
    'A small sip, then another. You will feel the difference soon.',
    'Hydration is a quiet act of self care. Fill a glass and enjoy it.',
    'Your body will thank you for some water. Take a moment for yourself.',
    'A glass of water and a deep breath. That is all you need to feel a little brighter.',
  ]),
  sleepPoor: L(['Rest well tonight', 'Be gentle with yourself'], [
    'You slept {h} hours last night. Be gentle with yourself today, and go easy.',
    '{h} hours is not much rest. If you train, keep it light, and sleep early tonight.',
    'Tired days happen to everyone. Move gently, drink water, and rest well tonight.',
    'Your body needs sleep to grow stronger. Please give it a cozy, early night.',
    'A short night does not mean a bad day. Listen to your energy and do what feels right.',
    'Sleep is where strength quietly happens. Tonight, let yourself rest deeply.',
  ]),
  goalHalf: L(['Halfway there', '{pct} percent to your goal'], [
    'You are {pct} percent of the way to your goal. Look how far you have come.',
    'Over halfway there. That took patience, and you have plenty of it.',
    '{pct} percent done. Keep going at a pace that feels kind and steady.',
    'You are more than halfway to your goal. I am so proud of you.',
    'Halfway is a beautiful place to stand. The road behind you is long, and the road ahead is bright.',
  ]),
  weightMoving: L(['Lovely progress', '{kg} kg closer'], [
    'You are {kg} kg closer to your goal. Please be proud of every step.',
    'The scale is moving gently in your favour, {kg} kg so far. Keep caring for yourself.',
    '{kg} kg of progress. Slow and steady is a beautiful way to change.',
    'Look at that, {kg} kg toward your goal. Your care is showing.',
    'This progress is yours. {kg} kg closer, and I am cheering for you.',
  ]),
  weightWrong: L(['Be kind to yourself', 'It is only a number'], [
    'The scale has moved {kg} kg the other way. It is only a number, and you are so much more.',
    'Weight goes up and down. Do not be hard on yourself. Let us keep going with care.',
    '{kg} kg away from your goal right now. That is okay. We adjust, and we continue.',
    'A small step back does not undo your effort. Be gentle, keep moving, and keep believing.',
    'Some weeks are like this. Let us look at rest, food and water, and take it one day at a time.',
  ]),
  wildcard: L(['A little reminder', 'Just for you', 'Take a breath', 'Remember'], [
    'You are doing better than you think. Please remember that today.',
    'Progress is not loud. It is quiet, steady and yours.',
    'Be proud of the effort, not only the result. The effort is where you grow.',
    'Take a deep breath. You are exactly where you need to be.',
    'Strength is built with kindness as much as with weights.',
    'You are allowed to go slowly. You are still moving forward.',
    'Every workout is a gift you give your future self.',
    'Your body carries you through everything. Thank it today.',
    'Small steps still count. They always have.',
    'You have more strength than you know. I can see it.',
    'Do it for the way it makes you feel, and for no one else.',
    'Whatever today brings, you can handle it. I believe in you.',
  ]),
};

/**
 * Picks what the coach says. It collects every situation that is true right now, gives the main workout one the most
 * weight, and chooses among them with the seed. A new seed gives a different message.
 */
export function coachMessage(
  days: PlanDay[], logged: Set<string>, seed: number, today = todayISO(), voice: CoachStyle = 'male', ctx?: CoachContext,
): Coach {
  const { streak, missedWeek, missedYesterday } = trainingStreak(days, logged, today);
  const dow = new Date(`${today}T12:00:00`).getDay();
  const plannedToday = days.some((x) => x.day === dow && x.sessions.length > 0);
  const doneToday = logged.has(today);
  const words: Record<Situation, Line> = voice === 'female' ? MIRKO : GOKU;

  const main: Situation =
    logged.size === 0 ? 'dayOne'
    : doneToday ? (streak >= 5 ? 'streakBig' : streak >= 3 ? 'streakMid' : 'done')
    : !plannedToday ? (missedWeek >= 2 ? 'restMissed' : 'rest')
    : missedYesterday ? 'missedYesterday'
    : missedWeek >= 2 ? 'missedMany'
    : streak >= 2 ? 'streakOn'
    : 'waiting';

  const pool: { s: Situation; w: number }[] = [];
  const add = (s: Situation, w: number, when = true) => { if (when) pool.push({ s, w }); };
  add(main, 6);
  const pending = plannedToday && !doneToday;
  if (ctx) {
    add('lateEvening', 5, pending && ctx.hour >= 18);
    add('morningPush', 3, pending && ctx.hour < 11);
    add('weekBehind', 3, !doneToday && ctx.weekday >= 4 && ctx.weekPlanned - ctx.weekDone >= 2);
    add('weekComplete', 3, ctx.weekPlanned > 0 && ctx.weekDone >= ctx.weekPlanned);
    add('longGap', 3, !doneToday && ctx.daysSinceLast != null && ctx.daysSinceLast >= 5);
    add('milestone', 2, doneToday && ctx.totalWorkouts >= 10);
    add('proteinLow', 3, ctx.foodLogged && ctx.proteinPct != null && ctx.proteinPct < 0.6 && ctx.hour >= 15);
    add('noFood', 2, !ctx.foodLogged && ctx.hour >= 14);
    add('waterLow', 2, ctx.waterPct != null && ctx.waterPct < 0.4 && ctx.hour >= 14);
    add('sleepPoor', 2, ctx.sleepMinutes != null && ctx.sleepMinutes < 360);
    add('goalHalf', 1.5, ctx.goalPct != null && ctx.goalPct >= 0.5);
    add('weightMoving', 1.5, ctx.kgToward != null && ctx.kgToward >= 1);
    add('weightWrong', 2, ctx.kgToward != null && ctx.kgToward <= -0.5);
  }
  add('wildcard', 1.5);

  let pick = rand(seed, 1) * pool.reduce((a, x) => a + x.w, 0);
  let chosen = pool[pool.length - 1].s;
  for (const c of pool) {
    if (pick < c.w) { chosen = c.s; break; }
    pick -= c.w;
  }

  const w = words[chosen];
  const v: Record<string, string | number> = {
    n: streak, m: missedWeek, w: ctx?.weekDone ?? 0, p: ctx?.weekPlanned ?? 0, t: ctx?.totalWorkouts ?? 0, d: ctx?.daysSinceLast ?? 0,
    kg: ctx?.kgToward != null ? Math.abs(ctx.kgToward).toFixed(1) : '', pct: ctx?.goalPct != null ? Math.round(ctx.goalPct * 100) : '',
    prot: ctx?.proteinPct != null ? Math.round(ctx.proteinPct * 100) : '', h: ctx?.sleepMinutes != null ? (ctx.sleepMinutes / 60).toFixed(1) : '',
  };
  return {
    tone: TONE[chosen],
    title: fill(w.titles[Math.floor(rand(seed, 2) * w.titles.length)], v),
    line: fill(w.lines[Math.floor(rand(seed, 3) * w.lines.length)], v),
    streak,
  };
}
