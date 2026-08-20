<!--
  Four languages. Unlike the artifact, switching does NOT wipe the chat transcript —
  the transcript lives in Postgres keyed on the visitor cookie, not in component state.
-->
<script>
  import { invalidateAll } from '$app/navigation';
  import Chip from './Chip.svelte';
  import { LANGS } from '$lib/content/wedding.js';

  let { current, tone = 'on-primary' } = $props();

  async function pick(lang) {
    if (lang === current) return;
    await fetch('/api/prefs', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ lang })
    });
    await invalidateAll();
  }
</script>

<div class="flex gap-1.5" role="group" aria-label="Language">
  {#each LANGS as lang (lang)}
    <Chip
      {tone}
      selected={lang === current}
      onclick={() => pick(lang)}
      aria-label={lang.toUpperCase()}
      lang="en"
    >
      {lang.toUpperCase()}
    </Chip>
  {/each}
</div>
