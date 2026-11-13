import { Rng } from '../core/rng';
import type { GameConfig, Op } from './types';

export type Entity =
  | { kind: 'gates'; z: number; left: Op; right: Op | null; singleSide?: 'left' | 'right' }
  | { kind: 'pickup'; z: number; x: number; n: number }
  | { kind: 'hazard'; z: number; x: number; n: number }
  | { kind: 'decor'; z: number; x: number; i: number };

export interface Level {
  n: number;
  length: number;
  entities: Entity[];
  /** value reachable by always taking the better gate, grabbing every pickup and dodging every hazard */
  best: number;
  boss: number;
}

export function applyOp(v: number, op: Op): number {
  switch (op.kind) {
    case '+':
      return v + op.n;
    case '-':
      return Math.max(1, v - op.n);
    case 'x':
      return v * op.n;
    case '/':
      return Math.max(1, Math.round(v / op.n));
  }
}

export const isGood = (op: Op) => op.kind === '+' || op.kind === 'x';

const roundTo = (n: number, step: number) => Math.max(step, Math.round(n / step) * step);

/** Start value grows a little with the "start" upgrade; levels get longer and the boss stronger. */
export function generateLevel(cfg: GameConfig, n: number, startValue: number): Level {
  const rng = new Rng(n * 7919 + cfg.id.length * 104729);
  const length = Math.min(420, 240 + n * 5);
  const entities: Entity[] = [];
  let v = startValue; // tracks the best-play value so numbers stay sensible
  let z = 40;
  const step = cfg.step;
  const goodOp = (): Op => {
    const r = rng.next();
    if (r < 0.18 && v < startValue * 40) return { kind: 'x', n: r < 0.05 ? 3 : 2 };
    return { kind: '+', n: roundTo(v * (0.25 + rng.next() * 0.6) + step * 2, step) };
  };
  const badOp = (): Op => {
    const r = rng.next();
    if (r < 0.2) return { kind: '/', n: 2 };
    return { kind: '-', n: roundTo(v * (0.2 + rng.next() * 0.4) + step, step) };
  };
  // rhythm: gate row → filler (pickups or hazards) → gate row …
  while (z < length - 30) {
    const kindR = rng.next();
    let a: Op, b: Op | null;
    if (n <= 2 && kindR < 0.3) {
      a = goodOp();
      b = null;
    } else if (kindR < 0.6 || n < 3) {
      a = goodOp();
      b = badOp();
    } else if (kindR < 0.85) {
      a = goodOp();
      b = goodOp();
    } else {
      a = badOp();
      b = badOp();
    }
    const swap = rng.next() < 0.5;
    entities.push(b ? { kind: 'gates', z, left: swap ? b : a, right: swap ? a : b } : { kind: 'gates', z, left: a, right: null, singleSide: swap ? 'right' : 'left' });
    v = Math.max(applyOp(v, a), b ? applyOp(v, b) : v);
    const fz = z + 12;
    if (n < 2 || rng.next() < 0.6) {
      const x = [-0.6, 0, 0.6][rng.int(3)];
      const cnt = 4 + rng.int(3);
      for (let i = 0; i < cnt; i++) entities.push({ kind: 'pickup', z: fz + i * 3.2, x, n: cfg.pickup.n });
      v += cnt * cfg.pickup.n;
    } else {
      const free = rng.int(3);
      const hit = roundTo(Math.max(cfg.hazard.n, v * 0.15), step);
      [-0.6, 0, 0.6].forEach((x, i) => {
        if (i !== free) entities.push({ kind: 'hazard', z: fz + 6, x, n: hit });
      });
    }
    z += 38 + rng.int(8);
  }
  for (let dz = 15; dz < length + 40; dz += 9 + rng.int(8)) {
    entities.push({ kind: 'decor', z: dz, x: rng.next() < 0.5 ? -1.7 - rng.next() * 0.6 : 1.7 + rng.next() * 0.6, i: rng.int(cfg.decor.length) });
  }
  entities.sort((p, q) => p.z - q.z);
  const hardness = 0.45 + 0.35 * Math.min(1, (n - 1) / 25);
  const boss = roundTo(v * hardness, step);
  return { n, length, entities, best: v, boss };
}

/** Finish multiplier: how far past the boss the hero's surplus throws him (x1…x10). */
export function finishMultiplier(value: number, boss: number): number {
  if (value <= boss) return 0;
  return Math.max(1, Math.min(10, 1 + Math.floor((value / boss - 1) * 4)));
}

export const levelReward = (n: number) => 20 + n * 3;

export function tierOf(cfg: GameConfig, value: number): number {
  let t = 0;
  cfg.thresholds.forEach((th, i) => {
    if (value >= th) t = i;
  });
  return t;
}

export function formatValue(v: number): string {
  if (v >= 1e9) return (v / 1e9).toFixed(v >= 1e10 ? 0 : 1) + 'B';
  if (v >= 1e6) return (v / 1e6).toFixed(v >= 1e7 ? 0 : 1) + 'M';
  if (v >= 1e4) return (v / 1e3).toFixed(v >= 1e5 ? 0 : 1) + 'K';
  return String(Math.round(v));
}

export function opLabel(op: Op): string {
  const s = { '+': '+', '-': '−', x: '×', '/': '÷' }[op.kind];
  return `${s}${formatValue(op.n)}`;
}

/** Upgrades bought with coins. */
export const startBonus = (lvl: number, cfg: GameConfig) => roundTo(cfg.start * 0.35 * lvl, cfg.step);
export const upgradeCost = (lvl: number) => Math.round(60 * Math.pow(1.45, lvl));
export const incomeMult = (lvl: number) => 1 + 0.15 * lvl;
