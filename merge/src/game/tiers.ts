/* The eleven memes of the merge chain. Bodies are pre-rendered once per tier; faces are drawn live
   so the eyes can follow the dropper, blink, and panic near the danger line. All drawn in code. */
import { RADII } from './sim';

export type Eyes = 'dots' | 'googly' | 'happy' | 'shades' | 'lidded' | 'serious' | 'stars' | 'boss';
export type Mouth = 'smile' | 'flat' | 'open' | 'tongue' | 'smirk' | 'grin';
export interface TierDef {
  name: string;
  ru: string;
  color: string;
  dark: string;
  pattern?: 'sprinkles' | 'chips' | 'pepperoni' | 'sparkle';
  eyes: Eyes;
  mouth: Mouth;
  glow?: string;
  crown?: boolean;
  brows?: boolean;
}

export const TIERS: TierDef[] = [
  { name: 'Crumb', ru: 'Крошка', color: '#f6cf7a', dark: '#c99a3e', eyes: 'dots', mouth: 'smile' },
  { name: 'NPC', ru: 'NPC', color: '#b3b8be', dark: '#80868c', eyes: 'dots', mouth: 'flat' },
  { name: 'Bean', ru: 'Бобик', color: '#7ddc6a', dark: '#46a33a', eyes: 'googly', mouth: 'smile' },
  { name: 'Donut', ru: 'Пончик', color: '#ff9ccf', dark: '#d9609e', pattern: 'sprinkles', eyes: 'googly', mouth: 'open' },
  { name: 'Cookie', ru: 'Печенька', color: '#d39a5c', dark: '#9a6331', pattern: 'chips', eyes: 'happy', mouth: 'open' },
  { name: 'Pizza', ru: 'Пицца', color: '#ffd45a', dark: '#d9a21f', pattern: 'pepperoni', eyes: 'googly', mouth: 'tongue' },
  { name: 'Cool Guy', ru: 'Крутой', color: '#55c2ff', dark: '#1f86c9', eyes: 'shades', mouth: 'smirk' },
  { name: 'Rizz', ru: 'Ризз', color: '#ff6f7d', dark: '#d13a4c', eyes: 'lidded', mouth: 'smirk', brows: true },
  { name: 'Sigma', ru: 'Сигма', color: '#4a4f8c', dark: '#2a2d5c', eyes: 'serious', mouth: 'flat', brows: true },
  { name: 'Aura', ru: 'Аура', color: '#b07bff', dark: '#7a3df0', pattern: 'sparkle', eyes: 'stars', mouth: 'grin', glow: '#d2b0ff' },
  { name: 'Final Boss', ru: 'Финальный босс', color: '#ffd23b', dark: '#d99a00', pattern: 'sparkle', eyes: 'boss', mouth: 'grin', glow: '#fff1a0', crown: true, brows: true },
];

const SPR = 256;
const bodyCache: HTMLCanvasElement[] = [];

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function bodySprite(tier: number): HTMLCanvasElement {
  if (bodyCache[tier]) return bodyCache[tier];
  const c = document.createElement('canvas');
  c.width = c.height = SPR;
  const g = c.getContext('2d')!;
  const d = TIERS[tier];
  const r = SPR / 2 - 8;
  const cx = SPR / 2;
  // body
  const gr = g.createRadialGradient(cx - r * 0.35, cx - r * 0.4, r * 0.1, cx, cx, r);
  gr.addColorStop(0, lighten(d.color, 0.35));
  gr.addColorStop(0.55, d.color);
  gr.addColorStop(1, d.dark);
  g.fillStyle = gr;
  g.beginPath();
  g.arc(cx, cx, r, 0, Math.PI * 2);
  g.fill();
  // pattern
  g.save();
  g.beginPath();
  g.arc(cx, cx, r - 4, 0, Math.PI * 2);
  g.clip();
  const R = rng(tier * 101 + 7);
  if (d.pattern === 'sprinkles') {
    const cols = ['#ffffff', '#4dc3ff', '#ffe14d', '#39d98a', '#b77bff'];
    for (let i = 0; i < 26; i++) {
      const a = R() * Math.PI * 2;
      const rr = r * (0.2 + R() * 0.75);
      const x = cx + Math.cos(a) * rr;
      const y = cx + Math.sin(a) * rr;
      if (Math.abs(y - cx - r * 0.1) < r * 0.45 && Math.abs(x - cx) < r * 0.55) continue; // keep the face clear
      g.save();
      g.translate(x, y);
      g.rotate(R() * Math.PI);
      g.fillStyle = cols[i % cols.length];
      g.fillRect(-9, -3, 18, 6);
      g.restore();
    }
  } else if (d.pattern === 'chips' || d.pattern === 'pepperoni') {
    const n = d.pattern === 'chips' ? 9 : 6;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + R() * 0.4;
      const rr = r * (0.7 + R() * 0.15);
      g.fillStyle = d.pattern === 'chips' ? '#5a3418' : '#d8402c';
      g.beginPath();
      g.arc(cx + Math.cos(a) * rr, cx + Math.sin(a) * rr, d.pattern === 'chips' ? 9 + R() * 4 : 17 + R() * 5, 0, Math.PI * 2);
      g.fill();
    }
  } else if (d.pattern === 'sparkle') {
    for (let i = 0; i < 14; i++) {
      const a = R() * Math.PI * 2;
      const rr = r * (0.55 + R() * 0.4);
      star(g, cx + Math.cos(a) * rr, cx + Math.sin(a) * rr, 4 + R() * 6, 'rgba(255,255,255,0.85)');
    }
  }
  g.restore();
  // outline and gloss
  g.lineWidth = 7;
  g.strokeStyle = 'rgba(30,20,50,0.55)';
  g.beginPath();
  g.arc(cx, cx, r, 0, Math.PI * 2);
  g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.35)';
  g.beginPath();
  g.ellipse(cx - r * 0.38, cx - r * 0.5, r * 0.28, r * 0.15, -0.6, 0, Math.PI * 2);
  g.fill();
  return (bodyCache[tier] = c);
}

