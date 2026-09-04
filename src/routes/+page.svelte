<script>
  import { SHARED, starQuotes } from '$lib/content/wedding.js';

  import Section from '$lib/components/Section.svelte';
  import Zigzag from '$lib/components/Zigzag.svelte';
  import Arch from '$lib/components/Arch.svelte';
  import Door from '$lib/components/Door.svelte';
  import Flourish from '$lib/components/Flourish.svelte';
  import Tracery from '$lib/components/Tracery.svelte';
  import { reveal } from '$lib/actions/reveal.js';
  import Button from '$lib/components/Button.svelte';
  import Row from '$lib/components/Row.svelte';
  import Timeline from '$lib/components/Timeline.svelte';
  import VerseCard from '$lib/components/VerseCard.svelte';
  import Countdown from '$lib/components/Countdown.svelte';
  import GardenPlan from '$lib/components/GardenPlan.svelte';
  import Chat from '$lib/components/Chat.svelte';
  import RsvpForm from '$lib/components/RsvpForm.svelte';
  import WallModal from '$lib/components/WallModal.svelte';
  import LangSwitcher from '$lib/components/LangSwitcher.svelte';
  import ThemeToggle from '$lib/components/ThemeToggle.svelte';
  import Chip from '$lib/components/Chip.svelte';

  let { data, form } = $props();


  /** @type {ReturnType<typeof WallModal> | undefined} */
  let wallModal = $state();
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
    <!-- Nothing is laid on this field on purpose. It carries the girih, and a
         zellij corner and a pair of sprays on top of strapwork is two patterns
         arguing. The ornaments live on the paper column, where there is no
         pattern for them to fight. -->
    <div class="flex flex-1 flex-col lg:h-full lg:justify-between lg:px-9 lg:py-10">
      <!-- The mihrab arch. On desktop it drops its rounding and becomes a panel. -->
      <div class="flex flex-1 flex-col justify-center px-3 pt-6 lg:block lg:flex-none lg:px-0 lg:pt-0">
        <!-- The arch head is decorative and mobile-only; on desktop the rail
             is a flat panel, so it is dropped rather than squared off.

             It is the SAME arch and the same component as the door that opens
             the site — see Arch.svelte. That arch springs at 10% and 90% of its
             width, so the card below is 80% and centred: the card's two edges ARE
             the jambs, and the rules down its sides are those jambs carrying on
             past the springing line. -->
        <div class="hero-arch relative lg:hidden">
          <Arch />
        </div>
        <!--
          `hero-stagger` walks its children in one after another. The delays are
          keyed on position in app.css rather than written inline here, so adding
          or removing something below re-staggers the rest instead of leaving a
          hole in the sequence.
        -->
        <div
          class="hero-card hero-stagger relative -mt-px flex w-4/5 flex-col items-center gap-4 self-center bg-surface px-4 pt-6 pb-8 lg:mt-0 lg:w-full lg:items-start lg:self-stretch lg:bg-transparent lg:px-0 lg:pt-0 lg:text-start"
        >
          <!--
            The frame continues down the sides and across the foot, so it runs
            round the whole card rather than stopping at the arch. Plain inset-0:
            the card is exactly the width the arch springs at, so its own edges
            ARE the jambs and there is no percentage to keep in step with the
            curve. 3px to match Arch.svelte's non-scaling stroke.
          -->
          <div
            class="pointer-events-none absolute inset-0 border-x-[3px] border-b-[3px] lg:hidden"
            style="border-color: var(--color-arch-line)"
            aria-hidden="true"
          ></div>

          <!--
            The greeting the door just gave, said once more inside. It stands
            where the eight-point star used to: the star was a second Maghrebi
            mark directly above the zellij in the rail's corner, and a phrase
            opens the page in a way an ornament cannot.

            It also carries the whole stack UP into the arch, which is why the
            margin is here and not on .hero-card. The card is 80% wide and the
            arch is narrower than that everywhere above its springing line, so a
            card raised into the head sticks its own white corners out past the
            curve on both sides. Raising the CONTENT instead leaves the white box
            standing on the springing where it belongs, and the text above it is
            simply on the arch's own fill — the same white in light, the same
            night in dark. A negative top margin on the first child shortens the
            card by exactly as much, so nothing opens up underneath.

            27% of the CARD's width is 22% of the arch's, which puts the salam at
            y = 18 of the head's 40.19. Lower than it looks: the arch is down to a
            third of its width by y = 10, and the crown wants to stay empty.
          -->
          <p
            dir="rtl"
            lang="ar"
            class="-mt-[27%] font-arabic text-[21px] text-gold lg:mt-0 lg:text-gold-soft"
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

          <p dir="rtl" lang="ar" class="font-arabic text-[21px] text-primary lg:text-primary-faint">
            {SHARED.names.arabic}
          </p>

          <!--
            The point of the page. Everything else in this card — the names and
            the date — is equally true of a dinner invitation; this is the
            only line that says what is being celebrated. It sits directly under
            the names because it reads off them: "Leïla & Mohammad-Amine / ont la
            joie de vous convier à leur mariage".
          -->
          <p
            class="font-display text-center text-note leading-relaxed italic text-ink-body text-pretty lg:text-start lg:text-primary-ink"
          >
            {t.heroInvite}
          </p>

          <Flourish width="w-28" />

          <p
            class="caps-wide text-center text-caption leading-loose font-light text-ink-muted lg:text-start lg:text-primary-faint"
          >
            {t.date}
          </p>

          <div class="mb-4 lg:mb-6">
            <!-- Was `href="#rsvp"`. Replaced the night before the wedding:
                 nobody is answering an invitation at that point, and the wall is
                 the thing we actually want a guest's thumb to land on. The RSVP
                 form is still on the page for anyone who scrolls to it. -->
            <Button onclick={() => wallModal?.open()}>{t.wallCta}</Button>
          </div>
        </div>
      </div>

      <!-- Sticky control bar on mobile; just the footer of the rail on desktop. -->
      <div
        class="night sticky top-0 z-20 flex items-center gap-1.5 px-5 py-3.5 lg:static lg:mt-8 lg:px-0"
      >
        <!-- The four languages on one side, the theme toggle on the other, one
             row across the bar's whole width. Logical order, not left/right: the
             flex row reverses in Arabic and Persian, so the toggle stays on the
             end you read towards.

             LangSwitcher brings its own grid and its own flex-1 — it is the part
             that stretches; the toggle is one icon and stays one icon wide. -->
        <LangSwitcher current={data.lang} label={t.langLabel} />
        <ThemeToggle current={data.theme} toLight={t.themeToLight} toDark={t.themeToDark} />
        <!--
          The way in to /admin, drawn only when an authentik session cookie is
          present (+layout.server.js). It sits in the control bar rather than the
          card above because it is a utility control like the language and theme
          chips; an accent Button in the card would compete with the one CTA the
          card exists to lead to.

          data-sveltekit-reload is REQUIRED and only fails in production.
          Without it this is a client-side navigation, so SvelteKit fetches
          /admin/__data.json — which goes through the PathPrefix(`/admin`) route,
          hits forwardAuth, and comes back as a cross-origin 302 to
          authentik.bnei.dev that the router cannot follow. Same reason
          /wedding.ics carries it below.

          English, and not in wedding.js: two people ever see this, and the page
          it opens is English too.
        -->
        {#if data.admin}
          <Chip href="/admin" tone="on-primary" data-sveltekit-reload>Admin</Chip>
        {/if}
      </div>

      <!-- The address sits in the rail on desktop and in the footer on mobile.
           There are deliberately no phone numbers anywhere — see wedding.js. -->
      <div class="hidden lg:mt-8 lg:block">
        <Tracery kind="band" class="w-full text-gold-soft" />
        <p class="font-display mt-5 text-body leading-relaxed italic text-primary-ink text-pretty">
          {t.closing}
        </p>
        <Tracery kind="star" class="mt-5 w-2.5 text-gold-soft" />
        <p class="caps-wide mt-5 text-caption font-light text-primary-faint">{t.address}</p>
        <p dir="ltr" class="mt-1.5 text-sm leading-relaxed font-light text-primary-ink">
          {SHARED.addressLine1}<br />{SHARED.addressLine2}
        </p>
        <Tracery kind="star" class="mt-5 w-2.5 text-gold-soft" />
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
      <Section seed="welcome" quotes={starQuotes('welcome', data.lang)} hint={t.starHint}>
        <!--
          The Bismillah opens the invitation text, as it opens the document it
          is standing in for. Set alone and untranslated in all four locales —
          it is an invocation, not a sentence to be rendered into French. The
          door carries the two-word `بسم الله` and is likewise unglossed since
          issue #16 — a caption under the full formula would translate half of
          what is written and stop.
        -->
        <p
          dir="rtl"
          lang="ar"
          class="font-arabic text-center text-lg leading-loose text-gold"
        >
          {SHARED.bismillah}
        </p>
        <p class="text-center text-body leading-loose font-light text-ink-body text-pretty">
          {t.welcome1}
        </p>
        <VerseCard
          verse={SHARED.verse}
          gloss={t.verseGloss}
          reference={t.verseRef}
        />

        <Countdown {t} lang={data.lang} />
      </Section>

      <Section
        title={t.dayTitle}
        seed="day"
        quotes={starQuotes('day', data.lang)}
        hint={t.starHint}
      >
        <Timeline items={t.schedule} />
        <!-- The .ics covers the garden gathering, 15h-23h — see wedding.ics/+server.js.
             No `download` attribute: the point is to hand the file to the phone's
             calendar app, and `download` forces a save instead. The endpoint
             serves it `inline` to match. `data-sveltekit-reload` stops the client
             router from trying to treat an endpoint as a page. -->
        <div class="mt-2 flex justify-center">
          <Button href="/wedding.ics" data-sveltekit-reload>{t.calendarCta}</Button>
        </div>
      </Section>

      <Zigzag reverse={true} />

      <Section
        title={t.essTitle}
        seed="essentials"
        quotes={starQuotes('essentials', data.lang)}
        hint={t.starHint}
      >
        <GardenPlan pins={t.pins} placeholder={t.planPlaceholder} lang={data.lang} />
        <div class="mt-2 flex flex-col gap-3.5">
          {#each t.facts as fact (fact.label)}
            <Row lead={fact.label} leadWidth="label">
              {fact.value}
              <!-- The maps link rides the row it answers — the driving one. A
                   link, not an embedded map: the page pulls no third-party
                   script, tile or cookie today, and this was the one place
                   tempted to. The `?api=1` url opens the guest's own maps app. -->
              {#if fact.map}
                <div class="mt-3">
                  <Button href={SHARED.mapsUrl} small rel="noopener noreferrer" target="_blank">
                    {t.mapCta}
                  </Button>
                </div>
              {/if}
            </Row>
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

      <Section
        title={t.chatTitle}
        tone="alt"
        fill
        seed="chat"
        quotes={starQuotes('chat', data.lang)}
        hint={t.starHint}
      >
        <p class="text-note leading-relaxed font-light text-ink-muted">{t.chatSub}</p>
        <Chat {t} messages={data.messages} lang={data.lang} />
        <p class="text-caption font-light text-ink-muted">{t.botNote}</p>
      </Section>

      <Zigzag reverse={true} />

      <Section
        title={t.rsvpTitle}
        id="rsvp"
        seed="rsvp"
        quotes={starQuotes('rsvp', data.lang)}
        hint={t.starHint}
      >
        <!-- `rsvpSub` — the reply-by date — is deliberately NOT printed here any
             more. It still reaches the bot through $lib/chat-prompt.js, so a
             guest who asks when to reply by still gets the date. -->
        <RsvpForm {t} lang={data.lang} existing={data.rsvp} {form} canRsvp={data.canRsvp} />
      </Section>

      <!--
        Sunrise. `use:reveal` on the wrappers is doing two jobs at once: it rises
        the sun into place, and the `data-shown` it stamps is what starts the
        rays drawing themselves. No animation of its own — see app.css.

        The wrapper is what moves, not the SVG: reveal-rise animates `transform`,
        which would fight a -translate-x-1/2 for centring. Centring with flex
        keeps the two off each other.

        A SIBLING of the band, not a child: the band fades itself with a mask,
        and a mask takes the children with it — the sun would set as fast as the
        night it is rising out of.
      -->
      <div class="dawn-band pointer-events-none absolute inset-x-0 top-0 z-10" aria-hidden="true"></div>
      <div
        use:reveal
        class="rises pointer-events-none absolute inset-x-0 top-4 z-10 flex justify-center lg:top-5"
        aria-hidden="true"
      >
        <Tracery kind="sun" class="turns w-14 text-gold-soft lg:w-16" />
      </div>

      <!-- Moonrise, and the stars again below it. -->
      <div
        class="dawn-band pointer-events-none absolute inset-x-0 bottom-0 z-10"
        style="--dawn-to: to top"
        aria-hidden="true"
      ></div>
      <div
        use:reveal
        class="rises pointer-events-none absolute inset-x-0 bottom-4 z-10 flex justify-center lg:bottom-5"
        aria-hidden="true"
      >
        <Tracery kind="moon" class="w-16 text-primary-faint lg:w-20" />
      </div>
    </div>

    <!-- Mobile footer. On desktop this content lives in the rail instead. -->
    <footer class="night flex flex-col items-center gap-3.5 px-6 py-9 text-center lg:hidden">
      <Tracery kind="band" class="w-full text-gold-soft" />
      <p
        class="font-display mt-1 max-w-[19rem] text-body leading-relaxed italic text-primary-ink text-pretty"
      >
        {t.closing}
      </p>
      <Tracery kind="star" class="w-2.5 text-gold-soft" />
      <p class="caps-wide text-caption font-light text-primary-faint">{t.address}</p>
      <p dir="ltr" class="text-sm leading-relaxed font-light text-primary-ink">
        {SHARED.addressLine1}<br />{SHARED.addressLine2}
      </p>
      <Tracery kind="star" class="w-2.5 text-gold-soft" />
      <p dir="ltr" class="font-script mt-2 text-[30px] leading-tight text-gold-soft">
        {SHARED.names.latin[0]}<span class="mx-1.5">&amp;</span>{SHARED.names.latin[1]}
      </p>
    </footer>
  </main>
</div>

<!-- Outside the layout grid on purpose: a modal <dialog> is promoted to the top
     layer by the browser, so where it sits in the DOM does not affect painting,
     and keeping it out here means no stacking-context surprises from the sticky
     rail or the door scrim. -->
<WallModal bind:this={wallModal} {t} lang={data.lang} {form} canPost={data.canPost} />
