import type { GameConfig } from '../engine/types';
import { aura } from './aura';
import { gym } from './gym';

export const GAMES: Record<string, GameConfig> = { aura, gym };

/** Which game this build is: VITE_GAME at build time, ?game= in dev. */
export function currentGame(): GameConfig {
  const q = new URLSearchParams(location.search).get('game');
  const id = (import.meta.env.DEV && q) || import.meta.env.VITE_GAME || q || 'aura';
  return GAMES[id] ?? aura;
}
