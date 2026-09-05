import { error } from '@sveltejs/kit';
import { originalFor } from '$lib/server/wall.js';
import { UUID_RE } from '$lib/wall.js';
import { getObject } from '$lib/server/s3.js';

/**
 * The wall derivative, proxied through the app rather than presigned.
 *
 * THE `.jpg` SUFFIX IS LOAD-BEARING, not decoration. Cloudflare caches by file
 * extension and by nothing else — its docs are explicit that "files without
 * extension will not be cached". wedding.bnei.dev is proxied while s3.bnei.dev
 * is grey, so serving images from here with an extension puts a CDN in front of
 * every slide; drop the suffix and each one silently becomes DYNAMIC and is
 * pulled over a residential uplink instead, all evening.
 *
 * Proxying also means the bucket needs no CORS rule at all: an <img src> is not
 * a CORS request. Preload with `new Image().src`, never fetch(), or that stops
 * being true.
 *
 * Serves the ORIGINAL upload, not the 1080p derivative: the derivative is
 * produced by `resize(1920, 1080, { fit: 'inside' })`, and Bun.Image's `inside`
 * ENLARGES — so a photo forwarded through a chat app arrives small and already
 * lossy, gets upscaled, and is re-compressed at quality 82. On a three-metre
 * screen that is visibly soft.
 *
 * This is a deliberate narrowing of the old invariant ("we only ever serve back
 * bytes we encoded ourselves"). What still holds: `Bun.Image` decoded these
 * bytes before they were stored, and it REJECTS SVG — the one image format that
 * can carry script. What replaces the rest is the Content-Type allowlist applied
 * at insert (`safeImageType`), because the type arrives in the client's own
 * multipart header and `nosniff` makes an unvalidated one MORE dangerous, not
 * less: it tells the browser to trust the declared type rather than sniff.
 *
 * The `-o` suffix is not cosmetic. The plain `<id>.jpg` URL is already cached,
 * browser and edge, as the derivative under `immutable, max-age=604800` — so
 * reusing it would keep serving the old picture for a week and the change would
 * look like it had done nothing.
 *
 * Only ever an APPROVED, not-deleted post.
 */
export async function GET({ params, setHeaders }) {
  // Strictly lowercase, and no /i. Postgres compares uuids case-insensitively,
  // so `<UUID>-o.JPG` is the same object as `<uuid>-o.jpg` but a DIFFERENT CDN
  // cache key — which at full resolution turns a typo into repeated multi-MB
  // fetches off a residential uplink.
  const m = /^([0-9a-f-]{36})-o\.jpg$/.exec(params.file);
  if (!m || !UUID_RE.test(m[1])) error(404);

  const found = await originalFor(m[1]);
  if (!found) error(404); // not approved, deleted, no photo, or no such post

  const bytes = await getObject(found.key);
  if (!bytes) error(404);

  setHeaders({
    // The bytes behind an id never change, so immutable is honest, and it is
    // what lets the projector keep rendering from disk cache when the network
    // goes away mid-reception.
    'cache-control': 'public, max-age=604800, immutable'
  });
  return new Response(/** @type {BodyInit} */ (bytes), {
    headers: { 'content-type': found.type }
  });
}
