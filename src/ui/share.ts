import Phaser from 'phaser';
import { track } from '../core/analytics';
import { formatValue } from '../engine/level';
import { heroKey } from '../engine/textures';
import type { GameConfig } from '../engine/types';
import { getLang, t } from '../i18n/strings';
import { save } from '../core/save';
import { toast } from './widgets';

/** Renders a 1080×1350 brag card (hero + number + tier) and shares it, or downloads it where sharing files isn't supported. */
export async function shareResult(scene: Phaser.Scene, cfg: GameConfig, tier: number, value: number) {
  const L = getLang();
  const c = document.createElement('canvas');
  c.width = 1080;
  c.height = 1350;
  const g = c.getContext('2d')!;
  const grd = g.createLinearGradient(0, 0, 0, 1350);
  grd.addColorStop(0, cfg.palette.skyTop);
  grd.addColorStop(1, cfg.palette.skyBottom);
  g.fillStyle = grd;
  g.fillRect(0, 0, 1080, 1350);
  const src = scene.textures.get(heroKey(tier, save.data.skin)).getSourceImage() as HTMLCanvasElement;
  g.drawImage(src, 1080 / 2 - 330, 360, 660, 858);
  g.textAlign = 'center';
  g.lineJoin = 'round';
  const big = (text: string, y: number, size: number, fill: string) => {
    g.font = `900 ${size}px Nunito, system-ui, sans-serif`;
    g.lineWidth = size / 5;
    g.strokeStyle = cfg.palette.ink;
    g.strokeText(text, 540, y);
    g.fillStyle = fill;
    g.fillText(text, 540, y);
  };
  big(`${formatValue(value)} ${cfg.unit[L]}`, 170, 120, '#ffffff');
  big(cfg.tiers[tier][L], 300, 96, cfg.palette.accent);
  big(cfg.title[L], 1300, 64, '#ffffff');
  const text = t('shareText', { v: formatValue(value), u: cfg.unit[L], t: cfg.tiers[tier][L], g: cfg.title[L] });
  const blob: Blob | null = await new Promise((r) => c.toBlob(r, 'image/png'));
  track('share', { tier, value });
  try {
    if (blob) {
      const file = new File([blob], `${cfg.id}.png`, { type: 'image/png' });
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
      if (nav.canShare?.({ files: [file] })) {
        await nav.share({ files: [file], text });
        return;
      }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${cfg.id}-${value}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    }
    await navigator.clipboard?.writeText(text);
    toast(scene, '✓');
  } catch {
    /* user cancelled */
  }
}
