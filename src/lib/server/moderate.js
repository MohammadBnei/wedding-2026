import OpenAI from 'openai';
import { env } from '$env/dynamic/private';
import { parseVerdict, moderationPrompt } from '$lib/wall.js';
import { setStatus } from './wall.js';

/**
 * Screening for the wall.
 *
 * NOTE THE ASYMMETRY WITH chat.js, AND DO NOT "FIX" IT FOR CONSISTENCY.
 * When the model is unreachable the chatbot degrades OPEN — it serves canned
 * answers and the site stays useful. Moderation degrades differently depending
 * on what is being screened:
 *
 *   text  -> approved. A rude sentence on a wall is recoverable in ten seconds,
 *            and the alternative is a projector showing nothing new all evening,
 *            because there is no moderator: the two people with /admin access
 *            are getting married that day and will not be draining a queue.
 *   photo -> pending. An unscreened photograph on a three-metre screen in front
 *            of families is not recoverable, so it waits for a human however
 *            long that takes.
 *
 * That split is the whole design. Collapsing it either way breaks something
 * that matters.
 */

/** How long a guest's post may sit unscreened before we give up on the model. */
const TIMEOUT_MS = 12_000;

function client() {
  if (!env.OPENAI_API_KEY) return null;
  // ponytail: the OpenAI SDK with a swappable baseURL IS the provider
  // abstraction — same call chat.js makes. Prod currently points at Venice.
  return new OpenAI({
    apiKey: env.OPENAI_API_KEY,
    baseURL: env.OPENAI_BASE_URL || undefined,
    timeout: TIMEOUT_MS,
    maxRetries: 1
  });
}

/**
 * @param {{message: string|null, imageBytes: Uint8Array|null}} input
 * @returns {Promise<{status: import('$lib/wall.js').WallStatus, verdict: string}>}
 */
export async function moderate({ message, imageBytes }) {
  const hasImage = Boolean(imageBytes);
  const c = client();
  if (!c) return { status: 'pending', verdict: 'no model configured' };

  /** @type {any[]} */
  const content = [{ type: 'text', text: message ? `Message: ${message}` : 'No message; screen the image.' }];
  if (imageBytes) {
    // The 1080p derivative, never the original: a 48 MP base64 payload costs
    // real money and buys no accuracy. Verified against the live endpoint that
    // this model genuinely reads the image (it distinguished two solid colours),
    // rather than silently ignoring it and approving everything.
    content.push({
      type: 'image_url',
      image_url: { url: `data:image/jpeg;base64,${Buffer.from(imageBytes).toString('base64')}` }
    });
  }

  const res = await c.chat.completions.create({
    model: env.OPENAI_MODERATION_MODEL || env.OPENAI_MODEL || 'gpt-4o-mini',
    max_tokens: 60,
    temperature: 0,
    messages: [
      { role: 'system', content: moderationPrompt({ hasImage }) },
      { role: 'user', content }
    ],
    // Venice injects its own system prompt by default, which pulled the model
    // into meta-commentary about whether it can see images at all. Harmless on
    // other providers, which ignore unknown body keys.
    // @ts-expect-error provider-specific extension, not in the OpenAI types
    venice_parameters: { include_venice_system_prompt: false }
  });

  return parseVerdict(res.choices[0]?.message?.content);
}

/**
 * Screen a post that is already stored and already answered to the guest.
 *
 * Runs AFTER the response, on purpose: a vision call takes seconds, and holding
 * the upload open for it on venue wifi is how you get double-taps and duplicate
 * posts. The row starts 'pending', so the worst case of this never finishing is
 * the honest one — the guest was told it is waiting, and it is.
 *
 * @param {string} id
 * @param {{message: string|null, imageBytes: Uint8Array|null}} input
 */
export async function moderateInBackground(id, input) {
  const hasImage = Boolean(input.imageBytes);
  try {
    const { status, verdict } = await moderate(input);
    // A model that did not decide leaves text publishable and photos held.
    const final = status === 'pending' && !hasImage ? 'approved' : status;
    await setStatus(id, final, verdict);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[wall] moderation failed:', msg);
    if (!hasImage) {
      try {
        await setStatus(id, 'approved', 'model unreachable — text published unscreened');
      } catch (e2) {
        console.error('[wall] moderation failed:', e2 instanceof Error ? e2.message : e2);
      }
    }
    // A photo stays pending. It waits for /admin, however long that takes.
  }
}
