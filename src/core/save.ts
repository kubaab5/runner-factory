import type { Lang } from '../engine/types';
import { currentGame } from '../games';
import { bridge } from '../platform/bridge';

export type { Lang };

export interface SaveData {
  v: 1;
  installedAt: number;
  coins: number;
  /** current level (1-based) */
  level: number;
  up: { start: number; income: number };
  skins: number[];
  skin: number;
  bestValue: number;
  plays: number;
  freeUpgradeAt: number;
  vipUntil: number;
  vipProgress: number;
  noAdsPurchased: boolean;
  lastAppOpenAt: number;
  settings: { sound: boolean; haptics: boolean; lang: Lang | null };
}

const KEY = `${currentGame().id}_save`;

function fresh(): SaveData {
  return {
    v: 1,
    installedAt: Date.now(),
    coins: 0,
    level: 1,
    up: { start: 0, income: 0 },
    skins: [0],
    skin: 0,
    bestValue: 0,
    plays: 0,
    freeUpgradeAt: 0,
    vipUntil: 0,
    vipProgress: 0,
    noAdsPurchased: false,
    lastAppOpenAt: 0,
    settings: { sound: true, haptics: true, lang: null },
  };
}

function merge(p: Partial<SaveData> | null | undefined): SaveData {
  const b = fresh();
  if (!p || typeof p !== 'object') return b;
  return { ...b, ...p, up: { ...b.up, ...(p.up ?? {}) }, settings: { ...b.settings, ...(p.settings ?? {}) } };
}

let data: SaveData = fresh();

/** Reads the whole save in one storage.get call before gameplay is shown (Bridge required step 4). */
export async function loadSave(): Promise<void> {
  const b = bridge();
  if (!b) return;
  try {
    const raw = await b.storage.get([KEY], true);
    const v = Array.isArray(raw) ? raw[0] : raw;
    data = merge(typeof v === 'string' ? (JSON.parse(v) as SaveData) : (v as SaveData));
  } catch {
    data = fresh();
  }
}

export const save = {
  get data() {
    return data;
  },
  /** Persist through Bridge storage only; call on meaningful progress (level end, purchase, settings). */
  write() {
    const b = bridge();
    if (!b) return;
    void b.storage.set([KEY], [JSON.stringify(data)]).catch(() => {});
  },
  update(fn: (d: SaveData) => void) {
    fn(data);
    save.write();
  },
  reset() {
    data = fresh();
    save.write();
  },
};
