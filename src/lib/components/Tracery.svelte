<!--
  The stroked ornaments, in the shape Ornament.svelte already established for
  star/petal: one component, one `kind`. They are geometry, not artwork, so each
  is generated from its pattern rather than transcribed point by point.

  The page is a walk through the day, and these are its hours:

    sun     the day opening — a Persian solar disc, alternating long and short
            rays around a double ring. Leïla's side of the family.
    grass   the horizon it rises over, and sets behind. The wedding is on a lawn.
    zellij  a 2x2 lattice of eight-point stars over cross rules — Maghrebi
            tilework, Amine's side.
    fan     concentric quarter arcs springing from one corner, inside an L bracket
    moon    the day closing — the crescent and five-pointed star, drawn to the
            usual proportions: the star nested INSIDE the horns, not beside them.
            The Maghrebi half of the page is the zellij; this one is the hilal.

  NO vector-effect="non-scaling-stroke", unlike Arch.svelte. It would move
  stroke-dasharray into screen units while --dash stays in viewBox units, and the
  draw-on animation would break. Hairline weight comes from the viewBox scale.

  Colour is currentColor, so the caller sets it with a token class and it stays
  right in both themes.
-->
<script>
  let { kind = 'fan', class: klass = '' } = $props();

  // zellij: one square per cell, plus the same square turned about its centre.
  const CELLS = [14, 58].flatMap((x) => [14, 58].map((y) => ({ x, y })));
  const SIDE = 26;

  // fan: quarter arcs 18 units apart, each springing from the bottom-left corner.
  const RADII = [80, 62, 44, 26];

  // sun: twelve rays at 30 degrees, alternating long and short, which is what
  // separates a solar disc from a compass rose.
  const RAYS = Array.from({ length: 12 }, (_, i) => {
    const a = (i * 30 * Math.PI) / 180;
    const outer = i % 2 ? 34 : 45;
    /** @param {number} r */
    const at = (r) => [50 + r * Math.cos(a), 50 + r * Math.sin(a)];
    const [x1, y1] = at(26);
    const [x2, y2] = at(outer);
    return `M${x1.toFixed(1)} ${y1.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)}`;
  }).join(' ');

  // grass: lean and height sway on two incommensurable sine periods, so the row
  // never repeats and never reads as a comb.
  //
  // Sine rather than a modulo cycle, which is what the first two attempts used.
  // A cycle has to wrap, and the wrap is a jump from full lean one way to full
  // lean the other — so every Nth pair of blades crossed and the row read as a
  // line of crosses. What matters is not the maximum lean but the DIFFERENCE
  // between neighbours: keep it under the 3.85 spacing and no two can cross.
  // Here that difference peaks at 2.6·2·sin(0.4) ≈ 2.0.
  const BLADES = Array.from({ length: 26 }, (_, i) => {
    const x = 1.5 + i * 3.85;
    const h = 17 + 3.5 * Math.sin(i * 1.27);
    const lean = 2.6 * Math.sin(i * 0.8);
    /** @param {number} n */
    const f = (n) => n.toFixed(1);
    return `M${f(x)} 24 Q${f(x + lean * 0.4)} ${f(24 - h * 0.55)} ${f(x + lean)} ${f(24 - h)}`;
  }).join(' ');

  // moon: a five-pointed star, point up, nested in the crescent's opening.
  // Ten vertices alternating between the outer radius and 0.4 of it — much above
  // that and the arms fatten into a pentagon, much below and they turn to spikes.
  const STAR = Array.from({ length: 10 }, (_, i) => {
    const r = i % 2 ? 4.8 : 12;
    const a = ((-90 + i * 36) * Math.PI) / 180;
    return `${i ? 'L' : 'M'}${(61 + r * Math.cos(a)).toFixed(1)} ${(50 + r * Math.sin(a)).toFixed(1)}`;
  }).join(' ') + ' Z';

  // band: the footer divider — a rule threaded through eight lozenges. One set of
  // constants drives both halves so they cannot drift apart.
  const BAND = { count: 8, x0: 22, step: 39, width: 14 };
  const LOZENGES = Array.from({ length: BAND.count }, (_, i) => {
    const x = BAND.x0 + i * BAND.step;
    return `M${x} 8 l7 -6 l7 6 l-7 6 Z`;
  }).join(' ');

  // The rule is CUT at every lozenge rather than drawn straight through, so the
  // line passes behind them. Occluding it with a filled diamond would work too,
  // but the fill would have to know what colour it is sitting on, and this band
  // is used on the night field where that is a star pattern, not a flat colour.
  const RULE = [
    `M0 8 H${BAND.x0}`,
    ...Array.from(
      { length: BAND.count - 1 },
      (_, i) => `M${BAND.x0 + i * BAND.step + BAND.width} 8 H${BAND.x0 + (i + 1) * BAND.step}`
    ),
    `M${BAND.x0 + (BAND.count - 1) * BAND.step + BAND.width} 8 H320`
  ].join(' ');

  // Just over the longest subpath in each set, so the short ones finish early and
  // the long ones last. A --dash far longer than the path spends the first half
  // of the animation drawing nothing.
  const DASH = { zellij: 500, fan: 140, sun: 150, moon: 240, grass: 30, band: 45 };
