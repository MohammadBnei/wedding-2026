import { liveWindow, toItem, pinnedId, isPaused, slideMs } from '$lib/server/wall.js';

/**
 * Seed the projector server-side so the first paint already has content — and
 * already reflects whatever /admin has pinned. Without this the wall is blank
 * for one poll interval every time the browser is opened or reloaded, which on
 * the night is precisely when someone is standing in front of it wondering
 * whether it works.
 */
export async function load() {
  const [rows, pinned, paused, slide] = await Promise.all([
    liveWindow(),
    pinnedId(),
    isPaused(),
    slideMs()
  ]);
  // `slideMs` rides along so the first slide after a reload already lasts what
  // /admin set. Without it the projector runs one slide at the default and then
  // corrects itself, which reads as the setting having been forgotten.
  return { items: rows.map(toItem), pinned, paused, slideMs: slide };
}
