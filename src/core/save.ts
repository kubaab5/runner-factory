import type { Lang } from '../engine/types';
import { currentGame } from '../games';

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

const KEY = `rf.${currentGame().id}.v1`;

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

function load(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw) as SaveData;
      const b = fresh();
      return { ...b, ...p, up: { ...b.up, ...p.up }, settings: { ...b.settings, ...p.settings } };
    }
  } catch {
    /* corrupted → fresh */
  }
  return fresh();
}

let data: SaveData = load();

export const save = {
  get data() {
    return data;
  },
  write() {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch {
      /* private mode etc. */
    }
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
