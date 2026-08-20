import { expect, test } from 'bun:test';
import { systemPrompt, cannedAnswer, MAX_MESSAGE, PER_VISITOR_HOURLY } from './chat-prompt.js';
import { STR, LANGS } from './content/wedding.js';

test('the system prompt is built from the same content the page renders', () => {
  const prompt = systemPrompt('fr');
  // If someone edits a schedule time in wedding.js, it must reach the bot too —
  // that coupling is the whole reason the bot cannot contradict the page.
  for (const item of STR.fr.schedule) {
    expect(prompt).toContain(item.time);
    expect(prompt).toContain(item.title);
  }
  for (const fact of STR.fr.facts) expect(prompt).toContain(fact.value);
  expect(prompt).toContain(STR.fr.contactValue);
});

test('the prompt tells the model to refuse rather than improvise', () => {
  const prompt = systemPrompt('en');
  expect(prompt).toContain('ONLY from the facts above');
  expect(prompt).toContain('Never invent');
  // The handoff has to carry a real contact, or "I don't know" is a dead end.
  expect(prompt).toContain(STR.en.contactValue);
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
  expect(cannedAnswer('puis-je amener mon chien ?', 'fr')).toBe(STR.fr.fallback);
  expect(cannedAnswer('what is the wifi password', 'en')).toBe(STR.en.fallback);
});

test('the limits that protect the bill and the trust boundary are set', () => {
  expect(MAX_MESSAGE).toBe(500);
  expect(PER_VISITOR_HOURLY).toBe(20);
});
