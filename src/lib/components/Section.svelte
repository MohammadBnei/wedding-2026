<!--
  A content section. The artifact repeated `padding:30px 26px` and the 24px Bodoni
  title inline in five places.

  It also owns its own decoration now. Every section used to hand-place its
  ornaments — a lattice in one corner here, a sprig in another there, each with
  its own offsets — which meant five sections carrying eight elements between
  them and no two arranged alike. The rule is the same everywhere now, so it
  lives here once:

    a sprig at the top-start corner and another at the bottom-end corner,
    and a scatter of eight-point stars over the rest of the box.

  tone  'paper' (default surface) or 'alt' (the sand panel behind the chat)
  seed  what the scatter is drawn from. Deliberately NOT the title: seeding on
        copy would reshuffle every ornament on the page when a language is
        switched, and would move them again whenever a heading is reworded.
-->
<script>
  import { reveal } from '$lib/actions/reveal.js';
  import { RTL } from '$lib/content/wedding.js';
  import Sprig from './Sprig.svelte';
  import Tracery from './Tracery.svelte';

  // `fill`: cap the section at the viewport rather than force it there. It sizes
  // to its content and stops growing at 100dvh, at which point whatever is inside
  // marked to scroll takes over — no dead space when the content is short.
  let {
    title = '',
    tone = 'paper',
    id = undefined,
    seed = '',
    fill = false,
    quotes = [],
    hint = '',
    children
  } = $props();

  /*
   * Which quote star is open, or -1. ONE index rather than a flag per star, so
   * opening a second closes the first for nothing — the same shape GardenPlan's
   * `active` pin uses.
   */
  let open = $state(-1);

  /*
   * The golden ratio, which the page's own ornament is already built out of: the
   * girih behind every night field reduces to it exactly, down to the tile's own
   * height being phi + 2 sides (see scripts/make-girih.js). So the marks
   * scattered on the paper are proportioned by it too.
   */
  const PHI = (1 + Math.sqrt(5)) / 2;

  /*
   * One star per rung of a phi ladder, and there are exactly as many stars as
   * rungs — three sizes, each used once, rather than three rolls that might come
   * up the same. Starting at 13px the ladder lands on 13, 21 and 34: Fibonacci,
   * which is the same fact said another way.
   *
   * 13 is also the floor. These are drawn as outlines, and an outline needs room
   * a solid does not: much under that the eight points close up and it smudges.
   *
   * Weight falls as size rises, by the square root of the rung, so the big star
   * carries about as much ink as the small one and the three read as one texture
   * rather than as a blob and two specks.
   */
  const RUNGS = [1, PHI, PHI ** 2];
  const BASE = 13;
  const COUNT = RUNGS.length;

  /*
   * The corners the two sprigs stand in, as a share of the box — the stars keep
   * out of them, which is the whole reason they are named rather than inlined.
   * The bottom-end sprig is a phi step larger than the top-start one, so its
   * corner is a phi step deeper.
   *
   * Percent against a px-sized sprig is a deliberate approximation: a section
   * here runs anywhere from about 300px to 900px tall, so this is just right at
   * the short end and generous at the tall end. Generous is the safe direction —
   * it costs an empty corner, where mean would cost a star sitting on a leaf.
   */
  const KEEP = { x: 20, y: 15 };

  /*
   * Deterministic on purpose, and that is not a detail: Math.random() would draw
   * one scatter on the server and a different one in the browser, and a DOM that
   * does not match the markup it hydrates from is a hydration error, not a
   * cosmetic difference.
   *
   * So: a string hash into a small LCG. Same seed, same sky, every render.
   *
   * Positions are `inset-inline-start`, not `left`, so the whole scatter mirrors
   * with the sprigs under RTL rather than sliding out from under them — which is
   * also why KEEP can be tested against x directly and still hold in Arabic.
   *
   * The opacities are LOW, and low for a reason that is not taste: these sit
   * behind running body text on paper, which the corner ornaments they replaced
   * never did — a corner mark can be as strong as it likes because nothing is
   * read on top of it. If they are hard to see at a glance, they are doing their
   * job.
   *
   * The sizes are not small for the same reason. These are drawn as outlines,
   * and an outline needs room the way a solid does not: under about 14px the
   * eight points close up and it turns to a smudge. So the star gets its size
   * and gives back the weight — faint and legible beats sharp and muddy.
   */
  const STARS = $derived.by(() => {
    let s = 7;
    for (const ch of seed || id || 'section') s = (s * 31 + ch.charCodeAt(0)) >>> 0;
    const next = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);

    /** @type {{ x: number, y: number, size: number, rot: number, o: number }[]} */
    const out = [];
    // Rejection sampling: rejected for landing on a sprig, or for crowding a
    // star already placed. Without the second test the few points clump into a
    // cluster and read as a mistake rather than as a scatter.
    for (let guard = 0; out.length < COUNT && guard < 400; guard++) {
      const x = 4 + next() * 82;
      const y = 5 + next() * 83;
      if (x < KEEP.x && y < KEEP.y) continue;
      if (x > 100 - KEEP.x * PHI && y > 100 - KEEP.y * PHI) continue;
      if (out.some((o) => Math.abs(o.x - x) < 15 && Math.abs(o.y - y) < 11)) continue;
      const rung = RUNGS[out.length];
      out.push({ x, y, size: BASE * rung, rot: next() * 45, o: 0.2 / Math.sqrt(rung) });
    }
    /*
     * The two sprigs, drawn from the same stream AFTER the stars so that adding
     * this could not move a mark that was already placed.
     *
     * A phi half-step either way — 1.618^±0.5, so about 0.79x to 1.27x — which
     * is the same span the lg: breakpoint already moves them across, and keeps
     * the pair's own phi gap intact since both ends scale. Corner ornament at
     * quarter opacity: it is allowed to differ section to section, and the point
     * is that five sections stop looking stamped from one plate.
     *
     * The scale goes on the WRAPPER, never on <Sprig> itself — `flip` there is
     * `-scale-x-100`, and two `scale`s on one element is the last one winning.
     */
    const sprigs = [PHI ** (next() - 0.5), PHI ** (next() - 0.5)];

    return { out, sprigs };
  });

  const ORNAMENTS = $derived(STARS.out);

  /*
   * The quote stars do NOT join the scatter above, and that is not a taste
   * decision. app.css lifts every control in a section ABOVE the stars, so a
   * quote star that lands on a button is not merely awkward — it is unreachable,
   * and the quote behind it can never be opened by anyone. Scattered over the
   * box, two of the ten sat under a chat chip and a textarea at every viewport.
   *
   * So they live in the section's own vertical padding instead: the strip above
   * the heading and the strip below the last child, which is the only part of
   * the box guaranteed to hold no content. `py-8` is 32px against a 29px button,
   * so it fits, and `lg:py-12` only gives it more room.
   *
   * One per band, so two stars can never crowd each other either, and x is kept
   * to the middle half — clear of both corner sprigs at any width, without
   * needing to know how wide the section is.
   *
   * Its own LCG, seeded differently from the scatter's: sharing the stream would
   * tie a quote's position to an ornament's, and moving one would move the other.
   */
  const MARKS = $derived.by(() => {
    let s = 11;
    for (const ch of seed || id || 'section') s = (s * 31 + ch.charCodeAt(0)) >>> 0;
    const next = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);

    return quotes.map((/** @type {any} */ q, /** @type {number} */ i) => ({
      q,
      x: 25 + next() * 50,
      rot: next() * 45,
      // Alternating rather than random: with two quotes it guarantees one of
      // each, and a section that grows a third simply starts the cycle again.
      top: i % 2 === 0
    }));
  });

  /* 21px of star — the scatter's middle rung, big enough that the eight points
     stay open — plus the button's 4px padding either side, which is what carries
     the hit box over the 24px minimum a finger needs. */
  const MARK_PX = BASE * PHI + 8;
