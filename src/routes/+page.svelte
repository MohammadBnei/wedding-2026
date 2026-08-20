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
  <header class="bg-primary-surface lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto">
    <div class="flex flex-col lg:h-full lg:justify-between lg:px-9 lg:py-10">
      <!-- The mihrab arch. On desktop it drops its rounding and becomes a panel. -->
      <div class="px-5 pt-6 lg:px-0 lg:pt-0">
        <div class="flex justify-center pb-4 lg:hidden">
          <Ornament kind="petal" size={26} tone="surface" />
        </div>
        <div
          class="flex flex-col items-center gap-4 bg-surface px-7 pt-19 pb-8 [border-radius:50%_50%_0_0/96px_96px_0_0] lg:items-start lg:rounded-none lg:bg-transparent lg:px-0 lg:pt-0 lg:text-start"
        >
          <Ornament kind="star" size={44} tone="accent" punch="surface" />

          <h1
            dir="ltr"
            class="font-display text-center text-[34px] leading-tight text-ink lg:text-start lg:text-primary-ink"
          >
            {SHARED.names.latin[0]} <em class="text-accent">&amp;</em><br />
            {SHARED.names.latin[1]}
          </h1>

          <p dir="rtl" lang="ar" class="font-arabic text-lg font-bold text-primary lg:text-primary-faint">
            {SHARED.names.arabic}
          </p>
          <p dir="rtl" lang="fa" class="font-persian text-sm text-ink-muted lg:text-primary-faint">
            {SHARED.names.persian}
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
    <Zigzag />

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
      {#if SHARED.photoDropUrl}
        <div class="mt-2">
          <Button href={SHARED.photoDropUrl} rel="noopener noreferrer" target="_blank">
            {t.photoCta}
          </Button>
        </div>
      {/if}
    </Section>

    <Section title={t.chatTitle} tone="alt">
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
