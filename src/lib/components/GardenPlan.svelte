<!--
  The garden plan: four numbered pins over a background, with a callout for the
  selected one. The background is a hatched placeholder until a real drawing is
  dropped at static/plan.jpg and SHARED.gardenPlanImage points at it — the pins
  are positioned in percentages, so they scale over whatever goes underneath.
-->
<script>
  import { PIN_POS, SHARED, localeDigits } from '$lib/content/wedding.js';

  // `lang`, not `rtl`: the pin numerals differ between Arabic and Persian, so
  // the direction alone was never enough to pick them.
  let { pins, placeholder, lang } = $props();

  // The artifact defaulted to the third pin, "the big tree" — the gathering point.
  let active = $state(2);
</script>

<div class="flex flex-col gap-4">
  <div
    class="relative h-70 border border-line bg-surface-alt bg-cover bg-center"
    style={SHARED.gardenPlanImage ? `background-image:url(${SHARED.gardenPlanImage})` : ''}
  >
    {#if !SHARED.gardenPlanImage}
      <div
        class="absolute inset-0 opacity-60"
        style="background:repeating-linear-gradient(45deg,var(--color-line) 0 2px,transparent 2px 9px)"
        aria-hidden="true"
      ></div>
      <p
        class="absolute inset-x-0 bottom-2.5 text-center font-mono text-[10px] tracking-wider text-ink-muted"
      >
        {placeholder}
      </p>
    {/if}

    {#each pins as pin, i (i)}
      <button
        type="button"
        class="absolute flex h-7.5 w-7.5 items-center justify-center text-xs font-semibold transition-opacity {i ===
        active
          ? 'bg-accent text-accent-ink'
          : 'bg-primary text-primary-ink opacity-55 hover:opacity-80'}"
        style="left:{PIN_POS[i].left};top:{PIN_POS[i].top}{i === active
          ? ''
          : `;animation:pin-pulse 2.4s ${i * 0.4}s ease-out infinite`}"
        onclick={() => (active = i)}
        aria-pressed={i === active}
        aria-label={pin.label}
      >
        {localeDigits(i + 1, lang)}
      </button>
    {/each}
  </div>

  <!-- border-s-, not border-l-: mirrors correctly in Arabic and Persian. -->
  <div class="border-s-[3px] border-primary bg-surface-raise px-4.5 py-4">
    <p class="text-xs font-semibold tracking-wide text-primary">{pins[active].label}</p>
    <p class="mt-1 text-sm leading-relaxed font-light text-ink-body">{pins[active].text}</p>
  </div>
</div>
