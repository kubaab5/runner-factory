import { chromium } from '@playwright/test';
const out = process.argv[2] || '/tmp/shots';
const sizes = [['phone', 390, 844, true], ['desk', 1440, 900, false], ['square', 700, 700, false], ['land', 844, 390, true]];
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=swiftshader', '--enable-webgl'] });
for (const [n, w, h, touch] of sizes) {
  const p = await b.newPage({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch, deviceScaleFactor: 1 });
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e)));
  p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await p.goto('http://localhost:4180/');
  await p.waitForTimeout(2500);
  await p.screenshot({ path: `${out}/${n}-menu.png` });
  await p.$eval('#playBtn', (e) => e.click());
  await p.waitForTimeout(400);
  if (touch) {
    await p.evaluate(() => {
      const fire = (type, x, y) => document.getElementById('cv').dispatchEvent(new PointerEvent(type, { pointerId: 7, pointerType: 'touch', clientX: x, clientY: y, bubbles: true }));
      fire('pointerdown', 200, 500);
      window.__fire = fire;
    });
    await p.evaluate(() => window.dispatchEvent(new PointerEvent('pointermove', { pointerId: 7, pointerType: 'touch', clientX: 260, clientY: 470, bubbles: true })));
  } else await p.mouse.move(w / 2 + 200, h / 2 - 50);
  await p.waitForTimeout(5000);
  await p.screenshot({ path: `${out}/${n}-play.png` });
  // drive into the wall to see the death screen
  for (let i = 0; i < 60; i++) {
    const st = await p.evaluate(() => !document.getElementById('dead').classList.contains('hide'));
    if (st) break;
    await p.waitForTimeout(500);
  }
  await p.waitForTimeout(600);
  await p.screenshot({ path: `${out}/${n}-dead.png` });
  if (!(await p.evaluate(() => document.getElementById('dead').classList.contains('hide')))) {
    await p.$eval('#menuBtn', (e) => e.click());
    await p.$eval('#shopBtn', (e) => e.click());
    await p.waitForTimeout(300);
    await p.screenshot({ path: `${out}/${n}-shop.png` });
  }
  console.log(n, errs.length ? errs : 'no errors');
  await p.close();
}
await b.close();
