import { expect, test } from 'bun:test';
import { icsBody, utcStamp } from './ics.js';
import { LANGS, t, SHARED } from './content/wedding.js';

test('the calendar file is a well-formed VCALENDAR in every language', () => {
  for (const lang of LANGS) {
    const ics = icsBody(lang);
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    // CRLF is not cosmetic: a lone LF makes Outlook reject the whole file.
    expect(ics.split('\n').every((l) => l === '' || l.endsWith('\r'))).toBe(true);
    expect(ics).toContain(`SUMMARY:${t(lang).icsSummary}`);
  }
});

test('the times are the garden gathering in UTC, not floating', () => {
  const ics = icsBody('fr');
  // 15h Paris on 5 September is CEST, so 13:00Z. Getting this wrong puts the
  // wedding two hours out in every guest's calendar and nobody notices until
  // they arrive at the wrong time.
  expect(ics).toContain('DTSTART:20260905T130000Z');
  expect(ics).toContain('DTEND:20260905T210000Z');
  // Nothing before 15h belongs in a guest's calendar. Kept as a guard: the
  // programme has carried an earlier, restricted-attendance entry before and
  // may again.
  expect(ics).not.toContain('113000');
  // The date comes from wedding.js, so changing it there changes the file.
  expect(ics).toContain(SHARED.isoDate.replace(/-/g, ''));
});

test('the venue offset is derived, not assumed — summer and winter differ', () => {
  // The point of deriving it: move the wedding into standard time and the file
  // has to follow. A hardcoded 13:00Z would pass the test above and be an hour
  // wrong here, with nothing to notice it.
  expect(utcStamp('2026-09-05', 15)).toBe('20260905T130000Z'); // CEST, UTC+2
  expect(utcStamp('2026-01-10', 15)).toBe('20260110T140000Z'); // CET,  UTC+1
  // Rolls the date when the local hour is near midnight.
  expect(utcStamp('2026-09-05', 1)).toBe('20260904T230000Z');
});

test('commas in the address are escaped, not left to split the field', () => {
  const ics = icsBody('fr');
  // RFC 5545 treats a bare comma as a value separator: unescaped, the street
  // and the postcode become two values and most clients drop the second.
  expect(ics).toContain(`LOCATION:${SHARED.addressLine1}\\, ${SHARED.addressLine2}`);
});
