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

test('a guest who cannot come is not sent away with "see you there"', async ({ page }) => {
  // Issue #22. Every other RSVP test here says yes, which is exactly how the yes
  // copy — "Rendez-vous le 5 septembre, au jardin" — shipped on the no path.
  await visit(page, '/#rsvp');
  const form = page.locator('#rsvp');

  await form.getByLabel('Votre nom').fill('Absente');
  await form.getByRole('button', { name: 'Je ne pourrai pas venir' }).click();
  await form.getByRole('button', { name: 'Envoyer ma réponse' }).click();

  await expect(form).toContainText('Votre réponse nous est parvenue');
  await expect(form).toContainText('Vous nous manquerez');
  await expect(form).not.toContainText('Rendez-vous le 5 septembre');
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

test('a quote star opens its note, and only one is ever open', async ({ page }) => {
  // The quote stars are the only thing on the page that hides content behind a
  // click, and they carry no label — so if hydration or the open-index regresses
  // they do not look broken, they look like decoration. Nothing else would fail.
  await visit(page, '/');
  const stars = page.getByRole('button', { name: 'une pensée' });
  await expect(stars).toHaveCount(10);

  const first = stars.first();
  await expect(first).toHaveAttribute('aria-expanded', 'false');
  await first.click();
  await expect(first).toHaveAttribute('aria-expanded', 'true');
  // The welcome pair, in order: the ayah, then Saint-Exupéry. Asserting the
  // attribution rather than the quote proves the two halves of a starQuotes
  // entry — SHARED text, EXTRA gloss — were joined for the right id.
  await expect(page.getByText('Sourate Ar-Rûm, 30:21')).toBeVisible();
  await expect(page.getByText('Antoine de Saint-Exupéry')).toBeHidden();

  // One index, not a flag each: opening a second must shut the first.
  await stars.nth(1).click();
  await expect(first).toHaveAttribute('aria-expanded', 'false');
  await expect(stars.nth(1)).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByText('Antoine de Saint-Exupéry')).toBeVisible();
  await expect(page.getByText('Sourate Ar-Rûm, 30:21')).toBeHidden();

  await page.keyboard.press('Escape');
  await expect(stars.nth(1)).toHaveAttribute('aria-expanded', 'false');

  // Every note, on this project's viewport. The mobile project is where this
  // bites: anchored to its own star, a note at 320px started two thirds of the
  // way along and ran off the right edge — legible on a laptop, cut off on the
  // phone most guests will actually open this on.
  const vw = page.viewportSize().width;
  for (let i = 0; i < 10; i++) {
    const star = stars.nth(i);
    await star.scrollIntoViewIfNeeded();
    await star.click();
    const note = page.locator('#' + (await star.getAttribute('aria-controls')));
    await expect(note).toBeVisible();
    const b = await note.boundingBox();
    expect(b.x, 'note ' + i + ' off the start edge').toBeGreaterThanOrEqual(0);
    expect(b.x + b.width, 'note ' + i + ' off the end edge').toBeLessThanOrEqual(vw);
    await star.click();
  }
});

test('a quote keeps its own language inside a page set in another', async ({ page }) => {
  // `lang` on the blockquote is not cosmetic: app.css keys the typeface off
  // :lang(), so losing it sets a French quote in Amiri and a Persian one in an
  // Arabic face. Neither is a crash, and neither is visible from a French page.
  await visit(page, '/');
  await page.getByRole('button', { name: 'العربية', exact: true }).click();

  const stars = page.getByRole('button', { name: 'خاطرة' });
  await expect(stars).toHaveCount(10);
  await stars.first().click();

  // The welcome pair is one Arabic ayah and one French line; the French one must
  // still be ltr and still be set in the body face, on a page that is rtl.
  const fr = page.locator('blockquote[lang="fr"]').first();
  await expect(fr).toHaveAttribute('dir', 'ltr');
  await expect(fr).toHaveCSS('font-family', /Mulish/);
});

test('no quote star can take a press meant for a control', async ({ page }) => {
  // How this broke: on a phone one of the RSVP section's stars landed exactly on
  // "Modifier ma réponse" and swallowed the tap — a guest would have got a Rumi
  // quatrain instead of the form. The stars paint above the running text on
  // purpose, so the fix is a z-order one in app.css.
  //
  // The overlap is FORCED rather than waited for. Where a star falls is a
  // function of the section's seed and the section's rendered height, so the
  // natural collision moves the moment any copy changes — a test that checked
  // only where the stars happen to sit today would go quiet long before it went
  // wrong. Parking one on each control tests the z-order rule itself.
  await visit(page, '/');
  await expect(page.locator('.quote-star')).toHaveCount(10);

  const result = await page.evaluate(() => {
    const stolen = [];
    let checked = 0;
    const name = (el) => el.textContent?.trim().slice(0, 40) || el.getAttribute('name') || el.tagName;

    for (const el of document.querySelectorAll('section :is(button, a, input, textarea, select)')) {
      if (el.classList.contains('quote-star')) continue;
      if (!el.getBoundingClientRect().width) continue;
      // A star from the control's OWN section. Every section is `isolate`, so a
      // star can only ever cover something inside its own stacking context —
      // borrowing the first star on the page proves nothing about the fifth.
      const star = el.closest('section')?.querySelector('.quote-star');
      if (!star) continue;
      // elementFromPoint reads the VIEWPORT, so the control has to be on screen.
      // 'instant': app.css sets scroll-behavior:smooth on <html>, so the default
      // animates and every rect below would be read from before the scroll.
      el.scrollIntoView({ block: 'center', behavior: 'instant' });
      const b = el.getBoundingClientRect();
      const x = b.left + b.width / 2;
      const y = b.top + b.height / 2;
      if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) continue;

      // Park the star dead centre on the control, in viewport coordinates.
      star.style.position = 'fixed';
      star.style.inset = 'auto';
      star.style.left = `${x - star.offsetWidth / 2}px`;
      star.style.top = `${y - star.offsetHeight / 2}px`;

      const hit = document.elementFromPoint(x, y);
      checked++;
      // A null hit is a broken probe, not a pass — that is exactly how the first
      // version of this test managed to agree with a page that was still wrong.
      if (!hit) stolen.push(`no hit over ${name(el)}`);
      else if (hit.closest('.quote-star')) stolen.push(name(el));
    }
    return { stolen, checked };
  });

  expect(result.stolen).toEqual([]);
  // The page has controls in four of its five sections; if this ever drops to a
  // handful the loop above has stopped reaching them and is proving nothing.
  expect(result.checked).toBeGreaterThan(8);
});
