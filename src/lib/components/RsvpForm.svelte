<!--
  RSVP. The artifact collected `going` and `count` and then never read them, had no
  validation at all, and offered no way back from the thank-you screen. This posts
  to a form action, validates server-side, and upserts on the visitor cookie so a
  guest can change their answer.
-->
<script>
  import { enhance } from '$app/forms';
  import Chip from './Chip.svelte';
  import Field from './Field.svelte';
  import Button from './Button.svelte';
  import Tracery from './Tracery.svelte';
  import { localeDigits } from '$lib/content/wedding.js';

  // `canRsvp` false means Postgres is unreachable (see server/db.js). The rest
  // of the page is unaffected, so the form says so and stops rather than taking
  // an answer it cannot store.
  let { t, lang, existing = null, form = null, canRsvp = true } = $props();

  // Sixteen diamonds over the thank-you panel. Generated, not written out —
  // and derived here rather than inline so the markup stays one <span>.
  // The animation ENDS at opacity 0, so under reduced motion (where the global
  // rule collapses it to a single 0.01ms pass) they simply never appear, which
  // is the right degradation for confetti: absent, not frozen in mid-air.
  const PETAL_TONES = ['bg-gold-soft', 'bg-blush', 'bg-primary-faint opacity-70'];
  const PETALS = Array.from({ length: 16 }, (_, i) => ({
    i,
    start: 5 + i * 6,
    size: 5 + (i % 3) * 3,
    tone: PETAL_TONES[i % 3],
    duration: 2.6 + (i % 5) * 0.5,
    delay: i * 0.12
  }));

  // The largest invites on the guest list bring six and five, which the original
  // 1-4 picker silently under-counted. `+page.server.js` clamps to the same
  // ceiling — widening only the chips would save a 6 as a 1.
  const COUNTS = [1, 2, 3, 4, 5, 6];
  const MAX_COUNT = COUNTS[COUNTS.length - 1];

  let going = $state(existing?.going ?? null);
  let count = $state(existing?.headcount ?? 1);
  let saved = $state(false);
  let submitting = $state(false);

  const errors = $derived(form?.errors ?? {});
</script>

{#if saved}
  <div class="night relative flex flex-col items-center gap-3 overflow-hidden px-5 py-6 text-center">
    {#each PETALS as petal (petal.i)}
      <span
        class="absolute top-0 rotate-45 {petal.tone}"
        style="inset-inline-start:{petal.start}%;width:{petal.size}px;height:{petal.size}px;animation:petal-fall {petal.duration}s {petal.delay}s ease-in both"
        aria-hidden="true"
      ></span>
    {/each}
    <Tracery kind="star" class="w-8 text-blush" />
    <p class="font-display text-xl text-primary-ink">{t.thanksTitle}</p>
    <p class="text-[13px] leading-relaxed font-light text-primary-faint">{t.thanksBody}</p>
    <button
      type="button"
      class="caps mt-1 text-[10px] font-light text-primary-faint underline"
      onclick={() => (saved = false)}
    >
      {t.editReply}
    </button>
  </div>
{:else}
  <form
    method="POST"
    action="?/rsvp"
    class="flex flex-col gap-4"
    use:enhance={() => {
      submitting = true;
      return async ({ result, update }) => {
        submitting = false;
        if (result.type === 'success') saved = true;
        await update({ reset: false });
      };
    }}
  >
    <input type="hidden" name="going" value={going === null ? '' : String(going)} />
    <input type="hidden" name="headcount" value={count} />

    <div class="flex flex-col gap-1.5">
      <div class="flex gap-2">
        <Chip size="lg" block selected={going === true} onclick={() => (going = true)}>
          {t.yes}
        </Chip>
        <Chip
          size="lg"
          block
          selectedAs="muted"
          selected={going === false}
          onclick={() => (going = false)}
        >
          {t.no}
        </Chip>
      </div>
      {#if errors.going}
        <p class="text-xs font-light text-accent">{errors.going}</p>
      {/if}
    </div>

    <Field
      label={t.fName}
      name="name"
      required
      maxlength={120}
      error={errors.name ?? ''}
      suggest="/api/guests"
      onpick={(/** @type {{ count?: number }} */ g) => {
        // The guest list knows how many heads each invite covers, so picking a
        // name saves the guest counting their own family.
        if (g.count) count = Math.min(g.count, MAX_COUNT);
      }}
    />

    <!--
      Outside the going check on purpose: someone who cannot come is exactly the
      person worth being able to send photographs to afterwards, and hiding the
      box the moment they press "no" takes that away.
    -->
    <Field label={t.fEmail} name="email" type="email" maxlength={200} />

    {#if going !== false}
      <div class="flex flex-col gap-1.5">
        <span class="caps text-[11px] font-light text-ink-muted">{t.fCount}</span>
        <div class="flex gap-1.5">
          {#each COUNTS as n (n)}
            <Chip selected={count === n} onclick={() => (count = n)}>
              {localeDigits(n, lang)}
            </Chip>
          {/each}
        </div>
      </div>

      <Field
        label={t.fSong}
        name="song"
        placeholder={t.fSongPh}
        maxlength={200}
        suggest="/api/songs"
      />
    {/if}

    <Field label={t.fWord} name="message" rows={3} maxlength={2000} />

    {#if errors.form || !canRsvp}
      <p class="text-xs font-light text-accent">{errors.form || t.rsvpOffline}</p>
    {/if}

    <Button type="submit" block disabled={submitting || !canRsvp}>{t.sendRsvp}</Button>
  </form>
{/if}
