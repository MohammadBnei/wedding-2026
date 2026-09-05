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
  import { onMount } from 'svelte';
  import { enhance } from '$app/forms';
  import Field, { ERROR_TEXT } from './Field.svelte';
  import Button from './Button.svelte';
  import { MAX_MESSAGE, MAX_AUTHOR } from '$lib/wall.js';

  /**
   * Where the guest's name is remembered between posts.
   *
   * localStorage, not the `wid` cookie: the name is theirs to see and clear, it
   * is already about to be projected on a wall so it is not a secret, and
   * keeping it client-side means signing again after a reload costs nothing and
   * touches no server state. Someone posting a second photo during the dancing
   * should not have to type their name again on a phone.
   */
  const AUTHOR_KEY = 'wall-author';

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

  // onMount, not $effect: this must run once, on the client, and must never
  // fight the user's own typing. localStorage throws in a locked-down private
  // window, and a guest who cannot be remembered should still be able to post.
  onMount(() => {
    try {
      const saved = localStorage.getItem(AUTHOR_KEY);
      if (saved && !author) author = saved;
    } catch {
      /* remembering is a convenience, never a requirement */
    }
  });

  /** @param {string} name */
  function remember(name) {
    try {
      if (name.trim()) localStorage.setItem(AUTHOR_KEY, name.trim());
    } catch {
      /* see above */
    }
  }
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
            // Only on success. Remembering a name the server just rejected as
            // too long would hand it back pre-filled and pre-broken.
            remember(author);
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

      <!-- name="note", not "message": Field derives its id from the name, and
           the RSVP form on the same page already has a `message` field. Two
           elements with id="f-message" makes the <label for> association
           ambiguous — clicking one label can focus the other input, and a
           screen reader reads the wrong field. -->
      <Field
        label={t.wallMessageLabel}
        name="note"
        bind:value={message}
        rows={3}
        maxlength={MAX_MESSAGE}
        error={errors.note ?? ''}
      />

      <!-- Song requests used to live in the RSVP form, which came off the page
           the day of the wedding. This is now the only place a guest can ask for
           one, so it belongs here rather than nowhere. Same /api/songs
           autocomplete the RSVP form used. -->
      <Field
        label={t.fSong}
        name="song"
        placeholder={t.fSongPh}
        maxlength={200}
        suggest="/api/songs"
      />

      <!--
        One control, one label. There used to be a caption above the input AND
        the browser's own "Choose file" text, saying the same thing twice.

        The input is visually hidden and its <label> is the button, which is the
        only way to style a file picker consistently — `file:` variants get you a
        near-copy of a button, not the button. It carries the same composition as
        Button.svelte so it matches Send rather than approximating it.

        `sr-only`, not `hidden` or `display:none`: the input must stay focusable
        and reachable by a screen reader, and the label shows a focus ring for it
        via focus-within.
      -->
      <div class="flex flex-col gap-1.5">
        <div class="flex flex-wrap items-center gap-3">
          <label
            class="inline-flex cursor-pointer items-center justify-center border border-line
                   bg-surface-raise px-5 py-2.5 text-caption font-semibold caps text-ink
                   transition-opacity hover:opacity-90
                   focus-within:outline focus-within:outline-2 focus-within:outline-primary"
          >
            {photoName ? t.wallPhotoChange : t.wallPhotoLabel}
            <input
              type="file"
              name="photo"
              class="sr-only"
              accept="image/*"
              onchange={(e) => {
                const f = e.currentTarget.files?.[0];
                photoName = f ? f.name : '';
              }}
            />
          </label>

          {#if photoName}
            <!-- `photoName` was captured and rendered nowhere, so a guest picked
                 a photo and got no sign it had taken. This is that sign. -->
            <span class="min-w-0 flex-1 truncate text-caption font-light text-ink-muted">
              {photoName}
            </span>
          {/if}
        </div>
        {#if errors.photo}<span class={ERROR_TEXT}>{errors.photo}</span>{/if}
      </div>

      {#if errors.form}
        <p class={ERROR_TEXT}>{errors.form}</p>
      {/if}

      <div>
        <Button type="submit" disabled={sending}>{t.wallSubmit}</Button>
      </div>
    </form>
  {/if}
</div>
