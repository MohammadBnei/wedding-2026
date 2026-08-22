import { expect, test } from 'bun:test';
import { STR, LANGS, RTL, SHARED, PIN_POS, t, starGloss, starQuotes, fallbackText } from './wedding.js';

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
