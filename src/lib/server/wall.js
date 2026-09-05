import { sql, dbOr } from './db.js';
import { PER_VISITOR_HOURLY, GLOBAL_DAILY, WALL_WINDOW, clampSlideMs } from '$lib/wall.js';

/**
 * The wall's data layer. Mirrors the shape of server/chat.js.
 *
 * Note what is NOT here: a rate-limit fallback for "database down". chat.js can
 * afford `{ok: true}` in that case because aiConfigured() also goes false, so no
 * provider call happens and the bill stays bounded. The wall has no such second
 * gate — an upload writes to Garage and calls a vision model, both of which cost
 * something and neither of which is undone by a missing row. So the POST action
 * checks dbUp() FIRST and 503s before touching either. Do not add a permissive
 * fallback here; the guard lives at the entry point on purpose.
 */

/** Posts the projector should be showing, newest first. */
export async function liveWindow() {
  return await dbOr([], () => sql`
    SELECT id, author, message, lang, created_at,
           (wall_key IS NOT NULL) AS photo
      FROM wall_post
     WHERE status = 'approved' AND deleted_at IS NULL
     ORDER BY created_at DESC
     LIMIT ${WALL_WINDOW}`);
}

/**
 * Shape a row for the wire. `lang` rides along because a mixed-language wall has
 * to set `dir` per POST — taking direction from the projector's own cookie would
 * render every Arabic and Persian message with its punctuation on the wrong end,
 * in front of the families who can read it.
 *
 * @param {any} r
 */
export function toItem(r) {
  return {
    id: r.id,
    author: r.author,
    message: r.message,
    photo: Boolean(r.photo),
    lang: r.lang,
    at: new Date(r.created_at).toISOString()
  };
}

/**
 * @param {string} visitorId
 * @returns {Promise<{ok: true} | {ok: false, reason: 'visitor'|'global'}>}
 */
export async function checkWallLimit(visitorId) {
  const [{ count: mine }] = await dbOr([{ count: 0 }], () => sql`
    SELECT count(*)::int AS count FROM wall_post
     WHERE visitor_id = ${visitorId} AND created_at > now() - interval '1 hour'`);
  if (mine >= PER_VISITOR_HOURLY) return { ok: false, reason: 'visitor' };

  const [{ count: all }] = await dbOr([{ count: 0 }], () => sql`
    SELECT count(*)::int AS count FROM wall_post
     WHERE created_at > now() - interval '1 day'`);
  if (all >= GLOBAL_DAILY) return { ok: false, reason: 'global' };

  return { ok: true };
}

/**
 * Insert a post. Deliberately NOT wrapped in dbOr, for the same reason the RSVP
 * write isn't (see routes/+page.server.js): telling a guest their message is on
 * its way when nothing was stored is the failure that matters here, and it is
 * invisible until they spend the evening watching for a card that never comes.
 *
 * @param {{visitorId: string, author: string|null, message: string|null,
 *          song: string|null, origKey: string|null, origType: string|null,
 *          wallKey: string|null, lang: string}} p
 * @returns {Promise<string>} the new id
 */
export async function insertPost(p) {
  const [row] = await sql`
    INSERT INTO wall_post
      (visitor_id, author, message, song, orig_key, orig_type, wall_key, lang)
    VALUES (${p.visitorId}, ${p.author}, ${p.message}, ${p.song},
            ${p.origKey}, ${p.origType}, ${p.wallKey}, ${p.lang})
    RETURNING id`;
  return row.id;
}

/**
 * @param {string} id
 * @param {import('$lib/wall.js').WallStatus} status
 * @param {string} verdict
 */
export async function setStatus(id, status, verdict) {
  await sql`
    UPDATE wall_post
       SET status = ${status}, verdict = ${verdict}, decided_at = now()
     WHERE id = ${id}`;
}

/**
 * The object key for a post's wall derivative, or null if it has no photo.
 * @param {string} id
 * @param {{approvedOnly?: boolean}} [opts]
 */
