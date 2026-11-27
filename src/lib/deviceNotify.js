// System notifications on this device (phone or computer) for Pocket reminders.
// Opt-in per device: the choice and the "already shown today" marker live in this browser only.
const KEY = 'pocket-device-notifications';
const DAY_KEY = 'pocket-device-notifications-day';
const store = { get: k => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* private mode */ } } };

export const deviceNotifySupported = () => typeof window !== 'undefined' && 'Notification' in window;
export const deviceNotifyEnabled = () => deviceNotifySupported() && Notification.permission === 'granted' && store.get(KEY) === '1';

/** Ask the browser for permission. Returns 'granted' | 'denied' | 'default' | 'unsupported'. */
export async function enableDeviceNotify() {
  if (!deviceNotifySupported()) return 'unsupported';
  const result = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
  store.set(KEY, result === 'granted' ? '1' : '0');
  return result;
}
export function disableDeviceNotify() { store.set(KEY, '0'); }

async function show(title, body, tag) {
  const options = { body, tag, icon: '/brand/favicon-192.png', badge: '/brand/favicon-192.png', data: { url: '/' } };
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) { await reg.showNotification(title, options); return; }
  } catch { /* fall back below */ }
  try { new Notification(title, options); } catch { /* some mobile browsers only allow the service worker route */ }
}

/** One summary per day, the first time Pocket opens with reminders pending. */
export function notifyDailySummary(items, today) {
  if (!deviceNotifyEnabled() || !items.length || store.get(DAY_KEY) === today) return;
  store.set(DAY_KEY, today);
  const body = items.slice(0, 3).map(i => `${i.name}${i.detail ? ` — ${String(i.detail).split(' · ')[0]}` : ''}`).join('\n') + (items.length > 3 ? `\n+${items.length - 3} more` : '');
  show(`${items.length} reminder${items.length === 1 ? '' : 's'} in Pocket`, body, 'pocket-daily');
}

/** A reminder that appeared while Pocket is open. */
export function notifyItem(item) {
  if (!deviceNotifyEnabled() || document.visibilityState === 'visible') return;
  show(item.name, String(item.detail || ''), `pocket-${item.id}`);
}
