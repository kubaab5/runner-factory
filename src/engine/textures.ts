import Phaser from 'phaser';

function withSize(svg: string, w: number, h: number) {
  return svg.replace('<svg ', `<svg width="${w}" height="${h}" `);
}

/** Rasterises an SVG string into a Phaser texture once (later calls with the same key are free). */
export function addSvgTexture(scene: Phaser.Scene, key: string, svg: string, w: number, h: number): Promise<void> {
  if (scene.textures.exists(key)) return Promise.resolve();
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      if (!scene.textures.exists(key)) {
        const tex = scene.textures.createCanvas(key, w, h);
        if (tex) {
          tex.context.drawImage(img, 0, 0, w, h);
          tex.refresh();
        }
      }
      resolve();
    };
    img.onerror = () => resolve();
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(withSize(svg, w, h));
  });
}

export const heroKey = (tier: number, skin: number) => `hero_${tier}_${skin}`;
