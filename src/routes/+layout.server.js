import { env } from '$env/dynamic/private';
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
    // The shared-album link. Env-driven so it can be swapped (or pulled) without
    // a rebuild — an album URL tends to be decided late and changed after the day.
    // Empty hides the link entirely rather than rendering a dead button.
    photoDropUrl: env.PHOTO_DROP_URL || '',
    t: strings
  };
}
