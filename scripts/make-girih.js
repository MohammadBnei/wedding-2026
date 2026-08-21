/**
 * Builds static/girih.svg — the strapwork tile behind every night field.
 *
 *   node scripts/make-girih.js
 *
 * No dependency and no browser: this is geometry, and it draws the same thing
 * every time.
 *
 * WHAT IT DRAWS
 *
 * The classic periodic girih: regular decagons packed edge to edge with a bowtie
 * in each gap. Both are girih tiles proper, and the strapwork is the standard
 * construction — from the midpoint of every tile edge, two lines at ANGLE to
 * that edge, run out to a length fixed per tile type. Neighbouring tiles each
 * contribute two, so four meet as a crossing over every shared edge and the
 * straps run on from tile to tile. That rule, and the tables it needs, are
 * girihjs's:
 *
 *   github.com/jankovicsandras/girihjs — Unlicense, public domain
 *
 * WHY IT IS BUILT AND NOT SAMPLED
 *
 * The first version drove girihjs itself and cropped a window out of its output.
 * That cannot tile, and choosing the window better does not help: girihjs fills
 * the plane by random heuristic, and a search over its output for a translation
 * mapping the pattern onto itself found nothing above a 50% vertex match. So
 * every edge of every crop cut straps in half, and the cuts showed as broken
 * lines on a 380px grid.
 *
 * Mirroring the crop into a 2x2 block fixed the cuts — a reflection always meets
 * its original — but bought worse: the reflection axes read as kaleidoscope
 * seams and the crop's own density variation doubled into visible blotches.
 *
 * A PERIODIC tiling has neither problem, because the tile IS a period. A strap
 * leaving the right edge is the same strap entering at the left, same height,
 * same angle. Nothing is cut and nothing is mirrored.
 *
 * THE LATTICE
 *
 * Decagon centres sit on a rhombic lattice: two vectors of length 2*apothem at
 * 72 degrees, so each decagon meets four neighbours edge to edge. The area left
 * over per lattice cell is 1.3143 against a decagon's 7.6942 in a cell of
 * 9.0085 — and 1.3143 is the bowtie's area exactly, which is what makes this
 * tiling close rather than merely nearly close.
 *
 * A CSS background needs a rectangle and the lattice is rhombic, so the cell
 * used is the orthogonal pair inside it: u1 = A+B and u2 = A-B, perpendicular
 * because |A| = |B|. The rectangle they span is twice the rhombic cell — two
 * decagons and two bowties to a tile.
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const OUT = fileURLToPath(new URL('../static/girih.svg', import.meta.url));

/*
 * The golden ratio, which is not decoration here — it is what tenfold symmetry
 * is made of, and every proportion below reduces to it:
 *
 *     a decagon's circumradius   = phi         sides   (exactly)
 *     its apothem                = sqrt(phi + 3/4)     (exactly)
 *     this tile's height         = phi + 2     sides   (exactly)
 *     its width                  = phi * sqrt(4phi + 3)
 *
 * The first two are asserted below against their trigonometric forms rather than
 * taken on trust.
 */
const PHI = (1 + Math.sqrt(5)) / 2;

/* Interior angles in units of 36 degrees, and how far a strap runs from an edge
   midpoint as a fraction of the side.

   The angles are girihjs's. The lengths are girihjs's table taken back to what
   it is a rounding of: it lists 0.96, 0.61 and 0.38 for the decagon, hexagon and
   bowtie, and 0.61 and 0.38 are 1/phi and 1/phi squared to three places. So the
   table is a phi ladder that was written down as decimals, and these are the
   rungs themselves. */
const TILE_ANGLES = { decagon: [4, 4, 4, 4, 4, 4, 4, 4, 4, 4], bowtie: [2, 2, 6, 2, 2, 6] };
const STRAP_LEN = { decagon: 1, bowtie: 1 / PHI ** 2 };

/* ─── the knobs ──────────────────────────────────────────────────────────
   SIDE   tile side in px. The decagon is 3.08 sides across, so this sets the
          motif size: 48 puts a rosette at about 150px.
   ANGLE  degrees off the edge that a strap leaves its midpoint, and the one
          number that changes the pattern's character rather than its size. 54
          is the canonical girih angle and gives ten-point rosettes. Lower opens
          them out and flattens the crossings; higher closes them into tighter
          stars.
   Both are safe to change: the tiling is periodic whatever they are, because
   neither touches where the tiles sit. */
const SIDE = 48;
const ANGLE = 54;

/* Gold and its alpha are baked in: an SVG loaded as a background-image is an
   isolated document and cannot read app.css's tokens. This is the gold-soft
   token, which has no dark override, so it cannot fall out of step. The alpha is
   set by contrast, not by taste — see the note in src/app.css. */
const STROKE = { color: '#d9bc6a', width: 3, opacity: 0.09 };

const rad = (deg) => (deg * Math.PI) / 180;

/** Walk a tile's outline: step one side, turn by 180 - angle*36, repeat. */
function outline(kind, heading = 0) {
  const angles = TILE_ANGLES[kind];
  const points = [];
  let x = 0;
  let y = 0;
  for (let i = 0; i < angles.length; i++) {
    points.push([x, y]);
    x += Math.cos(rad(heading)) * SIDE;
    y += Math.sin(rad(heading)) * SIDE;
    heading += 180 - angles[(i + 1) % angles.length] * 36;
  }
  return points;
}

