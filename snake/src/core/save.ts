import { bridge } from '../platform/bridge';

export interface SaveData {
  v: 1;
  coins: number;
  skins: number[];
  skin: number;
  hat: number;
  hats: number[];
  name: string;
  best: number;
  bestKills: number;
  plays: number;
  settings: { sound: boolean; music: boolean };
}

const KEY = 'meme_snakes_save';

const fresh = (): SaveData => ({
  v: 1,
  coins: 0,
  skins: [0],
  skin: 0,
  hat: 0,
  hats: [0],
  name: '',
  best: 0,
  bestKills: 0,
  plays: 0,
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
    coins: Math.max(a.coins, b.coins),
    skins: [...new Set([...a.skins, ...b.skins])],
    hats: [...new Set([...a.hats, ...b.hats])],
    skin: a.skin,
    hat: a.hat,
    name: a.name || b.name,
    best: Math.max(a.best, b.best),
    bestKills: Math.max(a.bestKills, b.bestKills),
    plays: Math.max(a.plays, b.plays),
    settings: a.settings,
  };
}
