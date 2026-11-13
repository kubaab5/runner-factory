import type Phaser from 'phaser';
import { save } from '../core/save';

/* Recorded CC0 audio files (public/audio, see CREDITS.txt) played through Phaser's sound manager.
   Muting follows four switches: the player's setting, the platform audio state, a platform pause, and a running ad. */

let game: Phaser.Game | null = null;
let platformAudio = true;
let paused = false;
let adPlaying = false;
let hidden = false;

export const SOUND_KEYS = ['tap', 'coin', 'good', 'bad', 'hit', 'punch', 'tierup', 'fail', 'whoosh', 'step', 'win'] as const;

function applyMute() {
  if (!game) return;
  game.sound.mute = !save.data.settings.sound || !platformAudio || paused || adPlaying || hidden;
}

export function bindAudio(g: Phaser.Game, platformAudioEnabled: boolean) {
  game = g;
  platformAudio = platformAudioEnabled;
  g.sound.pauseOnBlur = true;
  applyMute();
}
export const refreshMute = applyMute;
export function setAudioSuspended(v: boolean) {
  adPlaying = v;
  applyMute();
}
export function setPlatformAudio(on: boolean) {
  platformAudio = on;
  applyMute();
}
export function setPausedAudio(p: boolean) {
  paused = p;
  applyMute();
}
export function setHidden(h: boolean) {
  hidden = h;
  applyMute();
}

function play(key: string, cfg: Phaser.Types.Sound.SoundConfig = {}) {
  if (!game || !game.cache.audio.exists(key)) return;
  try {
    game.sound.play(key, cfg);
  } catch {
    /* audio locked until first input — harmless */
  }
}

export const sfx = {
  tap: () => play('tap', { volume: 0.5 }),
  mark: (i = 0) => play('tap', { volume: 0.55, rate: 1 + i * 0.08 }),
  coin: () => play('coin', { volume: 0.6 }),
  plop: (combo: number) => play('coin', { volume: 0.5, rate: 1 + Math.min(combo, 12) * 0.05 }),
  gateGood: () => play('good', { volume: 0.75 }),
  gateBad: () => play('bad', { volume: 0.8 }),
  hit: () => play('hit', { volume: 0.7 }),
  punch: () => play('punch', { volume: 0.7, rate: 0.9 + Math.random() * 0.25 }),
  tierUp: () => play('tierup', { volume: 0.7 }),
  fail: () => play('fail', { volume: 0.8, rate: 0.7 }),
  whoosh: () => play('whoosh', { volume: 0.5 }),
  step: (i: number) => play('step', { volume: 0.18, rate: i % 2 ? 1.1 : 0.95 }),
  win: () => play('win', { volume: 0.7 }),
};

let musicSound: Phaser.Sound.BaseSound | null = null;
export const music = {
  start(key: string) {
    if (!game || !game.cache.audio.exists(key)) return;
    if (musicSound?.isPlaying) return;
    musicSound?.destroy();
    musicSound = game.sound.add(key, { loop: true, volume: 0.32 });
    try {
      musicSound.play();
    } catch {
      /* locked until first input */
    }
  },
  volume(v: number) {
    (musicSound as unknown as { setVolume?: (v: number) => void })?.setVolume?.(v);
  },
};
