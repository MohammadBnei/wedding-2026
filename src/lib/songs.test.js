import { expect, test } from 'bun:test';
import { mergeSongs, songKey } from './songs.js';

// The em dash is what the iTunes autocomplete emits; the hyphen is what a guest
// types. These being one song is the entire reason this module exists.
const EM = 'Bella Ciao — Modena City Ramblers';
const HYPHEN = 'bella ciao - modena city ramblers';
const SPACED = 'Bella  Ciao   -  Modena City Ramblers';

test('the three realistic spellings of one song share a key', () => {
  expect(songKey(HYPHEN)).toBe(songKey(EM));
  expect(songKey(SPACED)).toBe(songKey(EM));
});

test('a different song does not', () => {
  expect(songKey('Bella Ciao')).not.toBe(songKey(EM));
  expect(songKey('Ya Rayah — Rachid Taha')).not.toBe(songKey(EM));
});

test('accents and case still fold, as they do for guest names', () => {
  expect(songKey('Café — Sébastien')).toBe(songKey('cafe - sebastien'));
});

test('the three spellings merge into one row that counts all three', () => {
  const merged = mergeSongs([
    { song: EM, who: 'Léa', at: '2026-09-05T18:00:00.000Z' },
    { song: HYPHEN, who: 'Sami', at: '2026-09-05T17:00:00.000Z' },
    { song: SPACED, who: 'Léa', at: '2026-09-05T16:00:00.000Z' }
  ]);

  expect(merged).toHaveLength(1);
  expect(merged[0].count).toBe(3);
  // Léa asked twice; she appears once.
  expect(merged[0].who).toEqual(['Léa', 'Sami']);
  // The first spelling seen is what gets shown.
  expect(merged[0].song).toBe(EM);
});

test('an unsigned request contributes a count but no name', () => {
  const merged = mergeSongs([
    { song: EM, who: null, at: '2026-09-05T18:00:00.000Z' },
    { song: EM, who: '   ', at: '2026-09-05T17:00:00.000Z' }
  ]);

  expect(merged[0].count).toBe(2);
  expect(merged[0].who).toEqual([]);
});

test('rows come back most-recently-requested first', () => {
  const merged = mergeSongs([
    { song: 'Old', who: 'a', at: '2026-09-05T10:00:00.000Z' },
    { song: 'New', who: 'b', at: '2026-09-05T20:00:00.000Z' },
    { song: 'Middle', who: 'c', at: '2026-09-05T15:00:00.000Z' }
  ]);

  expect(merged.map((m) => m.song)).toEqual(['New', 'Middle', 'Old']);
});

test('a row keeps the NEWEST timestamp of its requests, not the first seen', () => {
  // The two sources are concatenated, so an rsvp row can arrive after a newer
  // wall_post row for the same song. Ordering must not depend on arrival order.
  const merged = mergeSongs([
    { song: 'Quiet', who: 'a', at: '2026-09-05T10:00:00.000Z' },
    { song: EM, who: 'b', at: '2026-09-05T09:00:00.000Z' },
    { song: HYPHEN, who: 'c', at: '2026-09-05T23:00:00.000Z' }
  ]);

  expect(merged[0].song).toBe(EM);
  expect(merged[0].at).toBe('2026-09-05T23:00:00.000Z');
});

test('empty and punctuation-only songs are dropped, not collapsed into one row', () => {
  const merged = mergeSongs([
    { song: '', who: 'a', at: '2026-09-05T10:00:00.000Z' },
    { song: '   ', who: 'b', at: '2026-09-05T10:00:00.000Z' },
    { song: '---', who: 'c', at: '2026-09-05T10:00:00.000Z' },
    { song: EM, who: 'd', at: '2026-09-05T10:00:00.000Z' }
  ]);

  expect(merged).toHaveLength(1);
  expect(merged[0].song).toBe(EM);
});
