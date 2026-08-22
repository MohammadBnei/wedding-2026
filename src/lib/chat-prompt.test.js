import { expect, test } from 'bun:test';
import { systemPrompt, cannedAnswer, MAX_MESSAGE, PER_VISITOR_HOURLY } from './chat-prompt.js';
import { STR, SHARED, LANGS, starGloss, fallbackText } from './content/wedding.js';

test('the system prompt is built from the same content the page renders', () => {
  const prompt = systemPrompt('fr');
  // If someone edits a schedule time in wedding.js, it must reach the bot too —
  // that coupling is the whole reason the bot cannot contradict the page.
  for (const item of STR.fr.schedule) {
    expect(prompt).toContain(item.time);
    expect(prompt).toContain(item.title);
    // The programme's bullets are facts too — a guest asking "is there a cake?"
    // gets an answer only if they reached the prompt.
    for (const entry of item.items ?? []) expect(prompt).toContain(entry);
  }
  for (const fact of STR.fr.facts) expect(prompt).toContain(fact.value);
});

test('the quote stars reach the bot, so it can talk about what a guest pressed', () => {
  // The quotes are decoration the page hides behind a click. Without them in the
  // prompt the bot declines under rule 1 — "not in the facts" — which reads as
  // the site not knowing its own content.
  const prompt = systemPrompt('fr');
  for (const q of SHARED.starQuotes) {
    expect(prompt).toContain(q.text);
    expect(prompt).toContain(starGloss(q.id, 'fr').ref);
  }
  expect(prompt).toContain('Never invent a quote');
});

test('the prompt tells the model to refuse rather than improvise', () => {
  const prompt = systemPrompt('en');
  expect(prompt).toContain('ONLY from the facts above');
  expect(prompt).toContain('Never invent');
});

test('every language produces a prompt in its own language', () => {
  const names = { fr: 'French', en: 'English', ar: 'Arabic', fa: 'Persian' };
  for (const lang of LANGS) {
    expect(systemPrompt(lang)).toContain(`Reply in ${names[lang]}`);
  }
});

test('canned answers match a chip regardless of case and spacing', () => {
  const chip = STR.fr.chips[0];
  expect(cannedAnswer(chip.q, 'fr')).toBe(chip.a);
  expect(cannedAnswer(`  ${chip.q.toUpperCase()}  `, 'fr')).toBe(chip.a);
});

test('an unknown question falls back to the handoff line, never a guess', () => {
  expect(cannedAnswer('puis-je amener mon chien ?', 'fr')).toBe(fallbackText('fr'));
  expect(cannedAnswer('what is the wifi password', 'en')).toBe(fallbackText('en'));
});

test('the limits that protect the bill and the trust boundary are set', () => {
  expect(MAX_MESSAGE).toBe(500);
  expect(PER_VISITOR_HOURLY).toBe(20);
});

test('the prompt carries no contact details and forbids inventing any', () => {
  // The page's one email lives in the FALLBACK line, not in the prompt: the
  // model must never volunteer a contact detail, because a plausible-looking
  // invented one is worse than "I don't know". The hand-off happens on the way
  // out, in copy nobody generated.
  const prompt = systemPrompt('fr');
  expect(prompt).not.toContain('Contact:');
  expect(prompt).toContain('ask Leïla or Amine directly');
  expect(prompt).toContain('NEVER produce a phone number');
  // The address IS public and must still be there.
  expect(prompt).toContain('Address:');
});

test('no locale leaks a phone-shaped string into the prompt', () => {
  for (const lang of LANGS) {
    expect(systemPrompt(lang)).not.toMatch(/0[0-9]( ?[0-9]{2}){4}/);
  }
});

test('the album link reaches the bot only when one is configured', () => {
  expect(systemPrompt('fr')).not.toContain('Shared photo album');
  const url = 'https://photos.example/abc';
  expect(systemPrompt('fr', { photoDropUrl: url })).toContain(url);
});

test('requested songs reach the bot only when there are some, and never with a name', () => {
  expect(systemPrompt('fr')).not.toContain('SONGS GUESTS HAVE REQUESTED');
  const prompt = systemPrompt('fr', { songs: ['Ya Rayah — Rachid Taha'] });
  expect(prompt).toContain('- Ya Rayah — Rachid Taha');
  // The endpoint is public. A guest's name must not be reachable through it.
  expect(prompt).not.toContain('requested by');
  expect(prompt).toContain('You do not know who requested which song');
});
