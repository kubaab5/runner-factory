/* Store art: a staged arena drawn with the real renderer, logo on top. Dev-only entry (cover.html). */
import './style.css';
import { Renderer } from './game/render';
import { Snake, World } from './game/world';

const q = new URLSearchParams(location.search);
const kind = q.get('kind') ?? 'square';
const W = innerWidth;
const H = innerHeight;
const world = new World({ bots: 0, botNames: ['x'], skins: 15, foodColors: 8, memeFoods: 5, hats: 8, rand: mul(42) });
for (const f of world.foods) f.born = -10;
world.time = 5;

function mul(seed: number) {
  let s = seed;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** a snake laid along a wavy path ending at (hx, hy) heading `ang` */
function pose(skin: number, hat: number, mass: number, hx: number, hy: number, ang: number, wav: number, phase: number) {
  const s = new Snake(0, '', skin, true, hx, hy, mass, 0, ang);
  s.hat = hat;
  const d = s.r * 0.52;
  let x = hx;
  let y = hy;
  let a = ang + Math.PI;
  for (let i = 0; i < s.segs.length; i++) {
    s.segs[i] = { x, y };
    a += Math.sin(i * 0.09 + phase) * wav;
    x += Math.cos(a) * d;
    y += Math.sin(a) * d;
  }
  s.id = Math.floor(Math.random() * 1e6);
  s.target = ang + 0.5;
  world.snakes.push(s);
  return s;
}

// cast, placed in screen fractions so every aspect ratio gets a full frame
const tall = H > W * 1.2;
const wide = W > H * 1.3;
const sc = Math.min(W, H) / 800;
const zoom = 2.0 * sc;
const camY = 0;
const at = (fx: number, fy: number): [number, number] => [(fx - 0.5) * W / zoom, (fy - 0.5) * H / zoom + camY];
const cast: Array<[number, number, number, number, number, number, number, number]> = [
  // skin, hat, mass, fx, fy, heading, wave, phase
  [13, 7, 2400, 0.6, tall ? 0.58 : 0.64, -0.35, 0.05, 0.6], // Aura + crown
  [14, 4, 1500, 0.2, tall ? 0.78 : 0.86, -1.25, 0.06, 1.2], // Gold Drip + shades
  [2, 0, 700, 0.86, tall ? 0.3 : 0.36, 2.75, 0.07, 2.2], // NPC
  [3, 1, 800, wide ? 0.1 : 0.14, tall ? 0.38 : 0.45, 0.25, 0.06, 3.1], // Sausage + party hat
  [9, 5, 700, 0.47, tall ? 0.9 : 0.97, -0.9, 0.08, 0.2], // Rainbow + propeller
  [6, 2, 600, 0.88, tall ? 0.72 : 0.84, -2.3, 0.08, 1.7], // Banana + mustache
];
let hero: [number, number] = [0, 0];
cast.forEach(([skin, hat, mass, fx, fy, ang, wav, ph], i) => {
  const [x, y] = at(fx, fy);
  if (i === 0) hero = [x, y];
  pose(skin, hat, mass, x, y, ang, wav, ph);
});
for (let i = 0; i < 10; i++) {
  const [x, y] = at(0.08 + Math.random() * 0.84, 0.3 + Math.random() * 0.65);
  world.spawnFood(x, y, 8, 0, i % 5).born = -10;
}

const r = new Renderer(document.getElementById('cv') as HTMLCanvasElement);
r.resize();
const cam = { x: 0, y: camY, zoom, shake: 0 };
r.floats.push({ x: hero[0] - 40 / zoom, y: hero[1] - 70 / zoom, text: '+1000 AURA', color: '#39ff88', born: 4.9, size: 44 * sc });

const logo = document.getElementById('logo')!;
Object.assign(logo.style, { position: 'fixed', left: '0', right: '0', top: tall ? '7%' : wide ? '6%' : '5%', fontSize: '1px' });
for (const el of logo.querySelectorAll('span')) (el as HTMLElement).style.animation = 'none';
(logo.querySelector('.l1') as HTMLElement).style.fontSize = `${Math.round(Math.min(W, H) * (tall ? 0.17 : 0.13))}px`;
(logo.querySelector('.l2') as HTMLElement).style.fontSize = `${Math.round(Math.min(W, H) * (tall ? 0.2 : 0.155))}px`;
const tag = document.getElementById('tag')!;
if (kind === 'poster') {
  Object.assign(tag.style, { position: 'fixed', left: '0', right: '0', bottom: '0', padding: '28px 20px 34px', textAlign: 'center', background: 'linear-gradient(transparent, rgba(10,8,20,0.95) 35%)', fontFamily: 'Nunito, sans-serif', fontWeight: '900', fontSize: '54px', color: '#fff' });
  tag.innerHTML = 'Eat. Grow. Cook the NPCs.<div style="font-size:40px;color:#39ff88;margin-top:10px">PLAY FREE &#9654; playgama.ai</div>';
}
Promise.allSettled([document.fonts.load('900 54px Nunito'), document.fonts.load('800 20px Nunito')]).then(() => document.fonts.ready).then(() => {
  r.draw(world, cam, null, 5, false);
  (window as unknown as { coverReady: boolean }).coverReady = true;
});
