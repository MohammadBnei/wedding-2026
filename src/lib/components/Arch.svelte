<!--
  The cusped (multifoil) arch head — the silhouette from the henna invitation, so
  the two events read as one set.

  Geometry: lobes ride a guiding ellipse from the springing line towards the
  crown, each a circular arc bulging outward so the joins read as cusps. The
  crown is NOT a lobe — the last stretch is an ogee converging to a sharp point,
  which is what keeps it from looking like a cloud.

  The viewBox ratio (100:34) matches the rendered box, since width:100% with no
  height gives an SVG its intrinsic ratio — so nothing is distorted at any width
  and the shape holds its proportions on every phone. Fill is currentColor so it
  inherits the surface token rather than naming a colour.
-->
<script>
  // The outline, springing line to springing line.
  const OUTLINE =
    'M 0 34 A 10.60 10.60 0 0 0 3.64 21.26 A 12.04 12.04 0 0 0 14.03 10.38 ' +
    'C 26.62 3.11 44.25 1.66 50 0 C 55.75 1.66 73.38 3.11 85.97 10.38 ' +
    'A 12.04 12.04 0 0 0 96.36 21.26 A 10.60 10.60 0 0 0 100 34';

  // Filled shape closes across the bottom; the dotted tracery must NOT, or it
  // draws a stray line straight across the base of the arch.
  const D = `${OUTLINE} L 100 34 Z`;
</script>

<svg
  class="block w-full text-surface"
  viewBox="0 0 100 34"
  preserveAspectRatio="none"
  fill="currentColor"
  aria-hidden="true"
>
  <path d={D} />
  <!-- The dotted line tracing the arch, straight off the henna invitation. Same
       path scaled about the springing line so it sits parallel inside the edge.
       non-scaling-stroke keeps the dots a fixed 1.4px every 7px no matter the
       card width, which is what lets the CSS-drawn dots down the card's sides
       (see +page.svelte) match it exactly at the join. -->
  <path
    d={OUTLINE}
    fill="none"
    stroke="var(--color-accent)"
    stroke-width="1.4"
    stroke-dasharray="0.1 7"
    stroke-linecap="round"
    vector-effect="non-scaling-stroke"
    opacity="0.55"
    transform="translate(50 34) scale(0.9 0.82) translate(-50 -34)"
  />
</svg>
