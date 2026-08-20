<!--
  A content section. The artifact repeated `padding:30px 26px` and the 24px Bodoni
  title inline in five places.

  tone  'paper' (default surface) or 'alt' (the sand panel behind the chat)
-->
<script>
  // `fill`: cap the section at the viewport rather than force it there. It sizes
  // to its content and stops growing at 100dvh, at which point whatever is inside
  // marked to scroll takes over — no dead space when the content is short.
  let { title = '', kicker = '', tone = 'paper', id = undefined, fill = false, children } = $props();
</script>

<section
  {id}
  class="flex flex-col gap-4 px-6 py-8 lg:px-10 lg:py-12 {tone === 'alt' ? 'bg-surface-alt' : ''} {fill
    ? 'max-h-dvh lg:max-h-none'
    : ''}"
>
  {#if kicker}
    <p class="caps-wide text-[11px] leading-relaxed font-light text-accent">{kicker}</p>
  {/if}
  {#if title}
    <h2 class="font-display text-2xl font-normal text-ink lg:text-3xl">{title}</h2>
  {/if}
  {@render children?.()}
</section>
