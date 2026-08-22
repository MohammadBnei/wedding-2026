/**
 * The add-to-calendar file's body. Deliberately free of any SvelteKit import
 * ($env, $lib) so it is plain, testable JavaScript — same reason as
 * chat-prompt.js. The route in routes/wedding.ics/ is a six-line wrapper.
 */
import { t, SHARED } from './content/wedding.js';

/**
 * iCalendar escaping, RFC 5545 §3.3.11. Backslash FIRST — escaping it after the
 * others would go back and double the backslashes they just added.
 *
 * @param {string} s
 */
const esc = (s) =>
  s.replace(/\\/g, '\\\\').replace(/([;,])/g, '\\$1').replace(/\r?\n/g, '\\n');

/**
 * Local wall-clock hours in Fosses, and the only copy. The .ics body, the
 * JSON-LD in +layout.svelte and the Countdown target all read these, so moving
 * the hour is one edit — and ics.test.js covers it, which means the test covers
 * all three. (wedding.js's schedule still prints the hour as display copy, in
 * four languages; that is text, not a time, and there is nothing to derive it
 * from.)
 */
export const GARDEN_FROM = 15;
export const GARDEN_UNTIL = 23;

/** Where the wedding is, for the purpose of "what does 15h mean". */
const VENUE_TZ = 'Europe/Paris';

/**
 * A local wall-clock hour at the venue, as the UTC stamp iCalendar wants.
 *
 * Floating local time (no Z, no TZID) would be actively wrong: it means 15:00
 * wherever the guest happens to be, and for the Tehran and Azrou guests that is
 * not the wedding. A VTIMEZONE block says the right thing in forty lines.
 *
 * The offset is DERIVED rather than written down. Writing `130000Z` works today
 * — Fosses is CEST, UTC+2, on 5 September — and silently breaks if the date
 * ever moves into standard time, with every test still green because they would
 * be asserting the same hardcoded constant. Ask Intl instead.
 *
 * @param {string} isoDate `YYYY-MM-DD`
 * @param {number} hour local hour at the venue, 0-23
 */
export function utcStamp(isoDate, hour) {
  return venueInstant(isoDate, hour)
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
}

/**
 * The same conversion, as a Date. The JSON-LD `startDate` in +layout.svelte
 * needs this instant too, and had its own copy of the `+02:00` assumption.
 *
 * @param {string} isoDate `YYYY-MM-DD`
 * @param {number} hour local hour at the venue, 0-23
 */
export function venueInstant(isoDate, hour) {
  const wall = `${isoDate}T${String(hour).padStart(2, '0')}:00:00`;
  // Read the offset at roughly the right instant. Being an hour out here cannot
  // pick the wrong side of a DST boundary: transitions happen at 02:00-03:00
  // local, in March and October, and nothing here lands near one.
  const probe = new Date(`${wall}Z`);
  const shown = new Intl.DateTimeFormat('en-US', {
    timeZone: VENUE_TZ,
    timeZoneName: 'longOffset'
  })
    .formatToParts(probe)
    .find((p) => p.type === 'timeZoneName')?.value;

  const m = /GMT([+-])(\d{2}):(\d{2})/.exec(shown ?? '');
  const offsetMin = m ? (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3])) : 0;

  return new Date(probe.getTime() - offsetMin * 60_000);
}

/**
 * @param {import('./content/wedding.js').Lang} lang
 * @returns {string} a complete VCALENDAR, CRLF-terminated
 */
export function icsBody(lang) {
  const day = SHARED.isoDate.replace(/-/g, '');

  return (
    [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//wedding.bnei.dev//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${day}-garden@wedding.bnei.dev`,
      // No clock is read anywhere in this file. DTSTAMP is pinned to the event's
      // own day so the response is byte-identical on every request — cacheable,
      // and it does not re-download as "changed" every time a guest taps it.
      `DTSTAMP:${day}T000000Z`,
      // The garden gathering, which is the whole of what a guest is invited to.
      `DTSTART:${utcStamp(SHARED.isoDate, GARDEN_FROM)}`,
      `DTEND:${utcStamp(SHARED.isoDate, GARDEN_UNTIL)}`,
      `SUMMARY:${esc(t(lang).icsSummary)}`,
      `LOCATION:${esc(`${SHARED.addressLine1}, ${SHARED.addressLine2}`)}`,
      'URL:https://wedding.bnei.dev/',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n') + '\r\n'
  );
}