/** The girih proper: two lines off each edge midpoint, at ANGLE to the edge. */
function straps(points, len) {
  const out = [];
  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    const edge = Math.atan2(x2 - x1, y2 - y1);
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    for (const deg of [ANGLE, 180 - ANGLE]) {
      const a = Math.PI / 2 - edge + rad(deg);
      out.push([mx, my, mx + Math.cos(a) * SIDE * len, my + Math.sin(a) * SIDE * len]);
    }
  }
  return out;
}

const centre = (p) => p.reduce((a, q) => [a[0] + q[0] / p.length, a[1] + q[1] / p.length], [0, 0]);

/** Move a tile so its centroid lands on `to`. */
function place(points, to) {
  const c = centre(points);
  return points.map(([x, y]) => [x - c[0] + to[0], y - c[1] + to[1]]);
}

/* Both of these are exact in phi; the trig is here only to prove it. */
const CIRCUMRADIUS = SIDE * PHI;
const APOTHEM = SIDE * Math.sqrt(PHI + 3 / 4);
for (const [name, phiForm, trigForm] of [
  ['circumradius', CIRCUMRADIUS, SIDE / (2 * Math.sin(Math.PI / 10))],
  ['apothem', APOTHEM, SIDE / (2 * Math.tan(Math.PI / 10))]
]) {
  if (Math.abs(phiForm - trigForm) > 1e-9) throw new Error(`${name}: ${phiForm} != ${trigForm}`);
}
const A = [2 * APOTHEM, 0];
const B = [2 * APOTHEM * Math.cos(rad(72)), 2 * APOTHEM * Math.sin(rad(72))];

/* Where the bowtie sits inside each lattice cell, and how far it is turned —
   both solved for, by sampling the area the decagons leave and searching the
   orientations that fill it. This one covers 99.8% of that area; the rest is
   sampling noise on the boundary. */
const BOWTIE_AT = [0.6539, 0.4756];
const BOWTIE_TURN = 126;

/* Spin the whole pattern so u1 lies on +x, which makes the period upright. */
const u1 = [A[0] + B[0], A[1] + B[1]];
const u2 = [A[0] - B[0], A[1] - B[1]];
const SPIN = -Math.atan2(u1[1], u1[0]);
const spin = ([x, y]) => [
  x * Math.cos(SPIN) - y * Math.sin(SPIN),
  x * Math.sin(SPIN) + y * Math.cos(SPIN)
];

const W = Math.hypot(...u1);
const H = Math.hypot(...u2);

/* Every tile whose centroid falls near the rectangle. The margin is a decagon
   width, so nothing reaching into the rectangle is missed; the viewBox clips the
   overhang and the neighbouring tile redraws it identically. */
const MARGIN = 4 * APOTHEM;
const span = Math.ceil((Math.max(W, H) + 2 * MARGIN) / APOTHEM);
const segments = [];

for (let i = -span; i <= span; i++) {
  for (let j = -span; j <= span; j++) {
    const cell = [i * A[0] + j * B[0], i * A[1] + j * B[1]];
    const here = [
      ['decagon', cell, 0],
      [
        'bowtie',
        [cell[0] + BOWTIE_AT[0] * 2 * APOTHEM, cell[1] + BOWTIE_AT[1] * 2 * APOTHEM],
        BOWTIE_TURN
      ]
    ];
    for (const [kind, at, heading] of here) {
      const c = spin(at);
      if (c[0] < -MARGIN || c[0] > W + MARGIN || c[1] < -MARGIN || c[1] > H + MARGIN) continue;
      segments.push(...straps(place(outline(kind, heading), at).map(spin), STRAP_LEN[kind]));
    }
  }
}

const f = (n) => n.toFixed(2);
const d = segments.map(([x1, y1, x2, y2]) => `M${f(x1)} ${f(y1)}L${f(x2)} ${f(y2)}`).join('');

// No double hyphen anywhere in the comment below: XML forbids it inside one, and
// a malformed SVG still renders when inlined into HTML while failing silently as
// a background-image. Which is why the token is named in prose.
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${f(W)} ${f(H)}">
<!--
  Girih strapwork, the night field's background. Built, not drawn: run
  scripts/make-girih.js. Decagons packed edge to edge with a bowtie in each gap,
  which is a PERIODIC tiling, so this rectangle is an exact repeat and no strap
  is ever cut at its edge.

  Tile angles, strap lengths and the construction are from
  github.com/jankovicsandras/girihjs, released into the public domain under the
  Unlicense.

  Tiled by .night in src/app.css. Keep its background-size in this ratio
  (${f(W)} x ${f(H)}) or the pattern shears.

  The stroke is the gold-soft token's value, hard coded ON PURPOSE: an SVG loaded
  as a background-image is an isolated document and cannot read app.css.
-->
<g fill="none" stroke="${STROKE.color}" stroke-width="${STROKE.width}" stroke-opacity="${STROKE.opacity}" stroke-linecap="round">
  <path d="${d}"/>
</g>
</svg>
`;

writeFileSync(OUT, svg);
/* The tile's own proportions, checked against their closed forms in phi. */
for (const [name, got, want] of [
  ['width', W, SIDE * PHI * Math.sqrt(4 * PHI + 3)],
  ['height', H, SIDE * (PHI + 2)]
]) {
  if (Math.abs(got - want) > 1e-9) throw new Error(`tile ${name}: ${got} != ${want}`);
}

console.log(
  `girih.svg  ${segments.length} segments  ${(svg.length / 1024).toFixed(1)} KB` +
    `  tile ${f(W)}x${f(H)} = phi*sqrt(4phi+3) x (phi+2) sides` +
    `  side ${SIDE}  angle ${ANGLE}  (periodic)`
);
