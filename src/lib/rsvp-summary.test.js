import { test, expect } from 'bun:test';
import { summarise } from './rsvp-summary.js';

/** @param {Partial<import('./rsvp-summary.js').RsvpRow>} over */
const row = (over) => ({ name: 'x', going: true, headcount: 1, ...over });

test('sums heads and counts declines', () => {
  const s = summarise([
    row({ name: 'Leila', headcount: 4 }),
    row({ name: 'Amine', headcount: 2 }),
    row({ name: 'Karim', going: false, headcount: 0 })
  ]);
  expect(s.heads).toBe(6);
  expect(s.replies).toBe(3);
  expect(s.declined).toBe(1);
});

test('one guest replying twice is counted once, newest answer wins', () => {
  // Newest first, as the query orders them: the laptop reply supersedes the phone.
  const s = summarise([row({ name: 'leila ', headcount: 2 }), row({ name: 'Leila', headcount: 4 })]);
  expect(s.rows).toHaveLength(1);
  expect(s.rows[0].headcount).toBe(2);
  expect(s.heads).toBe(2);
  expect(s.replies).toBe(1);
});

test('a decline contributes no heads even if headcount is non-zero', () => {
  expect(summarise([row({ going: false, headcount: 3 })]).heads).toBe(0);
});
