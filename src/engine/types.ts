export type Lang = 'ru' | 'en' | 'ky';
export type L10n = Record<Lang, string>;

export type OpKind = '+' | '-' | 'x' | '/';
export interface Op {
  kind: OpKind;
  n: number;
}

/** Everything that makes one game different from another. The engine never hard-codes a theme. */
export interface GameConfig {
  id: string;
  title: L10n;
  tagline: L10n;
  /** what the number means: "аура", "сила", "IQ" */
  unit: L10n;
  /** starting value on level 1 */
  start: number;
  /** numbers on gates are rounded to this step (100 for aura, 1 for strength) */
  step: number;
  palette: {
    skyTop: string;
    skyBottom: string;
    ground: string;
    road: string;
    roadEdge: string;
    stripe: string;
    good: string;
    bad: string;
    accent: string;
    ink: string;
    panel: string;
  };
  /** value thresholds where the hero changes look; tiers.length === thresholds.length */
  thresholds: number[];
  tiers: L10n[];
  /** hero SVG for a tier (0..tiers-1) and a skin colour; drawn in a 200×260 box, feet at the bottom centre */
  hero: (tier: number, skin: string) => string;
  skins: { name: L10n; color: string; price: number }[];
  /** small +item on the road and −item hazard; SVGs in a 100×100 box */
  pickup: { svg: string; n: number };
  hazard: { svg: string; n: number };
  boss: { name: L10n; svg: string };
  /** roadside props, 100×140 box */
  decor: string[];
  /** shown on the win screen for the hero's tier (index = tier) */
  winLines: Record<Lang, string[]>;
  loseLines: Record<Lang, string[]>;
  /** emoji used in floaters / share text */
  emoji: string;
}
