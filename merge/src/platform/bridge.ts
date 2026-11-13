/* Thin wrapper over the Playgama Bridge SDK (loaded by <script> first in <head>).
   Everything else in the game talks to the platform only through this file. */

export interface BridgeApi {
  initialize(): Promise<void>;
  platform: {
    id: string;
    language: string;
    isAudioEnabled: boolean;
    isPaused: boolean;
    sendMessage(m: string): void;
  };
  advertisement: {
    isInterstitialSupported: boolean;
    isRewardedSupported: boolean;
    showInterstitial(placement?: string): void;
    showRewarded(placement?: string): void;
    on(ev: string, cb: (state: string) => void): void;
    off?(ev: string, cb: (state: string) => void): void;
  };
  storage: {
    get(key: string | string[], tryParseJson?: boolean): Promise<unknown>;
    set(key: string | string[], value: unknown): Promise<void>;
  };
  on?(ev: string, cb: (v: unknown) => void): void;
  EVENT_NAME: Record<string, string>;
}

let api: BridgeApi | undefined;

export function bridge(): BridgeApi | undefined {
  return api;
}

/** Must finish before the engine and assets start loading (Bridge required step 2). */
export async function initBridge(): Promise<BridgeApi | undefined> {
  const b = (window as unknown as { bridge?: BridgeApi }).bridge;
  if (!b) return undefined;
  try {
    await b.initialize();
    api = b;
  } catch (e) {
    console.warn('bridge init failed', e);
  }
  return api;
}

export function platformMessage(m: string) {
  try {
    api?.platform.sendMessage(m);
  } catch {
    /* not every platform knows every message */
  }
}

/** Subscribe to a Bridge event emitted by the platform module (pause, audio state). */
export function onPlatform(eventKey: 'PAUSE_STATE_CHANGED' | 'AUDIO_STATE_CHANGED', cb: (v: boolean) => void) {
  const b = api as unknown as { platform: { on?: (e: string, f: (v: boolean) => void) => void }; EVENT_NAME: Record<string, string> } | undefined;
  const name = b?.EVENT_NAME?.[eventKey];
  if (b && name) b.platform.on?.(name, cb);
}
