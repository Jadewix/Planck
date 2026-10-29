import { test, expect } from '@playwright/test';

async function open(page) {
  await page.goto('/');
  await page.locator('#contact [data-open-inquiry]').click();
  return page.getByRole('dialog', { name: 'What are you planning?', exact: true });
}
async function details(page, type = 'web') {
  await page.getByRole('radio', { name: type === 'mobile' ? /Mobile application/ : type === 'web' ? /Website or web application/ : type === 'design' ? /UI\/UX design/ : /I’d like your advice/ }).check();
  await page.getByRole('button', { name: /Continue/ }).click();
  await page.getByLabel('What would you like to build or improve?').fill('We need a better booking experience for our customers and team.');
  const values = {
    mobile: { platform: 'Both iOS and Android', stage: 'A new idea' },
    web: { websiteType: 'A customer-facing web app', integrations: 'Payments and booking software' },
    design: { designTarget: 'A website', designScope: 'Design only', existingUrl: 'https://example.com' },
    unsure: { guidance: 'Defining the features and scope' },
  }[type];
  for (const [name, value] of Object.entries(values)) {
    const input = page.locator(`[name="${name}"]`);
    if (await input.evaluate((el) => el.tagName === 'SELECT')) await input.selectOption(value);
    else await input.fill(value);
  }
  await page.getByRole('button', { name: /Continue/ }).click();
}
async function contact(page) {
  await page.getByLabel('Your name', { exact: true }).fill('Alex Client');
  await page.getByLabel('Work email', { exact: true }).fill('alex@example.com');
  await page.getByLabel('Company (optional)', { exact: true }).fill('Example Business');
  await page.getByLabel('Budget and currency', { exact: true }).fill('Around USD 8,000');
  await page.getByLabel('Target launch or timeframe', { exact: true }).fill('Flexible, in three months');
  await page.getByLabel('You can contact me about this project.').check();
}

for (const type of ['mobile', 'web', 'design', 'unsure']) {
  test(`${type} inquiry asks relevant questions and confirms only after a saved acknowledgment`, async ({ page }) => {
    let payload;
    await page.route('**/api/inquiries', async (route) => {
      payload = route.request().postDataJSON();
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, id: payload.id }) });
    });
    const dialog = await open(page);
    await details(page, type);
    await contact(page);
    await page.getByRole('button', { name: 'Send project inquiry', exact: true }).click();
    await expect(dialog.getByText('Thanks for telling us about it')).toBeVisible();
    expect(payload.projectType).toBe(type);
    expect(payload.name).toBe('Alex Client');
    expect(payload.budget).toBe('Around USD 8,000');
    expect(payload.consent).toBe(true);
    expect(payload.id).toMatch(/^[a-f\d-]{36}$/i);
    expect(Object.keys(payload.answers)).toEqual(type === 'mobile' ? ['platform', 'stage'] : type === 'web' ? ['websiteType', 'integrations'] : type === 'design' ? ['designTarget', 'designScope', 'existingUrl'] : ['guidance']);
    expect(await dialog.locator('.inquiry-scroll').evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
    await dialog.getByRole('button', { name: 'Back to Planck' }).click();
    await expect(dialog).toBeHidden();
    await expect(page.locator('#contact [data-open-inquiry]')).toBeFocused();
  });
}

test('a failed delivery preserves answers and retries with the same submission ID', async ({ page }) => {
  const ids = [];
  let attempt = 0;
  await page.route('**/api/inquiries', async (route) => {
    const payload = route.request().postDataJSON(); ids.push(payload.id); attempt++;
    await route.fulfill({ status: attempt === 1 ? 502 : 200, contentType: 'application/json', body: JSON.stringify(attempt === 1 ? { error: 'We couldn’t confirm your inquiry was saved. Please try again.' } : { ok: true, id: payload.id }) });
  });
  const dialog = await open(page);
  await details(page);
  await contact(page);
  await page.getByRole('button', { name: 'Send project inquiry' }).click();
  await expect(dialog.getByRole('alert')).toBeVisible();
  await expect(dialog.locator('.inquiry-success')).toBeHidden();
  await expect(page.getByLabel('Your name', { exact: true })).toHaveValue('Alex Client');
  await expect(page.getByLabel('Budget and currency')).toHaveValue('Around USD 8,000');
  await page.getByRole('button', { name: 'Send project inquiry' }).click();
  await expect(dialog.locator('.inquiry-success')).toBeVisible();
  expect(ids).toHaveLength(2);
  expect(ids[1]).toBe(ids[0]);
});

test('required answers block progress and changing service removes old conditional questions', async ({ page }) => {
  const dialog = await open(page);
  await page.getByRole('button', { name: /Continue/ }).click();
  await expect(dialog.locator('[data-step="0"]')).toBeVisible();
  await page.getByRole('radio', { name: /Mobile application/ }).check();
  await page.getByRole('button', { name: /Continue/ }).click();
  await expect(page.getByLabel('Which platforms do you need?')).toBeVisible();
  await page.getByLabel('What would you like to build or improve?').fill('We need a new customer-facing website for the business.');
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await page.getByRole('radio', { name: /UI\/UX design/ }).check();
  await page.getByRole('button', { name: /Continue/ }).click();
  await expect(page.getByLabel('What needs designing?')).toBeVisible();
  await expect(page.locator('[name="platform"]')).toHaveCount(0);
  await expect(page.getByLabel('What would you like to build or improve?')).toHaveValue('We need a new customer-facing website for the business.');
});

test('case-study inquiry opens the same form and Escape restores the project trigger', async ({ page }) => {
  await page.goto('/');
  const studyTrigger = page.locator('[data-case-study="vigorfit"]');
  await studyTrigger.click();
  const study = page.getByRole('dialog', { name: 'Vigorfit', exact: true });
  await study.getByRole('button', { name: 'Let’s talk', exact: true }).click();
  await expect(study).toBeHidden();
  const dialog = page.getByRole('dialog', { name: 'What are you planning?', exact: true });
  await expect(dialog).toBeVisible();
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press('Tab');
    expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(studyTrigger).toBeFocused();
  await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden');
});

test('an unconfirmed response never shows success', async ({ page }) => {
  await page.route('**/api/inquiries', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, id: 'wrong' }) }));
  const dialog = await open(page);
  await details(page);
  await contact(page);
  await page.getByRole('button', { name: 'Send project inquiry' }).click();
  await expect(dialog.getByRole('alert')).toBeVisible();
  await expect(dialog.locator('.inquiry-success')).toBeHidden();
});
