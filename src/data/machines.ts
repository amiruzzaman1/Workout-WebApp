// Gym machines and equipment, with beginner guides.
// `exercises` are ids from exercises.json; the first one is used as the demo animation.
// `jetts` = included in the default "Jetts Newtown" template (to be confirmed with photos).

export type EquipmentKind = 'machine' | 'cable' | 'cardio' | 'free';

export type Machine = {
  key: string;
  name: string;
  kind: EquipmentKind;
  muscles: string[];
  summary: string;
  setup: string[];
  howTo: string[];
  mistakes: string[];
  tip?: string;
  exercises: string[];
  jetts: boolean;
};

export const MACHINES: Machine[] = [
  // ---------- Legs ----------
  {
    key: 'leg_press',
    name: 'Leg Press',
    kind: 'machine',
    muscles: ['quadriceps', 'glutes', 'hamstrings'],
    summary: 'You sit and push a weighted platform away with your feet. The safest way for a beginner to load the legs heavily.',
    setup: [
      'Adjust the back rest so your knees can bend to about 90° without your lower back lifting off the pad.',
      'Feet flat on the platform, hip-width apart, in the middle of the plate.',
      'Choose the weight (pin stack or plates). Start light: you should manage 12 easy reps.',
      'Push the platform up slightly and release the safety handles by the seat.',
    ],
    howTo: [
      'Breathe in and slowly bend your knees, bringing the platform towards you (about 2 to 3 seconds).',
      'Stop when your knees reach roughly 90°, or just before your lower back starts to round.',
      'Push through your whole foot (mainly heels) to straighten your legs, breathing out.',
      'Stop just short of locking your knees, then repeat.',
      'When finished, re-engage the safety handles before taking your feet off.',
    ],
    mistakes: [
      'Locking the knees straight at the top. Keep a tiny bend.',
      'Lowering so far your hips curl up off the seat.',
      'Letting the knees cave inwards. Push them out in line with your toes.',
    ],
    tip: 'Feet higher on the plate = more glutes/hamstrings; lower = more quads.',
    exercises: ['Leg_Press', 'Narrow_Stance_Leg_Press', 'Calf_Press_On_The_Leg_Press_Machine'],
    jetts: true,
  },
  {
    key: 'leg_extension',
    name: 'Leg Extension',
    kind: 'machine',
    muscles: ['quadriceps'],
    summary: 'Seated machine where you straighten your knees against a padded roller. Isolates the front of the thighs.',
    setup: [
      'Adjust the back rest so the back of your knees sit right at the edge of the seat.',
      'Line your knee joint up with the machine\'s pivot point (usually a coloured dot).',
      'Set the ankle pad so it rests on your lower shin, just above your feet.',
      'Pick a light weight on the pin stack.',
    ],
    howTo: [
      'Hold the side handles and sit tall.',
      'Straighten your legs to lift the pad until your legs are nearly straight. Squeeze your thighs for a second.',
      'Lower slowly (2 to 3 seconds) back to the start without letting the weights crash.',
    ],
    mistakes: [
      'Swinging the weight up with momentum.',
      'Pivot point not lined up with your knee, which strains the joint.',
    ],
    exercises: ['Leg_Extensions', 'Single-Leg_Leg_Extension'],
    jetts: true,
  },
  {
    key: 'seated_leg_curl',
    name: 'Seated Leg Curl',
    kind: 'machine',
    muscles: ['hamstrings'],
    summary: 'Seated machine where you bend your knees to pull a pad down and back. Works the back of the thighs.',
    setup: [
      'Adjust the back rest so your knees line up with the machine\'s pivot point.',
      'Lower pad sits just above your heels (on the back of your lower leg).',
      'Bring the thigh pad down so it holds your legs firmly just above the knees.',
    ],
    howTo: [
      'Hold the handles, sit tall.',
      'Bend your knees to pull the pad down and under the seat as far as comfortable.',
      'Pause, then let your legs straighten slowly (2 to 3 seconds).',
    ],
    mistakes: ['Lifting hips off the seat.', 'Letting the weight yank your legs back up.'],
    exercises: ['Seated_Leg_Curl'],
    jetts: true,
  },
  {
    key: 'lying_leg_curl',
    name: 'Lying Leg Curl',
    kind: 'machine',
    muscles: ['hamstrings'],
    summary: 'Face-down version of the leg curl. Same muscle, slightly different feel.',
    setup: [
      'Lie face down, knees just off the end of the bench, lined up with the pivot point.',
      'The roller pad sits just above your heels.',
    ],
    howTo: [
      'Hold the handles, keep hips pressed into the pad.',
      'Curl your heels towards your bum.',
      'Lower slowly until your legs are nearly straight.',
    ],
    mistakes: ['Hips lifting off the bench to cheat the weight up.'],
    exercises: ['Lying_Leg_Curls'],
    jetts: false,
  },
  {
    key: 'hip_abduction',
    name: 'Hip Abductor / Adductor',
    kind: 'machine',
    muscles: ['abductors', 'adductors', 'glutes'],
    summary: 'Seated machine with pads on your knees. Push them outward (outer hip/glutes) or squeeze inward (inner thigh). Often one machine does both.',
    setup: [
      'Sit with your back against the pad.',
      'Set the lever/pin so the pads start in the position you need: together for abduction (pushing out), wide apart for adduction (squeezing in).',
      'Place feet on the foot rests, pads on the outside (or inside) of your knees.',
    ],
    howTo: [
      'Push your knees out (or squeeze them in) smoothly as far as comfortable.',
      'Pause for a second, then return slowly without letting the stack touch down.',
    ],
    mistakes: ['Starting with a huge range on the adductor setting, which can strain the groin.'],
    exercises: ['Thigh_Abductor', 'Thigh_Adductor'],
    jetts: true,
  },
  {
    key: 'calf_raise',
    name: 'Calf Raise Machine',
    kind: 'machine',
    muscles: ['calves'],
    summary: 'Standing or seated machine where you rise onto your toes against resistance.',
    setup: [
      'Balls of your feet on the edge of the step, heels hanging off.',
      'Standing: shoulder pads on your shoulders. Seated: knee pad snug on your thighs.',
    ],
    howTo: [
      'Lower your heels slowly for a good stretch.',
      'Rise up as high as you can onto your toes and squeeze for a second.',
      'Keep your knees soft, not locked.',
    ],
    mistakes: ['Bouncing quickly with tiny range of motion.'],
    exercises: ['Standing_Calf_Raises', 'Seated_Calf_Raise'],
    jetts: false,
  },
  {
    key: 'hack_squat',
    name: 'Hack Squat',
    kind: 'machine',
    muscles: ['quadriceps', 'glutes'],
    summary: 'You stand on an angled platform with your back on a sliding pad and squat down. A guided squat.',
    setup: [
      'Back flat on the pad, shoulders under the shoulder pads.',
      'Feet shoulder-width on the platform, slightly forward.',
      'Release the safety handles.',
    ],
    howTo: [
      'Bend your knees and lower until thighs are around parallel with the platform.',
      'Push through your heels to stand back up.',
      'Re-engage the safety handles at the end.',
    ],
    mistakes: ['Heels lifting.', 'Knees caving in.'],
    exercises: ['Hack_Squat'],
    jetts: false,
  },

  // ---------- Chest ----------
  {
    key: 'chest_press',
    name: 'Chest Press',
    kind: 'machine',
    muscles: ['chest', 'triceps', 'shoulders'],
    summary: 'Seated pushing machine. The easiest, safest way to start training the chest.',
    setup: [
      'Adjust the seat so the handles line up with the middle of your chest.',
      'Some machines have a foot bar to bring the handles forward. Use it to get into the start position.',
      'Back and head flat against the pad.',
    ],
    howTo: [
      'Grip the handles, shoulder blades pulled slightly back and down.',
      'Push the handles forward until your arms are almost straight, breathing out.',
      'Let them come back slowly until you feel a light stretch in the chest.',
    ],
    mistakes: ['Seat too low or high (handles at your neck or belly).', 'Shoulders rolling forward off the pad.'],
    exercises: ['Machine_Bench_Press', 'Leverage_Chest_Press', 'Leverage_Incline_Chest_Press'],
    jetts: true,
  },
  {
    key: 'pec_deck',
    name: 'Pec Deck / Rear Delt Fly',
    kind: 'machine',
    muscles: ['chest', 'shoulders'],
    summary: 'Seated machine with two arms that swing together. Facing out it trains the chest (fly); facing the pad it trains the back of the shoulders (rear delt fly).',
    setup: [
      'Chest fly: sit with your back on the pad. Adjust the seat so handles are at chest height. Set arms so you feel a mild stretch at the start.',
      'Rear delt: sit facing the pad, chest against it. Swap the handles to the back position (lever at the top).',
    ],
    howTo: [
      'Chest fly: with a slight bend in your elbows, bring the handles together in front of you in a hugging motion. Return slowly.',
      'Rear delt: arms straight-ish, pull the handles out and back in a wide arc. Return slowly.',
    ],
    mistakes: ['Going too heavy and bending the elbows so it becomes a press.', 'Over-stretching at the back of the chest fly.'],
    exercises: ['Butterfly', 'Reverse_Machine_Flyes'],
    jetts: true,
  },

  // ---------- Back ----------
  {
    key: 'lat_pulldown',
    name: 'Lat Pulldown',
    kind: 'cable',
    muscles: ['lats', 'biceps', 'middle back'],
    summary: 'Seated machine where you pull a bar down to your chest. Builds the back until you can do pull-ups.',
    setup: [
      'Adjust the thigh pad so your legs are locked in snugly.',
      'Stand up, grab the bar a bit wider than shoulder-width, and sit down holding it.',
    ],
    howTo: [
      'Lean back slightly, chest up.',
      'Pull the bar down to the top of your chest, leading with your elbows down and back.',
      'Squeeze your shoulder blades together, then let the bar rise slowly until your arms are straight.',
    ],
    mistakes: ['Pulling behind the neck.', 'Leaning way back and yanking with the whole body.'],
    tip: 'Think "elbows to back pockets" rather than pulling with your hands.',
    exercises: ['Wide-Grip_Lat_Pulldown', 'Close-Grip_Front_Lat_Pulldown', 'Underhand_Cable_Pulldowns', 'V-Bar_Pulldown'],
    jetts: true,
  },
  {
    key: 'seated_row',
    name: 'Seated Cable Row',
    kind: 'cable',
    muscles: ['middle back', 'lats', 'biceps'],
    summary: 'Seated machine where you pull a handle towards your belly. Works the middle of the back.',
    setup: [
      'Attach a close-grip (V) handle if it isn\'t already on.',
      'Sit with feet on the foot plates, knees slightly bent.',
      'Grab the handle and sit tall with arms straight.',
    ],
    howTo: [
      'Keep your back straight and chest up.',
      'Pull the handle to your lower ribs, squeezing your shoulder blades together.',
      'Let your arms straighten slowly, feeling a stretch across your upper back.',
    ],
    mistakes: ['Rocking back and forth with the torso.', 'Rounding the lower back.'],
    exercises: ['Seated_Cable_Rows', 'Seated_One-arm_Cable_Pulley_Rows'],
    jetts: true,
  },
  {
    key: 'row_machine',
    name: 'Chest-Supported Row Machine',
    kind: 'machine',
    muscles: ['middle back', 'lats'],
    summary: 'Row machine where your chest rests on a pad, so your lower back is protected.',
    setup: ['Adjust the seat so the handles are at chest height and your chest sits on the pad.'],
    howTo: [
      'Grab the handles, pull your elbows back past your body.',
      'Squeeze shoulder blades, then extend your arms slowly.',
    ],
    mistakes: ['Lifting your chest off the pad to heave the weight.'],
    exercises: ['Leverage_Iso_Row', 'Leverage_High_Row'],
    jetts: false,
  },
  {
    key: 'assisted_pullup',
    name: 'Assisted Pull-up / Dip Machine',
    kind: 'machine',
    muscles: ['lats', 'biceps', 'triceps', 'chest'],
    summary: 'A knee pad pushes you up to make pull-ups and dips easier. More weight on the stack = more help.',
    setup: [
      'Select a weight. Here, heavier makes it EASIER. Start with around 60 to 70% of your bodyweight.',
      'Step onto the platform and kneel on the pad (or stand, depending on the model).',
    ],
    howTo: [
      'Pull-up: grip the top handles, pull your chin above the bar, lower slowly.',
      'Dip: grip the lower handles, lower until elbows are at ~90°, push back up.',
    ],
    mistakes: ['Dropping too low on dips. Stop at 90° to protect the shoulders.'],
    exercises: ['Dip_Machine'],
    jetts: false,
  },
  {
    key: 'back_extension',
    name: 'Back Extension Bench',
    kind: 'machine',
    muscles: ['lower back', 'glutes', 'hamstrings'],
    summary: 'Angled bench where you hinge at the hips and lift your upper body. Strengthens the lower back and glutes.',
    setup: ['Adjust the pad so it sits just below your hip bones, allowing you to bend at the hips.', 'Hook your heels under the foot pads.'],
    howTo: [
      'Cross your arms on your chest.',
      'Bend forward at the hips, keeping your back straight.',
      'Lift back up until your body is in a straight line, and don\'t arch past that.',
    ],
    mistakes: ['Hyper-extending (arching) at the top.', 'Moving fast and jerky.'],
    exercises: ['Hyperextensions_Back_Extensions'],
    jetts: true,
  },

  // ---------- Shoulders / arms ----------
  {
    key: 'shoulder_press',
    name: 'Shoulder Press Machine',
    kind: 'machine',
    muscles: ['shoulders', 'triceps'],
    summary: 'Seated machine where you press handles overhead.',
    setup: [
      'Adjust the seat so the handles start around shoulder height.',
      'Back flat on the pad, feet flat on the floor.',
    ],
    howTo: [
      'Press the handles overhead until your arms are nearly straight.',
      'Lower slowly back to shoulder height.',
    ],
    mistakes: ['Arching the lower back off the pad.', 'Seat so low the start position hurts your shoulders.'],
    exercises: ['Machine_Shoulder_Military_Press', 'Leverage_Shoulder_Press'],
    jetts: true,
  },
  {
    key: 'bicep_curl_machine',
    name: 'Bicep Curl Machine',
    kind: 'machine',
    muscles: ['biceps'],
    summary: 'Preacher-style machine where your upper arms rest on a pad while you curl.',
    setup: ['Adjust the seat so your armpits sit at the top of the arm pad.', 'Line your elbows up with the pivot point.'],
    howTo: ['Curl the handles up towards your shoulders.', 'Lower slowly until your arms are almost straight.'],
    mistakes: ['Lifting your elbows off the pad.'],
    exercises: ['Machine_Bicep_Curl', 'Machine_Preacher_Curls'],
    jetts: false,
  },
  {
    key: 'tricep_machine',
    name: 'Tricep Extension Machine',
    kind: 'machine',
    muscles: ['triceps'],
    summary: 'Seated machine where you push handles down/out by straightening your elbows.',
    setup: ['Adjust the seat so your elbows line up with the pivot point.'],
    howTo: ['Straighten your arms fully, squeezing the back of your arms.', 'Return slowly.'],
    mistakes: ['Letting the elbows flare wide.'],
    exercises: ['Machine_Triceps_Extension'],
    jetts: false,
  },
  {
    key: 'ab_crunch_machine',
    name: 'Ab Crunch Machine',
    kind: 'machine',
    muscles: ['abdominals'],
    summary: 'Seated machine where you curl your torso forward against resistance.',
    setup: ['Adjust the seat so the handles/pads sit at your upper chest or shoulders.'],
    howTo: ['Breathe out and curl your chest towards your hips using your abs.', 'Return slowly.'],
    mistakes: ['Pulling with your arms instead of crunching with your abs.'],
    exercises: ['Ab_Crunch_Machine'],
    jetts: false,
  },

  // ---------- Cable station / Smith ----------
  {
    key: 'cable_station',
    name: 'Cable Station (Adjustable Pulley)',
    kind: 'cable',
    muscles: ['chest', 'shoulders', 'triceps', 'biceps', 'abdominals'],
    summary: 'Tall frame with pulleys you can slide up and down and clip different handles onto. One machine, dozens of exercises.',
    setup: [
      'Pull the pin on the pulley carriage and slide it to the height you need (high for pushdowns, low for curls).',
      'Clip on the handle with the carabiner: rope, straight bar, or single D-handle.',
      'Set the weight on the stack. Note: some stations have a 2:1 ratio, so the number feels lighter than it says.',
    ],
    howTo: [
      'Step back so the weight lifts off the stack a little at the start of every rep.',
      'Keep your body still, so only the working joint moves.',
      'Control the weight on the way back; never let the stack slam.',
    ],
    mistakes: ['Standing too close so the stack touches down every rep.', 'Using body swing to move the weight.'],
    exercises: [
      'Triceps_Pushdown_-_Rope_Attachment', 'Triceps_Pushdown', 'Standing_Biceps_Cable_Curl', 'Cable_Crossover',
      'Face_Pull', 'Cable_Crunch', 'Cable_Seated_Lateral_Raise', 'Straight-Arm_Pulldown', 'Pallof_Press',
      'Cable_Rope_Overhead_Triceps_Extension', 'Cable_Hammer_Curls_-_Rope_Attachment', 'Pull_Through',
    ],
    jetts: true,
  },
  {
    key: 'smith_machine',
    name: 'Smith Machine',
    kind: 'machine',
    muscles: ['quadriceps', 'chest', 'shoulders'],
    summary: 'A barbell that slides on fixed rails, with hooks you can rack at any height. Safer than a free barbell for learning squats and presses.',
    setup: [
      'Set the safety stoppers just below the lowest point of your movement.',
      'Position the bar at the right height to unrack (shoulder height for squats).',
      'The empty bar often weighs less than 20 kg, so check the sticker.',
    ],
    howTo: [
      'Get under the bar, rotate your wrists to unhook it from the pegs.',
      'Do your reps.',
      'Rotate the bar back to hook it onto the nearest peg.',
    ],
    mistakes: ['Forgetting to set the safety stoppers.', 'Feet directly under the bar for squats. Step them slightly forward.'],
    exercises: ['Smith_Machine_Squat', 'Smith_Machine_Bench_Press', 'Smith_Machine_Incline_Bench_Press', 'Smith_Machine_Overhead_Shoulder_Press', 'Smith_Machine_Calf_Raise'],
    jetts: true,
  },

  // ---------- Cardio ----------
  {
    key: 'treadmill',
    name: 'Treadmill',
    kind: 'cardio',
    muscles: ['quadriceps', 'calves'],
    summary: 'Walk or run on a moving belt.',
    setup: [
      'Clip the safety key to your clothing. Pulling it stops the belt.',
      'Stand on the side rails, press Start, then step on once the belt is moving slowly.',
    ],
    howTo: [
      'Start at a walking speed (4 to 5 km/h) for a warm-up.',
      'Increase speed or incline gradually. An incline walk (8 to 12%) at 5 km/h is great low-impact cardio.',
      'To finish, lower the speed to a walk for 2 to 3 minutes before pressing Stop.',
    ],
    mistakes: ['Holding onto the rails the whole time.', 'Jumping off a moving belt.'],
    exercises: ['Walking_Treadmill', 'Jogging_Treadmill', 'Running_Treadmill'],
    jetts: true,
  },
  {
    key: 'bike',
    name: 'Exercise Bike',
    kind: 'cardio',
    muscles: ['quadriceps'],
    summary: 'Upright or recumbent (seat with back rest) stationary bike. Very knee-friendly cardio.',
    setup: ['Seat height: at the bottom of the pedal stroke your knee should be slightly bent.'],
    howTo: ['Pedal at a steady pace, adjust resistance with the buttons so it feels like a 6/10 effort.'],
    mistakes: ['Seat too low (knee pain) or too high (hips rocking).'],
    exercises: ['Bicycling_Stationary', 'Recumbent_Bike'],
    jetts: true,
  },
  {
    key: 'cross_trainer',
    name: 'Cross Trainer (Elliptical)',
    kind: 'cardio',
    muscles: ['quadriceps', 'glutes'],
    summary: 'Standing machine where your feet move in an oval and arms push/pull handles. Low impact on joints.',
    setup: ['Step onto the pedals holding the static handles, then start moving to wake the screen.'],
    howTo: ['Push and pull the moving handles in time with your legs. Keep your posture upright.'],
    mistakes: ['Leaning heavily on the handles.'],
    exercises: ['Elliptical_Trainer'],
    jetts: true,
  },
  {
    key: 'rower',
    name: 'Rowing Machine',
    kind: 'cardio',
    muscles: ['middle back', 'quadriceps', 'hamstrings'],
    summary: 'Full-body cardio: legs push, then body leans back, then arms pull.',
    setup: ['Strap your feet in with the strap across the widest part of your foot.', 'Damper (fan lever) around 3 to 5.'],
    howTo: [
      'Order on the way back: legs, then lean back slightly, then pull the handle to your lower ribs.',
      'Order on the way forward: arms, then lean forward, then bend the knees.',
    ],
    mistakes: ['Pulling with the arms first.', 'Damper on 10, which makes it harder rather than better.'],
    exercises: ['Rowing_Stationary'],
    jetts: true,
  },
  {
    key: 'stairmaster',
    name: 'StairMaster',
    kind: 'cardio',
    muscles: ['quadriceps', 'glutes', 'calves'],
    summary: 'A moving staircase. Hard cardio that also works the glutes. Jetts Newtown lists a "Performance StairMaster".',
    setup: ['Hold the side rails, press Start on a low level (3 to 5).'],
    howTo: ['Step with your whole foot on each stair, stand tall.', 'Hold rails lightly for balance only.'],
    mistakes: ['Leaning your weight onto the rails.', 'Starting too fast. 5 to 10 minutes is plenty at first.'],
    exercises: ['Stairmaster', 'Step_Mill'],
    jetts: true,
  },

  // ---------- Free weights & other ----------
  { key: 'dumbbells', name: 'Dumbbells', kind: 'free', muscles: [], summary: 'Handheld weights, usually in a rack from light to heavy.', setup: ['Pick up and put down dumbbells with a straight back, bending at the knees.', 'Always return them to the right spot on the rack.'], howTo: ['Start lighter than you think; add weight when all sets feel easy.'], mistakes: ['Dropping them from height.'], exercises: ['Dumbbell_Bench_Press'], jetts: true },
  { key: 'barbell', name: 'Barbell & Rack', kind: 'free', muscles: [], summary: 'Olympic bar (20 kg) with weight plates, used in a squat rack or on a bench.', setup: ['Always use collars/clips to lock the plates.', 'Set the rack safety bars before squatting or benching.'], howTo: ['Learn the movement with the empty bar or the Smith machine first.'], mistakes: ['Loading plates unevenly.'], exercises: ['Barbell_Squat'], jetts: true },
  { key: 'ez_bar', name: 'EZ Curl Bar', kind: 'free', muscles: [], summary: 'Short bent bar that is easier on the wrists for curls and tricep work.', setup: [], howTo: [], mistakes: [], exercises: ['EZ-Bar_Curl'], jetts: true },
  { key: 'bench', name: 'Adjustable Bench', kind: 'free', muscles: [], summary: 'Bench that sets flat, incline or upright.', setup: ['Pull the pin/lever and move the back rest; make sure it clicks into place.'], howTo: [], mistakes: [], exercises: [], jetts: true },
  { key: 'kettlebells', name: 'Kettlebells', kind: 'free', muscles: [], summary: 'Ball-shaped weight with a handle.', setup: [], howTo: [], mistakes: [], exercises: ['Goblet_Squat'], jetts: true },
  { key: 'pullup_bar', name: 'Pull-up / Dip Station', kind: 'free', muscles: [], summary: 'Bar for pull-ups and parallel bars for dips and knee raises.', setup: [], howTo: [], mistakes: [], exercises: ['Pullups'], jetts: true },
  { key: 'bands', name: 'Resistance Bands', kind: 'free', muscles: [], summary: 'Elastic bands, found in the functional training zone.', setup: [], howTo: [], mistakes: [], exercises: [], jetts: true },
  { key: 'medicine_ball', name: 'Medicine Ball', kind: 'free', muscles: [], summary: 'Weighted ball.', setup: [], howTo: [], mistakes: [], exercises: [], jetts: true },
  { key: 'exercise_ball', name: 'Swiss Ball', kind: 'free', muscles: [], summary: 'Large inflatable ball.', setup: [], howTo: [], mistakes: [], exercises: [], jetts: true },
  { key: 'foam_roll', name: 'Foam Roller', kind: 'free', muscles: [], summary: 'For self-massage in the stretching area.', setup: [], howTo: [], mistakes: [], exercises: [], jetts: true },
];

