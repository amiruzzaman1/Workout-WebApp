// Every notification line, in two voices: Goku is angry and pushes with rage bait, Mirko is flirty and pushes with
// charm. Each kind has 3 titles and 10 bodies per voice, all with emojis. Same rules as the coach in coach.ts:
// about effort, never about body or identity, no dashes. Placeholders (filled by fill()): {name} {streak} {pct}
// {glasses} {session} {tasks} {protein} {days}. Keep lines under about 140 characters so they fit on a phone.
import { CoachStyle } from './coachStyle';

export type PulseKind =
  | 'morning' | 'sleepMissing' | 'waterNone' | 'waterLow' | 'waterGood'
  | 'mealBreakfast' | 'mealLunch' | 'mealDinner' | 'proteinLow'
  | 'workoutPlanned' | 'workoutDone' | 'restDay' | 'tasksLeft'
  | 'questsLeft' | 'streakRisk' | 'dayDone' | 'bedtime' | 'weighIn' | 'photo' | 'winback';

type Voice = { titles: string[]; bodies: string[] };
type Pair = { goku: Voice; mirko: Voice };

export const PULSE_TEXT: Record<PulseKind, Pair> = {
  morning: {
    goku: {
      titles: ['😤 Up. Now.', '🔥 Morning, {name}', '💢 Today is not optional'],
      bodies: [
        'Alarm went off and so did the excuses? Not today. Get up and earn this day 😤',
        'Morning, {name}. Another day to either grind or whine. Pick one 🔥',
        'Every minute you waste in bed is a rep you will never get back 💢',
        'Up. Water first, then food, then work. I will be checking 😡',
        'Champions are already moving. What exactly are YOU doing right now? 🔥',
        'Good morning. Do not make me chase you again today 😤',
        'The sun is up and you are still scrolling? Put the phone down and start 💢',
        'New day. New chance to stop being average. Log your first win early 🔥',
        'I do not care how you feel. I care what you DO today, {name} 😡',
        'Eyes open, feet down, effort on. Go go go! 💪🔥',
      ],
    },
    mirko: {
      titles: ['☀️ Good morning, you', '😘 Rise and shine, {name}', '💕 Hi gorgeous, new day'],
      bodies: [
        'Good morning, {name} 😘 I woke up thinking about how good today could be. Start with a glass of water for me?',
        'Rise and shine, you 💕 Today has your name on it, and so do I 😉',
        'Morning! Stretch, smile, and come say hi to your goals with me 🥰',
        'Hey you 😏 Ready to make today look good? I will be here cheering the whole way',
        'Good morning, cutie ☀️ One small win before breakfast and I will be very proud of you 💋',
        'I saved you a spot on today\'s winning team, {name} 😘 Show up and take it',
        'Wakey wakey 🥰 The best version of today starts with a deep breath and one good choice',
        'Morning, {name}! 💕 You and a glass of water, that is the perfect start. Go on 😉',
        'Good morning to my favourite person to cheer for 😘 Let us have a great one',
        'Hi you 🌞 Do not keep me waiting, I want to hear about your first win today 💋',
      ],
    },
  },

  sleepMissing: {
    goku: {
      titles: ['😴 Sleep not logged', '💢 Log your sleep', '😤 Where is last night\'s sleep?'],
      bodies: [
        'No sleep logged. I cannot coach what I cannot see. Log it 😴💢',
        'How long did you sleep? Do not make me guess, {name} 😤',
        'Last night\'s sleep is not logged. Takes ten seconds. Do it 🔥',
        'Sleep is half the work. Log it like you respect it 😡😴',
        'Bed time, wake time, done. Log it before the morning is gone 💢',
        'If you slept badly, own it and log it. If you slept well, prove it 😤',
        'Your recovery numbers are blank. Fix them, {name} 🔥',
        'Nobody improves what they will not measure. Log your sleep 😡',
        'Two times. That is all I need. Bed and wake. Now 😴💢',
        'No sleep log means no accountability. Fix it 🔥😤',
      ],
    },
    mirko: {
      titles: ['😴 How did you sleep?', '😘 Sleep log, cutie', '🥰 Tell me about your sleep'],
      bodies: [
        'Hey {name} 😘 How did you sleep? Log it for me 😴',
        'I want to hear about your night 💕 Log your bed and wake times',
        'Sleepy head 🥰 Add your sleep times so I can look after you',
        'Did you sleep well, gorgeous? 😏 Tell me in the app',
        'Last night\'s sleep is missing 💋 Two little times, that is all',
        'A quick sleep log would make my morning 😘 Go on',
        'I like knowing you rested well, {name} 💕 Log it when you can',
        'Bed time and wake time, please 🥺😴 I worry about you',
        'Tell me you slept like a baby 😉 And log it, of course',
        'Hi you 🥰 Your sleep log is waiting, and so am I',
      ],
    },
  },

  waterNone: {
    goku: {
      titles: ['💧 ZERO water?', '😡 Drink. NOW.', '💢 Your water log is EMPTY'],
      bodies: [
        'Not one drop logged today. Your body is not a desert, {name}. Drink water 😡💧',
        'Zero water. ZERO. Do you want to function or not? Drink now 💢',
        '{glasses} to hit your goal and you have not even started. Move 😤',
        'I should not have to tell an adult to drink water. Go. Now 💧😡',
        'Dehydrated and slacking is a combo I refuse to accept. Chug a glass 🔥',
        'Your water goal is laughing at you. Prove it wrong, start now 💢',
        'Pick up a bottle. Drink. Log it. Three steps, none of them hard 😤💧',
        'No water logged and the day is rolling on. Fix it before I get louder 🔊😡',
        'Water first, excuses never. Go drink, then tell me about it 💦',
        'Weak effort is thirsty effort. Down a glass and get back to work 💪💧',
      ],
    },
    mirko: {
      titles: ['💧 Sip sip, cutie', '😘 A little water for me?', '🥰 Hydrate with me'],
      bodies: [
        'Hey {name} 😘 no water logged yet. Drink a glass for me? I will wait right here 💧',
        'Your body is asking nicely, and so am I 🥰 {glasses} to go, one sip at a time 💦',
        'Stay hydrated, gorgeous 😏 It makes everything about you work better 💧',
        'I noticed you have not logged any water 💕 Come on, treat yourself to a cool glass',
        'Pretty please, a glass of water? 🥺💧 Then come tell me how refreshing it was 😘',
        'A hydrated you is my favourite you 💋 Fill a glass and log it for me',
        'Water break, {name}! 💦 Take a sip, take a breath, take a bow 😉',
        'You are doing great, but your water bottle misses you 🥰 Say hi to it for me',
        'Little sips add up to big things 💧 Start with one glass and I will cheer 😘',
        'Psst, you 😏 {glasses} between you and a perfect water day. Race you 💦',
      ],
    },
  },

  waterLow: {
    goku: {
      titles: ['💧 Only {pct}?', '😤 Water is falling behind', '💢 Keep drinking'],
      bodies: [
        '{pct} of your water goal. That is not a plan, that is a hope 😤💧',
        'Behind pace again, {name}. {glasses} to go, and I am watching 💢',
        'Half effort on water, half effort on everything else? Drink up 🔥',
        'You are at {pct}. The goal is 100. Do the math and do the drinking 😡',
        'Stop sipping like you are scared of it. Finish the glass 💧💪',
        'Water pace is slow today. Speed it up or I will keep nagging 😤',
        'I am not asking. Drink a glass right now and log it 🔥💧',
        '{glasses} left. That is a few minutes of work. No excuses 😡',
        'Weak hydration, weak workouts. Fix it now 💢',
        'Get that bottle empty, {name}. Then fill it again 💦🔥',
      ],
    },
    mirko: {
      titles: ['💧 Keep sipping, gorgeous', '😘 Almost there with water', '🥰 Little water reminder'],
      bodies: [
        'You are at {pct} 💕 {glasses} to go, and you can do it, I believe in you 😘',
        'A few more sips and you are there, {name} 💧 Do it for me?',
        'Look at you, already {pct} of the way 🥰 Let us finish strong 💦',
        'Slow and steady wins the water race 😉 Another glass, cutie?',
        'Your water goal and I are both waiting patiently 💋 {glasses} left',
        'Hydration check! 💧 You are at {pct}. A refill would make my day 😘',
        'Take a little break and drink with me 🥰 You deserve it',
        'Just {glasses} more, {name} 😏 You have totally got this 💪💧',
        'I like it when you take care of yourself 💕 Another glass of water, please?',
        'You are doing so well 😘 Do not forget to keep drinking, babe 💦',
      ],
    },
  },

  waterGood: {
    goku: {
      titles: ['💧 Water goal DONE', '🔥 Fine. Good.', '😤 Hydration handled'],
      bodies: [
        '{pct} of your water goal. Finally some discipline. Do not get comfortable 🔥💧',
        'Water goal crushed. That is the minimum, {name}. Now do the rest 😤',
        'Good. Hydrated. Now there are no excuses left for the workout 💪',
        'Goal reached. Do not celebrate yet, you still have food and training to handle 🔥',
        'I will admit it, that is solid. Keep that standard everywhere else 😤💧',
        'Water done. Next target: stop being predictable and exceed it 🔥',
        'Finally. {pct} and counting. Do that with everything and you are unstoppable 💢',
        'Hydration box ticked. Do not let the rest of your day be weaker 😡',
        'That is what I expect every single day. Not just today 💪💧',
        'Respect for the water. Now go earn respect for the rest 🔥',
      ],
    },
    mirko: {
      titles: ['💧 Water goal smashed 😘', '🥰 Hydrated and glowing', '💋 Look at you go'],
      bodies: [
        'You hit your water goal, {name} 🥰 So proud of you, come here for a virtual high five ✋',
        '{pct} of your water goal and glowing 😘 Keep being this good to yourself 💧',
        'Water goal complete! 💕 You make taking care of yourself look so good 😉',
        'Look at you, hydrated and unstoppable 💋 Reward yourself, you earned it',
        'Gold star for hydration ⭐ Now come tell me what you are conquering next 😏',
        'That is how it is done, cutie 💦 I am officially impressed 🥰',
        'Goal reached, no reminders needed 😘 I love a person who follows through',
        'You did it, {name}! 💧 Treat yourself to something small and lovely',
        'Water done and dusted 💕 Your future self just sent you a thank you kiss 💋',
        'Mmm, a perfectly hydrated you 😏 Keep that going',
      ],
    },
  },

  mealBreakfast: {
    goku: {
      titles: ['🍳 Breakfast? Where?', '😤 Food log is EMPTY', '💢 Feed the machine'],
      bodies: [
        'No breakfast logged. Fuel the engine or stop complaining about no energy 🍳😤',
        'Your food log is blank this morning. What exactly are you doing? 💢',
        'Eat something real and log it. Not a coffee. FOOD 🍳🔥',
        'Skipping breakfast and still expecting results? Dream on. Log it 😡',
        '{name}, you cannot out train an empty plate. Eat and log 💪🍳',
        'I see no breakfast. Either you did not eat or you are hiding it. Log it 😤',
        'Protein first thing. Then tell me how you feel. Log it now 🥚🔥',
        'Your calories are not going to track themselves. Move 💢',
        'Log breakfast before the morning is gone or you owe me 10 push ups 😡💪',
        'No excuses. Eat, log, move on. That is how winners start 🍳🔥',
      ],
    },
    mirko: {
      titles: ['🍳 Breakfast, cutie?', '😘 Did you eat yet?', '🥰 Fuel up for me'],
      bodies: [
        'Hey {name} 😘 Did you have breakfast? Log it for me 🍳',
        'I want you well fed and happy 💕 Tell me what you ate this morning',
        'A good breakfast looks so good on you 😏 Log it when you are done 🍳',
        'Hey you 🥰 Breakfast is not logged yet. Come feed me the details 😘',
        'Fuel up, gorgeous 💋 You have big things to do today',
        'Pretty please log your breakfast 🥺🍳 It helps me look after you',
        'Eating well is a love language, {name} 💕 Log your morning meal',
        'Your plate and I have a date, and you are late 😉🍳 Log it quick',
        'Do not skip breakfast on my watch 😘 Eat, then log, then conquer',
        'A little protein, a lot of charm 😏 Log your breakfast, cutie 🥚',
      ],
    },
  },

  mealLunch: {
    goku: {
      titles: ['🍗 Lunch? Log it.', '😡 Where is lunch?', '💢 Nothing logged for lunch'],
      bodies: [
        'No lunch logged yet. Eat real food and log it. Now 🍗😤',
        'I do not accept "I forgot". Eat, log, repeat 💢',
        'Lunch is not optional. Neither is writing it down, {name} 🔥',
        'If you skipped lunch, that is a failure. If you ate it and did not log it, that is worse 😡',
        'Protein, carbs, vegetables, and a log entry. Go 🍗💪',
        'Your day is moving and the food log is pathetic. Fix it 😤',
        'No lunch logged. Are you on a diet of excuses? Eat 💢🍽️',
        'Stop grinding on an empty tank. Eat and log your lunch 🔥',
        'You eat, you log. That is the whole deal, {name} 😡',
        'Lunch time. Log it before I lose my patience 🍽️💢',
      ],
    },
    mirko: {
      titles: ['🍽️ Lunch time, gorgeous', '😘 Hungry yet?', '🥰 Midday treat check'],
      bodies: [
        'Hey {name} 😘 lunchtime! Tell me what you are having 🍽️',
        'I hope you are eating something delicious 💕 Log it for me?',
        'Lunch break, cutie 😏 You deserve a proper meal, and I want the details 🍴',
        'Take care of yourself at lunch 🥰 Then come log it, I will be waiting',
        'A good lunch looks good on you 💋 Log it when you are done',
        'I would love to join you for lunch. Since I cannot, log it for me 😘🍽️',
        'Midday check in 💕 Did you eat? Come tell me about it, {name}',
        'Fuel for the afternoon, please 🥰 And a quick log, pretty please',
        'You are not allowed to skip lunch, I would miss you being sharp 😉🍴',
        'Lunch logged would make me smile 😘 Go on, make my day 💕',
      ],
    },
  },

  mealDinner: {
    goku: {
      titles: ['🍖 Dinner? Log it.', '😤 Evening and no dinner logged', '💢 Finish the day right'],
      bodies: [
        'Evening. Dinner not logged. Finish the day like you started it, with discipline 🍖😤',
        'I do not want to hear "I will log it tomorrow". Log it now 💢',
        'Dinner is how you close the day. Do not waste the ending, {name} 🔥',
        'Eat well, log it, and do not snack your way out of your goals 😡🍗',
        'No dinner logged. Your day is incomplete and so is your effort 💢',
        'Real food on the plate, real numbers in the app. Go 🍖💪',
        'You came this far today. Finish dinner and the log properly 😤',
        'Do not let a good day die at dinner. Eat and log 🔥🍽️',
        'Evening, {name}. Your food log is waiting and I am not patient 😡',
        'Dinner time. Be accountable. Write it down 📝💢',
      ],
    },
    mirko: {
      titles: ['🍝 Dinner time, cutie', '😘 What is for dinner?', '🥰 Evening feast check'],
      bodies: [
        'Dinner time, {name} 😘 Tell me what you are having tonight 🍝',
        'I hope dinner is delicious 💕 Log it so I can brag about you later',
        'Evening, gorgeous 😏 A lovely dinner and a quick log, that is all I ask 🍽️',
        'Treat yourself to a proper dinner 🥰 Then come tell me everything',
        'You worked so hard today 💋 Eat well and log it for me',
        'Do not forget to log dinner, cutie 😘 I like having all the details',
        'A good meal to end the day, {name} 💕 Let me know what it is',
        'Candlelit dinner not required 😉 A log entry is though 🍽️',
        'Fuel for tomorrow\'s you 🥰 Log tonight\'s dinner, please',
        'Come on, one last meal and one last log 😘 Then you can relax 💕',
      ],
    },
  },

  proteinLow: {
    goku: {
      titles: ['🥩 PROTEIN is low', '😡 Muscles do not feed themselves', '💢 Only {protein} protein?'],
      bodies: [
        'Only {protein} of your protein target. Muscle is not built on hope 🥩😤',
        'Protein is behind. Eat chicken, eggs, fish, anything. Move 💢',
        '{protein} done. You want results or a participation trophy? Eat protein 🔥',
        'I did not see you hit your protein. Fix your next meal. Make it count 😡🥩',
        'Low protein means low progress. Simple. Eat more 💪',
        'Your goals need protein and you are skimping. Stop it 😤',
        '{name}, a shake does not count if you did not drink it. Protein, now 🥛🔥',
        'Do not ruin a good workout with a lazy plate. Protein up 💢',
        'Protein is the cheapest way to look serious about this. Eat 🥩😡',
        'You are at {protein}. That is not enough. Not even close 💢🍗',
      ],
    },
    mirko: {
      titles: ['🥩 A little more protein?', '😘 Protein check, cutie', '🥰 Fuel those muscles'],
      bodies: [
        'You are at {protein} of your protein, {name} 😘 A little more and you are golden 🥩',
        'Protein time, gorgeous 💕 Your muscles will thank you',
        'A tasty protein boost would look so good on you 😏 Eggs, chicken, yoghurt?',
        'Hey you 🥰 Protein is a bit low today, let us fix it together',
        'Pretty please add some protein to your plate 🥺🥩 For me?',
        'I like strong and well fed 💋 {protein} done, keep going',
        'Your goals would love some more protein 💕 What is your next meal?',
        'Almost there, {name} 😘 One more protein rich snack should do it 🥛',
        'A little protein, a lot of progress 😉 Go on, treat your muscles',
        'Eat well for me tonight 🥰 Protein first, then everything else 🍗',
      ],
    },
  },

  workoutPlanned: {
    goku: {
      titles: ['🏋️ {session} is WAITING', '😡 Why are you not training?', '💢 Gym. Now.'],
      bodies: [
        '{session} is on the plan and you have not touched it. Get up and go 🏋️😤',
        'Your workout will not do itself. Move your body, {name} 💢',
        'Skipping today? Do not you dare. Shoes on, bag packed, GO 🔥',
        'Every day you skip is a day someone else gets stronger. Train 😡💪',
        'Plan says {session}. Excuses say sofa. Choose wisely 🏋️',
        'The gym is not going to wait forever. Neither am I 💢',
        'You wrote the plan. Now follow it, {name}. Nobody else will lift for you 😤',
        'I can smell the excuses from here. Train anyway 🔥🏋️',
        'No workout logged. That makes today a fail unless you act now 😡',
        'Start with one warm up set. That is all I ask. Then do the rest 💪🔥',
      ],
    },
    mirko: {
      titles: ['🏋️ Workout time, cutie', '😘 Ready for {session}?', '🥰 Come train with me'],
      bodies: [
        '{session} is waiting for you, {name} 😘 Let us make it a great one 🏋️',
        'You and the gym, a perfect pair 💕 Come on, I will cheer from here',
        'Ready to sweat a little? 😏 Today\'s plan is {session}',
        'Get your gear on, gorgeous 🥰 You always feel amazing after',
        'I would love to see you smash {session} today 💋 Make me proud',
        'A workout looks great on you, {name} 😉 Let us go 💪',
        'Your workout is waiting and so am I 😘 Do the first set and I will be thrilled',
        'Come on, cutie, give me one good session today 🥰🏋️',
        'Stretch, lace up, and show up 💕 I will be right here cheering',
        '{session} time! 😏 Impress me today, you know you can 💪',
      ],
    },
  },

  workoutDone: {
    goku: {
      titles: ['💪 Workout logged', '🔥 About time', '😤 Fine. That was decent.'],
      bodies: [
        'Workout done. That is what I expect. Now keep that energy going 🔥💪',
        'Good. You trained. Do not let the rest of your day undo it, {name} 😤',
        'Finally. Now eat properly and recover like you mean it 🍗🔥',
        'That is the standard. Hold it tomorrow too 💪😡',
        'You showed up. Do not expect a trophy, expect another workout tomorrow 🏋️',
        'Session logged. Now sleep and eat like a pro, {name} 💢',
        'I will allow a tiny nod of approval. Now earn the next one 😤🔥',
        'Good work. Do not get cocky. Consistency is the only thing that counts 💪',
        'That workout was overdue. Keep this pace all week 🔥',
        'Done and logged. Now recovery: food, water, sleep. No slacking 😤🥩',
      ],
    },
    mirko: {
      titles: ['💪 Workout done, gorgeous', '😘 You crushed it', '🥰 So proud of you'],
      bodies: [
        'You trained today, {name} 😘 I am so proud of you 💪',
        'Workout logged! 💕 You look amazing when you stay consistent',
        'Look at you showing up 😏 That is so attractive, honestly 🔥',
        'Great session, cutie 🥰 Now eat well and rest, you earned it',
        'You did it again 💋 Do not forget to drink some water, gorgeous 💧',
        'I knew you could, {name} 😘 Come here for a very proud kiss emoji 💋',
        'Workout done and logged 🥰 My favourite kind of notification',
        'You make hard work look easy 😉 Take a moment to enjoy that feeling 💕',
        'A strong, consistent you is my favourite you 😘💪 Rest well tonight',
        'Gold star for training today ⭐ Treat yourself to something lovely, {name} 🥰',
      ],
    },
  },

  restDay: {
    goku: {
      titles: ['😴 Rest day. Not lazy day.', '🔥 Recovery is work too', '💢 Do not waste this day'],
      bodies: [
        'No workout planned. That does not mean no effort. Eat well, sleep well, move a little 🔥',
        'Rest day is for recovery, not for laziness. Walk, stretch, eat right, {name} 😤',
        'Recovery is part of the plan. Treat it seriously 💢',
        'Today you rest. Tomorrow you destroy. Prepare properly 😴🔥',
        'Rest does not mean junk. Hit your protein and water anyway 😡🥩',
        'Take the day, but do not disappear on me, {name} 💪',
        'No lifting today, but I still expect effort. Log your food and walk 😤',
        'Rest days build muscle. Respect them 🏋️😴',
        'Light day. Heavy discipline. Do not mix them up 💢',
        'Recover hard. Then come back harder 🔥💤',
      ],
    },
    mirko: {
      titles: ['😴 Rest day, gorgeous', '😘 Recovery with me', '🥰 Take it easy today'],
      bodies: [
        'No workout planned today, {name} 😴 Rest well and be kind to yourself 💕',
        'Rest day! 🥰 A gentle walk and a good meal are all I ask',
        'Recovery looks good on you 😏 Stretch, hydrate, relax',
        'Take it slow today, cutie 💋 You have earned a calm one',
        'Rest is part of the plan 😘 Eat well and sleep early tonight',
        'Your muscles are rebuilding while you relax 💕 Let them',
        'A cosy rest day, {name} 🥰 Log your meals and drink some water for me',
        'Not every day is a gym day 😉 Today is for loving yourself a little',
        'Rest up, gorgeous 😴 Tomorrow we shine again',
        'Take a long breath and enjoy the pause 💕 You deserve it, I mean it',
      ],
    },
  },

  tasksLeft: {
    goku: {
      titles: ['📝 Tasks still open', '😤 Your to do list is laughing', '💢 Finish what you started'],
      bodies: [
        '{tasks} still open. Stop planning and start finishing 📝😤',
        'You made a list. Now do the list, {name} 💢',
        '{tasks} left. Every unfinished task is a promise you broke 🔥',
        'Procrastination called. I told it you are busy. Prove me right 😡',
        'Pick the hardest one and do it first. Go 📝💪',
        'A day with open tasks is a day with open excuses. Close them 💢',
        '{tasks} waiting on you. Move, {name} 😤',
        'Do one task right now. Then another. That is how it works 🔥',
        'No more scrolling. Open the list and finish something 📱😡',
        'Done is better than perfect and better than pending. Finish {tasks} 💢📝',
      ],
    },
    mirko: {
      titles: ['📝 A little to do list love', '😘 Tasks waiting, cutie', '🥰 You have got this'],
      bodies: [
        'You still have {tasks} on your list, {name} 😘 Pick one and I will cheer 📝',
        'One small task at a time, gorgeous 💕 You are doing great',
        'Let us tick off a task together 😏 I will be right here',
        'Your list misses you 🥰 {tasks} to go, one at a time',
        'A finished task looks so good on you 💋 Go on, pick one',
        'Do the easy one first, cutie 😘 Momentum is very attractive',
        'Just {tasks} left, {name} 💕 You are closer than you think',
        'Small steps, big smiles 🥰 Which task are you tackling next?',
        'I believe in your focus 😉 Tick one off for me',
        'Take a breath and do the next small thing 💕 I am proud of you already',
      ],
    },
  },

  questsLeft: {
    goku: {
      titles: ['🎯 {quests} left today', '😤 Quests are waiting', '💢 Finish your quests'],
      bodies: [
        '{quests} still open, {name}. A perfect day is right there, GRAB IT 🔥',
        'You started the day. Now FINISH it. {quests} to go 💪',
        'Quests do not do themselves. Open Forge and smash {quests} 😡',
        'Perfect day or just a day? {quests} decide it 🏆',
        'I can see {quests} just sitting there laughing at you 💢',
        'Tap one quest. Then the next. That is the whole trick, {name} 😤',
        'A few taps and your XP goes up. {quests} left, go go go 🚀',
        'Your level bar is begging for XP. {quests} will feed it 🔥',
        'Do not let {quests} beat you today 😡',
        'Finish strong, {name}. {quests} to go and the day is yours 👑',
      ],
    },
    mirko: {
      titles: ['🎯 {quests} left today', '😘 A few quests left', '🥰 You are so close'],
      bodies: [
        'Hey {name} 😘 just {quests} to go for a perfect day',
        'A few little taps and you are done, cutie. {quests} left 💕',
        'I saved your spot on the perfect day list 🌟 {quests} to go',
        'Come and finish {quests} with me? It feels so good 🥰',
        'You have been so good today, {name}. {quests} more and you shine ✨',
        'Your XP bar is waiting for you 😉 {quests} left',
        'One quest at a time, gorgeous. {quests} to go 💖',
        'I would love to see that perfect day badge on you 🏆 {quests} left',
        'Just {quests} more and I will cheer so loud 📣',
        'Tiny steps, big smiles. {quests} left, {name} 😘',
      ],
    },
  },

  streakRisk: {
    goku: {
      titles: ['🔥 STREAK ON THE LINE', '💢 Do not lose {streak} days', '😡 Midnight is coming'],
      bodies: [
        'Your {streak} day streak dies at midnight if you log nothing. Do NOT be that person 🔥😡',
        '{streak} days of work, gone in one lazy night? Log something. ANYTHING. Now 💢',
        'Streak at risk, {name}. Food, workout, weight or sleep. Pick one and log it 😤',
        'You built {streak} days. Do not throw them away tonight 🔥',
        'Seriously? {streak} days and you are going to quit now? Log it 😡',
        'Midnight deadline. {streak} days on the line. Move 💢⏰',
        'I did not watch you grind {streak} days to see you fold. Log now 😤🔥',
        'One log saves the streak. One. That is all. Do it 😡',
        'Tick tock, {name}. Your {streak} day streak is bleeding out ⏰💢',
        'Protect the streak. It is the only proof you are serious 🔥😤',
      ],
    },
    mirko: {
      titles: ['🔥 Do not lose your streak', '😘 {streak} days together', '🥰 Save our streak, cutie'],
      bodies: [
        'Your {streak} day streak ends at midnight 🥺 Log one little thing for me?',
        '{streak} days in a row, {name} 😘 Do not let it slip tonight, I am rooting for you',
        'Quick, cutie! 💕 One log and your streak is safe. Food, workout, weight or sleep',
        'I am so proud of your {streak} day streak 🥰 Let us keep it going',
        'Do not break my heart, or your streak 😏 Log something before midnight 💋',
        '{streak} days of showing up 😘 Tonight is no different, just one tiny log',
        'Midnight is near, gorgeous ⏰ Save the streak for me?',
        'You have come so far, {name} 💕 One last log today and we are safe',
        'Please do not let tonight end the streak 🥺 It only takes a minute',
        'You are on a roll, {streak} days strong 🔥 Keep it burning for me 😘',
      ],
    },
  },

  dayDone: {
    goku: {
      titles: ['🔥 Decent day', '💪 Day closed properly', '😤 Not bad'],
      bodies: [
        'Food logged, water handled, work done. That is the standard. Repeat tomorrow 🔥💪',
        'Good day, {name}. Do not celebrate. Do it again tomorrow 😤',
        'That is what discipline looks like. Boring and effective 💢💪',
        'Everything logged. I have nothing to yell about. Suspicious 😡🔥',
        'You closed the day properly. Now sleep, then repeat 😤💤',
        'Good. Very good. Now do not get lazy tomorrow 🔥',
        'A full day of effort. Keep stacking days like this 💪😤',
        'I could not find a single excuse today. Respect, {name} 🔥',
        'That is how champions finish. Now rest up 💢💤',
        'Day complete. Tomorrow is another chance to be even better 🔥💪',
      ],
    },
    mirko: {
      titles: ['🥰 What a day, gorgeous', '😘 You did it all', '💕 Gold star day'],
      bodies: [
        'You logged everything today, {name} 😘 Honestly, that is so attractive',
        'What a lovely, consistent day 🥰 Rest well, you earned it',
        'Food, water, effort, all done 💕 You make it look easy',
        'You took such good care of yourself today 😏 I am a little bit impressed',
        'Gold star day ⭐ Come here for a virtual hug 🤗',
        'I am so proud of you, {name} 💋 Go enjoy a calm evening',
        'Everything ticked off 😘 You are my favourite person to cheer for',
        'A perfect day deserves a perfect rest 🥰 Sleep well, cutie',
        'You showed up for yourself all day 💕 That is truly charming 😘',
        'Day complete 😉 Tomorrow I will be waiting with more cheering 💋',
      ],
    },
  },

  bedtime: {
    goku: {
      titles: ['😴 Bed. Now.', '💤 Sleep is training', '🔥 Lights out'],
      bodies: [
        'Sleep is when the muscle gets built. Put the phone down and go to bed 😴😤',
        'Midnight scrolling will not help you hit your goals. Sleep 💢',
        'Lights out, {name}. Tomorrow needs a rested version of you 💤🔥',
        'I do not care what you are watching. Sleep. Now 😡',
        'Bad sleep, bad workout, bad food choices. Fix it tonight 💤',
        'Log your bed time and shut your eyes. That is an order 😤⏰',
        'Rest is where progress happens. Go earn it 🔥😴',
        'No late night junk, no doom scrolling. Sleep, {name} 💢',
        'Tomorrow\'s performance starts with tonight\'s sleep. Move 😤💤',
        'Close the app, close your eyes, open tomorrow with energy 🔥😴',
      ],
    },
    mirko: {
      titles: ['😴 Sleep well, gorgeous', '🌙 Time to wind down', '🥰 Goodnight, cutie'],
      bodies: [
        'Time to wind down, {name} 🌙 Put the phone away and rest, I will see you tomorrow 😘',
        'Sleep well tonight, gorgeous 💕 You earned a good rest',
        'Dream of your goals and sweet things 😴 Goodnight, cutie 💋',
        'Bedtime! 🥰 Dim the lights and let your body recover',
        'Log your sleep tomorrow morning and I will be thrilled 😘 Rest well',
        'Close your eyes, {name} 🌙 Tomorrow is going to be a lovely day',
        'A rested you is a radiant you 😏 Off to bed',
        'Goodnight, you 💕 Thank you for showing up today',
        'Lights out soon 😴 I will be thinking of you until morning 😘',
        'Sleep tight, cutie 🥰 Tomorrow we do it all again, together',
      ],
    },
  },

  weighIn: {
    goku: {
      titles: ['⚖️ Weigh in. Now.', '😡 No weigh in for {days}', '💢 Step on the scale'],
      bodies: [
        '{days} since your last weigh in. Step on the scale and face the numbers ⚖️😤',
        'Avoiding the scale does not change the number, {name}. Weigh in 💢',
        'You cannot manage what you will not measure. Weigh in today 🔥⚖️',
        'No weigh in for {days}. What are you hiding from? 😡',
        'Scale. Now. Log it. Done in ten seconds ⚖️💪',
        'Fear of the scale is fear of progress. Weigh in 😤',
        'Time to see if your effort was real 🔥⚖️',
        'Do not guess. KNOW. Weigh in and log it 💢',
        'I want a number, {name}. Not an excuse 😡',
        'Weekly check in with the truth. Step on and log 😤⚖️',
      ],
    },
    mirko: {
      titles: ['⚖️ Weigh in, cutie?', '😘 Time to check in', '🥰 Weekly weigh in date'],
      bodies: [
        'It has been {days} since your last weigh in 😘 Come say hi to the scale?',
        'Weekly check in time, {name} 💕 No judgement, just numbers ⚖️',
        'A quick weigh in keeps us on track 🥰 I promise it is quick',
        'Our weekly date with the scale 😏 Go on, log your weight',
        'I like knowing how you are doing 💋 Weigh in when you can',
        'Numbers are just information, gorgeous 💕 Log today\'s weight',
        'Let us see how your hard work is paying off 😘 Step on and log it',
        '{days} since the last one, cutie 🥰 Today is a good day for it',
        'A little weigh in, a lot of progress 😉 Log it for me',
        'Hi you 💕 Scale time. I am proud of you whatever it says',
      ],
    },
  },

  photo: {
    goku: {
      titles: ['📸 Progress photo. Now.', '😤 No photo for {days}', '💢 Prove the progress'],
      bodies: [
        '{days} since your last progress photo. Take one. Evidence beats opinions 📸😤',
        'Mirrors lie, photos do not. Take the shot, {name} 💢',
        'You cannot see progress you did not record. Photo, now 🔥📸',
        'No photo for {days}. How will you know what is working? 😡',
        'Quick pic, honest light, log it. Do not skip it 📸💪',
        'Future you wants proof. Give it some 🔥',
        'Photos keep you honest. Take one today 😤📸',
        'I need a new progress photo. Stop stalling 💢',
        'Take the picture before you find another excuse, {name} 😡',
        'One photo, thirty seconds, lifelong evidence. Go 📸🔥',
      ],
    },
    mirko: {
      titles: ['📸 Photo time, gorgeous', '😘 Progress photo date', '🥰 Say cheese'],
      bodies: [
        'It has been {days} since your last progress photo 😘 Come take one for me? 📸',
        'Smile, {name} 💕 A quick progress photo will remind you how far you have come',
        'Photo time, cutie 🥰 Natural light, big smile, no pressure',
        'I love looking back at your journey 😏 Add a new photo today',
        'A little photo date with yourself 💋 Take one and log it',
        'Future you will love this one, gorgeous 💕📸',
        'It has been {days} 😘 Show me how you are doing',
        'Take a quick snap for your progress timeline 🥰 You will be glad you did',
        'Camera ready, {name}? 😉 Let us capture this chapter',
        'Just one photo for me, pretty please 🥺📸 You are doing amazing',
      ],
    },
  },

  winback: {
    goku: {
      titles: ['😡 WHERE ARE YOU', '💢 {days} gone. Seriously?', '🔥 Come back. Now.'],
      bodies: [
        '{days} of nothing logged. Did you quit on yourself? Get back here 😡',
        'I gave you a plan and you disappeared for {days}. Unacceptable, {name} 💢',
        'Come back and fight. Nobody gets results by ghosting their goals 🔥',
        '{days} silent. I am not mad. I am DISAPPOINTED. And mad 😤',
        'Your streak is gone and I noticed. Start again today. Right now 💢',
        'Missing for {days}? Open the app and make up for it 🔥😡',
        'I do not do quitters, {name}. So come back and prove you are not one 😤',
        'One log. That is all it takes to restart. Do it 💪💢',
        '{days} of excuses. Today is the day you end them 😡🔥',
        'Where did you go? The goals are still here and so am I. Move 😤',
      ],
    },
    mirko: {
      titles: ['🥺 I miss you', '😘 Come back to me', '💕 Where did you go, cutie?'],
      bodies: [
        'It has been {days} and I miss you, {name} 🥺 Come back, just one little log',
        'Hey you 😘 I have been thinking about you. Come back and say hi',
        'No judgement, only hugs 🤗 Open the app and let us start again together 💕',
        '{days} is a long time without you 🥰 Come back, I saved your spot',
        'I am not mad, just missing you 😏 One small step today, cutie',
        'Life gets busy, I get it 💕 But I am still here cheering for you, {name}',
        'Come log something for me 😘 Even a glass of water counts',
        'I kept your goals warm for you 🥰 Come back and let us continue',
        'Please come back, {name} 🥺 We were doing so well together',
        'I miss your messages 💋 Let us pick up where we left off',
      ],
    },
  },
};

export type Vars = Partial<Record<'name' | 'streak' | 'pct' | 'glasses' | 'session' | 'tasks' | 'protein' | 'days' | 'quests', string>>;

/** Fills the {placeholders}. An unknown or missing one is left out rather than printed raw. */
export function fill(text: string, vars: Vars): string {
  return text.replace(/\{(\w+)\}/g, (_, k: string) => (vars as Record<string, string | undefined>)[k] ?? '').replace(/\s+([,.!?])/g, '$1').replace(/\s{2,}/g, ' ').trim();
}

export const voiceOf = (style: CoachStyle): 'goku' | 'mirko' => (style === 'male' ? 'goku' : 'mirko');
