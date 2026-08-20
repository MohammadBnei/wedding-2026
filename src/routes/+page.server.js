import { fail } from '@sveltejs/kit';
import { sql } from '$lib/server/db.js';
import { history } from '$lib/server/chat.js';

/** @type {import('./$types').PageServerLoad} */
export async function load({ locals }) {
  const [messages, rsvpRows] = await Promise.all([
    history(locals.visitorId),
    sql`SELECT going, name, headcount, song, message FROM rsvp WHERE visitor_id = ${locals.visitorId}`
  ]);

  return {
    messages,
    rsvp: rsvpRows[0] ?? null
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
    // Not user-facing: the picker only offers 1-4, so anything else is a forged post.
    const count = Number.isInteger(headcount) && headcount >= 1 && headcount <= 4 ? headcount : 1;

    const song = str('song').slice(0, LIMITS.song) || null;
    const message = str('message').slice(0, LIMITS.message) || null;

    if (Object.keys(errors).length) return fail(400, { errors });

    // Upsert on the visitor cookie: a guest can change their mind, which the
    // original artifact made impossible — it had no way back from the thank-you.
    await sql`
      INSERT INTO rsvp (visitor_id, going, name, headcount, song, message, lang)
      VALUES (${locals.visitorId}, ${going}, ${name}, ${going ? count : 0}, ${song}, ${message}, ${locals.lang})
      ON CONFLICT (visitor_id) DO UPDATE SET
        going = EXCLUDED.going, name = EXCLUDED.name, headcount = EXCLUDED.headcount,
        song = EXCLUDED.song, message = EXCLUDED.message, lang = EXCLUDED.lang,
        updated_at = now()`;

    return { saved: true };
  }
};
