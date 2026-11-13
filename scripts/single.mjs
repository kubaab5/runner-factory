// Flattens a SINGLE=1 vite build into index.html + Bridge files: inlines the JS and CSS bundles and
// embeds the mp3 sounds as data URIs, so a phone browser can upload the game as a few loose files.
// usage: node scripts/single.mjs <gameDir>
import { readFileSync, readdirSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
const dir = join(process.argv[2], 'dist-single');
let html = readFileSync(join(dir, 'index.html'), 'utf8');
const assets = join(dir, 'assets');
for (const f of readdirSync(assets)) {
  const body = readFileSync(join(assets, f), 'utf8');
  if (f.endsWith('.css')) {
    html = html.replace(new RegExp(`<link rel="stylesheet"[^>]*href="\\./assets/${f.replace('.', '\\.')}"[^>]*>`), () => `<style>${body}</style>`);
  } else if (f.endsWith('.js')) {
    html = html.replace(new RegExp(`<script type="module" crossorigin src="\\./assets/${f.replace('.', '\\.')}"></script>`), () => `<script type="module">${body.replace(/<\/script/g, '<\\/script')}</script>`);
  }
}
const audioDir = join(dir, 'audio');
const sounds = {};
if (existsSync(audioDir)) {
  for (const f of readdirSync(audioDir)) if (f.endsWith('.mp3')) sounds[f] = 'data:audio/mpeg;base64,' + readFileSync(join(audioDir, f)).toString('base64');
  rmSync(audioDir, { recursive: true });
}
// before the game bundle, after the Bridge script
html = html.replace('<script type="module">', () => `<script>window.__AUDIO=${JSON.stringify(sounds)}</script>\n<script type="module">`);
rmSync(assets, { recursive: true });
writeFileSync(join(dir, 'index.html'), html);
console.log(readdirSync(dir), Math.round(html.length / 1024) + ' KB');
