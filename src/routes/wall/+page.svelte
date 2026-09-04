<script>
  import { onMount } from 'svelte';
  import { mergeWindow, SLIDE_MS, POLL_MS } from '$lib/wall.js';
  import { dirOf, SHARED } from '$lib/content/wedding.js';

  let { data } = $props();

  let items = $state(data.items);
  let i = $state(0);
  let online = $state(true);

  const current = $derived(items[i % Math.max(items.length, 1)] ?? null);
  const nextItem = $derived(items.length > 1 ? items[(i + 1) % items.length] : null);

  /** @param {{id: string}} it */
  const src = (it) => `/api/wall/img/${it.id}.jpg`;

  /**
   * Preload with `new Image()`, NOT fetch(). An <img src> is not a CORS request
   * and needs no rule on the bucket; a fetch() is, and would.
   */
  $effect(() => {
    if (nextItem?.photo) new Image().src = src(nextItem);
  });

  onMount(() => {
    // A projector laptop going to sleep at 22:00 is the least sophisticated and
    // most likely failure of the evening.
    navigator.wakeLock?.request('screen').catch(() => {});

    // Every timer body is wrapped. An unhandled throw in either of these stops
    // the interval for good and freezes the wall on one frame — which looks
    // deliberate, so nobody reports it, and nothing else recovers it.
    const poll = setInterval(async () => {
      try {
        const res = await fetch('/api/wall');
        if (!res.ok) throw new Error(String(res.status));
        const { items: incoming } = await res.json();
        const merged = mergeWindow(items, incoming);
        // Jump to a genuinely new post: a guest who just uploaded gets to see it
        // go up, which is the moment this whole feature exists for.
        if (merged.fresh.length) {
          const at = merged.items.findIndex((x) => x.id === merged.fresh[0]);
          if (at >= 0) i = at;
        }
        items = merged.items;
        online = true;
      } catch {
        // Change NOTHING. The buffer keeps cycling what it already has, so a
        // blip degrades to "no new photos" rather than a black screen. Removal
        // only ever happens on the success path above, structurally.
        online = false;
      }
    }, POLL_MS);

    const advance = setInterval(() => {
      try {
        if (items.length) i = (i + 1) % items.length;
      } catch {
        /* never let the cycle die */
      }
    }, SLIDE_MS);

    return () => {
      clearInterval(poll);
      clearInterval(advance);
    };
  });

  /**
   * The emergency control. Someone standing beside the laptop gets a bad photo
   * off the screen with one keypress — no phone, no authentik, no queue. Taking
   * it down permanently is /admin's job; this is the ten-second version.
   */
  /** @param {KeyboardEvent} e */
  function onKey(e) {
    if (e.key === 'ArrowRight' || e.key === ' ') {
      e.preventDefault();
      if (items.length) i = (i + 1) % items.length;
    }
  }
</script>

<svelte:window onkeydown={onKey} />

<div class="wall">
  {#if current}
      <!-- No {#key} wrapper: it re-creates the subtree and breaks hydration on
           this page (HierarchyRequestError). The cross-fade is driven off the id
           via a CSS animation-name change instead, which is both cheaper and
           one less thing that can fail on the projector. -->
      <article class="slide" class:has-photo={current.photo} data-id={current.id}>
        {#if current.photo}
          <img class="photo" src={src(current)} alt="" />
        {/if}
        {#if current.message}
          <div class="caption" dir={dirOf(current.lang ?? 'fr')} lang={current.lang ?? 'fr'}>
            <p class="message">{current.message}</p>
            {#if current.author}<p class="author">— {current.author}</p>{/if}
          </div>
        {:else if current.author}
          <div class="caption"><p class="author">— {current.author}</p></div>
        {/if}
      </article>
  {:else}
    <!-- Nothing approved yet. A standing card, never a spinner and never black:
         this is what is on the screen before the first guest posts. -->
    <article class="slide standing">
      <p class="names">{SHARED.names.latin.join(' & ')}</p>
      <p class="author">{SHARED.motto ?? ''}</p>
    </article>
  {/if}

  {#if !online}
    <!-- Deliberately tiny and dim. It is for whoever walks past the laptop, not
         for the room, and it must never look like an error message on a wall. -->
    <span class="offline" aria-hidden="true"></span>
  {/if}
</div>

<style>
  :global(body) {
    background: #000;
    overflow: hidden;
  }

  .wall {
    position: fixed;
    inset: 0;
    display: grid;
    place-items: center;
    background: #000;
    cursor: none;
  }

  .slide {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    animation: fade 900ms ease-out;
  }

  .photo {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  .caption {
    position: relative;
    max-width: min(80ch, 82vw);
    margin: 0 auto;
    padding: clamp(1rem, 3vh, 2.5rem) clamp(1.5rem, 4vw, 3rem);
    text-align: center;
  }

  .has-photo .caption {
    position: absolute;
    inset-inline: 0;
    bottom: clamp(2rem, 8vh, 6rem);
    background: color-mix(in oklab, black 62%, transparent);
    backdrop-filter: blur(6px);
    border-radius: 1rem;
    width: fit-content;
  }

  .message {
    font-family: var(--font-display), serif;
    font-size: clamp(1.75rem, 4.2vw, 4rem);
    line-height: 1.25;
    color: white;
    margin: 0;
    text-wrap: balance;
  }

  .author,
  .names {
    font-family: var(--font-script), cursive;
    font-size: clamp(1.1rem, 2.2vw, 2rem);
    color: color-mix(in oklab, white 78%, transparent);
    margin: 0.6em 0 0;
  }

  .names {
    font-size: clamp(2rem, 6vw, 5rem);
    color: white;
  }

  .standing {
    flex-direction: column;
    text-align: center;
  }

  .offline {
    position: fixed;
    bottom: 0.6rem;
    inset-inline-end: 0.6rem;
    width: 0.4rem;
    height: 0.4rem;
    border-radius: 50%;
    background: color-mix(in oklab, white 25%, transparent);
  }

  @keyframes fade {
    from { opacity: 0; }
    to   { opacity: 1; }
  }

  @media (prefers-reduced-motion: reduce) {
    .slide { animation: none; }
  }
</style>
