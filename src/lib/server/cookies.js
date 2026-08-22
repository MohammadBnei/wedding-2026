/**
 * Cookie options, in one place.
 *
 * `secure` must be the real protocol, not a hostname guess: the previous
 * `!hostname.includes('localhost')` marked cookies Secure on ANY other origin,
 * including http://192.168.x.x during LAN testing — and browsers silently drop
 * Secure cookies sent over plain HTTP, so language, theme and the visitor id all
 * stopped persisting on a phone while working fine on localhost.
 *
 * Behind Traefik this needs ORIGIN (or PROTOCOL_HEADER) set for adapter-node, or
 * the pod sees plain http and stops marking production cookies Secure — see
 * helm/values.yaml.
 *
 * That is one rule with two consumers on opposite sides of a trust boundary
 * (hooks.server.js sets `wid`, /api/prefs sets lang and theme), which is exactly
 * how it drifted the first time. `httpOnly` is the one thing they genuinely
 * differ on and is therefore the only knob: `wid` is server-owned, the display
 * preferences are read by nobody but the server too, but they are not a secret.
 */

export const YEAR = 60 * 60 * 24 * 365;

/**
 * @param {URL} url
 * @param {{ httpOnly?: boolean }} [opts]
 */
export const cookieOpts = (url, { httpOnly = false } = {}) => ({
  path: '/',
  httpOnly,
  sameSite: /** @type {const} */ ('lax'),
  secure: url.protocol === 'https:',
  maxAge: YEAR
});
