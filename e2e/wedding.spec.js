import { test, expect } from '@playwright/test';

/**
 * Load a page and wait until Svelte has actually attached its handlers.
 * Without this, Playwright clicks the server-rendered markup before hydration
 * and the click goes nowhere — which looks exactly like a broken feature.
 */
async function visit(page, path = '/') {
  // Seed the returning-visitor flag so the entrance door opens itself instead of
  // waiting to be pushed. Every test below is about the page BEHIND the door; the
  // door's own behaviour, gate included, is the last test in this file.
  await page.addInitScript(() => sessionStorage.setItem('door', '1'));
  await page.goto(path);
  await page.locator('html[data-hydrated="true"]').waitFor({ state: 'attached' });
  await page.locator('.door-scrim').waitFor({ state: 'detached' });
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
  await expect(page.getByText('15h')).toBeVisible();
});

test('the RSVP call to action jumps to the form', async ({ page }) => {
  await visit(page, '/');
  await page.getByRole('link', { name: 'Je réponds' }).click();
  await expect(page).toHaveURL(/#rsvp/);
  await expect(page.locator('#rsvp')).toBeInViewport();
});

test('switching language re-renders and flips direction to RTL', async ({ page }) => {
  await visit(page, '/');
  await page.getByRole('button', { name: 'العربية', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
  await expect(page.getByRole('heading', { name: 'برنامج اليوم' })).toBeVisible();
});

test('the accent rule mirrors to the right edge in Arabic', async ({ page }) => {
  await visit(page, '/');
  await page.getByRole('button', { name: 'العربية', exact: true }).click();
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
  await page.getByRole('button', { name: 'Les enfants sont-ils les bienvenus ?' }).click();

  const log = page.getByRole('log');
  await expect(log).toContainText('Les enfants sont-ils les bienvenus ?');
  await expect(log).toContainText('Le jardin est clos');

  // The artifact kept messages in component state; a refresh wiped them.
  await page.reload();
  await expect(page.getByRole('log')).toContainText('Le jardin est clos');
});

test('switching language keeps the transcript (the artifact wiped it)', async ({ page }) => {
  await visit(page, '/');
  await page.getByRole('button', { name: 'Comment venir jusqu\'à Fosses ?' }).click();
  await expect(page.getByRole('log')).toContainText('Survilliers-Fosses');

  await page.getByRole('button', { name: 'English', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('log')).toContainText('Survilliers-Fosses');
});

test('RSVP refuses an empty form, then saves and can be edited', async ({ page }) => {
  await visit(page, '/#rsvp');
  const form = page.locator('#rsvp');

  // The name field is `required`, so the browser blocks the submit itself — a
  // native constraint doing the job before any request is made.
  const name = form.getByLabel('Votre nom');
  await form.getByRole('button', { name: 'Envoyer ma réponse' }).click();
  expect(await name.evaluate((el) => el.validity.valueMissing)).toBe(true);

  // With a name but no attendance choice, the browser is satisfied and the
  // SERVER has to catch it.
  await name.fill('Niloufar');
  await form.getByRole('button', { name: 'Envoyer ma réponse' }).click();
  await expect(form).toContainText('Choisissez une réponse');

  await form.getByRole('button', { name: 'Je serai des vôtres' }).click();
  await form.getByRole('button', { name: '3', exact: true }).click();
  await form.getByLabel('Votre e-mail (facultatif)').fill('niloufar@example.test');
  await form.getByLabel('Un morceau à faire jouer').fill('Fairuz — Li Beirut');
  await form.getByRole('button', { name: 'Envoyer ma réponse' }).click();

  await expect(form).toContainText('Votre réponse nous est parvenue');

  // The artifact had no way back from the thank-you screen.
  await form.getByRole('button', { name: 'Modifier ma réponse' }).click();
  await expect(form.getByLabel('Votre nom')).toBeVisible();
});

test('the email field is optional and does not block a reply', async ({ page }) => {
  await visit(page, '/#rsvp');
  const form = page.locator('#rsvp');

  await form.getByLabel('Votre nom').fill('Sans Adresse');
  await form.getByRole('button', { name: 'Je serai des vôtres' }).click();
  // Left empty on purpose. `type="email"` only validates a NON-empty value, so
  // an untouched box must not trip the native constraint the way `required`
  // does on the name — that is the whole difference this test is protecting.
  await form.getByRole('button', { name: 'Envoyer ma réponse' }).click();
  await expect(form).toContainText('Votre réponse nous est parvenue');
});

test('/admin lists the replies with their totals', async ({ page }) => {
  // Unlinked and gated by authentik in the cluster; here there is no Traefik in
  // front, so the route's dev bypass lets this through. What is being tested is
  // the page, not the gate — the gate is a Traefik route and cannot be reached
  // from a dev server at all.
  await visit(page, '/#rsvp');
  const form = page.locator('#rsvp');
  await form.getByLabel('Votre nom').fill('Table Row');
  await form.getByRole('button', { name: 'Je serai des vôtres' }).click();
  await form.getByRole('button', { name: '2', exact: true }).click();
  await form.getByLabel('Votre e-mail (facultatif)').fill('row@example.test');
  await form.getByRole('button', { name: 'Envoyer ma réponse' }).click();
  await expect(form).toContainText('Votre réponse nous est parvenue');

  await page.goto('/admin');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('replies');
  const row = page.getByRole('row').filter({ hasText: 'Table Row' });
  await expect(row).toContainText('row@example.test');
  await expect(row).toContainText('2');
});

/**
 * Reply as a guest so there is a row to work on, and hand back the name used.
 * Every /admin test below needs one and none of them is about the form.
 */
async function reply(page, name) {
  await visit(page, '/#rsvp');
  const form = page.locator('#rsvp');
  await form.getByLabel('Votre nom').fill(name);
  await form.getByRole('button', { name: 'Je serai des vôtres' }).click();
  await form.getByRole('button', { name: 'Envoyer ma réponse' }).click();
  await expect(form).toContainText('Votre réponse nous est parvenue');
  return name;
}

/** The `replies` number out of the /admin heading. */
async function replyCount(page) {
  const text = await page.getByRole('heading', { level: 1 }).textContent();
  return Number(text.match(/(\d+) replies/)[1]);
}

test('the intro links to /admin and the dashboard links back', async ({ page }) => {
  // In the cluster the chip is drawn only when an authentik session cookie is
  // present; here the `dev` half of that check in +layout.server.js stands in
  // for it, the same way /admin's own gate is bypassed in dev.
  await visit(page, '/');
  const chip = page.getByRole('link', { name: 'Admin', exact: true });
  await expect(chip).toBeVisible();

  await chip.click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('replies');

  await page.getByRole('link', { name: 'Invitation' }).click();
  // The heading first: it is the assertion that WAITS, and reading page.url()
  // straight after a click reads the old url. Port-agnostic on purpose — the
  // pinned :5188 in playwright.config.js is not worth hardcoding twice.
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Leïla');
  expect(new URL(page.url()).pathname).toBe('/');
});

test('/admin soft-deletes a reply and undoes it', async ({ page }) => {
  await reply(page, 'Delete Me');
  // confirm() blocks the submit until something answers it.
  page.on('dialog', (d) => d.accept());

  await page.goto('/admin');
  const before = await replyCount(page);
  const row = page.getByRole('row').filter({ hasText: 'Delete Me' });
  await expect(row).toBeVisible();

  await row.getByRole('button', { name: 'Delete the reply from Delete Me' }).click();
  await expect(row).toHaveCount(0);
  expect(await replyCount(page)).toBe(before - 1);

  // Soft, not gone: the row comes back with its own totals.
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByRole('row').filter({ hasText: 'Delete Me' })).toBeVisible();
  expect(await replyCount(page)).toBe(before);
});

test('a deleted reply blanks the guest form, and replying again restores it', async ({ page }) => {
  await reply(page, 'Second Thoughts');
  page.on('dialog', (d) => d.accept());

  await page.goto('/admin');
  await page.getByRole('button', { name: 'Delete the reply from Second Thoughts' }).click();
  await expect(page.getByRole('row').filter({ hasText: 'Second Thoughts' })).toHaveCount(0);

  // Same browser, same `wid` cookie, so this is the guest whose row was just
  // deleted looking at their own form. It must not prefill from a deleted row.
  await visit(page, '/#rsvp');
  await expect(page.locator('#rsvp').getByLabel('Votre nom')).toHaveValue('');

  // And replying again is the un-delete — the upsert clears deleted_at. Without
  // that, this answer lands in a row /admin still filters out.
  await reply(page, 'Second Thoughts');
  await page.goto('/admin');
  await expect(page.getByRole('row').filter({ hasText: 'Second Thoughts' })).toBeVisible();
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
  await page.getByRole('button', { name: 'Français', exact: true }).click();
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
  await page.getByRole('button', { name: 'العربية', exact: true }).click();
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
  await page.getByRole('button', { name: 'العربية', exact: true }).click();
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

test('the link preview points at a card that actually exists', async ({ page, baseURL }) => {
  // Crawlers never run JS and never resolve relative URLs, so this failure mode
  // is invisible in a browser: a relative or missing og:image renders a perfect
  // page and a blank card in WhatsApp. Assert the tag is in the SERVER html, is
  // absolute, and that the file behind it is really there.
  // The navigation response, NOT page.content(): what a crawler sees is the
  // server html, before Svelte has touched it.
  const html = await (await page.goto('/'))?.text();
  expect(html).toContain('og:image');
  expect(html).toContain('twitter:card');
  // A preview is forwarded far beyond the guest list, so it says the event and
  // the date and nothing that locates the venue. Scoped to <head>: the address
  // is printed in the BODY on purpose, for the guests who open the page.
  const head = html.slice(0, html.indexOf('</head>'));
  for (const venue of ['Prairie de Rocourt', '95470', 'Fosses', 'PostalAddress']) {
    expect(head).not.toContain(venue);
  }

  const og = await page.locator('meta[property="og:image"]').getAttribute('content');
  // Versioned: platforms cache the card against its URL, and WhatsApp has no
  // re-scrape tool, so a re-rendered card at the old URL would reach nobody who
  // had already shared the link. The query is what makes a redesign propagate.
  expect(og).toMatch(new RegExp(`^${baseURL}/og\\.png\\?v=\\d+$`));
  expect((await page.request.get(/** @type {string} */ (og))).status()).toBe(200);

  const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
  expect(canonical).toBe(`${baseURL}/`);
});

test('an unknown url gets the localized 404, not the bare SvelteKit one', async ({ page }) => {
  const res = await page.goto('/no-such-page');
  expect(res?.status()).toBe(404);
  // French is the negotiated default for the fr-FR browser locale in use here.
  await expect(page.getByRole('heading', { name: 'Page introuvable' })).toBeVisible();
  await page.getByRole('link', { name: "Retour à l'invitation" }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Leïla');
});

test('the calendar button opens the calendar app rather than saving a file', async ({ page }) => {
  // The BODY is asserted in src/lib/ics.test.js, which needs no server. What
  // only a browser can prove is that the route is wired up and that the headers
  // make a phone hand the file to its calendar app instead of parking it in
  // Downloads.
  await visit(page, '/');
  const res = await page.request.get('/wedding.ics');
  expect(res.status()).toBe(200);
  expect(res.headers()['content-type']).toContain('text/calendar');
  // `attachment` would force a save; `inline` lets the platform hand it off.
  expect(res.headers()['content-disposition']).toContain('inline');
  const link = page.getByRole('link', { name: 'Ajouter à mon calendrier' });
  await expect(link).toHaveAttribute('href', '/wedding.ics');
  // A `download` attribute would defeat the content-disposition above.
  await expect(link).not.toHaveAttribute('download', /.*/);
});

test('the door holds the page shut until it is pushed, then remembers', async ({ page }) => {
  await page.goto('/');
  await page.locator('html[data-hydrated="true"]').waitFor({ state: 'attached' });

  // First visit: shut, and staying shut.
  const door = page.locator('.door-scrim');
  await expect(door).toBeVisible();
  await expect(page.getByText('السلام عليكم').first()).toBeVisible();
  await page.waitForTimeout(1200);
  await expect(door).toBeVisible();

  // Nothing behind it moves while it is closed.
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflow)).toBe(
    'hidden'
  );

  await door.click();
  await door.waitFor({ state: 'detached' });
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflow)).not.toBe(
    'hidden'
  );

  // Second visit in the same session: it opens itself, with nobody touching it.
  await page.reload();
  await page.locator('html[data-hydrated="true"]').waitFor({ state: 'attached' });
  await door.waitFor({ state: 'detached' });
});

test('the door is not a trap for reduced motion or for scripting off', async ({ browser }) => {
  // Reduced motion collapses the swing and the lift to 0.01ms, but the curtain
  // still EXISTS for the 1.7s the component waits before dropping it. If it kept
  // its pointer-events it would silently eat every click in that window.
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const p1 = await ctx.newPage();
  await p1.goto('/');
  await p1.locator('html[data-hydrated="true"]').waitFor({ state: 'attached' });
  await p1.locator('.door-scrim').click();
  await p1.getByRole('link', { name: /je réponds|répond/i }).first().click({ timeout: 2000 });
  await ctx.close();

  // Scripting off: nothing can open the door, so it must never cover the page.
  const noJs = await browser.newContext({ javaScriptEnabled: false });
  const p2 = await noJs.newPage();
  await p2.goto('/');
  await expect(p2.locator('.door-scrim')).toBeHidden();
  await expect(p2.getByRole('heading', { level: 1 })).toBeVisible();
  await noJs.close();
});
