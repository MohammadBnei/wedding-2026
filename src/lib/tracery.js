/**
 * The ornament geometry, as plain data.
 *
 * Split out of Tracery.svelte because scripts/make-og.js draws the same marks on
 * the social card and cannot import a component. Everything here is a pure
 * function of constants — no Svelte, no $lib alias — so a bun script and a
 * browser bundle can both read it, and the card cannot drift from the page.
 * $lib/arch.js is the same split for the one curve the door is built on.
 *
 * The page runs on three marks and only three: the eight-point star (Maghrebi),
 * the sprig (organic), and the girih field in static/girih.svg (Persian, and the
 * only one that is a background rather than a shape). The sun and the moon below
 * are NOT a fourth and fifth — they are the two ends of the day the page walks
 * through, one appearance each, and they are the reason `band` is here too: it
 * is a rule, not a motif, and it now carries stars like everything else.
 */

/**
 * The eight-point star (khatim) — the Maghrebi mark, and the only one on the
 * page. Two overlapping squares as ONE outline rather than two shapes: eight
 * outer points every 45deg, and eight inner points where the squares' edges
 * cross.
 *
 * A square of side S has apothem S/2, and the crossing sits 22.5deg off it — so
 * the inner radius is (S/2)/cos(22.5) against an outer of S/sqrt(2), i.e. 0.7654
 * of it. Any other ratio is a different star: higher and the points blunt into
 * an octagon, lower and they thin into a compass rose.
 *
 * @param {number} cx
 * @param {number} cy
 * @param {number} R   distance from the centre to a point
 * @param {number} [rot] degrees, if it should not sit square to the box
 */
export const star = (cx, cy, R, rot = 0) =>
  Array.from({ length: 16 }, (_, i) => {
    const r = i % 2 ? R * 0.7654 : R;
    const a = ((rot + i * 22.5) * Math.PI) / 180;
    const f = (/** @type {number} */ n) => n.toFixed(2);
    return `${i ? 'L' : 'M'}${f(cx + r * Math.cos(a))} ${f(cy + r * Math.sin(a))}`;
  }).join(' ') + ' Z';

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
 * The sprig — the organic mark, and the only one on the page. A leaf spray taken
 * from the botanical borders on the henna invitation.
 *
 * Leaves are placed along the stem by formula rather than drawn one by one: each
 * is the same pointed-oval, positioned along a quadratic curve, rotated to the
 * stem's tangent and scaled down towards the tip. That keeps it one small path
 * plus a loop instead of a hand-tuned blob of coordinates, and lets `leaves`
 * change the density without redrawing anything.
 *
 * It lives here rather than in Sprig.svelte because this is where the page's
 * ornament geometry lives, the same split $lib/arch.js is — even though the
 * social card no longer draws a horizon out of it.
 *
 * It grows only on the paper column now. The night fields carry the girih, and
 * foliage laid over strapwork is two patterns arguing.
 */
const STEM = { p0: [4, 60], p1: [10, 22], p2: [58, 6] };

/** One leaf: a pointed oval from the origin along +x. */
export const LEAF = 'M0 0 Q7 -5 15 0 Q7 5 0 0 Z';

export const SPRIG_STEM = `M${STEM.p0[0]} ${STEM.p0[1]} Q${STEM.p1[0]} ${STEM.p1[1]} ${STEM.p2[0]} ${STEM.p2[1]}`;

/**
 * Where each leaf sits, and how it is turned and shrunk.
 *
 * @param {number} leaves
 */
export function sprig(leaves) {
  const { p0, p1, p2 } = STEM;
  /** @param {number} t */
  const at = (t) => [
    (1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t ** 2 * p2[0],
    (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t ** 2 * p2[1]
  ];
  /** @param {number} t */
  const tangent = (t) => {
    const dx = 2 * (1 - t) * (p1[0] - p0[0]) + 2 * t * (p2[0] - p1[0]);
    const dy = 2 * (1 - t) * (p1[1] - p0[1]) + 2 * t * (p2[1] - p1[1]);
    return (Math.atan2(dy, dx) * 180) / Math.PI;
  };

  return Array.from({ length: leaves }, (_, i) => {
    const t = 0.12 + (i / (leaves - 1)) * 0.82;
    const [x, y] = at(t);
    const side = i % 2 === 0 ? -1 : 1;
    return { x, y, rot: tangent(t) + side * 52, scale: 0.95 - t * 0.45 };
  });
}

/** band: the footer divider — a rule threaded through eight stars. */
const BAND = { count: 8, x0: 22, step: 39, width: 14 };

/* Same eight positions the lozenges had, so the rule's gaps still line up. The
   star is drawn to the half-width it replaces, which keeps the band's weight. */
export const BAND_STARS = Array.from({ length: BAND.count }, (_, i) =>
  star(BAND.x0 + i * BAND.step + BAND.width / 2, 8, BAND.width / 2)
).join(' ');

/**
 * The rule is CUT at every star rather than drawn straight through, so the line
 * passes behind them. Occluding it with a filled shape would work too, but the
 * fill would have to know what colour it is sitting on, and this band is used on
 * the night field where that is the girih, not a flat colour.
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
 *
 * No entry for the solid star: it is filled, and a draw-on means nothing to a
 * shape that has no line to travel.
 */
export const DASH = { sun: 150, moon: 240, band: 45 };
