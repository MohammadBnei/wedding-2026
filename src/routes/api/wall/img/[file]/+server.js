import { error } from '@sveltejs/kit';
import { wallKeyFor } from '$lib/server/wall.js';
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
 * Only ever serves the DERIVATIVE, and only for an APPROVED post. The original
 * is write-only — it exists to be pulled into ente by hand after the event, and
 * it is the one blob here that was never re-encoded by us.
 */
export async function GET({ params, setHeaders }) {
  const m = /^([0-9a-f-]{36})\.jpg$/i.exec(params.file);
  if (!m) error(404);

  const key = await wallKeyFor(m[1]);
  if (!key) error(404); // not approved, no photo, or no such post — all the same to a stranger

  const bytes = await getObject(key);
  if (!bytes) error(404);

  setHeaders({
    // The bytes behind an id never change, so immutable is honest, and it is
    // what lets the projector keep rendering from disk cache when the network
    // goes away mid-reception.
    'cache-control': 'public, max-age=604800, immutable'
  });
  return new Response(/** @type {BodyInit} */ (bytes), {
    headers: { 'content-type': 'image/jpeg' }
  });
}
