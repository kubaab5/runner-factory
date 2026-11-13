/* Store art drawn with the game's own meme renderer. Dev-only entry (cover.html). */
import './style.css';
import { drawMeme } from './game/tiers';

const kind = new URLSearchParams(location.search).get('kind') ?? 'square';
const W = innerWidth;
const H = innerHeight;
const c = document.getElementById('cv') as HTMLCanvasElement;
c.width = W;
c.height = H;
const g = c.getContext('2d')!;
const bg = g.createLinearGradient(0, 0, 0, H);
bg.addColorStop(0, '#3b1d6e');
bg.addColorStop(1, '#ff6fa8');
g.fillStyle = bg;
g.fillRect(0, 0, W, H);
// soft rays behind the boss
g.save();
g.translate(W / 2, H * 0.62);
for (let i = 0; i < 16; i++) {
  g.rotate((Math.PI * 2) / 16);
  g.fillStyle = i % 2 ? 'rgba(255,255,255,0.06)' : 'rgba(255,230,120,0.08)';
  g.beginPath();
  g.moveTo(0, 0);
  g.lineTo(-Math.max(W, H) * 0.12, -Math.max(W, H));
  g.lineTo(Math.max(W, H) * 0.12, -Math.max(W, H));
  g.fill();
}
g.restore();
const u = (Math.min(W, H) / 800) * (H > W * 1.5 ? 1 : 0.74);
const tall = H > W * 1.5;
const wide = W > H * 1.3;
const cx = W / 2;
const base = H - (kind === 'poster' ? 260 : 30) * u;
const face = (happy = true) => ({ lx: 0, ly: 0.2, blink: false, scared: false, happy });
// a pile: big memes at the bottom, small on top, the Final Boss in the middle
const pile: Array<[number, number, number, number]> = [
  // tier, x offset, y offset from base, radius scale
  [8, -250, -95, 1], [7, 230, -85, 1], [6, -60, -75, 1], [5, 110, -200, 1], [4, -230, -260, 1], [3, 300, -230, 1],
  [2, -320, -95, 1.1], [3, 360, -70, 1], [1, -150, -330, 1], [0, 30, -300, 1.2], [2, 250, -330, 1],
];
const R = (t: number) => [15, 21, 29, 36, 45, 55, 66, 78, 91, 106, 124][t] * u * 1.45;
const spread = wide ? 2.1 : 1.15;
for (const [t, x, y] of pile) drawMeme(g, t, cx + x * u * spread, base + y * u * (tall ? 1.2 : 1), R(t), (x % 7) * 0.02, face(t > 4), 1);
drawMeme(g, 10, cx, base - (tall ? 560 : 430) * u, R(10) * 1.25, -0.08, face(true), 1);
drawMeme(g, 9, cx + (wide ? 560 : 330) * u, base - (tall ? 600 : 470) * u, R(9) * 0.8, 0.1, face(true), 1);
const logo = document.getElementById('logo')!;
logo.style.top = tall ? '9%' : '4%';
(logo.querySelector('.l1') as HTMLElement).style.fontSize = `${Math.round(Math.min(W, H) * (tall ? 0.17 : 0.12))}px`;
(logo.querySelector('.l2') as HTMLElement).style.fontSize = `${Math.round(Math.min(W, H) * (tall ? 0.2 : 0.145))}px`;
if (kind === 'poster') {
  const tag = document.getElementById('tag')!;
  Object.assign(tag.style, { padding: '24px 20px 34px', background: 'linear-gradient(transparent, rgba(30,10,60,0.92) 35%)', fontSize: '52px' });
  tag.innerHTML = 'Drop. Merge. Become the Final Boss.<div style="font-size:40px;color:#7dffb0;margin-top:10px">PLAY FREE &#9654; playgama.ai</div>';
}
Promise.allSettled([document.fonts.load('900 54px Nunito')]).then(() => document.fonts.ready).then(() => ((window as unknown as { coverReady: boolean }).coverReady = true));
