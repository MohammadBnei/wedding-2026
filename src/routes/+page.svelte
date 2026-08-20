<script>
  import { SHARED } from '$lib/content/wedding.js';
  import { dirOf } from '$lib/content/wedding.js';

  import Section from '$lib/components/Section.svelte';
  import Zigzag from '$lib/components/Zigzag.svelte';
  import Ornament from '$lib/components/Ornament.svelte';
  import Button from '$lib/components/Button.svelte';
  import Row from '$lib/components/Row.svelte';
  import GardenPlan from '$lib/components/GardenPlan.svelte';
  import Chat from '$lib/components/Chat.svelte';
  import RsvpForm from '$lib/components/RsvpForm.svelte';
  import LangSwitcher from '$lib/components/LangSwitcher.svelte';
  import ThemeToggle from '$lib/components/ThemeToggle.svelte';

  let { data, form } = $props();

  const t = $derived(data.t);
  const rtl = $derived(dirOf(data.lang) === 'rtl');
</script>

<!--
  Desktop is a two-column editorial spread: a sticky identity rail and a scrolling
  content column. Below lg: the grid collapses and the rail's contents reflow into
  the hero arch + sticky language bar the design started from. One breakpoint.
-->
<div
  class="mx-auto grid min-h-screen max-w-[1400px] bg-primary-surface lg:grid-cols-[minmax(300px,380px)_1fr]"
