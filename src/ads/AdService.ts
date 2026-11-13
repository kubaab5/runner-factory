export type RewardedPlacement = 'coins_x3' | 'revive' | 'skin' | 'start_boost' | 'free_upgrade';

export interface AdService {
  readonly name: string;
  init(): Promise<void>;
  /** resolves true if the ad was actually shown */
  ShowInterstitial(placement: string): Promise<boolean>;
  /** resolves true only when the reward was earned (the `rewarded` state) */
  ShowRewarded(placement: RewardedPlacement): Promise<boolean>;
  /** false → the game hides every rewarded button (Bridge required step 8) */
  rewardedSupported(): boolean;
}
