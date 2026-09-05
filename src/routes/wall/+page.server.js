import { liveWindow, toItem, pinnedId, isPaused } from '$lib/server/wall.js';

/**
 * Seed the projector server-side so the first paint already has content — and
 * already reflects whatever /admin has pinned. Without this the wall is blank
 * for one poll interval every time the browser is opened or reloaded, which on
 * the night is precisely when someone is standing in front of it wondering
 * whether it works.
 */
export async function load() {
  const [rows, pinned, paused] = await Promise.all([liveWindow(), pinnedId(), isPaused()]);
  return { items: rows.map(toItem), pinned, paused };
}