>
  <!-- ── identity rail ─────────────────────────────────────────────── -->
  <header
    class="flex min-h-dvh flex-col bg-primary-surface lg:sticky lg:top-0 lg:h-screen lg:min-h-0 lg:overflow-y-auto"
  >
    <div class="flex flex-1 flex-col lg:h-full lg:justify-between lg:px-9 lg:py-10">
      <!-- The mihrab arch. On desktop it drops its rounding and becomes a panel. -->
      <div class="flex flex-1 flex-col justify-center px-5 pt-6 lg:block lg:flex-none lg:pt-0 lg:px-0">
        <!--
          A pointed arch, not a dome. The card's top edge is an ellipse whose
          apex sits at dead centre, so a square rotated 45deg and centred on
          that apex puts its own corner above it — two cream shapes reading as
          one silhouette that rises to a point. Same trick as the ornaments: no
          image, no SVG, and it scales with the card because the peak is pinned
          to the centre rather than a fixed offset.
        -->
        <div class="relative lg:contents">
          <div
            class="absolute left-1/2 top-0 h-9 w-9 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-surface lg:hidden"
            aria-hidden="true"
          ></div>
          <div
            class="flex flex-col items-center gap-4 bg-surface px-7 pt-14 pb-8 [border-radius:50%_50%_0_0/46px_46px_0_0] lg:items-start lg:rounded-none lg:bg-transparent lg:px-0 lg:pt-0 lg:text-start"
          >
            <Ornament kind="star" size={44} tone="accent" punch="surface" />

            <h1
              dir="ltr"
              class="font-display text-center text-[clamp(26px,7.2vw,34px)] leading-tight text-ink lg:text-start lg:text-[34px] lg:text-primary-ink"
            >
              {SHARED.names.latin[0]} <em class="text-accent">&amp;</em><br />
              {SHARED.names.latin[1]}
            </h1>

            <p dir="rtl" lang="ar" class="font-arabic text-lg font-bold text-primary lg:text-primary-faint">
              {SHARED.names.arabic}
            </p>
            <p dir="rtl" lang="ar" class="font-arabic text-base text-accent lg:text-blush">
              {SHARED.motto}
            </p>

            <div class="h-px w-8 bg-line lg:bg-primary-soft"></div>

            <p
              class="caps-wide text-center text-xs leading-loose font-light text-ink-muted lg:text-start lg:text-primary-faint"
            >
              {t.date}<br />{t.town}
            </p>

            <Button href="#rsvp">{t.rsvpCta}</Button>
          </div>
        </div>
      </div>

      <!-- Sticky control bar on mobile; just the footer of the rail on desktop. -->
      <div
        class="sticky top-0 z-20 flex items-center justify-between gap-2 bg-primary-surface px-5 py-3.5 lg:static lg:mt-8 lg:flex-col lg:items-start lg:gap-5 lg:px-0"
      >
        <span class="caps text-xs font-light text-primary-faint lg:hidden">{SHARED.monogram}</span>
        <div class="flex items-center gap-1.5">
          <LangSwitcher current={data.lang} />
          <ThemeToggle current={data.theme} />
        </div>
      </div>

      <!-- The banding belongs to the hero on mobile: it closes the full-height
           block instead of being the first thing the content column does. On
           desktop it stays in the scrolling column, where it spans the width. -->
      <div class="lg:hidden">
        <Zigzag />
      </div>

      <!-- The address sits in the rail on desktop and in the footer on mobile.
           There are deliberately no phone numbers anywhere — see wedding.js. -->
      <div class="hidden lg:mt-8 lg:block">
        <p class="caps-wide text-[11px] font-light text-primary-faint">{t.address}</p>
        <p dir="ltr" class="mt-1.5 text-sm leading-relaxed font-light text-primary-ink">
          {SHARED.addressLine1}<br />{SHARED.addressLine2}
        </p>
        <p class="font-display mt-5 text-[17px] italic text-blush">{t.signoff}</p>
      </div>
    </div>
  </header>

  <!-- ── scrolling content ─────────────────────────────────────────── -->
  <main class="flex flex-col bg-surface">
    <div class="hidden lg:block">
      <Zigzag />
    </div>

    <Section kicker={t.welcomeKicker}>
      <p class="text-[15px] leading-loose font-light text-ink-body text-pretty">{t.welcome1}</p>
      <p class="text-[15px] leading-loose font-light text-ink-body text-pretty">{t.welcome2}</p>
    </Section>

    <Section title={t.dayTitle}>
      <div class="flex flex-col gap-4">
        {#each t.schedule as item (item.time)}
          <Row lead={item.time} leadWidth="time" title={item.title}>{item.note}</Row>
        {/each}
      </div>
    </Section>

    <Zigzag />

    <Section title={t.essTitle}>
      <GardenPlan pins={t.pins} placeholder={t.planPlaceholder} {rtl} />
      <div class="mt-2 flex flex-col gap-3.5">
        {#each t.facts as fact (fact.label)}
          <Row lead={fact.label} leadWidth="label">{fact.value}</Row>
        {/each}
      </div>
      {#if data.photoDropUrl}
        <div class="mt-2">
          <Button href={data.photoDropUrl} rel="noopener noreferrer" target="_blank">
            {t.photoCta}
          </Button>
        </div>
      {/if}
    </Section>

    <Section title={t.chatTitle} tone="alt" fill>
      <p class="text-[13px] leading-relaxed font-light text-ink-muted">{t.chatSub}</p>
      <Chat {t} messages={data.messages} lang={data.lang} />
      <p class="text-[11px] font-light text-ink-muted">{t.botNote}</p>
    </Section>

    <Zigzag />

    <Section title={t.rsvpTitle} id="rsvp">
      <p class="text-[13px] leading-relaxed font-light text-ink-muted">{t.rsvpSub}</p>
      <RsvpForm {t} existing={data.rsvp} {form} />
    </Section>

    <!-- Mobile footer. On desktop this content lives in the rail instead. -->
    <footer class="flex flex-col items-center gap-3.5 bg-primary-surface px-6 py-8 text-center lg:hidden">
      <p class="caps-wide text-[11px] font-light text-primary-faint">{t.address}</p>
      <p dir="ltr" class="text-sm leading-relaxed font-light text-primary-ink">
        {SHARED.addressLine1}<br />{SHARED.addressLine2}
      </p>
      <p class="font-display mt-1.5 text-[17px] italic text-blush">{t.signoff}</p>
    </footer>
  </main>
</div>
