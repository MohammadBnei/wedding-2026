<!--
  The schedule as a timeline: one gold rail, one eight-point star per stop.

  Not a variant of Row.svelte. Row is a two-column labelled list and still serves
  the essentials; teaching it to also be a timeline would cost more than this
  file does. Everything directional is logical (ps-, start-), so the rail moves
  to the right in Arabic and Persian.

  The rail is a sibling of the <ol> rather than a child, because an <ol> may only
  contain <li>.

  An entry's `items` are stops on the SAME rail, not a bullet list parked beside
  it — the programme for one hour is a sequence of things, and the rail is what
  says so. They sit in the title column with the time column left blank, which is
  what marks them as belonging to the hour above. An entry with a `note` instead
  renders as one such stop.
-->
<script>
  import { star } from '$lib/tracery.js';

  let { items } = $props();
</script>

{#snippet mark(/** @type {string} */ cls)}
  <!-- Outlined, and filled with the page rather than left transparent: the rail
       runs behind them and would otherwise show through the middle. -->
  <svg viewBox="0 0 12 12" class="absolute text-gold {cls}" aria-hidden="true">
    <path
      d={star(6, 6, 5.5)}
      fill="var(--color-surface)"
      stroke="currentColor"
      stroke-width="1.1"
      vector-effect="non-scaling-stroke"
    />
  </svg>
{/snippet}

<div class="relative ps-6.5">
  <!-- Fades out at the foot: the day carries on past the last printed entry. -->
  <div
    class="absolute start-[5px] top-2 bottom-4.5 w-px bg-linear-to-b from-gold-soft via-gold to-transparent"
    aria-hidden="true"
  ></div>

  <ol class="flex flex-col">
    {#each items as item, i (i)}
      <!-- 14px wide, pulled back 27px, so its centre sits on the rail at 5px. -->
      <li class="relative pb-3.5 {i ? 'pt-3' : ''}">
        {@render mark('h-3.5 w-3.5 -start-[27px] top-[4px]')}
        <div class="flex items-baseline gap-3.5">
          <span class="w-13 shrink-0 text-[13px] font-semibold text-accent">{item.time}</span>
          <p class="flex-1 text-[15px] text-ink">{item.title}</p>
        </div>
      </li>
      {#each item.items ?? [item.note] as entry (entry)}
        <!-- 10px wide, pulled back 25.5px — same centre, smaller star. -->
        <li class="relative pb-3">
          {@render mark('h-2.5 w-2.5 -start-[25.5px] top-[5.5px]')}
          <div class="flex gap-3.5">
            <span class="w-13 shrink-0" aria-hidden="true"></span>
            <p class="flex-1 text-[13px] leading-relaxed font-light text-ink-muted text-pretty">
              {entry}
            </p>
          </div>
        </li>
      {/each}
    {/each}
  </ol>
</div>
