import '@fontsource/nunito/800.css';
import '@fontsource/nunito/900.css';
import Phaser from 'phaser';
import { bindAudio } from './audio/sfx';
import { track } from './core/analytics';
import { BootScene } from './engine/BootScene';
import { RunScene } from './engine/RunScene';
import { currentGame } from './games';
import { detectLang, setLang } from './i18n/strings';
import { applyPalette, setGameSize } from './ui/theme';

export async function startGame(platformLang: string | undefined, audioEnabled: boolean) {
  const cfg = currentGame();
  applyPalette(cfg);
  setLang(detectLang(platformLang));
  document.title = cfg.title.en;
  document.getElementById('boot')?.remove();
  document.body.style.background = cfg.palette.skyBottom;
  try {
    await Promise.race([Promise.all([document.fonts.load('800 32px "Nunito"', 'АБВ'), document.fonts.load('900 32px "Nunito"', 'АБВ')]), new Promise((r) => setTimeout(r, 1500))]);
  } catch {
    /* system font fallback */
  }
  const game = new Phaser.Game({
    type: new URLSearchParams(location.search).has('canvas') ? Phaser.CANVAS : Phaser.AUTO,
    parent: 'game',
    backgroundColor: cfg.palette.skyBottom,
    // EXPAND keeps the 720×1280 design but grows to fill any window: no empty bars (rule 1.6.1 / 1.6.8)
    scale: { mode: Phaser.Scale.EXPAND, autoCenter: Phaser.Scale.CENTER_BOTH, width: 720, height: 1280 },
    render: { antialias: true },
    disableContextMenu: true,
    scene: [BootScene, RunScene],
  });
  setGameSize(game.scale.gameSize.width, game.scale.gameSize.height);
  game.scale.on('resize', (size: Phaser.Structs.Size) => {
    setGameSize(size.width, size.height);
    game.events.emit('layout');
  });
  bindAudio(game, audioEnabled);
  (window as unknown as { __game: Phaser.Game }).__game = game;
  track('session_start', { game: cfg.id });
}
