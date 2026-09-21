// The rules for a new password, checked while you type on the Create account tab.

export type PasswordRule = { key: string; label: string; ok: boolean };

export const MIN_PASSWORD_LENGTH = 8;

/** The symbols Supabase counts, exactly. A character outside this list (like a pound sign or an emoji) is not accepted as the symbol. */
const SYMBOLS = /[!@#$%^&*()_+\-=\[\]{};':"\\|<>?,./`~]/;

/** Words that make a password easy to guess, however many symbols are added around them. */
const EASY_WORDS = ['password', 'passw0rd', 'qwerty', 'letmein', 'welcome', 'admin', 'iloveyou', '123456', '654321', 'abc123', 'forge', 'workout', 'monkey', 'dragon', 'football'];

/** True if the password is built from your email name, an easy word, or one character repeated. */
function isEasy(password: string, email: string) {
  const p = password.toLowerCase();
  if (EASY_WORDS.some((w) => p.includes(w))) return true;
  if (/(.)\1{3,}/.test(password)) return true;
  const name = email.trim().toLowerCase().split('@')[0];
  return name.length >= 3 && p.includes(name);
}

/**
 * Checks a password against every rule. `score` runs from 0 to 6 (the five character rules, plus one for being
 * 14 or more characters long), and `valid` is only true when every rule passes.
 */
export function checkPassword(password: string, email = '') {
  const rules: PasswordRule[] = [
    { key: 'length', label: `At least ${MIN_PASSWORD_LENGTH} characters`, ok: password.length >= MIN_PASSWORD_LENGTH },
    { key: 'lower', label: 'A lowercase letter', ok: /[a-z]/.test(password) },
    { key: 'upper', label: 'An uppercase letter', ok: /[A-Z]/.test(password) },
    { key: 'number', label: 'A number', ok: /\d/.test(password) },
    { key: 'symbol', label: 'A symbol, like ! or ?', ok: SYMBOLS.test(password) },
    { key: 'easy', label: 'Not your email or an easy to guess word', ok: password.length > 0 && !isEasy(password, email) },
  ];
  const passed = rules.slice(0, 5).filter((r) => r.ok).length + (password.length >= 14 ? 1 : 0);
  const score = rules[5].ok ? passed : Math.min(passed, 2);
  const label = password.length === 0 ? '' : score <= 2 ? 'Weak' : score <= 4 ? 'Fair' : score === 5 ? 'Good' : 'Strong';
  return { rules, score, label, valid: rules.every((r) => r.ok), missing: rules.filter((r) => !r.ok).map((r) => r.label) };
}
