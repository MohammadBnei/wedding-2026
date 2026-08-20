import { migrate } from '$lib/server/db.js';
import { pickLang, dirOf, LANGS } from '$lib/content/wedding.js';

const YEAR = 60 * 60 * 24 * 365;

/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
  await migrate();

  const { cookies } = event;

  // A stable anonymous id. Everything this visitor owns — their chat transcript
  // and their RSVP — is keyed on it, which is what makes a refresh keep state.
  let visitorId = cookies.get('wid');
  if (!visitorId || !/^[0-9a-f-]{36}$/i.test(visitorId)) {
    visitorId = crypto.randomUUID();
    cookies.set('wid', visitorId, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: !event.url.hostname.includes('localhost'),
      maxAge: YEAR
    });
  }

  // Language: an explicit choice wins, then the browser's preference, then French.
  let lang = cookies.get('lang');
  if (!LANGS.includes(lang)) {
    lang = negotiate(event.request.headers.get('accept-language')) ?? 'fr';
  }

  // Theme comes from the cookie so the SERVER renders the right one. Without
  // this the page would paint light, then repaint dark — the flash we're avoiding.
  const theme = cookies.get('theme') === 'dark' ? 'dark' : 'light';

  event.locals.visitorId = visitorId;
  event.locals.lang = pickLang(lang);
  event.locals.theme = theme;

  return resolve(event, {
    transformPageChunk: ({ html }) =>
      html
        .replace('%lang%', event.locals.lang)
        .replace('%dir%', dirOf(event.locals.lang))
        .replace('%theme%', theme)
  });
}

/**
 * Pick the best supported language from an Accept-Language header, honouring the
 * client's q-values.
 *
 * Doing this with `LANGS.find(l => header.includes(l))` looks equivalent and is
 * not: it returns whichever language happens to come first in OUR list, so a
 * browser asking for `en-US,en;q=0.9,fr;q=0.3` gets French — the wrong answer for
 * an English speaker who merely also reads some French.
 *
 * @param {string | null} header
 */
function negotiate(header) {
  if (!header) return null;
  return (
    header
      .split(',')
      .map((part) => {
        const [tag, ...params] = part.trim().split(';');
        const q = params.find((p) => p.trim().startsWith('q='));
        return { tag: tag.trim().toLowerCase().split('-')[0], q: q ? Number(q.split('=')[1]) : 1 };
      })
      .filter((x) => LANGS.includes(x.tag) && x.q > 0)
      .sort((a, b) => b.q - a.q)[0]?.tag ?? null
  );
}
