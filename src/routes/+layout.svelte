<script>
  import '../app.css';
  import { page } from '$app/state';
  import { dirOf, SHARED } from '$lib/content/wedding.js';
  import { venueInstant, GARDEN_FROM, GARDEN_UNTIL } from '$lib/ics.js';

  let { children, data } = $props();

  const title = $derived(`Leïla & Mohammad-Amine — ${data.t.date}`);

  // Link previews need ABSOLUTE urls — a relative og:image looks fine in
  // devtools and renders as a blank card in WhatsApp. Behind Traefik,
  // adapter-node builds this from the ORIGIN env var (helm/values.yaml), the
  // same value the RSVP POST's CSRF check depends on, so it is correct in the
  // cluster without a second place to configure the hostname.
  const origin = $derived(page.url.origin);

  // Bump whenever static/og.png is re-rendered. Social platforms cache the card
  // against its URL, and WhatsApp — where most of this link will be pasted — has
  // no re-scrape tool at all, so without a new URL a redesigned card reaches
  // nobody who has already shared the link. The file ignores the query.
  const OG_VERSION = 4;
  const ogImage = $derived(`${origin}/og.png?v=${OG_VERSION}`);

  // What a preview and a search result are allowed to say: the kind of event and
  // the day. Deliberately NOT the venue — this page is shared by link into group
  // chats and forwarded on, and a preview card is seen by far more people than
  // ever open the site. The address is on the page for guests who do; it is not
  // in the card, not in the snippet, and not in this structured data.
  //
  // That also means no schema.org `location`, so Google will not build a rich
  // result from this. That is the trade, made on purpose.
  const preview = $derived(`${data.t.eventKind} — ${data.t.date}.`);

  const eventLd = $derived(
    JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Event',
      name: data.t.icsSummary,
      // Same derived venue offset the .ics uses — not a second copy of "+02:00".
      startDate: venueInstant(SHARED.isoDate, GARDEN_FROM).toISOString(),
      endDate: venueInstant(SHARED.isoDate, GARDEN_UNTIL).toISOString(),
      eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
      eventStatus: 'https://schema.org/EventScheduled',
      image: ogImage,
      url: `${origin}/`
    })
  );

  // Keep <html lang/dir> in step when the language changes client-side. The
  // server sets these on first paint (see hooks.server.js); this covers the
  // in-page switch, which happens without a reload.
  $effect(() => {
    const el = document.documentElement;
    el.lang = data.lang;
    el.dir = dirOf(data.lang);
    // Signals that interactive handlers are attached. The page is server-rendered,
    // so buttons are clickable in the DOM well before Svelte has wired them up —
    // end-to-end tests wait on this rather than racing hydration.
    el.dataset.hydrated = 'true';
  });
</script>

<svelte:head>
  <title>{title}</title>
  <meta name="description" content={preview} />
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
  <link rel="manifest" href="/manifest.webmanifest" />

  <!-- One URL serves all four languages (the cookie decides), so canonical is
       always the root and there is no hreflang alternate to declare. -->
  <link rel="canonical" href="{origin}/" />

  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Leïla & Mohammad-Amine" />
  <meta property="og:url" content="{origin}/" />
  <meta property="og:title" content={title} />
  <meta property="og:description" content={preview} />
  <meta property="og:image" content={ogImage} />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content={title} />

  <!-- twitter:title/description/image are omitted on purpose: Twitter falls
       back to the og:* tags above, so they would be three duplicated lines. -->
  <meta name="twitter:card" content="summary_large_image" />

  {@html `<script type="application/ld+json">${eventLd}<` + `/script>`}
</svelte:head>

{@render children()}
