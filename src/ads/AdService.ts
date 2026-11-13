export type RewardedPlacement = 'coins_x3' | 'revive' | 'skin' | 'start_boost' | 'free_upgrade' | 'vip_pass';

export interface AdService {
  readonly name: string;
  init(): Promise<void>;
  /** resolves true if the ad was actually shown */
  ShowInterstitial(placement: string): Promise<boolean>;
  /** resolves true only when the reward was earned */
  ShowRewarded(placement: RewardedPlacement): Promise<boolean>;
  ShowBanner(): Promise<void>;
  HideBanner(): Promise<void>;
  /** banner height in CSS px while visible (0 when hidden) */
  bannerHeight(): number;
  ShowAppOpen(): Promise<boolean>;
}
