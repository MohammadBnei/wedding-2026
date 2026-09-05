<script>
  import { onMount } from 'svelte';
  import { heldIndex, mergeWindow, pickNext, clampSlideMs, POLL_MS, TICK_MS } from '$lib/wall.js';
  import { dirOf, SHARED } from '$lib/content/wedding.js';

  let { data } = $props();

  // Defensive defaults, not decoration. This is the one screen in the project
  // that must never go blank, and `data` arriving without `items` — a load that
  // failed, or a client router handing this component the wrong route's payload —
  // would otherwise throw on `.length` and wipe the page to nothing.
  let items = $state(data.items ?? []);
  let pinned = $state(data.pinned ?? null);
  /**
   * /admin pressed Stop. Unlike a pin this names no post — it means "hold
   * whatever is up, whatever arrives" — and unlike a pin it does not release
   * itself when the next post is approved. That is the whole difference: a pin
   * is "show this one", a stop is for the speeches.
   */
  let paused = $state(data.paused ?? false);
  /**
   * Seconds per slide, as /admin set it, in milliseconds.
   *
   * Clamped here as well as on the server. This is a display surface that runs
   * unattended for eight hours: a 0 arriving from a stale pod, a hand-edited row
   * or a half-finished deploy would turn the ticker below into a busy loop, and
   * the CPU it pegs belongs to the laptop driving the projector.
   */
  let slideMs = $state(clampSlideMs(data.slideMs));
  /**
   * The post the stop is holding.
   *
   * `paused` alone is the guard — every writer of `i` checks it — and this is
   * only what stops the held slide DRIFTING. The window is sorted by created_at,
   * so a post arriving or being taken down during a stop changes which post
   * lives at any given index, and a wall frozen "by index" would quietly show a
   * different photo. Frozen by id, it cannot.
   *
   * Captured in the poll below rather than in an $effect: an effect that reads
   * and writes this would loop.
   *
   * Mirrored to localStorage, and restored on mount, because a projector browser
   * DOES get reloaded — a laptop wakes, a tab is restored, someone presses F5
   * because the screen "looks stuck". Without that, a reload during a stop comes
   * back holding whatever is newest, which after a few minutes of a busy room is
   * a photo nobody chose. Per-projector and client-side for the same reason
   * `seen` is: the server knows the wall is stopped, it cannot know which slide
   * this particular screen was on.
   * @type {string | null}
   */
  let frozenId = $state(null);
  const FROZEN_KEY = 'wall-frozen';

  /** @param {string | null} id */
  function remember(id) {
    frozenId = id;
    try {
      if (id) localStorage.setItem(FROZEN_KEY, id);
      else localStorage.removeItem(FROZEN_KEY);
    } catch {
      // Storage disabled or full. The hold still works for this page view; only
      // surviving a reload is lost, and that is not worth a black screen.
    }
  }
  let i = $state(0);
  let online = $state(true);

  /**
   * When the slide on screen started its turn.
   *
   * Deliberately NOT $state: nothing renders it, and making it reactive would
   * dirty every $derived that reads through `i` four times a second.
   */
  let lastAdvance = Date.now();

  /**
   * Move the stage, and restart the clock.
   *
   * Every writer of `i` goes through here — the ticker, the poll's "something
   * new arrived" jump, and both emergency keys. That is the whole point: with
   * the clock reset in the ticker only, a photo the poll jumped to or a slide
   * someone skipped to by hand would inherit whatever was left of the previous
   * turn and could be gone in a fraction of a second, right after a guest
   * watched their own post go up.
   *
   * @param {number} n index into `items`
   */
  function go(n) {
    i = n;
    lastAdvance = Date.now();
  }

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

  // When /admin has pinned a post or stopped the wall, that IS the stage and the
  // timer stands down. Otherwise the index cycles. Falling back to the index when
  // neither id is in the window matters: a pinned post that gets taken down must
  // release the wall rather than freeze it on something that no longer exists.
  // The pin-vs-stop precedence and the fall-through live in heldIndex(), in
  // $lib/wall.js, where bun test can reach them.
  const held = $derived(heldIndex(items, pinned, frozenId));
  const at = $derived(held >= 0 ? held : i % Math.max(items.length, 1));

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

    // Restore the held slide BEFORE the first poll, so a reload during a stop
    // comes back where it was rather than on whatever is newest. Only while
    // stopped: a leftover id from an earlier stop must not hold a running wall,
    // and resuming clears the key anyway.
    try {
      // Only restore while stopped. And CLEAR otherwise: remember(null) runs
      // from the poll and nowhere else, so closing or sleeping the projector
      // during a stop leaves the key behind indefinitely. The next stop plus a
      // reload would then restore an id long since aged out of the window,
      // straight into the drift the poll guard above exists to prevent.
      if (paused) frozenId = localStorage.getItem(FROZEN_KEY);
      else localStorage.removeItem(FROZEN_KEY);
    } catch {
      frozenId = null;
    }

    // Every timer body is wrapped. An unhandled throw in either of these stops
    // the interval for good and freezes the wall on one frame — which looks
    // deliberate, so nobody reports it, and nothing else recovers it.
    const poll = setInterval(async () => {
      try {
        const res = await fetch('/api/wall');
        if (!res.ok) throw new Error(String(res.status));
        const body = await res.json();
        // AFTER the awaits, BEFORE the merge. Both halves matter. After, because
        // the 8s advance timer can fire while this fetch is in flight — `paused`
        // is still false locally until the line below, so nothing stands it
        // down, and a capture from before the await would freeze on a slide the
        // wall has already left, jumping it BACKWARDS at the moment someone
        // presses Stop. Before the merge, because `current` is a $derived over
        // `items` and Svelte recomputes a dirty derived synchronously on read —
        // taken afterwards it names the post the wall is about to move TO.
        const onScreen = current?.id ?? null;
        const merged = mergeWindow(items, body.items);
        items = merged.items;
        // Forget ids that have aged out of the window, so `seen` cannot grow
        // without bound over an eight-hour evening.
        seen = seen.filter((id) => merged.items.some((x) => x.id === id));
        if (merged.fresh.length && !body.pinned && !body.paused) {
          // Something new arrived: show it now rather than at the end of the
          // current cycle. A guest who just posted gets to watch it go up, which
          // is the moment this whole feature exists for. Not while pinned or
          // stopped — a human has taken the wheel. This is the SECOND of the two
          // writers of `i`, and leaving it ungated is how a stopped wall jumps to
          // a new photo while /admin still reads "Stopped".
          go(nextIndex());
        }
        pinned = body.pinned ?? null;
        paused = Boolean(body.paused);
        // Picked up on every poll, which is what makes a change on /admin reach
        // a projector nobody is standing next to — see the ticker below for why
        // that is enough to change the RATE and not just the number.
        slideMs = clampSlideMs(body.slideMs);
        // Guarded on the RESOLVED index, not on `frozenId === null`. Three
        // reasons, and only the first is obvious:
        //
        //   - Not a rising edge (`paused && !wasPaused`): on a reload during a
        //     stop the first poll already sees paused, so a rising edge would
        //     never fire and the wall would come back cycling from index 0.
        //   - Not `frozenId === null` either: if the held post is taken down
        //     from /admin or ages out past WALL_WINDOW, heldIndex goes to -1 and
        //     `at` falls back to `i % items.length` — and since the window is
        //     sorted newest-first, every post arriving during the stop then
        //     shifts what lives at that index. The wall drifts while /admin
        //     still reads "stopped", and with frozenId non-null it could never
        //     re-freeze. Re-arming on the resolved index closes that.
        //   - A pin resolves too, so this correctly stands aside while one is
        //     set and lets the pin hold the stage.
        if (paused && heldIndex(merged.items, body.pinned ?? null, frozenId) < 0) {
          remember(onScreen);
        }
        if (!paused && frozenId !== null) remember(null);
        online = true;
      } catch {
        // Change NOTHING. The buffer keeps cycling what it already has, so a
        // blip degrades to "no new photos" rather than a black screen. Removal
        // only ever happens on the success path above, structurally.
        online = false;
      }
    }, POLL_MS);

    /**
     * The advance. A short fixed ticker that asks "is this slide's turn up?",
     * NOT a setInterval at slideMs.
     *
     * The rate has to be changeable from a phone while the projector runs, and
     * an interval created once in onMount cannot change — its period is fixed
     * at creation, so the value would only take effect on a reload, which is the
     * whole reason this control is not a one-line change. The obvious repair,
     * clearing and recreating the interval, has a trap that is quiet and fatal:
     * recreate it on every poll and the timer restarts every 3s, which is less
     * than every setting on offer, so the wall never advances again — and it
     * looks exactly like a wall someone stopped.
     *
     * A clock check has no such state to get wrong. It is also drift-free: the
     * deadline is computed from when the slide actually started, so a tick the
     * browser delayed (a background tab, a GC pause, a laptop waking up) does
     * not accumulate into slides that are slowly wrong.
     *
     * Wrapped like the poll: an unhandled throw kills the interval for good and
     * freezes the wall on one frame, which looks deliberate, so nobody reports
     * it.
     */
    const advance = setInterval(() => {
      try {
        // A pin or a stop holds the stage, exactly as before — the timer stands
        // down rather than the index being clamped. Keeping the clock level with
        // now while held matters: without it, a stop lifted after ten minutes
        // has a deadline ten minutes in the past and the wall jumps the instant
        // someone presses Start, instead of giving the slide they were looking
        // at a full turn.
        if (pinned || paused || !items.length) {
          lastAdvance = Date.now();
          return;
        }
        if (Date.now() - lastAdvance >= slideMs) go(nextIndex());
      } catch {
        /* never let the cycle die */
      }
    }, TICK_MS);

    return () => {
      clearInterval(poll);
      clearInterval(advance);
    };
  });

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

  /**
   * The emergency control. Someone standing beside the laptop gets a bad photo
   * off the screen with one keypress — no phone, no authentik, no queue. Taking
   * it down permanently, or pinning the stage, is /admin's job.
   *
   * (This block used to sit twenty lines up, above `pointerIdle`: `main` had an
   * unterminated `/**` that ran the two comments together, so it documented the
   * cursor. Closing it left it orphaned. It belongs here.)
   *
   * Deliberately still works while the wall is STOPPED, and clears the freeze as
   * it goes. A keypress means a human is standing at the laptop, and they should
   * outrank a button pressed in another room — otherwise a bad photo frozen on
   * the wall can only be cleared by finding whoever has the admin phone. The
   * advance timer stays stood down either way: stopped means "does not move on
   * its own", not "cannot be moved".
   *
   * Both branches read `at` BEFORE clearing the freeze. `at` resolves through
   * heldIndex, so clearing first collapses it to `i % items.length` — whatever
   * the cycling index was before the stop began, not the slide on screen. Once
   * everything in the window has been seen, pickNext falls through to
   * `(at + 1) % length`, so skipping a photo frozen at index 5 with a stale
   * i = 2 would jump to index 3: backwards, past the very slide you were trying
   * to get rid of.
   *
   * @param {KeyboardEvent} e
   */
  function onKey(e) {
    if (e.key === 'ArrowRight' || e.key === ' ') {
      e.preventDefault();
      const from = at;
      remember(null);
      if (items.length) go(pickNext(items, seen, from));
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const from = at;
      remember(null);
      if (items.length) go((from - 1 + items.length) % items.length);
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

  {#if paused}
    <!-- Same reader, same restraint as the dot above: without it, someone stops
         the wall from another room and the person at the laptop has no way to
         tell a deliberate hold from a frozen browser. Offset so the two can be
         up at once. -->
    <span class="held" aria-hidden="true"></span>
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

  .offline,
  .held {
    position: fixed;
    bottom: 0.6rem;
    inset-inline-end: 0.6rem;
    width: 0.4rem;
    height: 0.4rem;
    border-radius: 50%;
    background: color-mix(in oklab, white 25%, transparent);
  }

  /* Two dots rather than one that changes colour: they are independent facts
     and can both be true. A stopped wall that has also lost the network is the
     one combination where the stop cannot be lifted, so it is worth being able
     to see it. */
  .held {
    inset-inline-end: 1.4rem;
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
