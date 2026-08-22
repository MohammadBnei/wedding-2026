<!--
  The one chip. The original artifact had FOUR hand-written copies of this
  pattern — the language switcher, the FAQ suggestions, the headcount picker and
  the yes/no toggle — each repeating its own padding / border / colour triple, so
  changing the chip look meant finding all four. This is all four.

  tone       where it sits: 'default' on paper, 'on-primary' on the green rail
  selected   is it the active choice
  selectedAs 'primary' (normal) or 'muted' (the "I can't make it" toggle)
  size       'sm' (language, FAQ, headcount) or 'lg' (the yes/no toggle)
  block      stretch to fill a flex row
  class      appended last, so a caller can pin a width (the control bar does)
-->
<script>
  /** @type {{ tone?: 'default' | 'on-primary', selected?: boolean,
        selectedAs?: 'primary' | 'muted', size?: 'sm' | 'lg', block?: boolean,
        type?: 'button' | 'submit' | 'reset', class?: string,
        children?: import('svelte').Snippet, [key: string]: any }} */
  let {
    tone = 'default',
    selected = undefined,
    selectedAs = 'primary',
    size = 'sm',
    block = false,
    type = 'button',
    class: klass = '',
    children,
    ...rest
  } = $props();

  const base =
    'inline-flex items-center justify-center border transition-colors cursor-pointer ' +
    'disabled:cursor-not-allowed disabled:opacity-50';

  const sizes = {
    sm: 'px-3 py-2 text-xs font-light',
    lg: 'px-4 py-3.5 text-caption font-semibold caps'
  };

  const tones = {
    default: {
      off: 'border-line bg-transparent text-ink-muted hover:border-primary hover:text-primary hover:bg-surface-raise',
      primary: 'border-primary bg-primary text-primary-ink',
      muted: 'border-ink-muted bg-ink-muted text-surface'
    },
    'on-primary': {
      /* selected is an indigo outline on the night field, not a white fill: the
         off state is a hairline at 40% of the same indigo, so the selected one
         reads as the same border turned up rather than as a different object. */
      off: 'border-primary-soft/40 bg-transparent text-primary-faint hover:text-primary-ink hover:border-primary-ink',
      primary: 'border-primary bg-primary/25 text-primary-ink',
      muted: 'border-primary bg-primary/25 text-primary-ink'
    }
  };

  const cls = $derived(
    [base, sizes[size], block && 'flex-1', tones[tone][selected ? selectedAs : 'off'], klass]
      .filter(Boolean)
      .join(' ')
  );
</script>

<!-- aria-pressed only when this chip really is a toggle; a plain action
     button that reports aria-pressed="false" reads as a stuck toggle. -->
<button {type} class={cls} aria-pressed={selected === undefined ? undefined : selected} {...rest}>
  {@render children?.()}
</button>