</script>

<svelte:window
  onkeydown={(e) => {
    if (e.key === 'Escape') open = -1;
  }}
/>

<!-- `relative` so a section can anchor its own ornaments. Deliberately NOT
     `overflow-hidden`: that would clip the focus ring in the chat panel.
     Ornaments are inset instead.

     `isolate` gives the section its own stacking context so the ornament layer
     marked -z-10 lands behind the TEXT but still in front of this section's own
     background. Without it that -z-10 escapes past <main>'s bg-surface and the
     ornaments vanish. -->
<section
  {id}
  use:reveal
  class="relative isolate flex flex-col gap-4 px-6 py-8 lg:px-10 lg:py-12 {tone === 'alt' ? 'bg-surface-alt' : ''} {fill
    ? 'max-h-dvh lg:max-h-none'
    : ''}"
>
  <!-- The ornament layer. `overflow-hidden` is safe HERE, unlike on the section
       itself: nothing in it can take focus, so there is no ring to clip — and it
       is what keeps a star near an edge from bleeding into the next section.

       A star is turned by up to 45deg and no further. Eight points every 45deg
       means the shape repeats at that angle: past it the scatter stops looking
       varied and starts looking like the same tilt twice. -->
  <div class="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
    <!-- The pair is a phi step apart: 64 and 104, or 80 and 128 at lg. The
         larger anchors the bottom-end corner, where a section's content has
         usually run out. -->
    <span
      class="absolute start-1 top-1 block h-16 w-16 text-gold opacity-25 lg:h-20 lg:w-20"
      style="scale:{STARS.sprigs[0].toFixed(3)}"
    >
      <Sprig class="h-full w-full" />
    </span>
    {#each ORNAMENTS as star, i (i)}
      <span
        class="absolute block text-gold"
        style="inset-inline-start:{star.x.toFixed(2)}%;top:{star.y.toFixed(2)}%;width:{star.size.toFixed(
          1
        )}px;rotate:{star.rot.toFixed(1)}deg;opacity:{star.o.toFixed(2)}"
      >
        <Tracery kind="star" class="w-full" />
      </span>
    {/each}
    <span
      class="absolute end-1 bottom-1 block h-26 w-26 text-gold opacity-25 lg:h-32 lg:w-32"
      style="scale:{STARS.sprigs[1].toFixed(3)}"
    >
      <Sprig flip class="h-full w-full" />
    </span>
  </div>

  <!-- The quote stars, in FRONT of the text rather than behind it. That is the
       only difference from the layer above, and it is why this one is neither
       `aria-hidden` nor `overflow-hidden`: the buttons take focus, and clipping
       would cut their focus ring — the same trap the <section> itself avoids.

       The layer keeps `pointer-events-none` and only the buttons take it back,
       so a star sitting over a paragraph still lets the paragraph be selected.
       A paragraph is all it may sit over: app.css lifts every control in a
       section to z-20, above the stars and below an open note, because a mark
       that eats a tap meant for the RSVP button is not decoration, it is a bug.

       Deliberately no z-index on the LAYER: it would make a stacking context and
       trap the note at the stars' depth, where a control would show through it.
       Star and note carry their own instead, in the section's own context.

       Nothing here exists without JavaScript, and that is acceptable where the
       door is not: this hides content that was never on the page to begin with,
       so a guest with scripting off loses an easter egg, not the invitation. -->
  <div class="pointer-events-none absolute inset-0">
    {#each MARKS as mark, i (i)}
      {@const q = quotes[i]}
      <!-- The button holds still and the star inside it breathes. Not a detail:
           an animated transform on the button itself moves the hit box, which is
           a target that drifts out from under a slow tap — and which Playwright
           refuses to click at all, since it never settles between two frames. -->
      <button
        type="button"
        class="quote-star pointer-events-auto absolute z-10 block p-1 text-gold hover:text-accent"
        style="inset-inline-start:{mark.x.toFixed(2)}%;{mark.top
          ? 'top'
          : 'bottom'}:2px;width:{MARK_PX.toFixed(1)}px;rotate:{mark.rot.toFixed(1)}deg"
        aria-label={hint}
        aria-expanded={open === i}
        aria-controls="{seed}-quote-{i}"
        onclick={() => (open = open === i ? -1 : i)}
      >
        <span class="breathes block" style="animation-delay:{(i * PHI).toFixed(2)}s">
          <Tracery kind="star" class="w-full" />
        </span>
      </button>

      <!-- Always in the DOM, `hidden` when shut, so `aria-controls` above always
           points at something real. It opens INTO the section, away from the band
           its star sits in — down from a top star, up from a bottom one — so it
           lands over the content rather than over the seam with the next section,
           which is the one place a section is not clipped and has no background
           of its own to sit on. -->
      <div
        id="{seed}-quote-{i}"
        hidden={open !== i}
        class="quote-note pointer-events-auto absolute z-30 flex flex-col gap-2 border-s-[3px] border-primary bg-surface-raise px-4 py-3.5 shadow-lg"
        style="{mark.x < 50
          ? `--note-start:${mark.x.toFixed(2)}%`
          : `--note-end:${(100 - mark.x).toFixed(2)}%`};{mark.top
          ? 'top'
          : 'bottom'}:{(MARK_PX + 8).toFixed(0)}px"
      >
        <!-- `lang` is the whole trick: app.css keys the typeface off `:lang()`,
             so Amiri, Vazirmatn and Mulish all arrive without a font class, and
             a French quote inside an Arabic page stays upright and set in Mulish.
             VerseCard hardcodes ar/rtl because it only ever carries the one آية. -->
        <blockquote
          lang={q.lang}
          dir={RTL.has(q.lang) ? 'rtl' : 'ltr'}
          class="text-body leading-loose text-gold"
        >
          {q.text}
        </blockquote>
        {#if q.gloss}
          <p class="text-note leading-relaxed font-light text-ink-muted text-pretty">{q.gloss}</p>
        {/if}
        <p class="caps-wide text-micro font-light text-accent">{q.ref}</p>
      </div>
    {/each}
  </div>

  {#if title}
    <h2 class="font-display text-2xl font-normal text-ink lg:text-3xl">{title}</h2>
  {/if}
  {@render children?.()}
</section>
