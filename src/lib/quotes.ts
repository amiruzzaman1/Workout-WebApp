// Short lines about building and changing, shown on the Today screen.
// The one you see changes every 10 minutes.
export const QUOTES: { text: string }[] = [
  { text: 'You do not rise to your goals. You fall to your habits.' },
  { text: 'Every session is a vote for the body you want.' },
  { text: 'The set you do not feel like doing is the one that changes you.' },
  { text: 'Two per cent heavier than last week is how a year transforms you.' },
  { text: 'Add a rep. That is the whole job today.' },
  { text: 'Compare today to your first day, never to somebody else.' },
  { text: 'The body achieves what the mind believes.' },
  { text: 'Discipline is choosing between what you want now and what you want most.' },
  { text: 'Strength does not come from what you can do. It comes from doing what you once could not.' },
  { text: 'Small daily improvements are the key to staggering long term results.' },
  { text: 'The weight does not care how you feel today. Pick it up anyway.' },
  { text: 'Show up on the days you do not feel like it. Those are the ones that count.' },
  { text: 'You are always one session away from a better mood.' },
  { text: 'Progress is slow, then it is obvious.' },
  { text: 'Train for the body you want in a year, not the one you want on Friday.' },
  { text: 'The first set is the hardest. Start it.' },
  { text: 'Consistency beats intensity, every week of the year.' },
  { text: 'Nobody has ever regretted the workout they did.' },
  { text: 'Change happens at the edge of comfortable.' },
  { text: 'One more rep is how strength is built.' },
  { text: 'Your only competition is who you were last month.' },
  { text: 'Fall in love with the process and the results come as a side effect.' },
  { text: 'Doubt kills more dreams than failure ever will.' },
  { text: 'Rest is part of the work, not a break from it.' },
  { text: 'Motivation gets you started. Habit keeps you going.' },
  { text: 'Do something today that your future self will thank you for.' },
  { text: 'It never gets easier. You just get stronger.' },
  { text: 'A bad workout still beats the one you skipped.' },
  { text: 'You cannot out train a plan you never follow.' },
  { text: 'Sore today, steady tomorrow, strong in six months.' },
  { text: 'The hardest lift is the door of the gym.' },
  { text: 'Eat for the training you are about to do.' },
  { text: 'Protein, sleep, and showing up. The rest is detail.' },
  { text: 'Slow progress is still progress, and it is the kind that lasts.' },
  { text: 'You are building something. Buildings go up one brick at a time.' },
  { text: 'Beat your last set, not the person next to you.' },
  { text: 'Turning up beaten and tired still counts. It might count double.' },
  { text: 'What you do most days matters more than what you do on your best day.' },
  { text: 'Make the plan boring and the results interesting.' },
  { text: 'You will never regret the discipline. Only the excuses.' },
];

/** Changes every 10 minutes, and never sits on the same one twice in a row. */
export function currentQuote(now = Date.now()) {
  const bucket = Math.floor(now / (10 * 60 * 1000));
  // A stride that shares no factor with the list length keeps the order varied.
  const i = (bucket * 7) % QUOTES.length;
  return QUOTES[i];
}

export function msUntilNextQuote(now = Date.now()) {
  const period = 10 * 60 * 1000;
  return period - (now % period) + 250;
}
