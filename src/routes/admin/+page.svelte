<!--
  The RSVP list. Unlinked from anywhere, gated at Traefik by authentik
  (helm/values.yaml), read by two people a handful of times.

  Deliberately plain: no i18n, no components, no sorting, no export. It is a
  table of the rows and the three numbers you actually need, and every feature
  it does not have is one that cannot break the day before the wedding.
-->
<script>
  let { data } = $props();

  const cell = 'px-3 py-2 align-top border-b border-line-soft';
  const head = 'px-3 py-2 text-start caps text-micro font-light text-ink-muted border-b border-line';
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
    {#if data.who}
      <span class="caps text-micro font-light text-ink-muted">{data.who}</span>
    {/if}
  </header>

  {#if !data.canRead}
    <p class="text-sm font-light text-accent">
      Postgres is unreachable — this list is not just empty, it is unknown.
    </p>
  {:else if !data.replies}
    <p class="text-sm font-light text-ink-muted">No replies yet.</p>
  {:else}
    <div class="overflow-x-auto">
      <table class="w-full border-collapse text-note font-light">
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
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</main>
