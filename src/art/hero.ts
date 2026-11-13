/** Parametric cartoon runner in a 200×260 box, feet at the bottom centre.
 *  `pose` (-1…1) swings legs and arms for the run cycle; `kind` swaps the human torso+head
 *  for an absurd walking object (banana, pickle, dumpling, toast). */
export type HeroKind = 'human' | 'banana' | 'pickle' | 'dumpling' | 'toast';

export interface Body {
  kind?: HeroKind;
  shoulder: number; // half-width of the torso at the shoulders, px
  waist: number; // half-width at the waist
  belly?: number; // extra belly bulge
  arm: number; // arm thickness
  biceps?: number; // biceps bulge radius
  flex?: boolean; // arms up, flexing
  skin: string;
  shirt: string;
  pants: string;
  hair: string;
  face: 'meh' | 'smile' | 'smug' | 'angry' | 'wow';
  shades?: boolean;
  glow?: { color: string; r: number; a: number };
  headband?: string;
  crown?: boolean;
  halo?: boolean;
  /** extra SVG drawn on top */
  extra?: string;
  /** run-cycle phase: -1 left leg forward, 0 passing, 1 right leg forward */
  pose?: number;
}

const INK = '#22344D';

function face(b: Body, cx: number, ey: number) {
  const parts: string[] = [];
  if (b.shades) {
    parts.push(`<path d="M${cx - 30} ${ey - 8} H${cx + 30} V${ey} Q${cx + 28} ${ey + 12} ${cx + 12} ${ey + 10} Q${cx + 4} ${ey + 8} ${cx + 2} ${ey} H${cx - 2} Q${cx - 4} ${ey + 8} ${cx - 12} ${ey + 10} Q${cx - 28} ${ey + 12} ${cx - 30} ${ey} Z" fill="#111"/><path d="M${cx - 24} ${ey - 4} L${cx - 16} ${ey - 4}" stroke="#fff" stroke-width="3" opacity="0.7"/>`);
  } else {
    const lid = b.face === 'meh' ? `<path d="M${cx - 20} ${ey - 4} H${cx - 6} M${cx + 6} ${ey - 4} H${cx + 20}" stroke="${INK}" stroke-width="4"/>` : '';
    const er = b.face === 'wow' ? 8 : 6;
    parts.push(`<circle cx="${cx - 13}" cy="${ey}" r="${er + 4}" fill="#fff" stroke="${INK}" stroke-width="3"/><circle cx="${cx + 13}" cy="${ey}" r="${er + 4}" fill="#fff" stroke="${INK}" stroke-width="3"/><circle cx="${cx - 12}" cy="${ey + 1}" r="${er - 1}" fill="${INK}"/><circle cx="${cx + 14}" cy="${ey + 1}" r="${er - 1}" fill="${INK}"/>${lid}`);
    if (b.face === 'angry') parts.push(`<path d="M${cx - 26} ${ey - 16} L${cx - 6} ${ey - 9} M${cx + 26} ${ey - 16} L${cx + 6} ${ey - 9}" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>`);
  }
  const my = ey + 20;
  parts.push(
    {
      meh: `<path d="M${cx - 10} ${my} H${cx + 10}" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`,
      smile: `<path d="M${cx - 13} ${my - 3} Q${cx} ${my + 11} ${cx + 13} ${my - 3}" stroke="${INK}" stroke-width="4" fill="#B5414F" stroke-linecap="round"/>`,
      smug: `<path d="M${cx - 12} ${my + 1} Q${cx + 2} ${my + 4} ${cx + 14} ${my - 6}" stroke="${INK}" stroke-width="4" fill="none" stroke-linecap="round"/>`,
      angry: `<path d="M${cx - 13} ${my + 4} Q${cx} ${my - 6} ${cx + 13} ${my + 4}" stroke="${INK}" stroke-width="4" fill="none" stroke-linecap="round"/>`,
      wow: `<ellipse cx="${cx}" cy="${my + 1}" rx="7" ry="9" fill="${INK}"/>`,
    }[b.face],
  );
  return parts.join('');
}

function topGear(b: Body, cx: number, topY: number) {
  const p: string[] = [];
  if (b.headband) p.push(`<rect x="${cx - 37}" y="${topY + 16}" width="74" height="12" rx="5" fill="${b.headband}" stroke="${INK}" stroke-width="3"/>`);
  if (b.crown) p.push(`<path d="M${cx - 26} ${topY + 4} L${cx - 30} ${topY - 24} L${cx - 13} ${topY - 8} L${cx} ${topY - 30} L${cx + 13} ${topY - 8} L${cx + 30} ${topY - 24} L${cx + 26} ${topY + 4} Z" fill="#FFD166" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>`);
  if (b.halo) p.push(`<ellipse cx="${cx}" cy="${topY - 14}" rx="30" ry="8" fill="none" stroke="#FFE66D" stroke-width="7"/>`);
  return p.join('');
}

