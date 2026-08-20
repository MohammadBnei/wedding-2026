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
      // UTC, because Fosses is CEST (UTC+2) on 5 September: 15h–23h local is
      // 13:00Z–21:00Z. A VTIMEZONE block says the same in forty lines; floating
      // local time says something WRONG — 15:00 wherever the guest happens to
      // be, which for the Tehran and Casablanca guests is not the wedding.
      //
      // Only the garden lunch onwards. The 13h30 mairie is restricted
      // attendance and must never land in a general guest's calendar.
      `DTSTART:${day}T130000Z`,
      `DTEND:${day}T210000Z`,
      `SUMMARY:${esc(t(lang).icsSummary)}`,
      `LOCATION:${esc(`${SHARED.addressLine1}, ${SHARED.addressLine2}`)}`,
      'URL:https://wedding.bnei.dev/',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n') + '\r\n'
  );
}
