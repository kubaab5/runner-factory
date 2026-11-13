import Phaser from 'phaser';
import { sfx } from '../audio/sfx';
import { haptic } from '../core/platform';
import { COL, FONT } from './theme';

export interface ButtonOpts {
  w: number;
  h: number;
  label: string;
  color?: number;
  textColor?: string;
  fontSize?: number;
  icon?: string;
  iconSize?: number;
  disabled?: boolean;
  testId?: string;
}

export class Button extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Graphics;
  private txt: Phaser.GameObjects.Text;
  private ico?: Phaser.GameObjects.Image;
  private enabled = true;
  readonly opts: ButtonOpts;

  constructor(scene: Phaser.Scene, x: number, y: number, opts: ButtonOpts, onClick: () => void) {
    super(scene, x, y);
    this.opts = opts;
    const { w, h } = opts;
    this.bg = scene.add.graphics();
    this.add(this.bg);
    const hasIcon = !!opts.icon;
    const iconSize = opts.iconSize ?? Math.min(h * 0.55, 56);
    if (hasIcon) {
      this.ico = scene.add.image(opts.label ? -w / 2 + 24 + iconSize / 2 : 0, 0, opts.icon!).setDisplaySize(iconSize, iconSize);
      this.add(this.ico);
    }
    this.txt = scene.add
      .text(hasIcon && opts.label ? iconSize / 2 + 8 : 0, 0, opts.label, {
        fontFamily: FONT,
        fontSize: `${opts.fontSize ?? 34}px`,
        fontStyle: '800',
        color: opts.textColor ?? '#ffffff',
        align: 'center',
        wordWrap: { width: w - (hasIcon ? iconSize + 40 : 28) },
      })
      .setOrigin(0.5);
    this.add(this.txt);
    this.draw();
    this.setSize(w, h);
    this.setInteractive({ useHandCursor: true });
    this.on('pointerdown', () => {
      if (!this.enabled) return;
      scene.tweens.add({ targets: this, scale: 0.94, duration: 70 });
    });
    this.on('pointerout', () => scene.tweens.add({ targets: this, scale: 1, duration: 90 }));
    this.on('pointerup', () => {
      scene.tweens.add({ targets: this, scale: 1, duration: 120, ease: 'Back.Out' });
      if (!this.enabled) return;
      sfx.tap();
      haptic.light();
      onClick();
    });
    if (opts.disabled) this.setEnabled(false);
    if (opts.testId) (this as unknown as { testId: string }).testId = opts.testId;
    scene.add.existing(this);
  }

  private draw() {
    const { w, h } = this.opts;
    const color = this.opts.color ?? COL.accent;
    this.bg.clear();
    this.bg.fillStyle(0x000000, 0.12).fillRoundedRect(-w / 2, -h / 2 + 6, w, h, Math.min(28, h / 2));
    this.bg.fillStyle(color, 1).fillRoundedRect(-w / 2, -h / 2, w, h, Math.min(28, h / 2));
    this.bg.fillStyle(0xffffff, 0.18).fillRoundedRect(-w / 2 + 6, -h / 2 + 4, w - 12, h * 0.42, Math.min(22, h / 3));
  }

  setLabel(s: string) {
    this.txt.setText(s);
    return this;
  }

  setEnabled(v: boolean) {
    this.enabled = v;
    this.setAlpha(v ? 1 : 0.45);
    return this;
  }

  pulse() {
    this.scene.tweens.add({ targets: this, scale: { from: 1, to: 1.06 }, duration: 520, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    return this;
  }
}

export function label(scene: Phaser.Scene, x: number, y: number, text: string, size = 32, color: string = COL.inkCss, weight = '800') {
  return scene.add.text(x, y, text, { fontFamily: FONT, fontSize: `${size}px`, fontStyle: weight, color, align: 'center' }).setOrigin(0.5);
}

/** Modal panel with a dimmed backdrop. Returns the container; call .destroy() to close. */
export function modal(scene: Phaser.Scene, w: number, h: number, title: string): Phaser.GameObjects.Container {
  const { width, height } = scene.scale.gameSize;
  const c = scene.add.container(0, 0).setDepth(8000);
  c.setData('modal', true);
  const dim = scene.add.rectangle(width / 2, height / 2, width, height, 0x101828, 0.6).setInteractive();
  const g = scene.add.graphics();
  const x = width / 2 - w / 2;
  const y = height / 2 - h / 2;
  g.fillStyle(0x000000, 0.15).fillRoundedRect(x, y + 10, w, h, 36);
  g.fillStyle(COL.panel, 1).fillRoundedRect(x, y, w, h, 36);
  const tt = label(scene, width / 2, y + 64, title, 42);
  while (tt.width > w - 60 && Number.parseInt(String(tt.style.fontSize)) > 26) tt.setFontSize(Number.parseInt(String(tt.style.fontSize)) - 2);
  c.add([dim, g, tt]);
  c.setAlpha(0);
  scene.tweens.add({ targets: c, alpha: 1, duration: 160 });
  return c;
}

export function toast(scene: Phaser.Scene, text: string, y = 230, color = '#ffffff') {
  const { width } = scene.scale.gameSize;
  const t = scene.add
    .text(width / 2, y, text, { fontFamily: FONT, fontSize: '30px', fontStyle: '800', color, backgroundColor: '#22344D', padding: { x: 22, y: 12 }, align: 'center', wordWrap: { width: width - 80 } })
    .setOrigin(0.5)
    .setDepth(9500)
    .setAlpha(0);
  scene.tweens.add({ targets: t, alpha: 1, y: y - 10, duration: 160 });
  scene.time.delayedCall(1700, () => scene.tweens.add({ targets: t, alpha: 0, duration: 250, onComplete: () => t.destroy() }));
  return t;
}

export function fmtTime(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