/** Limbs shared by every body kind. Legs pivot at the hip, arms at the shoulder, opposite phase. */
function legs(b: Body, cx: number, hip: number, halfGap: number, legW: number) {
  const pose = b.pose ?? 0;
  return ([-1, 1] as const)
    .map((s) => {
      const hx = cx + s * halfGap;
      const ang = pose * 26 * s;
      const lift = Math.max(0, pose * s) * 6;
      return `<g transform="rotate(${ang} ${hx} ${hip}) translate(0 ${-lift})"><rect x="${hx - legW / 2}" y="${hip - 6}" width="${legW}" height="${252 - hip + 4}" rx="${legW / 2.4}" fill="${b.pants}" stroke="${INK}" stroke-width="4"/><ellipse cx="${hx + 4}" cy="252" rx="${legW / 2 + 6}" ry="7" fill="${INK}"/></g>`;
    })
    .join('');
}

function arms(b: Body, cx: number, shY: number, sh: number, handY: number) {
  const pose = b.pose ?? 0;
  return ([-1, 1] as const)
    .map((s) => {
      const sx = cx + s * (sh - b.arm * 0.3);
      if (b.flex) {
        const ex = cx + s * (sh + 34);
        const ey = shY + 8;
        const hx = cx + s * (sh + 22);
        const hy = shY - 44 + Math.abs(pose) * 6;
        return `<path d="M${sx} ${shY} L${ex} ${ey} L${hx} ${hy}" stroke="${INK}" stroke-width="${b.arm + 8}" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M${sx} ${shY} L${ex} ${ey} L${hx} ${hy}" stroke="${b.skin}" stroke-width="${b.arm}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>${b.biceps ? `<circle cx="${(sx + ex) / 2 + s * 2}" cy="${shY - b.biceps * 0.4}" r="${b.biceps}" fill="${b.skin}" stroke="${INK}" stroke-width="4"/>` : ''}<circle cx="${hx}" cy="${hy}" r="${b.arm * 0.62 + 3}" fill="${b.skin}" stroke="${INK}" stroke-width="4"/>`;
      }
      const ang = -(b.pose ?? 0) * 34 * s;
      const hx = cx + s * (sh + 6);
      return `<g transform="rotate(${ang} ${sx} ${shY})"><path d="M${sx} ${shY} L${hx} ${handY}" stroke="${INK}" stroke-width="${b.arm + 8}" stroke-linecap="round"/><path d="M${sx} ${shY} L${hx} ${handY}" stroke="${b.skin}" stroke-width="${b.arm}" stroke-linecap="round"/>${b.biceps ? `<ellipse cx="${sx * 0.6 + hx * 0.4 + s * 3}" cy="${shY + 26}" rx="${b.biceps}" ry="${b.biceps * 1.2}" fill="${b.skin}" stroke="${INK}" stroke-width="4"/>` : ''}<circle cx="${hx}" cy="${handY}" r="${b.arm * 0.62 + 3}" fill="${b.skin}" stroke="${INK}" stroke-width="4"/></g>`;
    })
    .join('');
}

function glowDefs(b: Body, cx: number) {
  if (!b.glow) return '';
  return `<defs><radialGradient id="gl"><stop offset="0" stop-color="${b.glow.color}" stop-opacity="${b.glow.a}"/><stop offset="1" stop-color="${b.glow.color}" stop-opacity="0"/></radialGradient></defs><ellipse cx="${cx}" cy="140" rx="${b.glow.r}" ry="${b.glow.r * 1.2}" fill="url(#gl)"/>`;
}

