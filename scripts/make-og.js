#!/usr/bin/env bun
/**
 * Regenerates the three raster assets in static/: the social card that every
 * WhatsApp / iMessage / Slack preview shows, and the two PNG icons a phone uses
 * when the site is saved to a home screen.
 *
 *   bunx playwright install chromium     # once
 *   bun scripts/make-og.js
 *   git add static/og.png static/apple-touch-icon.png static/icon-512.png
 *
 * By hand and committed, like scripts/seed-guests.js — never in CI and never in
 * the app. The build box has no browser, the Docker build only copies static/,
 * and the card changes about as often as the couple's names do.
 *
 * Fonts are inlined as base64 rather than referenced from static/fonts:
 * setContent leaves the document at about:blank, so relative URLs resolve
 * against nothing, and @font-face is CORS-checked, so a file:// page cannot load
 * a file:// font either. A data URI dodges both without running a server.
 *
 * The card is French only. Crawlers send no cookie, so hooks.server.js
 * negotiates them to the default — there is exactly one card and it matches.
 *
 * The town is NOT on the card, and neither is the address. A preview is seen by
 * everyone a link is forwarded to, not just by the guests who open the site;
 * names and a date are what it is allowed to carry. Same rule as the og: tags
 * in +layout.svelte — if you put the venue back in one, put it back in neither.
 */
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { SHARED, STR } from '../src/lib/content/wedding.js';

const asset = (p) => fileURLToPath(new URL(`../static/${p}`, import.meta.url));
const font = (f) =>
  `url(data:font/woff2;base64,${readFileSync(asset(`fonts/${f}`)).toString('base64')}) format('woff2')`;

// Hex is spelled out here because this file is not a component — it cannot read
// the @theme tokens in app.css. The values are those tokens; keep them in step.
const card = `<!doctype html><meta charset="utf-8"><style>
  @font-face { font-family: Bodoni; src: ${font('bodoni-moda-400-normal-latin.woff2')} }
  @font-face { font-family: Bodoni; font-style: italic; src: ${font('bodoni-moda-400-italic-latin.woff2')} }
  @font-face { font-family: Mulish; font-weight: 300; src: ${font('mulish-300-normal-latin.woff2')} }
  @font-face { font-family: Amiri;  src: ${font('amiri-400-normal-arabic.woff2')} }
  * { margin: 0; box-sizing: border-box }
  body { position: relative; width: 1200px; height: 630px; border: 18px solid #1e2159;
         background: #fcfeff; color: #1b1c2e; font-family: Mulish, sans-serif;
         display: flex; flex-direction: column; align-items: center;
         justify-content: center; gap: 28px }
  /* the rail's dotted tracery, inset from the indigo frame */
  .tracery { position: absolute; inset: 26px; border: 1.5px dotted #a94bc9; opacity: .55 }
  /* the 8-point star, same geometry as Ornament.svelte: two squares, one
     rotated 45deg, with the paper colour punched through the middle */
  .star { position: relative; width: 64px; height: 64px }
  .star span { position: absolute; inset: 0; background: #a94bc9 }
  .star .rot { transform: rotate(45deg) }
  .star .punch { inset: 20px; background: #fcfeff; transform: rotate(45deg) }
  h1 { font: 400 76px/1.18 Bodoni, serif; text-align: center }
  h1 em { color: #a94bc9 }
  .motto { font-family: Amiri, serif; font-size: 36px; color: #5054b3; direction: rtl }
  .meta { font-weight: 300; font-size: 22px; letter-spacing: .24em;
          text-transform: uppercase; color: #a94bc9 }
</style>
<div class="tracery"></div>
<div class="star"><span></span><span class="rot"></span><span class="punch"></span></div>
<h1>${SHARED.names.latin[0]} <em>&amp;</em><br>${SHARED.names.latin[1]}</h1>
<div class="motto">${SHARED.motto}</div>
<div class="meta">${STR.fr.date}</div>`;

// The icons ARE the favicon, rasterised — one mark, so they cannot drift apart.
// Opaque on purpose: iOS composites a transparent home-screen icon onto white.
const icon = `<!doctype html><meta charset="utf-8"><style>
  * { margin: 0 } svg { display: block; width: 100vw; height: 100vh }
</style>${readFileSync(asset('favicon.svg'), 'utf8')}`;

const browser = await chromium.launch();
const page = await browser.newPage();

for (const [html, width, height, out] of [
  [card, 1200, 630, 'og.png'],
  [icon, 180, 180, 'apple-touch-icon.png'],
  [icon, 512, 512, 'icon-512.png']
]) {
  await page.setViewportSize({ width, height });
  await page.setContent(html);
  // The `.then(() => {})` matters: FontFaceSet does not serialise across the
  // bridge, so returning document.fonts.ready directly throws.
  await page.evaluate(() => document.fonts.ready.then(() => {}));
  await page.screenshot({ path: asset(out) });
  console.log(`${out}  ${width}x${height}`);
}

await browser.close();
