/* Meme Snakes simulation: pure logic, no DOM. Units are world pixels and seconds. */

export const WORLD_R = 3300;
export const BASE_SPEED = 165;
export const BOOST_SPEED = 330;
export const MIN_BOOST_MASS = 25;
export const START_MASS = 30;
const FOOD_TARGET = 2300;
const CELL = 80;

export type Rand = () => number;

export interface Food {
  id: number;
  x: number;
  y: number;
  r: number;
  value: number;
  color: number; // index into palette
  meme: number; // -1 pellet, otherwise meme food icon index
  born: number;
}

export type Personality = 'glutton' | 'hunter' | 'coward';

export interface Seg {
  x: number;
  y: number;
}

export class Snake {
  alive = true;
  angle: number;
  target: number;
  boosting = false;
  segs: Seg[] = [];
  kills = 0;
  maxMass: number;
  bornAt: number;
  boostAcc = 0;
  /** bot brain */
  think = 0;
  personality: Personality = 'glutton';
  skill = 0.5;
  killedBy: string | null = null;
  hat = 0;
  /** world time of the last bite: drives the open mouth */
  ateAt = -9;
  /** spawn protection: no collisions either way until this world time */
  ghostUntil = 0;

  constructor(
    public id: number,
    public name: string,
    public skin: number,
    public isBot: boolean,
    x: number,
    y: number,
    public mass: number,
    now: number,
    angle: number,
  ) {
    this.angle = angle;
    this.target = angle;
    this.maxMass = mass;
    this.bornAt = now;
    const n = segCountFor(mass);
    const d = spacingFor(radiusFor(mass));
    for (let i = 0; i < n; i++) this.segs.push({ x: x - Math.cos(angle) * d * i, y: y - Math.sin(angle) * d * i });
  }

  get head() {
    return this.segs[0];
  }
  get r() {
    return radiusFor(this.mass);
  }
}

export const radiusFor = (mass: number) => 10 + Math.min(28, Math.sqrt(mass) * 0.55);
export const segCountFor = (mass: number) => Math.min(320, 8 + Math.floor(mass / 3.2));
export const spacingFor = (r: number) => r * 0.52;
export const turnRateFor = (r: number) => 5.2 - Math.min(2.2, (r - 10) * 0.09);

export interface KillEvent {
  killer: Snake | null;
  victim: Snake;
}

export interface EatEvent {
  snake: Snake;
  food: Food;
}

/** Spatial hash for body segments, rebuilt every tick. */
class Grid {
  private cells = new Map<number, Array<{ s: Snake; i: number }>>();
  key(cx: number, cy: number) {
    return (cx + 1000) * 4096 + (cy + 1000);
  }
  clear() {
    this.cells.clear();
  }
  add(s: Snake, i: number) {
    const p = s.segs[i];
    const k = this.key(Math.floor(p.x / CELL), Math.floor(p.y / CELL));
    let arr = this.cells.get(k);
    if (!arr) this.cells.set(k, (arr = []));
    arr.push({ s, i });
  }
  near(x: number, y: number, rad: number, fn: (s: Snake, i: number) => boolean | void) {
    const x0 = Math.floor((x - rad) / CELL);
    const x1 = Math.floor((x + rad) / CELL);
    const y0 = Math.floor((y - rad) / CELL);
    const y1 = Math.floor((y + rad) / CELL);
    for (let cx = x0; cx <= x1; cx++)
      for (let cy = y0; cy <= y1; cy++) {
        const arr = this.cells.get(this.key(cx, cy));
        if (!arr) continue;
        for (const e of arr) if (fn(e.s, e.i) === true) return;
      }
  }
}

class FoodGrid {
  private cells = new Map<number, Set<Food>>();
  private k(x: number, y: number) {
    return (Math.floor(x / CELL) + 1000) * 4096 + (Math.floor(y / CELL) + 1000);
  }
  add(f: Food) {
    const k = this.k(f.x, f.y);
    let s = this.cells.get(k);
    if (!s) this.cells.set(k, (s = new Set()));
    s.add(f);
  }
  remove(f: Food) {
    this.cells.get(this.k(f.x, f.y))?.delete(f);
  }
  move(f: Food, nx: number, ny: number) {
    const a = this.k(f.x, f.y);
    const b = this.k(nx, ny);
    if (a !== b) {
      this.cells.get(a)?.delete(f);
      f.x = nx;
      f.y = ny;
      this.add(f);
    } else {
      f.x = nx;
      f.y = ny;
    }
  }
  near(x: number, y: number, rad: number, fn: (f: Food) => void) {
    const x0 = Math.floor((x - rad) / CELL);
    const x1 = Math.floor((x + rad) / CELL);
    const y0 = Math.floor((y - rad) / CELL);
    const y1 = Math.floor((y + rad) / CELL);
    for (let cx = x0; cx <= x1; cx++)
      for (let cy = y0; cy <= y1; cy++) {
        const s = this.cells.get((cx + 1000) * 4096 + (cy + 1000));
        if (s) for (const f of s) fn(f);
      }
  }
}

