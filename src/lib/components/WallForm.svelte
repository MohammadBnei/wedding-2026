<!--
  The guest wall composer. A signature, a message, a photo — the signature is
  required, because an unsigned card on a three-metre screen is a message from
  nobody, and half the pleasure of the wall is the room working out who wrote it.

  The name field reuses `suggest="/api/guests"`, the same autocomplete the RSVP
  uses, so most guests sign by picking their own name off the real guest list.
  It is a suggestion, never a constraint: a plus-one nobody entered, or a cousin
  under a nickname, must still be able to sign.
-->
<script>
  import { enhance } from '$app/forms';
  import Field, { ERROR_TEXT } from './Field.svelte';
  import Button from './Button.svelte';
  import { MAX_MESSAGE, MAX_AUTHOR } from '$lib/wall.js';

  // `canPost` false means Postgres is down or the kill switch is flipped. Say so
  // before they write something and choose a photo, not after they press send.
  let { t, form = null, canPost = true } = $props();

  let author = $state('');
  let message = $state('');
  let posted = $state(false);
  let sending = $state(false);
  /** @type {string} */
  let photoName = $state('');

  const errors = $derived(form?.wallErrors ?? {});
</script>

<div class="mt-6">
  {#if posted}
    <!--
      Deliberately says "in a moment", not "done". Everything lands pending and
      is screened after the response, so a card really can take a few seconds —
      and on the night a photo may wait longer. Promising less than we deliver.
    -->
    <p class="text-body font-light text-ink-body">{t.wallPending}</p>
    <button
      type="button"
      class="mt-3 text-xs font-light text-primary underline underline-offset-4"
      onclick={() => {
        posted = false;
        message = '';
        photoName = '';
      }}
    >
      {t.wallSubmit}
    </button>
  {:else if !canPost}
    <p class="text-body font-light text-ink-muted">{t.wallClosed}</p>
  {:else}
    <form
      method="POST"
      action="?/wall"
      enctype="multipart/form-data"
      class="flex flex-col gap-4"
      use:enhance={() => {
        sending = true;
        return async ({ result, update }) => {
          sending = false;
          if (result.type === 'success') {
            posted = true;
            // reset:false — a validation failure must not wipe what they typed,
            // and on venue wifi retyping a message is how people give up.
            await update({ reset: false });
          } else {
            await update({ reset: false });
          }
        };
      }}
    >
      <Field
        label={t.wallSign}
        name="author"
        bind:value={author}
        required
        maxlength={MAX_AUTHOR}
        error={errors.author ?? ''}
        suggest="/api/guests"
      />

      <Field
        label={t.wallMessageLabel}
        name="message"
        bind:value={message}
        rows={3}
        maxlength={MAX_MESSAGE}
        error={errors.message ?? ''}
      />

      <label class="flex flex-col gap-1.5">
        <span class="text-micro tracking-caps uppercase text-ink-muted">{t.wallPhotoLabel}</span>
        <input
          type="file"
          name="photo"
          accept="image/jpeg,image/png,image/webp"
          class="text-sm font-light text-ink-body file:mr-3 file:border file:border-line
                 file:bg-surface-raise file:px-3 file:py-2 file:text-xs file:font-light
                 file:text-ink"
          onchange={(e) => {
            const f = e.currentTarget.files?.[0];
            photoName = f ? f.name : '';
          }}
        />
        {#if errors.photo}<span class={ERROR_TEXT}>{errors.photo}</span>{/if}
      </label>

      {#if errors.form}
        <p class={ERROR_TEXT}>{errors.form}</p>
      {/if}

      <div>
        <Button type="submit" disabled={sending}>{t.wallSubmit}</Button>
      </div>
    </form>
  {/if}
</div>
