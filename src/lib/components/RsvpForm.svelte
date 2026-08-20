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
  import Ornament from './Ornament.svelte';

  let { t, existing = null, form = null } = $props();

  let going = $state(existing?.going ?? null);
  let count = $state(existing?.headcount ?? 1);
  let saved = $state(false);
  let submitting = $state(false);

  const errors = $derived(form?.errors ?? {});
</script>

{#if saved}
  <div class="flex flex-col items-center gap-3 bg-primary-surface px-5 py-6 text-center">
    <Ornament kind="star" size={32} tone="blush" punch="primary-surface" />
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

    <Field label={t.fName} name="name" required maxlength={120} error={errors.name ?? ''} />

    {#if going !== false}
      <div class="flex flex-col gap-1.5">
        <span class="caps text-[11px] font-light text-ink-muted">{t.fCount}</span>
        <div class="flex gap-1.5">
          {#each [1, 2, 3, 4] as n (n)}
            <Chip selected={count === n} onclick={() => (count = n)}>{n}</Chip>
          {/each}
        </div>
      </div>

      <Field label={t.fSong} name="song" placeholder={t.fSongPh} maxlength={200} />
    {/if}

    <Field label={t.fWord} name="message" rows={3} maxlength={2000} />

    {#if errors.form}
      <p class="text-xs font-light text-accent">{errors.form}</p>
    {/if}

    <Button type="submit" block disabled={submitting}>{t.sendRsvp}</Button>
  </form>
{/if}
