import { it } from 'vitest';
import { Rng } from '../src/core/rng';
import { World } from '../src/game/world';

it.skipIf(!(globalThis as unknown as { process: { env: Record<string, string> } }).process.env.SURVIVAL)('naive player survival (no dodging, only food + wall)', () => {
  const times: number[] = [];
  for (let seed = 1; seed <= 30; seed++) {
    const r = new Rng(seed);
    const w = new World({ bots: 24, rand: () => r.next(), botNames: ['A'], skins: 15, foodColors: 8, memeFoods: 5, hats: 8 });
    for (let i = 0; i < 120; i++) w.step(1 / 60);
    const p = w.spawnPlayer('me', 0, 30);
    let t = 0;
    while (p.alive && t < 180) {
      const h = p.head;
      if (Math.hypot(h.x, h.y) > 2200) p.target = Math.atan2(-h.y, -h.x);
      else p.target = p.angle + Math.sin(t * 0.7 + seed) * 0.03;
      w.step(1 / 60);
      t += 1 / 60;
    }
    times.push(Math.round(t));
  }
  times.sort((a, b) => a - b);
  console.log('survival s', times.join(','), 'median', times[15]);
});

it.skipIf(!(globalThis as unknown as { process: { env: Record<string, string> } }).process.env.SURVIVAL)('bot-brain player survival (a rough stand-in for a human who dodges)', () => {
  const times: number[] = [];
  const lens: number[] = [];
  for (let seed = 1; seed <= 30; seed++) {
    const r = new Rng(seed);
    const w = new World({ bots: 24, rand: () => r.next(), botNames: ['A'], skins: 15, foodColors: 8, memeFoods: 5, hats: 8 });
    for (let i = 0; i < 120; i++) w.step(1 / 60);
    const p = w.spawnPlayer('me', 0, 30);
    p.personality = 'glutton';
    p.skill = 0.6;
    let t = 0;
    while (p.alive && t < 300) {
      w.brain(p, 1 / 60);
      w.step(1 / 60);
      t += 1 / 60;
    }
    times.push(Math.round(t));
    lens.push(Math.round(p.maxMass));
  }
  times.sort((a, b) => a - b);
  lens.sort((a, b) => a - b);
  console.log('brain survival s', times.join(','), 'median', times[15], 'len median', lens[15]);
});
