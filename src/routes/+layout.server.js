import { t } from '$lib/content/wedding.js';

/**
 * Language, theme and the string table are needed by the layout AND the page, so
 * they load here — page data inherits everything a parent layout returns.
 *
 * @type {import('./$types').LayoutServerLoad}
 */
export async function load({ locals }) {
  const strings = t(locals.lang);

  return {
    lang: locals.lang,
    theme: locals.theme,
    t: strings
  };
}
