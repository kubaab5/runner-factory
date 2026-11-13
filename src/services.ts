import { AdPolicy, PolicyState } from './ads/AdPolicy';
import type { AdService, RewardedPlacement } from './ads/AdService';
import { BridgeAds } from './ads/BridgeAds';
import { DEFAULT_ADS_CONFIG } from './ads/config';
import { MockAds } from './ads/MockAds';
import { setAudioSuspended, setHidden, setPausedAudio, setPlatformAudio } from './audio/sfx';
import { track } from './core/analytics';
import { save } from './core/save';
import { bridge, onPlatform } from './platform/bridge';

const policyState = (): PolicyState => {
  const d = save.data;
  return { installedAt: d.installedAt, level: d.level - 1, vipUntil: d.vipUntil, noAdsPurchased: d.noAdsPurchased, lastAppOpenAt: d.lastAppOpenAt };
};

export let ads: AdService = new MockAds();
/** Only used for the local mock: on real platforms the Bridge decides when an interstitial actually shows. */
const mockPolicy = new AdPolicy(DEFAULT_ADS_CONFIG, policyState);

export const rewardedSupported = () => ads.rewardedSupported();

export async function showRewarded(placement: RewardedPlacement): Promise<boolean> {
  setAudioSuspended(true);
  const ok = await ads.ShowRewarded(placement).catch(() => false);
  setAudioSuspended(false);
  if (ok) mockPolicy.onRewardedShown();
  return ok;
}

/** Called at every natural pause (level end). The Bridge applies the platform's own frequency rules. */
export async function interstitialAtPause(placement: string): Promise<void> {
  if (ads.name === 'mock') {
    if (!mockPolicy.canShowInterstitial().ok) return;
    mockPolicy.onInterstitialShown();
  }
  if (ads.name === 'mock') {
    setAudioSuspended(true);
    await ads.ShowInterstitial(placement).catch(() => false);
    setAudioSuspended(false);
    return;
  }
  // Bridge: fire and forget — it may wait or skip; pause/mute arrive via PAUSE_STATE_CHANGED / AUDIO_STATE_CHANGED
  void ads.ShowInterstitial(placement).catch(() => false);
}

let onPause: (paused: boolean) => void = () => {};
export const setPauseHandler = (fn: (paused: boolean) => void) => (onPause = fn);

export async function initServices(): Promise<void> {
  const b = bridge();
  const forceMock = new URLSearchParams(location.search).has('mockads');
  ads = b && !forceMock ? new BridgeAds(b) : new MockAds();
  await ads.init().catch((e) => track('ads_init_error', { e: String(e) }));
  if (b) {
    setPlatformAudio(b.platform.isAudioEnabled !== false);
    onPlatform('AUDIO_STATE_CHANGED', (on) => setPlatformAudio(on));
    onPlatform('PAUSE_STATE_CHANGED', (p) => {
      setPausedAudio(p);
      onPause(p);
    });
  }
  document.addEventListener('visibilitychange', () => {
    setHidden(document.hidden);
    onPause(document.hidden);
  });
  track('platform', { id: b?.platform.id ?? 'none', ads: ads.name });
}
