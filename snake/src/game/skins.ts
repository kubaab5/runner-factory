/* Meme skins and accessories. Everything is drawn in code into small canvases once, then
   stamped with drawImage, so the renderer never builds gradients per frame. */

export type Pattern = 'plain' | 'spots' | 'grill' | 'stars' | 'bumps' | 'shine';
export interface SkinDef {
  name: string;
  price: number;
  colors: string[];
  stripe: number;
  pattern: Pattern;
  spot?: string;
  glow?: string;
  face?: 'googly' | 'npc';
}

export const SKINS: SkinDef[] = [
  { name: 'Neon Noodle', price: 0, colors: ['#39ff88', '#1fd06a'], stripe: 3, pattern: 'plain' },
  { name: 'Danger Noodle', price: 0, colors: ['#ff3b5c', '#3d3d52', '#ffd23b', '#3d3d52'], stripe: 2, pattern: 'plain' },
  { name: 'NPC', price: 100, colors: ['#a3a8ae', '#8f959b'], stripe: 4, pattern: 'plain', face: 'npc' },
  { name: 'Sausage', price: 150, colors: ['#c8603e', '#b85433'], stripe: 5, pattern: 'grill' },
  { name: 'Candy Cane', price: 150, colors: ['#ffffff', '#ff2e4c'], stripe: 2, pattern: 'shine' },
  { name: 'Pickle', price: 200, colors: ['#74b63c', '#64a230'], stripe: 4, pattern: 'bumps', spot: '#9bd45e' },
  { name: 'Banana', price: 200, colors: ['#ffe14d', '#ffd21f'], stripe: 4, pattern: 'spots', spot: '#7a5520' },
  { name: 'Pizza', price: 250, colors: ['#ffcf5a', '#f6bd45'], stripe: 4, pattern: 'spots', spot: '#d63a2a' },
  { name: 'Zebra', price: 250, colors: ['#f5f5f5', '#3d3d52'], stripe: 1, pattern: 'plain' },
  { name: 'Rainbow', price: 300, colors: ['#ff4d4d', '#ff9f1a', '#ffe14d', '#4dff88', '#4dc3ff', '#a64dff'], stripe: 2, pattern: 'shine' },
  { name: 'Sushi', price: 300, colors: ['#fbfbf6', '#ff8a5c', '#fbfbf6', '#3a4a40'], stripe: 2, pattern: 'plain' },
  { name: 'Toxic', price: 350, colors: ['#c6ff1a', '#8fdc00'], stripe: 3, pattern: 'bumps', spot: '#eaff8a', glow: '#c6ff1a' },
  { name: 'Galaxy', price: 400, colors: ['#3b2fa8', '#4b3cc8'], stripe: 3, pattern: 'stars', glow: '#6b5bff' },
  { name: 'Aura', price: 500, colors: ['#9b5cff', '#7a35ff'], stripe: 3, pattern: 'shine', glow: '#c08bff' },
  { name: 'Gold Drip', price: 800, colors: ['#ffd84a', '#f0b90b'], stripe: 3, pattern: 'shine', glow: '#ffe680' },
];

export interface HatDef {
  name: string;
  price: number;
}
export const HATS: HatDef[] = [
  { name: 'None', price: 0 },
  { name: 'Party Hat', price: 100 },
  { name: 'Mustache', price: 120 },
  { name: 'Bow', price: 120 },
  { name: 'Pixel Shades', price: 150 },
  { name: 'Propeller Cap', price: 250 },
  { name: 'Cowboy Hat', price: 300 },
  { name: 'Crown', price: 400 },
];

export const FOOD_COLORS = ['#ff4d6d', '#ffd23b', '#39ff88', '#4dc3ff', '#b77bff', '#ff8a3d', '#ff5cf0', '#7bfff0'];
export const MEME_FOODS = 5; // donut, pizza slice, burger, cookie, star

