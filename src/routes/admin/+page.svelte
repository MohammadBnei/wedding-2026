<!--
  The RSVP list. Gated at Traefik by authentik (helm/values.yaml); linked from
  the invitation's control bar only when an authentik session cookie is present
  (see +layout.server.js), so guests never see the way in.

  Deliberately plain: no i18n, no components, no sorting, no export. It is a
  table of the rows and the three numbers you actually need, and every feature
  it does not have is one that cannot break the day before the wedding.

  Delete is soft — the row keeps its song and its message and comes back with
  one UPDATE. The undo strip below covers the delete you just made; see the
  README for anything older.
-->
<script>
  let { data, form } = $props();

  const cell = 'px-3 py-2 align-top border-b border-line-soft';
  const head = 'px-3 py-2 text-start caps text-[10px] font-light text-ink-muted border-b border-line';

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

<main class="mx-auto max-w-5xl px-4 py-8 text-ink">
  <header class="mb-6 flex flex-wrap items-baseline justify-between gap-2">
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
        <span class="caps text-[10px] font-light text-ink-muted">{data.who}</span>
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
    <div class="overflow-x-auto">
      <table class="w-full border-collapse text-[13px] font-light">
        <thead>
          <tr>
            <th class={head}>Name</th>
            <th class={head}>Going</th>
            <th class={head}>Heads</th>
            <th class={head}>Email</th>
            <th class={head}>Song</th>
            <th class={head}>Message</th>
            <th class={head}>Lang</th>
            <th class={head}>Updated</th>
            <th class={head}><span class="sr-only">Delete</span></th>
          </tr>
        </thead>
        <tbody>
          {#each data.rows as r (r.name)}
            <tr>
              <td class="{cell} whitespace-nowrap text-ink">{r.name}</td>
              <td class={cell}>{r.going ? '✓' : '✗'}</td>
              <td class={cell}>{r.going ? r.headcount : '—'}</td>
              <td class={cell}>
                {#if r.email}
                  <a class="underline" href="mailto:{r.email}">{r.email}</a>
                {:else}—{/if}
              </td>
              <td class={cell}>{r.song ?? '—'}</td>
              <td class="{cell} max-w-xs whitespace-pre-wrap">{r.message ?? '—'}</td>
              <td class={cell}>{r.lang ?? '—'}</td>
              <td class="{cell} whitespace-nowrap text-ink-muted">
                <!-- ISO, not a locale format. One reader, and an unambiguous
                     date beats a pretty one when the question is "did they
                     answer before or after I chased them". -->
                {r.updated_at?.toISOString().slice(0, 16).replace('T', ' ') ?? '—'}
              </td>
              <td class="{cell} whitespace-nowrap">
                <!-- No use:enhance. A full round trip re-renders the three
                     totals in the heading, which is what you want to see after
                     a delete anyway. -->
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
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</main>
