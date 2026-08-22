<!--
  RSVP. The artifact collected `going` and `count` and then never read them, had no
  validation at all, and offered no way back from the thank-you screen. This posts
  to a form action, validates server-side, and upserts on the visitor cookie so a
  guest can change their answer.
-->
<script>
  import { enhance } from '$app/forms';
  import Chip from './Chip.svelte';
  import Field, { ERROR_TEXT } from './Field.svelte';
  import Button from './Button.svelte';
  import Tracery from './Tracery.svelte';
  import { localeDigits } from '$lib/content/wedding.js';
  import { COUNTS, MAX_COUNT } from '$lib/rsvp.js';

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


  let going = $state(existing?.going ?? null);
  let count = $state(existing?.headcount ?? 1);
  let saved = $state(false);
  /** @type {HTMLElement | undefined} */
  let panel = $state();
  $effect(() => {
    if (saved) panel?.focus();
  });
  let submitting = $state(false);

  const errors = $derived(form?.errors ?? {});
</script>

{#if saved}
  <!-- The form this replaces has just been unmounted with focus inside it, so
       without both of these a screen-reader user presses "send" and gets
       silence, with focus dumped on <body>. This is the site's whole point.
       role="status" is polite: it waits for a pause rather than cutting in. -->
  <div
    role="status"
    tabindex="-1"
    bind:this={panel}
    class="night relative flex flex-col items-center gap-3 overflow-hidden px-5 py-6 text-center focus:outline-none"
  >
    {#each PETALS as petal (petal.i)}
      <span
        class="absolute top-0 rotate-45 {petal.tone}"
        style="inset-inline-start:{petal.start}%;width:{petal.size}px;height:{petal.size}px;animation:petal-fall {petal.duration}s {petal.delay}s ease-in both"
        aria-hidden="true"
      ></span>
    {/each}
    <Tracery kind="star" class="w-8 text-blush" />
    <p class="font-display text-xl text-primary-ink">{t.thanksTitle}</p>
    <!-- `going` is the answer that was just posted — `saved` is only ever set
         from the enhance callback, so it cannot be a button clicked afterwards.
         The yes copy ends on the date and the garden, which is the one thing a
         guest who has just declined must not be told (issue #22). -->
    <p class="text-note leading-relaxed font-light text-primary-faint">
      {going === false ? t.thanksBodyNo : t.thanksBody}
    </p>
    <button
      type="button"
      class="caps mt-1 text-micro font-light text-primary-faint underline"
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
      <!-- Named from the section's own title rather than a new content string:
           the pair IS the reply. aria-label, not aria-labelledby — the heading
           lives in +page.svelte, outside this component. -->
      <div
        class="flex gap-2"
        role="group"
        aria-label={t.rsvpTitle}
        aria-describedby={errors.going ? 'rsvp-going-err' : undefined}
      >
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
        <p id="rsvp-going-err" class={ERROR_TEXT}>{errors.going}</p>
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
        <span id="rsvp-count-label" class="caps text-caption font-light text-ink-muted"
          >{t.fCount}</span
        >
        <div class="flex gap-1.5" role="group" aria-labelledby="rsvp-count-label">
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
      <p role="alert" class={ERROR_TEXT}>{errors.form || t.rsvpOffline}</p>
    {/if}

    <Button type="submit" block disabled={submitting || !canRsvp}>{t.sendRsvp}</Button>
  </form>
{/if}