const SEG = 96; // sprite size in px (radius 48)

function mk(size = SEG) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return c;
}

function shadeBall(g: CanvasRenderingContext2D, col: string, size: number) {
  const r = size / 2;
  g.fillStyle = col;
  g.beginPath();
  g.arc(r, r, r - 2, 0, Math.PI * 2);
  g.fill();
  // soft rim shade and a highlight: reads as a round tube from above
  const rim = g.createRadialGradient(r, r, r * 0.55, r, r, r);
  rim.addColorStop(0, 'rgba(0,0,0,0)');
  rim.addColorStop(1, 'rgba(0,0,0,0.38)');
  g.fillStyle = rim;
  g.beginPath();
  g.arc(r, r, r - 2, 0, Math.PI * 2);
  g.fill();
  // thin light rim keeps dark skins readable on the dark arena
  g.strokeStyle = 'rgba(255,255,255,0.28)';
  g.lineWidth = size * 0.035;
  g.beginPath();
  g.arc(r, r, r - 2 - size * 0.02, 0, Math.PI * 2);
  g.stroke();
}

function decorate(g: CanvasRenderingContext2D, s: SkinDef, v: number, size: number) {
  const r = size / 2;
  g.save();
  g.beginPath();
  g.arc(r, r, r - 2, 0, Math.PI * 2);
  g.clip();
  const rnd = mulberry(v * 977 + s.name.length * 31);
  if (s.pattern === 'spots' && s.spot) {
    g.fillStyle = s.spot;
    for (let i = 0; i < 3; i++) {
      g.beginPath();
      g.arc(r + (rnd() - 0.5) * r * 1.1, r + (rnd() - 0.5) * r * 1.1, r * (0.12 + rnd() * 0.12), 0, Math.PI * 2);
      g.fill();
    }
  } else if (s.pattern === 'bumps' && s.spot) {
    g.fillStyle = s.spot;
    for (let i = 0; i < 5; i++) {
      g.beginPath();
      g.arc(r + (rnd() - 0.5) * r * 1.3, r + (rnd() - 0.5) * r * 1.3, r * 0.08, 0, Math.PI * 2);
      g.fill();
    }
  } else if (s.pattern === 'grill') {
    g.strokeStyle = 'rgba(70,25,10,0.55)';
    g.lineWidth = size * 0.07;
    g.beginPath();
    g.moveTo(r * 0.3, r * 0.6);
    g.lineTo(r * 1.7, r * 0.9);
    g.moveTo(r * 0.3, r * 1.15);
    g.lineTo(r * 1.7, r * 1.45);
    g.stroke();
  } else if (s.pattern === 'stars') {
    for (let i = 0; i < 6; i++) {
      g.fillStyle = rnd() < 0.3 ? '#ffe9ff' : '#ffffff';
      g.globalAlpha = 0.5 + rnd() * 0.5;
      g.beginPath();
      g.arc(r + (rnd() - 0.5) * r * 1.5, r + (rnd() - 0.5) * r * 1.5, 1.5 + rnd() * 2.5, 0, Math.PI * 2);
      g.fill();
    }
    g.globalAlpha = 1;
  }
  g.restore();
  // glossy highlight
  const hl = g.createRadialGradient(r * 0.72, r * 0.62, 1, r * 0.72, r * 0.62, r * (s.pattern === 'shine' ? 0.6 : 0.45));
  hl.addColorStop(0, `rgba(255,255,255,${s.pattern === 'shine' ? 0.75 : 0.45})`);
  hl.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = hl;
  g.beginPath();
  g.arc(r, r, r - 2, 0, Math.PI * 2);
  g.fill();
}

