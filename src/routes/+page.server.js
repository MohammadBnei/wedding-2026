import { fail } from '@sveltejs/kit';
import { sql, dbUp, dbOr } from '$lib/server/db.js';
import { history } from '$lib/server/chat.js';
import { t } from '$lib/content/wedding.js';
import { MAX_COUNT } from '$lib/rsvp.js';

/** @type {import('./$types').PageServerLoad} */
export async function load({ locals }) {
  const [messages, rsvpRows] = await Promise.all([
    history(locals.visitorId),
    dbOr(
      [],
      () =>
        sql`SELECT going, name, headcount, song, message, email
             FROM rsvp
            WHERE visitor_id = ${locals.visitorId} AND deleted_at IS NULL`
    )
  ]);

  return {
    messages,
    rsvp: rsvpRows[0] ?? null,
    // Everything above degrades silently — an empty transcript and a blank form
    // look normal. The RSVP does not: the guest must be told BEFORE they fill it
    // in, not after they press send.
    canRsvp: dbUp()
  };
}

const LIMITS = { name: 120, song: 200, message: 2000, email: 200 };

/** @type {import('./$types').Actions} */
export const actions = {
  rsvp: async ({ request, locals }) => {
    const form = await request.formData();
    /** @param {string} k */
    const str = (k) => String(form.get(k) ?? '').trim();

    /** @type {Record<string,string>} */
    const errors = {};
    const msg = t(locals.lang);

    const goingRaw = str('going');
    if (goingRaw !== 'true' && goingRaw !== 'false') {
      errors.going = msg.errGoing;
    }
    const going = goingRaw === 'true';

    const name = str('name');
    if (!name) errors.name = msg.errName;
    else if (name.length > LIMITS.name) errors.name = msg.errNameLong;

    const headcount = Number(str('headcount') || '1');
    // Not user-facing: the picker only offers what COUNTS lists, so anything
    // else is a forged post. The bound comes from that same list — see rsvp.js.
    const count =
      Number.isInteger(headcount) && headcount >= 1 && headcount <= MAX_COUNT ? headcount : 1;

    const song = str('song').slice(0, LIMITS.song) || null;
    const message = str('message').slice(0, LIMITS.message) || null;
    // Optional, and deliberately not format-checked. `type="email"` already
    // catches the honest typo in the browser; a server-side regex here would
    // reject addresses that are valid (new TLDs, plus-addressing, unicode
    // locals) and the failure mode is silent — a guest whose address we refused
    // is a guest we cannot reach, which is the exact thing this field exists to
    // prevent. Stored verbatim, truncated, parameterised on the way in and
    // escaped by Svelte on the way out, so there is nothing to inject through.
    const email = str('email').slice(0, LIMITS.email) || null;

    if (Object.keys(errors).length) return fail(400, { errors });

    // The one write that must NOT degrade quietly. `dbOr` is deliberately not
    // used here: a guest shown the thank-you screen for an RSVP that was never
    // stored is a guest nobody counts, and nobody finds out until the catering
    // numbers are wrong.
    //
    // `deleted_at = NULL` in the DO UPDATE is not optional. The key is
    // visitor_id, so a guest whose reply /admin soft-deleted comes back to this
    // same row — without that assignment their new answer lands in a row still
    // filtered out of /admin, and they have replied to nobody. Replying again
    // IS the un-delete.
    try {
      await sql`
        INSERT INTO rsvp (visitor_id, going, name, headcount, song, message, email, lang)
        VALUES (${locals.visitorId}, ${going}, ${name}, ${going ? count : 0}, ${song}, ${message}, ${email}, ${locals.lang})
        ON CONFLICT (visitor_id) DO UPDATE SET
          going = EXCLUDED.going, name = EXCLUDED.name, headcount = EXCLUDED.headcount,
          song = EXCLUDED.song, message = EXCLUDED.message, email = EXCLUDED.email,
          lang = EXCLUDED.lang, deleted_at = NULL, updated_at = now()`;
    } catch (err) {
      console.error('[rsvp] write failed:', err instanceof Error ? err.message : err);
      // 503, not 500: this is temporary and the guest should come back. Their
      // answers stay in the form (enhance updates with reset: false).
      return fail(503, { errors: { form: msg.rsvpOffline } });
    }

    return { saved: true };
  }
};
