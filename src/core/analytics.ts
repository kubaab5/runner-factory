/** In-memory event buffer (no external analytics, no browser storage — Playgama rules 1.2.4, 3.2.1). */
export interface AnalyticsEvent {
  e: string;
  t: number;
  p?: Record<string, unknown>;
}
const buf: AnalyticsEvent[] = [];

export function track(e: string, p?: Record<string, unknown>) {
  const ev: AnalyticsEvent = { e, t: Date.now(), p };
  if (import.meta.env?.DEV) console.debug('[track]', e, p ?? '');
  buf.push(ev);
  if (buf.length > 300) buf.shift();
  (window as unknown as { __events?: AnalyticsEvent[] }).__events = buf;
}
