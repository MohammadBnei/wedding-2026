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
import { star, SUN_RAYS } from '../src/lib/tracery.js';

const asset = (p) => fileURLToPath(new URL(`../static/${p}`, import.meta.url));
const girihURI =
  'data:image/svg+xml;base64,' + readFileSync(asset('girih.svg')).toString('base64');
const font = (f) =>
  `url(data:font/woff2;base64,${readFileSync(asset(`fonts/${f}`)).toString('base64')}) format('woff2')`;

// Hex is spelled out here because this file is not a component — it cannot read
// the @theme tokens in app.css. The values are those tokens; keep them in step.
//   #1e2159 primary-surface   #fcfeff primary-ink     #c9cbee primary-faint
//   #a94bc9 accent            #d9bc6a gold-soft       #8a6914 gold
//
// The card is the NIGHT, not the paper it used to be: the rail is the first
// thing a guest sees when they open the link, so the preview should look like
// it. The geometry comes from $lib/tracery.js, the same module the page draws
// from, so the two cannot drift.
/* The eight-point star, from the same star() the page uses, and drawn the same
   way: outline only. It used to be three stacked boxes with the middle one
   painted in whatever it sat on, which read as a cog rather than a star. */
const mark = (stroke) =>
  `<svg class="mark" viewBox="0 0 80 80" fill="none"><path d="${star(40, 40, 37)}"` +
  ` stroke="${stroke}" stroke-width="2.6"/></svg>`;

const svg = (viewBox, body, cls, style = '') =>
  `<svg viewBox="${viewBox}" class="${cls}" style="${style}"><g fill="none" stroke="currentColor" stroke-linecap="round">${body}</g></svg>`;

const sun = svg(
  '0 0 100 100',
  `<circle cx="50" cy="50" r="15"/><circle cx="50" cy="50" r="21"/><path d="${SUN_RAYS}"/>`,
  'sun'
);

const card = `<!doctype html><meta charset="utf-8"><style>
  @font-face { font-family: Bodoni; src: ${font('bodoni-moda-400-normal-latin.woff2')} }
  @font-face { font-family: Bodoni; font-style: italic; src: ${font('bodoni-moda-400-italic-latin.woff2')} }
  @font-face { font-family: Mulish; font-weight: 300; src: ${font('mulish-300-normal-latin.woff2')} }
  @font-face { font-family: Amiri;  src: ${font('amiri-400-normal-arabic.woff2')} }
  * { margin: 0; box-sizing: border-box }
  body { position: relative; overflow: hidden; width: 1200px; height: 630px;
         background-color: #1e2159; color: #fcfeff; font-family: Mulish, sans-serif;
         display: flex; flex-direction: column; align-items: center;
         /* The block centres in the space ABOVE the sunrise, not in the whole
            card: without the reserve the date landed on top of the sun. */
         justify-content: center; gap: 16px; padding-bottom: 150px }
  /* The girih field, the same asset and the same size .night tiles it at. The
     two numbers are the tile's own period and must stay in ratio or the
     strapwork shears. Inlined rather than linked because this page renders from
     a string with no server behind it, so a /girih.svg would not resolve. */
  body { background-image: url('${girihURI}'); background-size: 239.03px 173.67px }
  /* the hero card's dotted frame, in gold */
  .frame { position: absolute; inset: 26px; border: 1.5px dotted #d9bc6a; opacity: .5 }
  svg { position: absolute; color: #d9bc6a; stroke-width: 1.1 }
  /* Sunrise along the foot: the same ramp the page runs, night into gold. */
  .dawn { position: absolute; inset: auto 0 0; height: 158px;
          background: linear-gradient(to top, #d9bc6a, #8a6914 38%, rgba(30,33,89,0)) }
  .sun { bottom: 62px; left: 50%; margin-left: -39px; width: 78px;
         color: #1e2159; stroke-width: 1.6 }
  .mark { position: static; flex: none; width: 54px; height: 54px }
  h1 { font: 400 66px/1.14 Bodoni, serif; text-align: center }
  h1 em { color: #eba9ff }
  /* Amiri's default line-height is generous enough to push the block past the
     top edge; both Arabic lines are single-line, so pin it. */
  .arabic { font: 28px/1.1 Amiri, serif; color: #c9cbee; direction: rtl }
  .salam { font: 26px/1.1 Amiri, serif; color: #d9bc6a; direction: rtl }
  .meta { font-weight: 300; text-transform: uppercase; font-size: 21px;
          letter-spacing: .24em; color: #c9cbee; margin-top: 4px }
</style>
<div class="frame"></div>
<div class="dawn"></div>
${sun}
${mark('#a94bc9')}
<h1>${SHARED.names.latin[0]} <em>&amp;</em><br>${SHARED.names.latin[1]}</h1>
<div class="arabic">${SHARED.names.arabic}</div>
<div class="salam">${SHARED.salam}</div>
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
