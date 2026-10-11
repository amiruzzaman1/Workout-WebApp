export type ProgressPhoto = {
  id: string;
  day: string; // "YYYY-MM-DD", the day picked in the header when it was added
  note: string | null;
  created_at?: string;
};
