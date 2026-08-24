import { test, expect } from 'bun:test';
import { view } from './rsvp-view.js';

/** @param {Partial<import('./rsvp-summary.js').RsvpRow>} over */
const row = (over) => ({ name: 'x', going: true, headcount: 1, ...over });

const rows = [
  row({ name: 'Leila', headcount: 4, email: 'leila@example.test', updated_at: new Date('2026-08-24') }),
  row({ name: 'amine', headcount: 2, song: 'Distynct yama', updated_at: new Date('2026-08-23') }),
  row({ name: 'Karim', going: false, headcount: 0, message: 'Hâte de vous voir', updated_at: new Date('2026-08-22') })
];

test('no search, no explicit sort: newest first, the order the query already returned', () => {
  expect(view(rows).map((r) => r.name)).toEqual(['Leila', 'amine', 'Karim']);
});

test('the search box looks inside the message, not just the name', () => {
  expect(view(rows, 'vous voir').map((r) => r.name)).toEqual(['Karim']);
});

test('search is case-insensitive and ignores surrounding space', () => {
  expect(view(rows, '  LEILA ').map((r) => r.name)).toEqual(['Leila']);
  expect(view(rows, 'distynct').map((r) => r.name)).toEqual(['amine']);
});

test('sorting by name ignores case, both ways', () => {
  expect(view(rows, '', 'name', 1).map((r) => r.name)).toEqual(['amine', 'Karim', 'Leila']);
  expect(view(rows, '', 'name', -1).map((r) => r.name)).toEqual(['Leila', 'Karim', 'amine']);
});

test('heads sorts numerically', () => {
  expect(view(rows, '', 'headcount', -1).map((r) => r.headcount)).toEqual([4, 2, 0]);
});

test('a missing value stays last whichever way the column is sorted', () => {
  // Only Leila has an email; sorting by a column with blanks must not float the
  // blanks to the top when the arrow flips.
  const byEmail = /** @type {any} */ ('email');
  expect(view(rows, '', byEmail, 1)[0].name).toBe('Leila');
  expect(view(rows, '', byEmail, -1)[0].name).toBe('Leila');
});

test('the input array is left alone', () => {
  const before = rows.map((r) => r.name);
  view(rows, '', 'name', 1);
  expect(rows.map((r) => r.name)).toEqual(before);
});
