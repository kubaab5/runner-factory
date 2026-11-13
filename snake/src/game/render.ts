import { drawHat, foodSprite, glowSprite, memeFoodSprite, segVariant, SKINS, skinSprites } from './skins';
import { WORLD_R, type Snake, type World } from './world';

export interface Cam {
  x: number;
  y: number;
  zoom: number;
  shake: number;
}

interface Eyes {
  px: number;
  py: number;
  vx: number;
  vy: number;
}

export interface FloatText {
  x: number;
  y: number;
  text: string;
  color: string;
  born: number;
  size: number;
}

/** Canvas2D renderer: background tile, food, snakes (tail → head), faces, names, border. */
export class Renderer {
  g: CanvasRenderingContext2D;
  dpr = 1;
  w = 0;
  h = 0;
  private bg: CanvasPattern | null = null;
  private eyes = new Map<number, Eyes>();
  floats: FloatText[] = [];

  constructor(public canvas: HTMLCanvasElement) {
    this.g = canvas.getContext('2d', { alpha: false })!;
    this.makeBg();
  }

  resize() {
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    this.canvas.width = Math.round(this.w * this.dpr);
    this.canvas.height = Math.round(this.h * this.dpr);
    this.canvas.style.width = this.w + 'px';
    this.canvas.style.height = this.h + 'px';
  }

  /** world units across the shorter screen side, grows with the snake */
  baseZoom(r: number) {
    const m = Math.min(this.w, this.h);
    const span = 380 + m * 0.36 + (r - 10) * 22;
    return m / span;
  }

