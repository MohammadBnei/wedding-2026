<!--
  A leaf spray, taken from the botanical borders on the henna invitation.

  Leaves are placed along a stem by formula rather than drawn one by one: each is
  the same pointed-oval path, positioned along a quadratic curve, rotated to the
  stem's tangent and scaled down towards the tip. That keeps it one small path
  plus a loop instead of a hand-tuned blob of coordinates, and lets `leaves`
  change the density without redrawing anything.

  Colour is currentColor throughout, so it takes whatever token the caller sets
  and stays correct in both themes.
-->
<script>
  let { leaves = 7, flip = false, class: klass = '' } = $props();

  // Stem: quadratic from (4,60) to (58,6), bowing up-left.
  const P0 = [4, 60], P1 = [10, 22], P2 = [58, 6];
  const at = (t) => [
    (1 - t) ** 2 * P0[0] + 2 * (1 - t) * t * P1[0] + t ** 2 * P2[0],
    (1 - t) ** 2 * P0[1] + 2 * (1 - t) * t * P1[1] + t ** 2 * P2[1]
  ];
  const tangent = (t) => {
    const dx = 2 * (1 - t) * (P1[0] - P0[0]) + 2 * t * (P2[0] - P1[0]);
    const dy = 2 * (1 - t) * (P1[1] - P0[1]) + 2 * t * (P2[1] - P1[1]);
    return (Math.atan2(dy, dx) * 180) / Math.PI;
  };

  // One leaf: a pointed oval from the origin along +x.
  const LEAF = 'M0 0 Q7 -5 15 0 Q7 5 0 0 Z';

  const placed = $derived(
    Array.from({ length: leaves }, (_, i) => {
      const t = 0.12 + (i / (leaves - 1)) * 0.82;
      const [x, y] = at(t);
      const side = i % 2 === 0 ? -1 : 1;
      const scale = 0.95 - t * 0.45;
      return { x, y, rot: tangent(t) + side * 52, scale };
    })
  );

  const stem = `M${P0[0]} ${P0[1]} Q${P1[0]} ${P1[1]} ${P2[0]} ${P2[1]}`;
</script>

<svg
  viewBox="0 0 64 64"
  fill="currentColor"
  class="{klass} {flip ? '-scale-x-100' : ''}"
  aria-hidden="true"
>
  <path d={stem} fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" />
  {#each placed as l, i (i)}
    <path d={LEAF} transform="translate({l.x} {l.y}) rotate({l.rot}) scale({l.scale})" />
  {/each}
</svg>
