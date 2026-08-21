<!--
  Days, hours and minutes to the garden lunch.

  The maths lives in $lib/countdown.js so it can be asserted on without a DOM;
  this holds nothing but `now`.
-->
<script>
  import { breakdown } from '$lib/countdown.js';
  import { localeDigits, SHARED } from '$lib/content/wedding.js';
  import { venueInstant } from '$lib/ics.js';

  let { t, lang } = $props();

  // The same instant the .ics and the JSON-LD use — not a second copy of the
  // date, and not a second copy of the venue's UTC offset.
  const target = venueInstant(SHARED.isoDate, 15).getTime();

  // Date.now() is UTC epoch and the target is an absolute instant, so this is
  // the same number on the server and in the browser even where they disagree
  // about the timezone. The minute can land either side of a tick across the
  // hydration boundary; Svelte patches that text node and nothing else changes.
  let now = $state(Date.now());
  const left = $derived(breakdown(target - now));

  // Minutes, not seconds: a seconds hand would repaint the page sixty times a
  // minute to animate the last digit of a date a year out.
  $effect(() => {
    const id = setInterval(() => (now = Date.now()), 30_000);
    return () => clearInterval(id);
  });

  const cells = $derived([
    { n: left.days, label: t.cdDays },
    { n: left.hours, label: t.cdHours },
    { n: left.mins, label: t.cdMins }
  ]);
</script>

<dl class="mx-auto flex w-full max-w-sm justify-center gap-4 border border-dotted border-gold-soft p-4.5">
  {#each cells as cell (cell.label)}
    <!-- dt before dd in the DOM so it reads "days: 380", reversed visually so the
         numeral is on top. Swapping the source order instead would be invalid. -->
    <div class="flex min-w-15.5 flex-col-reverse items-center gap-1">
      <dt class="caps text-[9px] font-light text-ink-muted">{cell.label}</dt>
      <!-- Keyed on the value, so the block is rebuilt — and the animation runs —
           when the figure actually changes, rather than on every 30s tick. -->
      {#key cell.n}
        <dd class="font-display ticks m-0 text-[28px] leading-none text-ink">
          {localeDigits(cell.n, lang)}
        </dd>
      {/key}
    </div>
  {/each}
</dl>