export async function wallKeyFor(id, { approvedOnly = true } = {}) {
  const rows = await dbOr([], () => approvedOnly
    ? sql`SELECT wall_key FROM wall_post
           WHERE id = ${id} AND status = 'approved' AND deleted_at IS NULL`
    : sql`SELECT wall_key FROM wall_post WHERE id = ${id} AND deleted_at IS NULL`);
  return rows[0]?.wall_key ?? null;
}

/**
 * The ORIGINAL upload for a post, plus its media type — what the projector is
 * served, because the 1080p derivative is upscaled (Bun.Image's `fit: inside`
 * enlarges) and re-compressed, which looks soft on a three-metre screen.
 *
 * Falls back to the derivative when there is no original, so a missing blob
 * degrades to a worse picture rather than to a blank slide.
 *
 * `orig_type` was validated against an allowlist before it was stored — see
 * safeImageType in $lib/wall.js for why that is not optional.
 *
 * @param {string} id
 * @returns {Promise<{key: string, type: string} | null>}
 */
export async function originalFor(id) {
  const rows = await dbOr([], () => sql`
    SELECT orig_key, wall_key, orig_type
      FROM wall_post
     WHERE id = ${id} AND status = 'approved' AND deleted_at IS NULL`);
  const r = rows[0];
  if (!r) return null;
  const key = r.orig_key ?? r.wall_key;
  if (!key) return null;
  // A row from before orig_type existed, or one falling back to the derivative,
  // is a JPEG either way.
  return { key, type: r.orig_key && r.orig_type ? r.orig_type : 'image/jpeg' };
}

/**
 * Soft delete. The row survives so the binned photo is marked, not forgotten.
 * @param {string} id
 */
export async function softDelete(id) {
  await sql`UPDATE wall_post SET deleted_at = now() WHERE id = ${id}`;
}

/**
 * Which post a human has pinned the projector to, or null for auto.
 *
 * Joined against wall_post so a pinned post that is later taken down releases
 * the wall automatically — otherwise binning the thing on screen would leave the
 * projector frozen on it, which is the exact opposite of what "take down" means.
 */
export async function pinnedId() {
  const rows = await dbOr([], () => sql`
    SELECT c.current_id
      FROM wall_control c
      JOIN wall_post p
        ON p.id = c.current_id AND p.status = 'approved' AND p.deleted_at IS NULL
     WHERE c.id = 1
       AND NOT EXISTS (
         SELECT 1 FROM wall_post n
          WHERE n.status = 'approved' AND n.decided_at > c.updated_at
       )`);
  return rows[0]?.current_id ?? null;
}

/**
 * Put a post on the projector, or pass null to hand it straight back to
 * auto-advance.
 *
 * There is no duration, and deliberately no timer. The pin holds until the next
 * guest post is approved, and that release is expressed as the NOT EXISTS in
 * pinnedId() above rather than as a write: `updated_at` records when the pin was
 * made, and any approved post decided after it wins. Nothing to schedule,
 * nothing to survive a pod restart, and no state that can disagree with itself.
 *
 * The rule that falls out is the one people expect from a screen at a party: a
 * new photo always takes the wall, and choosing one holds it only until the room
 * produces something newer.
 *
 * Bare `sql`, not dbOr: an admin who pressed "show this" and was told it worked
 * while the projector kept cycling is being lied to in front of a room.
 *
 * @param {string | null} id
 */
export async function setPinned(id) {
  await sql`
    UPDATE wall_control
       SET current_id = ${id}, updated_at = now()
     WHERE id = 1`;
}

/**
 * Is the projector held where it is?
 *
 * A separate read rather than a column on pinnedId()'s SELECT: that query JOINs
 * wall_post and returns NO ROW AT ALL when nothing is pinned, so `paused` would
 * come back undefined in the ordinary case.
 *
 * dbOr takes a THUNK and postgres.js hands back a RowList, so both halves of
 * this matter: `dbOr(false, sql`...`)` throws "run is not a function" and pause
 * silently never works, while returning the RowList unwrapped is a truthy
 * `[{paused: false}]` that would freeze the wall permanently.
 *
 * Falling back to false is the safe direction. An unreachable database must not
 * stop the projector — a wall that keeps cycling is the failure everyone can
 * live with, a wall stuck on one slide all evening is not.
 */
export async function isPaused() {
  const rows = await dbOr([], () => sql`SELECT paused FROM wall_control WHERE id = 1`);
  return Boolean(rows[0]?.paused);
}

