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

  /**
   * The id whose bytes are actually on screen.
   *
   * The caption swaps the instant `current` changes, but the browser keeps
   * painting the previously decoded bitmap until the new one arrives — which is
   * how a new message appeared under someone else's photograph. The caption is
   * held back until the image it belongs to has loaded.
   *
   * Deliberately NOT set from `onload`'s closure over `current`: the load event
   * fires a task later, and a slide advance in between would label A's bitmap as
   * B and reproduce the bug exactly. The id is read off the element instead.
   *
   * Deliberately NOT set from `onload` alone either: the page is server-rendered
   * (`+layout.js` sets ssr = true) and images are `immutable`-cached, so on a
   * reload the first image is usually complete BEFORE hydration attaches any
   * listener — the event is already gone. Hence the `complete` check below.
   * @type {string | null}
   */
  let loadedId = $state(null);
  /** @type {HTMLImageElement | undefined} */
  let imgEl = $state();

  // When /admin has pinned a post, that IS the stage and the timer stands down.
  // Otherwise the index cycles. Falling back to the index when the pinned id is
  // not in the window matters: a pinned post that gets taken down must release
  // the wall rather than freeze it on something that no longer exists.
  const pinnedIndex = $derived(pinned ? items.findIndex((x) => x.id === pinned) : -1);
  const at = $derived(pinnedIndex >= 0 ? pinnedIndex : i % Math.max(items.length, 1));

  const nextIndex = () => pickNext(items, seen, at);
  const current = $derived(items[at] ?? null);
  // Preload what the stage will ACTUALLY show next — pickNext, the same
  // function the advance timer calls. `(at + 1) % length` warmed the next item
  // by index, which is rarely the next item shown, so the image that mattered
  // was never in cache. That gap was invisible at 200KB and is not at full
  // resolution. The length guard stays: pickNext returns `at` itself when there
  // is only one item, which would preload what is already on screen.
  const nextItem = $derived(items.length > 1 ? (items[pickNext(items, seen, at)] ?? null) : null);

  /** @param {{id: string}} it */
  const src = (it) => `/api/wall/img/${it.id}-o.jpg`;

  /**
   * The id the fired event BELONGS to, read off the element rather than closed
   * over from `current`. The load event arrives a task after the fetch, and a
   * slide advance in between would otherwise label the old bitmap as the new
   * post — which is the bug this whole change exists to fix.
   * @param {Event} e
   */
  const idOf = (e) => /** @type {HTMLImageElement} */ (e.currentTarget).dataset.id ?? null;

  /** @param {string | null} lang */
  const dirOfPost = (lang) => dirOf(/** @type {any} */ (lang) || 'fr');

  // True once the CURRENT post's image is painted, or once we have given up on
  // it. A text-only post is ready immediately.
  const ready = $derived(!current?.photo || loadedId === current?.id);

  /**
   * Catch an image that finished before we could listen.
   *
   * `complete` is true for a cached or already-decoded image, and
   * `naturalWidth > 0` distinguishes "loaded" from "failed". Without this the
   * projector shows a caption over black for a whole slide on every reload —
   * and reloading is what people do when the wall looks wrong.
   */
  $effect(() => {
    const id = current?.id;
    if (!id || !current?.photo) return;
    if (imgEl?.complete && imgEl.naturalWidth > 0) loadedId = id;
  });

  /**
   * Never let a slide stall. An image that 404s (a post taken down mid-cycle) or
   * one the browser cannot decode never fires `load`, and while a post is PINNED
   * the advance timer stands down — so without this the stage stays black
   * indefinitely with no way out. Showing the caption alone is the honest
   * fallback.
   */
  $effect(() => {
    const id = current?.id;
    if (!id || !current?.photo || loadedId === id) return;
    const t = setTimeout(() => (loadedId = id), 2_000);
    return () => clearTimeout(t);
  });

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
  /**
   * The pointer starts hidden and appears on movement, then hides again.
   *
   * This order matters: "visible, then hide after N seconds" paints a cursor on
   * the projection for N seconds after every reload, and a laptop with its lid
   * shut never moves the mouse to trigger the hide. Starting hidden means the
   * room never sees it unless a hand is actually on the trackpad.
   */
  let pointerIdle = $state(true);
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let idleTimer;
  function onMove() {
    pointerIdle = false;
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => (pointerIdle = true), 2_500);
  }

  /** @param {KeyboardEvent} e */
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

<svelte:window onkeydown={onKey} onmousemove={onMove} />

<div class="wall" class:idle={pointerIdle}>
  <section class="stage">
    {#if current}
      <!-- `with-photo` follows READY, not `photo`: sizing the caption for a
           photograph that never arrived leaves small text alone in a black
           frame. -->
      <article class="slide" class:with-photo={current.photo && ready}>
        {#if current.photo}
          <!-- The frame holds its space whether or not the image has painted,
               so the caption does not lurch upward and then back down on every
               slide. -->
          <div class="frame" class:ready>
            <img
              bind:this={imgEl}
              class="photo"
              src={src(current)}
              data-id={current.id}
              alt=""
              onload={(e) => (loadedId = idOf(e))}
              onerror={(e) => (loadedId = idOf(e))}
            />
          </div>
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
  }

  /* Hidden by default; shown only while a hand is actually moving. */
  .wall.idle {
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

  /* The frame reserves the photo's space before the bytes arrive. Without it an
     undecoded <img> has no intrinsic size, the caption sits vertically centred,
     and then jumps when the image lands — a visible lurch on every slide. */
  .frame {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 72%;
    flex: 0 0 auto;
  }

  .photo {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    /* The original carries its EXIF orientation; only the derivative was
       auto-oriented on the server. This is the browser default, stated rather
       than relied upon. */
    image-orientation: from-image;
    opacity: 0;
  }

  .frame.ready .photo {
    opacity: 1;
    transition: opacity 260ms ease-out;
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
    /* The fade in is motion too, and the file's rule is that motion lives
       behind this guard. Snap it, do not remove it — the image must still
       become visible. */
    .frame.ready .photo { transition: none; }
  }

  /* A narrow window (someone checking it on a phone) drops the rail — at that
     width it would take half the screen and the stage is the point. */
  @media (max-width: 48rem) {
    .wall { grid-template-columns: 1fr; }
    .rail { display: none; }
  }
</style>
