import { AdPolicy, PolicyState } from './ads/AdPolicy';
import type { AdService, RewardedPlacement } from './ads/AdService';
import { Bridge, BridgeAds, loadBridge } from './ads/BridgeAds';
import { AdsConfig, DEFAULT_ADS_CONFIG, loadAdsConfig } from './ads/config';
import { MockAds } from './ads/MockAds';
import { setAudioSuspended } from './audio/sfx';
import { track } from './core/analytics';
import { save } from './core/save';

let cfg: AdsConfig = DEFAULT_ADS_CONFIG;
const policyState = (): PolicyState => {
  const d = save.data;
  return { installedAt: d.installedAt, level: d.level - 1, vipUntil: d.vipUntil, noAdsPurchased: d.noAdsPurchased, lastAppOpenAt: d.lastAppOpenAt };
};

export let ads: AdService = new MockAds();
export let bridge: Bridge | undefined;
export const policy = new AdPolicy(cfg, policyState);
export const adsConfig = () => cfg;

/** Platform lifecycle pings (game_ready, gameplay_started…). No-op without the Bridge. */
export function platformMessage(m: string) {
  try {
    bridge?.platform.sendMessage(m);
  } catch {
    /* some platforms ignore some messages */
  }
}

export function refreshBanner() {
  if (policy.canShowBanner()) void ads.ShowBanner();
  else void ads.HideBanner();
}

export async function showRewarded(placement: RewardedPlacement): Promise<boolean> {
  setAudioSuspended(true);
  const ok = await ads.ShowRewarded(placement).catch(() => false);
  setAudioSuspended(false);
  if (ok) policy.onRewardedShown();
  return ok;
}

export async function maybeInterstitial(placement: string, beforeShow?: () => Promise<void>): Promise<boolean> {
  const can = policy.canShowInterstitial();
  if (!can.ok) {
    track('ad_skip', { format: 'interstitial', placement, reason: can.reason });
    return false;
  }
  if (beforeShow) await beforeShow();
  setAudioSuspended(true);
  const shown = await ads.ShowInterstitial(placement).catch(() => false);
  setAudioSuspended(false);
  if (shown) policy.onInterstitialShown();
  return shown;
}

export const vipMinutesLeft = () => Math.max(0, Math.ceil((save.data.vipUntil - Date.now()) / 60000));

export async function watchForVip(): Promise<'progress' | 'activated' | 'fail'> {
  const ok = await showRewarded('vip_pass');
  if (!ok) return 'fail';
  const d = save.data;
  d.vipProgress++;
  const activated = d.vipProgress >= cfg.vip_pass.rewarded_needed;
  if (activated) {
    d.vipProgress = 0;
    d.vipUntil = Math.max(Date.now(), d.vipUntil) + cfg.vip_pass.minutes * 60000;
    track('vip_activated', {});
  }
  save.write();
  refreshBanner();
  return activated ? 'activated' : 'progress';
}

/** Pause hook the game scene registers (portal asked to pause, tab hidden…). */
let onPause: (paused: boolean) => void = () => {};
export const setPauseHandler = (fn: (paused: boolean) => void) => (onPause = fn);

export async function initServices(): Promise<{ language?: string }> {
  cfg = await loadAdsConfig();
  policy.setConfig(cfg);
  const useBridge = import.meta.env.VITE_TARGET !== 'local' && !new URLSearchParams(location.search).has('mockads');
  if (useBridge) bridge = await loadBridge();
  if (bridge && bridge.platform.id !== 'mock') {
    ads = new BridgeAds(bridge);
    const ev = bridge.EVENT_NAME;
    try {
      bridge.platform.on?.(ev.AUDIO_STATE_CHANGED, (on) => setAudioSuspended(!on));
      bridge.platform.on?.(ev.PAUSE_STATE_CHANGED, (p) => onPause(p));
    } catch {
      /* optional events */
    }
  } else ads = new MockAds();
  try {
    await ads.init();
  } catch (e) {
    track('ads_init_error', { e: String(e) });
  }
  document.addEventListener('visibilitychange', () => {
    setAudioSuspended(document.hidden);
    onPause(document.hidden);
  });
  track('platform', { id: bridge?.platform.id ?? 'none', ads: ads.name });
  return { language: bridge?.platform.language };
}

(window as unknown as { __policy: AdPolicy }).__policy = policy;
