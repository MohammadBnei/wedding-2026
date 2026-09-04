import { fail } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { sql, dbUp, dbOr } from '$lib/server/db.js';
import { history } from '$lib/server/chat.js';
import { t } from '$lib/content/wedding.js';
import { MAX_COUNT } from '$lib/rsvp.js';
import {
  checkWallLimit, insertPost, tryEnterDecode, leaveDecode
} from '$lib/server/wall.js';
import { moderateInBackground } from '$lib/server/moderate.js';
import { putObject } from '$lib/server/s3.js';
import {
  MAX_MESSAGE, MAX_AUTHOR, MAX_UPLOAD_BYTES, MAX_PIXELS, WALL_WIDTH, WALL_HEIGHT
} from '$lib/wall.js';

/** The kill switch. Flipped in Infisical, which has autoReload: true, so it
 * takes effect on a pod restart with no rebuild and no deploy. If the wall
 * misbehaves during the evening this is the one lever that exists. */
const wallEnabled = () => (env.WALL_ENABLED ?? 'true') !== 'false';

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
    canRsvp: dbUp(),
    // Same bargain as canRsvp: the guest is told the wall is closed BEFORE they
    // write a message and pick a photo, not after they press send.
    canPost: dbUp() && wallEnabled()
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
  },

  /**
   * A post for the wall: a signature, a message, a photo, or a message and a
   * photo. The signature is required — an unsigned card on the projector is a
   * message from nobody, and the point of the wall is that the room can see who
   * said what.
   */
  wall: async ({ request, locals }) => {
    const msg = t(locals.lang);

    // The kill switch first, before reading the body.
    if (!wallEnabled()) return fail(503, { wallErrors: { form: msg.wallClosed } });

    // Then the database, BEFORE touching Garage or the model. Both of those cost
    // something and neither is undone by a missing row: skipping this check is
    // how you get an object in the bucket that nothing points at, and a guest
    // told their card is on its way when nothing was stored.
    if (!dbUp()) return fail(503, { wallErrors: { form: msg.wallOffline } });

    const form = await request.formData();
    /** @param {string} k */
    const str = (k) => String(form.get(k) ?? '').trim();

    /** @type {Record<string,string>} */
    const errors = {};

    const author = str('author');
    if (!author) errors.author = msg.errWallAuthor;
    else if (author.length > MAX_AUTHOR) errors.author = msg.errWallAuthorLong;

    const message = str('message');
    if (message.length > MAX_MESSAGE) errors.message = msg.errWallMessageLong;

    const photo = form.get('photo');
    const hasPhoto = photo instanceof File && photo.size > 0;
    if (!message && !hasPhoto) errors.message = msg.errWallEmpty;
    if (hasPhoto && photo.size > MAX_UPLOAD_BYTES) errors.photo = msg.errWallPhotoBig;

    if (Object.keys(errors).length) return fail(400, { wallErrors: errors });

    /** @type {Uint8Array | null} */
    let wallBytes = null;
    let origKey = null;
    let wallKey = null;

    if (hasPhoto) {
      if (!tryEnterDecode()) return fail(503, { wallErrors: { form: msg.wallBusy } });
      try {
        const raw = new Uint8Array(await photo.arrayBuffer());

        // THE TRUST BOUNDARY. Everything downstream is bytes this process
        // encoded; the uploaded bytes are never decoded again, never re-served,
        // and never content-type sniffed.
        //
        // maxPixels is not belt-and-braces. Bun.Image's own bomb guard only
        // trips at 268 MP, and 256 MP of RGBA is about a gigabyte — a
        // 12000x12000 monochrome PNG compresses small enough to pass the upload
        // cap and then OOMKills a pod that also serves the invitation.
        //
        // autoOrient is NOT the default, and without it every portrait photo
        // from a phone lands sideways, full-bleed, on a three-metre screen.
        try {
          wallBytes = await new Bun.Image(raw, { maxPixels: MAX_PIXELS, autoOrient: true })
            .resize(WALL_WIDTH, WALL_HEIGHT, { fit: 'inside' })
            .jpeg({ quality: 82 })
            .bytes();
        } catch (err) {
          // Unrecognised format, a decode failure, or too many pixels. A 400
          // with a message the guest can act on — never a 500.
          console.error('[wall] decode refused:', err instanceof Error ? err.message : err);
          return fail(400, { wallErrors: { photo: msg.errWallPhotoBad } });
        }

        const id = crypto.randomUUID();
        origKey = `orig/${id}`;
        wallKey = `wall/${id}.jpg`;
        // The original is written verbatim and is WRITE-ONLY: nothing in this
        // app ever serves it, including /admin. It exists to be pulled into ente
        // by hand after the event, which is what makes storing bytes we did not
        // validate safe.
        await putObject(origKey, raw, photo.type || 'application/octet-stream');
        await putObject(wallKey, /** @type {Uint8Array} */ (wallBytes), 'image/jpeg');
      } catch (err) {
        console.error('[wall] store failed:', err instanceof Error ? err.message : err);
        return fail(503, { wallErrors: { form: msg.wallOffline } });
      } finally {
        leaveDecode();
      }
    }

    // Counted after the expensive work so a burst of decodes cannot queue up
    // behind a limit check, but before the insert so the cap actually holds.
    const limit = await checkWallLimit(locals.visitorId);
    if (!limit.ok) return fail(429, { wallErrors: { form: msg.wallTooMany } });

    let id;
    try {
      id = await insertPost({
        visitorId: locals.visitorId,
        author,
        message: message || null,
        origKey,
        wallKey,
        lang: locals.lang
      });
    } catch (err) {
      console.error('[wall] write failed:', err instanceof Error ? err.message : err);
      return fail(503, { wallErrors: { form: msg.wallOffline } });
    }

    // Answer the guest NOW and screen afterwards. A vision call takes seconds,
    // and holding the upload open for it on venue wifi is how you get impatient
    // double-taps and duplicate cards. The row starts 'pending', so the worst
    // case of this never finishing is the honest one: they were told it is
    // waiting, and it is.
    void moderateInBackground(id, { message: message || null, imageBytes: wallBytes });

    return { posted: true };
  }
};