</script>

{#if kind === 'zellij'}
  <svg viewBox="0 0 120 120" class={klass} aria-hidden="true">
    <g data-draw style="--dash:{DASH.zellij}" fill="none" stroke="currentColor" stroke-width="1.1">
      {#each CELLS as cell (`${cell.x}-${cell.y}`)}
        <rect x={cell.x} y={cell.y} width={SIDE} height={SIDE} />
        <rect
          x={cell.x}
          y={cell.y}
          width={SIDE}
          height={SIDE}
          transform="rotate(45 {cell.x + SIDE / 2} {cell.y + SIDE / 2})"
        />
      {/each}
      <path d="M0 49 H120 M0 93 H120 M49 0 V120 M93 0 V120" />
    </g>
  </svg>
{:else if kind === 'sun'}
  <svg viewBox="0 0 100 100" class={klass} aria-hidden="true">
    <g
      data-draw
      style="--dash:{DASH.sun}"
      fill="none"
      stroke="currentColor"
      stroke-width="1.6"
      stroke-linecap="round"
    >
      <circle cx="50" cy="50" r="15" />
      <circle cx="50" cy="50" r="21" />
      <path d={RAYS} />
    </g>
  </svg>
{:else if kind === 'moon'}
  <svg viewBox="0 0 100 100" class={klass} aria-hidden="true">
    <g
      data-draw
      style="--dash:{DASH.moon}"
      fill="none"
      stroke="currentColor"
      stroke-width="1.6"
      stroke-linejoin="round"
    >
      <!-- Two circles, r=30 at x=56 and r=25 at x=67, meeting at (74, 50±24).
           The outer arc takes the long way round (large-arc 1, sweep 0, so it
           runs down the left); the inner arc returns the long way too (1,1) so it
           bows back INTO the disc and carves the crescent. Offsetting the inner
           circle by only 11 against a radius of 30 is what makes it fat with
           horns that nearly close — the shape people actually recognise. -->
      <path d="M74 26 A30 30 0 1 0 74 74 A25 25 0 1 1 74 26 Z" />
      <!-- Nested in the opening, on the crescent's own axis. Beside the horns it
           reads as two unrelated marks rather than as one symbol. -->
      <path d={STAR} />
    </g>
  </svg>
{:else if kind === 'grass'}
  <svg viewBox="0 0 100 24" class={klass} aria-hidden="true" preserveAspectRatio="xMidYMax meet">
    <g
      data-draw
      style="--dash:{DASH.grass}"
      fill="none"
      stroke="currentColor"
      stroke-width="1.1"
      stroke-linecap="round"
    >
      <path d={BLADES} />
    </g>
  </svg>
{:else if kind === 'band'}
  <svg viewBox="0 0 320 16" class={klass} aria-hidden="true">
    <g
      data-draw
      style="--dash:{DASH.band}"
      fill="none"
      stroke="currentColor"
      stroke-width="1"
      stroke-linecap="round"
    >
      <path d={RULE} />
      <path d={LOZENGES} />
    </g>
  </svg>
{:else}
  <svg viewBox="0 0 80 80" class={klass} aria-hidden="true">
    <g
      data-draw
      style="--dash:{DASH.fan}"
      fill="none"
      stroke="currentColor"
      stroke-width="1"
      stroke-linecap="round"
    >
      {#each RADII as r (r)}
        <path d="M0 80 A{r} {r} 0 0 1 {r} {80 - r}" />
      {/each}
      <path d="M0 22 V80 H58" />
    </g>
  </svg>
{/if}
