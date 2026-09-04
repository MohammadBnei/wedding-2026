<script>
  import { onMount } from 'svelte';
  import { mergeWindow, pickNext, SLIDE_MS, POLL_MS } from '$lib/wall.js';
  import { dirOf, SHARED } from '$lib/content/wedding.js';

  let { data } = $props();

  // Defensive defaults, not decoration. This is the one screen in the project
  // that must never go blank, and `data` arriving without `items` — a load that
  // failed, or a client router handing this component the wrong route's payload —
  // would otherwise throw on `.length` and wipe the page to nothing.
  let items = $state(data.items ?? []);
  let pinned = $state(data.pinned ?? null);
  let i = $state(0);
  let online = $state(true);

  /**
   * Ids this projector has already put on the stage.
   *
   * Every post gets its own moment: the stage always prefers something nobody
   * has seen yet, oldest first, so a guest who posts during the meal does not
   * wait behind twenty replays. Once nothing is unseen it recycles the window
   * rather than freezing or going dark — a quiet forty minutes between the meal
   * and the dancing must not leave a dead screen.
   *
   * Deliberately client-side and per-session: "seen" is a fact about THIS
   * projector, not about the post. A second browser, or a reload after a crash,
   * starts fresh and shows everything again, which is the right behaviour for a
   * screen that was not being watched anyway. It also needs no schema and no
   * write path from a machine nobody is logged into.
   *
   * A plain array, not a Set: it is bounded by WALL_WINDOW, `includes` on forty
   * strings is free, and reassignment is what makes it reactive.
   * @type {string[]}
   */
  let seen = $state([]);

  // When /admin has pinned a post, that IS the stage and the timer stands down.
  // Otherwise the index cycles. Falling back to the index when the pinned id is
  // not in the window matters: a pinned post that gets taken down must release
  // the wall rather than freeze it on something that no longer exists.
  const pinnedIndex = $derived(pinned ? items.findIndex((x) => x.id === pinned) : -1);
  const at = $derived(pinnedIndex >= 0 ? pinnedIndex : i % Math.max(items.length, 1));

  const nextIndex = () => pickNext(items, seen, at);
  const current = $derived(items[at] ?? null);
  const nextItem = $derived(items.length > 1 ? items[(at + 1) % items.length] : null);

  /** @param {{id: string}} it */
  const src = (it) => `/api/wall/img/${it.id}.jpg`;

  /** @param {string | null} lang */
  const dirOfPost = (lang) => dirOf(/** @type {any} */ (lang) || 'fr');

  // Anything that reaches the stage counts as seen — including the one the
  // server pinned, so releasing a pin does not immediately replay it.
  $effect(() => {
    const id = current?.id;
    if (id && !seen.includes(id)) seen = [...seen, id];
  });

  // Preload with `new Image()`, NOT fetch(). An <img src> is not a CORS request
  // and needs no rule on the bucket; a fetch() is, and would.
  $effect(() => {
    if (nextItem?.photo) new Image().src = src(nextItem);
  });

  /** @type {HTMLElement | undefined} */
  let railEl = $state();
  // Keep the rail pinned to the newest message, the way a chat window behaves.
  $effect(() => {
    void items.length;
    if (railEl) railEl.scrollTop = railEl.scrollHeight;
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
        const body = await res.json();
        const merged = mergeWindow(items, body.items);
        items = merged.items;
        // Forget ids that have aged out of the window, so `seen` cannot grow
        // without bound over an eight-hour evening.
        seen = seen.filter((id) => merged.items.some((x) => x.id === id));
        if (merged.fresh.length && !body.pinned) {
          // Something new arrived: show it now rather than at the end of the
          // current cycle. A guest who just posted gets to watch it go up, which
          // is the moment this whole feature exists for. Not while pinned — a
          // human has taken the wheel.
          i = nextIndex();
        }
        pinned = body.pinned ?? null;
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
        if (!pinned && items.length) i = nextIndex();
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
   * it down permanently, or pinning the stage, is /admin's job.
   * @param {KeyboardEvent} e
   */
  function onKey(e) {
    if (e.key === 'ArrowRight' || e.key === ' ') {
      e.preventDefault();
      if (items.length) i = nextIndex();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (items.length) i = (at - 1 + items.length) % items.length;
    }
  }
</script>

<svelte:window onkeydown={onKey} />

<div class="wall">
  <section class="stage">
    {#if current}
      <article class="slide" class:with-photo={current.photo}>
        {#if current.photo}
          <img class="photo" src={src(current)} alt="" />
        {/if}
        {#if current.message || current.author}
          <!-- Below the photo, not over it. An overlay is unreadable on a light
               photograph and it hides the part of the picture people are
               looking at. -->
          <div class="caption" dir={dirOfPost(current.lang)} lang={current.lang ?? 'fr'}>
            {#if current.message}<p class="message">{current.message}</p>{/if}
            {#if current.author}<p class="author">— {current.author}</p>{/if}
          </div>
        {/if}
      </article>
    {:else}
      <!-- Nothing approved yet. A standing card, never a spinner and never
           black: this is what is on screen before the first guest posts. -->
      <article class="slide standing">
        <p class="names">{SHARED.names.latin.join(' & ')}</p>
      </article>
    {/if}
  </section>

  <!-- The rail. Everything that has been up, oldest at the top, so it reads the
       way a chat window does and the newest line is always at the bottom edge
       where the eye already is. -->
  <aside class="rail" bind:this={railEl}>
    {#each [...items].reverse() as it (it.id)}
      <article class="line" class:live={it.id === current?.id} dir={dirOfPost(it.lang)}>
        <span class="who">{it.author}</span>
        {#if it.message}<span class="what">{it.message}</span>{/if}
        {#if it.photo}<span class="badge" aria-label="photo">◼</span>{/if}
      </article>
    {/each}
  </aside>

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
    grid-template-columns: 1fr min(22rem, 26vw);
    background: #000;
    cursor: none;
  }

  .stage {
    position: relative;
    display: grid;
    place-items: center;
    min-width: 0;
    padding: 2.5vh 2vw;
  }

  .slide {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: clamp(1rem, 2.5vh, 2rem);
    width: 100%;
    height: 100%;
    animation: fade 700ms ease-out;
  }

  .photo {
    /* Bounded so the caption below always has room — object-fit alone would let
       a tall portrait photo push the text off the bottom of the screen. */
    max-width: 100%;
    max-height: 72%;
    object-fit: contain;
    flex: 0 1 auto;
  }

  .caption {
    max-width: min(40ch, 90%);
    text-align: center;
    flex: 0 0 auto;
  }

  .message {
    font-family: var(--font-display), serif;
    font-size: clamp(1.5rem, 3.4vw, 3.4rem);
    line-height: 1.25;
    color: white;
    margin: 0;
    text-wrap: balance;
  }

  /* A text-only card gets the room the photo would have had. */
  .slide:not(.with-photo) .message {
    font-size: clamp(2rem, 5vw, 5rem);
  }

  .author,
  .names {
    font-family: var(--font-script), cursive;
    font-size: clamp(1.1rem, 2vw, 2.2rem);
    color: color-mix(in oklab, white 78%, transparent);
    margin: 0.5em 0 0;
  }

  .names {
    font-size: clamp(2rem, 6vw, 5rem);
    color: white;
  }

  .rail {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    overflow-y: auto;
    padding: 1.2rem 1rem;
    border-inline-start: 1px solid color-mix(in oklab, white 12%, transparent);
    background: color-mix(in oklab, white 4%, transparent);
    scrollbar-width: none;
  }
  .rail::-webkit-scrollbar {
    display: none;
  }

  .line {
    font-size: clamp(0.8rem, 1.05vw, 1.1rem);
    line-height: 1.45;
    color: color-mix(in oklab, white 72%, transparent);
  }

  /* The one currently on the stage, so the rail doubles as a position marker. */
  .line.live {
    color: white;
  }
  .line.live .who {
    color: var(--color-gold-soft, #e8c98a);
  }

  .who {
    font-weight: 600;
    color: color-mix(in oklab, white 92%, transparent);
  }
  .who::after {
    content: ' ';
  }

  .badge {
    margin-inline-start: 0.4em;
    font-size: 0.7em;
    opacity: 0.5;
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

  /* A narrow window (someone checking it on a phone) drops the rail — at that
     width it would take half the screen and the stage is the point. */
  @media (max-width: 48rem) {
    .wall { grid-template-columns: 1fr; }
    .rail { display: none; }
  }
</style>
