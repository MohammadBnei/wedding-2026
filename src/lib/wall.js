/**
 * The guest wall's pure half. Deliberately free of any SvelteKit import ($env,
 * $lib/server) so it is plain, testable JavaScript — same bargain as
 * chat-prompt.js, and for the same reason: `$env/dynamic/private` does not
 * resolve under `bun test`, so anything worth asserting on has to live outside
 * `$lib/server/`.
 *
 * In particular `mergeWindow` lives here rather than inline in
 * `routes/wall/+page.svelte`, because `bun test` cannot import a .svelte file
 * and an untested ring buffer is the one piece of logic on the projector that
 * nobody can check by looking at it.
 */

/** Longest message on a card. Trust boundary, and a legibility one: this is read
 * from ten metres for eight seconds. */
export const MAX_MESSAGE = 280;
/** Longest name. */
export const MAX_AUTHOR = 60;
/** Largest upload we accept, before decoding. Mirrored by BODY_SIZE_LIMIT in
 * helm/values.yaml — adapter-node rejects at 512K by default and its 413 never
 * reaches app code, so the two numbers have to be changed together. */
export const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;
/**
 * Hard ceiling on DECODED pixels. Bun.Image has its own bomb guard but it only
 * trips at 268 MP, and 256 MP of RGBA is ~1 GB against a pod limited to 1Gi. A
 * 12000x12000 monochrome PNG compresses to a few hundred KB, so it sails past
 * MAX_UPLOAD_BYTES and then kills the pod on decode. 50 MP is far above any
 * phone camera (a 48 MP iPhone shot is 8064x6048 = 48.8 MP... so this is snug;
 * raise it, don't lower it).
 */
export const MAX_PIXELS = 60e6;
/** The projector's long edge. */
export const WALL_WIDTH = 1920;
export const WALL_HEIGHT = 1080;
/** Per-visitor cap, per hour. Generous: the failure we care about is a script,
 * not a guest who took eight photos of the cake. */
export const PER_VISITOR_HOURLY = 30;
/** Whole-site cap, per day — the circuit breaker if a crawler finds the form. */
export const GLOBAL_DAILY = 800;
/** How many approved posts the projector holds and cycles. */
export const WALL_WINDOW = 40;
/**
 * How long each slide is up, by DEFAULT.
 *
 * Still the number to change for a fresh database — it is the column default in
 * migrate() and the fallback for every value that cannot be read — but it is no
 * longer what the projector obeys. /admin writes wall_control.slide_ms and the
 * wall picks it up on its next poll, so at a party the answer to "these are too
 * slow" is a button, not a deploy.
 */
export const SLIDE_MS = 8_000;
/**
 * The range /admin may set.
 *
 * The floor is the one that matters. A slide changing faster than the room can
 * read it is merely bad, but a 0 or a negative reaching the projector is a
 * ticker that fires every turn of the event loop — a busy loop on the one
 * machine in the building that nobody is logged into, and the wall goes down
 * with the CPU. The ceiling only stops a mis-typed 600 holding the stage for ten
 * minutes and looking exactly like a stop button that will not release.
 */
export const MIN_SLIDE_MS = 2_000;
export const MAX_SLIDE_MS = 60_000;
/** What /admin offers as buttons, in seconds. Every one must survive
 * clampSlideMs untouched — see the test. */
export const SLIDE_PRESETS = [5, 8, 15, 30];
/** How often the projector asks for new posts. */
export const POLL_MS = 3_000;
/**
 * How often the projector checks whether the current slide is due.
 *
 * Not how long a slide lasts — see the comment on the ticker in
 * routes/wall/+page.svelte for why the advance is a clock check rather than a
 * setInterval at SLIDE_MS. It only has to be well under MIN_SLIDE_MS, or the
 * shortest setting would quietly round up to two ticks.
 */
export const TICK_MS = 250;

/**
 * Force a duration into the allowed range.
 *
 * Applied on the WRITE, so the database can never hold a value that would peg
 * the projector, and AGAIN on the READ, so a row written by hand — or by an
 * older build, or before the column existed — cannot either. Two clamps for one
 * value is deliberate: the projector is unattended, and the failure is not a
 * wrong number on a screen but a laptop at 100% CPU in a corner of the room.
 *
 * Anything that is not a number becomes the DEFAULT rather than an error. The
 * only writer is a preset button on /admin, and the honest failure for a display
 * surface is "eight seconds", never "no timer at all".
 *
 * @param {unknown} raw milliseconds
 * @returns {number} milliseconds, MIN_SLIDE_MS..MAX_SLIDE_MS
 */