function lighten(hex: string, k: number) {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.round(v + (255 - v) * k);
  return `rgb(${ch(n >> 16)},${ch((n >> 8) & 255)},${ch(n & 255)})`;
}

function star(g: CanvasRenderingContext2D, x: number, y: number, s: number, col: string) {
  g.fillStyle = col;
  g.beginPath();
  for (let i = 0; i < 8; i++) {
    const rr = i % 2 ? s * 0.35 : s;
    const a = (i * Math.PI) / 4;
    g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  g.closePath();
  g.fill();
}

const glowCache = new Map<string, HTMLCanvasElement>();
export function glowSprite(col: string) {
  let c = glowCache.get(col);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const gr = g.createRadialGradient(64, 64, 20, 64, 64, 64);
  gr.addColorStop(0, col);
  gr.addColorStop(1, col + '00');
  g.fillStyle = gr;
  g.fillRect(0, 0, 128, 128);
  glowCache.set(col, c);
  return c;
}

export interface FaceState {
  /** where the eyes look, unit-ish vector */
  lx: number;
  ly: number;
  blink: boolean;
  scared: boolean;
  happy: boolean;
}

/** Draws a whole meme (body + face) centred at x,y with radius r, rotated by `rot`. */
export function drawMeme(g: CanvasRenderingContext2D, tier: number, x: number, y: number, r: number, rot: number, f: FaceState, time: number) {
  const d = TIERS[tier];
  if (d.glow) {
    const s = r * 3 * (1 + Math.sin(time * 3 + tier) * 0.06);
    g.globalAlpha = 0.55;
    g.drawImage(glowSprite(d.glow), x - s / 2, y - s / 2, s, s);
    g.globalAlpha = 1;
  }
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  const k = (r * 2) / (SPR - 16);
  const S = SPR * k;
  g.drawImage(bodySprite(tier), -S / 2, -S / 2, S, S);
  // the face stays upright-ish: undo most of the roll so faces read well in the pile
  g.rotate(-rot * 0.85);
  drawFace(g, d, r, f, time);
  g.restore();
}

function drawFace(g: CanvasRenderingContext2D, d: TierDef, r: number, f: FaceState, time: number) {
  const ink = '#1d1430';
  const ex = r * 0.34;
  const ey = -r * 0.12;
  const lw = Math.max(1.5, r * 0.07);
  g.lineCap = 'round';
  g.lineWidth = lw;
  g.strokeStyle = ink;
  g.fillStyle = ink;
  const eyes: Eyes = f.scared && d.eyes !== 'shades' && d.eyes !== 'boss' ? 'googly' : d.eyes;
  if (f.blink && eyes !== 'shades') {
    for (const s of [-1, 1]) {
      g.beginPath();
      g.moveTo(s * ex - r * 0.12, ey);
      g.lineTo(s * ex + r * 0.12, ey);
      g.stroke();
    }
  } else if (eyes === 'dots') {
    for (const s of [-1, 1]) {
      g.beginPath();
      g.arc(s * ex + f.lx * r * 0.05, ey + f.ly * r * 0.05, r * 0.09, 0, Math.PI * 2);
      g.fill();
    }
  } else if (eyes === 'googly' || eyes === 'stars') {
    const er = r * (f.scared ? 0.27 : 0.22);
    for (const s of [-1, 1]) {
      g.fillStyle = '#ffffff';
      g.beginPath();
      g.arc(s * ex, ey, er, 0, Math.PI * 2);
      g.fill();
      g.stroke();
      if (eyes === 'stars') star(g, s * ex + f.lx * er * 0.3, ey + f.ly * er * 0.3, er * 0.75, '#ffcf3a');
      else {
        g.fillStyle = ink;
        g.beginPath();
        g.arc(s * ex + f.lx * er * 0.45, ey + f.ly * er * 0.45, er * (f.scared ? 0.35 : 0.5), 0, Math.PI * 2);
        g.fill();
      }
    }
  } else if (eyes === 'happy') {
    for (const s of [-1, 1]) {
      g.beginPath();
      g.arc(s * ex, ey + r * 0.05, r * 0.12, Math.PI * 1.1, Math.PI * 1.9);
      g.stroke();
    }
  } else if (eyes === 'shades') {
    g.fillStyle = '#0d0b14';
    const w = r * 0.42;
    const h = r * 0.24;
    for (const s of [-1, 1]) {
      g.beginPath();
      g.roundRect(s * ex - w / 2, ey - h / 2, w, h, h * 0.3);
      g.fill();
    }
    g.fillRect(-ex, ey - h * 0.35, ex * 2, h * 0.22);
    g.fillStyle = 'rgba(255,255,255,0.7)';
    for (const s of [-1, 1]) g.fillRect(s * ex - w * 0.3, ey - h * 0.3, w * 0.18, h * 0.18);
  } else if (eyes === 'lidded' || eyes === 'serious' || eyes === 'boss') {
    for (const s of [-1, 1]) {
      g.fillStyle = '#ffffff';
      g.beginPath();
      g.ellipse(s * ex, ey, r * 0.18, r * 0.13, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = eyes === 'boss' ? '#d61f3a' : ink;
      g.beginPath();
      g.arc(s * ex + f.lx * r * 0.07, ey + f.ly * r * 0.04, r * 0.08, 0, Math.PI * 2);
      g.fill();
      if (eyes === 'lidded') {
        // heavy lids: the rizz look
        g.fillStyle = d.dark;
        g.beginPath();
        g.ellipse(s * ex, ey - r * 0.06, r * 0.2, r * 0.1, 0, Math.PI, 0);
        g.fill();
      }
    }
  }
  if (d.brows || f.scared) {
    g.lineWidth = lw * 1.3;
    for (const s of [-1, 1]) {
      g.beginPath();
      const up = f.scared ? -1 : 1;
      const tilt = d.eyes === 'lidded' && s === 1 && !f.scared ? -r * 0.08 : 0;
      g.moveTo(s * ex - s * r * 0.16, ey - r * 0.27 + tilt);
      g.lineTo(s * ex + s * r * 0.14, ey - r * 0.27 + up * r * 0.07 + tilt);
      g.stroke();
    }
    g.lineWidth = lw;
  }
  // mouth
  const my = r * 0.32;
  const mouth: Mouth = f.scared ? 'open' : f.happy ? 'grin' : d.mouth;
  g.fillStyle = ink;
  if (mouth === 'smile') {
    g.beginPath();
    g.arc(0, my - r * 0.12, r * 0.18, Math.PI * 0.2, Math.PI * 0.8);
    g.stroke();
  } else if (mouth === 'flat') {
    g.beginPath();
    g.moveTo(-r * 0.15, my);
    g.lineTo(r * 0.15, my);
    g.stroke();
  } else if (mouth === 'open' || mouth === 'grin' || mouth === 'tongue') {
    const w = mouth === 'grin' ? r * 0.3 : r * 0.17;
    const h = f.scared ? r * 0.2 : mouth === 'grin' ? r * 0.16 : r * 0.14;
    g.fillStyle = '#3a0d22';
    g.beginPath();
    if (mouth === 'grin') g.ellipse(0, my - h * 0.2, w, h, 0, 0, Math.PI);
    else g.ellipse(0, my, w, h, 0, 0, Math.PI * 2);
    g.fill();
    if (mouth === 'grin') {
      g.fillStyle = '#ffffff';
      g.fillRect(-w * 0.75, my - h * 0.2, w * 1.5, h * 0.3);
    }
    if (mouth === 'tongue' && !f.scared) {
      g.fillStyle = '#ff5c8a';
      g.beginPath();
      g.ellipse(r * 0.04, my + h * 0.7, r * 0.09, r * 0.11, 0.2, 0, Math.PI * 2);
      g.fill();
    }
  } else if (mouth === 'smirk') {
    g.beginPath();
    g.moveTo(-r * 0.14, my + r * 0.02);
    g.quadraticCurveTo(r * 0.05, my + r * 0.06, r * 0.18, my - r * 0.06);
    g.stroke();
  }
  // a sweat drop when scared
  if (f.scared) {
    g.fillStyle = '#7fd4ff';
    g.beginPath();
    g.ellipse(r * 0.62, -r * 0.35 + Math.sin(time * 8) * r * 0.03, r * 0.08, r * 0.13, 0, 0, Math.PI * 2);
    g.fill();
  }
  if (d.crown) {
    g.save();
    g.translate(0, -r * 0.82);
    const w = r * 0.8;
    g.fillStyle = '#ffe14d';
    g.strokeStyle = '#7a4a00';
    g.lineWidth = lw;
    g.beginPath();
    g.moveTo(-w / 2, r * 0.12);
    g.lineTo(-w / 2, -r * 0.2);
    g.lineTo(-w / 4, -r * 0.02);
    g.lineTo(0, -r * 0.3);
    g.lineTo(w / 4, -r * 0.02);
    g.lineTo(w / 2, -r * 0.2);
    g.lineTo(w / 2, r * 0.12);
    g.closePath();
    g.fill();
    g.stroke();
    g.fillStyle = '#ff3b5c';
    g.beginPath();
    g.arc(0, r * 0.02, r * 0.06, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }
}

export const tierRadius = (t: number) => RADII[t];
