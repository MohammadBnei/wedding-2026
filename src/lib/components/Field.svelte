<!--
  A labelled form field. Three inputs and a textarea in the artifact each carried
  the same padding/border/background written out by hand.
-->
<script>
  let {
    label,
    name,
    value = $bindable(''),
    type = 'text',
    placeholder = '',
    rows = 0,
    required = false,
    error = '',
    maxlength = undefined
  } = $props();

  const id = `f-${name}`;
  const input =
    'w-full bg-surface-raise border border-line px-3.5 py-3 text-sm font-light text-ink ' +
    'placeholder:text-ink-muted focus:border-primary focus:outline-none';
</script>

<div class="flex flex-col gap-1.5">
  <label for={id} class="caps text-[11px] font-light text-ink-muted">{label}</label>
  {#if rows}
    <textarea
      {id}
      {name}
      {placeholder}
      {rows}
      {required}
      {maxlength}
      bind:value
      aria-invalid={error ? 'true' : undefined}
      aria-describedby={error ? `${id}-err` : undefined}
      class="{input} resize-y leading-relaxed"
    ></textarea>
  {:else}
    <input
      {id}
      {name}
      {type}
      {placeholder}
      {required}
      {maxlength}
      bind:value
      aria-invalid={error ? 'true' : undefined}
      aria-describedby={error ? `${id}-err` : undefined}
      class={input}
    />
  {/if}
  {#if error}
    <p id="{id}-err" class="text-xs font-light text-accent">{error}</p>
  {/if}
</div>
