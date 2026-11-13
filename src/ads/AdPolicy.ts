import type { AdsConfig } from './config';

export interface PolicyState {
  /** first launch timestamp (ms) */
  installedAt: number;
  /** highest level reached */
  level: number;
  /** ad-free until (ms), from the VIP pass or the purchase */
  vipUntil: number;
  noAdsPurchased: boolean;
  lastAppOpenAt: number;
}

/**
 * The single place that decides whether a non-rewarded ad may show right now.
 * Pure logic with an injectable clock so it can be unit-tested.
 */
export class AdPolicy {
  private sessionStart: number;
  private lastInterstitialAt = 0;
  private lastRewardedAt = 0;
  private shownThisSession = 0;

  constructor(
    private cfg: AdsConfig,
    private state: () => PolicyState,
    private now: () => number = () => Date.now(),
  ) {
    this.sessionStart = this.now();
  }

  setConfig(cfg: AdsConfig) {
    this.cfg = cfg;
  }

  /** Starts a new session (cold start or return after a long background). */
  newSession() {
    this.sessionStart = this.now();
    this.shownThisSession = 0;
  }

  daysSinceInstall(): number {
    return Math.floor((this.now() - this.state().installedAt) / 86_400_000);
  }

  cooldownMs(): number {
    const d = this.daysSinceInstall();
    const c = this.cfg.cooldown_s;
    return 1000 * (d <= 1 ? c.d0_1 : d <= 6 ? c.d2_6 : c.d7p);
  }

  adFree(): boolean {
    const s = this.state();
    return (this.cfg.iap_enabled && s.noAdsPurchased) || s.vipUntil > this.now();
  }

  canShowInterstitial(): { ok: boolean; reason: string } {
    const s = this.state();
    const t = this.now();
    if (this.adFree()) return { ok: false, reason: 'ad_free' };
    if (s.level < this.cfg.interstitial_min_level) return { ok: false, reason: 'min_level' };
    if (t - this.sessionStart < this.cfg.session_first_delay_s * 1000) return { ok: false, reason: 'session_delay' };
    if (this.shownThisSession >= this.cfg.max_per_session) return { ok: false, reason: 'session_cap' };
    const last = Math.max(this.lastInterstitialAt, this.cfg.reset_after_rewarded ? this.lastRewardedAt : 0);
    if (last && t - last < this.cooldownMs()) return { ok: false, reason: 'cooldown' };
    return { ok: true, reason: 'ok' };
  }

  canShowBanner(): boolean {
    return !this.adFree() && this.state().level >= this.cfg.banner_min_level;
  }

  canShowAppOpen(backgroundMs: number): boolean {
    const a = this.cfg.app_open;
    const s = this.state();
    if (!a.enabled || this.adFree()) return false;
    if (a.skip_day0 && this.daysSinceInstall() < 1) return false;
    if (backgroundMs < a.min_bg_minutes * 60_000) return false;
    if (s.lastAppOpenAt && this.now() - s.lastAppOpenAt < a.cap_hours * 3_600_000) return false;
    return true;
  }

  onInterstitialShown() {
    this.lastInterstitialAt = this.now();
    this.shownThisSession++;
  }

  onRewardedShown() {
    this.lastRewardedAt = this.now();
  }

  get interstitialsThisSession() {
    return this.shownThisSession;
  }
}
