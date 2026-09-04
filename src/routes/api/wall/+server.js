import { json } from '@sveltejs/kit';
import { liveWindow, toItem } from '$lib/server/wall.js';

/**
 * What the projector polls, every POLL_MS.
 *
 * Returns the ENTIRE window, not a cursor. Two things break with `?since=`:
 * a post approved late has a lower id than ones the projector already consumed,
 * so it is never delivered at all; and an item delivered once would keep whatever
 * URL it was given for the rest of the evening. The full window is idempotent and
 * self-heals after any gap — which is exactly what a venue-wifi blip needs — and
 * forty small rows is about 4 KB, so there is nothing to save.
 *
 * Public on purpose: the wall is a display surface, and the projector browser has
 * no session. Nothing here is secret; `wall_key` never leaves the server, only a
 * `photo: true` flag and an id that is a uuid precisely so the URL cannot be
 * walked.
 */
export async function GET() {
  const items = (await liveWindow()).map(toItem);
  return json(
    { items },
    {
      headers: {
        // Never cache the index itself — it is the freshness signal. The IMAGES
        // are the cacheable part, and they are immutable.
        'cache-control': 'no-store'
      }
    }
  );
}
