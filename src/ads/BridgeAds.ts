import type { AdService, RewardedPlacement } from './AdService';
import { track } from '../core/analytics';
import type { BridgeApi } from '../platform/bridge';

export class BridgeAds implements AdService {
  readonly name = 'bridge';
  constructor(private b: BridgeApi) {}

  async init() {}

  rewardedSupported() {
    return this.b.advertisement.isRewardedSupported;
  }

  /** Resolves once the ad reaches closed/failed; `success` decides what counts as a success on the way. */
  private run(eventKey: string, show: () => void, success: (s: string) => boolean): Promise<boolean> {
    const event = this.b.EVENT_NAME[eventKey];
    return new Promise((resolve) => {
      let ok = false;
      let done = false;
      let opened = false;
      const finish = (r: boolean) => {
        if (done) return;
        done = true;
        this.b.advertisement.off?.(event, cb);
        resolve(r);
      };
      const cb = (state: string) => {
        if (state === 'opened') opened = true;
        if (success(state)) ok = true;
        if (state === 'closed' || state === 'failed') finish(ok);
      };
      this.b.advertisement.on(event, cb);
      try {
        show();
      } catch {
        finish(false);
      }
      // a request that never opens (no fill, skipped by the platform) must not freeze the game
      setTimeout(() => !opened && finish(ok), 10_000);
      setTimeout(() => finish(ok), 180_000);
    });
  }

  async ShowInterstitial(placement: string) {
    if (!this.b.advertisement.isInterstitialSupported) return false;
    const shown = await this.run('INTERSTITIAL_STATE_CHANGED', () => this.b.advertisement.showInterstitial(placement), (s) => s === 'opened');
    if (shown) track('ad_show', { format: 'interstitial', placement });
    return shown;
  }

  async ShowRewarded(placement: RewardedPlacement) {
    if (!this.b.advertisement.isRewardedSupported) return false;
    // the reward is granted only in the `rewarded` state (Bridge rule)
    const ok = await this.run('REWARDED_STATE_CHANGED', () => this.b.advertisement.showRewarded(placement), (s) => s === 'rewarded');
    if (ok) track('rewarded_complete', { placement });
    return ok;
  }
}
