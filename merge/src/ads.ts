/* Ads through the Playgama Bridge. Interstitials are fire-and-forget at natural pauses (the
   platform owns frequency). Rewarded grants only on the `rewarded` state. Without Bridge
   (local dev) a mock resolves after a short delay. */
import { setSuspended } from './audio';
import { bridge, type BridgeApi } from './platform/bridge';
import { sendEvent } from './platform/telemetry';

export type RewardedPlacement = 'revive' | 'hammer' | 'shake';

function run(b: BridgeApi, eventKey: string, show: () => void, success: (s: string) => boolean): Promise<boolean> {
  const event = b.EVENT_NAME[eventKey];
  return new Promise((resolve) => {
    let ok = false;
    let done = false;
    let opened = false;
    const finish = (r: boolean) => {
      if (done) return;
      done = true;
      b.advertisement.off?.(event, cb);
      resolve(r);
    };
    const cb = (state: string) => {
      if (state === 'opened') opened = true;
      if (success(state)) ok = true;
      if (state === 'closed' || state === 'failed') finish(ok);
    };
    b.advertisement.on(event, cb);
    try {
      show();
    } catch {
      finish(false);
    }
    setTimeout(() => !opened && finish(ok), 10_000);
    setTimeout(() => finish(ok), 180_000);
  });
}

export function rewardedSupported() {
  const b = bridge();
  return b ? b.advertisement.isRewardedSupported : true;
}

export async function showRewarded(p: RewardedPlacement): Promise<boolean> {
  const b = bridge();
  setSuspended(true);
  let ok: boolean;
  if (!b) ok = await new Promise((r) => setTimeout(() => r(true), 400));
  else if (!b.advertisement.isRewardedSupported) ok = false;
  else ok = await run(b, 'REWARDED_STATE_CHANGED', () => b.advertisement.showRewarded(p), (s) => s === 'rewarded').catch(() => false);
  setSuspended(false);
  if (ok) sendEvent('rewarded_granted', { placement: p });
  return ok;
}

export function interstitialAtPause() {
  const b = bridge();
  if (!b || !b.advertisement.isInterstitialSupported) return;
  // pause/mute while it shows arrive through PAUSE_STATE_CHANGED / AUDIO_STATE_CHANGED
  void run(b, 'INTERSTITIAL_STATE_CHANGED', () => b.advertisement.showInterstitial('game_over'), (s) => s === 'opened').catch(() => false);
}
