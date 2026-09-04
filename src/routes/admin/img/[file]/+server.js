import { dev } from '$app/environment';
import { error } from '@sveltejs/kit';
import { wallKeyFor } from '$lib/server/wall.js';
import { getObject } from '$lib/server/s3.js';

/**
 * The same derivative as /api/wall/img, but at ANY status, so the queue can show
 * what it is being asked to decide about.
 *
 * It lives under /admin purely so it inherits the existing
 * `Host(...) && PathPrefix('/admin')` IngressRoute and its authentik
 * forwardAuth middleware — no new Traefik config, nothing to get wrong in
 * helm/values.yaml, where the comment already warns that two mistakes there
 * serve the guest list to the internet.
 *
 * The header check below is NOT the boundary, exactly as admin/+page.server.js
 * explains: it turns a routing mistake into a 404 instead of a leak. This is a
 * separate entry point from the page, so it re-runs it rather than assuming.
 *
 * Serves the derivative, never the original — the original is bytes we did not
 * encode, and nothing in this app hands those back to anyone.
 */
export async function GET({ params, request }) {
  if (!dev && !request.headers.get('x-authentik-username')) error(404);

  const m = /^([0-9a-f-]{36})\.jpg$/i.exec(params.file);
  if (!m) error(404);

  const key = await wallKeyFor(m[1], { approvedOnly: false });
  if (!key) error(404);

  const bytes = await getObject(key);
  if (!bytes) error(404);

  return new Response(/** @type {BodyInit} */ (bytes), {
    headers: { 'content-type': 'image/jpeg', 'cache-control': 'private, max-age=300' }
  });
}
