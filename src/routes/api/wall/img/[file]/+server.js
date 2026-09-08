import { error } from '@sveltejs/kit';
import { originalFor, wallKeyFor } from '$lib/server/wall.js';
import { parseImageName } from '$lib/wall.js';
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
 * TWO suffixes, and the difference is bandwidth. `-o` is the ORIGINAL upload,
 * which is what the projector gets: the derivative is produced by
 * `resize(1920, 1080, { fit: 'inside' })`, and Bun.Image's `inside` ENLARGES —
 * so a photo forwarded through a chat app arrives small and already lossy, gets
 * upscaled, and is re-compressed at quality 82. On a three-metre screen that is
 * visibly soft.
 *
 * `-t` is that derivative, and it exists for the post-wedding gallery. A grid
 * shows every approved photo at once, and at `-o` sizes that is tens of
 * megabytes of originals pulled off a residential uplink for a page of
 * thumbnails nobody has clicked.
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
  // Which object, and is it one we serve at all. The parsing — including the
  // lowercase-only rule and the 36-dash rejection — lives in $lib/wall.js so it
  // can be asserted on without a bucket; see parseImageName there.
  const want = parseImageName(params.file);
  if (!want) error(404);

  // `-o` hands back the untouched upload for the projector; `-t` the 1080p
  // derivative for the gallery grid. Both filter to approved-and-not-deleted in
  // the query itself, so neither can reach a pending or taken-down post.
  let found = null;
  if (want.kind === 'orig') {
    found = await originalFor(want.id);
  } else {
    // Always a JPEG: the derivative is what routes/+page.server.js encoded with
    // `.jpeg({ quality: 82 })`, not anything the guest handed us.
    const key = await wallKeyFor(want.id);
    if (key) found = { key, type: 'image/jpeg' };
  }
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
