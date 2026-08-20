<!--
  A labelled form field. Three inputs and a textarea in the artifact each carried
  the same padding/border/background written out by hand.

  `suggest` turns the input into an autocompleting one. It lives here rather than
  in the callers because Field is already the single place every input renders,
  and a native <datalist> means no typeahead component and no dependency.
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
    maxlength = undefined,
    suggest = '',
    onpick = null
  } = $props();

  const id = `f-${name}`;
  const input =
    'w-full bg-surface-raise border border-line px-3.5 py-3 text-sm font-light text-ink ' +
    'placeholder:text-ink-muted focus:border-primary focus:outline-none';

  const MIN_CHARS = 2;
  const DEBOUNCE = 250;

  /** @type {{ value: string }[]} */
  let options = $state([]);
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let timer;

  function onInput() {
    if (!suggest) return;
    const q = String(value ?? '').trim();

    // A <datalist> fires no selection event — the only tell is the value landing
    // exactly on one of the options we offered.
    const picked = options.find((o) => o.value === q);
    if (picked) {
      onpick?.(picked);
      return;
    }

    clearTimeout(timer);
    if (q.length < MIN_CHARS) {
      options = [];
      return;
    }
    timer = setTimeout(async () => {
      const results = await fetch(`${suggest}?q=${encodeURIComponent(q)}`)
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => []);
      // Responses can land out of order; a slow one for an older query must not
      // overwrite the suggestions for what is in the box now.
      if (String(value ?? '').trim() === q) options = results;
    }, DEBOUNCE);
  }
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
      oninput={onInput}
      list={suggest ? `${id}-list` : undefined}
      aria-invalid={error ? 'true' : undefined}
      aria-describedby={error ? `${id}-err` : undefined}
      class={input}
    />
    {#if suggest}
      <datalist id="{id}-list">
        {#each options as option (option.value)}
          <option value={option.value}></option>
        {/each}
      </datalist>
    {/if}
  {/if}
  {#if error}
    <p id="{id}-err" class="text-xs font-light text-accent">{error}</p>
  {/if}
</div>
