<script>
  import '../app.css';
  import { dirOf } from '$lib/content/wedding.js';

  let { children, data } = $props();

  // Keep <html lang/dir> in step when the language changes client-side. The
  // server sets these on first paint (see hooks.server.js); this covers the
  // in-page switch, which happens without a reload.
  $effect(() => {
    const el = document.documentElement;
    el.lang = data.lang;
    el.dir = dirOf(data.lang);
    // Signals that interactive handlers are attached. The page is server-rendered,
    // so buttons are clickable in the DOM well before Svelte has wired them up —
    // end-to-end tests wait on this rather than racing hydration.
    el.dataset.hydrated = 'true';
  });
</script>

<svelte:head>
  <title>Leïla & Mohammad-Amine — {data.t.date}</title>
  <meta name="description" content={data.t.welcome1} />
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
</svelte:head>

{@render children()}
