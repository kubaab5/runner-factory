import type { AdService, RewardedPlacement } from './AdService';
import { track } from '../core/analytics';

/** Dev / web stand-in: grey overlay with a 3-second countdown. Never pays out. */
export class MockAds implements AdService {
  readonly name = 'mock';
  /** set window.__mockAdsFail = true to simulate no fill */
  private get failing() {
    return Boolean((window as unknown as { __mockAdsFail?: boolean }).__mockAdsFail);
  }
  private get fast() {
    return Boolean((window as unknown as { __mockAdsFast?: boolean }).__mockAdsFast);
  }

  async init() {}

  private overlay(label: string, seconds: number, closable: boolean): Promise<boolean> {
    return new Promise((resolve) => {
      const el = document.createElement('div');
      el.setAttribute('data-testid', 'mock-ad');
      el.style.cssText =
        'position:fixed;inset:0;background:rgba(40,40,40,.92);color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;font:600 22px system-ui;z-index:9999;gap:16px';
      const t = document.createElement('div');
      const btn = document.createElement('button');
      btn.textContent = '✕';
      btn.style.cssText = 'font-size:22px;padding:8px 16px;border-radius:8px;border:0;display:none';
      el.append(t, btn);
      document.body.appendChild(el);
      let left = this.fast ? 0 : seconds;
      const tick = () => {
        t.textContent = `[TEST AD] ${label} · ${left}s`;
        if (left <= 0) {
          clearInterval(iv);
          if (!closable || this.fast) {
            el.remove();
            resolve(true);
          } else btn.style.display = 'block';
        }
        left--;
      };
      const iv = setInterval(tick, 1000);
      tick();
      btn.onclick = () => {
        el.remove();
        resolve(true);
      };
    });
  }

  async ShowInterstitial(placement: string) {
    track('ad_request', { format: 'interstitial', placement });
    if (this.failing) {
      track('ad_fail', { format: 'interstitial', placement });
      return false;
    }
    await this.overlay('interstitial', 3, true);
    track('ad_show', { format: 'interstitial', placement });
    return true;
  }

  async ShowRewarded(placement: RewardedPlacement) {
    track('ad_request', { format: 'rewarded', placement });
    if (this.failing) {
      track('ad_fail', { format: 'rewarded', placement });
      return false;
    }
    await this.overlay('rewarded', 3, true);
    track('ad_show', { format: 'rewarded', placement });
    track('rewarded_complete', { placement });
    return true;
  }

  rewardedSupported() {
    return true;
  }
}
