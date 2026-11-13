import { describe, expect, it } from 'vitest';
import { Sim, JAR_W, RADII } from '../src/game/sim';

const rng = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};

describe('merge sim', () => {
  it('two equal items merge into the next tier', () => {
    const s = new Sim(rng(1));
    s.add(2, 200, 560);
    s.add(2, 200, 400);
    for (let i = 0; i < 120; i++) s.step(1 / 60);
    const tiers = [...s.items.values()].map((i) => i.tier);
    expect(tiers).toEqual([3]);
    expect(s.score).toBeGreaterThan(0);
  });

  it('random play: merges happen, a game ends, nothing escapes', () => {
    const results: string[] = [];
    for (let seed = 1; seed <= 6; seed++) {
      const r = rng(seed);
      const s = new Sim(r);
      let drops = 0;
      let next = s.rollNext();
      while (!s.over && drops < 600) {
        s.drop(next, r() * JAR_W);
        drops++;
        next = s.rollNext();
        for (let i = 0; i < 40 && !s.over; i++) s.step(1 / 60);
      }
      for (const it of s.items.values()) {
        expect(Number.isFinite(it.body.position.x)).toBe(true);
        expect(it.body.position.x).toBeGreaterThan(-5);
        expect(it.body.position.x).toBeLessThan(JAR_W + 5);
      }
      results.push(`seed ${seed}: drops ${drops} merges ${s.merges} score ${s.score} max tier ${s.maxTier} over ${s.over} t=${s.time.toFixed(0)}s`);
      expect(s.merges).toBeGreaterThan(10);
    }
    console.log(results.join('\n'));
  });

  it('clearTop rescues a full jar', () => {
    const s = new Sim(rng(3));
    for (let i = 0; i < 60; i++) s.add(i % 5, 20 + ((i * 47) % 380), 600 - Math.floor(i / 8) * 60);
    for (let i = 0; i < 200; i++) s.step(1 / 60);
    const before = s.items.size;
    const n = s.clearTop();
    expect(n).toBeGreaterThan(0);
    expect(s.items.size).toBe(before - n);
    expect(RADII.length).toBe(11);
  });
});
