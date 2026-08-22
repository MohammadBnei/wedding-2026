import { json, error } from '@sveltejs/kit';
import { LANGS } from '$lib/content/wedding.js';
import { cookieOpts } from '$lib/server/cookies.js';

/**
 * Persists the two display preferences. Both are cookies rather than localStorage
 * so the SERVER can render the correct language and theme on first paint — no
 * flash, no repaint.
 *
 * @type {import('./$types').RequestHandler}
 */
export async function POST({ request, cookies, url }) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') error(400, 'bad request');

  const opts = cookieOpts(url);

  if ('lang' in body) {
    if (!LANGS.includes(body.lang)) error(400, 'unknown language');
    cookies.set('lang', body.lang, opts);
  }
  if ('theme' in body) {
    if (body.theme !== 'light' && body.theme !== 'dark') error(400, 'unknown theme');
    cookies.set('theme', body.theme, opts);
  }

  return json({ ok: true });
}
