<!--
  The entrance.

  The site opens behind a closed door: a night curtain over the whole viewport with
  a cusped doorway in the middle, `السلام عليكم` above it and `بسم الله` carved one
  word per leaf. Tap anywhere and the leaves swing away, light comes through the
  opening, and the curtain lifts off the page that was already there behind it.

  It is server-rendered and starts SHUT. That is the whole reason there is no
  flash: an overlay mounted client-side lets the page paint for one frame first,
  and you see the site you were about to be welcomed into. The cost is that the
  server cannot know whether this visitor has been here before — which costs
  nothing here, because a returning visitor still gets the door, it just opens
  itself instead of waiting to be pushed.

  The doorway is Arch.svelte — the SAME arch and the same component as the hero's
  head, not a second curve that resembles it. `inverse` fills the spandrels and
  that is what cuts the leaves to it; `foot` runs the jambs and threshold down
  the rest of the box.

  The sunk panel on each leaf is ARCH.head drawn again in its own box — literally
  the same path, so it is that same arch in miniature: the door within the door
  those doors actually have.

  The leaves run the FULL height of the box and the spandrel fill is what cuts
  them to the arch, so the doorway is filled leaf to leaf the way a riad door is,
  rather than two rectangles parked under a decorated lintel. The meeting stile
  therefore runs into the apex, which is where the two halves of the arch meet.

  Studs and the knocker are placed by formula rather than drawn by hand, the way
  Sprig.svelte places its leaves, so density is one number rather than fifty
  coordinates. It all stays HERE rather than in $lib/tracery.js: that file exists
  so scripts/make-og.js can draw the same marks, and the door is not on the card.

  Scripting off: app.html hides `.door-scrim` outright in a <noscript>. Nothing
  here can run to open it, so it must never be there in the first place — the
  same contract reveal.js keeps for the sections it hides.
-->
<script>
  import { onMount } from 'svelte';
  import { SHARED } from '$lib/content/wedding.js';
  import { ARCH, CX, ring } from '$lib/arch.js';
  import Arch from './Arch.svelte';

  let { t } = $props();

  let shown = $state(true);
  let opening = $state(false);
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let timer;

  function open() {
    if (opening) return;
    opening = true;
    sessionStorage.setItem('door', '1');
    // Long enough for the swing and the lift to finish. Under reduced motion both
    // are already over — see .is-open in app.css for why that is still safe.
    timer = setTimeout(() => (shown = false), 1700);
  }

  onMount(() => {
    // Been here already this session: the door still plays, it just opens on its
    // own. The threshold is still crossed; it is not asked for twice.
    const seen = sessionStorage.getItem('door');
    // The failsafe is not paranoia — "tap anywhere" is discoverable only if you
    // read the hint, and nobody may be left standing outside because they didn't.
    timer = setTimeout(open, seen ? 600 : 7000);
    return () => clearTimeout(timer);
  });

  // Hold the page still underneath. Released the moment the door starts opening,
  // so the scroll the visitor makes as it lifts is not swallowed.
  $effect(() => {
    const el = document.documentElement;
    el.style.overflow = shown && !opening ? 'hidden' : '';
    return () => (el.style.overflow = '');
  });

  /* The box the doorway is drawn in. Must match .door's aspect-ratio in app.css,
     which cannot import this. The arch springs at 40.19, so the leaves get the
     other ~95 as straight jamb. */
  const BOX = 135;

  /*
   * The sunk panel is the SAME path, in its own box. Not a scaled copy and not a
   * second call to a generator — ARCH.head, drawn again at the size the leaf
   * gives it, so the panel cannot drift from the doorway around it.
   *
   * PAD is negative headroom in the viewBox: the crown sits on y = 0 and the
   * stud ring stands outside the arch, so without it the topmost studs are cut
   * off by the box they are drawn in.
   */
  const PAD = 9;
  const FOOT = 128;
  const PANEL_PATH = `${ARCH.head} V${FOOT} H${CX - ARCH.narrow} Z`;

  /* The moulding: the same path again, scaled about the middle of the springing
     line so it springs off the same height and insets on all four sides at once.
     The foot is solved back through that scale rather than guessed. */
  const MOULD = 0.87;
  const INNER_FOOT = ARCH.spring + (FOOT - 6 - ARCH.spring) / MOULD;
  const INNER_PATH = `${ARCH.head} V${INNER_FOOT.toFixed(2)} H${CX - ARCH.narrow} Z`;

  /*
   * The studs (clous). A ring outside the head, then rows down the jambs at the
   * same PITCH, so the hardware reads as one continuous run rather than two
   * features that happen to meet.
   */
  const PITCH = 14;
  const GAP = 5;

  const STUDS = (() => {
    const head = ring(GAP, 15);
    const jx = ARCH.narrow + GAP;
    const y0 = ARCH.spring + PITCH * 0.8;
    const y1 = FOOT - 6;
    const rows = Math.round((y1 - y0) / PITCH);
    const jambs = Array.from({ length: rows + 1 }, (_, i) => y0 + ((y1 - y0) * i) / rows).flatMap(
      (y) => [
        { x: CX - jx, y },
        { x: CX + jx, y }
      ]
    );
    return [...head, ...jambs];
  })();
