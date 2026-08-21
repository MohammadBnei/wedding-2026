<script>
  import { SHARED } from '$lib/content/wedding.js';

  import Section from '$lib/components/Section.svelte';
  import Zigzag from '$lib/components/Zigzag.svelte';
  import Arch from '$lib/components/Arch.svelte';
  import Door from '$lib/components/Door.svelte';
  import Sprig from '$lib/components/Sprig.svelte';
  import Flourish from '$lib/components/Flourish.svelte';
  import Tracery from '$lib/components/Tracery.svelte';
  import { reveal } from '$lib/actions/reveal.js';
  import Button from '$lib/components/Button.svelte';
  import Row from '$lib/components/Row.svelte';
  import Timeline from '$lib/components/Timeline.svelte';
  import Origins from '$lib/components/Origins.svelte';
  import Countdown from '$lib/components/Countdown.svelte';
  import GardenPlan from '$lib/components/GardenPlan.svelte';
  import Chat from '$lib/components/Chat.svelte';
  import RsvpForm from '$lib/components/RsvpForm.svelte';
  import LangSwitcher from '$lib/components/LangSwitcher.svelte';
  import ThemeToggle from '$lib/components/ThemeToggle.svelte';

  let { data, form } = $props();

  const t = $derived(data.t);
</script>

<!--
  Desktop is a two-column editorial spread: a sticky identity rail and a scrolling
  content column. Below lg: the grid collapses and the rail's contents reflow into
  the hero arch + sticky language bar the design started from. One breakpoint.

  `lang-fade` dims the whole page while a language switch is in flight — see
  LangSwitcher and app.css.
-->
<!-- The door is mounted here rather than in +layout.svelte, so /no-such-page
     still answers with the bare localized 404 and nothing to open first. -->
<Door {t} />

<div
  class="night lang-fade mx-auto grid min-h-screen max-w-[1400px] lg:grid-cols-[minmax(300px,380px)_1fr]"
