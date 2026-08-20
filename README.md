# wedding-2026

The wedding site for Leïla & Mohammad-Amine — 5 September 2026, Fosses.

Four languages (fr / en / ar / fa), a grounded AI chatbot for guest questions,
and RSVPs that persist. Deployed on ukubi-cluster at **wedding.bnei.dev**.

## How it works

| | |
|---|---|
| Framework | SvelteKit 2, Svelte 5 runes, `adapter-node` |
| Styling | Tailwind v4, CSS-first `@theme` tokens, light + dark |
| Database | Pigsty at `postgres.bnei.lan:5432` (**not** 6432 — pgbouncer's transaction pooling breaks prepared statements) |
| Chatbot | Any OpenAI-compatible endpoint, set entirely by env var |
| Deploy | buildah on the `build-runner` LXC → `registry.bnei.lan:5000` → ArgoCD |

### `src/lib/content/wedding.js` is the single source of truth

Every fact and all four locales live in that one file. The page renders from it
**and** the chatbot's system prompt is built from it, so the bot cannot
contradict the schedule printed above it. Change a time there and both change.

`src/lib/chat-prompt.test.js` asserts that coupling.

### Design tokens

Every colour lives in `@theme` in `src/app.css`. No component contains a raw hex
or a stock Tailwind palette colour. The check:

```sh
grep -rnE '#[0-9a-fA-F]{3,6}' src/lib src/routes   # must return nothing
```

Note that `--color-primary-surface` (the large green field: rail, footer) and
`--color-primary` (green as ink on paper) are deliberately separate tokens. Dark
mode lifts the second for contrast and leaves the first dark — collapsing them
turns the rail mint.

### The chatbot degrades instead of breaking

With no `OPENAI_API_KEY`, `/api/chat` answers from the canned FAQ in
`wedding.js`. The site works end to end with no provider configured.

Guardrails: answer only from the facts, otherwise say so and give the contact
numbers; decline anything off-topic; reply in the guest's language. Limits are
500 chars per message, 20 messages per visitor per hour, and 500 site-wide per
day — all enforced in SQL against `chat_message`, no Redis.

## Running it

```sh
docker run -d --name wedding-pg -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=weddingdb -p 55432:5432 postgres:16-alpine
cp .env.example .env      # point WEDDING_DB_PORT at 55432
bun install && bun run dev
```

Tables are created on boot (`src/lib/server/db.js`). There is no migration step.

```sh
bun test src        # prompt construction, guardrails, limits
bun run test:e2e    # 26 browser tests, needs the dev server on :5188
```

## Deliberately absent

There are **no phone numbers** on this site and none in this repo. Guests who
need a person are pointed at Leïla or Amine directly, and the chatbot's system
prompt bans producing a contact detail outright — without an explicit ban a
model asked "how do I reach you?" will format a plausible-looking number. The
venue address *is* public and lives in `wedding.js`.

## Still to fill in

`src/lib/content/wedding.js`:

- **street number** — the address has none

Env-driven, set in the Infisical project (`wedding-2026-ih1x`):

- **`PHOTO_DROP_URL`** — the shared album. Empty hides the link and the chatbot
  won't mention one. In env rather than content because an album URL tends to be
  decided late and changed after the day.
- **`gardenPlanImage`** — drop a drawing at `static/plan.jpg` and point at it;
  the four pins are positioned in percentages and scale over any image

## Deployment notes worth not relearning

- **`ORIGIN` in `helm/values.yaml` is required.** Traefik terminates TLS and
  forwards plain HTTP, so without it adapter-node rejects every RSVP with
  `403 Cross-site POST form submissions are forbidden`. It must equal `https://`
  plus the registry hostname; the chart renders `env` with `toYaml`, not `tpl`,
  so it cannot reference `ingress.hostname`.
- **Cookie `Secure` comes from `url.protocol`, never the hostname.** Sniffing for
  "localhost" marks cookies Secure on `http://192.168.x.x` too, and browsers drop
  those — language, theme and the visitor id stop persisting on a phone while
  everything looks fine on localhost.
- `./dev-local.sh` runs against a throwaway Postgres with the real chatbot key.
  Note the `env` **after** `--`: `infisical run` injects its own values over the
  parent environment, so exporting `WEDDING_DB_HOST` beforehand is overridden by
  `postgres.bnei.lan`, which does not resolve off-LAN.
