import type { GameConfig } from '../engine/types';

/** Design size is 720×1280; the game EXPANDs to fill any window, so these follow the real game size. */
export let W = 720;
export let H = 1280;
export function setGameSize(w: number, h: number) {
  W = Math.round(w);
  H = Math.round(h);
}
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
