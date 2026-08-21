<!--
  Where the two families come from. Four countries, so a 2x2 grid rather than the
  row of three the design's own heading text had outgrown.

  Self-contained: it owns its corner tracery, because the corner belongs to this
  panel's box and the page has no business knowing about it.
-->
<script>
  import Tracery from './Tracery.svelte';

  let { title, items } = $props();
</script>

<div
  class="relative isolate mx-auto flex w-full max-w-xl flex-col items-center gap-3.5 overflow-hidden bg-surface-alt px-4.5 py-6.5 text-center"
>
  <Tracery
    class="pointer-events-none absolute start-0 top-0 -z-10 w-14 -scale-y-100 text-gold opacity-40"
  />
  <p class="font-display text-[17px] italic text-ink">{title}</p>
  <ul class="grid w-full grid-cols-2 gap-x-2.5 gap-y-3.5">
    {#each items as origin (origin.country)}
      <li class="flex flex-col items-center gap-[3px]">
        <span class="caps-wide text-[10px] font-light text-accent">{origin.country}</span>
        <span class="h-[5px] w-[5px] rotate-45 bg-gold" aria-hidden="true"></span>
        <span class="text-xs leading-relaxed font-light text-ink-muted">{origin.cities}</span>
      </li>
    {/each}
  </ul>
</div>
