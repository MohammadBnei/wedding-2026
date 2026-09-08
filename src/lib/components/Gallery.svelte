<!--
  The guest wall after the day: everything that was approved, as a page you can
  scroll, instead of the one-slide-at-a-time projector it was on the night.

  Same route as the projector — routes/wall/+page.svelte picks between the two
  on `data.over` — and the same rows out of the same query. What changes is that
  a gallery shows all of them at once, which is why it asks for `-t.jpg` rather
  than `-o.jpg`: the originals run to several megabytes each and are served off
  a home uplink. See parseImageName in $lib/wall.js.

  Deliberately NOT using a `.wall` class anywhere: Projector.svelte locks body
  scrolling with `:global(body:has(.wall))`, and that stylesheet ships whether
  or not the projector is rendered. A `.wall` here would freeze this page.
-->
<script>
  import { dirOf } from '$lib/content/wedding.js';

  let { t, items = [], up = true } = $props();

  /** @param {string | null} l */
  const dirOfPost = (l) => dirOf(/** @type {any} */ (l) || 'fr');
</script>

<main class="mx-auto flex min-h-dvh max-w-5xl flex-col gap-8 bg-surface px-5 py-14 lg:px-8 lg:py-20">
  <header class="flex flex-col gap-3 text-center">
    <h1 class="font-display text-[clamp(26px,6vw,34px)] leading-tight text-ink">{t.galleryTitle}</h1>
    <p class="text-body leading-relaxed font-light text-ink-body text-pretty">{t.galleryIntro}</p>
    <p>
      <a class="text-caption font-light text-primary underline underline-offset-4" href="/">
        {t.galleryBack}
      </a>
    </p>
  </header>

  {#if !up}
    <!-- Not the same thing as an empty wall, and it must not read like one.
         `up` comes from dbUp() in +page.server.js precisely so these two states
         can be told apart — see the note there. -->
    <p class="py-12 text-center text-body font-light text-ink-muted">{t.galleryOffline}</p>
  {:else if items.length === 0}
    <p class="py-12 text-center text-body font-light text-ink-muted">{t.galleryEmpty}</p>
  {:else}
    <!-- A plain responsive grid. `auto-fill` with a minimum rather than a fixed
         column count, so one card on a phone and three on a laptop needs no
         breakpoint of its own. Cards break their own height; no masonry, which
         would need JS and a measurement pass for a page that is read once. -->
    <ul class="grid list-none grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-5 p-0">
      {#each items as post (post.id)}
        <li class="flex flex-col border border-line bg-surface-raise">
          {#if post.photo}
            <!-- The thumbnail links to the original, which is the only place
                 the full-resolution upload is served. No `download` and no
                 lightbox: the browser's own image view is better than one we
                 would write, and it works with a pinch-zoom on a phone. -->
            <a href="/api/wall/img/{post.id}-o.jpg" target="_blank" rel="noopener noreferrer">
              <img
                class="block aspect-square w-full object-cover"
                src="/api/wall/img/{post.id}-t.jpg"
                alt=""
                loading="lazy"
                decoding="async"
              />
            </a>
          {/if}
          {#if post.message || post.author}
            <!-- Per-post direction, not the page's: a card written in Arabic
                 has to read right-to-left inside a French page, exactly as it
                 did on the projector. -->
            <div
              class="flex flex-1 flex-col gap-2 px-4 py-3.5"
              dir={dirOfPost(post.lang)}
              lang={post.lang ?? 'fr'}
            >
              {#if post.message}
                <p class="text-note leading-relaxed font-light text-ink-body text-pretty">
                  {post.message}
                </p>
              {/if}
              {#if post.author}
                <p class="font-script mt-auto text-[19px] leading-tight text-gold-soft">
                  — {post.author}
                </p>
              {/if}
            </div>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
</main>
