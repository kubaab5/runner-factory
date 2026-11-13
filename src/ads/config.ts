export interface AdsConfig {
  interstitial_min_level: number;
  session_first_delay_s: number;
  cooldown_s: { d0_1: number; d2_6: number; d7p: number };
  max_per_session: number;
  reset_after_rewarded: boolean;
  banner_min_level: number;
  app_open: { enabled: boolean; min_bg_minutes: number; cap_hours: number; skip_day0: boolean };
  vip_pass: { rewarded_needed: number; minutes: number };
  free_hints_per_day: number;
  iap_enabled: boolean;
}

export const DEFAULT_ADS_CONFIG: AdsConfig = {
  // "level" = levels completed. Web portals enforce their own 60 s minimum on top of this.
  interstitial_min_level: 2,
  session_first_delay_s: 60,
  cooldown_s: { d0_1: 90, d2_6: 75, d7p: 60 },
  max_per_session: 12,
  reset_after_rewarded: true,
  banner_min_level: 2,
  app_open: { enabled: true, min_bg_minutes: 30, cap_hours: 4, skip_day0: true },
  vip_pass: { rewarded_needed: 2, minutes: 20 },
  free_hints_per_day: 1,
  iap_enabled: false,
};

/** AdMob unit IDs. Google's official test IDs until the real ones are pasted in. */
export const ADMOB_IDS = {
  // App ID lives in android/app/src/main/AndroidManifest.xml
  banner: import.meta.env.VITE_ADMOB_BANNER || 'ca-app-pub-3940256099942544/9214589741',
  interstitial: import.meta.env.VITE_ADMOB_INTERSTITIAL || 'ca-app-pub-3940256099942544/1033173712',
  rewarded: import.meta.env.VITE_ADMOB_REWARDED || 'ca-app-pub-3940256099942544/5224354917',
  appOpen: import.meta.env.VITE_ADMOB_APP_OPEN || 'ca-app-pub-3940256099942544/9257395921',
  isTesting: (import.meta.env.VITE_ADMOB_TESTING ?? 'true') !== 'false',
};

/** Optional remote override (JSON with any subset of AdsConfig). Empty = built-in config. */
const REMOTE_URL: string = import.meta.env.VITE_ADS_CONFIG_URL || '';

export async function loadAdsConfig(): Promise<AdsConfig> {
  if (!REMOTE_URL) return DEFAULT_ADS_CONFIG;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 3000);
    const res = await fetch(REMOTE_URL, { signal: ctrl.signal, cache: 'no-store' });
    clearTimeout(t);
    if (!res.ok) return DEFAULT_ADS_CONFIG;
    const remote = (await res.json()) as Partial<AdsConfig>;
    return { ...DEFAULT_ADS_CONFIG, ...remote, cooldown_s: { ...DEFAULT_ADS_CONFIG.cooldown_s, ...(remote.cooldown_s ?? {}) }, app_open: { ...DEFAULT_ADS_CONFIG.app_open, ...(remote.app_open ?? {}) }, vip_pass: { ...DEFAULT_ADS_CONFIG.vip_pass, ...(remote.vip_pass ?? {}) } };
  } catch {
    return DEFAULT_ADS_CONFIG;
  }
}
