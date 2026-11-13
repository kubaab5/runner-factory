import type { GameConfig } from '../engine/types';

export const W = 720;
export const H = 1280;
export const FONT = '"Nunito", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

const hex = (s: string) => Number.parseInt(s.replace('#', ''), 16);

/** Colours used by the shared widgets; re-tinted per game at boot. */
export const COL = {
  ink: 0x22344d,
  inkCss: '#22344D',
  inkSoft: '#4E6580',
  accent: 0xffb703,
  accentCss: '#FFB703',
  green: 0x2bb673,
  red: 0xe63946,
  panel: 0xfffdf8,
  ad: 0x3d7dca,
  good: 0x3ed6a0,
  bad: 0xff4f6d,
};

export function applyPalette(cfg: GameConfig) {
  COL.accent = hex(cfg.palette.accent);
  COL.accentCss = cfg.palette.accent;
  COL.good = hex(cfg.palette.good);
  COL.bad = hex(cfg.palette.bad);
  COL.panel = hex(cfg.palette.panel);
}
export { hex };
