<!--
  The arch — the hero's head and the door's frame, one component, one curve.

  The geometry is $lib/arch.js, because Door.svelte draws its leaf panels from
  the same moorish() at a smaller scale and a component cannot be imported for
  its numbers alone.

  Two props, and between them they cover both callers:

    inverse  fill the SPANDRELS instead of the opening — the box minus the arch.
             Laid over something in the background's own colour, that is what
             cuts it to the curve; it is how the door's leaves become arched
             without a clip-path.
    foot     how far the jambs run below the springing line, in viewBox units.
             0 is the hero, which is a head sitting on a card whose height is
             whatever its text comes to and which draws its own sides in CSS.
             The door passes the rest of its box and gets jambs and a threshold.

  NO preserveAspectRatio="none". It used to have it, and stretching this curve is
  what made the door out of it read as a rounded rectangle. The svg is `w-full`
  and takes its height from the viewBox; a caller that wants it shorter has to
  make it narrower.

  Colour is currentColor for the fill and --color-arch-line for the frame, so
  the caller sets both with token classes and they stay right in both themes.
-->
<script>
  import { ARCH, CX } from '$lib/arch.js';

  let { inverse = false, foot = 0, class: klass = 'text-surface' } = $props();

  const L = CX - ARCH.narrow;
  const R = CX + ARCH.narrow;

  const H = $derived(ARCH.spring + foot);

  const D = $derived(
    inverse
      ? `M0 0 H100 V${H} H0 Z ${ARCH.head} V${H} H${L} Z`
      : `${ARCH.head} V${H} H${L} Z`
  );

  // The frame is drawn ON the outline rather than inset from it, so there is
  // nothing for the two to drift apart by. It was a dotted hairline; it is a
  // solid 3px now, because a doorway wants a frame with some timber in it.
  const TRACERY = $derived(
    foot
      ? `${ARCH.head} M${L} ${ARCH.spring} V${H} M${R} ${ARCH.spring} V${H} M${L} ${H} H${R}`
      : ARCH.head
  );
</script>

<svg class="block w-full {klass}" viewBox="0 0 100 {H}" fill="currentColor" aria-hidden="true">
  <path d={D} fill-rule="evenodd" />
  <path
    d={TRACERY}
    fill="none"
    stroke="var(--color-arch-line)"
    stroke-width="3"
    stroke-linejoin="round"
    stroke-linecap="round"
    vector-effect="non-scaling-stroke"
  />
</svg>
