import type { Session } from '@supabase/supabase-js';

/** Features written only for Amir (the Career plan). This hides them in the app; the plan text itself ships in the bundle, but each person's ticks are already private by row level security. */
export const OWNER_EMAIL = 'amirzaman24@gmail.com';

export const isOwner = (session: Session | null) => session?.user.email?.toLowerCase() === OWNER_EMAIL;
