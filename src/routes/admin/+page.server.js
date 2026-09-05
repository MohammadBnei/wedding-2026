import { dev } from '$app/environment';
import { error, fail } from '@sveltejs/kit';
import { sql, dbUp, dbOr } from '$lib/server/db.js';
import { summarise } from '$lib/rsvp-summary.js';
import {
  reviewQueue,
  pinnedId,
  setPinned,
  setPaused,
  isPaused,
  slideMs,
  setSlideMs,
  softDelete
} from '$lib/server/wall.js';

/**
 * NOT the security boundary. `default/authentik-forwardauth` on the
 * Host(...) && PathPrefix(`/admin`) route in helm/values.yaml is — this header
 * is set by that middleware and a caller already on the pod network could forge
 * it, so nothing may be authorised on the strength of it.
 *
 * What it buys: the gate lives entirely in a Traefik route, and a route can be
 * got wrong. Traefik's default priority is rule length, so an explicit priority
 * below Host(`wedding.bnei.dev`)'s ~26 would hand /admin to the ordinary route
 * and serve the whole guest list to the internet with a 200. This turns that
 * mistake into a 404 instead of a leak. Dev has no Traefik in front of it at
 * all, hence the bypass.
 *
 * The actions below re-run it rather than assume a POST here could only have
 * followed the load. They are separate entry points, and a 404 on the read with
 * a working delete underneath is the same routing mistake, only quieter.
 *
 * @param {Request} request
 * @returns {string} the authentik username, or '' in dev
 */
function gate(request) {
  const who = request.headers.get('x-authentik-username');
  if (!dev && !who) error(404);
  return who ?? '';
}

/**
 * The key a row is deleted by. Deliberately the SAME key summarise() dedupes on
 * (`src/lib/rsvp-summary.js`): the table shows one row per guest, so deleting
 * that row has to take the phone reply and the laptop reply with it. Keying on
 * `visitor_id` would remove whichever of the pair is newest and let the older
 * one take its place, which reads as a delete that did not work.
 *
 * @param {FormData} form
 */
function nameKey(form) {
  return String(form.get('name') ?? '')
    .trim()
    .toLowerCase();
}

/** @type {import('./$types').PageServerLoad} */
export async function load({ request }) {
  const who = gate(request);

  // postgres.js hands back an untyped RowList; the SELECT below is what makes
  // these the columns of an RsvpRow. Cast at the boundary, once, rather than
  // loosening the summarise() signature that the arithmetic depends on.
  const rows = /** @type {import('$lib/rsvp-summary.js').RsvpRow[]} */ (
    await dbOr(
      [],
      () => sql`
        SELECT name, going, headcount, email, song, message, lang, updated_at
        FROM rsvp
        WHERE deleted_at IS NULL
        ORDER BY updated_at DESC`
    )
  );

  // The wall queue. Photos fail closed — an unreachable model leaves them
  // pending — so this list is the only way one ever reaches the projector.
  const [wall, pinned, paused, slide] = await Promise.all([
    reviewQueue(),
    pinnedId(),
    isPaused(),
    slideMs()
  ]);

  return {
    ...summarise(rows),
    canRead: dbUp(),
    who: who || (dev ? 'dev' : ''),
    pinned,
    paused,
    slideMs: slide,
    wall: wall.map((r) => ({
      id: r.id,
      author: r.author,
      message: r.message,
      song: r.song,
      lang: r.lang,
      status: r.status,
      verdict: r.verdict,
      photo: Boolean(r.photo),
      at: new Date(r.created_at).toISOString()
    }))
  };
}

