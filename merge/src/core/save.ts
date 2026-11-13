import { bridge } from '../platform/bridge';

export interface SaveData {
  v: 1;
  best: number;
  maxTier: number;
  plays: number;
  merges: number;
  tutorial: boolean;
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
