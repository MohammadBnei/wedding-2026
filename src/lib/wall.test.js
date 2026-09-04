import { test, expect, describe } from 'bun:test';
import { parseVerdict, mergeWindow, moderationPrompt, SLIDE_MS, POLL_MS, WALL_WINDOW } from './wall.js';

describe('parseVerdict', () => {
  test('publishes only on a literal ok:true', () => {
    expect(parseVerdict('{"ok":true}').status).toBe('approved');
    expect(parseVerdict('{"ok": true, "why": ""}').status).toBe('approved');
  });

  test('bins on a literal ok:false, keeping the reason', () => {
    const v = parseVerdict('{"ok":false,"why":"insult aimed at a guest"}');
    expect(v.status).toBe('rejected');
    expect(v.verdict).toBe('insult aimed at a guest');
  });

  test('sees through code fences', () => {
    expect(parseVerdict('```json\n{"ok":true}\n```').status).toBe('approved');
    expect(parseVerdict('```\n{"ok":false,"why":"nudity"}\n```').status).toBe('rejected');
  });

  /**
   * The fail-closed guarantee, as code. Every one of these is a model that did
   * NOT decide, and not one of them may publish or bin. If this test ever goes
   * red, something has started treating "I don't know" as an answer.
   */
  test('garbage is always pending — never approved, never rejected', () => {
    const garbage = [
      '',
      '   ',
      null,
      undefined,
      'sure!',
      'I cannot help with that.',
      '{"ok":"true"}', // the STRING "true" is truthy — must not publish
      '{"ok":"false"}',
      '{"ok":1}',
      '{"okay":true}',
      '{"ok":null}',
      '{"ok":tru', // truncated mid-token
      '[]',
      'null',
      '42'
    ];
    for (const g of garbage) {
      const { status } = parseVerdict(g);
      expect(`${JSON.stringify(g)} -> ${status}`).toBe(`${JSON.stringify(g)} -> pending`);
    }
  });

  test('a message that merely mentions json does not slip through', () => {
    expect(parseVerdict('the answer is ok: true').status).toBe('pending');
  });
});

describe('mergeWindow', () => {
  const item = (id, at, extra = {}) => ({
    id,
    at,
    author: null,
    message: 'x',
    photo: false,
    lang: 'fr',
    ...extra
  });

  test('orders newest first', () => {
    const { items } = mergeWindow([], [
      item('a', '2026-09-05T18:00:00.000Z'),
      item('c', '2026-09-05T20:00:00.000Z'),
      item('b', '2026-09-05T19:00:00.000Z')
    ]);
    expect(items.map((i) => i.id)).toEqual(['c', 'b', 'a']);
  });

  test('reports only genuinely new ids as fresh', () => {
    const current = [item('a', '2026-09-05T18:00:00.000Z')];
    const { fresh } = mergeWindow(current, [
      item('a', '2026-09-05T18:00:00.000Z'),
      item('b', '2026-09-05T19:00:00.000Z')
    ]);
    expect(fresh).toEqual(['b']);
  });

  test('an id missing from the incoming window leaves the screen', () => {
    // This is how /admin yanking a photo takes effect on the projector.
    const current = [item('a', '2026-09-05T18:00:00.000Z'), item('b', '2026-09-05T19:00:00.000Z')];
    const { items, fresh } = mergeWindow(current, [item('b', '2026-09-05T19:00:00.000Z')]);
    expect(items.map((i) => i.id)).toEqual(['b']);
    expect(fresh).toEqual([]);
  });

  test('never duplicates an id already on screen', () => {
    const current = [item('a', '2026-09-05T18:00:00.000Z')];
    const { items } = mergeWindow(current, [
      item('a', '2026-09-05T18:00:00.000Z'),
      item('a', '2026-09-05T18:00:00.000Z')
    ]);
    expect(items.filter((i) => i.id === 'a')).toHaveLength(2); // input had two; we do not invent dedupe
    expect(mergeWindow(current, [item('a', '2026-09-05T18:00:00.000Z')]).fresh).toEqual([]);
  });

  test('ties break stably, so the wall does not flicker between polls', () => {
    const same = '2026-09-05T18:00:00.000Z';
    const a = mergeWindow([], [item('x', same), item('y', same)]).items.map((i) => i.id);
    const b = mergeWindow([], [item('y', same), item('x', same)]).items.map((i) => i.id);
    expect(a).toEqual(b);
  });

  test('an empty incoming window empties the screen', () => {
    // Only ever called on SUCCESS, so this really does mean "nothing approved".
    expect(mergeWindow([item('a', '2026-09-05T18:00:00.000Z')], []).items).toEqual([]);
  });
});

describe('constants', () => {
  test('a slide outlives a poll, or new posts interrupt themselves', () => {
    expect(SLIDE_MS).toBeGreaterThan(POLL_MS);
  });

  test('the window holds enough to render prev/current/next', () => {
    expect(WALL_WINDOW).toBeGreaterThanOrEqual(3);
  });
});

describe('moderationPrompt', () => {
  test('mentions the image rules only when there is an image', () => {
    expect(moderationPrompt({ hasImage: true })).toContain('nudity');
    expect(moderationPrompt({ hasImage: false })).not.toContain('gore');
  });

  test('tells the model that a language it struggles with is not a refusal', () => {
    // Guests write in four languages, two of them RTL. A model answering "false"
    // because it cannot read Persian would silently bin a whole family.
    expect(moderationPrompt({ hasImage: false })).toContain('NOT a reason');
  });
});
