<!--
  The guest wall, in a dialog opened from the rail's main call to action.

  A native <dialog> with showModal(), not a hand-rolled overlay: it gives the
  focus trap, Escape-to-close, inertness of the page behind, and the ::backdrop
  pseudo-element for nothing. Every one of those is a thing to get wrong by hand,
  and the focus trap is the one that actually matters for a guest using a
  screen reader on a phone.

  It replaces "Je réponds" because there is no answering the night before —
  the RSVP form is still on the page for anyone who scrolls to it.
-->
<script>
  import WallForm from './WallForm.svelte';

  let { t, lang, form = null, canPost = true } = $props();

  /** @type {HTMLDialogElement | undefined} */
  let dialog = $state();

  export function open() {
    dialog?.showModal();
  }

  // A form action failure re-renders the page with `form` populated. The dialog
  // is closed by then, so reopen it — otherwise the guest's error message is
  // behind a dialog nobody can see, and it reads as the button doing nothing.
  $effect(() => {
    if (form?.wallErrors && dialog && !dialog.open) dialog.showModal();
  });
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
<dialog
  bind:this={dialog}
  class="wall-dialog"
  aria-label={t.wallTitle}
  onclick={(e) => {
    // Click on the backdrop closes. The dialog element itself fills the whole
    // viewport, so the only way to tell "outside" from "inside" is to check the
    // target is the dialog and not a descendant.
    if (e.target === dialog) dialog?.close();
  }}
>
  <div class="panel bg-surface" dir={lang === 'ar' || lang === 'fa' ? 'rtl' : 'ltr'}>
    <div class="flex items-start justify-between gap-4">
      <div>
        <h2 class="text-body font-light text-ink">{t.wallTitle}</h2>
        <p class="mt-1 text-caption font-light text-ink-muted">{t.wallIntro}</p>
      </div>
      <button
        type="button"
        class="shrink-0 px-2 py-1 text-lg leading-none text-ink-muted hover:text-ink"
        aria-label={t.wallClose}
        onclick={() => dialog?.close()}
      >
        ×
      </button>
    </div>

    <WallForm {t} {form} {canPost} />
  </div>
</dialog>

<style>
  .wall-dialog {
    /* The default <dialog> is a centred box with a UA border. Reset it to a
       full-viewport surface we position ourselves, so the panel can sit at the
       bottom on a phone (thumb reach) and centred on a laptop. */
    max-width: 100vw;
    max-height: 100dvh;
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0;
    border: 0;
    background: transparent;
    display: flex;
    align-items: flex-end;
    justify-content: center;
  }

  .wall-dialog:not([open]) {
    display: none;
  }

  .wall-dialog::backdrop {
    background: color-mix(in oklab, black 55%, transparent);
    backdrop-filter: blur(2px);
  }

  .panel {
    width: min(34rem, 100%);
    max-height: 92dvh;
    overflow-y: auto;
    padding: 1.5rem 1.25rem calc(1.5rem + env(safe-area-inset-bottom));
    border: 1px solid var(--color-line);
    animation: rise 220ms ease-out;
  }

  @media (min-width: 40rem) {
    .wall-dialog {
      align-items: center;
    }
    .panel {
      padding: 2rem;
    }
  }

  @keyframes rise {
    from {
      opacity: 0;
      transform: translateY(1.5rem);
    }
    to {
      opacity: 1;
      transform: none;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .panel {
      animation: none;
    }
  }
</style>