export function humanSvg(b: Body): string {
  const kind = b.kind ?? 'human';
  if (kind !== 'human') return objectSvg(b, kind);
  const cx = 100;
  const top = 108;
  const hip = 196;
  const sh = b.shoulder;
  const ws = b.waist;
  const p: string[] = [glowDefs(b, cx)];
  p.push(`<ellipse cx="${cx}" cy="252" rx="${Math.max(34, sh + 4)}" ry="7" fill="#000" opacity="0.18"/>`);
  const legW = Math.max(16, ws * 0.62);
  p.push(legs(b, cx, hip, ws - legW / 2 - 2, legW));
  p.push(arms(b, cx, top + 14, sh, hip + 4));
  const bel = b.belly ?? 0;
  p.push(`<path d="M${cx - sh} ${top + 10} Q${cx - sh} ${top} ${cx - sh + 14} ${top} L${cx + sh - 14} ${top} Q${cx + sh} ${top} ${cx + sh} ${top + 10} L${cx + ws + bel} ${hip - 22} Q${cx + ws + bel} ${hip} ${cx + ws - 8} ${hip} L${cx - ws + 8} ${hip} Q${cx - ws - bel} ${hip} ${cx - ws - bel} ${hip - 22} Z" fill="${b.shirt}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>`);
  const hy = 70;
  p.push(`<rect x="${cx - 9}" y="${hy + 24}" width="18" height="18" fill="${b.skin}" stroke="${INK}" stroke-width="4"/>`);
  p.push(`<circle cx="${cx}" cy="${hy}" r="36" fill="${b.skin}" stroke="${INK}" stroke-width="4"/>`);
  p.push(`<path d="M${cx - 36} ${hy - 4} Q${cx - 34} ${hy - 44} ${cx} ${hy - 40} Q${cx + 36} ${hy - 44} ${cx + 36} ${hy - 4} Q${cx + 20} ${hy - 22} ${cx - 4} ${hy - 20} Q${cx - 22} ${hy - 20} ${cx - 36} ${hy - 4} Z" fill="${b.hair}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>`);
  p.push(face(b, cx, hy + 4));
  p.push(topGear(b, cx, hy - 36));
  if (b.extra) p.push(b.extra);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 260">${p.join('')}</svg>`;
}

/** Walking food: the body IS the head. Legs and arms come from the same rig as the human. */
function objectSvg(b: Body, kind: Exclude<HeroKind, 'human'>): string {
  const cx = 100;
  const hip = 198;
  const p: string[] = [glowDefs(b, cx)];
  p.push(`<ellipse cx="${cx}" cy="252" rx="46" ry="7" fill="#000" opacity="0.18"/>`);
  const limb: Body = { ...b, skin: b.skin, pants: b.pants };
  p.push(legs(limb, cx, hip, 18, 14));
  let body = '';
  let faceY = 120;
  let topY = 40;
  let shY = 140;
  let sh = 46;
  switch (kind) {
    case 'banana':
      body = `<path d="M70 30 Q46 120 82 196 Q120 214 150 190 Q104 160 98 34 Z" fill="#FFD84D" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/><path d="M70 30 L66 14 L82 18 Z" fill="#7A5A2E" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/><path d="M84 60 Q76 120 96 176" stroke="#E6B82E" stroke-width="5" fill="none" stroke-linecap="round"/>`;
      faceY = 112;
      topY = 22;
      shY = 136;
      sh = 30;
      break;
    case 'pickle':
      body = `<rect x="58" y="34" width="84" height="168" rx="42" fill="#7CC04B" stroke="${INK}" stroke-width="5"/>${[60, 96, 132, 168].map((y, i) => `<circle cx="${i % 2 ? 128 : 72}" cy="${y}" r="5" fill="#5A9E33"/>`).join('')}<path d="M86 34 Q100 22 114 34" stroke="#5A9E33" stroke-width="5" fill="none"/>`;
      faceY = 96;
      topY = 30;
      shY = 128;
      sh = 40;
      break;
    case 'dumpling':
      body = `<path d="M30 192 Q22 92 100 70 Q178 92 170 192 Q100 210 30 192 Z" fill="#F6EBD9" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>${[52, 76, 100, 124, 148].map((x) => `<path d="M${x} ${x < 100 ? 96 - (100 - x) * 0.25 : 96 - (x - 100) * 0.25} q4 -16 10 0" stroke="#D9C7A9" stroke-width="4" fill="none" stroke-linecap="round"/>`).join('')}`;
      faceY = 140;
      topY = 66;
      shY = 156;
      sh = 64;
      break;
    case 'toast':
      body = `<path d="M44 196 V86 Q30 84 30 64 Q30 34 100 34 Q170 34 170 64 Q170 84 156 86 V196 Z" fill="#C9874A" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/><path d="M58 186 V90 Q46 86 46 68 Q46 48 100 48 Q154 48 154 68 Q154 86 142 90 V186 Z" fill="#F4D59B"/>`;
      faceY = 110;
      topY = 30;
      shY = 140;
      sh = 56;
      break;
  }
  p.push(arms(limb, cx, shY, sh, shY + 52));
  p.push(body);
  p.push(face(b, cx, faceY));
  p.push(topGear(b, cx, topY));
  if (b.extra) p.push(b.extra);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 260">${p.join('')}</svg>`;
}

export const wrap = (inner: string, vb = '0 0 100 100') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}">${inner}</svg>`;
