import { dbUp } from '$lib/server/db.js';
import { isOver } from '$lib/server/mode.js';
import { allApproved, liveWindow, toItem, pinnedId, isPaused, slideMs } from '$lib/server/wall.js';

/**
 * Two screens behind one route.
 *
 * Before the day this is the projector: seed it server-side so the first paint
 * already has content — and already reflects whatever /admin has pinned.
 * Without that the wall is blank for one poll interval every time the browser
 * is opened or reloaded, which on the night is precisely when someone is
 * standing in front of it wondering whether it works.
 *
 * After it (WEDDING_OVER, see $lib/server/mode.js) it is the guest gallery, and
 * none of the projector's controls mean anything: there is no pin to honour, no
 * stop button to obey and no slide to time, so those three queries are not run
 * at all rather than fetched and thrown away.
 */
export async function load() {
  const over = isOver();

  if (over) {
    // `up` is not decoration. allApproved() inherits liveWindow's `dbOr([], …)`,
    // so a database outage returns an empty list — indistinguishable from a wall
    // nobody posted to. Everywhere else on this site the guest is told which
    // one it is (canRsvp, canPost in routes/+page.server.js) and the gallery is
    // not going to be the exception that shrugs.
    return { items: (await allApproved()).map(toItem), up: dbUp() };
  }

  const [rows, pinned, paused, slide] = await Promise.all([
    liveWindow(),
    pinnedId(),
    isPaused(),
    slideMs()
  ]);
  // `slideMs` rides along so the first slide after a reload already lasts what
  // /admin set. Without it the projector runs one slide at the default and then
  // corrects itself, which reads as the setting having been forgotten.
  return { items: rows.map(toItem), pinned, paused, slideMs: slide, up: true };
}
