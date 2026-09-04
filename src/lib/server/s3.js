import { env } from '$env/dynamic/private';

/**
 * Object storage for the wall: the untouched original, and the 1080p derivative
 * the projector shows.
 *
 * Uses Bun's built-in S3 client. No @aws-sdk, no minio package — the whole
 * feature adds zero runtime dependencies, which is why `Bun.*` appears in a
 * SvelteKit app at all.
 *
 * NOTHING browser-side ever talks to Garage. Uploads arrive as a multipart POST
 * to a form action (the pod has to hold the bytes anyway, because the re-encode
 * is the trust boundary and cannot be delegated), and the wall image is served
 * back through /api/wall/img/<id>.jpg. That is why there are no presigned URLs
 * here and why the bucket needs no CORS rule at all — and it is also strictly
 * better for the projector, since wedding.bnei.dev is behind Cloudflare while
 * s3.bnei.dev is grey, so proxying puts a CDN in front of every image instead of
 * pulling each one over a residential uplink.
 */

/**
 * REGION IS LOAD-BEARING. Bun defaults to `auto`; Garage is configured with
 * `s3_region = "garage"` (ansible/playbooks/garage-configure.yml) and rejects
 * any request whose SigV4 credential scope names a different region. The failure
 * is `AuthorizationHeaderMalformed` on every single call, put and get alike —
 * an error that reads like a broken signature and sends you looking at the key.
 */
const REGION = env.S3_REGION || 'garage';

/**
 * Unset in local dev and CI, where there is no Garage and no LAN to reach it on.
 * The disk fallback below is the entire reason this module is an indirection
 * rather than `Bun.s3` inline: it keeps `bun run dev` and Playwright working
 * with no extra container, and compose.yaml stays "the local Postgres, and
 * nothing else".
 */
const ENDPOINT = env.S3_ENDPOINT || '';
const BUCKET = env.S3_BUCKET || 'wedding-wall';
const DEV_DIR = '.s3-dev';

/** @type {Bun.S3Client | null} */
let client = null;

/**
 * Endpoint set but no credentials is the ONE misconfiguration this feature is
 * most likely to ship with, and the one that fails most quietly.
 *
 * ansible/playbooks/garage-configure.yml writes WEDDING_WALL_S3_ACCESS_KEY and
 * _SECRET into the ROOT Infisical project; this pod reads from the per-app
 * project (wedding-2026-ih1x, see helm/values.yaml). They are different
 * projects, so the keys have to be copied across by hand — exactly as
 * AGENTFLEET_FILES_S3 does, which docs/secrets.md records. Miss that step and
 * Bun builds a client with accessKeyId: undefined, every put and every get
 * fails deep inside the SDK, and the first symptom is a guest's upload not
 * appearing at a wedding.
 *
 * So: say so once, loudly, at boot, and then behave as if storage is absent —
 * which makes the wall refuse posts with an honest 503 instead of accepting
 * them into a void.
 */
if (ENDPOINT && !(env.WEDDING_WALL_S3_ACCESS_KEY && env.WEDDING_WALL_S3_SECRET)) {
  console.error(
    '[wall] S3_ENDPOINT is set but WEDDING_WALL_S3_ACCESS_KEY/_SECRET are missing — ' +
      'copy them from the root Infisical project into wedding-2026-ih1x. ' +
      'Photo posts are disabled until then.'
  );
} else if (ENDPOINT) {
  client = new Bun.S3Client({
    accessKeyId: env.WEDDING_WALL_S3_ACCESS_KEY,
    secretAccessKey: env.WEDDING_WALL_S3_SECRET,
    bucket: BUCKET,
    endpoint: ENDPOINT,
    region: REGION
  });
}

/**
 * True when object storage is genuinely usable. Distinct from s3Configured():
 * in dev, with no endpoint, the disk fallback IS usable. In the cluster, with
 * an endpoint and no keys, nothing is.
 */
export function storageBroken() {
  return Boolean(ENDPOINT) && client === null;
}

/** Is real object storage configured, or are we on the disk fallback? */
export function s3Configured() {
  return Boolean(client);
}

/**
 * @param {string} key
 * @param {Uint8Array} bytes
 * @param {string} contentType
 */
export async function putObject(key, bytes, contentType) {
  if (client) {
    await client.write(key, bytes, { type: contentType });
    return;
  }
  // Bun.write creates the parent directories itself, so this needs no mkdir and
  // no path join — which is also why this file imports nothing from node:*.
  // svelte-check resolves @types/node differently in CI than locally, and a
  // type-only dependency that fails only on the runner is not worth having.
  await Bun.write(`${DEV_DIR}/${key}`, bytes);
}

/**
 * @param {string} key
 * @returns {Promise<Uint8Array | null>} null when the object is not there —
 *   callers turn that into a 404 rather than a 500, since a missing blob for a
 *   row that exists is a bad day, not a crash.
 */
export async function getObject(key) {
  try {
    if (client) return await client.file(key).bytes();
    const f = Bun.file(`${DEV_DIR}/${key}`);
    return (await f.exists()) ? await f.bytes() : null;
  } catch (err) {
    console.error('[wall] object read failed:', err instanceof Error ? err.message : err);
    return null;
  }
}
