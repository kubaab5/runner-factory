import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng';
import { World } from '../src/game/world';

const opts = (seed: number) => {
  const r = new Rng(seed);
  return { bots: 24, rand: () => r.next(), botNames: ['A', 'B', 'C'], skins: 15, foodColors: 8, memeFoods: 5, hats: 8 };
};

describe('world', () => {
  it('runs 3 minutes of bots without blowing up', () => {
    const w = new World(opts(7));
    let kills = 0;
    const t0 = performance.now();
    for (let i = 0; i < 60 * 180; i++) {
      w.step(1 / 60);
      kills += w.kills.length;
    }
    const ms = performance.now() - t0;
    const alive = w.snakes.filter((s) => s.alive);
    console.log('kills', kills, 'alive', alive.length, 'food', w.foods.size, 'ms/tick', (ms / (60 * 180)).toFixed(3), 'top', Math.max(...alive.map((s) => s.mass)).toFixed(0));
    expect(alive.length).toBeGreaterThan(15);
    expect(kills).toBeGreaterThan(3);
    expect(w.foods.size).toBeLessThan(6000);
    for (const s of alive) for (const p of s.segs) expect(Number.isFinite(p.x) && Number.isFinite(p.y)).toBe(true);
  });

  it('a player that runs straight into the wall dies, its body becomes food', () => {
    const w = new World({ ...opts(3), bots: 0 });
    const p = w.spawnPlayer('me', 0, 100);
    p.head.x = 3200;
    p.head.y = 0;
    p.angle = p.target = 0;
    const food0 = w.foods.size;
    for (let i = 0; i < 300 && p.alive; i++) w.step(1 / 60);
    expect(p.alive).toBe(false);
    expect(w.foods.size).toBeGreaterThan(food0);
  });

  it('eating grows the snake, boosting shrinks it', () => {
    const w = new World({ ...opts(5), bots: 0 });
    const p = w.spawnPlayer('me', 0, 60);
    p.head.x = p.head.y = 0;
    for (const s of p.segs) (s.x = 0), (s.y = 0);
    w.spawnFood(30, 0, 10);
    p.angle = p.target = 0;
    for (let i = 0; i < 30; i++) w.step(1 / 60);
    expect(p.mass).toBeGreaterThanOrEqual(70);
    const m = p.mass;
    p.boosting = true;
    for (let i = 0; i < 120; i++) w.step(1 / 60);
    expect(p.mass).toBeLessThan(m + 5);
  });
});
