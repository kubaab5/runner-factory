import type { AdService, RewardedPlacement } from './AdService';
import { track } from '../core/analytics';

/* Minimal typing of the Playgama Bridge SDK (one SDK → Playgama, CrazyGames, Yandex, Poki, GameDistribution…). */
interface BridgeAdv {
  isBannerSupported: boolean;
  isInterstitialSupported: boolean;
  isRewardedSupported: boolean;
  showBanner(position: 'top' | 'bottom', placement?: string): void;
  hideBanner(): void;
  showInterstitial(placement?: string): void;
  showRewarded(placement?: string): void;
  setMinimumDelayBetweenInterstitial(s: number): void;
  on(ev: string, cb: (state: string) => void): void;
  off?(ev: string, cb: (state: string) => void): void;
}
export interface Bridge {
  initialize(): Promise<void>;
  advertisement: BridgeAdv;
  platform: { id: string; language: string; sendMessage(m: string): void; on?(ev: string, cb: (v: boolean) => void): void };
  game?: { on?(ev: string, cb: (v: string) => void): void };
  EVENT_NAME: Record<string, string>;
}

export const BRIDGE_URL = 'https://bridge.playgama.com/v1/stable/playgama-bridge.js';

export function getBridge(): Bridge | undefined {
  return (window as unknown as { bridge?: Bridge }).bridge;
}

/** Loads and initialises the Bridge SDK. Resolves undefined when unavailable (offline dev, blocked CDN). */
export async function loadBridge(timeoutMs = 6000): Promise<Bridge | undefined> {
  if (!getBridge()) {
    await new Promise<void>((resolve) => {
      const s = document.createElement('script');
      s.src = BRIDGE_URL;
      s.onload = () => resolve();
      s.onerror = () => resolve();
      document.head.appendChild(s);
      setTimeout(resolve, timeoutMs);
    });
  }
  const b = getBridge();
  if (!b) return undefined;
  try {
    await Promise.race([b.initialize(), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), timeoutMs))]);
    return b;
  } catch (e) {
    track('bridge_init_error', { e: String(e) });
    return undefined;
  }
}

export class BridgeAds implements AdService {
  readonly name = 'bridge';
  private bannerOn = false;
  constructor(private b: Bridge) {}

  async init() {
    try {
      this.b.advertisement.setMinimumDelayBetweenInterstitial(60);
    } catch {
      /* not supported everywhere */
    }
  }

  private waitState(event: string, show: () => void, success: (s: string) => boolean): Promise<boolean> {
    return new Promise((resolve) => {
      let ok = false;
      let done = false;
      const cb = (state: string) => {
        if (success(state)) ok = true;
        if (state === 'closed' || state === 'failed') finish(state === 'closed' && ok);
      };
      const finish = (r: boolean) => {
        if (done) return;
        done = true;
        this.b.advertisement.off?.(event, cb);
        resolve(r);
      };
      this.b.advertisement.on(event, cb);
      try {
        show();
      } catch {
        finish(false);
      }
      setTimeout(() => finish(ok), 90_000);
    });
  }

  async ShowInterstitial(placement: string) {
    if (!this.b.advertisement.isInterstitialSupported) return false;
    track('ad_request', { format: 'interstitial', placement });
    const shown = await this.waitState(this.b.EVENT_NAME.INTERSTITIAL_STATE_CHANGED, () => this.b.advertisement.showInterstitial(placement), (s) => s === 'opened' || s === 'closed');
    if (shown) track('ad_show', { format: 'interstitial', placement });
    return shown;
  }

  async ShowRewarded(placement: RewardedPlacement) {
    if (!this.b.advertisement.isRewardedSupported) return false;
    track('ad_request', { format: 'rewarded', placement });
    const ok = await this.waitState(this.b.EVENT_NAME.REWARDED_STATE_CHANGED, () => this.b.advertisement.showRewarded(placement), (s) => s === 'rewarded');
    if (ok) track('rewarded_complete', { placement });
    return ok;
  }

  async ShowBanner() {
    if (this.bannerOn || !this.b.advertisement.isBannerSupported) return;
    this.bannerOn = true;
    this.b.advertisement.showBanner('bottom');
  }

  async HideBanner() {
    if (!this.bannerOn) return;
    this.bannerOn = false;
    this.b.advertisement.hideBanner();
  }

  bannerHeight() {
    return 0; // portals draw banners outside the game frame
  }

  async ShowAppOpen() {
    return false;
  }
}
