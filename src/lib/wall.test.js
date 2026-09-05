import { test, expect, describe } from 'bun:test';
import {
  safeImageType,
  UUID_RE,
  parseVerdict,
  mergeWindow,
  pickNext,
  moderationPrompt,
  SLIDE_MS,
  POLL_MS,
  WALL_WINDOW
} from './wall.js';

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

describe('safeImageType', () => {
  test('passes the three types we actually store', () => {
    for (const t of ['image/jpeg', 'image/png', 'image/webp']) {
      expect(safeImageType(t)).toBe(t);
    }
  });

  test('collapses anything else to image/jpeg', () => {
    // THE security test. `photo.type` is the client's own multipart part
    // header — `curl -F 'photo=@x.gif;type=text/html'` sets it to anything —
    // and the projector is served the original, so this value would otherwise
    // become a Content-Type on the same origin as /admin. `nosniff` makes an
    // unvalidated one WORSE, not better: it tells the browser to trust the
    // declared type instead of sniffing the bytes.
    for (const evil of [
      'text/html',
      'image/svg+xml', // the one image format that can carry script
      'application/javascript',
      'text/html; charset=utf-8',
      'image/jpeg\r\nX-Injected: 1', // header splitting
      '',
      null,
      undefined,
      'IMAGE/JPEG ' // trimmed + lowercased, so this one is fine
    ]) {
      const out = safeImageType(evil);
      expect(['image/jpeg', 'image/png', 'image/webp']).toContain(out);
    }
    expect(safeImageType('text/html')).toBe('image/jpeg');
    expect(safeImageType('image/svg+xml')).toBe('image/jpeg');
    expect(safeImageType('  IMAGE/JPEG  ')).toBe('image/jpeg');
  });
});

describe('UUID_RE', () => {
  test('accepts a lowercase uuid and nothing else', () => {
    expect(UUID_RE.test('0c274d71-c4d2-4b82-bd11-f08b2daa4bab')).toBe(true);
    // Uppercase is the SAME row to Postgres but a DIFFERENT CDN cache key, so
    // accepting it turns one photo into many multi-megabyte origin fetches.
    expect(UUID_RE.test('0C274D71-C4D2-4B82-BD11-F08B2DAA4BAB')).toBe(false);
    // 36 dashes matched the old `[0-9a-f-]{36}` and reached Postgres, which
    // raised 22P02 on every request and flooded the logs.
    expect(UUID_RE.test('-'.repeat(36))).toBe(false);
    expect(UUID_RE.test('../../etc/passwd')).toBe(false);
    expect(UUID_RE.test('')).toBe(false);
  });
});

describe('pickNext', () => {
  // Newest first, as mergeWindow leaves them.
  const win = [{ id: 'c' }, { id: 'b' }, { id: 'a' }];

  test('shows the OLDEST unseen first, not the newest', () => {
    // Backwards here means the wall appears to run in reverse.
    expect(pickNext(win, [], 0)).toBe(2); // 'a'
    expect(pickNext(win, ['a'], 2)).toBe(1); // 'b'
    expect(pickNext(win, ['a', 'b'], 1)).toBe(0); // 'c'
  });

  test('every post gets its own moment before anything repeats', () => {
    const seen = [];
    const order = [];
    let at = 0;
    for (let n = 0; n < win.length; n++) {
      at = pickNext(win, seen, at);
      order.push(win[at].id);
      seen.push(win[at].id);
    }
    expect(order).toEqual(['a', 'b', 'c']);
    expect(new Set(order).size).toBe(win.length);
  });

  test('recycles once everything has been seen, rather than freezing', () => {
    // The quiet-forty-minutes case: nothing new, and the screen must not stall.
    const all = ['a', 'b', 'c'];
    expect(pickNext(win, all, 0)).toBe(1);
    expect(pickNext(win, all, 1)).toBe(2);
    expect(pickNext(win, all, 2)).toBe(0);
  });

  test('an empty window does not throw or return nonsense', () => {
    expect(pickNext([], [], 0)).toBe(0);
  });

  test('a newly arrived post jumps ahead of already-seen ones', () => {
    const withNew = [{ id: 'd' }, ...win];
    // 'd' is newest, but a,b,c are all seen — so 'd' is the only unseen.
    expect(withNew[pickNext(withNew, ['a', 'b', 'c'], 0)].id).toBe('d');
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

  test('a photo with no caption is not a reason to refuse', () => {
    // Regression: the first prompt said "you screen what guests WRITE", and the
    // model rejected a wordless photograph with "Image does not contain text."
    // At a wedding most photos arrive with no caption, so that silently binned
    // them. The prompt must say a missing message is fine.
    const p = moderationPrompt({ hasImage: true });
    expect(p).toContain('photograph with no message');
    expect(p).toMatch(/missing message[\s\S]*NONE of them reasons/);
  });

  test('tells the model that a language it struggles with is not a refusal', () => {
    // Guests write in four languages, two of them RTL. A model answering "false"
    // because it cannot read Persian would silently bin a whole family.
    expect(moderationPrompt({ hasImage: false })).toContain('NOT a reason');
  });
});
