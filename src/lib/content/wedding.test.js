import { expect, test } from 'bun:test';
import { STR, LANGS, SHARED, t, fallbackText } from './wedding.js';

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
    // GardenPlan indexes PIN_POS[i] and defaults to pins[2]; 4 is the only
    // length that is safe at both ends.
    expect(s.pins).toHaveLength(4);
    // Keyed {#each} blocks — a duplicate key is a runtime crash, not a warning.
    expect(new Set(s.chips.map((c) => c.q)).size).toBe(s.chips.length);
    expect(new Set(s.facts.map((f) => f.label)).size).toBe(s.facts.length);
    expect(new Set(s.schedule.map((x) => x.time)).size).toBe(s.schedule.length);
    // ics.js escapes , and ; so an unescaped SUMMARY would stop matching.
    expect(t(lang).icsSummary).not.toMatch(/[,;]/);
  }
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
