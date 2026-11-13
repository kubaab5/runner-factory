/* Meme Merge simulation: a jar, round memes dropped from the top, two equal ones merge into the
   next tier. Matter.js does the stacking; this file owns rules, scoring and game over. No DOM. */
import Matter from 'matter-js';

export const JAR_W = 420;
export const JAR_H = 600;
export const DANGER_Y = 92; // tops above this line for too long = game over
export const DROP_Y = -46;
export const RADII = [15, 21, 29, 36, 45, 55, 66, 78, 91, 106, 124];
export const TOP = RADII.length - 1;
const WALL = 60;

export interface Item {
  id: number;
  tier: number;
  body: Matter.Body;
  born: number;
  /** seconds spent above the danger line while settled */
  over: number;
  merging: boolean;
}

export interface MergeEvent {
  x: number;
  y: number;
  tier: number; // the new tier (TOP + 1 when two final bosses vanish)
  points: number;
  combo: number;
}

export type Rand = () => number;

export class Sim {
  engine: Matter.Engine;
  items = new Map<number, Item>();
  time = 0;
  score = 0;
  merges = 0;
  maxTier = 0;
  combo = 0;
  lastMergeAt = -9;
  over = false;
  /** 0..1, how close the jar is to game over (for the warning glow) */
  danger = 0;
  events: MergeEvent[] = [];
  lands: Array<{ x: number; y: number; tier: number; speed: number }> = [];
  private nextId = 1;
  private byBody = new Map<number, Item>();
  private queued: Array<[Item, Item]> = [];

  constructor(private rand: Rand = Math.random) {
    this.engine = Matter.Engine.create({ positionIterations: 10, velocityIterations: 8 });
    this.engine.gravity.y = 1.15;
    const opts = { isStatic: true, friction: 0.4, restitution: 0.1, label: 'wall' };
    Matter.Composite.add(this.engine.world, [
      Matter.Bodies.rectangle(JAR_W / 2, JAR_H + WALL / 2, JAR_W + WALL * 2, WALL, opts),
      Matter.Bodies.rectangle(-WALL / 2, JAR_H / 2 - 200, WALL, JAR_H + 400, opts),
      Matter.Bodies.rectangle(JAR_W + WALL / 2, JAR_H / 2 - 200, WALL, JAR_H + 400, opts),
    ]);
    const onPairs = (e: Matter.IEventCollision<Matter.Engine>) => {
      for (const p of e.pairs) {
        const a = this.byBody.get(p.bodyA.id);
        const b = this.byBody.get(p.bodyB.id);
        if (e.name === 'collisionStart') {
          const it = a ?? b;
          if (it && (!a || !b || a.tier !== b.tier)) {
            const sp = Math.hypot(it.body.velocity.x, it.body.velocity.y);
            if (sp > 2.2) this.lands.push({ x: it.body.position.x, y: it.body.position.y, tier: it.tier, speed: sp });
          }
        }
        if (!a || !b || a.merging || b.merging || a.tier !== b.tier) continue;
        a.merging = b.merging = true;
        this.queued.push([a, b]);
      }
    };
    Matter.Events.on(this.engine, 'collisionStart', onPairs);
    Matter.Events.on(this.engine, 'collisionActive', onPairs);
  }

  /** Random next tier: the five smallest, small ones more often */
  rollNext(): number {
    const w = [32, 26, 20, 13, 9];
    let r = this.rand() * w.reduce((a, b) => a + b, 0);
    for (let i = 0; i < w.length; i++) if ((r -= w[i]) < 0) return i;
    return 0;
  }

  add(tier: number, x: number, y: number, vx = 0, vy = 0): Item {
    const r = RADII[tier];
    const body = Matter.Bodies.circle(x, y, r, {
      restitution: 0.12,
      friction: 0.35,
      frictionStatic: 0.6,
      frictionAir: 0.012,
      density: 0.0012,
      slop: 0.02,
    });
    Matter.Body.setVelocity(body, { x: vx, y: vy });
    Matter.Composite.add(this.engine.world, body);
    const it: Item = { id: this.nextId++, tier, body, born: this.time, over: 0, merging: false };
    this.items.set(it.id, it);
    this.byBody.set(body.id, it);
    this.maxTier = Math.max(this.maxTier, tier);
    return it;
  }

