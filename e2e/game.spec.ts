import { expect, Page, test } from '@playwright/test';

async function press(page: Page, testId: string) {
  await page.waitForFunction((id) => {
    const g = (window as any).__game;
    const has = (o: any): boolean => o.testId === id || (o.list ?? []).some(has);
    return g?.scene.getScenes(true).some((s: any) => s.children.list.some(has));
  }, testId, { timeout: 20000 });
  await page.evaluate((id) => {
    const g = (window as any).__game;
    for (const s of g.scene.getScenes(true)) {
      const all: any[] = [];
      const walk = (o: any) => { all.push(o); (o.list ?? []).forEach(walk); };
      s.children.list.forEach(walk);
      const b = all.filter((o) => o.testId === id).pop();
      if (b) return b.emit('pointerup');
    }
  }, testId);
}
const st = (page: Page) => page.evaluate(() => (window as any).__rf.state());
const closeModals = (page: Page) => page.evaluate(() => (window as any).__game.scene.getScene('Run').children.list.filter((o: any) => o.getData?.('modal')).forEach((o: any) => o.destroy()));

for (const game of ['aura', 'gym']) {
  test(`${game}: menu → run → boss → reward → level 2`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    await page.addInitScript(() => ((window as any).__mockAdsFast = true));
    await page.goto(`/${game}/?mockads&canvas=1`);
    await page.waitForFunction(() => (window as any).__rf, null, { timeout: 30000 });
    await page.waitForTimeout(600);
    await page.screenshot({ path: `e2e/out/${game}-01-menu.png` });

    await page.evaluate(() => { (window as any).__rf.start(); (window as any).__rf.autopilot(); });
    await page.waitForTimeout(2600);
    await page.screenshot({ path: `e2e/out/${game}-02-run.png` });
    await page.waitForTimeout(4000);
    await page.screenshot({ path: `e2e/out/${game}-03-run.png` });
    await page.waitForFunction(() => (window as any).__rf.state().st === 'end', null, { timeout: 90000 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: `e2e/out/${game}-04-end.png` });
    const s = await st(page);
    expect(s.value).toBeGreaterThan(s.boss); // autopilot picks the better gates → must win
    await press(page, 'x3');
    await page.waitForFunction(() => (window as any).__rf.state().level === 2 && (window as any).__rf.state().st === 'menu', null, { timeout: 20000 });
    const s2 = await st(page);
    expect(s2.coins).toBeGreaterThan(0);

    await press(page, 'skins');
    await page.waitForTimeout(800);
    await page.screenshot({ path: `e2e/out/${game}-05-skins.png` });
    await press(page, 'skin-1');
    await page.waitForTimeout(600);
    await closeModals(page);
    await press(page, 'upgrades');
    await page.waitForTimeout(400);
    await page.screenshot({ path: `e2e/out/${game}-06-upgrades.png` });
    await closeModals(page);
    expect(errors.filter((e) => !/404/.test(e))).toEqual([]);
  });
}