export interface WorldOpts {
  bots: number;
  rand?: Rand;
  botNames: string[];
  skins: number;
  foodColors: number;
  memeFoods: number;
  hats: number;
}

export class World {
  snakes: Snake[] = [];
  foods = new Set<Food>();
  time = 0;
  kills: KillEvent[] = [];
  eats: EatEvent[] = [];
  private grid = new Grid();
  private fgrid = new FoodGrid();
  private nextId = 1;
  private rand: Rand;
  private respawnQueue: Array<{ at: number }> = [];

  constructor(public opts: WorldOpts) {
    this.rand = opts.rand ?? Math.random;
    for (let i = 0; i < FOOD_TARGET; i++) this.spawnFood();
    for (let i = 0; i < opts.bots; i++) this.spawnBot(true);
  }

  // ───────── spawning ─────────
  randomPoint(maxR = WORLD_R - 150): [number, number] {
    const a = this.rand() * Math.PI * 2;
    const r = Math.sqrt(this.rand()) * maxR;
    return [Math.cos(a) * r, Math.sin(a) * r];
  }

  spawnFood(x?: number, y?: number, value?: number, color?: number, meme = -1): Food {
    let fx = x;
    let fy = y;
    if (fx === undefined || fy === undefined) [fx, fy] = this.randomPoint(WORLD_R - 40);
    const isMeme = meme < 0 && x === undefined && this.rand() < 0.02;
    const v = value ?? (isMeme ? 8 : 1 + Math.floor(this.rand() * 3));
    const f: Food = {
      id: this.nextId++,
      x: fx,
      y: fy,
      value: v,
      r: isMeme || meme >= 0 ? 16 : 4 + v * 1.6,
      color: color ?? Math.floor(this.rand() * this.opts.foodColors),
      meme: isMeme ? Math.floor(this.rand() * this.opts.memeFoods) : meme,
      born: this.time,
    };
    this.foods.add(f);
    this.fgrid.add(f);
    return f;
  }

  removeFood(f: Food) {
    this.foods.delete(f);
    this.fgrid.remove(f);
  }

  /** A spot far from other heads */
  safeSpawn(): [number, number] {
    for (let tries = 0; tries < 60; tries++) {
      const [x, y] = this.randomPoint(WORLD_R - 600);
      let ok = true;
      for (const s of this.snakes) {
        if (!s.alive) continue;
        if (Math.hypot(s.head.x - x, s.head.y - y) < 600) ok = false;
        for (let i = 0; ok && i < s.segs.length; i += 3) if (Math.hypot(s.segs[i].x - x, s.segs[i].y - y) < 260) ok = false;
        if (!ok) break;
      }
      if (ok) return [x, y];
    }
    return this.randomPoint(WORLD_R - 600);
  }

  spawnBot(initial = false): Snake {
    const [x, y] = this.safeSpawn();
    const big = this.rand();
    const mass = initial ? START_MASS + Math.floor(Math.pow(big, 3) * 900) : START_MASS + Math.floor(Math.pow(big, 4) * 300);
    const name = this.opts.botNames[Math.floor(this.rand() * this.opts.botNames.length)];
    const s = new Snake(this.nextId++, name, Math.floor(this.rand() * this.opts.skins), true, x, y, mass, this.time, this.rand() * Math.PI * 2);
    const p = this.rand();
    s.personality = p < 0.45 ? 'glutton' : p < 0.75 ? 'hunter' : 'coward';
    s.skill = 0.35 + this.rand() * 0.6;
    s.hat = this.rand() < 0.35 ? 1 + Math.floor(this.rand() * (this.opts.hats - 1)) : 0;
    this.snakes.push(s);
    return s;
  }

  spawnPlayer(name: string, skin: number, mass: number): Snake {
    const [x, y] = this.safeSpawn();
    const s = new Snake(this.nextId++, name, skin, false, x, y, mass, this.time, this.rand() * Math.PI * 2);
    s.ghostUntil = this.time + 3;
    this.snakes.push(s);
    return s;
  }