/**
 * Stop or start the projector.
 *
 * Bare `sql`, never dbOr, for the same reason as setPinned(): an admin who
 * pressed Stop and was told it worked while the wall kept cycling is being lied
 * to in front of a room.
 *
 * Deliberately does NOT touch `updated_at`. That column is the PIN's release
 * clock — pinnedId()'s NOT EXISTS compares it against decided_at — so bumping it
 * here would silently release whatever post a human had put on the wall.
 *
 * @param {boolean} paused
 */
export async function setPaused(paused) {
  await sql`UPDATE wall_control SET paused = ${paused} WHERE id = 1`;
}

/**
 * How long the projector holds each slide, in milliseconds.
 *
 * Clamped on the way OUT as well as on the way in. The column has a DEFAULT but
 * deliberately no CHECK, so a row edited by hand — or one from a build before
 * setSlideMs existed — can still hold a 0, and a 0 reaching the projector is a
 * ticker firing every turn of its event loop: a busy loop on an unattended
 * laptop, which takes the wall down with the CPU.
 *
 * Same shape as isPaused() above, and same reason for the [] fallback: dbOr
 * takes a THUNK and postgres.js hands back a RowList, so the row has to be
 * unwrapped. Falling back to the default is the safe direction — an unreachable
 * database, or a deploy that ran before the ALTER, must leave the wall cycling
 * at eight seconds rather than not at all.
 */
export async function slideMs() {
  const rows = await dbOr([], () => sql`SELECT slide_ms FROM wall_control WHERE id = 1`);
  return clampSlideMs(rows[0]?.slide_ms);
}

/**
 * Set how long each slide is up.
 *
 * Bare `sql`, never dbOr, for the same reason as setPinned() and setPaused(): an
 * admin told the wall now runs at five seconds while it keeps running at eight
 * is being lied to about the thing they are standing in front of.
 *
 * Deliberately does NOT touch `updated_at` — that column is the PIN's release
 * clock (see pinnedId()'s NOT EXISTS), so bumping it here would silently drop
 * whatever post a human had put on the wall, from a control that has nothing to
 * do with pinning.
 *
 * @param {number} ms
 * @returns {Promise<number>} what was actually stored, after clamping — the
 *   caller hands this back to /admin so the button row shows the real value
 *   rather than the one that was asked for.
 */
export async function setSlideMs(ms) {
  const v = clampSlideMs(ms);
  await sql`UPDATE wall_control SET slide_ms = ${v} WHERE id = 1`;
  return v;
}

/**
 * Every post, for /admin — pending first, then newest.
 *
 * Deliberately NOT filtered to "decided recently". It was, on a six-hour window,
 * and that quietly took posts out of this list while they were still cycling on
 * the projector: six hours into a reception you could see a photo on the wall and
 * have no row to take it down from. The wall keeps WALL_WINDOW items; this has to
 * be a superset of that or the control does not cover what it is controlling.
 *
 * One evening will not approach the limit.
 */
export async function reviewQueue() {
  return await dbOr([], () => sql`
    SELECT id, author, message, song, lang, status, verdict, created_at,
           (wall_key IS NOT NULL) AS photo
      FROM wall_post
     WHERE deleted_at IS NULL
     ORDER BY (status = 'pending') DESC, created_at DESC
     LIMIT 200`);
}

/**
 * How many image decodes are in flight right now.
 *
 * ponytail: a module-level integer, not a queue or a semaphore package. One
 * replica, one process — this is the whole of the backpressure story. It exists
 * because the traffic shape of a wedding is forty people posting in the three
 * minutes after the ceremony, and an unbounded number of concurrent 50 MP
 * decodes on a 1Gi pod is an OOMKill that takes the invitation and the chatbot
 * down with the wall. Swap for a real queue the day this needs a second replica.
 */
let decoding = 0;
export const MAX_CONCURRENT_DECODES = 3;
export function tryEnterDecode() {
  if (decoding >= MAX_CONCURRENT_DECODES) return false;
  decoding += 1;
  return true;
}
export function leaveDecode() {
  decoding = Math.max(0, decoding - 1);
}
