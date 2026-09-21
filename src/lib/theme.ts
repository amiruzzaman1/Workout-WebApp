// Monochrome design tokens.
export const C = {
  bg: '#000000',
  card: '#0b0b0b',
  card2: '#161616',
  border: '#232323',
  borderStrong: '#3a3a3a',
  text: '#f5f5f5',
  muted: '#8c8c8c',
  faint: '#555555',
  inverse: '#ffffff',
  inverseText: '#000000',
  // kept for older references
  accent: '#ffffff',
  accentText: '#000000',
  good: '#f5f5f5',
  danger: '#ff5a5a', // only for errors
};

export const F = {
  display: 'SpaceGrotesk_700Bold',
  displayMed: 'SpaceGrotesk_500Medium',
  body: 'Inter_400Regular',
  bodyMed: 'Inter_500Medium',
  bodySemi: 'Inter_600SemiBold',
};

export const R = { sm: 4, md: 8, lg: 12 };

/**
 * A small set of muted accents for labels that need telling apart.
 * Desaturated so they sit on black without fighting the monochrome look.
 */
export const A = {
  protein: '#6ea8fe', // blue
  carbs: '#e3b341',   // amber
  fat: '#b78cf5',     // violet
  fibre: '#5fc08b',   // green
  water: '#4fb3c4',   // cyan
  energy: '#f5f5f5',  // calories stay white
  up: '#5fc08b',      // go heavier / on track
  down: '#e3b341',    // ease off
  over: '#e0796b',    // past the limit
  core: '#d98fa8',    // rose
  cardio: '#eb8f6a',  // warm orange
};

/** One colour per muscle group, used on exercise rows, plans and workouts. */
export const GROUP_COLORS: Record<string, string> = {
  Chest: A.protein,
  Back: A.fibre,
  Legs: A.carbs,
  Shoulders: A.fat,
  Arms: A.water,
  Core: A.core,
  Cardio: A.cardio,
  Mobility: '#8a8a8a',
};