function mulberry(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface SkinSprites {
  segs: HTMLCanvasElement[]; // one per colour
  glow: HTMLCanvasElement | null;
}

const cache = new Map<number, SkinSprites>();
export function skinSprites(i: number): SkinSprites {
  let c = cache.get(i);
  if (c) return c;
  const s = SKINS[i % SKINS.length];
  const segs = s.colors.map((col, v) => {
    const cv = mk();
    const g = cv.getContext('2d')!;
    shadeBall(g, col, SEG);
    decorate(g, s, v, SEG);
    return cv;
  });
  let glow: HTMLCanvasElement | null = null;
  if (s.glow) glow = glowSprite(s.glow, 128);
  c = { segs, glow };
  cache.set(i, c);
  return c;
}

/** Colour of segment i (from the head) for a skin */
export const segVariant = (skin: number, i: number) => {
  const s = SKINS[skin % SKINS.length];
  return Math.floor(i / s.stripe) % s.colors.length;
};

const glowCache = new Map<string, HTMLCanvasElement>();
export function glowSprite(col: string, size = 64) {
  const k = col + size;
  let c = glowCache.get(k);
  if (c) return c;
  c = mk(size);
  const g = c.getContext('2d')!;
  const r = size / 2;
  const gr = g.createRadialGradient(r, r, 0, r, r, r);
  gr.addColorStop(0, col);
  gr.addColorStop(0.35, col + 'aa');
  gr.addColorStop(1, col + '00');
  g.fillStyle = gr;
  g.fillRect(0, 0, size, size);
  glowCache.set(k, c);
  return c;
}

/** Food pellets: bright core + glow, one sprite per colour */
const foodCache: HTMLCanvasElement[] = [];
export function foodSprite(color: number) {
  if (foodCache[color]) return foodCache[color];
  const c = mk(48);
  const g = c.getContext('2d')!;
  const col = FOOD_COLORS[color % FOOD_COLORS.length];
  const gr = g.createRadialGradient(24, 24, 0, 24, 24, 24);
  gr.addColorStop(0, '#ffffff');
  gr.addColorStop(0.2, col);
  gr.addColorStop(0.45, col + '88');
  gr.addColorStop(1, col + '00');
  g.fillStyle = gr;
  g.fillRect(0, 0, 48, 48);
  return (foodCache[color] = c);
}

/** Meme food icons, drawn with paths (no emoji) */
const memeCache: HTMLCanvasElement[] = [];
export function memeFoodSprite(i: number) {
  if (memeCache[i]) return memeCache[i];
  const c = mk(64);
  const g = c.getContext('2d')!;
  g.translate(32, 32);
  const glow = g.createRadialGradient(0, 0, 8, 0, 0, 32);
  glow.addColorStop(0, 'rgba(255,255,255,0.35)');
  glow.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = glow;
  g.fillRect(-32, -32, 64, 64);
  g.lineWidth = 2.5;
  g.strokeStyle = '#2a1a10';
  switch (i % MEME_FOODS) {
    case 0: {
      // donut
      g.fillStyle = '#e8a35c';
      circle(g, 0, 0, 18, true, true);
      g.fillStyle = '#ff6fb5';
      circle(g, 0, 0, 14, true, false);
      const sp = ['#fff', '#4dc3ff', '#ffe14d', '#39ff88'];
      for (let k = 0; k < 8; k++) {
        g.fillStyle = sp[k % 4];
        const a = k * 0.8;
        g.fillRect(Math.cos(a) * 10 - 1.5, Math.sin(a) * 10 - 1, 3, 2);
      }
      g.fillStyle = '#1a1235';
      circle(g, 0, 0, 5.5, true, true);
      break;
    }
    case 1: {
      // pizza slice
      g.beginPath();
      g.moveTo(0, 20);
      g.lineTo(-17, -14);
      g.quadraticCurveTo(0, -22, 17, -14);
      g.closePath();
      g.fillStyle = '#ffcf5a';
      g.fill();
      g.stroke();
      g.fillStyle = '#c9822f';
      g.beginPath();
      g.moveTo(-17, -14);
      g.quadraticCurveTo(0, -22, 17, -14);
      g.lineTo(15, -10);
      g.quadraticCurveTo(0, -17, -15, -10);
      g.fill();
      g.fillStyle = '#d63a2a';
      circle(g, -4, -5, 3.5, true, false);
      circle(g, 5, -3, 3.5, true, false);
      circle(g, 0, 7, 3, true, false);
      break;
    }
    case 2: {
      // burger
      g.fillStyle = '#f1a33c';
      g.beginPath();
      g.ellipse(0, -6, 18, 11, 0, Math.PI, 0);
      g.closePath();
      g.fill();
      g.stroke();
      g.fillStyle = '#4fc04a';
      g.fillRect(-19, -6, 38, 4);
      g.fillStyle = '#6b3a1f';
      g.fillRect(-18, -2, 36, 7);
      g.strokeRect(-18, -2, 36, 7);
      g.fillStyle = '#ffd23b';
      g.fillRect(-17, 5, 34, 3);
      g.fillStyle = '#f1a33c';
      g.beginPath();
      g.roundRect(-18, 8, 36, 8, 4);
      g.fill();
      g.stroke();
      g.fillStyle = '#fff6d8';
      for (const [x, y] of [[-8, -11], [0, -14], [8, -10]]) g.fillRect(x, y, 3, 2);
      break;
    }
    case 3: {
      // cookie
      g.fillStyle = '#d9a066';
      circle(g, 0, 0, 18, true, true);
      g.fillStyle = '#4a2a14';
      for (const [x, y] of [[-7, -6], [6, -8], [-2, 4], [8, 6], [-9, 8], [2, -1]]) circle(g, x, y, 2.6, true, false);
      break;
    }
    default: {
      // star
      g.fillStyle = '#ffe14d';
      g.beginPath();
      for (let k = 0; k < 10; k++) {
        const rr = k % 2 ? 8 : 19;
        const a = -Math.PI / 2 + (k * Math.PI) / 5;
        g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      g.closePath();
      g.fill();
      g.stroke();
      g.fillStyle = '#2a1a10';
      circle(g, -4, -2, 1.8, true, false);
      circle(g, 4, -2, 1.8, true, false);
    }
  }
  return (memeCache[i] = c);
}

function circle(g: CanvasRenderingContext2D, x: number, y: number, r: number, fill: boolean, stroke: boolean) {
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  if (fill) g.fill();
  if (stroke) g.stroke();
}

/** Draws an accessory in head space: +x is forward, the head radius is r. */
export function drawHat(g: CanvasRenderingContext2D, hat: number, r: number, t: number) {
  g.lineWidth = Math.max(1.5, r * 0.08);
  g.strokeStyle = '#1b1b25';
  switch (hat) {
    case 1: {
      // party hat on the back of the head, pointing backwards
      g.save();
      g.translate(-r * 0.45, 0);
      g.beginPath();
      g.moveTo(0, -r * 0.55);
      g.lineTo(-r * 1.25, 0);
      g.lineTo(0, r * 0.55);
      g.closePath();
      const gr = g.createLinearGradient(0, -r, 0, r);
      gr.addColorStop(0, '#ff5cf0');
      gr.addColorStop(1, '#4dc3ff');
      g.fillStyle = gr;
      g.fill();
      g.stroke();
      g.fillStyle = '#ffe14d';
      g.beginPath();
      g.arc(-r * 1.3, 0, r * 0.2, 0, Math.PI * 2);
      g.fill();
      g.restore();
      break;
    }
    case 2: {
      // mustache under the eyes
      g.fillStyle = '#2b1a0e';
      for (const sgn of [-1, 1]) {
        g.beginPath();
        g.ellipse(r * 0.86, sgn * r * 0.24, r * 0.13, r * 0.32, sgn * 0.6, 0, Math.PI * 2);
        g.fill();
      }
      break;
    }
    case 3: {
      // bow on top of the head
      g.save();
      g.translate(-r * 0.15, 0);
      g.fillStyle = '#ff3b8d';
      for (const sgn of [-1, 1]) {
        g.beginPath();
        g.moveTo(0, 0);
        g.lineTo(-r * 0.45, sgn * r * 0.55);
        g.lineTo(r * 0.45, sgn * r * 0.55);
        g.closePath();
        g.fill();
        g.stroke();
      }
      g.beginPath();
      g.arc(0, 0, r * 0.17, 0, Math.PI * 2);
      g.fill();
      g.stroke();
      g.restore();
      break;
    }
    case 4: {
      // pixel shades over the eyes
      g.fillStyle = '#0b0b0f';
      const px = r * 0.16;
      const rows = ['XXXXXX XXXXXX', 'XWWXXXXXWWXXX', 'XWXXX   XWXXX', ' XXX     XXX '];
      // drawn rotated: rows run across the head (y), columns along its width
      g.save();
      g.translate(r * 0.42, 0);
      g.rotate(Math.PI / 2);
      const w = rows[0].length * px;
      for (let y = 0; y < rows.length; y++)
        for (let x = 0; x < rows[y].length; x++) {
          const ch = rows[y][x];
          if (ch === ' ') continue;
          g.fillStyle = ch === 'W' ? '#ffffff' : '#0b0b0f';
          g.fillRect(-w / 2 + x * px, -px * 2 + y * px, px + 0.5, px + 0.5);
        }
      g.restore();
      break;
    }
    case 5: {
      // propeller cap: spinning blades
      g.fillStyle = '#ff3b5c';
      g.beginPath();
      g.arc(-r * 0.1, 0, r * 0.55, 0, Math.PI * 2);
      g.fill();
      g.stroke();
      g.fillStyle = '#ffe14d';
      g.beginPath();
      g.arc(-r * 0.1, 0, r * 0.12, 0, Math.PI * 2);
      g.fill();
      g.save();
      g.translate(-r * 0.1, 0);
      g.rotate(t * 18);
      g.fillStyle = '#4dc3ff';
      for (const sgn of [-1, 1]) {
        g.beginPath();
        g.ellipse(sgn * r * 0.45, 0, r * 0.4, r * 0.12, 0, 0, Math.PI * 2);
        g.fill();
      }
      g.restore();
      break;
    }
    case 6: {
      // cowboy hat
      g.fillStyle = '#9a5b2b';
      g.beginPath();
      g.ellipse(-r * 0.2, 0, r * 0.75, r * 1.05, 0, 0, Math.PI * 2);
      g.fill();
      g.stroke();
      g.fillStyle = '#7a4520';
      g.beginPath();
      g.ellipse(-r * 0.2, 0, r * 0.42, r * 0.55, 0, 0, Math.PI * 2);
      g.fill();
      g.stroke();
      g.fillStyle = '#2b1a0e';
      g.fillRect(-r * 0.26, -r * 0.56, r * 0.12, r * 1.12);
      break;
    }
    case 7: {
      // crown, sitting on the back of the head behind the eyes
      g.save();
      g.translate(-r * 0.62, 0);
      g.rotate(-Math.PI / 2);
      g.fillStyle = '#ffd23b';
      const w = r * 1.1;
      g.beginPath();
      g.moveTo(-w / 2, r * 0.25);
      g.lineTo(-w / 2, -r * 0.3);
      g.lineTo(-w / 4, 0);
      g.lineTo(0, -r * 0.45);
      g.lineTo(w / 4, 0);
      g.lineTo(w / 2, -r * 0.3);
      g.lineTo(w / 2, r * 0.25);
      g.closePath();
      g.fill();
      g.stroke();
      g.fillStyle = '#ff3b5c';
      g.beginPath();
      g.arc(0, r * 0.05, r * 0.09, 0, Math.PI * 2);
      g.fill();
      g.restore();
      break;
    }
  }
}
