import { describe, expect, it } from 'vitest';
import { applyOp, finishMultiplier, generateLevel, tierOf } from '../src/engine/level';
import { GAMES } from '../src/games';

describe.each(Object.values(GAMES))('level generator: $id', (cfg) => {
  it('is deterministic per level', () => {
    expect(generateLevel(cfg, 7, cfg.start)).toEqual(generateLevel(cfg, 7, cfg.start));
  });

  it('boss is beatable with good play but not with bad play, levels 1–60', () => {
    for (let n = 1; n <= 60; n++) {
      const L = generateLevel(cfg, n, cfg.start);
      expect(L.boss).toBeLessThan(L.best);
      // worst-play: always the worse gate, no pickups, every hazard
      let v = cfg.start;
      for (const e of L.entities) {
        if (e.kind === 'gates') v = Math.min(applyOp(v, e.left), e.right ? applyOp(v, e.right) : v);
        if (e.kind === 'hazard') v = Math.max(1, v - e.n / 3); // 1 of 3 lanes
      }
      if (n >= 3) expect(v).toBeLessThan(L.boss);
    }
  });

  it('has a sensible number of gates and length', () => {
    const L = generateLevel(cfg, 10, cfg.start);
    const gates = L.entities.filter((e) => e.kind === 'gates').length;
    expect(gates).toBeGreaterThanOrEqual(4);
    expect(L.length).toBeGreaterThanOrEqual(240);
  });

  it('tiers grow with value', () => {
    expect(tierOf(cfg, cfg.start)).toBeLessThanOrEqual(1);
    expect(tierOf(cfg, cfg.thresholds[cfg.thresholds.length - 1] * 2)).toBe(cfg.tiers.length - 1);
    expect(cfg.tiers.length).toBe(cfg.thresholds.length);
  });

  it('every tier and skin renders an SVG', () => {
    for (let t = 0; t < cfg.tiers.length; t++) for (const s of cfg.skins) expect(cfg.hero(t, s, 0)).toMatch(/^<svg[\s\S]*<\/svg>$/);
  });
});

describe('finish multiplier', () => {
  it('scales with surplus over the boss', () => {
    expect(finishMultiplier(90, 100)).toBe(0);
    expect(finishMultiplier(101, 100)).toBe(1);
    expect(finishMultiplier(200, 100)).toBe(5);
    expect(finishMultiplier(10_000, 100)).toBe(10);
  });
});
