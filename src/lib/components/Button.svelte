<!--
  The call-to-action. The artifact styled the hero CTA and the RSVP submit button
  identically but wrote the rules out twice; they drifted apart by 1px of padding.
  Renders as <a> when href is given, <button> otherwise.
-->
<script>
  /** @type {{ href?: string, type?: 'button' | 'submit' | 'reset', block?: boolean,
        small?: boolean, children?: import('svelte').Snippet, [key: string]: any }} */
  let { href = undefined, type = 'button', block = false, small = false, children, ...rest } =
    $props();

  const cls = $derived(
    [
      'inline-flex items-center justify-center bg-accent text-accent-ink',
      'font-semibold caps no-underline',
      // `small` is for a button that rides inside body copy rather than
      // standing alone as the section's call to action — the maps link in the
      // essentials list. Same button, quieter presence.
      small ? 'px-5 py-2.5 text-caption' : 'px-8 py-4 text-xs',
      'transition-opacity hover:opacity-90 cursor-pointer',
      block && 'w-full'
    ]
      .filter(Boolean)
      .join(' ')
  );
</script>

{#if href}
  <a {href} class={cls} {...rest}>{@render children?.()}</a>
{:else}
  <button {type} class={cls} {...rest}>{@render children?.()}</button>
{/if}
