import { expect, test } from 'bun:test';
import { firstVideoId, searchUrl, watchUrl } from './youtube.js';

test('pulls the first video id out of a results payload', () => {
  // Shape taken from a real ytInitialData blob, trimmed.
  const html =
    '</script><script>var ytInitialData = {"contents":{"itemSectionRenderer":' +
    '{"contents":[{"videoRenderer":{"videoId":"55yCQOioTyY","title":{"runs":' +
    '[{"text":"Bella Ciao - Modena City Ramblers"}]}}},{"videoRenderer":' +
    '{"videoId":"KUpcxdg2Iqs"}}]}}};</script>';

  expect(firstVideoId(html)).toBe('55yCQOioTyY');
});

// The failure that will actually happen is not a network error — it is a 200
// whose body is a consent wall or a bot check. Both contain no videoId at all,
// which is why the caller can treat null as "fall back to the search link"
// without distinguishing them.
test('a consent page yields null rather than a wrong id', () => {
  const consent =
    '<!DOCTYPE html><html><head><title>Before you continue to YouTube</title>' +
    '</head><body><form action="https://consent.youtube.com/save">' +
    '<input name="continue" value="https://www.youtube.com/"></form></body></html>';

  expect(firstVideoId(consent)).toBeNull();
});

test('a genuine no-results page yields null', () => {
  // Verified against the live endpoint: a nonsense query returns a 200 with
  // ytInitialData present and zero "videoId" occurrences.
  const empty = 'var ytInitialData = {"contents":{"itemSectionRenderer":{"contents":[]}}};';

  expect(firstVideoId(empty)).toBeNull();
});

test('garbage and empty input yield null, never a throw', () => {
  expect(firstVideoId('')).toBeNull();
  expect(firstVideoId('<html>nothing here</html>')).toBeNull();
  expect(firstVideoId(/** @type {any} */ (null))).toBeNull();
  expect(firstVideoId(/** @type {any} */ (undefined))).toBeNull();
});

test('an id of the wrong length is not matched on its first 11 characters', () => {
  expect(firstVideoId('{"videoId":"55yCQOioTyYEXTRA"}')).toBeNull();
  expect(firstVideoId('{"videoId":"tooShort"}')).toBeNull();
});

test('ids using the full alphabet are matched', () => {
  expect(firstVideoId('{"videoId":"_-aZ09xyzAB"}')).toBe('_-aZ09xyzAB');
});

test('the search url filters to videos and escapes the query', () => {
  const url = searchUrl('Bella Ciao — Modena & Co');

  expect(url).toContain('sp=EgIQAQ%3D%3D');
  expect(url).toContain('search_query=Bella%20Ciao%20%E2%80%94%20Modena%20%26%20Co');
  // No unescaped & could split the query into another parameter.
  expect(url.split('&')).toHaveLength(2);
});

test('the watch url is the plain canonical form', () => {
  expect(watchUrl('55yCQOioTyY')).toBe('https://www.youtube.com/watch?v=55yCQOioTyY');
});
