import OpenAI from 'openai';
import { env } from '$env/dynamic/private';
import { sql, dbUp, dbOr } from './db.js';
import { t } from '$lib/content/wedding.js';
import {
  systemPrompt,
  cannedAnswer,
  HISTORY_WINDOW,
  PER_VISITOR_HOURLY,
  GLOBAL_DAILY
} from '$lib/chat-prompt.js';

// Re-exported so callers have a single import for the chat surface.
export * from '$lib/chat-prompt.js';

/**
 * @param {string} visitorId
 * @returns {Promise<{ok: true} | {ok: false, reason: 'visitor'|'global'}>}
 */
export async function checkRateLimit(visitorId) {
  // Without a database there is nothing to count — and nothing to protect:
  // aiConfigured() below is false too, so every reply is a canned one off
  // wedding.js. No provider call, no spend, so no limit to enforce.
  if (!dbUp()) return { ok: true };

  const [{ count: mine }] = await dbOr([{ count: 0 }], () => sql`
    SELECT count(*)::int AS count FROM chat_message
     WHERE visitor_id = ${visitorId} AND role = 'user'
       AND created_at > now() - interval '1 hour'`);
  if (mine >= PER_VISITOR_HOURLY) return { ok: false, reason: 'visitor' };

  const [{ count: all }] = await dbOr([{ count: 0 }], () => sql`
    SELECT count(*)::int AS count FROM chat_message
     WHERE role = 'user' AND created_at > now() - interval '1 day'`);
  if (all >= GLOBAL_DAILY) return { ok: false, reason: 'global' };

  return { ok: true };
}

/** The last few turns for one visitor, oldest first. @param {string} visitorId */
export async function history(visitorId) {
  // No database, no transcript. The chat still answers — it just cannot
  // remember, so each question stands alone.
  const rows = await dbOr([], () => sql`
    SELECT role, content FROM chat_message
     WHERE visitor_id = ${visitorId}
     ORDER BY created_at DESC, id DESC
     LIMIT ${HISTORY_WINDOW}`);
  return rows.reverse();
}

/**
 * Is a real model wired up, or are we running on canned answers?
 *
 * The database counts here as well as the key. checkRateLimit() is backed by
 * chat_message, so with Postgres down the per-visitor and global caps cannot be
 * enforced — and this endpoint is public and costs money per call. Falling back
 * to the canned answers keeps the chat useful and keeps an unmetered provider
 * bill impossible. Do not relax this to just the key.
 */
export function aiConfigured() {
  return Boolean(env.OPENAI_API_KEY) && dbUp();
}

/**
 * @param {string} message
 * @param {'fr'|'en'|'ar'|'fa'} lang
 * @param {{role: string, content: string}[]} prior
 */
export async function answer(message, lang, prior) {
  if (!aiConfigured()) return cannedAnswer(message, lang);

  // ponytail: the OpenAI SDK with a swappable baseURL IS the provider abstraction.
  // No adapter interface — point OPENAI_BASE_URL at OpenAI, Venice, OpenRouter or
  // a local Ollama. Add a real adapter only if two providers are needed at once.
  const client = new OpenAI({
    apiKey: env.OPENAI_API_KEY,
    baseURL: env.OPENAI_BASE_URL || undefined
  });

  const res = await client.chat.completions.create({
    model: env.OPENAI_MODEL || 'gpt-4o-mini',
    max_tokens: 300,
    temperature: 0.3,
    messages: [
      { role: 'system', content: systemPrompt(lang, { photoDropUrl: env.PHOTO_DROP_URL }) },
      ...prior.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: message }
    ]
  });

  return res.choices[0]?.message?.content?.trim() || t(lang).fallback;
}
