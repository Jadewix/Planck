import { test, expect } from '@playwright/test';

async function silhouette(canvas) {
  return canvas.evaluate((element) => {
    const { width, height } = element;
    const pixels = element.getContext('2d').getImageData(0, 0, width, height).data;
    let left = width, right = 0, ink = 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (pixels[(y * width + x) * 4 + 3] < 20) continue;
        left = Math.min(left, x); right = Math.max(right, x); ink++;
      }
    }
    return { width: Math.max(0, right - left), ink };
  });
}

test('hero remains a defined 3D silhouette throughout rotation instead of collapsing edge-on', async ({ page }) => {
  test.setTimeout(60000);
  await page.clock.install();
  await page.goto('/');
  const canvas = page.locator('#service-particles');
  await expect.poll(async () => (await silhouette(canvas)).ink).toBeGreaterThan(500);
  const initial = await silhouette(canvas);
  // Exercise the point in the previous full turn where the logo became edge-on.
  await page.clock.runFor(13000);
  const rotated = await silhouette(canvas);
  expect(rotated.width).toBeGreaterThan(initial.width * .75);
  expect(rotated.ink).toBeGreaterThan(500);
  await expect(canvas).toHaveCSS('filter', 'none');
});

test('unchanged resize notifications do not clear the static hero canvas', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    const NativeResizeObserver = window.ResizeObserver;
    window.ResizeObserver = class extends NativeResizeObserver {
      constructor(callback) { super(callback); this.notify = () => callback([], this); }
      observe(target, options) {
        super.observe(target, options);
        if (target.matches('.hero')) window.notifyHeroResize = this.notify;
      }
    };
  });
  await page.goto('/');
  await expect.poll(async () => (await silhouette(page.locator('#service-particles'))).ink).toBeGreaterThan(500);
  const retained = await page.evaluate(() => {
    window.notifyHeroResize();
    const canvas = document.querySelector('#service-particles');
    const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
    return pixels.some((value, index) => index % 4 === 3 && value > 20);
  });
  expect(retained).toBe(true);
});