  // ───────── tick ─────────
  step(dt: number) {
    this.time += dt;
    this.kills = [];
    this.eats = [];
    for (const s of this.snakes) if (s.alive && s.isBot) this.brain(s, dt);
    for (const s of this.snakes) if (s.alive) this.move(s, dt);
    this.rebuildGrid();
    for (const s of this.snakes) if (s.alive) this.collide(s);
    for (const s of this.snakes) if (s.alive) this.eat(s, dt);
    // remove dead bots, queue respawn
    const before = this.snakes.length;
    this.snakes = this.snakes.filter((s) => s.alive || !s.isBot);
    for (let i = 0; i < before - this.snakes.length; i++) this.respawnQueue.push({ at: this.time + 1.5 + this.rand() * 3 });
    this.respawnQueue = this.respawnQueue.filter((q) => {
      if (q.at > this.time) return true;
      this.spawnBot();
      return false;
    });
    // keep food density
    let missing = FOOD_TARGET - this.foods.size;
    while (missing-- > 0 && this.rand() < 0.5) this.spawnFood();
  }

  private move(s: Snake, dt: number) {
    // turn toward target angle with a size-dependent rate
    let da = s.target - s.angle;
    while (da > Math.PI) da -= Math.PI * 2;
    while (da < -Math.PI) da += Math.PI * 2;
    const maxTurn = turnRateFor(s.r) * dt;
    s.angle += Math.max(-maxTurn, Math.min(maxTurn, da));
    const boosting = s.boosting && s.mass > MIN_BOOST_MASS;
    const speed = boosting ? BOOST_SPEED : BASE_SPEED;
    const h = s.head;
    h.x += Math.cos(s.angle) * speed * dt;
    h.y += Math.sin(s.angle) * speed * dt;
    // boosting burns mass and leaves a trail of food
    if (boosting) {
      s.boostAcc += dt;
      while (s.boostAcc > 0.12) {
        s.boostAcc -= 0.12;
        s.mass = Math.max(MIN_BOOST_MASS - 1, s.mass - 1.2);
        const tail = s.segs[s.segs.length - 1];
        if (this.foods.size < 4000) this.spawnFood(tail.x + (this.rand() - 0.5) * 8, tail.y + (this.rand() - 0.5) * 8, 1, s.skin % this.opts.foodColors);
      }
    }
    // body follows like a rope
    const d = spacingFor(s.r);
    const want = segCountFor(s.mass);
    while (s.segs.length < want) {
      const t = s.segs[s.segs.length - 1];
      s.segs.push({ x: t.x, y: t.y });
    }
    if (s.segs.length > want) s.segs.length = want;
    for (let i = 1; i < s.segs.length; i++) {
      const a = s.segs[i - 1];
      const b = s.segs[i];
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const dist = Math.hypot(dx, dy);
      if (dist > d) {
        const k = (dist - d) / dist;
        b.x += dx * k;
        b.y += dy * k;
      }
    }
    s.maxMass = Math.max(s.maxMass, s.mass);
  }

  private rebuildGrid() {
    this.grid.clear();
    for (const s of this.snakes) {
      if (!s.alive || s.ghostUntil > this.time) continue;
      for (let i = 0; i < s.segs.length; i += 1) this.grid.add(s, i);
    }
  }

  private collide(s: Snake) {
    const h = s.head;
    if (h.x * h.x + h.y * h.y > WORLD_R * WORLD_R) return this.kill(s, null);
    if (s.ghostUntil > this.time) return;
    const hr = s.r * 0.75;
    let hit: Snake | null = null;
    this.grid.near(h.x, h.y, hr + 40, (o, i) => {
      if (o === s || !o.alive) return;
      const p = o.segs[i];
      const rr = hr + o.r * 0.85;
      const dx = p.x - h.x;
      const dy = p.y - h.y;
      if (dx * dx + dy * dy < rr * rr) {
        // head-on: the smaller one dies (ties: the newer one)
        if (i === 0 && o.mass > s.mass === false) return;
        hit = o;
        return true;
      }
    });
    if (hit) this.kill(s, hit);
  }

  kill(s: Snake, killer: Snake | null) {
    if (!s.alive) return;
    s.alive = false;
    s.killedBy = killer?.name ?? null;
    if (killer) killer.kills++;
    this.kills.push({ killer, victim: s });
    // the body turns into food
    const n = s.segs.length;
    const per = Math.max(1, (s.mass * 0.75) / Math.max(1, Math.ceil(n / 2)));
    for (let i = 0; i < n; i += 2) {
      const p = s.segs[i];
      this.spawnFood(p.x + (this.rand() - 0.5) * s.r, p.y + (this.rand() - 0.5) * s.r, Math.min(12, per), s.skin % this.opts.foodColors);
    }
  }

