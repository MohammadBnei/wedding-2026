<!--
  The two CSS-only Maghrebi ornaments the design is built on. No images anywhere
  in this project — these are rotated squares and border-radius tricks.

  star   an 8-point star: two squares, one rotated 45deg, with a smaller square
         of the background colour punched through the middle
  petal  a single rotated square with two rounded opposite corners
-->
<script>
  let { kind = 'star', size = 44, tone = 'accent', punch = 'surface' } = $props();

  // Tokens only. `punch` must match whatever the ornament sits on, since it fakes
  // a hole by painting the background colour on top.
  const fills = {
    accent: 'bg-accent',
    primary: 'bg-primary',
    'primary-surface': 'bg-primary-surface',
    surface: 'bg-surface',
    blush: 'bg-blush'
  };
  const inset = $derived(Math.round(size * 0.32));
</script>

{#if kind === 'star'}
  <div class="relative shrink-0" style="width:{size}px;height:{size}px" aria-hidden="true">
    <div class="absolute inset-0 {fills[tone]}"></div>
    <div class="absolute inset-0 rotate-45 {fills[tone]}"></div>
    <div
      class="absolute rotate-45 {fills[punch]}"
      style="inset:{inset}px"
    ></div>
  </div>
{:else}
  <div
    class="shrink-0 rotate-45 {fills[tone]}"
    style="width:{size}px;height:{size}px;border-radius:3px 40% 3px 40%"
    aria-hidden="true"
  ></div>
{/if}
