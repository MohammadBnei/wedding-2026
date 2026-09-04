import { sql, dbOr } from './db.js';
import { PER_VISITOR_HOURLY, GLOBAL_DAILY, WALL_WINDOW } from '$lib/wall.js';

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
     WHERE status = 'approved'
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
 *          origKey: string|null, wallKey: string|null, lang: string}} p
 * @returns {Promise<string>} the new id
 */
export async function insertPost(p) {
  const [row] = await sql`
    INSERT INTO wall_post (visitor_id, author, message, orig_key, wall_key, lang)
    VALUES (${p.visitorId}, ${p.author}, ${p.message}, ${p.origKey}, ${p.wallKey}, ${p.lang})
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
    ? sql`SELECT wall_key FROM wall_post WHERE id = ${id} AND status = 'approved'`
    : sql`SELECT wall_key FROM wall_post WHERE id = ${id}`);
  return rows[0]?.wall_key ?? null;
}

/** Everything awaiting a decision, plus what was decided recently, for /admin. */
export async function reviewQueue() {
  return await dbOr([], () => sql`
    SELECT id, author, message, lang, status, verdict, created_at,
           (wall_key IS NOT NULL) AS photo
      FROM wall_post
     WHERE status = 'pending'
        OR decided_at > now() - interval '6 hours'
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