export const MACHINE_BY_KEY: Record<string, Machine> = Object.fromEntries(MACHINES.map((m) => [m.key, m]));

export const JETTS_NEWTOWN_TEMPLATE = MACHINES.filter((m) => m.jetts).map((m) => m.key);

// Map a free-exercise-db equipment value to the key the user ticks in "My gym".
export const EQUIPMENT_TO_KEY: Record<string, string | null> = {
  dumbbell: 'dumbbells',
  barbell: 'barbell',
  'e-z curl bar': 'ez_bar',
  kettlebells: 'kettlebells',
  bands: 'bands',
  'medicine ball': 'medicine_ball',
  'exercise ball': 'exercise_ball',
  'foam roll': 'foam_roll',
  cable: 'cable_station',
  'body only': null, // always available
};

// Exercise id -> the specific machine it needs (overrides the generic mapping above).
export const EXERCISE_TO_MACHINE: Record<string, string> = {};
for (const m of MACHINES) {
  if (m.kind === 'free') continue;
  for (const id of m.exercises) EXERCISE_TO_MACHINE[id] = m.key;
}
// A few exercises need extra kit not captured by the generic mapping.
EXERCISE_TO_MACHINE['Pullups'] = 'pullup_bar';
EXERCISE_TO_MACHINE['Chin-Up'] = 'pullup_bar';
EXERCISE_TO_MACHINE['Dips_-_Triceps_Version'] = 'pullup_bar';
