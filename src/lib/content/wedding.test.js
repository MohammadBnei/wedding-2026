import { expect, test } from 'bun:test';
import { STR, AFTER, LANGS, RTL, SHARED, PIN_POS, t, starGloss, starQuotes, fallbackText } from './wedding.js';

/**
 * The gap this closes: `t()` derives its type from `STR.fr` alone, and the
 * `Object.assign` merge at the foot of wedding.js discards its return type. So
 * a key added to `EXTRA.fr` and forgotten in `EXTRA.ar` type-checks clean,
 * renders an empty text node, and is visible only to an Arabic-reading guest.
 */
test('every locale defines exactly the same keys as French', () => {
  const fr = Object.keys(STR.fr).sort();
  for (const lang of LANGS) expect(Object.keys(STR[lang]).sort()).toEqual(fr);
});

test('the repeated structures keep the shape the components assume', () => {
  for (const lang of LANGS) {
    const s = STR[lang];
    // GardenPlan walks `pins` and indexes PIN_POS[i] on each, then defaults to
    // pins[2] — so the two lists must be the same length, and must reach index 2.
    expect(s.pins).toHaveLength(PIN_POS.length);
    expect(PIN_POS.length).toBeGreaterThanOrEqual(3);
    // Keyed {#each} blocks — a duplicate key is a runtime crash, not a warning.
    expect(new Set(s.chips.map((c) => c.q)).size).toBe(s.chips.length);
    expect(new Set(s.facts.map((f) => f.label)).size).toBe(s.facts.length);
    expect(new Set(s.schedule.map((x) => x.time)).size).toBe(s.schedule.length);
    // ics.js escapes , and ; so an unescaped SUMMARY would stop matching.
    expect(t(lang).icsSummary).not.toMatch(/[,;]/);
  }
});

/**
 * The quote stars split one quote across two tables — the original in SHARED,
 * the gloss and attribution in EXTRA — so nothing but this test notices when a
 * quote is added in French and forgotten in Persian. The key-parity test above
 * cannot: `starGloss` is one key, whatever is inside it.
 */
test('every quote star has a gloss and a source in all four languages', () => {
  const ids = SHARED.starQuotes.map((q) => q.id);
  expect(new Set(ids).size).toBe(ids.length);

  for (const q of SHARED.starQuotes) {
    expect(LANGS).toContain(q.lang);
    for (const lang of LANGS) {
      // Through `starGloss()`, not `STR[lang].starGloss` — the EXTRA merge is
      // invisible to the type of STR, which is the hole the first test covers.
      const entry = starGloss(q.id, lang);
      expect(entry).toBeDefined();
      // A quote with no attribution is a quote the couple cannot defend.
      expect(entry.ref.length).toBeGreaterThan(0);
      // A gloss is required whenever the reader is not already reading the
      // original — the rule salamGloss and verseGloss follow, generalised.
      // Arabic is the exception it already was: it glosses nothing.
      if (q.lang !== lang && lang !== 'ar') expect(entry.gloss.length).toBeGreaterThan(0);
      if (q.lang === lang) expect(entry.gloss).toBe('');
    }
  }
});

test('the section resolver hands a component everything it needs to render', () => {
  // Section.svelte places one star per quote and reads text/lang/gloss/ref off
  // each one. A section name that has no quotes must give an empty list, not
  // undefined — it is spread straight into an {#each}.
  for (const lang of LANGS) {
    const seen = ['welcome', 'day', 'essentials', 'chat', 'rsvp'].flatMap((s) => {
      const list = starQuotes(s, lang);
      expect(list).toHaveLength(2);
      for (const q of list) {
        expect(q.text.length).toBeGreaterThan(0);
        // `lang` drives dir and typeface in Section.svelte; RTL must know it.
        expect(typeof RTL.has(q.lang)).toBe('boolean');
        expect(q.ref.length).toBeGreaterThan(0);
      }
      return list;
    });
    expect(seen).toHaveLength(SHARED.starQuotes.length);
  }
  expect(starQuotes('no-such-section', 'fr')).toEqual([]);
});

