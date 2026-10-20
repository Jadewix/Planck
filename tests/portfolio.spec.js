import { test, expect } from '@playwright/test';

test('portfolio loads with working assets and no browser errors', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page).toHaveTitle('Planck — Design & Development');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.locator('.case-row')).toHaveCount(3);
  await expect(page.locator('.contact-email')).toHaveAttribute('href', 'mailto:plancksoftware@gmail.com');
  for (const image of await page.locator('main img').all()) {
    await image.scrollIntoViewIfNeeded();
    await expect.poll(() => image.evaluate((el) => el.complete && el.naturalWidth > 0)).toBe(true);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test('navigation displays desktop links and keeps the expandable menu on mobile', async ({ page }, testInfo) => {
  await page.goto('/');
  if (testInfo.project.name === 'desktop') {
    const nav = page.getByRole('navigation', { name: 'Desktop navigation' });
    await expect(nav).toBeVisible();
    await expect(page.locator('.menu-toggle')).toBeHidden();
    await expect(nav.getByRole('link', { name: 'Home', exact: true })).toHaveAttribute('aria-current', 'location');
    await nav.getByRole('link', { name: 'Projects', exact: true }).click();
    await expect(page).toHaveURL(/#work$/);
    await expect(nav.getByRole('link', { name: 'Projects', exact: true })).toHaveAttribute('aria-current', 'location');
    await nav.getByRole('link', { name: 'Contact us' }).click();
    await expect(page).toHaveURL(/#contact$/);
    await expect(page.locator('.contact-email')).toBeInViewport();
    return;
  }
  await expect(page.locator('.desktop-nav')).toBeHidden();
  const toggle = page.getByRole('button', { name: 'Open menu' });
  await toggle.click();
  await expect(page.getByRole('link', { name: 'Services', exact: true })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button', { name: 'Close menu' })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('link', { name: 'Contact', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(toggle).toBeFocused();
  await expect(page.locator('#menu')).toBeHidden();
  await toggle.click();
  await page.getByRole('link', { name: 'Projects', exact: true }).click();
  await expect(page).toHaveURL(/#work$/);
  await expect(page.locator('#work')).toBeFocused();
  expect(await page.locator('main').evaluate((el) => el.inert)).toBe(false);
});

test('reveals remain visible on return and project captures stay framed when scrolling', async ({ page }) => {
  await page.goto('/');
  await page.addStyleTag({ content: 'html { scroll-behavior: auto !important; }' });
  const heading = page.locator('.services > h2');
  await heading.scrollIntoViewIfNeeded();
  await expect(heading).not.toHaveClass(/reveal-pending/);
  await page.locator('#contact').scrollIntoViewIfNeeded();
  await heading.scrollIntoViewIfNeeded();
  await expect(heading).toHaveCSS('opacity', '1');
  for (const screen of await page.locator('.case-screen').all()) {
    await screen.scrollIntoViewIfNeeded();
    await expect(screen).not.toHaveClass(/reveal-pending/);
    await expect(screen).toHaveCSS('opacity', '1');
    const image = screen.locator('img');
    await expect.poll(() => image.evaluate((el) => el.complete && el.naturalWidth > 0)).toBe(true);
    const geometry = await image.evaluate((el) => ({
      displayed: el.clientWidth / el.clientHeight,
      original: el.naturalWidth / el.naturalHeight,
      offset: el.getBoundingClientRect().top - el.parentElement.getBoundingClientRect().top,
    }));
    // The complete landscape capture fits without stretching, cropping, or blank tall frames.
    expect(geometry.original).toBeGreaterThan(1.7);
    expect(geometry.displayed).toBeCloseTo(geometry.original, 1);
    const copy = screen.locator('..').locator('.case-copy');
    await expect.poll(() => copy.evaluate((el) => el.style.translate)).not.toBe('');
    const copyBefore = await copy.evaluate((el) => el.style.translate);
    await page.evaluate(() => window.scrollBy(0, 160));
    await expect.poll(() => copy.evaluate((el) => el.style.translate)).not.toBe(copyBefore);
    await expect(image).toHaveCSS('transform', 'none');
    const after = await image.evaluate((el) => el.getBoundingClientRect().top - el.parentElement.getBoundingClientRect().top);
    expect(after).toBeCloseTo(geometry.offset, 1);
  }
});

test('reduced motion works on load and when changed at runtime', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('.reveal-pending')).toHaveCount(0);
  await page.locator('.case-screen').first().scrollIntoViewIfNeeded();
  await expect(page.locator('.case-screen img').first()).toHaveCSS('transform', 'none');
  await expect(page.locator('.case-screen').first()).toHaveCSS('translate', 'none');
  await expect(page.locator('.case-copy').first()).toHaveCSS('translate', 'none');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('.reveal-pending')).toHaveCount(0);
  await expect(page.locator('.case-screen img').first()).toHaveCSS('transform', 'none');
  await expect(page.locator('.case-screen').first()).toHaveCSS('translate', 'none');
  await expect(page.locator('.case-copy').first()).toHaveCSS('translate', 'none');
});

test('service accordions expose the agency offerings', async ({ page }) => {
  await page.goto('/');
  const first = page.locator('.service-list details').nth(0);
  const second = page.locator('.service-list details').nth(1);
  await first.locator('summary').click();
  await expect(first).toHaveAttribute('open', '');
  await second.locator('summary').click();
  await expect(second).toHaveAttribute('open', '');
  await expect(first).not.toHaveAttribute('open', '');
  await expect(page.locator('.service-list summary')).toHaveText([
    'Mobile Applications Development', 'Custom Webapp Development', 'UIUX Design',
  ]);
});

test('content and project links remain available without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(baseURL);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.locator('.services > h2')).toBeVisible();
  await expect(page.getByRole('link', { name: 'VIEW PROJECT', exact: false })).toHaveCount(3);
  await context.close();
});


test('resizing an open mobile menu restores desktop navigation and page scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Open menu' }).click();
  await expect(page.locator('main')).toHaveJSProperty('inert', true);
  await page.setViewportSize({ width: 1024, height: 768 });
  await expect(page.locator('#menu')).toBeHidden();
  await expect(page.locator('.desktop-nav')).toBeVisible();
  await expect(page.locator('main')).toHaveJSProperty('inert', false);
  await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('green expand controls open the correct project websites', async ({ page, context }) => {
  await page.goto('/');
  const controls = page.locator('.case-expand');
  await expect(controls).toHaveCount(3);
  for (const [index, url] of ['https://vigorfit.me/', 'https://aitsmena.com/', 'https://fusionpiercings.app/'].entries()) {
    await expect(controls.nth(index)).toHaveAttribute('href', url);
    await expect(controls.nth(index)).toHaveAttribute('target', '_blank');
  }
  // Fulfill the external navigation locally; do not depend on a client's live server.
  await context.route('https://vigorfit.me/**', (route) => route.fulfill({ body: '<title>Project website</title>' }));
  const popup = page.waitForEvent('popup');
  await controls.first().click();
  const project = await popup;
  await expect(project).toHaveURL('https://vigorfit.me/');
  await project.close();
});

