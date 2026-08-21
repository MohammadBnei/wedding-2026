<script>
  import { page } from '$app/state';
  import { STR } from '$lib/content/wedding.js';
  import Section from '$lib/components/Section.svelte';
  import Button from '$lib/components/Button.svelte';
  import Tracery from '$lib/components/Tracery.svelte';
  import Flourish from '$lib/components/Flourish.svelte';

  // No `data` prop reaches +error.svelte — layout data arrives on page.data,
  // which IS populated for a 404 (no route matched; the layout load still ran).
  // The fallback only fires if the root layout load itself throws, and in that
  // case SvelteKit renders its own page rather than this one, so it is really
  // there to keep svelte-check happy about page.data being loosely typed.
  const t = $derived(page.data.t ?? STR.fr);
</script>

<div class="flex min-h-dvh flex-col items-center justify-center bg-surface">
  <Section>
    <div class="flex flex-col items-center gap-5 text-center">
      <Tracery kind="star" class="w-11 text-accent" />
      <p class="caps-wide text-[11px] font-light text-accent">{page.status}</p>
      <h1 class="font-display text-3xl text-ink">{t.lostTitle}</h1>
      <Flourish width="w-28" />
      <p class="max-w-sm text-[13px] leading-relaxed font-light text-ink-muted">{t.lostBody}</p>
      <Button href="/">{t.lostCta}</Button>
    </div>
  </Section>
</div>