export function clampSlideMs(raw) {
  if (raw === null || raw === undefined) return SLIDE_MS;
  const n = Number(raw);
  if (!Number.isFinite(n)) return SLIDE_MS;
  return Math.min(MAX_SLIDE_MS, Math.max(MIN_SLIDE_MS, Math.round(n)));
}

/** @typedef {'pending'|'approved'|'rejected'} WallStatus */

/**
 * Media types we are willing to store AND hand back.
 *
 * The projector is served the untouched original, so its Content-Type comes
 * from a value the client supplied in its multipart part header — settable to
 * anything with one curl flag. An unvalidated `text/html` there is stored XSS
 * on the origin that also hosts /admin, and `nosniff` makes that worse rather
 * than better: it tells the browser to trust the declared type instead of
 * sniffing the bytes.
 *
 * So the allowlist is applied at INSERT, not at serve time. Anything else is
 * stored as image/jpeg, which is what the derivative always is.
 */
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * @param {string | null | undefined} raw a client-supplied media type
 * @returns {string} one of ALLOWED_IMAGE_TYPES, never anything else
 */
export function safeImageType(raw) {
  const t = String(raw ?? '').trim().toLowerCase();
  return ALLOWED_IMAGE_TYPES.includes(t) ? t : 'image/jpeg';
}

/**
 * A lowercase v4-shaped uuid, anchored. Deliberately NOT case-insensitive:
 * Postgres compares uuids case-insensitively, so `<UUID>.JPG` and `<uuid>.jpg`
 * are the same object but different CDN cache keys — an amplifier once the
 * objects are full-resolution rather than 200KB.
 */
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * Turn a model's reply into a status.
 *
 * Returns 'approved' ONLY on a literal `ok === true`. Everything else —
 * unparseable, empty, a refusal, a chatty preamble, `ok` as the string "true" —
 * is 'pending', never 'rejected'.
 *
 * That asymmetry is the whole point. A model that did not answer has not
 * decided, and turning "I could not read this" into "binned" is how a warm
 * message from someone's great-aunt disappears with nobody ever knowing it
 * existed. Pending is the honest state; a human can resolve it, and on the night
 * a pending text post is published anyway (see moderate.js — text fails open,
 * photos fail closed).
 *
 * @param {string | null | undefined} raw
 * @returns {{status: WallStatus, verdict: string}}
 */
export function parseVerdict(raw) {
  const text = String(raw ?? '').trim();
  if (!text) return { status: 'pending', verdict: 'empty response' };

  // Models fence JSON about half the time, whatever the prompt says.
  const body = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();

  let parsed;
  try {
    parsed = JSON.parse(body);
  } catch {
    return { status: 'pending', verdict: 'unparseable response' };
  }

  if (!parsed || typeof parsed !== 'object') {
    return { status: 'pending', verdict: 'unparseable response' };
  }

  // Strict identity, not truthiness: the string "false" is truthy, and a model
  // that returns `"ok": "false"` must not publish.
  if (parsed.ok === true) return { status: 'approved', verdict: 'ok' };
  if (parsed.ok === false) {
    const why = typeof parsed.why === 'string' ? parsed.why.slice(0, 200) : 'refused';
    return { status: 'rejected', verdict: why };
  }
  return { status: 'pending', verdict: 'no verdict in response' };
}

/**
 * @typedef {object} WallItem
 * @property {string} id
 * @property {string | null} author
 * @property {string | null} message
 * @property {boolean} photo
 * @property {string | null} lang
 * @property {string} at
 */

/**
 * Fold a freshly polled window into the one on screen.
 *
 * Call this ONLY with the result of a successful poll. A failed poll must leave
 * the buffer untouched — that is what makes a venue-wifi blip degrade to "no new
 * photos" instead of a black screen, and it is enforced structurally: removal
 * only ever happens in here, and in here only ever against a real response.
 *
 * The server sends the entire window rather than a cursor, deliberately. A
 * cursor keyed on insertion order silently drops every post approved late — the
 * moderator approves an older id after the projector's cursor has passed it, and
 * it is never delivered. The full window is idempotent and self-heals after any
 * gap, which is worth far more than the few KB it costs.
 *
 * @param {WallItem[]} current  what the projector is cycling now
 * @param {WallItem[]} incoming the full window from a successful poll
 * @returns {{items: WallItem[], fresh: string[]}} merged list, plus the ids that
 *   are new since last time (so the caller can jump to them)
 */
