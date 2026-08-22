<!--
  The ornaments. One component, one `kind`.

  The page runs on three marks and only three — the eight-point star, the sprig
  (Sprig.svelte) and the girih field (static/girih.svg) — plus the sun and the
  moon, which are not decoration but the two ends of the day the page walks
  through, one appearance each:

    star    the eight-point khatim, SOLID, with a real hole cut through it.
            Amine's side, and the one mark that recurs: scattered across every
            content section (see Section.svelte), threaded through the dividers,
            standing as separators in the rail, on the RSVP panel, the 404 and
            the favicon.
    sun     the day opening — a Persian solar disc, alternating long and short
            rays around a double ring. Leïla's side of the family.
    moon    the day closing — the crescent and five-pointed star, drawn to the
            usual proportions: the star nested INSIDE the horns, not beside them.
    band    the footer divider — a rule threaded through eight stars.

  A `fan` of quarter arcs, a row of `grass` blades and a `zellij` lattice used to
  live here too. The fan belonged to no tradition; the grass was a second
  botanical vocabulary next to Sprig's; and the lattice was the star arranged on
  a grid, which the scatter in Section.svelte replaced — four stars pinned to
  rules read as a tile sample, and the same four thrown across the box read as
  ornament.

  The geometry itself lives in $lib/tracery.js rather than here, because
  scripts/make-og.js draws the same marks on the social card and cannot import a
  component. This file is only the presentation: the svg box, the stroke weight,
  and the draw-on.

  `star` is the exception to the draw-on: it is the one kind that rests, because
  it is scattered by the dozen and forty marks drawing themselves in at once is a
  page that will not settle.

  It is also the one kind that MAY use vector-effect="non-scaling-stroke", for
  the same reason — with no stroke-dasharray to put out of step, the hairline can
  stay a hairline whether it is drawn at 10px or at 44px. Nothing else here can
  do that; see the note below.

  NO vector-effect="non-scaling-stroke" on anything that draws itself on, unlike
  Arch.svelte. It would move stroke-dasharray into screen units while --dash
  stays in viewBox units, and the animation would break. For those, hairline
  weight comes from the viewBox scale.

  Colour is currentColor, so the caller sets it with a token class and it stays
  right in both themes.
-->
<script>
  import {
    star,
    SUN_RAYS,
    MOON_CRESCENT,
    MOON_STAR,
    BAND_RULE,
    BAND_STARS,
    DASH
  } from '$lib/tracery.js';

  /**
   * `small` and `fill` exist only for `kind="star"`, and only because two
   * callers used to hand-draw their own copy of it rather than ask for one.
   *
   * `small` is not a style choice, it is the stroke margin. The stroke is
   * non-scaling, so at a 10px render a 1.3px line is 13% of the mark and half of
   * it falls OUTSIDE the path — a star drawn to R/box 0.95 loses its points to
   * the viewBox clip. The small geometry pulls the radius in to 0.90 and the
   * weight down to 1.1, which is what the divider and the timeline stops were
   * already doing by hand (at 5.4 and 5.5, drifted by exactly the 1px that
   * Button.svelte's header warns about).
   *
   * `fill` is for a star sitting ON something: the timeline rail runs behind its
   * stops and would otherwise show through the middle.
   *
   * @type {{ kind?: 'star' | 'sun' | 'moon' | 'band', class?: string,
   *          small?: boolean, fill?: string }}
   */
  let { kind = 'star', class: klass = '', small = false, fill = 'none' } = $props();
</script>

{#if kind === 'sun'}
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
      stroke-linejoin="round"
      stroke-width="1.6"
    >
      <path d={MOON_CRESCENT} />
      <path d={MOON_STAR} />
    </g>
  </svg>
{:else if kind === 'band'}
  <svg viewBox="0 0 320 16" class={klass} aria-hidden="true">
    <g
      data-draw
      style="--dash:{DASH.band}"
      fill="none"
      stroke="currentColor"
      stroke-linecap="round"
      stroke-width="1"
    >
      <path d={BAND_RULE} />
      <path d={BAND_STARS} />
    </g>
  </svg>
{:else}
  <!-- Outline only. Filled, with the centre punched out, it read as a gear:
       eight teeth around a hole is a cog before it is a star. Drawn as a line it
       is unmistakably the khatim, and it sits with the rest of the page, which
       is line-work throughout.

       R is 38 in a box of 80, not 40: half the stroke falls outside the path, so
       a star drawn to the edge loses its points to the viewBox. -->
  {@const box = small ? 12 : 80}
  {@const r = small ? 5.4 : 38}
  <svg viewBox="0 0 {box} {box}" class={klass} {fill} aria-hidden="true">
    <path
      d={star(box / 2, box / 2, r)}
      stroke="currentColor"
      stroke-width={small ? 1.1 : 1.3}
      vector-effect="non-scaling-stroke"
    />
  </svg>
{/if}