  drop(tier: number, x: number) {
    const r = RADII[tier];
    const cx = Math.max(r + 1, Math.min(JAR_W - r - 1, x));
    return this.add(tier, cx, DROP_Y, 0, 2);
  }

  remove(it: Item) {
    Matter.Composite.remove(this.engine.world, it.body);
    this.items.delete(it.id);
    this.byBody.delete(it.body.id);
  }

  step(dt: number) {
    if (this.over) return;
    this.time += dt;
    this.events = [];
    this.lands = [];
    Matter.Engine.update(this.engine, dt * 1000);
    this.resolveMerges();
    if (this.time - this.lastMergeAt > 1.3) this.combo = 0;
    // game over: something settled with its top above the line for 2 s
    let worst = 0;
    for (const it of this.items.values()) {
      const b = it.body;
      const top = b.position.y - RADII[it.tier];
      const settled = this.time - it.born > 1.2 && Math.hypot(b.velocity.x, b.velocity.y) < 1.2;
      if (top < DANGER_Y && settled) it.over += dt;
      else it.over = Math.max(0, it.over - dt * 2);
      worst = Math.max(worst, it.over);
      // anything that escaped the jar (should not happen) is just removed
      if (b.position.y > JAR_H + 200 || b.position.x < -200 || b.position.x > JAR_W + 200) this.remove(it);
    }
    this.danger = Math.min(1, worst / 2);
    if (worst >= 2) this.over = true;
  }

  private resolveMerges() {
    for (const [a, b] of this.queued) {
      if (!this.items.has(a.id) || !this.items.has(b.id)) continue;
      const x = (a.body.position.x + b.body.position.x) / 2;
      const y = (a.body.position.y + b.body.position.y) / 2;
      const vx = (a.body.velocity.x + b.body.velocity.x) / 2;
      const vy = (a.body.velocity.y + b.body.velocity.y) / 2;
      this.remove(a);
      this.remove(b);
      this.combo = this.time - this.lastMergeAt < 1.3 ? this.combo + 1 : 1;
      this.lastMergeAt = this.time;
      this.merges++;
      const nt = a.tier + 1;
      let points: number;
      if (nt > TOP) {
        points = 500; // two final bosses: both vanish with a jackpot
      } else {
        points = ((nt + 1) * (nt + 2)) / 2;
        const ny = Math.min(y, JAR_H - RADII[nt]);
        this.add(nt, x, ny, vx * 0.5, Math.min(vy, 0) - 1.5);
      }
      points *= Math.min(3, 1 + (this.combo - 1) * 0.25);
      points = Math.round(points);
      this.score += points;
      this.events.push({ x, y, tier: nt, points, combo: this.combo });
    }
    this.queued = [];
  }

  /** Rewarded: clear the upper part of the jar (keeps the bigger ones) */
  clearTop(): number {
    let n = 0;
    for (const it of [...this.items.values()]) {
      if (it.body.position.y < JAR_H * 0.42 && it.tier < 7) {
        this.remove(it);
        n++;
      }
    }
    for (const it of this.items.values()) it.over = 0;
    this.over = false;
    this.danger = 0;
    return n;
  }

  /** Rewarded: shake the jar so the pile settles differently */
  shake() {
    for (const it of this.items.values()) {
      Matter.Body.setVelocity(it.body, { x: (this.rand() - 0.5) * 9, y: -3 - this.rand() * 6 });
    }
  }

  itemAt(x: number, y: number): Item | null {
    for (const it of this.items.values()) {
      const p = it.body.position;
      if (Math.hypot(p.x - x, p.y - y) < RADII[it.tier] + 6) return it;
    }
    return null;
  }
}
