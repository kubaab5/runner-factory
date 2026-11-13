import Phaser from 'phaser';
import { coinSvg, icons } from '../art/icons';
import { SOUND_KEYS } from '../audio/sfx';
import { currentGame } from '../games';
import { save } from '../core/save';
import { initServices } from '../services';
import { setGameSize } from '../ui/theme';
import { addSvgTexture, heroKey, POSES } from './textures';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    const cfg = currentGame();
    for (const k of SOUND_KEYS) this.load.audio(k, [`audio/${k}.ogg`, `audio/${k}.mp3`]);
    this.load.audio('music', [`audio/${cfg.music}.ogg`, `audio/${cfg.music}.mp3`]);
    const { width, height } = this.scale.gameSize;
    const bar = this.add.graphics();
    this.load.on('progress', (v: number) => {
      bar.clear().fillStyle(0xffffff, 0.25).fillRoundedRect(width / 2 - 200, height / 2, 400, 22, 11);
      bar.fillStyle(0xffffff, 1).fillRoundedRect(width / 2 - 200, height / 2, Math.max(22, 400 * v), 22, 11);
    });
  }

  async create() {
    const cfg = currentGame();
    setGameSize(this.scale.gameSize.width, this.scale.gameSize.height);
    await initServices();
    const skin = cfg.skins[save.data.skin] ?? cfg.skins[0];
    const jobs: Promise<void>[] = [
      addSvgTexture(this, 'coin', coinSvg, 96, 96),
      addSvgTexture(this, 'pickup', cfg.pickup.svg, 160, 160),
      addSvgTexture(this, 'hazard', cfg.hazard.svg, 200, 200),
      addSvgTexture(this, 'boss', cfg.boss.svg, 400, 520),
      ...cfg.decor.map((d, i) => addSvgTexture(this, `decor${i}`, d, 200, 280)),
      ...Object.entries(icons).map(([k, v]) => addSvgTexture(this, `i_${k}`, v, 128, 128)),
    ];
    for (let t = 0; t < cfg.tiers.length; t++) POSES.forEach((pose, f) => jobs.push(addSvgTexture(this, heroKey(t, save.data.skin, f), cfg.hero(t, skin, pose), 300, 390)));
    await Promise.all(jobs);
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 1).fillCircle(8, 8, 8);
    g.generateTexture('dot', 16, 16);
    g.clear().fillStyle(0xffffff, 1).fillRect(0, 0, 10, 16);
    g.generateTexture('chip', 10, 16);
    g.clear().fillStyle(0xffffff, 1);
    g.fillPoints([new Phaser.Math.Vector2(8, 0), new Phaser.Math.Vector2(10, 6), new Phaser.Math.Vector2(16, 8), new Phaser.Math.Vector2(10, 10), new Phaser.Math.Vector2(8, 16), new Phaser.Math.Vector2(6, 10), new Phaser.Math.Vector2(0, 8), new Phaser.Math.Vector2(6, 6)], true);
    g.generateTexture('star', 16, 16);
    g.destroy();
    this.scene.start('Run');
  }
}
