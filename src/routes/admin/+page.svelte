<!--
  The RSVP list. Gated at Traefik by authentik (helm/values.yaml); linked from
  the invitation's control bar only when an authentik session cookie is present
  (see +layout.server.js), so guests never see the way in.

  Still deliberately plain: no i18n, no components of its own, no export, no
  pagination. It grew a search box and sortable headers because the list got
  long enough to need them, and both are client-side over `data.rows` with the
  comparator in `$lib/rsvp-view.js` where a test can reach it.

  Two rows per guest, wrapped in their own <tbody>: the countable facts on the
  first, and the song and the message — the two fields with no length limit —
  full width on the second. Given a column each they were squeezed to about a
  hundred pixels, and one long message made a row taller than the screen.

  Delete is soft — the row keeps its song and its message and comes back with
  one UPDATE. The undo strip below covers the delete you just made; see the
  README for anything older.
-->
<script>
  import { enhance } from '$app/forms';
  import { INPUT_BASE } from '$lib/components/Field.svelte';
  import { view } from '$lib/rsvp-view.js';

  let { data, form } = $props();

  const cell = 'px-3 py-2 align-top';
  // The rule under the header is a shadow, not a border: this <th> is sticky,
  // and a collapsed table's borders do not travel with a stuck cell — the line
  // stays behind at the top of the table and the header floats over the rows
  // with nothing under it. `bg-surface` is load-bearing for the same reason.
  const head =
    'sticky top-0 z-10 bg-surface px-3 py-2 text-start caps text-micro font-light ' +
    'text-ink-muted shadow-[inset_0_-1px_0_var(--color-line)]';
  // Email, Lang and Updated are the three the phone can do without as columns:
  // four fit a Pixel 5, seven do not. Hidden, not dropped — `hidden` keeps the
  // cell in the colspan grid and keeps its text in the DOM, which is also why
  // the e2e row assertions do not care which breakpoint they run at.
  const wide = `${cell} hidden lg:table-cell`;
  const sortButton = 'cursor-pointer caps hover:text-ink';

  /**
   * Three states, one glyph each. A word here costs a whole column and the
   * message is what the column is for. The label is what a screen reader gets,
   * and the model's own verdict is on the cell's title.
   */
  /** @type {Record<string, {icon: string, label: string, cls: string}>} */
  const STATE = {
    pending: { icon: '◌', label: 'Waiting to be screened', cls: 'text-ink-muted' },
    approved: { icon: '●', label: 'On the wall', cls: 'text-primary' },
    rejected: { icon: '✕', label: 'Taken down', cls: 'text-accent' }
  };
  /** Unknown status renders as a visible question mark rather than crashing. */
  const stateOf = (/** @type {string} */ st) =>
    STATE[st] ?? { icon: '?', label: st, cls: 'text-ink-muted' };

  let q = $state('');
  /** @type {import('$lib/rsvp-view.js').SortKey} */
  let key = $state('updated_at');
  /** @type {1 | -1} */
  let dir = $state(-1);

  const shown = $derived(view(data.rows, q, key, dir));

  /**
   * Click the sorted column to reverse it, another to sort by that instead.
   * A fresh column starts ascending, except the date — you almost always want
   * the newest reply first, which is also the order it arrives in.
   *
   * @param {import('$lib/rsvp-view.js').SortKey} k
   */
  function sortBy(k) {
    if (key === k) dir = dir === 1 ? -1 : 1;
    else {
      key = k;
      dir = k === 'updated_at' ? -1 : 1;
    }
  }

  /**
   * The two halves of a sortable header, as functions rather than as one
   * snippet taking the column as a parameter. A snippet parameter that
   * svelte-check cannot infer needs a JSDoc type comment on the parameter
   * itself, and svelte compiles that to `(k) = $.noop` — parenthesised, which
   * is a syntax error in the browser. It takes the whole page down at
   * hydration while svelte-check and the server render both stay green, so
   * nothing catches it except opening the page.
   *
   * @param {import('$lib/rsvp-view.js').SortKey} k
   */
  const sorted = (k) => (key === k ? (dir === 1 ? 'ascending' : 'descending') : 'none');

  /** @param {import('$lib/rsvp-view.js').SortKey} k */
  const arrow = (k) => (key === k ? (dir === 1 ? ' ↑' : ' ↓') : '');

  /**
   * Native confirm(), no dialog component. It is the one guard between a
   * mis-aimed click and a name off the list; a soft delete makes that
   * recoverable, not free.
   *
   * @param {SubmitEvent} e
   * @param {string} name
   */
  function confirmDelete(e, name) {
    if (!confirm(`Delete the reply from ${name}?`)) e.preventDefault();
  }