  private makeBg() {
    // hex grid tile
    const s = 60;
    const hgt = Math.sqrt(3) * s;
    const c = document.createElement('canvas');
    c.width = Math.round(s * 3);
    c.height = Math.round(hgt);
    const g = c.getContext('2d')!;
    g.fillStyle = '#12101f';
    g.fillRect(0, 0, c.width, c.height);
    const hex = (cx: number, cy: number) => {
      g.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i;
        g.lineTo(cx + Math.cos(a) * (s - 3), cy + Math.sin(a) * (s - 3));
      }
      g.closePath();
      g.fillStyle = '#191630';
      g.fill();
      g.strokeStyle = '#231e45';
      g.lineWidth = 2;
      g.stroke();
    };
    for (const [x, y] of [
      [0, 0], [s * 3, 0], [0, hgt], [s * 3, hgt],
      [s * 1.5, hgt / 2],
    ])
      hex(x, y);
    this.bg = this.g.createPattern(c, 'repeat');
  }

  draw(world: World, cam: Cam, focus: Snake | null, time: number, names: boolean) {
    const g = this.g;
    const { w, h, dpr } = this;
    const z = cam.zoom;
    const sx = cam.shake ? (Math.random() - 0.5) * cam.shake : 0;
    const sy = cam.shake ? (Math.random() - 0.5) * cam.shake : 0;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = '#0a0814';
    g.fillRect(0, 0, w, h);
    // world transform
    const ox = w / 2 - cam.x * z + sx;
    const oy = h / 2 - cam.y * z + sy;
    g.setTransform(dpr * z, 0, 0, dpr * z, dpr * ox, dpr * oy);
    const vx0 = cam.x - w / 2 / z - 60;
    const vx1 = cam.x + w / 2 / z + 60;
    const vy0 = cam.y - h / 2 / z - 60;
    const vy1 = cam.y + h / 2 / z + 60;
    const vis = (x: number, y: number, r: number) => x + r > vx0 && x - r < vx1 && y + r > vy0 && y - r < vy1;

    // arena floor
    g.save();
    g.beginPath();
    g.arc(0, 0, WORLD_R, 0, Math.PI * 2);
    g.clip();
    if (this.bg) {
      g.fillStyle = this.bg;
      g.fillRect(vx0, vy0, vx1 - vx0, vy1 - vy0);
    }
    g.restore();

    // food
    for (const f of world.foods) {
      if (!vis(f.x, f.y, f.r * 3)) continue;
      const age = time - f.born;
      const pop = age < 0.35 ? Math.max(0.1, age / 0.35) : 1;
      const pulse = 1 + Math.sin(time * 4 + f.id) * 0.12;
      if (f.meme >= 0) {
        const s = f.r * 2.6 * pop;
        g.save();
        g.translate(f.x, f.y);
        g.rotate(Math.sin(time * 2 + f.id) * 0.25);
        g.drawImage(memeFoodSprite(f.meme), -s / 2, -s / 2, s, s);
        g.restore();
      } else {
        const s = f.r * 4.2 * pulse * pop;
        g.drawImage(foodSprite(f.color), f.x - s / 2, f.y - s / 2, s, s);
      }
    }

    // border: a glowing danger ring
    g.lineWidth = 26;
    g.strokeStyle = 'rgba(255,40,80,0.25)';
    g.beginPath();
    g.arc(0, 0, WORLD_R + 12, 0, Math.PI * 2);
    g.stroke();
    g.lineWidth = 8;
    g.strokeStyle = '#ff2b5a';
    g.stroke();

    // snakes: smaller first so big ones sit on top; the focused snake last
    const order = world.snakes.filter((s) => s.alive).sort((a, b) => a.mass - b.mass);
    if (focus && focus.alive) {
      const i = order.indexOf(focus);
      if (i >= 0) order.splice(i, 1);
      order.push(focus);
    }
    for (const s of order) this.drawSnake(s, time, vis);
    // names
    if (names) {
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      for (const s of order) {
        if (s === focus) continue;
        const hd = s.head;
        if (!vis(hd.x, hd.y, 100)) continue;
        const fs = Math.max(13, 13 / z);
        g.font = `800 ${fs}px Nunito, system-ui, sans-serif`;
        g.fillStyle = 'rgba(255,255,255,0.85)';
        g.strokeStyle = 'rgba(0,0,0,0.6)';
        g.lineWidth = fs * 0.22;
        g.strokeText(s.name, hd.x, hd.y - s.r - fs * 1.1);
        g.fillText(s.name, hd.x, hd.y - s.r - fs * 1.1);
      }
    }
    // floating texts in world space
    this.floats = this.floats.filter((f) => time - f.born < 1.4);
    g.textAlign = 'center';
    for (const f of this.floats) {
      const a = (time - f.born) / 1.4;
      const fs = f.size / z;
      g.globalAlpha = 1 - a * a;
      g.font = `900 ${fs}px Nunito, system-ui, sans-serif`;
      g.lineWidth = fs * 0.2;
      g.strokeStyle = '#000';
      const y = f.y - a * 90;
      g.strokeText(f.text, f.x, y);
      g.fillStyle = f.color;
      g.fillText(f.text, f.x, y);
    }
    g.globalAlpha = 1;
  }

  private drawSnake(s: Snake, time: number, vis: (x: number, y: number, r: number) => boolean) {
    const g = this.g;
    const r = s.r;
    const sp = skinSprites(s.skin);
    const def = SKINS[s.skin % SKINS.length];
    const n = s.segs.length;
    const ghost = s.ghostUntil > time;
    if (ghost) g.globalAlpha = 0.45 + 0.35 * Math.abs(Math.sin(time * 8));
    // boost / aura glow under the body
    const glowCol = s.boosting && s.mass > 25 ? '#ffffff' : null;
    if (glowCol || sp.glow) {
      const gs = sp.glow ?? glowSprite('#ffffff', 64);
      const k = glowCol ? 3.4 : 2.8;
      g.globalAlpha = glowCol ? 0.35 + Math.sin(time * 20) * 0.1 : 0.45;
      for (let i = n - 1; i >= 0; i -= 3) {
        const p = s.segs[i];
        if (!vis(p.x, p.y, r * 2)) continue;
        g.drawImage(gs, p.x - r * k * 0.5, p.y - r * k * 0.5, r * k, r * k);
      }
      g.globalAlpha = ghost ? 0.6 : 1;
    }
    // body, tail to head; the tail tapers a bit
    for (let i = n - 1; i >= 1; i--) {
      const p = s.segs[i];
      if (!vis(p.x, p.y, r)) continue;
      const taper = i > n - 6 ? 0.7 + ((n - i) / 6) * 0.3 : 1;
      const rr = r * taper;
      g.drawImage(sp.segs[segVariant(s.skin, i)], p.x - rr, p.y - rr, rr * 2, rr * 2);
    }
    const hd = s.head;
    if (!vis(hd.x, hd.y, r * 3)) return void (g.globalAlpha = 1);
    const hr = r * 1.08;
    g.drawImage(sp.segs[0], hd.x - hr, hd.y - hr, hr * 2, hr * 2);
    // face
    g.save();
    g.translate(hd.x, hd.y);
    g.rotate(s.angle);
    if (def.face === 'npc') this.npcFace(r);
    else this.googly(s, r, time);
    // mouth opens right after a bite
    if (time - s.ateAt < 0.18) {
      g.fillStyle = '#3a0d18';
      g.beginPath();
      g.ellipse(r * 0.82, 0, r * 0.2, r * 0.32, 0, 0, Math.PI * 2);
      g.fill();
    }
    if (s.hat) drawHat(g, s.hat, r, time);
    g.restore();
    g.globalAlpha = 1;
  }

  private npcFace(r: number) {
    const g = this.g;
    g.fillStyle = '#1b1b25';
    for (const sgn of [-1, 1]) {
      g.beginPath();
      g.arc(r * 0.35, sgn * r * 0.38, r * 0.12, 0, Math.PI * 2);
      g.fill();
    }
    g.fillRect(r * 0.68, -r * 0.22, r * 0.08, r * 0.44);
  }

  /** Googly eyes: pupils lag behind turns with a little spring so they wobble */
  private googly(s: Snake, r: number, time: number) {
    const g = this.g;
    let e = this.eyes.get(s.id);
    if (!e) this.eyes.set(s.id, (e = { px: 0, py: 0, vx: 0, vy: 0 }));
    // target pupil offset in head space: where the snake wants to go
    let da = s.target - s.angle;
    while (da > Math.PI) da -= Math.PI * 2;
    while (da < -Math.PI) da += Math.PI * 2;
    const tx = Math.cos(da) * 0.5;
    const ty = Math.sin(da) * 0.5;
    e.vx += (tx - e.px) * 0.25 + Math.sin(time * 9 + s.id) * 0.004;
    e.vy += (ty - e.py) * 0.25;
    e.vx *= 0.78;
    e.vy *= 0.78;
    e.px += e.vx;
    e.py += e.vy;
    const er = r * 0.42;
    for (const sgn of [-1, 1]) {
      const ex = r * 0.3;
      const ey = sgn * r * 0.45;
      g.fillStyle = '#ffffff';
      g.beginPath();
      g.arc(ex, ey, er, 0, Math.PI * 2);
      g.fill();
      g.lineWidth = Math.max(1, r * 0.06);
      g.strokeStyle = 'rgba(0,0,0,0.5)';
      g.stroke();
      g.fillStyle = '#111';
      g.beginPath();
      g.arc(ex + e.px * er * 0.9, ey + e.py * er * 0.9, er * 0.5, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#fff';
      g.beginPath();
      g.arc(ex + e.px * er * 0.9 + er * 0.15, ey + e.py * er * 0.9 - er * 0.15, er * 0.14, 0, Math.PI * 2);
      g.fill();
    }
  }

  forget(id: number) {
    this.eyes.delete(id);
  }

  /** small preview of a skin for the menu/shop */
  static preview(canvas: HTMLCanvasElement, skin: number, hat: number, time = 0) {
    const g = canvas.getContext('2d')!;
    const W = canvas.width;
    const H = canvas.height;
    g.clearRect(0, 0, W, H);
    const sp = skinSprites(skin);
    const r = H * 0.2;
    const n = 14;
    const pts: Array<[number, number]> = [];
    for (let i = 0; i < n; i++) {
      const x = W * 0.82 - i * (W * 0.62) / (n - 1);
      const y = H / 2 + Math.sin(i * 0.65 + time * 3) * H * 0.14;
      pts.push([x, y]);
    }
    if (sp.glow) {
      g.globalAlpha = 0.5;
      for (const [x, y] of pts) g.drawImage(sp.glow, x - r * 1.4, y - r * 1.4, r * 2.8, r * 2.8);
      g.globalAlpha = 1;
    }
    for (let i = n - 1; i >= 1; i--) {
      const [x, y] = pts[i];
      g.drawImage(sp.segs[segVariant(skin, i)], x - r, y - r, r * 2, r * 2);
    }
    const [hx, hy] = pts[0];
    g.drawImage(sp.segs[0], hx - r * 1.08, hy - r * 1.08, r * 2.16, r * 2.16);
    g.save();
    g.translate(hx, hy);
    const ang = Math.atan2(pts[0][1] - pts[1][1], pts[0][0] - pts[1][0]);
    g.rotate(ang);
    if (SKINS[skin].face === 'npc') {
      g.fillStyle = '#1b1b25';
      for (const sgn of [-1, 1]) {
        g.beginPath();
        g.arc(r * 0.35, sgn * r * 0.38, r * 0.12, 0, Math.PI * 2);
        g.fill();
      }
      g.fillRect(r * 0.68, -r * 0.22, r * 0.08, r * 0.44);
    } else {
      for (const sgn of [-1, 1]) {
        g.fillStyle = '#fff';
        g.beginPath();
        g.arc(r * 0.3, sgn * r * 0.45, r * 0.42, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = '#111';
        g.beginPath();
        g.arc(r * 0.45, sgn * r * 0.45 + Math.sin(time * 5) * r * 0.08, r * 0.21, 0, Math.PI * 2);
        g.fill();
      }
    }
    if (hat) drawHat(g, hat, r, time);
    g.restore();
  }
}
