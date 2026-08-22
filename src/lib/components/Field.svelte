<!--
  A labelled form field. Three inputs and a textarea in the artifact each carried
  the same padding/border/background written out by hand.

  `suggest` turns the input into an autocompleting one. It lives here rather than
  in the callers because Field is already the single place every input renders,
  and a native <datalist> means no typeahead component and no dependency.
-->
<script module>
  /**
   * What a text input looks like. Exported because the chat composer is the one
   * input on the site that is NOT a Field — it puts the border on the <form> so
   * the box and the send button read as a single control — and it had drifted a
   * half padding step away from this while looking identical.
   *
   * Border, background and width are deliberately NOT in here: those are exactly
   * the parts the two callers legitimately differ on.
   */
  export const INPUT_BASE =
    'px-3.5 py-3 text-sm font-light text-ink placeholder:text-ink-muted';

  /**
   * How a validation message looks. RsvpForm has two errors that belong to no
   * single Field — the yes/no group, and the form-level one — so they cannot go
   * through this component, but they must not look like a different thing.
   */
  export const ERROR_TEXT = 'text-xs font-light text-accent';
</script>

<script>
  import { MIN_CHARS } from '$lib/match.js';

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
    `w-full bg-surface-raise border border-line ${INPUT_BASE} ` +
    'focus:border-primary focus:outline-none';

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
  <label for={id} class="caps text-caption font-light text-ink-muted">{label}</label>
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
    <p id="{id}-err" class={ERROR_TEXT}>{error}</p>
  {/if}
</div>
