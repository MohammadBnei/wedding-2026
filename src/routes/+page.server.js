import { fail } from '@sveltejs/kit';
import { sql, dbUp, dbOr } from '$lib/server/db.js';
import { history } from '$lib/server/chat.js';
import { t } from '$lib/content/wedding.js';

/** @type {import('./$types').PageServerLoad} */
export async function load({ locals }) {
  const [messages, rsvpRows] = await Promise.all([
    history(locals.visitorId),
    dbOr(
      [],
      () =>
        sql`SELECT going, name, headcount, song, message FROM rsvp WHERE visitor_id = ${locals.visitorId}`
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

const LIMITS = { name: 120, song: 200, message: 2000 };

/** @type {import('./$types').Actions} */
export const actions = {
  rsvp: async ({ request, locals }) => {
    const form = await request.formData();
    const str = (k) => String(form.get(k) ?? '').trim();

    /** @type {Record<string,string>} */
    const errors = {};

    const goingRaw = str('going');
    if (goingRaw !== 'true' && goingRaw !== 'false') {
      errors.going = 'Choisissez une réponse. / Please pick an answer.';
    }
    const going = goingRaw === 'true';

    const name = str('name');
    if (!name) errors.name = 'Votre nom, s’il vous plaît. / Your name, please.';
    else if (name.length > LIMITS.name) errors.name = 'Trop long. / Too long.';

    const headcount = Number(str('headcount') || '1');
    // Not user-facing: the picker only offers 1-6, so anything else is a forged
    // post. Keep this bound in step with COUNTS in RsvpForm.svelte — if the chips
    // offer more than this allows, the extra heads are silently saved as 1.
    const count = Number.isInteger(headcount) && headcount >= 1 && headcount <= 6 ? headcount : 1;

    const song = str('song').slice(0, LIMITS.song) || null;
    const message = str('message').slice(0, LIMITS.message) || null;

    if (Object.keys(errors).length) return fail(400, { errors });

    // The one write that must NOT degrade quietly. `dbOr` is deliberately not
    // used here: a guest shown the thank-you screen for an RSVP that was never
    // stored is a guest nobody counts, and nobody finds out until the catering
    // numbers are wrong.
    try {
      await sql`
        INSERT INTO rsvp (visitor_id, going, name, headcount, song, message, lang)
        VALUES (${locals.visitorId}, ${going}, ${name}, ${going ? count : 0}, ${song}, ${message}, ${locals.lang})
        ON CONFLICT (visitor_id) DO UPDATE SET
          going = EXCLUDED.going, name = EXCLUDED.name, headcount = EXCLUDED.headcount,
          song = EXCLUDED.song, message = EXCLUDED.message, lang = EXCLUDED.lang,
          updated_at = now()`;
    } catch (err) {
      console.error('[rsvp] write failed:', err instanceof Error ? err.message : err);
      // 503, not 500: this is temporary and the guest should come back. Their
      // answers stay in the form (enhance updates with reset: false).
      return fail(503, { errors: { form: t(locals.lang).rsvpOffline } });
    }

    return { saved: true };
  }
};
