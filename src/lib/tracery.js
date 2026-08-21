/**
 * The ornament geometry, as plain data.
 *
 * Split out of Tracery.svelte because scripts/make-og.js draws the same marks on
 * the social card and cannot import a component. Everything here is a pure
 * function of constants — no Svelte, no $lib alias — so a bun script and a
 * browser bundle can both read it, and the card cannot drift from the page.
 */

/** zellij: one square per cell, plus the same square turned about its centre. */
export const CELLS = [14, 58].flatMap((x) => [14, 58].map((y) => ({ x, y })));
export const SIDE = 26;
/** The cross rules the lattice sits on. */
export const ZELLIJ_RULES = 'M0 49 H120 M0 93 H120 M49 0 V120 M93 0 V120';

/** fan: quarter arcs 18 units apart, each springing from the bottom-left corner. */
export const RADII = [80, 62, 44, 26];
export const FAN_BRACKET = 'M0 22 V80 H58';

/**
 * sun: twelve rays at 30 degrees, alternating long and short, which is what
 * separates a solar disc from a compass rose.
 */
export const SUN_RAYS = Array.from({ length: 12 }, (_, i) => {
  const a = (i * 30 * Math.PI) / 180;
  const outer = i % 2 ? 34 : 45;
  /** @param {number} r */
  const at = (r) => [50 + r * Math.cos(a), 50 + r * Math.sin(a)];
  const [x1, y1] = at(26);
  const [x2, y2] = at(outer);
  return `M${x1.toFixed(1)} ${y1.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)}`;
}).join(' ');

/**
 * moon: two circles, r=30 at x=56 and r=25 at x=67, meeting at (74, 50±24). The
 * outer arc takes the long way round (large-arc 1, sweep 0, so it runs down the
 * left); the inner arc returns the long way too (1,1) so it bows back INTO the
 * disc and carves the crescent. Offsetting the inner circle by only 11 against a
 * radius of 30 is what makes it fat with horns that nearly close.
 */
export const MOON_CRESCENT = 'M74 26 A30 30 0 1 0 74 74 A25 25 0 1 1 74 26 Z';

/**
 * The five-pointed star nested in the crescent's opening. Ten vertices
 * alternating between the outer radius and 0.4 of it — much above that and the
 * arms fatten into a pentagon, much below and they turn to spikes.
 */
export const MOON_STAR =
  Array.from({ length: 10 }, (_, i) => {
    const r = i % 2 ? 4.8 : 12;
    const a = ((-90 + i * 36) * Math.PI) / 180;
    return `${i ? 'L' : 'M'}${(61 + r * Math.cos(a)).toFixed(1)} ${(50 + r * Math.sin(a)).toFixed(1)}`;
  }).join(' ') + ' Z';

/**
 * grass: lean and height sway on two incommensurable sine periods, so the row
 * never repeats and never reads as a comb.
 *
 * Sine rather than a modulo cycle. A cycle has to wrap, and the wrap is a jump
 * from full lean one way to full lean the other — so every Nth pair of blades
 * crossed and the row read as a line of crosses. What matters is not the maximum
 * lean but the DIFFERENCE between neighbours: keep it under the 3.85 spacing and
 * no two can cross. Here that difference peaks at 2.6·2·sin(0.4) ≈ 2.0.
 */
export const GRASS_BLADES = Array.from({ length: 26 }, (_, i) => {
  const x = 1.5 + i * 3.85;
  const h = 17 + 3.5 * Math.sin(i * 1.27);
  const lean = 2.6 * Math.sin(i * 0.8);
  /** @param {number} n */
  const f = (n) => n.toFixed(1);
  return `M${f(x)} 24 Q${f(x + lean * 0.4)} ${f(24 - h * 0.55)} ${f(x + lean)} ${f(24 - h)}`;
}).join(' ');

/** band: the footer divider — a rule threaded through eight lozenges. */
const BAND = { count: 8, x0: 22, step: 39, width: 14 };

export const BAND_LOZENGES = Array.from(
  { length: BAND.count },
  (_, i) => `M${BAND.x0 + i * BAND.step} 8 l7 -6 l7 6 l-7 6 Z`
).join(' ');

/**
 * The rule is CUT at every lozenge rather than drawn straight through, so the
 * line passes behind them. Occluding it with a filled diamond would work too,
 * but the fill would have to know what colour it is sitting on, and this band is
 * used on the night field where that is a star pattern, not a flat colour.
 */
export const BAND_RULE = [
  `M0 8 H${BAND.x0}`,
  ...Array.from(
    { length: BAND.count - 1 },
    (_, i) => `M${BAND.x0 + i * BAND.step + BAND.width} 8 H${BAND.x0 + (i + 1) * BAND.step}`
  ),
  `M${BAND.x0 + (BAND.count - 1) * BAND.step + BAND.width} 8 H320`
].join(' ');

/**
 * Just over the longest subpath in each set, so the short ones finish early and
 * the long ones last. A --dash far longer than the path spends the first half of
 * the animation drawing nothing.
 */
export const DASH = { zellij: 500, fan: 140, sun: 150, moon: 240, grass: 30, band: 45 };
