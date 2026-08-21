<!--
  The schedule as a timeline: one gold rail, one lozenge node per entry.

  Not a variant of Row.svelte. Row is a two-column labelled list and still serves
  the essentials; teaching it to also be a timeline would cost more than this
  file does. Everything directional is logical (ps-, start-), so the rail moves
  to the right in Arabic and Persian.

  The rail is a sibling of the <ol> rather than a child, because an <ol> may only
  contain <li>.

  An entry carries either a `note` sentence or an `items` list — the programme
  for one hour is a list of things, and running them into a sentence loses the
  scannability that made it a list in the first place.
-->
<script>
  let { items } = $props();
</script>

<div class="relative ps-6.5">
  <!-- Fades out at the foot: the day carries on past the last printed entry. -->
  <div
    class="absolute start-[5px] top-2 bottom-4.5 w-px bg-linear-to-b from-gold-soft via-gold to-transparent"
    aria-hidden="true"
  ></div>

  <ol class="flex flex-col">
    {#each items as item, i (i)}
      <li class="relative pb-5">
        <!-- 11px wide, pulled back 26px, so its centre sits on the rail at 5px. -->
        <span
          class="absolute -start-[26px] top-1.5 h-[11px] w-[11px] rotate-45 border border-gold bg-surface"
          aria-hidden="true"
        ></span>
        <div class="flex items-baseline gap-3.5">
          <span class="w-13 shrink-0 text-[13px] font-semibold text-accent">{item.time}</span>
          <div class="flex-1">
            <p class="text-[15px] text-ink">{item.title}</p>
            {#if item.items}
              <ul class="mt-1.5 flex flex-col gap-1">
                {#each item.items as entry (entry)}
                  <li
                    class="relative ps-4 text-[13px] leading-relaxed font-light text-ink-muted text-pretty
                           before:absolute before:start-0 before:top-[0.55em] before:h-1 before:w-1
                           before:rotate-45 before:bg-gold before:content-['']"
                  >
                    {entry}
                  </li>
                {/each}
              </ul>
            {:else}
              <p class="text-[13px] leading-relaxed font-light text-ink-muted text-pretty">
                {item.note}
              </p>
            {/if}
          </div>
        </div>
      </li>
    {/each}
  </ol>
</div>
