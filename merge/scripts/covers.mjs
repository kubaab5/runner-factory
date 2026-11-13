import { chromium } from '@playwright/test';
const out = process.argv[2];
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
for (const [kind, w, h] of [['square', 800, 800], ['portrait', 1080, 1920], ['landscape', 1920, 1080], ['poster', 1080, 1350]]) {
  const p = await b.newPage({ viewport: { width: w, height: h } });
  p.on('pageerror', (e) => console.log('ERR', e));
  await p.goto(`http://localhost:5198/cover.html?kind=${kind}`);
  await p.waitForFunction(() => window.coverReady, null, { timeout: 15000 });
  await p.waitForTimeout(300);
  await p.screenshot({ path: `${out}/${kind}.png` });
  await p.close();
}
await b.close();