</script>

<svelte:head>
  <title>RSVP</title>
  <!-- Belt and braces behind the auth gate. robots.txt is left alone on
       purpose: a Disallow line publishes the path to every crawler that reads
       it, which is the opposite of hiding it. -->
  <meta name="robots" content="noindex, nofollow" />
</svelte:head>

<!-- min-h-screen bg-surface because app.css paints <html> in the night colour
     so the invitation's overscroll shows it. On a short list — one search hit,
     say — that leaves a navy slab under the table. -->
<div class="min-h-screen bg-surface">
  <main class="mx-auto max-w-5xl px-4 py-8 text-ink">
    <header class="mb-6 flex flex-wrap items-baseline justify-between gap-2">
      <!-- The wording of this heading is parsed by the e2e suite for the reply
           count. Searching must not touch it: it is the total on the table, not
           the total on screen. -->
      <h1 class="font-display text-2xl">
        {data.heads} heads · {data.replies} replies · {data.declined} declined
      </h1>
      <div class="flex items-baseline gap-4">
        <!-- Plain client-side nav: / carries no auth middleware, so unlike the
             chip pointing the other way this needs no full reload. -->
        <a class="text-xs font-light underline text-ink-muted hover:text-ink" href="/">
          ← Invitation
        </a>
        {#if data.who}
          <span class="caps text-micro font-light text-ink-muted">{data.who}</span>
        {/if}
      </div>
    </header>

    {#if form?.message}
      <p class="mb-4 text-sm font-light text-accent">{form.message}</p>
    {:else if form?.deleted}
      <!-- A div, not a p: the undo is a form, and a form cannot nest inside a
           paragraph — the browser closes the p early and the markup silently
           comes apart. -->
      <div class="mb-4 flex flex-wrap items-baseline gap-2 text-sm font-light text-ink-muted">
        <span>Deleted <strong class="font-normal text-ink">{form.deleted}</strong>.</span>
        <form method="POST" action="?/restore">
          <input type="hidden" name="name" value={form.deleted} />
          <button class="cursor-pointer underline hover:text-ink" type="submit">Undo</button>
        </form>
      </div>
    {:else if form?.restored}
      <p class="mb-4 text-sm font-light text-ink-muted">
        Restored <strong class="font-normal text-ink">{form.restored}</strong>.
      </p>
    {/if}

    {#if !data.canRead}
      <p class="text-sm font-light text-accent">
        Postgres is unreachable — this list is not just empty, it is unknown.
      </p>
    {:else if !data.replies}
      <p class="text-sm font-light text-ink-muted">No replies yet.</p>
    {:else}
      <div class="mb-4 flex flex-wrap items-baseline gap-3">
        <!-- type=search for the browser's own clear button. No debounce and no
             request: the filter is a comparison over rows already in memory. -->
        <input
          type="search"
          bind:value={q}
          placeholder="Search name, email, song, message"
          aria-label="Search the replies"
          class="w-full border border-line bg-surface-raise sm:w-80 {INPUT_BASE} focus:border-primary focus:outline-none"
        />
        {#if q.trim()}
          <span class="text-note font-light text-ink-muted">
            Showing {shown.length} of {data.replies}
          </span>
        {/if}
      </div>

      {#if !shown.length}
        <p class="text-sm font-light text-ink-muted">No reply matches that.</p>
      {:else}
        <!-- No overflow-x-auto wrapper. It would make this div the scrollport,
             and a sticky <th> sticks to its scrollport — inside a box that never
             scrolls vertically that is the same as not being sticky at all. The
             columns are cut down to four below lg precisely so that nothing needs
             to scroll sideways; see `wide` above. -->
        <table class="w-full border-collapse text-note font-light">
          <thead>
            <tr>
              <th class={head} aria-sort={sorted('name')}>
                <button class={sortButton} onclick={() => sortBy('name')}>Name{arrow('name')}</button>
              </th>
              <th class={head} aria-sort={sorted('going')}>
                <button class={sortButton} onclick={() => sortBy('going')}>Going{arrow('going')}</button>
              </th>
              <th class={head} aria-sort={sorted('headcount')}>
                <button class={sortButton} onclick={() => sortBy('headcount')}>
                  Heads{arrow('headcount')}
                </button>
              </th>
              <th class="{head} hidden lg:table-cell">Email</th>
              <th class="{head} hidden lg:table-cell">Lang</th>
              <th class="{head} hidden lg:table-cell" aria-sort={sorted('updated_at')}>
                <button class={sortButton} onclick={() => sortBy('updated_at')}>
                  Updated{arrow('updated_at')}
                </button>
              </th>
              <th class={head}><span class="sr-only">Delete</span></th>
            </tr>
          </thead>
          {#each shown as r, i (r.name)}
            <!-- One <tbody> per guest, which is legal and is what makes the
                 zebra tint and the hover cover a guest's two rows without any
                 index arithmetic in the markup — and puts the rule between two
                 guests rather than between a guest and their own message. -->
            <tbody
              class="border-b border-line-soft hover:bg-primary-faint/25 {i % 2
                ? 'bg-surface-alt'
                : ''}"
            >
              <tr>
                <td class="{cell} text-ink">
                  <span class="whitespace-nowrap">{r.name}</span>
                  <!-- Below lg the address rides under the name instead of
                       holding a column of its own — as a column it either
                       forces a sideways scroll or gets broken into a five-line
                       stack. It stays in the SAME <tr> either way, which the
                       e2e row assertions depend on. -->
                  {#if r.email}
                    <span class="block break-all text-ink-muted lg:hidden">
                      {@render mailto(r.email)}
                    </span>
                  {/if}
                </td>
                <td class={cell}>{r.going ? '✓' : '✗'}</td>
                <td class="{cell} tabular-nums">{r.going ? r.headcount : '—'}</td>
                <td class={wide}>
                  {#if r.email}{@render mailto(r.email)}{:else}—{/if}
                </td>
                <td class={wide}>{r.lang ?? '—'}</td>
                <td class="{wide} whitespace-nowrap tabular-nums text-ink-muted">
                  <!-- ISO, not a locale format. One reader, and an unambiguous
                       date beats a pretty one when the question is "did they
                       answer before or after I chased them". -->
                  {r.updated_at?.toISOString().slice(0, 16).replace('T', ' ') ?? '—'}
                </td>
                <td class="{cell} whitespace-nowrap">
                  <!-- No use:enhance. A full round trip re-renders the three
                       totals in the heading, which is what you want to see after
                       a delete anyway. The wall buttons below DO enhance, for
                       the opposite reason: they are pressed repeatedly, and a
                       reload would send you back to the top of a long table
                       every time. -->
                  <form method="POST" action="?/delete" onsubmit={(e) => confirmDelete(e, r.name)}>
                    <input type="hidden" name="name" value={r.name} />
                    <button
                      class="cursor-pointer text-xs text-ink-muted underline hover:text-accent"
                      type="submit"
                      aria-label="Delete the reply from {r.name}"
                    >
                      Delete
                    </button>
                  </form>
                </td>
              </tr>
              {#if r.song || r.message}
                <tr>
                  <td colspan="7" class="px-3 pb-3 max-w-prose space-y-2">
                    {#if r.song}
                      <p class="text-body leading-relaxed text-ink-body">
                        <span class="caps text-micro text-ink-muted">Song </span>
                        {r.song}
                      </p>
                    {/if}
                    {#if r.message}
                      <p class="text-body leading-relaxed whitespace-pre-wrap text-ink-body">
                        <span class="caps text-micro text-ink-muted">Message </span>
                        {r.message}
                      </p>
                    {/if}
                  </td>
                </tr>
              {/if}
            </tbody>
          {/each}
        </table>
      {/if}
    {/if}

    <!--
      The wall, in the same table as the RSVP list above — same `cell` and `head`
      classes, same one-<tbody>-per-row shape, so /admin reads as one page rather
      than a table and a pile of cards.

      The message is the column that matters and gets the width. State is an
      icon, because there are three of them and a word costs a column. The
      verdict is the model's own wording and is only ever interesting when
      something looks wrong, so it rides in the row's title attribute rather
      than taking space from the text.
    -->
    <section class="mt-12">
      <div class="flex items-baseline justify-between gap-4">
        <h2 class="text-body font-light text-ink">Wall</h2>
        {#if data.pinned}
          <form method="POST" action="?/wallAction" class="flex items-baseline gap-2" use:enhance>
            <span class="caps text-micro text-ink-muted">Holding until the next post</span>
            <input type="hidden" name="do" value="auto" />
            <button class="cursor-pointer caps text-micro text-primary underline underline-offset-4">
              Resume auto-advance
            </button>
          </form>
        {:else}
          <span class="caps text-micro text-ink-muted">Auto-advancing</span>
        {/if}
      </div>

      {#if !data.wall?.length}
        <p class="mt-2 text-caption font-light text-ink-muted">Nothing yet.</p>
      {:else}
        <table class="mt-3 w-full border-collapse text-note font-light">
          <thead>
            <tr>
              <th class="{head} w-px"><span class="sr-only">State</span></th>
              <th class="{head} w-px"><span class="sr-only">Photo</span></th>
              <th class={head}>From</th>
              <th class={head}>Message</th>
              <th class="{head} w-px">Action</th>
            </tr>
          </thead>
          {#each data.wall as w (w.id)}
            <tbody
              class="border-b border-line-soft hover:bg-primary-faint/25
                     {w.id === data.pinned ? 'bg-primary-faint/40' : ''}"
            >
              <tr>
                <!-- The verdict lives here: available on hover when something
                     looks wrong, invisible the rest of the time. -->
                <td class={cell} title={w.verdict ?? ''}>
                  <span class={stateOf(w.status).cls} aria-label={stateOf(w.status).label}>
                    {stateOf(w.status).icon}
                  </span>
                </td>
                <td class={cell}>
                  {#if w.photo}
                    <img
                      src="/admin/img/{w.id}.jpg"
                      alt=""
                      class="h-11 w-11 object-cover"
                      loading="lazy"
                    />
                  {/if}
                </td>
                <td class="{cell} whitespace-nowrap text-ink">{w.author ?? '—'}</td>
                <td class={cell}>
                  <p
                    class="text-body leading-relaxed whitespace-pre-wrap text-ink-body"
                    dir={w.lang === 'ar' || w.lang === 'fa' ? 'rtl' : 'ltr'}
                  >{w.message ?? ''}</p>
                  {#if w.song}
                    <!-- Never goes to the projector — this is for whoever is
                         running the music, and this table is the only place it
                         can be read. -->
                    <p class="mt-1 text-caption font-light text-ink-muted">♪ {w.song}</p>
                  {/if}
                </td>
                <td class="{cell} whitespace-nowrap">
                  <!-- Buttons, not a select: this is used standing up, at a
                       party, one-handed. A dropdown is two interactions and a
                       chance to pick the wrong row's menu; a button is one. -->
                  <div class="flex gap-1.5">
                    {#if w.status !== 'approved'}
                      {@render act(w.id, 'approved', 'Publish', 'text-ink')}
                    {/if}
                    {#if w.status === 'approved' && w.id !== data.pinned}
                      {@render act(w.id, 'show', 'Show', 'text-primary')}
                    {/if}
                    {#if w.status !== 'rejected'}
                      {@render act(w.id, 'rejected', 'Take down', 'text-accent')}
                    {/if}
                  </div>
                </td>
              </tr>
            </tbody>
          {/each}
        </table>
      {/if}
    </section>
  </main>
</div>

<!-- Rendered twice per guest — once in the name cell for narrow screens, once
     in the email column for wide ones — so the two cannot drift apart. -->
{#snippet mailto(/** @type {string} */ email)}
  <a class="underline" href="mailto:{email}">{email}</a>
{/snippet}

<!-- One wall action. Rendered three times per row rather than written out three
     times, so the padding and the border cannot drift the way the artifact's two
     CTAs did. -->
{#snippet act(
  /** @type {string} */ id,
  /** @type {string} */ value,
  /** @type {string} */ label,
  /** @type {string} */ tone
)}
  <!-- use:enhance is not decoration here. Without it each button is a full form
       POST, the browser navigates, and /admin reloads scrolled back to the top —
       so moderating the tenth photo means scrolling down to it again every
       single time, on a phone, at a party. -->
  <form method="POST" action="?/wallAction" use:enhance>
    <input type="hidden" name="id" value={id} />
    <input type="hidden" name="do" value={value} />
    <button class="cursor-pointer border border-line px-2 py-1 text-xs {tone} hover:bg-primary-faint/40">
      {label}
    </button>
  </form>
{/snippet}