export function mergeWindow(current, incoming) {
  const seen = new Set(current.map((i) => i.id));
  const fresh = incoming.filter((i) => !seen.has(i.id)).map((i) => i.id);

  // The incoming window IS the truth — anything missing from it was rejected or
  // has aged out, and must leave the screen. Sorted newest-first, with the id as
  // a tiebreak so two posts in the same millisecond never swap places between
  // polls and cause a visible flicker.
  const items = [...incoming].sort((a, b) => {
    const d = Date.parse(b.at) - Date.parse(a.at);
    return d !== 0 ? d : (a.id < b.id ? 1 : -1);
  });

  return { items, fresh };
}

/**
 * Which slide the stage is HELD on, or -1 for "cycle normally".
 *
 * Two things can hold the wall, and they are not the same thing:
 *
 *   `pinned`   — /admin said "show this one". Releases itself the moment the
 *                next post is approved (the NOT EXISTS in pinnedId()).
 *   `frozenId` — /admin pressed Stop. Holds until someone presses Start, and
 *                exists only so that a post arriving during the stop cannot
 *                shift the held slide out from under the index: the window is
 *                sorted by created_at, so both an insertion AND a removal change
 *                which post lives at any given position.
 *
 * Falls THROUGH from pinned to frozen rather than short-circuiting on it. A
 * pinned post that has been taken down or aged out of the window must not strand
 * a stopped wall on nothing — the code this replaces already fell back to the
 * cycling index for exactly that reason.
 *
 * Lives here, next to pickNext, for the reason stated at the top of this file:
 * `bun test` cannot import a .svelte file, and this is now the piece of
 * projector logic that nobody can check by looking at it.
 *
 * @param {{id: string}[]} items  the window, newest first
 * @param {string | null | undefined} pinned
 * @param {string | null | undefined} frozenId
 * @returns {number} index into `items`, or -1 to keep cycling
 */
export function heldIndex(items, pinned, frozenId) {
  const p = pinned ? items.findIndex((x) => x.id === pinned) : -1;
  if (p >= 0) return p;
  return frozenId ? items.findIndex((x) => x.id === frozenId) : -1;
}

/**
 * Which post the stage should show next.
 *
 * Unseen always wins, oldest first — every post gets its own moment, so a guest
 * who posts during the meal is not queued behind twenty replays of things the
 * room has already read. Only when nothing is unseen does it move on round the
 * window, which is what stops a quiet forty minutes between the meal and the
 * dancing leaving a dead screen.
 *
 * `items` is newest-first (see mergeWindow), so the OLDEST unseen is the last
 * match, not the first. Getting that backwards shows the newest post first and
 * then walks backwards through history, which looks like the wall is running in
 * reverse.
 *
 * Lives here rather than inline in routes/wall/+page.svelte because `bun test`
 * cannot import a .svelte file, and this is the one piece of projector logic
 * that cannot be checked by looking at it.
 *
 * @param {{id: string}[]} items  the window, newest first
 * @param {string[]} seen         ids this projector has already staged
 * @param {number} at             where the stage is now
 * @returns {number} index into `items`
 */
export function pickNext(items, seen, at) {
  if (!items.length) return 0;
  for (let k = items.length - 1; k >= 0; k--) {
    if (!seen.includes(items[k].id)) return k;
  }
  return (at + 1) % items.length;
}

/**
 * The screening prompt. One shape for both text and images so there is one set
 * of words to get right.
 *
 * @param {{ hasImage: boolean }} opts
 */
export function moderationPrompt({ hasImage }) {
  return [
    'You screen posts guests send to a wedding wall.',
    'They are projected on a wall, in front of families, grandparents and children.',
    '',
    'A post may be a photograph with no message, a message with no photograph, or',
    'both. You are judging ONLY whether the content is appropriate to project.',
    'A missing message, an empty message, a photograph containing no text, a very',
    'short message, or a message you find hard to read are NONE of them reasons to',
    'answer false.',
    '',
    'Reply with EXACTLY one JSON object and nothing else:',
    '{"ok": true, "why": ""}   or   {"ok": false, "why": "<six words>"}',
    '',
    'Answer false ONLY for: sexual content, nudity, slurs, insults aimed at anyone,',
    'threats, spam, advertising, links, or personal contact details.',
    hasImage
      ? 'For the photograph, also answer false for: nudity, sexual content, violence, gore, drugs.'
      : '',
    '',
    'Warmth, jokes, teasing the couple, religion, emoji, and any language are all fine.',
    'Guests write in French, English, Arabic and Persian — a language you find hard',
    'to read is NOT a reason to answer false.'
  ]
    .filter(Boolean)
    .join('\n');
}
