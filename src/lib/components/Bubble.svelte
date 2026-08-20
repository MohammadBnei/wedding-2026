<!--
  A chat message. border-inline-start, not border-left, so the accent rule sits on
  the correct edge in Arabic and Persian.
-->
<script>
  let { role = 'assistant', children } = $props();
</script>

<div class="flex {role === 'user' ? 'justify-end' : 'justify-start'}">
  {#if role === 'user'}
    <div class="max-w-[82%] bg-primary px-4 py-3 text-sm leading-relaxed font-light text-primary-ink">
      {@render children?.()}
    </div>
  {:else}
    <div
      class="max-w-[88%] border-s-2 border-accent bg-surface-raise px-4 py-3 text-sm leading-relaxed font-light text-ink-body"
    >
      {@render children?.()}
    </div>
  {/if}
</div>
