import { describe, expect, it } from 'vitest';
import { AdPolicy, PolicyState } from '../src/ads/AdPolicy';
import { DEFAULT_ADS_CONFIG } from '../src/ads/config';

function setup(over: Partial<PolicyState> = {}) {
  let now = 1_000_000_000_000;
  const state: PolicyState = { installedAt: now, level: 20, vipUntil: 0, noAdsPurchased: false, lastAppOpenAt: 0, ...over };
  const policy = new AdPolicy(DEFAULT_ADS_CONFIG, () => state, () => now);
  return { policy, state, advance: (s: number) => (now += s * 1000), now: () => now };
}

describe('AdPolicy', () => {
  it('no interstitial before level 2 is done', () => {
    const { policy, advance } = setup({ level: 1 });
    advance(600);
    expect(policy.canShowInterstitial()).toEqual({ ok: false, reason: 'min_level' });
  });

  it('waits 60 s into the session, then enforces 90 s cooldown on day 0', () => {
    const { policy, advance } = setup();
    advance(40);
    expect(policy.canShowInterstitial().reason).toBe('session_delay');
    advance(21);
    expect(policy.canShowInterstitial().ok).toBe(true);
    policy.onInterstitialShown();
    advance(89);
    expect(policy.canShowInterstitial().reason).toBe('cooldown');
    advance(2);
    expect(policy.canShowInterstitial().ok).toBe(true);
  });

  it('cooldown shortens with tenure: 75 s on day 3, 60 s on day 8', () => {
    const { policy, state, advance, now } = setup();
    state.installedAt = now() - 3 * 86_400_000;
    expect(policy.cooldownMs()).toBe(75_000);
    state.installedAt = now() - 8 * 86_400_000;
    expect(policy.cooldownMs()).toBe(60_000);
    advance(1);
  });

  it('caps at 12 per session and resets on new session', () => {
    const { policy, advance } = setup();
    advance(100);
    for (let i = 0; i < 12; i++) {
      expect(policy.canShowInterstitial().ok).toBe(true);
      policy.onInterstitialShown();
      advance(200);
    }
    expect(policy.canShowInterstitial().reason).toBe('session_cap');
    policy.newSession();
    advance(100);
    expect(policy.canShowInterstitial().ok).toBe(true);
  });

  it('a rewarded view resets the interstitial timer', () => {
    const { policy, advance } = setup();
    advance(100);
    policy.onRewardedShown();
    advance(60);
    expect(policy.canShowInterstitial().reason).toBe('cooldown');
  });

  it('VIP pass blocks interstitial, banner and app open', () => {
    const { policy, state, advance, now } = setup();
    advance(1000);
    state.vipUntil = now() + 20 * 60_000;
    expect(policy.canShowInterstitial().reason).toBe('ad_free');
    expect(policy.canShowBanner()).toBe(false);
    expect(policy.canShowAppOpen(3_600_000)).toBe(false);
  });

  it('purchase only counts when IAP is enabled', () => {
    const { policy, advance } = setup({ noAdsPurchased: true });
    advance(1000);
    expect(policy.adFree()).toBe(false); // iap_enabled=false by default
  });

  it('app open: never on day 0, needs 30 min background, max once per 4 h', () => {
    const { policy, state, now } = setup();
    expect(policy.canShowAppOpen(3_600_000)).toBe(false);
    state.installedAt = now() - 2 * 86_400_000;
    expect(policy.canShowAppOpen(10 * 60_000)).toBe(false);
    expect(policy.canShowAppOpen(31 * 60_000)).toBe(true);
    state.lastAppOpenAt = now() - 3_600_000;
    expect(policy.canShowAppOpen(31 * 60_000)).toBe(false);
  });

  it('banner after 2 levels', () => {
    expect(setup({ level: 1 }).policy.canShowBanner()).toBe(false);
    expect(setup({ level: 2 }).policy.canShowBanner()).toBe(true);
  });
});
