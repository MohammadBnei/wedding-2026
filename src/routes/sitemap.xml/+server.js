/**
 * One page, one entry. The origin comes from the request rather than a constant
 * so this is correct in dev, in the cluster and behind the typo-host redirect
 * without anyone remembering to update it.
 *
 * No <lastmod>: the only date this file could reach for is the wedding itself,
 * which is in the FUTURE and is not when the page last changed. A wrong lastmod
 * is worse than none — crawlers that believe it re-crawl on the wrong schedule,
 * and the ones that don't discard the whole hint.
 *
 * @type {import('./$types').RequestHandler}
 */
export function GET({ url }) {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${url.origin}/</loc>
  </url>
</urlset>
`;

  return new Response(xml, {
    headers: { 'content-type': 'application/xml', 'cache-control': 'public, max-age=86400' }
  });
}
