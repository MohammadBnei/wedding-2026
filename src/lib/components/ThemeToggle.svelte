<!--
  Light/dark. Applies to the DOM immediately so there's no wait, then persists a
  cookie so the SERVER renders the right theme next time — that cookie is what
  prevents a flash of the wrong theme on reload.

  The icons are inline SVG rather than ☀/☾ characters: those get emoji
  presentation on some systems and render as a coloured tile instead of a glyph
  that follows the text colour.
-->
<script>
  import Chip from './Chip.svelte';

  let { current = 'light', tone = 'on-primary', toLight, toDark } = $props();
  let theme = $state(current);

  function toggle() {
    theme = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = theme;
    fetch('/api/prefs', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ theme })
    });
  }
</script>

<Chip
  {tone}
  onclick={toggle}
  aria-label={theme === 'dark' ? toLight : toDark}
>
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    aria-hidden="true"
  >
    {#if theme === 'dark'}
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    {:else}
      <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />
    {/if}
  </svg>
</Chip>
