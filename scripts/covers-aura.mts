import { writeFileSync } from 'node:fs';
const src = process.argv[2];
const { aura } = await import(`${src}/games/aura.ts`);
const inner = (svg: string) => svg.replace(/^\s*<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
const s = aura.skins;
const hero = (t: number, k: number, pose: number) => inner(aura.hero(t, s[k], pose));
const boss = inner(aura.boss.svg);
const sparkle = inner(aura.pickup.svg);
function scene(w: number, h: number) {
  const hor = Math.round(h * 0.42);
  const cx = w / 2;
  const gateW = Math.min(w * 0.36, 380), gateH = gateW * 1.15;
  const gate = (x: number, y: number, good: boolean, text: string, sc = 1) => `<g transform="translate(${x},${y}) scale(${sc})"><rect x="${-gateW / 2}" y="${-gateH}" width="${gateW}" height="${gateH}" rx="22" fill="${good ? '#3ED6A0' : '#FF4F6D'}" fill-opacity="0.45" stroke="${good ? '#3ED6A0' : '#FF4F6D'}" stroke-width="12"/><text x="0" y="${-gateH / 2 + gateW * 0.13}" text-anchor="middle" font-family="Nunito" font-weight="900" font-size="${gateW * 0.36}" fill="#fff" stroke="${good ? '#0B5B40' : '#7A0016'}" stroke-width="${gateW * 0.04}" paint-order="stroke">${text}</text></g>`;
  const stars = Array.from({ length: Math.round(w / 14) }, (_, i) => `<circle cx="${(i * 173) % w}" cy="${30 + ((i * 97) % (hor - 60))}" r="${1.5 + (i % 3)}" fill="#fff" opacity="${0.35 + ((i * 37) % 60) / 100}"/>`).join('');
  const roadTop = w * 0.03, roadBot = Math.min(w * 0.95, (h - hor) * 1.25);
  const big = Math.min(w, h);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2B1E5C"/><stop offset="1" stop-color="#B76CFF"/></linearGradient>
  <radialGradient id="aur"><stop offset="0" stop-color="#FFF4A3" stop-opacity="0.95"/><stop offset="1" stop-color="#FFD23F" stop-opacity="0"/></radialGradient></defs>
  <rect width="${w}" height="${h}" fill="url(#sky)"/>${stars}
  <rect y="${hor}" width="${w}" height="${h - hor}" fill="#3B2B78"/>
  <path d="M${cx - roadTop} ${hor} L${cx + roadTop} ${hor} L${cx + roadBot} ${h} L${cx - roadBot} ${h} Z" fill="#5A4AA8"/>
  <path d="M${cx - roadTop} ${hor} L${cx - roadBot} ${h} M${cx + roadTop} ${hor} L${cx + roadBot} ${h}" stroke="#FF4FD8" stroke-width="${w * 0.02}"/>
  ${gate(cx - roadBot * 0.22, hor + (h - hor) * 0.38, true, '×2', 0.55)}${gate(cx + roadBot * 0.22, hor + (h - hor) * 0.38, false, '−500', 0.55)}
  <g transform="translate(${cx + big * 0.18},${hor - big * 0.02}) scale(${big * 0.0011})">${boss}</g>
  <ellipse cx="${cx - big * 0.12}" cy="${h - big * 0.45}" rx="${big * 0.38}" ry="${big * 0.42}" fill="url(#aur)"/>
  <g transform="translate(${cx - big * 0.12 - big * 0.27},${h - big * 0.72 - big * 0.02}) scale(${big * 0.0027})">${hero(5, 0, 1)}</g>
  <g transform="translate(${cx + big * 0.2},${h - big * 0.44}) scale(${big * 0.0016})">${hero(3, 2, -1)}</g>
  ${[0.12, 0.2, 0.82, 0.9].map((f, i) => `<g transform="translate(${w * f - 30},${hor + (h - hor) * (0.2 + i * 0.12)}) scale(0.6)">${sparkle}</g>`).join('')}
  <text x="${cx}" y="${Math.max(big * 0.16, hor * 0.42)}" text-anchor="middle" font-family="Nunito" font-weight="900" font-size="${big * 0.15}" fill="#fff" stroke="#22344D" stroke-width="${big * 0.022}" paint-order="stroke">Aura Run</text>
  </svg>`;
}

const band = (w: number, h: number) => `<rect x="0" y="${h - 190}" width="${w}" height="190" fill="#2B1E5C" opacity="0.92"/><text x="${w / 2}" y="${h - 118}" text-anchor="middle" font-family="Nunito" font-weight="900" font-size="54" fill="#fff">Farm aura. Beat the NPC boss.</text><rect x="${w / 2 - 300}" y="${h - 92}" width="600" height="68" rx="34" fill="#FFD23F"/><text x="${w / 2}" y="${h - 45}" text-anchor="middle" font-family="Nunito" font-weight="900" font-size="38" fill="#2B1E5C">PLAY FREE ▶ playgama.ai</text>`;
for (const [n, w, h] of [['square', 800, 800], ['portrait', 1080, 1920], ['landscape', 1920, 1080], ['poster', 1080, 1350]] as const) writeFileSync(`/tmp/covers/${n}.html`, `<html><head><link rel="stylesheet" href="file:///home/claude/runner-factory/node_modules/@fontsource/nunito/900.css"></head><body style="margin:0">${n === 'poster' ? scene(w, h).replace(/<\/svg>\s*$/, band(w, h) + '</svg>') : scene(w, h)}</body></html>`);