test('a project without a website can open an on-page case-study card', async ({ page }) => {
  await page.goto('/');
  // Case-study content is a test fixture; no fabricated case study ships on the site.
  await page.evaluate(() => {
    const control = document.querySelector('.case-expand');
    control.setAttribute('href', '#test-case-study');
    control.removeAttribute('target');
    const dialog = document.createElement('dialog');
    dialog.id = 'test-case-study';
    dialog.className = 'case-study-card';
    dialog.setAttribute('aria-labelledby', 'test-case-study-title');
    dialog.innerHTML = '<button type="button" data-close-case-study>Close</button><h2 id="test-case-study-title">Test case study</h2><p>Approved project content.</p>';
    document.body.append(dialog);
  });
  const control = page.locator('.case-expand').first();
  const dialog = page.getByRole('dialog', { name: 'Test case study' });
  await control.click();
  await expect(dialog).toBeVisible();
  await expect(page.locator('body')).toHaveCSS('overflow', 'hidden');
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(control).toBeFocused();
  await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden');
  await control.click();
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(control).toBeFocused();
});

test('all project case-study buttons open the shared card with correct scope and content', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.case-study-trigger')).toHaveCount(3);
  for (const [index, name] of ['Vigorfit', 'AITS', 'Fusion Piercings'].entries()) {
    const trigger = page.locator('.case-study-trigger').nth(index);
    const row = trigger.locator('xpath=ancestor::article');
    await expect(row.getByRole('link', { name: 'VIEW PROJECT', exact: false })).toBeVisible();
    await trigger.click();
    const dialog = page.getByRole('dialog', { name, exact: true });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading', { name, exact: true })).toBeFocused();
    await expect(dialog.locator('.study-section h3')).toHaveText(['01The brief', '02What we delivered', '03The outcome']);
    await expect(dialog.locator('.study-scope li')).not.toHaveCount(0);
    await expect(dialog.locator('.study-gallery')).toBeHidden();
    await expect.poll(() => dialog.locator('.study-cover img').evaluate((el) => el.complete && el.naturalWidth > 0)).toBe(true);
    expect(await dialog.locator('.study-scroll').evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
    if (name === 'AITS') {
      await expect(dialog.locator('[data-study-role]')).toHaveText('UI/UX design');
      await expect(dialog.locator('[data-study-outcome]')).toContainText('development was handled separately');
      await expect(dialog.locator('.study-metrics')).toBeHidden();
      await expect(dialog.locator('[data-study-timeline]')).toBeHidden();
    } else {
      await expect(dialog.locator('[data-study-role]')).toHaveText('End-to-end design & development');
      await expect(dialog.locator('.study-metrics')).toContainText(name === 'Fusion Piercings' ? '+30%' : '50');
      await expect(dialog.locator('[data-study-timeline]')).toContainText(name === 'Fusion Piercings' ? 'May 1–30' : 'September 1–25');
    }
    // Tab stays inside the native modal instead of moving to page navigation.
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press('Tab');
      expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true);
    }
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  }
});

test('large case studies scroll internally, close from the fixed toolbar, and reset on reopen', async ({ page }) => {
  await page.goto('/');
  const trigger = page.locator('[data-case-study="fusion"]');
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Fusion Piercings', exact: true });
  const pageScroll = await page.evaluate(() => scrollY);
  await dialog.locator('.study-footer').scrollIntoViewIfNeeded();
  await expect.poll(() => dialog.locator('.study-scroll').evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
  expect(await page.evaluate(() => scrollY)).toBe(pageScroll);
  const close = dialog.getByRole('button', { name: 'Close case study', exact: true });
  await expect(close).toBeInViewport();
  await close.click();
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await expect(dialog.locator('.study-scroll')).toHaveJSProperty('scrollTop', 0);
  await dialog.getByRole('button', { name: 'Back to projects', exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden');
});
