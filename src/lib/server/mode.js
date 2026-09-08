import { env } from '$env/dynamic/private';

/**
 * Post-wedding mode.
 *
 * Opt-IN and an exact match, deliberately the opposite polarity to the
 * WALL_ENABLED kill switch beside it in routes/+page.server.js (opt-out,
 * `!== 'false'`). Both fail toward the site still working: a typo in
 * WALL_ENABLED leaves the wall open, a typo here leaves the invitation up.
 *
 * Flipped in Infisical, which has autoReload: true, so it takes effect on a pod
 * restart with no rebuild and no deploy — the whole reason this is an env var
 * and not a date derived from SHARED.isoDate. Setting it closes all three guest
 * write paths, swaps the copy into the past tense and turns /wall from the
 * projector into a gallery. Unsetting it puts the invitation back.
 */
export const isOver = () => env.WEDDING_OVER === 'true';
