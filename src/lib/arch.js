/**
 * The arch, as plain data — the one curve this page is built on.
 *
 * Split out of Arch.svelte for the same reason $lib/tracery.js is split out of
 * Tracery.svelte: more than one caller needs the geometry and not just the
 * markup. Door.svelte draws the sunk panel on each leaf from HEAD too, so the
 * panel is the same curve as the doorway around it and not a second shape that
 * happens to look similar.
 *
 * HEAD is TRACED, not generated. It is the opening of the night arch in
 * vecteezy_arabian-landscapes-and-door-vectors_103311.svg at the repo root —
 * the reference this door was asked for — lifted out of the gold band that
 * draws it, reversed to run left springing → crown → right springing like every
 * other head path here, and normalised so the jambs land on x = 10 and 90 with
 * the crown on y = 0. It is not parametric and it should not be nudged by hand:
 * re-trace from the source if it has to change.
 *
 * Two generated shapes preceded it. A 100x34 outline stretched to whatever
 * height its caller needed is a rounded rectangle with two bumps. A solved
 * pointed horseshoe is a real arch but a plain one, and read as an egg at hero
 * size. The lobes are the identity here and they were not worth deriving when
 * the drawing already existed.
 */

export const CX = 50;

/* Half-width of the opening. The jambs are at CX +/- NARROW, straight, and the
   arch springs off the top of them — so anything lining up underneath (the
   door's two leaves, the hero card) is 80/100 of the arch's width, centred. */
export const NARROW = 40;

/** Where the lobes stop and the jambs begin, measured down from the crown. */
export const SPRING = 40.19;

const HEAD =
  'M10.0 40.19 C10.0 37.12 11.37 34.67 13.73 33.44 L14.37 33.11 L14.12 32.42 C13.16 29.73 ' +
  '13.62 26.79 15.3 24.6 C16.56 22.92 18.37 21.91 20.35 21.69 L21.06 21.61 L21.09 20.89 ' +
  'C21.2 18.2 22.63 15.76 24.85 14.3 C26.47 13.26 28.34 12.82 30.1 13.07 L30.78 13.18 ' +
  'L30.97 12.49 C31.52 10.65 32.76 9.14 34.52 8.18 C36.33 7.19 38.44 6.89 40.36 7.41 ' +
  'L40.86 7.55 L41.19 7.17 C41.98 6.29 43.08 5.6 43.96 5.05 C45.53 4.06 47.31 2.96 48.3 ' +
  '1.04 C48.63 0.41 49.29 0.0 50.0 0.0 C50.71 0.0 51.37 0.41 51.7 1.04 C52.69 2.96 54.47 ' +
  '4.09 56.04 5.05 C56.92 5.6 58.02 6.29 58.81 7.17 L59.14 7.55 L59.64 7.41 C61.56 6.89 ' +
  '63.67 7.19 65.48 8.18 C67.24 9.14 68.48 10.65 69.03 12.49 L69.22 13.18 L69.9 13.07 ' +
  'C71.66 12.82 73.53 13.26 75.15 14.3 C77.37 15.73 78.77 18.2 78.91 20.89 L78.94 21.61 ' +
  'L79.65 21.69 C81.63 21.88 83.41 22.92 84.7 24.6 C86.38 26.79 86.84 29.73 85.88 32.42 ' +
  'L85.63 33.11 L86.27 33.44 C88.63 34.67 90.0 37.12 90.0 40.19';

export const ARCH = { narrow: NARROW, spring: SPRING, head: HEAD };

/**
 * Points on an ellipse a fixed distance OUTSIDE the arch — where the studs go.
 * It follows the overall sweep and ignores the lobes, which is what a real row
 * of clous does: the hardware follows the frame, not every scallop.
 *
 * @param {number} gap
 * @param {number} count
 */
export function ring(gap, count) {
  return Array.from({ length: count }, (_, i) => {
    const t = (i * Math.PI) / (count - 1);
    return { x: CX - (NARROW + gap) * Math.cos(t), y: SPRING - (SPRING + gap) * Math.sin(t) };
  });
}
