import { FITNESS_QUOTES } from '../data/fitnessQuotes';

// Today's Quote on the Dashboard: only quotes about training, health, discipline and grinding, hand picked in
// src/data/fitnessQuotes.ts. (The old src/data/quotes.json pool was general life advice filtered by tag, and far
// too much of it had nothing to do with the body or the work, so it is no longer used.)
const QUOTES = FITNESS_QUOTES;

export type Quote = (typeof QUOTES)[number];

/** A random quote, never the same as the one passed in. */
export function randomQuote(not?: Quote): Quote {
  let q = QUOTES[Math.floor(Math.random() * QUOTES.length)];
  while (q === not && QUOTES.length > 1) q = QUOTES[Math.floor(Math.random() * QUOTES.length)];
  return q;
}

/** How often the quote on screen swaps to a new one. */
export const QUOTE_EVERY_MS = 10 * 60 * 1000;
