import { dev } from '$app/environment';
import { error, json } from '@sveltejs/kit';
import { reviewQueue, pinnedId, isPaused, slideMs } from '$lib/server/wall.js';

/**
 * The wall queue, as JSON, for /admin to poll.
 *
 * Deliberately NOT `invalidateAll()`. That re-runs the page's `load`, which
 * calls `gate()` — and `gate()` throws `error(404)` when the authentik header is
 * missing. An expired session or a forwardAuth blip would therefore render
 * `+error.svelte` OVER the moderation page, permanently, at one in the morning,
 * with the component destroyed and its interval gone. A failed fetch here just
 * lights the offline dot and the next tick recovers.
 *
 * Under /admin/ so it inherits the existing PathPrefix('/admin') IngressRoute
 * and its forwardAuth middleware — no new Traefik config. The header check is
 * the same 404-instead-of-leak hint the page and the image route use, and for
 * the same reason: it is not the boundary, it turns a routing mistake into a
 * 404.
 */
export async function GET({ request }) {
  if (!dev && !request.headers.get('x-authentik-username')) error(404);

  const [wall, pinned, paused, slide] = await Promise.all([
    reviewQueue(),
    pinnedId(),
    isPaused(),
    slideMs()
  ]);
  return json(
    {
      pinned,
      paused,
      slideMs: slide,
      wall: wall.map((r) => ({
        id: r.id,
        author: r.author,
        message: r.message,
        song: r.song,
        lang: r.lang,
        status: r.status,
        verdict: r.verdict,
        photo: Boolean(r.photo),
        at: new Date(r.created_at).toISOString()
      }))
    },
    { headers: { 'cache-control': 'no-store' } }
  );
}
