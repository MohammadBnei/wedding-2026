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

  The arch is not redrawn. Arch.svelte owns that curve and `inverse` gives its
  negative — the box minus the head — laid over the leaves in the curtain's own
  colour, so their square top corners disappear and the opening reads as arched.

  Scripting off: app.html hides `.door-scrim` outright in a <noscript>. Nothing
  here can run to open it, so it must never be there in the first place — the
  same contract reveal.js keeps for the sections it hides.
-->
<script>
  import { onMount } from 'svelte';
  import { SHARED } from '$lib/content/wedding.js';
  import Arch from './Arch.svelte';
  import Tracery from './Tracery.svelte';

  let { t } = $props();

  let shown = $state(true);
  let opening = $state(false);
  let timer = 0;

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
</script>

{#if shown}
  <button
    type="button"
    class="door-scrim night"
    class:is-open={opening}
    aria-label={t.doorHint}
    onclick={open}
  >
    <p dir="rtl" lang="ar" class="font-arabic text-[clamp(22px,6vw,30px)] text-gold-soft">
      {SHARED.salam}
    </p>
    {#if t.salamGloss}
      <p class="caps-wide mt-2 text-[10px] font-light text-primary-faint">{t.salamGloss}</p>
    {/if}

    <div class="door mt-7">
      <div class="door-glow" aria-hidden="true"></div>

      <!-- The tympanum: the arch head is not part of the leaves, it is the fixed
           panel above them, and it carries the zellij. That is also what keeps the
           meeting stile from spiking out of the crown — the leaves start at the
           springing line, where a door actually starts. -->
      <Tracery kind="zellij" class="door-tympan text-gold-soft" />

      <!-- Physical left/right, deliberately NOT logical start/end: a door's left
           leaf is on the left in every language, and the basmala's two words are
           placed to read right-to-left across the pair while it is shut. -->
      <div class="door-leaf door-leaf-l">
        <span dir="rtl" lang="ar" class="font-arabic">{SHARED.basmala[1]}</span>
      </div>
      <div class="door-leaf door-leaf-r">
        <span dir="rtl" lang="ar" class="font-arabic">{SHARED.basmala[0]}</span>
      </div>

      <Arch inverse class="door-cap text-primary-surface" />
    </div>

    {#if t.basmalaGloss}
      <p class="caps-wide mt-6 text-[10px] font-light text-primary-faint">{t.basmalaGloss}</p>
    {/if}
    <p class="door-hint caps mt-3 text-[11px] font-light text-gold-soft">{t.doorHint}</p>
  </button>
{/if}