</script>

{#snippet panel()}
  <svg
    class="door-panel"
    viewBox="0 {-PAD} 100 {FOOT + PAD + 4}"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d={PANEL_PATH} fill="none" stroke="currentColor" stroke-width="1.6" />
    <g
      transform="translate({CX} {ARCH.spring}) scale({MOULD}) translate({-CX} {-ARCH.spring})"
    >
      <path d={INNER_PATH} fill="none" stroke="currentColor" stroke-width="1.1" opacity="0.5" />
    </g>

    {#each STUDS as s, i (i)}
      <circle cx={s.x.toFixed(1)} cy={s.y.toFixed(1)} r="2.4" />
    {/each}

    <!-- The knocker: a ring hanging off its plate, sat in the head of the panel.
         Low enough to look hung rather than centred. -->
    <circle cx={CX} cy="12" r="3.6" />
    <circle cx={CX} cy="25" r="9" fill="none" stroke="currentColor" stroke-width="2.2" />
  </svg>
{/snippet}

{#if shown}
  <!--
    A <div>, not a <button>. This wraps two paragraphs, the door itself and an
    <svg> — block content, which a <button> may not legally contain — and its
    aria-label was overriding the accessible name computation, so the salam below
    and the basmala carved on the leaves were announced to nobody. The greeting IS
    the content of this screen; it has to be readable.

    Click-anywhere stays, because "tap anywhere" is what the hint promises. It is
    a pointer convenience layered over a real control: the hint at the foot is a
    proper <button>, so the keyboard and screen-reader path goes through that.
    open() is idempotent, so the click bubbling up from it is harmless.
  -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="door-scrim night" class:is-open={opening} onclick={open}>
    <!-- Amiri, the same face the hero says these words in. A display hand was
         tried here and dropped: the greeting outside and the greeting inside are
         one voice, and two faces for one phrase read as two. -->
    <p dir="rtl" lang="ar" class="font-arabic text-[clamp(22px,6vw,30px)] text-gold-soft">
      {SHARED.salam}
    </p>
    {#if t.salamGloss}
      <p class="caps-wide mt-2 text-micro font-light text-primary-faint">{t.salamGloss}</p>
    {/if}

    <div class="door mt-7">
      <div class="door-glow" aria-hidden="true"></div>

      <!-- Physical left/right, deliberately NOT logical start/end: a door's left
           leaf is on the left in every language, and the basmala's two words are
           placed to read right-to-left across the pair while it is shut. They sit
           in the arch head, where an inscription goes on a door of this kind —
           which is also what the zellij used to occupy. Carved, not captioned:
           the gloss that used to sit under the door is gone (issue #16). -->
      <div class="door-leaf door-leaf-l">
        <span dir="rtl" lang="ar" class="font-arabic">{SHARED.basmala[1]}</span>
        {@render panel()}
      </div>
      <div class="door-leaf door-leaf-r">
        <span dir="rtl" lang="ar" class="font-arabic">{SHARED.basmala[0]}</span>
        {@render panel()}
      </div>

      <!-- LAST in the DOM on purpose: .door is transform-style: flat, so paint
           order is what keeps a swinging leaf behind the arch rather than in front
           of it, and the spandrel fill is what cuts the leaves to the curve. -->
      <Arch
        inverse
        foot={BOX - ARCH.spring}
        class="door-frame text-primary-surface"
      />
    </div>

    <!-- The real control, and the only thing here that takes focus. It says what
         it does, so it needs no aria-label — the previous one repeated this exact
         string onto the wrapper and then hid everything else behind it.

         mt-9, not mt-3: it used to sit under the basmala gloss and its margin,
         and dropping that line without giving the space back walks the hint up
         into the threshold. -->
    <button type="button" class="caps mt-9 text-caption font-light text-gold-soft" onclick={open}>
      {t.doorHint}
    </button>
  </div>
{/if}
