/** Minimal analytics: console + a rolling buffer in localStorage. Swap the sink later (e.g. Firebase). */
const KEY = 'rf.analytics';
const MAX = 500;

export interface AnalyticsEvent {
  e: string;
  t: number;
  p?: Record<string, unknown>;
}

export function track(e: string, p?: Record<string, unknown>) {
  const ev: AnalyticsEvent = { e, t: Date.now(), p };
  if (import.meta.env?.DEV) console.debug('[track]', e, p ?? '');
  try {
    const buf: AnalyticsEvent[] = JSON.parse(localStorage.getItem(KEY) || '[]');
    buf.push(ev);
    if (buf.length > MAX) buf.splice(0, buf.length - MAX);
    localStorage.setItem(KEY, JSON.stringify(buf));
  } catch {
    /* storage full or unavailable */
  }
  (window as unknown as { __events?: AnalyticsEvent[] }).__events?.push(ev);
}
