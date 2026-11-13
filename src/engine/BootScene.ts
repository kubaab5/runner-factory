import Phaser from 'phaser';
import { coinSvg, icons } from '../art/icons';
import { currentGame } from '../games';
import { save } from '../core/save';
import { detectLang, setLang } from '../i18n/strings';
import { initServices, platformMessage, refreshBanner } from '../services';
import { addSvgTexture, heroKey } from './textures';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  async create() {
    const cfg = currentGame();
    const svc = await initServices();
    setLang(detectLang(svc.language));
    const skin = cfg.skins[save.data.skin]?.color ?? cfg.skins[0].color;
    const jobs: Promise<void>[] = [
      addSvgTexture(this, 'coin', coinSvg, 96, 96),
      addSvgTexture(this, 'pickup', cfg.pickup.svg, 160, 160),
      addSvgTexture(this, 'hazard', cfg.hazard.svg, 200, 200),
      addSvgTexture(this, 'boss', cfg.boss.svg, 400, 520),
      ...cfg.decor.map((d, i) => addSvgTexture(this, `decor${i}`, d, 200, 280)),
      ...cfg.tiers.map((_, t) => addSvgTexture(this, heroKey(t, save.data.skin), cfg.hero(t, skin), 300, 390)),
      ...Object.entries(icons).map(([k, v]) => addSvgTexture(this, `i_${k}`, v, 128, 128)),
    ];
    await Promise.all(jobs);
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 1).fillCircle(8, 8, 8);
    g.generateTexture('dot', 16, 16);
    g.clear().fillStyle(0xffffff, 1).fillRect(0, 0, 10, 16);
    g.generateTexture('chip', 10, 16);
    g.destroy();
    refreshBanner();
    platformMessage('game_ready');
    this.scene.start('Run');
  }
}
