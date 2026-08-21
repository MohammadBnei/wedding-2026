<!--
  The stroked ornaments, in the shape Ornament.svelte already established for
  star/petal: one component, one `kind`.

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
    band    the footer divider — a rule threaded through eight lozenges.

  The geometry itself lives in $lib/tracery.js rather than here, because
  scripts/make-og.js draws the same marks on the social card and cannot import a
  component. This file is only the presentation: the svg box, the stroke weight,
  and the draw-on.

  NO vector-effect="non-scaling-stroke", unlike Arch.svelte. It would move
  stroke-dasharray into screen units while --dash stays in viewBox units, and the
  draw-on animation would break. Hairline weight comes from the viewBox scale.

  Colour is currentColor, so the caller sets it with a token class and it stays
  right in both themes.
-->
<script>
  import {
    CELLS,
    SIDE,
    ZELLIJ_RULES,
    RADII,
    FAN_BRACKET,
    SUN_RAYS,
    MOON_CRESCENT,
    MOON_STAR,
    GRASS_BLADES,
    BAND_RULE,
    BAND_LOZENGES,
    DASH
  } from '$lib/tracery.js';

  let { kind = 'fan', class: klass = '' } = $props();
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
      <path d={ZELLIJ_RULES} />
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
      <path d={SUN_RAYS} />
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
      <path d={MOON_CRESCENT} />
      <path d={MOON_STAR} />
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
      <path d={GRASS_BLADES} />
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
      <path d={BAND_RULE} />
      <path d={BAND_LOZENGES} />
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
      <path d={FAN_BRACKET} />
    </g>
  </svg>
{/if}
