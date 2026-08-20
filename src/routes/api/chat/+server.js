import { json, error } from '@sveltejs/kit';
import { sql, dbOr } from '$lib/server/db.js';
import { answer, checkRateLimit, history, MAX_MESSAGE } from '$lib/server/chat.js';
import { pickLang, t } from '$lib/content/wedding.js';

/** @type {import('./$types').RequestHandler} */
export async function POST({ request, locals }) {
  const body = await request.json().catch(() => null);
  const message = typeof body?.message === 'string' ? body.message.trim() : '';
  const lang = pickLang(body?.lang ?? locals.lang);

  // Trust boundary. The endpoint is public and costs money per call.
  if (!message) error(400, 'empty message');
  if (message.length > MAX_MESSAGE) error(413, 'message too long');

  const limit = await checkRateLimit(locals.visitorId);
  if (!limit.ok) return json({ error: t(lang).rateLimited }, { status: 429 });

  const prior = await history(locals.visitorId);

  let reply;
  try {
    reply = await answer(message, lang, prior);
  } catch (e) {
    console.error('[chat] provider call failed:', e);
    // Never surface a provider error to a guest; give them the handoff line.
    reply = t(lang).fallback;
  }

  // Persist both halves together so the transcript can't end up lopsided.
  // Best-effort: with the database down the guest still gets their answer, it
  // just will not be there after a refresh.
  await dbOr(null, () => sql`
    INSERT INTO chat_message (visitor_id, role, content, lang) VALUES
      (${locals.visitorId}, 'user',      ${message}, ${lang}),
      (${locals.visitorId}, 'assistant', ${reply},   ${lang})`);

  return json({ reply });
}