/** @type {import('./$types').Actions} */
export const actions = {
  /**
   * Soft delete every row under this name.
   *
   * `dbOr` is deliberately not used, for the same reason the RSVP write avoids
   * it (`src/routes/+page.server.js`): an admin shown "deleted" for a row that
   * is still in the table counts that guest again at catering time, and nobody
   * finds out until the numbers are wrong.
   */
  delete: async ({ request }) => {
    gate(request);
    const form = await request.formData();
    const key = nameKey(form);
    if (!key) return fail(400, { message: 'No name given.' });

    try {
      await sql`
        UPDATE rsvp SET deleted_at = now()
        WHERE lower(trim(name)) = ${key} AND deleted_at IS NULL`;
    } catch (err) {
      console.error('[admin] delete failed:', err instanceof Error ? err.message : err);
      return fail(503, { message: 'Postgres refused it — nothing was deleted.' });
    }

    // Handed back so the page can offer the undo.
    return { deleted: String(form.get('name') ?? '') };
  },

  /**
   * ponytail: the undo for the delete you just made, and nothing further —
   * there is no view of deleted rows, so a mistake noticed a day later needs the
   * one-line UPDATE in the README. Build the view the first time that happens.
   */
  restore: async ({ request }) => {
    gate(request);
    const form = await request.formData();
    const key = nameKey(form);
    if (!key) return fail(400, { message: 'No name given.' });

    try {
      await sql`UPDATE rsvp SET deleted_at = NULL WHERE lower(trim(name)) = ${key}`;
    } catch (err) {
      console.error('[admin] restore failed:', err instanceof Error ? err.message : err);
      return fail(503, { message: 'Postgres refused it — nothing was restored.' });
    }

    return { restored: String(form.get('name') ?? '') };
  },

  /**
   * Everything you can do to one wall post, from one <select>.
   *
   * One action rather than a decide-action and a pin-action, because the UI is
   * one dropdown: splitting it server-side would only mean the markup has to
   * decide which endpoint each option belongs to, which is a branch that exists
   * purely to undo this merge.
   *
   * Publishing and taking down are the same flat state machine — approving a
   * rejected row IS the un-reject, so there is no separate restore. Bare `sql`
   * and setPinned, never dbOr: an admin shown "removed" for a photo still
   * cycling in front of a hundred and fifty people is the worst version of the
   * failure the delete action above already warns about.
   */
  wallAction: async ({ request }) => {
    gate(request);
    const form = await request.formData();
    const id = String(form.get('id') ?? '').trim();
    const act = String(form.get('do') ?? '').trim();

    if (act === 'auto') {
      try {
        await setPinned(null);
      } catch (err) {
        console.error('[admin] wall unpin failed:', err instanceof Error ? err.message : err);
        return fail(503, { message: 'Postgres refused it — the wall did not change.' });
      }
      return { wall: 'auto' };
    }

    // Before the uuid check: like `auto` above, a stop names no post. Getting
    // this order wrong makes the button return "No post given." — which is what
    // the OLD pod does for the length of a rolling update, so if you see that
    // right after a deploy, press it again rather than debugging it.
    if (act === 'pause' || act === 'resume') {
      try {
        await setPaused(act === 'pause');
      } catch (err) {
        console.error('[admin] wall pause failed:', err instanceof Error ? err.message : err);
        return fail(503, { message: 'Postgres refused it — the wall did not change.' });
      }
      return { wall: act };
    }

    // Also above the uuid check, for the same reason `pause` is: a duration
    // names no post either.
    if (act === 'slide') {
      // Seconds on the wire, because that is what the buttons say and what an
      // admin would type into a curl. Rejected rather than guessed at when it is
      // missing or unreadable: the only caller is the four-button form below, so
      // anything else is a broken client, and silently choosing a number for it
      // would hide that. The RANGE is not this function's business — setSlideMs
      // clamps, and it clamps on the read as well, because a 0 reaching the
      // projector is a busy loop on an unattended laptop.
      const secs = Number(form.get('seconds'));
      if (!Number.isFinite(secs) || secs <= 0) return fail(400, { message: 'No duration given.' });
      try {
        // The STORED value comes back, not the requested one, so a clamped
        // 90 shows up on the page as 60 rather than as a setting that did not
        // take.
        return { wall: 'slide', slideMs: await setSlideMs(secs * 1000) };
      } catch (err) {
        console.error('[admin] wall slide failed:', err instanceof Error ? err.message : err);
        return fail(503, { message: 'Postgres refused it — the wall did not change.' });
      }
    }

    if (!/^[0-9a-f-]{36}$/i.test(id)) return fail(400, { message: 'No post given.' });

    try {
      if (act === 'show') {
        await setPinned(id);
      } else if (act === 'approved' || act === 'rejected') {
        await sql`
          UPDATE wall_post
             SET status = ${act}, decided_at = now(), verdict = ${'by hand at /admin'}
           WHERE id = ${id}`;
      } else if (act === 'delete') {
        // SOFT, like rsvp.deleted_at above. Not a DELETE: the row is what
        // records that this photo was binned, so the original we keep for the
        // ente import does not travel there silently — and a mis-tap at one in
        // the morning stays recoverable. It also keeps the ponytail note at the
        // top of db.js's migrate() from coming due, since nothing here is
        // destructive. The filters in liveWindow/originalFor/wallKeyFor are what
        // make the wall drop it and its image URL 404.
        await softDelete(id);
      } else {
        return fail(400, { message: 'Unknown action.' });
      }
    } catch (err) {
      console.error('[admin] wall action failed:', err instanceof Error ? err.message : err);
      return fail(503, { message: 'Postgres refused it — nothing changed.' });
    }

    return { wall: act };
  }
};
