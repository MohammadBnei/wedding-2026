import { expect, test } from 'bun:test';
import { match, fold } from './match.js';

// Real names from the guest list — the accented ones are the whole point.
const GUESTS = [
  { value: 'Théophile' },
  { value: 'Nicolas Maigre' },
  { value: 'Mohamed' },
  { value: 'Benaissa Mohamed' },
  { value: 'Rémy' },
  { value: 'Leïla' }
];

const values = (q, limit) => match(GUESTS, q, limit).map((g) => g.value);

test('typing without accents still finds the accented name', () => {
  expect(values('theo')).toEqual(['Théophile']);
  expect(values('remy')).toEqual(['Rémy']);
  expect(values('leila')).toEqual(['Leïla']);
});

test('matching ignores case', () => {
  expect(values('NIC')).toEqual(['Nicolas Maigre']);
});

test('a prefix hit ranks above a mid-string one', () => {
  // Someone typing `mo` means themselves, not the guest whose surname it is.
  expect(values('mo')).toEqual(['Mohamed', 'Benaissa Mohamed']);
});

test('an empty or whitespace query matches nothing', () => {
  expect(values('')).toEqual([]);
  expect(values('   ')).toEqual([]);
});

test('the limit is respected', () => {
  expect(values('e', 2)).toHaveLength(2);
});

test('fold strips the trailing spaces the CSV export leaves behind', () => {
  expect(fold('Othmane ')).toBe('othmane');
});
