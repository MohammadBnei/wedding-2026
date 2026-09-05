<!--
  The song list, for whoever is running the music.

  Same conventions as /admin next door: no i18n, no components of its own, the
  same `cell`/`head` class constants and the same one-<tbody>-per-row shape, so
  the two pages read as one dashboard rather than two designs.

  Three things are worth knowing before changing this:

  1. The YouTube link is resolved ONE ROW AT A TIME from here, not in `load`.
     See routes/admin/songs/yt/+server.js — resolving them all server-side would
     buffer megabytes of HTML on a 1Gi pod that is also driving the projector.
  2. A row starts as a "Search" link and upgrades to "Play" when a match lands.
     It never claims Play for a link that only goes to a results page.
  3. The played mark is localStorage, keyed on songKey() — no column, no
     migration, and it survives the refresh that is the only way to see new
     requests.
-->
<script>
  import { onMount } from 'svelte';
  import { INPUT_BASE } from '$lib/components/Field.svelte';
  import { fold } from '$lib/match.js';
  import { songKey } from '$lib/songs.js';
  import { searchUrl } from '$lib/youtube.js';

  let { data } = $props();

  /**
   * The resolved YouTube URL per song key, as matches come back.
   *
   * A plain object in $state rather than a Map: Svelte 5's proxy makes property
   * writes reactive, and the list is small enough that nothing else matters.
   * @type {Record<string, {url: string, matched: boolean}>}
   */
  let links = $state({});

  /**
   * Song keys already played, mirrored to localStorage.
   *
   * Why this exists at all: the list is newest-first and the only way to see new
   * requests is to reload, so every refresh pushes rows in at the top and shifts
   * everything down. Working a five-hour reception off a list that reorders
   * under you with no memory of what you have played is the read-only version of
   * this page failing at its actual job.
   * @type {string[]}
   */
  let played = $state([]);

  const STORE = 'songs-played';
  /** How many rows get a YouTube lookup on load. See the note in onMount. */
  const RESOLVE_MAX = 50;

  onMount(() => {
    // Guarded: a corrupt or hand-edited value must not take the page down at
    // one in the morning, and neither must a browser with storage disabled.
    try {
      const raw = JSON.parse(localStorage.getItem(STORE) ?? '[]');
      if (Array.isArray(raw)) played = raw.filter((v) => typeof v === 'string');
    } catch {
      played = [];
    }

    // One request per row, for the newest RESOLVE_MAX rows only.
    //
    // The browser's ~6-connections-per-origin limit caps how many of these are
    // in flight, which bounds the pod's MEMORY — but not the total volume, and
    // volume is what gets an IP blocked. The row count is guest-controlled free
    // text bounded only by GLOBAL_DAILY = 800, so one page open could otherwise
    // fire hundreds of scrapes from the cluster's egress address and earn a bot
    // block that turns every row into "Search" for the rest of the night.
    //
    // ponytail: a flat cap, not a windowed/IntersectionObserver loader. Fifty is
    // far more songs than one reception produces, the rows past it still carry a
    // working Search link, and they resolve on the next load once the cache in
    // front of them has warmed. Build the observer the first evening someone
    // actually scrolls past fifty.
    for (const s of data.songs.slice(0, RESOLVE_MAX)) {
      const key = songKey(s.song);
      fetch(`/admin/songs/yt?q=${encodeURIComponent(s.song)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((body) => {
          if (body?.url) links[key] = { url: body.url, matched: Boolean(body.matched) };
        })
        .catch(() => {
          /* the row keeps its search link */
        });
    }
  });

  /** @param {string} key */
  function togglePlayed(key) {
    played = played.includes(key) ? played.filter((k) => k !== key) : [...played, key];
    try {
      localStorage.setItem(STORE, JSON.stringify(played));
    } catch {
      /* private mode, a full quota — the tick still works for this session */
    }
  }

  // Identical to /admin's, deliberately. If one changes, both should.
  const cell = 'px-3 py-2 align-top';
  const head =
    'sticky top-0 z-10 bg-surface px-3 py-2 text-start caps text-micro font-light ' +
    'text-ink-muted shadow-[inset_0_-1px_0_var(--color-line)]';

  let q = $state('');

  // Client-side over rows already in memory, like /admin's box — no request, and
  // fold() so `cafe` finds `Café`.
  const shown = $derived(
    (() => {
      const needle = fold(q);
      if (!needle) return data.songs;
      return data.songs.filter(
        (s) => fold(s.song).includes(needle) || s.who.some((w) => fold(w).includes(needle))
      );
    })()
  );
</script>

<svelte:head>
  <title>Songs</title>
  <!-- Belt and braces behind the auth gate, exactly as /admin does it.
       robots.txt is left alone on purpose: a Disallow line publishes the path
       to every crawler that reads it. -->
  <meta name="robots" content="noindex, nofollow" />
</svelte:head>

<!-- min-h-screen bg-surface because app.css paints <html> in the night colour so
     the invitation's overscroll shows it; on a short list that would otherwise
     leave a navy slab under the table. -->
<div class="min-h-screen bg-surface">
  <main class="mx-auto max-w-5xl px-4 py-8 text-ink">
    <header class="mb-6 flex flex-wrap items-baseline justify-between gap-2">
      <h1 class="font-display text-2xl">
        {data.songs.length}
        {data.songs.length === 1 ? 'song' : 'songs'}
        {#if played.length}
          <span class="text-body font-light text-ink-muted">· {played.length} played</span>
        {/if}
      </h1>
      <!-- Plain client-side nav: both paths sit behind the same forwardAuth, so
           unlike the chip on the invitation this needs no full reload. -->
      <a class="text-xs font-light text-ink-muted underline hover:text-ink" href="/admin">
        ← Admin
      </a>
    </header>

    {#if !data.canRead}
      <p class="text-sm font-light text-accent">
        Postgres is unreachable — this list is not just empty, it is unknown.
      </p>
    {:else if !data.songs.length}
      <p class="text-sm font-light text-ink-muted">No song requests yet.</p>
    {:else}
      <div class="mb-4 flex flex-wrap items-baseline gap-3">
        <input
          type="search"
          bind:value={q}
          placeholder="Search song or name"
          aria-label="Search the songs"
          class="w-full border border-line bg-surface-raise sm:w-80 {INPUT_BASE} focus:border-primary focus:outline-none"
        />
        {#if q.trim()}
          <span class="text-note font-light text-ink-muted">
            Showing {shown.length} of {data.songs.length}
          </span>
        {/if}
      </div>

      {#if !shown.length}
        <p class="text-sm font-light text-ink-muted">No song matches that.</p>
      {:else}
        <table class="w-full border-collapse text-note font-light">
          <thead>
            <tr>
              <th class="{head} w-px"><span class="sr-only">Played</span></th>
              <th class={head}>Song</th>
              <th class="{head} w-px">Listen</th>
              <th class="{head} hidden sm:table-cell">Asked by</th>
            </tr>
          </thead>
          {#each shown as s (songKey(s.song))}
            {@const key = songKey(s.song)}
            {@const done = played.includes(key)}
            {@const link = links[key]}
            <tbody class="border-b border-line-soft hover:bg-primary-faint/25 {done ? 'opacity-50' : ''}">
              <tr>
                <td class={cell}>
                  <!-- A real checkbox: it is the one control on this page that
                       gets used with one hand while holding a phone, and the
                       native one is the biggest hit target available for free. -->
                  <input
                    type="checkbox"
                    class="size-4 cursor-pointer accent-primary"
                    checked={done}
                    onchange={() => togglePlayed(key)}
                    aria-label="Mark {s.song} as played"
                  />
                </td>
                <td class="{cell} text-ink">
                  <!-- break-all, not break-words: `overflow-wrap: break-word`
                       does not reduce a box's min-content width, so one pasted
                       URL in a song field would force the table wider than the
                       screen. /admin's message column learned this already. -->
                  <span class="break-all {done ? 'line-through' : ''}">♪ {s.song}</span>
                  {#if s.count > 1}
                    <span class="ms-1 text-caption text-ink-muted">×{s.count}</span>
                  {/if}
                  <!-- Below sm the names ride under the song rather than holding
                       a column: as a column they force a sideways scroll on a
                       393px screen. -->
                  {#if s.who.length}
                    <span class="block break-all text-caption text-ink-muted sm:hidden">
                      {s.who.join(', ')}
                    </span>
                  {/if}
                </td>
                <td class={cell}>
                  <!-- Labelled for where it ACTUALLY goes. Until a match lands
                       this is a results page, and calling that "Play" would be a
                       link that lies. -->
                  <a
                    class="whitespace-nowrap underline underline-offset-4 {link?.matched
                      ? 'text-primary'
                      : 'text-ink-muted'}"
                    href={link?.url ?? searchUrl(s.song)}
                    target="_blank"
                    rel="noopener"
                  >
                    {link?.matched ? '▶ Play' : 'Search'}
                  </a>
                </td>
                <td class="{cell} hidden break-all text-ink-muted sm:table-cell">
                  {s.who.length ? s.who.join(', ') : '—'}
                </td>
              </tr>
            </tbody>
          {/each}
        </table>
      {/if}
    {/if}
  </main>
</div>
