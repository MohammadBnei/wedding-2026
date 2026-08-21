import { expect, test } from 'bun:test';
import { breakdown } from './countdown.js';
import { localeDigits } from './content/wedding.js';

test('splits a duration into days, hours and minutes', () => {
  const ms = 3 * 86_400_000 + 7 * 3_600_000 + 42 * 60_000 + 59_000;
  expect(breakdown(ms)).toEqual({ days: 3, hours: 7, mins: 42 });
});

test('hours and minutes are remainders, not totals', () => {
  // 50 hours is two days and two hours — not "50 hours".
  expect(breakdown(50 * 3_600_000)).toEqual({ days: 2, hours: 2, mins: 0 });
});

test('clamps at zero instead of counting up after the wedding', () => {
  expect(breakdown(0)).toEqual({ days: 0, hours: 0, mins: 0 });
  expect(breakdown(-86_400_000)).toEqual({ days: 0, hours: 0, mins: 0 });
});

test('digits are localised, and Persian is not Arabic', () => {
  expect(localeDigits(15, 'fr')).toBe('15');
  expect(localeDigits(15, 'en')).toBe('15');
  expect(localeDigits(15, 'ar')).toBe('١٥');
  // arabext, not arab — the table this replaced got Persian wrong.
  expect(localeDigits(15, 'fa')).toBe('۱۵');
  expect(localeDigits(15, 'ar')).not.toBe(localeDigits(15, 'fa'));
});

test('day counts are not thousands-separated', () => {
  expect(localeDigits(1200, 'fr')).toBe('1200');
  expect(localeDigits(1200, 'ar')).toBe('١٢٠٠');
});