>
  <!-- ── identity rail ─────────────────────────────────────────────── -->
  <header
    class="night relative isolate flex min-h-dvh flex-col lg:sticky lg:top-0 lg:h-screen lg:min-h-0 lg:overflow-y-auto"
  >
    <!-- The one tracery that rests fully drawn rather than drawing itself on:
         it is above the fold, where a 2.6s draw would compete with the hero's
         own entrance instead of accompanying it. -->
    <Tracery
      kind="zellij"
      class="pointer-events-none absolute end-1.5 top-2 -z-10 w-33 text-gold-soft opacity-50"
    />

    <div class="flex flex-1 flex-col lg:h-full lg:justify-between lg:px-9 lg:py-10">
      <!-- The mihrab arch. On desktop it drops its rounding and becomes a panel. -->
      <div class="flex flex-1 flex-col justify-center px-5 pt-6 lg:block lg:flex-none lg:px-0 lg:pt-0">
        <!-- The arch head is decorative and mobile-only; on desktop the rail
             is a flat panel, so it is dropped rather than squared off. -->
        <div class="hero-arch relative lg:hidden">
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
        <!--
          `hero-stagger` walks its children in one after another. The delays are
          keyed on position in app.css rather than written inline here, so adding
          or removing something below re-staggers the rest instead of leaving a
          hole in the sequence.
        -->
        <div
          class="hero-card hero-stagger relative -mt-px flex flex-col items-center gap-4 bg-surface px-7 pb-8 lg:mt-0 lg:items-start lg:bg-transparent lg:px-0 lg:text-start"
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
              repeating-linear-gradient(to bottom, var(--color-arch-line) 0 1.4px, transparent 1.4px 7px) left top / 1.4px 100% no-repeat,
              repeating-linear-gradient(to bottom, var(--color-arch-line) 0 1.4px, transparent 1.4px 7px) right top / 1.4px 100% no-repeat,
              repeating-linear-gradient(to right, var(--color-arch-line) 0 1.4px, transparent 1.4px 7px) left bottom / 100% 1.4px no-repeat"
            aria-hidden="true"
          ></div>

          <!-- The greeting the door just gave, said once more inside. It stands
               where the eight-point star used to: the star was a second Maghrebi
               mark directly above the zellij in the rail's corner, and a phrase
               opens the page in a way an ornament cannot. -->
          <p
            dir="rtl"
            lang="ar"
            class="font-arabic text-xl text-gold lg:text-gold-soft"
          >
            {SHARED.salam}
          </p>

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

          <Flourish width="w-28" />

          <p
            class="caps-wide text-center text-xs leading-loose font-light text-ink-muted lg:text-start lg:text-primary-faint"
          >
            {t.date}<br />{t.town}
          </p>

          <div class="mb-4 lg:mb-6">
            <Button href="#rsvp">{t.rsvpCta}</Button>
          </div>
        </div>
      </div>

      <!-- Sticky control bar on mobile; just the footer of the rail on desktop. -->
      <div
        class="night sticky top-0 z-20 flex items-center justify-between gap-2 px-5 py-3.5 lg:static lg:mt-8 lg:flex-col lg:items-start lg:gap-5 lg:px-0"
      >
        <span class="caps text-xs font-light text-primary-faint lg:hidden">{SHARED.monogram}</span>
        <div class="flex items-center gap-1.5">
          <LangSwitcher current={data.lang} />
          <ThemeToggle current={data.theme} />
        </div>
      </div>

      <!-- The arch's pair of sprays is mobile-only, so the desktop rail gets its
           own, low and behind the address block. -->
      <Sprig
        leaves={9}
        class="pointer-events-none absolute bottom-6 -end-2 hidden h-28 w-28 -scale-x-100 text-primary-faint opacity-25 lg:block"
      />

      <!-- The address sits in the rail on desktop and in the footer on mobile.
           There are deliberately no phone numbers anywhere — see wedding.js. -->
      <div class="hidden lg:mt-8 lg:block">
        <Tracery kind="band" class="w-full text-gold-soft" />
        <p class="font-display mt-5 text-[15px] leading-relaxed italic text-primary-ink text-pretty">
          {t.closing}
        </p>
        <span class="mt-5 block h-1.5 w-1.5 rotate-45 bg-gold-soft" aria-hidden="true"></span>
        <p class="caps-wide mt-5 text-[11px] font-light text-primary-faint">{t.address}</p>
        <p dir="ltr" class="mt-1.5 text-sm leading-relaxed font-light text-primary-ink">
          {SHARED.addressLine1}<br />{SHARED.addressLine2}
        </p>
        <span class="mt-5 block h-1.5 w-1.5 rotate-45 bg-gold-soft" aria-hidden="true"></span>
        <!-- dir=ltr: the signature is a pair of Latin proper nouns and must not
             reorder in Arabic or Persian. -->
        <p dir="ltr" class="font-script mt-4 text-[26px] leading-tight text-gold-soft">
          {SHARED.names.latin[0]}<span class="mx-1.5">&amp;</span>{SHARED.names.latin[1]}
        </p>
      </div>
    </div>
  </header>

  <!-- ── scrolling content ─────────────────────────────────────────── -->
  <main class="flex flex-col bg-surface">
    <!--
      Everything the night frames. The mobile footer is deliberately OUTSIDE it:
      the footer is already a night field, so a fade there would be invisible and
      the paper-to-footer transition — the one that actually needs softening —
      would get no fade at all. Ending the wrapper here puts it exactly on that seam.
    -->
    <div class="relative isolate flex flex-col py-28 lg:py-32">
      <Section kicker={t.welcomeKicker}>
        <Tracery
          class="pointer-events-none absolute end-3 bottom-2 -z-10 w-16 -scale-x-100 text-gold opacity-40"
        />
        <p class="text-[15px] leading-loose font-light text-ink-body text-pretty">{t.welcome1}</p>
        <p class="text-[15px] leading-loose font-light text-ink-body text-pretty">{t.welcome2}</p>
        <Origins title={t.originsTitle} items={t.origins} />
        <Countdown {t} lang={data.lang} />
      </Section>

      <Section title={t.dayTitle}>
        <Sprig leaves={8}
          class="pointer-events-none absolute end-4 top-6 -z-10 h-20 w-20 text-gold opacity-45"
        />
        <Timeline items={t.schedule} />
        <!-- The .ics covers the garden lunch onwards only — see wedding.ics/+server.js.
             No `download` attribute: the point is to hand the file to the phone's
             calendar app, and `download` forces a save instead. The endpoint
             serves it `inline` to match. `data-sveltekit-reload` stops the client
             router from trying to treat an endpoint as a page. -->
        <div class="mt-2 flex justify-center">
          <Button href="/wedding.ics" data-sveltekit-reload>{t.calendarCta}</Button>
        </div>
      </Section>

      <Zigzag reverse={true} />

      <Section title={t.essTitle}>
        <Tracery
          kind="zellij"
          class="pointer-events-none absolute end-0 top-3 -z-10 w-26 text-gold opacity-30"
        />
        <Sprig flip leaves={6}
          class="pointer-events-none absolute start-1 bottom-4 -z-10 h-16 w-16 text-gold opacity-45"
        />
        <GardenPlan pins={t.pins} placeholder={t.planPlaceholder} lang={data.lang} />
        <div class="mt-2 flex flex-col gap-3.5">
          {#each t.facts as fact (fact.label)}
            <Row lead={fact.label} leadWidth="label">{fact.value}</Row>
          {/each}
        </div>
        {#if data.photoDropUrl}
          <div class="mt-2 flex justify-center">
            <Button href={data.photoDropUrl} rel="noopener noreferrer" target="_blank">
              {t.photoCta}
            </Button>
          </div>
        {/if}
      </Section>

      <Zigzag reverse={false} />

      <Section title={t.chatTitle} tone="alt" fill>
        <Tracery
          class="pointer-events-none absolute end-2 top-2 -z-10 w-18 rotate-180 text-gold opacity-40"
        />
        <Sprig flip leaves={9}
          class="pointer-events-none absolute start-2 bottom-6 -z-10 h-24 w-24 text-gold opacity-45"
        />
        <p class="text-[13px] leading-relaxed font-light text-ink-muted">{t.chatSub}</p>
        <Chat {t} messages={data.messages} lang={data.lang} />
        <p class="text-[11px] font-light text-ink-muted">{t.botNote}</p>
      </Section>

      <Zigzag reverse={true} />

      <Section title={t.rsvpTitle} id="rsvp">
        <Tracery
          class="pointer-events-none absolute start-0 bottom-3 -z-10 w-18 text-gold opacity-40"
        />
        <p class="text-[13px] leading-relaxed font-light text-ink-muted">{t.rsvpSub}</p>
        <RsvpForm {t} lang={data.lang} existing={data.rsvp} {form} canRsvp={data.canRsvp} />
      </Section>

      <!--
        Sunrise. `use:reveal` on the wrappers is doing two jobs at once: it rises
        the sun into place, and the `data-shown` it stamps is what starts the
        rays drawing themselves. No animation of its own — see app.css.

        The wrapper is what moves, not the SVG: reveal-rise animates `transform`,
        which would fight a -translate-x-1/2 for centring. Centring with flex
        keeps the two off each other.
      -->
      <div class="dawn-band pointer-events-none absolute inset-x-0 top-0 z-10" aria-hidden="true">
        <div use:reveal class="rises absolute inset-x-0 top-4 flex justify-center lg:top-5">
          <Tracery kind="sun" class="turns w-14 text-gold-soft lg:w-16" />
        </div>
        <div use:reveal class="absolute inset-x-0 bottom-0 flex items-end justify-between px-6 lg:px-10">
          <div class="flex items-end">
            <!-- Sprig's stem foot sits at y=60 of a 64 viewBox, 6.25% above the
                 bottom edge; the grass baseline is the edge itself. Nudging by
                 that fraction is what puts them on one ground line. -->
            <Sprig
              leaves={6}
              class="sways [animation-delay:800ms] -me-3 h-12 w-12 translate-y-[6.25%] text-gold opacity-70 lg:h-16 lg:w-16"
            />
            <Tracery kind="grass" class="sways w-24 text-gold lg:w-32" />
          </div>
          <div class="flex items-end">
            <Tracery kind="grass" class="sways [animation-delay:1900ms] w-24 -scale-x-100 text-gold lg:w-32" />
            <Sprig
              flip
              leaves={6}
              class="sways [animation-delay:2900ms] -ms-3 h-12 w-12 translate-y-[6.25%] text-gold opacity-70 lg:h-16 lg:w-16"
            />
          </div>
        </div>
      </div>

      <!-- Moonrise, and the stars again below it. -->
      <div
        class="dawn-band pointer-events-none absolute inset-x-0 bottom-0 z-10"
        style="--dawn-to: to top"
        aria-hidden="true"
      >
        <div use:reveal class="rises absolute inset-x-0 bottom-4 flex justify-center lg:bottom-5">
          <Tracery kind="moon" class="w-16 text-primary-faint lg:w-20" />
        </div>
      </div>
    </div>

    <!-- Mobile footer. On desktop this content lives in the rail instead. -->
    <footer class="night flex flex-col items-center gap-3.5 px-6 py-9 text-center lg:hidden">
      <Tracery kind="band" class="w-full text-gold-soft" />
      <p
        class="font-display mt-1 max-w-[19rem] text-[15px] leading-relaxed italic text-primary-ink text-pretty"
      >
        {t.closing}
      </p>
      <span class="h-1.5 w-1.5 rotate-45 bg-gold-soft" aria-hidden="true"></span>
      <p class="caps-wide text-[11px] font-light text-primary-faint">{t.address}</p>
      <p dir="ltr" class="text-sm leading-relaxed font-light text-primary-ink">
        {SHARED.addressLine1}<br />{SHARED.addressLine2}
      </p>
      <span class="h-1.5 w-1.5 rotate-45 bg-gold-soft" aria-hidden="true"></span>
      <p dir="ltr" class="font-script mt-2 text-[30px] leading-tight text-gold-soft">
        {SHARED.names.latin[0]}<span class="mx-1.5">&amp;</span>{SHARED.names.latin[1]}
      </p>
    </footer>
  </main>
</div>
