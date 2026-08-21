<!--
  Four languages. Unlike the artifact, switching does NOT wipe the chat transcript —
  the transcript lives in Postgres keyed on the visitor cookie, not in component state.
-->
<script>
  import { invalidateAll } from '$app/navigation';
  import Chip from './Chip.svelte';
  import { LANGS } from '$lib/content/wedding.js';

  let { current, tone = 'on-primary', label } = $props();

  // Endonyms, not translations: a language is named in itself everywhere, so the
  // list reads the same whichever language the page is in.
  const NAMES = { fr: 'Français', en: 'English', ar: 'العربية', fa: 'فارسی' };


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

<!-- Four equal columns filling whatever room the control bar leaves after the
     theme toggle: four names of four different widths read as four different
     kinds of thing.

     `flex-1` because the bar is a flex row — this group takes the space, the
     toggle stays its own size on the other side of it. -->
<div class="grid flex-1 grid-cols-4 gap-1.5" role="group" aria-label={label}>
  {#each LANGS as lang (lang)}
    <Chip
      {tone}
      selected={lang === current}
      onclick={() => pick(lang)}
      {lang}
    >
      {NAMES[lang]}
    </Chip>
  {/each}
</div>
