/** Parametric cartoon person in a 200×260 box, feet at the bottom centre. Every game skins it differently. */
export interface Body {
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
  scaleY?: number;
}

export function humanSvg(b: Body): string {
  const cx = 100;
  const top = 108;
  const hip = 196;
  const sh = b.shoulder;
  const ws = b.waist;
  const ink = '#22344D';
  const parts: string[] = [];
  if (b.glow) {
    parts.push(`<defs><radialGradient id="gl"><stop offset="0" stop-color="${b.glow.color}" stop-opacity="${b.glow.a}"/><stop offset="1" stop-color="${b.glow.color}" stop-opacity="0"/></radialGradient></defs>`);
    parts.push(`<ellipse cx="${cx}" cy="140" rx="${b.glow.r}" ry="${b.glow.r * 1.2}" fill="url(#gl)"/>`);
  }
  parts.push(`<ellipse cx="${cx}" cy="252" rx="${Math.max(34, sh + 4)}" ry="7" fill="#000" opacity="0.18"/>`);
  // legs
  const legW = Math.max(16, ws * 0.62);
  parts.push(`<rect x="${cx - ws + 2}" y="${hip - 6}" width="${legW}" height="${252 - hip + 4}" rx="${legW / 2.4}" fill="${b.pants}" stroke="${ink}" stroke-width="4"/>`);
  parts.push(`<rect x="${cx + ws - 2 - legW}" y="${hip - 6}" width="${legW}" height="${252 - hip + 4}" rx="${legW / 2.4}" fill="${b.pants}" stroke="${ink}" stroke-width="4"/>`);
  parts.push(`<ellipse cx="${cx - ws + 2 + legW / 2}" cy="252" rx="${legW / 2 + 5}" ry="7" fill="${ink}"/><ellipse cx="${cx + ws - 2 - legW / 2}" cy="252" rx="${legW / 2 + 5}" ry="7" fill="${ink}"/>`);
  // arms (behind torso edges)
  const arm = (side: -1 | 1) => {
    const sx = cx + side * (sh - b.arm * 0.3);
    const sy = top + 14;
    if (b.flex) {
      const ex = cx + side * (sh + 34);
      const ey = sy + 8;
      const hx = cx + side * (sh + 22);
      const hy = sy - 44;
      return `<path d="M${sx} ${sy} L${ex} ${ey} L${hx} ${hy}" stroke="${ink}" stroke-width="${b.arm + 8}" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M${sx} ${sy} L${ex} ${ey} L${hx} ${hy}" stroke="${b.skin}" stroke-width="${b.arm}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>${b.biceps ? `<circle cx="${(sx + ex) / 2 + side * 2}" cy="${sy - b.biceps * 0.4}" r="${b.biceps}" fill="${b.skin}" stroke="${ink}" stroke-width="4"/>` : ''}<circle cx="${hx}" cy="${hy}" r="${b.arm * 0.62 + 3}" fill="${b.skin}" stroke="${ink}" stroke-width="4"/>`;
    }
    const hx = cx + side * (sh + 6);
    const hy = hip + 4;
    return `<path d="M${sx} ${sy} L${hx} ${hy}" stroke="${ink}" stroke-width="${b.arm + 8}" stroke-linecap="round"/><path d="M${sx} ${sy} L${hx} ${hy}" stroke="${b.skin}" stroke-width="${b.arm}" stroke-linecap="round"/>${b.biceps ? `<ellipse cx="${(sx * 0.6 + hx * 0.4) + side * 3}" cy="${sy + 26}" rx="${b.biceps}" ry="${b.biceps * 1.2}" fill="${b.skin}" stroke="${ink}" stroke-width="4"/>` : ''}<circle cx="${hx}" cy="${hy}" r="${b.arm * 0.62 + 3}" fill="${b.skin}" stroke="${ink}" stroke-width="4"/>`;
  };
  parts.push(arm(-1), arm(1));
  // torso
  const bel = b.belly ?? 0;
  parts.push(
    `<path d="M${cx - sh} ${top + 10} Q${cx - sh} ${top} ${cx - sh + 14} ${top} L${cx + sh - 14} ${top} Q${cx + sh} ${top} ${cx + sh} ${top + 10} L${cx + ws + bel} ${hip - 22} Q${cx + ws + bel} ${hip} ${cx + ws - 8} ${hip} L${cx - ws + 8} ${hip} Q${cx - ws - bel} ${hip} ${cx - ws - bel} ${hip - 22} Z" fill="${b.shirt}" stroke="${ink}" stroke-width="4" stroke-linejoin="round"/>`,
  );
  // head
  const hy = 70;
  parts.push(`<rect x="${cx - 9}" y="${hy + 24}" width="18" height="18" fill="${b.skin}" stroke="${ink}" stroke-width="4"/>`);
  parts.push(`<circle cx="${cx}" cy="${hy}" r="36" fill="${b.skin}" stroke="${ink}" stroke-width="4"/>`);
  parts.push(`<path d="M${cx - 36} ${hy - 4} Q${cx - 34} ${hy - 44} ${cx} ${hy - 40} Q${cx + 36} ${hy - 44} ${cx + 36} ${hy - 4} Q${cx + 20} ${hy - 22} ${cx - 4} ${hy - 20} Q${cx - 22} ${hy - 20} ${cx - 36} ${hy - 4} Z" fill="${b.hair}" stroke="${ink}" stroke-width="4" stroke-linejoin="round"/>`);
  if (b.headband) parts.push(`<rect x="${cx - 37}" y="${hy - 20}" width="74" height="12" rx="5" fill="${b.headband}" stroke="${ink}" stroke-width="3"/>`);
  // face
  const ey = hy + 4;
  if (b.shades) {
    parts.push(`<path d="M${cx - 30} ${ey - 8} H${cx + 30} V${ey} Q${cx + 28} ${ey + 12} ${cx + 12} ${ey + 10} Q${cx + 4} ${ey + 8} ${cx + 2} ${ey} H${cx - 2} Q${cx - 4} ${ey + 8} ${cx - 12} ${ey + 10} Q${cx - 28} ${ey + 12} ${cx - 30} ${ey} Z" fill="#111"/><path d="M${cx - 24} ${ey - 4} L${cx - 16} ${ey - 4}" stroke="#fff" stroke-width="3" opacity="0.7"/>`);
  } else {
    const lid = b.face === 'meh' ? `<path d="M${cx - 20} ${ey - 4} H${cx - 6} M${cx + 6} ${ey - 4} H${cx + 20}" stroke="${ink}" stroke-width="4"/>` : '';
    const er = b.face === 'wow' ? 8 : 6;
    parts.push(`<circle cx="${cx - 13}" cy="${ey}" r="${er}" fill="${ink}"/><circle cx="${cx + 13}" cy="${ey}" r="${er}" fill="${ink}"/><circle cx="${cx - 11}" cy="${ey - 2}" r="2" fill="#fff"/><circle cx="${cx + 15}" cy="${ey - 2}" r="2" fill="#fff"/>${lid}`);
    if (b.face === 'angry') parts.push(`<path d="M${cx - 24} ${ey - 14} L${cx - 6} ${ey - 8} M${cx + 24} ${ey - 14} L${cx + 6} ${ey - 8}" stroke="${ink}" stroke-width="5" stroke-linecap="round"/>`);
  }
  const my = hy + 22;
  const mouth = {
    meh: `<path d="M${cx - 10} ${my} H${cx + 10}" stroke="${ink}" stroke-width="4" stroke-linecap="round"/>`,
    smile: `<path d="M${cx - 13} ${my - 3} Q${cx} ${my + 10} ${cx + 13} ${my - 3}" stroke="${ink}" stroke-width="4" fill="none" stroke-linecap="round"/>`,
    smug: `<path d="M${cx - 12} ${my + 1} Q${cx + 2} ${my + 4} ${cx + 14} ${my - 6}" stroke="${ink}" stroke-width="4" fill="none" stroke-linecap="round"/>`,
    angry: `<path d="M${cx - 13} ${my + 4} Q${cx} ${my - 6} ${cx + 13} ${my + 4}" stroke="${ink}" stroke-width="4" fill="none" stroke-linecap="round"/>`,
    wow: `<ellipse cx="${cx}" cy="${my + 1}" rx="7" ry="9" fill="${ink}"/>`,
  }[b.face];
  parts.push(mouth);
  if (b.crown) parts.push(`<path d="M${cx - 26} ${hy - 38} L${cx - 30} ${hy - 66} L${cx - 13} ${hy - 50} L${cx} ${hy - 72} L${cx + 13} ${hy - 50} L${cx + 30} ${hy - 66} L${cx + 26} ${hy - 38} Z" fill="#FFD166" stroke="${ink}" stroke-width="4" stroke-linejoin="round"/>`);
  if (b.halo) parts.push(`<ellipse cx="${cx}" cy="${hy - 52}" rx="30" ry="8" fill="none" stroke="#FFE66D" stroke-width="7"/>`);
  if (b.extra) parts.push(b.extra);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 260">${parts.join('')}</svg>`;
}

export const wrap = (inner: string, vb = '0 0 100 100') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}">${inner}</svg>`;