  private eat(s: Snake, dt: number) {
    const h = s.head;
    const r = s.r;
    const pullR = r * 2.4 + 30;
    const eaten: Food[] = [];
    this.fgrid.near(h.x, h.y, pullR, (f) => {
      const dx = h.x - f.x;
      const dy = h.y - f.y;
      const dist = Math.hypot(dx, dy);
      if (dist < r + f.r * 0.5) eaten.push(f);
      else if (dist < pullR) {
        // magnet: food slides into the mouth
        const k = Math.min(1, (dt * 6 * (pullR - dist)) / pullR + dt * 2);
        this.fgrid.move(f, f.x + dx * k, f.y + dy * k);
      }
    });
    for (const f of eaten) {
      this.removeFood(f);
      s.mass += f.value;
      s.ateAt = this.time;
      this.eats.push({ snake: s, food: f });
    }
  }

  // ───────── bots ─────────
  /** Is the way ahead blocked within `len`? Checks bodies and the border. */
  private blocked(s: Snake, ang: number, len: number): number {
    const h = s.head;
    const steps = 6;
    for (let k = 1; k <= steps; k++) {
      const t = (len * k) / steps;
      const x = h.x + Math.cos(ang) * t;
      const y = h.y + Math.sin(ang) * t;
      if (x * x + y * y > (WORLD_R - 60) * (WORLD_R - 60)) return t;
      let hit = false;
      this.grid.near(x, y, s.r + 30, (o, i) => {
        if (o === s) return;
        const p = o.segs[i];
        const rr = s.r + o.r + 6;
        if ((p.x - x) ** 2 + (p.y - y) ** 2 < rr * rr) {
          hit = true;
          return true;
        }
      });
      if (hit) return t;
    }
    return Infinity;
  }

  brain(s: Snake, dt: number) {
    s.think -= dt;
    if (s.think > 0) return;
    s.think = 0.08 + (1 - s.skill) * 0.25;
    const h = s.head;
    const look = 90 + s.r * 4;
    // 1) danger: probe straight and to both sides, pick the freest heading
    const ahead = this.blocked(s, s.angle, look);
    if (ahead < Infinity) {
      let best = s.angle;
      let bestFree = ahead;
      for (const off of [0.6, -0.6, 1.2, -1.2, 1.9, -1.9, 2.6, -2.6]) {
        const a = s.angle + off;
        const free = this.blocked(s, a, look);
        if (free > bestFree) {
          bestFree = free;
          best = a;
        }
        if (free === Infinity) break;
      }
      s.target = best;
      s.boosting = s.skill > 0.7 && s.mass > 60 && ahead < look * 0.4;
      return;
    }
    s.boosting = false;
    // 2) hunters cut off smaller heads nearby
    if (s.personality === 'hunter' && s.mass > 80) {
      let prey: Snake | null = null;
      let pd = 520;
      for (const o of this.snakes) {
        if (o === s || !o.alive || o.mass > s.mass * 0.8 || this.time - o.bornAt < 5) continue;
        const d = Math.hypot(o.head.x - h.x, o.head.y - h.y);
        if (d < pd) {
          pd = d;
          prey = o;
        }
      }
      if (prey) {
        const lead = 80 + prey.r * 3;
        const tx = prey.head.x + Math.cos(prey.angle) * lead;
        const ty = prey.head.y + Math.sin(prey.angle) * lead;
        s.target = Math.atan2(ty - h.y, tx - h.x);
        s.boosting = pd < 300 && s.mass > 120;
        return;
      }
    }
    // 3) cowards keep away from bigger heads
    if (s.personality === 'coward') {
      for (const o of this.snakes) {
        if (o === s || !o.alive || o.mass < s.mass) continue;
        const d = Math.hypot(o.head.x - h.x, o.head.y - h.y);
        if (d < 320) {
          s.target = Math.atan2(h.y - o.head.y, h.x - o.head.x);
          s.boosting = d < 160 && s.mass > 50;
          return;
        }
      }
    }
    // 4) food: go for the richest spot nearby
    let best: Food | null = null;
    let score = 0;
    this.fgrid.near(h.x, h.y, 360, (f) => {
      const d = Math.hypot(f.x - h.x, f.y - h.y) + 30;
      const sc = (f.value * (f.meme >= 0 ? 2 : 1)) / d;
      if (sc > score) {
        score = sc;
        best = f;
      }
    });
    if (best) {
      const b = best as Food;
      s.target = Math.atan2(b.y - h.y, b.x - h.x);
      return;
    }
    // 5) wander, drifting back toward the middle
    const toCenter = Math.atan2(-h.y, -h.x);
    const far = Math.hypot(h.x, h.y) / WORLD_R;
    s.target = s.angle + (this.rand() - 0.5) * 0.9 + (far > 0.7 ? angleDiff(toCenter, s.angle) * 0.5 : 0);
  }

  ranking(): Snake[] {
    return this.snakes.filter((s) => s.alive).sort((a, b) => b.mass - a.mass);
  }
}

export function angleDiff(a: number, b: number) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}
