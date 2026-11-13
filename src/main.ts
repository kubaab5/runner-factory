import '@fontsource/nunito/800.css';
import '@fontsource/nunito/900.css';
import Phaser from 'phaser';
import { BootScene } from './engine/BootScene';
import { RunScene } from './engine/RunScene';
import { currentGame } from './games';
import { applyPalette, H, W } from './ui/theme';
import { track } from './core/analytics';

async function start() {
  const cfg = currentGame();
  applyPalette(cfg);
  document.title = cfg.title.en;
  document.body.style.background = cfg.palette.skyBottom;
  try {
    await Promise.race([Promise.all([document.fonts.load('800 32px "Nunito"', 'АБВ'), document.fonts.load('900 32px "Nunito"', 'АБВ')]), new Promise((r) => setTimeout(r, 1500))]);
  } catch {
    /* system font fallback */
  }
  document.getElementById('boot')?.remove();
  const game = new Phaser.Game({
    type: new URLSearchParams(location.search).has('canvas') ? Phaser.CANVAS : Phaser.AUTO,
    parent: 'game',
    backgroundColor: cfg.palette.skyBottom,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: W, height: H },
    render: { antialias: true },
    scene: [BootScene, RunScene],
  });
  (window as unknown as { __game: Phaser.Game }).__game = game;
  track('session_start', { game: cfg.id });
}

void start();
