// Error monitoring with Sentry. Off unless VITE_SENTRY_DSN is set, and Sentry's code is only downloaded when it is.
// Privacy: no session replay, no IP / cookies / user PII, and amounts or names are never attached to events.
const dsn = import.meta.env.VITE_SENTRY_DSN;
let sentry = null;
const queue = [];

export function initMonitoring() {
  if (!dsn) return;
  import('@sentry/react').then((S) => {
    S.init({
      dsn,
      environment: import.meta.env.MODE,
      release: import.meta.env.VITE_APP_VERSION || undefined,
      sendDefaultPii: false,
      tracesSampleRate: 0,
      beforeSend(event) {
        if (event.request) { delete event.request.cookies; delete event.request.data; delete event.request.headers; }
        if (event.user) event.user = event.user.id ? { id: event.user.id } : undefined;
        return event;
      },
    });
    sentry = S;
    for (const [err, ctx] of queue.splice(0)) S.captureException(err, ctx);
  }).catch(() => {});
}

/** Report an error. Safe to call before Sentry loads or when it is off. */
export function reportError(error, context) {
  const ctx = context ? { extra: context } : undefined;
  if (sentry) sentry.captureException(error, ctx);
  else if (dsn) queue.push([error, ctx]);
}

/** Tag events with the signed-in user's id only (never email or name). */
export function setMonitoringUser(id) {
  if (sentry) sentry.setUser(id ? { id } : null);
}
