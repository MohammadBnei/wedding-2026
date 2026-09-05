import { test, expect } from '@playwright/test';

/**
 * Two quote stars per starred <Section> on `/` — welcome, day, essentials, chat.
 *
 * A constant rather than the literal repeated in three assertions: it was `10`
 * until the RSVP section came off the page the morning of the wedding, and that
 * one content change turned three tests red for a reason none of them was about.
 * Change this when a starred section is added or removed.
 */
const QUOTE_STARS = 8;

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

test('the rail call to action opens the wall composer', async ({ page }) => {
  await visit(page, '/');
  // The rail's CTA was `href="#rsvp"` reading "Je réponds" until the night
  // before the wedding, when answering an invitation stopped being the thing a
  // guest's thumb should land on. It now opens the wall composer.
  await page.getByRole('button', { name: /mur/i }).first().click();
  await expect(page.locator('dialog[open]')).toBeVisible();
  await expect(page.locator('dialog[open] form[action="?/wall"]')).toBeVisible();

  // Escape closes it — the native <dialog> behaviour we chose it for.
  await page.keyboard.press('Escape');
  await expect(page.locator('dialog[open]')).toHaveCount(0);

  // The RSVP section came off the page the same morning — nobody answers an
  // invitation on the day. The composer is what the CTA is for now.
  await expect(page.locator('#rsvp')).toHaveCount(0);
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

/*
 * The three guest-facing RSVP tests that stood here — empty-form validation,
 * the "cannot come" copy, and the optional email — were deleted with the form
 * itself on the morning of the wedding. They tested a section that no longer
 * renders; keeping them green would have meant keeping the section.
 *
 * What they covered still exists server-side (the `rsvp` action, the upsert,
 * the soft delete) and is still exercised below through /admin, which is now
 * seeded by posting to the action directly rather than by driving a form.
 */

test('/admin lists the replies with their totals', async ({ page }) => {
  // Unlinked and gated by authentik in the cluster; here there is no Traefik in
  // front, so the route's dev bypass lets this through. What is being tested is
  // the page, not the gate — the gate is a Traefik route and cannot be reached
  // from a dev server at all.
  await visit(page, '/');
  await reply(page, 'Table Row', { headcount: '2', email: 'row@example.test' });

  await page.goto('/admin');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('replies');
  const row = page.getByRole('row').filter({ hasText: 'Table Row' });
  await expect(row).toContainText('row@example.test');
  await expect(row).toContainText('2');
});

/**
 * Reply as a guest so there is a row to work on, and hand back the name used.
 *
 * Posts to the `rsvp` action directly. It used to drive the form on `/`, but
 * that section came off the page the morning of the wedding — and none of the
 * /admin tests below were ever about the form, only about the row it produced.
 * Going through the page's own context keeps the `wid` cookie, which is the
 * RSVP's primary key.
 */
async function reply(page, name, extra = {}) {
  const res = await page.request.post('/?/rsvp', {
    headers: { origin: 'http://localhost:5188' },
    multipart: { name, going: 'true', headcount: '1', ...extra }
  });
  expect(res.status()).toBe(200);
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

/*
 * "a deleted reply blanks the guest form, and replying again restores it" was
 * here. Its first half is untestable now — there is no guest form to blank.
 *
 * Its second half was the valuable one: replying again must clear `deleted_at`,
 * or the answer lands in a row /admin still filters out. That is kept below,
 * driven through the action.
 */
test('replying again after a delete is the un-delete', async ({ page }) => {
  await visit(page, '/');
  await reply(page, 'Second Thoughts');
  page.on('dialog', (d) => d.accept());

  await page.goto('/admin');
  await page.getByRole('button', { name: 'Delete the reply from Second Thoughts' }).click();
  await expect(page.getByRole('row').filter({ hasText: 'Second Thoughts' })).toHaveCount(0);

  // The upsert clears deleted_at. Without that, this answer lands in a row
  // /admin still filters out and the guest has replied to nobody.
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

const sidewaysOverflow = (page) =>
  page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );

test('the page never scrolls sideways', async ({ page }) => {
  await visit(page, '/');
  expect(await sidewaysOverflow(page)).toBeLessThanOrEqual(0);
});

test('/admin never scrolls sideways, even with an unbreakable message', async ({
  page,
  request
}) => {
  // This is where it actually broke: the wall table has five columns, a
  // thumbnail, and an action group, on a 390px phone. The `/` test above never
  // covered it.
  //
  // Deliberately NOT extended to /wall — that page sets body{overflow:hidden}
  // and .wall{position:fixed}, so the assertion is 0 by construction and could
  // never fail.
  //
  // The message is one long unbroken token on purpose: `overflow-wrap` does not
  // reduce a table cell's min-content width, so only `break-all` survives this.
  await request.post('/?/wall', {
    headers: { origin: 'http://localhost:5188' },
    multipart: {
      author: 'Overflowing McLongname-Van-Der-Bergensteinsson',
      // Under MAX_MESSAGE (280) or the server refuses the post and this test
      // silently measures an empty table — which it did, on the first attempt.
      note: 'https://example.test/' + 'a'.repeat(200)
    }
  });

  await page.goto('/admin');
  // Assert the row actually landed before measuring. Without this the test
  // measures an empty table and always passes — which is exactly what it did on
  // the first attempt, when the seeded message was over MAX_MESSAGE and the
  // server refused it. `count`, not `toBeVisible`: at 1825px of overflow the
  // element is off-screen, which is the very thing being measured.
  expect(await page.getByText(/Overflowing McLongname/).count()).toBeGreaterThan(0);

  // Measured: 0px with break-all, 1825px without it, at a 393px viewport.
  expect(await sidewaysOverflow(page)).toBeLessThanOrEqual(0);
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
  await p1.getByRole('button', { name: /mur/i }).first().click({ timeout: 2000 });
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
  await expect(stars).toHaveCount(QUOTE_STARS);

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

  // A press anywhere else shuts it. Without this a note can only be dismissed by
  // finding the unlabelled mark that opened it again, which nobody does — they
  // tap past it and leave a card sitting on the invitation.
  await first.click();
  await expect(first).toHaveAttribute('aria-expanded', 'true');
  await page.mouse.click(5, 5);
  await expect(first).toHaveAttribute('aria-expanded', 'false');

  // Every note, on this project's viewport. The mobile project is where this
  // bites: anchored to its own star, a note at 320px started two thirds of the
  // way along and ran off the right edge — legible on a laptop, cut off on the
  // phone most guests will actually open this on.
  const { width: vw, height: vh } = page.viewportSize();
  for (let i = 0; i < QUOTE_STARS; i++) {
    const star = stars.nth(i);
    await star.scrollIntoViewIfNeeded();
    await star.click();
    const note = page.locator('#' + (await star.getAttribute('aria-controls')));
    await expect(note).toBeVisible();
    const b = await note.boundingBox();
    expect(b.x, 'note ' + i + ' off the start edge').toBeGreaterThanOrEqual(0);
    expect(b.x + b.width, 'note ' + i + ' off the end edge').toBeLessThanOrEqual(vw);
    // Vertically too, which is what the nudge in Section.svelte exists for: the
    // seeded placement knows the section but not the screen, so a star opened
    // near the fold hangs its note off the bottom until something measures it.
    //
    // A pixel of slack, on this bound only: when the nudge cannot fit the note
    // without covering its own star it scrolls the page instead, and the scroll
    // lands on a whole pixel while the note's edge does not. The 0.3px that
    // leaves over is rounding, not a note off the screen. The horizontal bounds
    // are a computed translate and stay exact.
    expect(b.y, 'note ' + i + ' above the fold').toBeGreaterThanOrEqual(-1);
    expect(b.y + b.height, 'note ' + i + ' below the fold').toBeLessThanOrEqual(vh + 1);
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
  await expect(stars).toHaveCount(QUOTE_STARS);
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
  await expect(page.locator('.quote-star')).toHaveCount(QUOTE_STARS);

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

/* ---------------------------------------------------------------------------
   The guest wall.

   These cover the parts curl cannot: that a signature is actually required, that
   the trust boundary rejects a lie about file type without a 500, and — the one
   that matters most — that the projector keeps cycling when the network goes
   away. That last one is the reason the feature has a replay buffer at all, and
   it is impossible to check by hand at a venue.
--------------------------------------------------------------------------- */

/** Poll until `check` is true, or give up. Returns what it last saw. */
async function waitFor(check, budgetMs = 12_000, everyMs = 500) {
  const until = Date.now() + budgetMs;
  let last = false;
  while (Date.now() < until) {
    last = await check();
    if (last) return true;
    await new Promise((r) => setTimeout(r, everyMs));
  }
  return last;
}

/**
 * Open the wall dialog from the rail's call to action — the button that used to
 * say "Je réponds". The form only exists in the DOM once the dialog is open.
 */
async function openWall(page) {
  await page.getByRole('button', { name: /mur|wall|جدار|دیوار/i }).first().click();
  await page.locator('dialog[open]').waitFor();
}

/**
 * Did a form action refuse this?
 *
 * SvelteKit wraps action results in a 200 envelope whose BODY carries the real
 * status, so asserting on res.status() alone silently passes when the action
 * actually failed — and, worse, passes when it actually succeeded. Read the
 * envelope.
 */
async function actionFailed(res, expectedStatus = 400) {
  const body = await res.text();
  if (res.status() === expectedStatus) return true;
  return body.includes(`"type":"failure"`) && body.includes(`"status":${expectedStatus}`);
}

test('the wall refuses an unsigned message', async ({ page, request }) => {
  await visit(page, '/');
  await openWall(page);
  // Scoped to the dialog: the RSVP form on the same page has fields with
  // similar labels, and an unscoped getByLabel would be ambiguous.
  const form = page.locator('dialog[open] form[action="?/wall"]');
  // A message, no name. The point of the wall is that the room can see who
  // wrote what, so this must not go through. The browser stops it first —
  // the name input is `required`, so submission never leaves the page.
  await form.getByLabel(/message/i).fill('Bravo !');
  await form.getByRole('button', { name: /mur/i }).click();
  const nameInput = form.locator('input[name="author"]');
  await expect(nameInput).toHaveJSProperty('validity.valid', false);
  // Still on the form, no "it's on its way" — nothing was sent.
  await expect(form).toBeVisible();

  // And the server does not trust the browser: the same post over the wire,
  // bypassing HTML validation entirely, is refused too.
  const res = await request.post('/?/wall', {
    headers: { origin: 'http://localhost:5188' },
    multipart: { author: '', note: 'Bravo !' }
  });
  expect(await actionFailed(res)).toBe(true);
});

test('the wall refuses a signature with nothing attached to it', async ({ page }) => {
  await visit(page, '/');
  await openWall(page);
  const form = page.locator('dialog[open] form[action="?/wall"]');
  await form.getByLabel(/nom/i).first().fill('Karim');
  await form.getByRole('button', { name: /mur/i }).click();
  await expect(form.getByText(/mot ou ajoutez une photo/i)).toBeVisible();
});

test('the photo control is one button, and confirms what you picked', async ({ page }) => {
  await visit(page, '/');
  await openWall(page);
  const form = page.locator('dialog[open] form[action="?/wall"]');

  // accept="image/*", not a hand-listed set: on iOS this is what turns the raw
  // file browser into the photo picker. It is a hint, never a guarantee — the
  // Bun.Image re-encode on the server is the actual boundary.
  const input = form.locator('input[name="photo"]');
  await expect(input).toHaveAttribute('accept', 'image/*');

  // One label, not two. There used to be a caption AND the browser's own
  // "Choose file" text saying the same thing.
  await expect(form.getByText(/Ajouter une photo/)).toHaveCount(1);

  // The input is hidden but must stay reachable — sr-only, not display:none.
  await expect(input).toBeAttached();

  // Picking a photo has to visibly take. `photoName` was captured and rendered
  // nowhere, so a guest got no confirmation at all.
  await input.setInputFiles({
    name: 'ma-photo.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64'
    )
  });
  await expect(form.getByText('ma-photo.png')).toBeVisible();
  // And the button says "Change" once something is chosen.
  await expect(form.getByText(/Changer/)).toBeVisible();
});

test('a file that lies about being an image is refused, not a 500', async ({ page, request }) => {
  await visit(page, '/');
  const res = await request.post('/?/wall', {
    headers: { origin: 'http://localhost:5188' },
    multipart: {
      author: 'Nadia',
      note: '',
      // A text file wearing a .jpg name and an image content-type. Bun.Image's
      // decode is what catches it, and it must surface as a 400 the guest can
      // act on rather than an unhandled throw.
      photo: {
        name: 'not-really.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.from('this is plain text, not an image at all')
      }
    }
  });
  expect(await actionFailed(res)).toBe(true);
});

test('nothing reaches the wall before it has been screened', async ({ request }) => {
  // The safety property, and the one that holds in every environment: screening
  // runs AFTER the response, so between "posted" and "decided" a post must be
  // invisible to the projector. If this ever goes red, something is publishing
  // on the way in.
  //
  // Deliberately NOT asserting the text-open/photo-closed asymmetry here. That
  // only manifests when the model is unreachable, so with a real OPENAI_BASE_URL
  // configured the assertion would invert and the test would be measuring the
  // environment rather than the code. The asymmetry lives in moderate.js and is
  // pinned by parseVerdict's unit tests, which cover every not-a-decision case.
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64'
  );
  const before = (await (await request.get('/api/wall')).json()).items.map((i) => i.id);

  const res = await request.post('/?/wall', {
    headers: { origin: 'http://localhost:5188' },
    multipart: {
      author: 'Screening Probe',
      note: '',
      photo: { name: 'p.png', mimeType: 'image/png', buffer: png }
    }
  });
  expect(res.status()).toBe(200);

  // Immediately: the row exists but is pending, so the wall must not have grown.
  const straightAfter = (await (await request.get('/api/wall')).json()).items.map((i) => i.id);
  expect(straightAfter.filter((id) => !before.includes(id))).toEqual([]);
});

test('the projector keeps cycling when the poll starts failing', async ({ page, request }) => {
  // THE money test. The projector is on venue wifi talking to a homelab; a blip
  // must degrade to "no new photos", never to a black screen. Verified by
  // killing the poll outright and checking a slide is still rendered well past
  // several poll intervals.
  await request.post('/__seed_wall_for_test', { failOnStatusCode: false }).catch(() => {});

  await page.goto('/wall');
  // Kill every poll from here on.
  await page.route('**/api/wall', (r) => r.abort());
  await page.waitForTimeout(9_000);

  // Something is on screen — either real posts, or the standing card. Never
  // nothing, and never an error.
  await expect(page.locator('.wall')).toBeVisible();
  await expect(page.locator('.slide')).toHaveCount(1);
  const text = await page.locator('.wall').innerText();
  expect(text.length).toBeGreaterThan(0);
});

test('the wall remembers your name, so a second post costs one field', async ({ page }) => {
  await visit(page, '/');
  await page.evaluate(() => localStorage.removeItem('wall-author'));
  await openWall(page);
  const form = page.locator('dialog[open] form[action="?/wall"]');
  await form.locator('input[name="author"]').fill('Mémoire');
  await form.getByLabel(/message/i).fill('Première carte');
  await form.getByRole('button', { name: /mur/i }).click();

  // A successful post replaces the form with the "waiting to appear" panel, so
  // there is no field left to read here — assert the panel, then the storage.
  await expect(page.locator('dialog[open]')).toContainText(/apparaîtra/i);
  expect(await page.evaluate(() => localStorage.getItem('wall-author'))).toBe('Mémoire');

  // The point: a fresh load, on the same phone, during the dancing. The name
  // comes back; the message deliberately does not.
  await visit(page, '/');
  await openWall(page);
  const again = page.locator('dialog[open] form[action="?/wall"]');
  await expect(again.locator('input[name="author"]')).toHaveValue('Mémoire');
  await expect(again.getByLabel(/message/i)).toHaveValue('');
});

test('a name is only remembered once a post actually lands', async ({ page }) => {
  // Remembering on submit rather than on success would hand back a name the
  // server refused, pre-filled and pre-broken, with no clue why.
  //
  // The rejection used here is a signed post with neither message nor photo,
  // because it is one a guest can actually reach: an over-long name cannot be
  // typed at all — maxlength truncates it in the browser first.
  await visit(page, '/');
  await page.evaluate(() => localStorage.removeItem('wall-author'));
  await openWall(page);
  const form = page.locator('dialog[open] form[action="?/wall"]');
  await form.locator('input[name="author"]').fill('Rejeté');
  await form.getByRole('button', { name: /mur/i }).click();

  await expect(form.getByText(/mot ou ajoutez une photo/i)).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('wall-author'))).toBeNull();
});

test('wall images set no cookie, so they can actually be cached', async ({ request }) => {
  // A response carrying Set-Cookie is never cached by Cloudflare — confirmed
  // live, cf-cache-status: BYPASS — and SvelteKit drops the Cache-Control we set
  // alongside it. That mattered more than a missed CDN hit: the projector's
  // offline replay leans on the browser cache, and an uncacheable image means a
  // blank frame the moment the network wobbles.
  //
  // Asserted against a nonexistent id on purpose: a 404 still goes through
  // hooks.server.js, so this tests the hook rather than needing a seeded photo.
  const res = await request.get('/api/wall/img/00000000-0000-0000-0000-000000000000.jpg');
  expect(res.headers()['set-cookie']).toBeUndefined();

  // And any other route still mints it — this is one narrow exemption, not a
  // hole in how every other page identifies a visitor.
  const page = await request.get('/');
  expect(page.headers()['set-cookie']).toBeDefined();
});

test('the projector image route is hardened and serves the original', async ({ request }) => {
  // The projector is served the untouched upload, so this route hands back
  // bytes we did not re-encode. These are the guards that make that acceptable.
  const bogus = '00000000-0000-0000-0000-000000000000';

  // The plain `<id>.jpg` URL is gone. It is cached browser-side and edge-side as
  // the OLD derivative under `immutable, max-age=604800`, so reusing it would
  // have kept serving the soft picture for a week and the change would have
  // looked like it did nothing.
  expect((await request.get(`/api/wall/img/${bogus}.jpg`)).status()).toBe(404);

  // Uppercase is the same row to Postgres but a different CDN cache key — at
  // full resolution that turns one photo into repeated multi-megabyte fetches
  // off a residential uplink.
  expect((await request.get(`/api/wall/img/${bogus.toUpperCase()}-o.jpg`)).status()).toBe(404);

  // 36 dashes matched the old `[0-9a-f-]{36}` and reached Postgres, which
  // raised 22P02 on every request.
  expect((await request.get(`/api/wall/img/${'-'.repeat(36)}-o.jpg`)).status()).toBe(404);

  // Still no Set-Cookie, or Cloudflare will not cache it (cf-cache-status:
  // BYPASS) and the projector loses the disk cache its offline replay needs.
  const res = await request.get(`/api/wall/img/${bogus}-o.jpg`);
  expect(res.headers()['set-cookie']).toBeUndefined();
});

test('the wall page carries no site chrome', async ({ page }) => {
  // It is a display surface. A language switcher or a nav bar on a projector is
  // a thing a guest will eventually walk up and press.
  await page.goto('/wall');
  await expect(page.locator('.wall')).toBeVisible();
  await expect(page.getByRole('button', { name: /RSVP|répond/i })).toHaveCount(0);
});

/**
 * The global stop.
 *
 * Worth an e2e rather than only a unit test on heldIndex(): the two ways this
 * broke in review were both about ORDER — which of the three writers of `i` were
 * gated, and whether the held id was read before or after the poll merged a new
 * window. Neither is visible from the pure function, and both are invisible from
 * the admin side, which cheerfully reads "stopped" either way.
 */

/**
 * POST once, and once more if the CONNECTION dropped.
 *
 * These are the only tests that drive the admin API while a projector page is
 * open and polling every 3s, and on a two-core CI runner that combination gets
 * an occasional `read ECONNRESET` out of the dev server's keep-alive — seen once
 * on the mobile project, never reproduced locally. A dropped socket is not the
 * thing under test, and swallowing it here is narrow: only a THROW is retried, a
 * real non-2xx still fails the assertion at the call site.
 *
 * @param {import('@playwright/test').APIRequestContext} request
 * @param {string} url
 * @param {Record<string, string>} form
 */
async function postOnce(request, url, form) {
  try {
    return await request.post(url, { multipart: form });
  } catch {
    return await request.post(url, { multipart: form });
  }
}

/**
 * @param {import('@playwright/test').APIRequestContext} request
 * @param {string} action
 */
async function setWall(request, action) {
  const res = await postOnce(request, '/admin?/wallAction', { do: action });
  expect(res.ok()).toBeTruthy();
}

/**
 * Stop the wall, run `body`, and hand it back whatever happens.
 *
 * The stop is GLOBAL state in wall_control, so a test that fails halfway would
 * otherwise leave the wall stopped for everything after it — including, on a
 * rerun, `the projector keeps cycling when the poll starts failing`, which would
 * then fail for a reason that has nothing to do with what it tests.
 *
 * @param {import('@playwright/test').APIRequestContext} request
 * @param {() => Promise<void>} body
 */
async function whileStopped(request, body) {
  await setWall(request, 'pause');
  try {
    await body();
  } finally {
    await setWall(request, 'resume');
  }
}

/** The projector needs a window worth cycling, or "did not advance" proves nothing. */
async function cyclingWall(page, request) {
  await setWall(request, 'resume');
  await page.goto('/wall');
  const lines = await page.locator('.rail .line').count();
  test.skip(lines < 2, 'needs at least two approved posts to cycle');
}

test('a stopped wall holds its slide, and starting it releases it', async ({ page, request }) => {
  // Proving "did not advance" costs more than a full slide (SLIDE_MS = 8s), and
  // this does it three times — live, across a new post, and across a reload.
  test.setTimeout(90_000);
  await cyclingWall(page, request);

  const caption = page.locator('.slide');
  await expect(caption).toBeVisible();
  let held = '';

  await whileStopped(request, async () => {
    // One poll to pick the stop up, then well past a full slide.
    await page.waitForTimeout(1_500);
    held = (await caption.textContent()) ?? '';
    await page.waitForTimeout(11_000);
    expect(await caption.textContent()).toBe(held);

    // The case that matters most, and the one the first cut of this got wrong:
    // a post landing DURING the stop must not take the screen. The poll has its
    // own "something new arrived, show it now" jump, separate from the advance
    // timer, and gating only the timer leaves a stopped wall moving while
    // /admin still reads "stopped".
    const fresh = await postOnce(request, '/?/wall', {
      author: 'Pendant la pause',
      note: 'ceci ne doit pas passer a l ecran'
    });
    expect(fresh.ok()).toBeTruthy();
    await page.waitForTimeout(5_000);
    expect(await caption.textContent()).toBe(held);

    // ...and a reload during the stop comes back on the SAME post, rather than
    // on whatever is newest — which, after the post above, is a different one.
    await page.reload();
    await page.waitForTimeout(1_500);
    expect(await caption.textContent()).toBe(held);
  });

  await expect(async () => {
    expect(await caption.textContent()).not.toBe(held);
  }).toPass({ timeout: 20_000 });
});

test('a stopped wall stays stopped when the held post is taken down', async ({ page, request }) => {
  // The guard this covers is the difference between "stopped" and "drifting".
  // If the held post leaves the window — deleted from /admin, or aged out past
  // WALL_WINDOW — the frozen id stops resolving and `at` falls back to the
  // cycling index. Because the window is sorted newest-first, every post that
  // arrives after that shifts what lives at that index, so the wall moves while
  // /admin still reads "stopped" and can never re-freeze on its own.
  test.setTimeout(90_000);
  await cyclingWall(page, request);

  const caption = page.locator('.slide');
  await expect(caption).toBeVisible();

  await whileStopped(request, async () => {
    await page.waitForTimeout(1_500);

    // Which post is actually on screen? Match the window against the caption.
    const { items } = await (await request.get('/api/wall')).json();
    const shown = await caption.textContent();
    const held = items.find((/** @type {any} */ it) => it.message && shown?.includes(it.message));
    expect(held, 'could not identify the held post').toBeTruthy();

    // Take it down. The wall MUST move off it — showing a deleted post is the
    // one thing worse than drifting — and must then hold wherever it lands.
    await postOnce(request, '/admin?/wallAction', { id: held.id, do: 'delete' });
    await page.waitForTimeout(4_000);
    const after = await caption.textContent();
    expect(after).not.toBe(shown);

    // ...and now the actual assertion: a new post must not move it again.
    const fresh = await postOnce(request, '/?/wall', {
      author: 'Apres suppression',
      note: 'le mur doit rester immobile'
    });
    expect(fresh.ok()).toBeTruthy();
    await page.waitForTimeout(6_000);
    expect(await caption.textContent()).toBe(after);
  });
});

test('the emergency keys still work while the wall is stopped', async ({ page, request }) => {
  await cyclingWall(page, request);

  await whileStopped(request, async () => {
    await page.waitForTimeout(1_500);
    const caption = page.locator('.slide');
    const held = await caption.textContent();
    // A human at the laptop outranks a button pressed in another room —
    // otherwise a bad photo frozen on the wall needs whoever is holding the
    // admin phone.
    await page.keyboard.press('ArrowRight');
    await expect(async () => {
      expect(await caption.textContent()).not.toBe(held);
    }).toPass({ timeout: 5_000 });
  });
});
