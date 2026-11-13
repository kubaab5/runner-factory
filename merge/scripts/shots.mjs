import { chromium } from '@playwright/test';
const out = process.argv[2] || '/tmp/mshots';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
for (const [n, w, h, touch] of [['phone', 390, 844, true], ['desk', 1440, 900, false], ['square', 700, 700, false], ['land', 844, 390, true]]) {
  const p = await b.newPage({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch });
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto('http://localhost:4182/?debug');
  await p.waitForTimeout(1500);
  await p.screenshot({ path: `${out}/${n}-start.png` });
  for (let i = 0; i < 45; i++) {
    await p.evaluate((i) => window.__mm.drop(40 + ((i * 97) % 340)), i);
    await p.waitForTimeout(480);
  }
  await p.screenshot({ path: `${out}/${n}-mid.png` });
  for (let i = 0; i < 200; i++) {
    const over = await p.evaluate(() => !document.getElementById('over').classList.contains('hide'));
    if (over) break;
    await p.evaluate(() => window.__mm.drop(210));
    await p.waitForTimeout(470);
  }
  await p.waitForTimeout(800);
  await p.screenshot({ path: `${out}/${n}-over.png` });
  console.log(n, errs.length ? errs : 'ok', await p.evaluate(() => { const s = window.__mm.sim(); return `score ${s.score} max ${s.maxTier}`; }));
  await p.close();
}
await b.close();
