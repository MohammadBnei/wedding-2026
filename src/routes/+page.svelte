<script>
  import { SHARED } from '$lib/content/wedding.js';
  import { dirOf } from '$lib/content/wedding.js';

  import Section from '$lib/components/Section.svelte';
  import Zigzag from '$lib/components/Zigzag.svelte';
  import Ornament from '$lib/components/Ornament.svelte';
  import Arch from '$lib/components/Arch.svelte';
  import Sprig from '$lib/components/Sprig.svelte';
  import Flourish from '$lib/components/Flourish.svelte';
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
        <!-- The arch head is decorative and mobile-only; on desktop the rail
             is a flat panel, so it is dropped rather than squared off. -->
        <div class="relative lg:hidden">
          <!-- Sprays either side of the crown, echoing the botanical borders on
               the henna card. Low opacity and behind the arch: they should read
               as texture in the green, not as illustration competing with it. -->
          <Sprig class="pointer-events-none absolute -top-10 left-1 h-16 w-16 text-primary-faint opacity-30" />
          <Sprig
            flip
            leaves={6}
            class="pointer-events-none absolute -top-8 right-1 h-14 w-14 text-primary-faint opacity-25"
          />
          <Arch />
        </div>
        <div
          class="relative -mt-px flex flex-col items-center gap-4 bg-surface px-7 pb-8 lg:mt-0 lg:items-start lg:bg-transparent lg:px-0 lg:text-start"
        >
          <!--
            The dotted tracery continues down the sides and across the foot, so it
            frames the whole card rather than stopping at the arch. The arch's
            dotted path meets the springing line at 5% and 95% of the width (it is
            the outline scaled 0.9 about centre), which is why this inset is 5%.
            Pitch is 1.4px every 7px to match the SVG's non-scaling stroke.

            The foot inset has to equal the side inset. A percentage `bottom`
            resolves against HEIGHT, not width, so it cannot just be 5% — the card
            is (100vw - 40px) wide, making 5% of it 5vw - 2px.
          -->
          <div
            class="pointer-events-none absolute inset-x-[5%] top-0 bottom-[calc(5vw-2px)] opacity-55 lg:hidden"
            style="background:
              repeating-linear-gradient(to bottom, var(--color-accent) 0 1.4px, transparent 1.4px 7px) left top / 1.4px 100% no-repeat,
              repeating-linear-gradient(to bottom, var(--color-accent) 0 1.4px, transparent 1.4px 7px) right top / 1.4px 100% no-repeat,
              repeating-linear-gradient(to right, var(--color-accent) 0 1.4px, transparent 1.4px 7px) left bottom / 100% 1.4px no-repeat"
            aria-hidden="true"
          ></div>
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

            <Flourish width="w-28" />

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

      <!-- The banding belongs to the hero on mobile: it closes the full-height
           block instead of being the first thing the content column does. On
           desktop it stays in the scrolling column, where it spans the width. -->
      <div class="lg:hidden">
        <Zigzag reverse={false} />
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
      <Zigzag reverse={false} />
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
      <!-- The .ics covers the garden lunch onwards only — see wedding.ics/+server.js. -->
      <div class="mt-2">
        <Button href="/wedding.ics" download>{t.calendarCta}</Button>
      </div>
    </Section>

    <Zigzag reverse={true} />

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

    <Zigzag reverse={false} />

    <Section title={t.chatTitle} tone="alt" fill>
      <p class="text-[13px] leading-relaxed font-light text-ink-muted">{t.chatSub}</p>
      <Chat {t} messages={data.messages} lang={data.lang} />
      <p class="text-[11px] font-light text-ink-muted">{t.botNote}</p>
    </Section>

    <Zigzag reverse={true} />

    <Section title={t.rsvpTitle} id="rsvp">
      <p class="text-[13px] leading-relaxed font-light text-ink-muted">{t.rsvpSub}</p>
      <RsvpForm {t} existing={data.rsvp} {form} canRsvp={data.canRsvp} />
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
