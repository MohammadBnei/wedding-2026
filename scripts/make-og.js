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
import { CELLS, SIDE, ZELLIJ_RULES, SUN_RAYS, GRASS_BLADES } from '../src/lib/tracery.js';

const asset = (p) => fileURLToPath(new URL(`../static/${p}`, import.meta.url));
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
const star = (fill, punch) =>
  `<span class="star" style="--fill:${fill};--punch:${punch}"></span>`;

const svg = (viewBox, body, cls, style = '') =>
  `<svg viewBox="${viewBox}" class="${cls}" style="${style}"><g fill="none" stroke="currentColor" stroke-linecap="round">${body}</g></svg>`;

const zellij = svg(
  '0 0 120 120',
  CELLS.map(
    (c) =>
      `<rect x="${c.x}" y="${c.y}" width="${SIDE}" height="${SIDE}"/>` +
      `<rect x="${c.x}" y="${c.y}" width="${SIDE}" height="${SIDE}" transform="rotate(45 ${c.x + SIDE / 2} ${c.y + SIDE / 2})"/>`
  ).join('') + `<path d="${ZELLIJ_RULES}"/>`,
  'zellij'
);

const sun = svg(
  '0 0 100 100',
  `<circle cx="50" cy="50" r="15"/><circle cx="50" cy="50" r="21"/><path d="${SUN_RAYS}"/>`,
  'sun'
);

const grass = (cls) => svg('0 0 100 24', `<path d="${GRASS_BLADES}"/>`, cls);

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
  /* The star field, transcribed from .night in app.css — coprime tile sizes so
     the layers only realign far beyond any card. */
  body { background-image:
      radial-gradient(1.5px 1.5px at 23px 31px, rgba(252,254,255,.85) 50%, transparent 50%),
      radial-gradient(1px 1px at 96px 17px, rgba(235,169,255,.7) 50%, transparent 50%),
      radial-gradient(1px 1px at 41px 74px, rgba(252,254,255,.55) 50%, transparent 50%),
      radial-gradient(2px 2px at 150px 118px, rgba(252,254,255,.4) 50%, transparent 50%),
      radial-gradient(1px 1px at 12px 57px, rgba(201,203,238,.55) 50%, transparent 50%),
      radial-gradient(1px 1px at 63px 9px, rgba(235,169,255,.45) 50%, transparent 50%);
    background-size: 137px 89px, 89px 211px, 211px 163px, 163px 71px, 71px 179px, 53px 127px }
  /* the hero card's dotted frame, in gold */
  .frame { position: absolute; inset: 26px; border: 1.5px dotted #d9bc6a; opacity: .5 }
  svg { position: absolute; color: #d9bc6a; stroke-width: 1.1 }
  .zellij { top: 34px; right: 34px; width: 150px; opacity: .3 }
  /* Sunrise along the foot: the same ramp the page runs, night into gold. */
  .dawn { position: absolute; inset: auto 0 0; height: 158px;
          background: linear-gradient(to top, #d9bc6a, #8a6914 38%, rgba(30,33,89,0)) }
  .sun { bottom: 62px; left: 50%; margin-left: -39px; width: 78px;
         color: #1e2159; stroke-width: 1.6 }
  .blades { bottom: 0; width: 330px; color: #1e2159; opacity: .8 }
  .blades.l { left: 30px } .blades.r { right: 30px; transform: scaleX(-1) }
  .star { position: relative; flex: none; width: 54px; height: 54px }
  .star::before, .star::after { content: ''; position: absolute; inset: 0; background: var(--fill) }
  .star::after { transform: rotate(45deg) }
  /* z-index because ::after paints AFTER the element's own children, so without
     it the rotated square covers the punch and the star comes out solid. */
  .star i { position: absolute; z-index: 1; inset: 17px; background: var(--punch);
            transform: rotate(45deg) }
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
${zellij}
<div class="dawn"></div>
${grass('blades l')}
${grass('blades r')}
${sun}
<div class="star" style="--fill:#a94bc9;--punch:#1e2159"><i></i></div>
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
