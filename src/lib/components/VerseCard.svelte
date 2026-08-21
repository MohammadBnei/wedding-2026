<!--
  The welcome card: the couple's line about the two families, and under it the
  verse it is pointing at — Qur'an 78:8, per issue #11.

  It replaced a 2x2 grid of the four countries. The grid said the same thing as
  `welcome2` immediately above it, twice over; the verse says it once, and says
  it better. The countries survive as bot facts (see chat-prompt.js), just not
  as a second list a guest has to read.

  `gloss` is EMPTY in Arabic and Persian — nothing to translate for someone
  already reading the script. Same rule the door's `salamGloss` follows.

  Self-contained: it owns its corner tracery, because the corner belongs to this
  panel's box and the page has no business knowing about it.
-->
<script>
  import Tracery from './Tracery.svelte';

  let { title, verse, gloss, reference } = $props();
</script>

<figure
  class="relative isolate mx-auto flex w-full max-w-xl flex-col items-center gap-3.5 overflow-hidden bg-surface-alt px-4.5 py-6.5 text-center"
>
  <Tracery
    class="pointer-events-none absolute start-0 top-0 -z-10 w-14 -scale-y-100 text-gold opacity-40"
  />
  <p class="font-display text-[17px] italic text-ink">{title}</p>

  <span class="h-[5px] w-[5px] rotate-45 bg-gold" aria-hidden="true"></span>

  <!-- dir=rtl + lang=ar regardless of the page locale: the آية is Arabic in all
       four, exactly like SHARED.names.arabic and the motto in the rail. -->
  <blockquote dir="rtl" lang="ar" class="font-arabic text-xl leading-loose text-gold">
    {verse}
  </blockquote>

  {#if gloss}
    <figcaption class="text-[13px] leading-relaxed font-light text-ink-muted text-pretty">
      {gloss}
    </figcaption>
  {/if}
  <p class="caps-wide text-[10px] font-light text-accent">{reference}</p>
</figure>
