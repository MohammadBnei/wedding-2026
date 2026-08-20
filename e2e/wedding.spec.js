import { test, expect } from '@playwright/test';

/**
 * Load a page and wait until Svelte has actually attached its handlers.
 * Without this, Playwright clicks the server-rendered markup before hydration
 * and the click goes nowhere — which looks exactly like a broken feature.
 */
async function visit(page, path = '/') {
  await page.goto(path);
  await page.locator('html[data-hydrated="true"]').waitFor({ state: 'attached' });
}

/**
 * These cover what curl cannot: layout at real viewports, the theme applying
 * without a flash, RTL actually mirroring, and the chat/RSVP flows as a guest
 * drives them. Each one targets a specific failure the original artifact had.
 */

test('renders the invitation in French by default', async ({ page }) => {
  await visit(page, '/');
  await expect(page).toHaveTitle(/Leïla & Mohammad-Amine/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Leïla');
  await expect(page.getByRole('heading', { name: 'Le déroulé' })).toBeVisible();
  await expect(page.getByText('13h30')).toBeVisible();
});

test('the RSVP call to action jumps to the form', async ({ page }) => {
  await visit(page, '/');
  await page.getByRole('link', { name: 'je réponds' }).click();
  await expect(page).toHaveURL(/#rsvp/);
  await expect(page.locator('#rsvp')).toBeInViewport();
});

test('switching language re-renders and flips direction to RTL', async ({ page }) => {
  await visit(page, '/');
  await page.getByRole('button', { name: 'AR', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
  await expect(page.getByRole('heading', { name: 'برنامج اليوم' })).toBeVisible();
});

test('the accent rule mirrors to the right edge in Arabic', async ({ page }) => {
  await visit(page, '/');
  await page.getByRole('button', { name: 'AR', exact: true }).click();
  // Measure only once the switch has actually landed, or we read the LTR layout.
  await page.locator('html[dir="rtl"]').waitFor();

  // The garden-plan callout uses border-inline-start. The artifact used
  // border-left, which stayed stubbornly on the left in RTL.
  const callout = page.locator('.border-s-\\[3px\\]').first();
  const width = await callout.evaluate(
    (el) => getComputedStyle(el).borderRightWidth + '|' + getComputedStyle(el).borderLeftWidth
  );
  expect(width).toBe('3px|0px');
});

test('theme toggle applies immediately and survives a reload with no flash', async ({ page }) => {
  await visit(page, '/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

  await page.getByRole('button', { name: /thème sombre/ }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

  // The real test: the SERVER must render dark on the next request. If the
  // theme only lived in localStorage, this attribute would be 'light' in the
  // initial HTML and repaint — the flash.
  const res = await page.reload();
  const html = await res.text();
  expect(html).toContain('data-theme="dark"');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('dark theme actually repaints the surfaces and lifts the accent', async ({ page }) => {
  await visit(page, '/');
  const read = () =>
    page.evaluate(() => {
      const s = getComputedStyle(document.documentElement);
      return {
        surface: s.getPropertyValue('--color-surface').trim(),
        accent: s.getPropertyValue('--color-accent').trim(),
        primary: s.getPropertyValue('--color-primary').trim(),
        body: getComputedStyle(document.body).backgroundColor
      };
    });
  const light = await read();
  await page.getByRole('button', { name: /thème sombre/ }).click();
  const dark = await read();

  expect(dark.surface).not.toBe(light.surface);
  expect(dark.accent).not.toBe(light.accent);
  expect(dark.primary).not.toBe(light.primary);
  expect(dark.body).not.toBe(light.body);
});

test('a chip question gets an answer and the transcript survives a reload', async ({ page }) => {
  await visit(page, '/');
  await page.getByRole('button', { name: 'Il y a un parking ?' }).click();

  const log = page.getByRole('log');
  await expect(log).toContainText('Il y a un parking ?');
  await expect(log).toContainText('stationnement est libre');

  // The artifact kept messages in component state; a refresh wiped them.
  await page.reload();
  await expect(page.getByRole('log')).toContainText('stationnement est libre');
});

test('switching language keeps the transcript (the artifact wiped it)', async ({ page }) => {
  await visit(page, '/');
  await page.getByRole('button', { name: 'Comment venir ?' }).click();
  await expect(page.getByRole('log')).toContainText('Survilliers-Fosses');

  await page.getByRole('button', { name: 'EN', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('log')).toContainText('Survilliers-Fosses');
});

test('RSVP refuses an empty form, then saves and can be edited', async ({ page }) => {
  await visit(page, '/#rsvp');
  const form = page.locator('#rsvp');

  // The name field is `required`, so the browser blocks the submit itself — a
  // native constraint doing the job before any request is made.
  const name = form.getByLabel('votre nom');
  await form.getByRole('button', { name: 'envoyer' }).click();
  expect(await name.evaluate((el) => el.validity.valueMissing)).toBe(true);

  // With a name but no attendance choice, the browser is satisfied and the
  // SERVER has to catch it.
  await name.fill('Niloufar');
  await form.getByRole('button', { name: 'envoyer' }).click();
  await expect(form).toContainText('Choisissez une réponse');

  await form.getByRole('button', { name: "j'y serai" }).click();
  await form.getByRole('button', { name: '3', exact: true }).click();
  await form.getByLabel('un morceau à passer').fill('Fairuz — Li Beirut');
  await form.getByRole('button', { name: 'envoyer' }).click();

  await expect(form).toContainText("C'est noté");

  // The artifact had no way back from the thank-you screen.
  await form.getByRole('button', { name: 'modifier ma réponse' }).click();
  await expect(form.getByLabel('votre nom')).toBeVisible();
});

test('desktop shows a sticky rail beside a scrolling column', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'desktop layout only');
  await visit(page, '/');

  const rail = page.locator('header').first();
  const box = await rail.boundingBox();
  expect(box.width).toBeLessThan(400); // a column, not full width
  expect(await rail.evaluate((el) => getComputedStyle(el).position)).toBe('sticky');

  // Rail and content sit side by side, not stacked.
  const main = await page.locator('main').boundingBox();
  expect(main.x).toBeGreaterThan(box.x + box.width - 2);

  // Identity stays put while the content scrolls away.
  const before = await rail.boundingBox();
  await page.evaluate(() => window.scrollTo(0, 1800));
  await page.waitForTimeout(150);
  const after = await rail.boundingBox();
  expect(Math.abs(after.y - before.y)).toBeLessThan(5);
});

test('mobile is a single stacked column', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'mobile layout only');
  await visit(page, '/');
  const rail = await page.locator('header').first().boundingBox();
  const main = await page.locator('main').boundingBox();
  expect(main.y).toBeGreaterThan(rail.y);
  expect(Math.abs(main.width - rail.width)).toBeLessThan(2);
});

test('the page never scrolls sideways', async ({ page }) => {
  await visit(page, '/');
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test('an English browser gets English without touching the switcher', async ({ browser }) => {
  const ctx = await browser.newContext({ locale: 'en-GB' });
  const page = await ctx.newPage();
  await visit(page, '/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('heading', { name: 'The day' })).toBeVisible();
  await ctx.close();
});

test('an explicit choice outranks the browser preference on the next visit', async ({ browser }) => {
  const ctx = await browser.newContext({ locale: 'en-GB' });
  const page = await ctx.newPage();
  await visit(page, '/');
  await page.getByRole('button', { name: 'FR', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr');

  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
  await ctx.close();
});

test('cookies are not marked Secure over plain HTTP', async ({ page, context }) => {
  // Regression: `secure: !hostname.includes('localhost')` marked cookies Secure
  // on every non-localhost origin, including http://192.168.x.x. Browsers drop
  // Secure cookies sent over plain HTTP, so on a phone testing over the LAN the
  // language switch, the theme and the visitor id all silently stopped
  // persisting — while working perfectly on localhost.
  await visit(page);
  await page.getByRole('button', { name: 'AR', exact: true }).click();
  await page.locator('html[dir="rtl"]').waitFor();

  const cookies = await context.cookies();
  expect(cookies.length).toBeGreaterThan(0);
  for (const c of cookies) {
    expect(c.secure, `cookie "${c.name}" must not be Secure over http`).toBe(false);
  }
  expect(cookies.map((c) => c.name).sort()).toEqual(['lang', 'wid']);
});

test('a language choice survives a full reload', async ({ page }) => {
  // The end-to-end shape of the same bug: if the cookie is rejected, the switch
  // appears to work (the client re-renders) and then reverts on reload.
  await visit(page);
  await page.getByRole('button', { name: 'AR', exact: true }).click();
  await page.locator('html[dir="rtl"]').waitFor();

  const res = await page.reload();
  expect(await res.text()).toContain('dir="rtl"');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
});

test('the banding drifts, alternates direction, and stops for reduced motion', async ({ page, browser }) => {
  await visit(page);
  const positions = () =>
    page.evaluate(() =>
      [...document.querySelectorAll('.zigzag-band')]
        .filter((el) => el.getClientRects().length)
        .map((el) => new DOMMatrixReadOnly(getComputedStyle(el).transform).m41));

  const a = await positions();
  await page.waitForTimeout(300);
  const b = await positions();
  expect(a.length).toBeGreaterThan(1);
  expect(a.some((v, i) => v !== b[i])).toBe(true);

  // Consecutive bands must travel opposite ways, or the page reads as everything
  // sliding one direction rather than as woven banding.
  const signs = new Set(a.map((v, i) => Math.sign(b[i] - v)).filter(Boolean));
  expect(signs.size).toBeGreaterThan(1);

  // Duration alone does NOT stop an infinite animation — it runs the cycle
  // 0.01ms at a time, forever. The reset also caps iteration-count; this fails
  // if that is ever dropped.
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const p2 = await ctx.newPage();
  await visit(p2);
  const at = () =>
    p2.evaluate(() =>
      new DOMMatrixReadOnly(getComputedStyle(document.querySelector('.zigzag-band')).transform).m41);
  const r1 = await at();
  await p2.waitForTimeout(400);
  expect(await at()).toBe(r1);
  await ctx.close();
});
