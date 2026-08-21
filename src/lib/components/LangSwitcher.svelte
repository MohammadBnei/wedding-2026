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
    // Dim the page for however long the round trip actually takes, rather than
    // for a fixed interval — see .lang-fade in app.css. The `finally` is the
    // point: a failed fetch must not leave the site greyed out for good.
    const root = document.documentElement;
    root.dataset.langSwitching = '';
    try {
      await fetch('/api/prefs', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ lang })
      });
      await invalidateAll();
    } finally {
      delete root.dataset.langSwitching;
    }
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
