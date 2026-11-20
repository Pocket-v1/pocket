// The login screen is always light. Inside the app we remember the last theme
// the user used (light or dark) and bring it back the next time they sign in.
const KEY = 'pocket.appTheme';
export function storedTheme() {
  try { const t = localStorage.getItem(KEY); if (t === 'light' || t === 'dark') return t; } catch {}
  return 'light';
}
export function saveTheme(t) { try { localStorage.setItem(KEY, t); } catch {} }
export function hasStoredSession() {
  try { return Object.keys(localStorage).some(k => /^sb-.*-auth-token$/.test(k)); } catch { return false; }
}
// Theme to show while the app is booting: last theme if signed in, light for the login.
export function bootTheme() { return hasStoredSession() ? storedTheme() : 'light'; }
