import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import { t } from '$lib/content/wedding.js';
import { isOver } from '$lib/server/mode.js';

/**
 * Language, theme and the string table are needed by the layout AND the page, so
 * they load here — page data inherits everything a parent layout returns.
 *
 * @type {import('./$types').LayoutServerLoad}
 */
export async function load({ locals, cookies }) {
  // Read once, here, and passed down as data. Every guest-facing surface —
  // the page, the wall, +error.svelte via page.data — branches on this rather
  // than reaching for the env var again, so the whole render agrees with itself
  // even if the flag were flipped mid-request.
  const over = isOver();
  const strings = t(locals.lang, over);

  return {
    lang: locals.lang,
    theme: locals.theme,
    // Post-wedding mode. The writes are locked server-side regardless (see
    // +page.server.js and api/chat) — this is what the components read to stop
    // offering what is no longer there.
    over,
    // The shared-album link. Env-driven so it can be swapped (or pulled) without
    // a rebuild — an album URL tends to be decided late and changed after the day.
    // Empty hides the link entirely rather than rendering a dead button.
    photoDropUrl: env.PHOTO_DROP_URL || '',
    // Whether to draw the link to /admin in the rail's control bar. A HINT, not
    // an authorisation — exactly the standing of the x-authentik-username check
    // in admin/+page.server.js. /admin stays gated at Traefik and this decides
    // nothing but whether a chip is rendered.
    //
    // It has to be a cookie because `/` is NOT behind the middleware: the
    // forwardAuth is hung on a second IngressRoute matching PathPrefix(`/admin`)
    // (helm/values.yaml), and the chart's own Host-only route carries no auth,
    // which is what keeps the invitation public. So no authentik header ever
    // reaches this load. What does reach it is the proxy session cookie: the
    // provider runs in forward_domain mode with cookie_domain: bnei.dev
    // (gitops/bootstrap/authentik-blueprint-forwardauth.yaml), so the cookie is
    // sent to every host in the zone, this one included.
    //
    // Two consequences, stated rather than discovered. Signing in to ANY
    // bnei.dev app draws the chip here — acceptable, since it leads to a gated
    // route. And this makes `/` vary per visitor: SSR responses carry no
    // Cache-Control and Cloudflare does not cache HTML without a Cache
    // Everything rule, so nothing caches an admin-rendered page for a guest
    // today. Do not add one without revisiting this.
    //
    // The prefix covers both `authentik_proxy` and `authentik_proxy_<hash>`. If
    // it is ever wrong it fails CLOSED — no chip, no leak — and dev keeps the
    // chip visible locally, where there is no Traefik at all.
    admin: dev || cookies.getAll().some((c) => c.name.startsWith('authentik_')),
    t: strings
  };
}
