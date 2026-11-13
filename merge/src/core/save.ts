import { bridge } from '../platform/bridge';

export interface SaveData {
  v: 1;
  best: number;
  maxTier: number;
  plays: number;
  merges: number;
  tutorial: boolean;
  /** the jar in progress, so a reload continues the same game */
  run: { score: number; merges: number; maxTier: number; current: number; next: number; items: number[][] } | null;
  settings: { sound: boolean; music: boolean };
}

const KEY = 'meme_merge_save';

const fresh = (): SaveData => ({
  v: 1,
  best: 0,
  maxTier: 0,
  plays: 0,
  merges: 0,
  tutorial: false,
  run: null,
  settings: { sound: true, music: true },
});
let data = fresh();

export async function loadSave() {
  const b = bridge();
  if (!b) return;
  try {
    const raw = await b.storage.get([KEY], true);
    const v = Array.isArray(raw) ? raw[0] : raw;
    const p = (typeof v === 'string' ? JSON.parse(v) : v) as Partial<SaveData> | null;
    if (p && typeof p === 'object') data = { ...fresh(), ...p, settings: { ...fresh().settings, ...(p.settings ?? {}) } };
  } catch {
    data = fresh();
  }
}

export const save = {
  get data() {
    return data;
  },
  /** Bridge storage only, written on meaningful progress (run end, purchase, settings). */
  update(fn: (d: SaveData) => void) {
    fn(data);
    const b = bridge();
    if (b) void b.storage.set([KEY], [JSON.stringify(data)]).catch(() => {});
  },
};

/** Optional platform sign-in (never forced, rule 1.2.2). Shown only where the platform supports it. */
export function canSignIn() {
  const p = bridge()?.player;
  return !!p && p.isAuthorizationSupported && !p.isAuthorized;
}

/** Sign in from a player tap. Progress made as a guest is merged into the account save, never lost. */
export async function signIn(): Promise<boolean> {
  const p = bridge()?.player;
  if (!p) return false;
  try {
    await p.authorize();
  } catch {
    return false;
  }
  const guest = data;
  await loadSave();
  const acc = data;
  data = mergeSaves(guest, acc);
  save.update(() => {});
  return true;
}

function mergeSaves(a: SaveData, b: SaveData): SaveData {
  return {
    ...b,
    best: Math.max(a.best, b.best),
    maxTier: Math.max(a.maxTier, b.maxTier),
    plays: Math.max(a.plays, b.plays),
    merges: Math.max(a.merges, b.merges),
    tutorial: a.tutorial || b.tutorial,
    run: a.run ?? b.run,
    settings: a.settings,
  };
}