test('the hand-off line degrades to no contact rather than a dangling one', () => {
  // SHARED.email is still a TODO. Until it is set the sentence must vanish
  // entirely — never render as "write to us at ." in front of a guest.
  for (const lang of LANGS) {
    const text = fallbackText(lang);
    expect(text).not.toContain('{email}');
    if (SHARED.email) expect(text).toContain(SHARED.email);
    else expect(text).toBe(STR[lang].fallback);
  }
});

/**
 * The post-wedding table (AFTER) has one rule the type system cannot express:
 * it may only REPLACE copy, never introduce it. t() keeps a single return type
 * for both modes on that basis — see its docblock — so a key here that exists
 * nowhere else would type-check in invitation mode and render an empty text
 * node, which is the failure the first test in this file was written about.
 */
test('every post-wedding override replaces a string that already exists', () => {
  // Object.assign at the foot of wedding.js has already merged EXTRA into STR
  // by the time this runs, so this covers EXTRA keys (heroInvite, closing,
  // wallCta, eventKind) as well as STR ones.
  const known = new Set(Object.keys(STR.fr));
  for (const lang of LANGS) {
    for (const key of Object.keys(AFTER[lang])) {
      expect({ lang, key, known: known.has(key) }).toEqual({ lang, key, known: true });
    }
  }
});

test('every locale overrides exactly the same keys as French', () => {
  // Same gap as the first test in this file, one table along: a key rewritten
  // in French and forgotten in Persian is a page half in the future tense, and
  // only a Persian reader ever sees it.
  const fr = Object.keys(AFTER.fr).sort();
  for (const lang of LANGS) expect(Object.keys(AFTER[lang]).sort()).toEqual(fr);
});

test('the post-wedding structures keep the shape the components assume', () => {
  for (const lang of LANGS) {
    // GardenPlan positions these from PIN_POS, so the override cannot change
    // how many there are without leaving a pin with nowhere to sit.
    expect(AFTER[lang].pins.length).toBe(PIN_POS.length);
    for (const pin of AFTER[lang].pins) {
      expect(pin.label.length).toBeGreaterThan(0);
      expect(pin.text.length).toBeGreaterThan(0);
    }
    // Timeline.svelte renders `item.items ?? [item.note]`. An entry carrying
    // neither renders one empty keyed block — silently, in one locale.
    for (const entry of AFTER[lang].schedule) {
      expect(entry.time.length).toBeGreaterThan(0);
      expect(entry.title.length).toBeGreaterThan(0);
      expect(Boolean(entry.items?.length || entry.note)).toBe(true);
    }
  }
});

test('post-wedding mode replaces the invitation copy, and only where it means to', () => {
  for (const lang of LANGS) {
    const before = t(lang);
    const after = t(lang, true);

    // The line under the names is the whole point: it must stop inviting.
    expect(after.heroInvite).not.toBe(before.heroInvite);
    expect(after.welcome1).not.toBe(before.welcome1);
    // og:description and <meta name="description"> are built from this, and a
    // forwarded link is seen by more people than ever open the page.
    expect(after.eventKind).not.toBe(before.eventKind);

    // Still the same day, and still the same wedding.
    expect(after.date).toBe(before.date);
    expect(after.icsSummary).toBe(before.icsSummary);
    expect(after.address).toBe(before.address);

    // Post-wedding-only copy lives in EXTRA, so it reads the same in both modes.
    // If this ever diverges, someone has moved a key into AFTER that has no
    // invitation-mode value — see the first test above.
    expect(after.overBody).toBe(before.overBody);
    expect(after.galleryTitle).toBe(before.galleryTitle);

    // t() must not mutate the table it reads from: the flag is reversible, and
    // a merge that wrote through would make the first over-mode request
    // permanent until the pod restarted.
    expect(t(lang).heroInvite).toBe(before.heroInvite);
  }
});
