<!--
  The call-to-action. The artifact styled the hero CTA and the RSVP submit button
  identically but wrote the rules out twice; they drifted apart by 1px of padding.
  Renders as <a> when href is given, <button> otherwise.
-->
<script>
  let { href = undefined, type = 'button', block = false, children, ...rest } = $props();

  const cls = $derived(
    [
      'inline-flex items-center justify-center bg-accent text-accent-ink',
      'px-8 py-4 text-xs font-semibold caps no-underline',
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
