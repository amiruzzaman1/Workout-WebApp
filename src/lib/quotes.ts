import quotesData from '../data/quotes.json';

// Gym friendly quotes from src/data/quotes.json, shown on the Dashboard.
// A quote is used if it has one of these tags and none of the off topic ones.
const WANTED = ['motivation', 'perseverance', 'growth', 'courage', 'resilience', 'change', 'success'];
const SKIP = ['love', 'forgiveness', 'friendship', 'empathy', 'gratitude', 'humility', 'harmony', 'anger', 'fear'];
// Inspiration is a broad tag. It only counts when the quote has none of these softer topics too.
const SOFT = ['life', 'happiness', 'creativity', 'wisdom', 'mindfulness', 'hope', 'purpose', 'justice', 'knowledge', 'self-reflection', 'leadership', 'general', 'integrity', 'patience'];

const has = (tags: string[], list: string[]) => tags.some((t) => list.includes(t));

const QUOTES: { text: string; author: string }[] = (quotesData as { quote: string; author: string; length: number; tags: string[] }[])
  // Only short ones fit the card.
  .filter((q) => q.length <= 140 && !has(q.tags, SKIP)
    && (has(q.tags, WANTED) || (q.tags.includes('inspiration') && !has(q.tags, SOFT))))
  // The file marks some quotes as Unknown. Those show with no author line.
  .map((q) => ({ text: q.quote, author: q.author === 'Unknown' ? '' : q.author }));

export type Quote = (typeof QUOTES)[number];

/** A random quote, never the same as the one passed in. */
export function randomQuote(not?: Quote): Quote {
  let q = QUOTES[Math.floor(Math.random() * QUOTES.length)];
  while (q === not && QUOTES.length > 1) q = QUOTES[Math.floor(Math.random() * QUOTES.length)];
  return q;
}

/** How often the quote on screen swaps to a new one. */
export const QUOTE_EVERY_MS = 10 * 60 * 1000;
