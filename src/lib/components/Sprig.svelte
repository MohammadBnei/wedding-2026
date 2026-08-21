<!--
  The organic mark: a leaf spray, taken from the botanical borders on the henna
  invitation. The only botanical shape on the page — a separate row of grass
  blades used to draw the horizon, and a row of these draws it now, because one
  lawn did not need two vocabularies.

  The geometry is $lib/tracery.js, for the same reason the ornaments' is: the
  social card draws this horizon too and cannot import a component. This file is
  the svg box and the stroke weight, nothing else.

  Colour is currentColor throughout, so it takes whatever token the caller sets
  and stays correct in both themes.
-->
<script>
  import { sprig, SPRIG_STEM, LEAF } from '$lib/tracery.js';

  let { leaves = 7, flip = false, class: klass = '' } = $props();

  const placed = $derived(sprig(leaves));
</script>

<svg
  viewBox="0 0 64 64"
  fill="currentColor"
  class="{klass} {flip ? '-scale-x-100' : ''}"
  aria-hidden="true"
>
  <path
    d={SPRIG_STEM}
    fill="none"
    stroke="currentColor"
    stroke-width="1.1"
    stroke-linecap="round"
  />
  {#each placed as l, i (i)}
    <path d={LEAF} transform="translate({l.x} {l.y}) rotate({l.rot}) scale({l.scale})" />
  {/each}
</svg>
