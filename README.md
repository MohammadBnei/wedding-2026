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
# The [^{] matters: `{#each` is four hex digits after a #, so the naive pattern
# reports every block in every component and the check reads as permanently red.
grep -rnE '[^{]#[0-9a-fA-F]{3,6}\b' src/lib src/routes   # must return nothing
```

Note that `--color-primary-surface` (the large green field: rail, footer) and
`--color-primary` (green as ink on paper) are deliberately separate tokens. Dark
mode lifts the second for contrast and leaves the first dark — collapsing them
turns the rail mint.

`--color-gold` / `--color-gold-soft` are the same split for the second accent:
gold as ink on paper (4.61:1 on `surface-alt`, the worst light ground it lands
on) and gold on the night field (8.01:1). Only the ink lifts in dark; the field
gold needs no dark variant, because the field is dark in both themes. Every
ratio in `app.css`'s comments is measured — recompute before changing one.

### The chatbot degrades instead of breaking

With no `OPENAI_API_KEY`, `/api/chat` answers from the canned FAQ in
`wedding.js`. The site works end to end with no provider configured.

Guardrails: answer only from the facts, otherwise say so and give the contact
numbers; decline anything off-topic; reply in the guest's language. Limits are
500 chars per message, 20 messages per visitor per hour, and 500 site-wide per
day — all enforced in SQL against `chat_message`, no Redis.

### The database degrades instead of breaking

Same bargain as the chatbot, extended to Postgres. The site is an invitation
first and a form second: the schedule, the address, the travel notes and the
canned FAQ all live in `wedding.js` and need no database at all. So with
Postgres unreachable the page still serves 200, and only the parts that truly
need it go quiet:

| | Database up | Database down |
|---|---|---|
| Invitation, schedule, address, travel, plan | works | works |
| 404 page, `/wedding.ics`, `/sitemap.xml`, link previews | works | works |
| Chatbot | model answers, with history | canned FAQ, no memory |
| Chat rate limits | enforced in SQL | not needed — no provider call is made |
| RSVP name autocomplete | suggests | suggests nothing |
| `/admin` | lists the replies | says so — an empty list would read as "nobody came" |
| **RSVP** | saved | **refused, and the guest is told** |

`dbUp()` and `dbOr()` in `src/lib/server/db.js` are the whole mechanism.
`migrate()` never rejects — it is awaited on every request, so a throw there
would be a 500 on pages that need no data — and it retries a dead database every
30 s rather than on every request, which would stall each one for the connect
timeout.

Two rules worth keeping:

- The RSVP write does **not** use `dbOr`. A guest shown the thank-you screen for
  an answer that was never stored is a guest nobody counts, and nobody finds out
  until the catering numbers are wrong. It fails loudly with `t.rsvpOffline`,
  and the form disables its own submit up front rather than after they type.
- `aiConfigured()` requires the database as well as the key. The rate limits are
  counted in `chat_message`; without them `/api/chat` is a public endpoint that
  costs money per call, so no database means canned answers and no spend.

Reproduce it locally by pointing the app at a port with nothing on it:

```sh
WEDDING_DB_HOST=127.0.0.1 WEDDING_DB_PORT=1 bun run dev
```

### Link previews carry no address

`og:*`, the `<meta name="description">` snippet and the JSON-LD say the event
type and the date, and nothing else — `"Un mariage — samedi 5 septembre 2026."`
The card in `static/og.png` is the names, the greeting and the date. No town, no
street, and deliberately no schema.org `location`, which is what a Google rich
result would need.

A preview is seen by everyone a link is forwarded to, not just by the guests who
open the site. The address is on the page for those who do, and in
`/wedding.ics` for their calendars — that route sends `X-Robots-Tag: noindex` so
it stays out of search results. If you put the venue back into one of these
surfaces, put it back into all of them or none.

## Running it

```sh
docker run -d --name wedding-pg -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=weddingdb -p 55432:5432 postgres:16-alpine
cp .env.example .env      # point WEDDING_DB_PORT at 55432
bun install && bun run dev
```

Tables are created on boot (`src/lib/server/db.js`). There is no migration step.

### The guest list

The RSVP name field autocompletes against the real guest list, and picking a name
prefills the headcount. Those names live in Postgres and nowhere else: the CSV
export is gitignored and dockerignored (real names, and this repo is public), so
it never reaches the image. Load it by hand, once per DB, whenever the list
changes:

```sh
# local dev DB
WEDDING_DB_HOST=localhost WEDDING_DB_PORT=55432 WEDDING_DB_NAME=weddingdb \
WEDDING_DB_USER=postgres WEDDING_DB_PASSWORD=postgres \
  bun scripts/seed-guests.js "Wedding Guest List - 5 September 202 - Guest List.csv"

# production
infisical run --projectId=798540d3-0c3e-47ee-b447-468d65088377 --env=dev --silent -- \
  bun scripts/seed-guests.js "Wedding Guest List - 5 September 202 - Guest List.csv"
```

Without it the field simply suggests nothing — the form still works. Suggestions
need two characters, so no single request returns the roster. The song field
autocompletes too, proxied through `/api/songs` from the iTunes Search API (no
key, no account); if that call fails the field is plain free text again.

### The social card

`static/og.png`, `static/apple-touch-icon.png` and `static/icon-512.png` are the
only raster files in the repo. They are generated by hand and committed, because
the build box has no browser and the card changes about as often as the names on
it do:

```sh
bunx playwright install chromium   # once
bun scripts/make-og.js             # rewrites the three PNGs, then look at them
```

The card is French only — crawlers send no cookie, so they get the default
language. Its facts come from `wedding.js` and its ornaments from
`$lib/tracery.js`, the same module `Tracery.svelte` draws from, so it can
contradict neither the page's words nor its marks.

**Bump `OG_VERSION` in `+layout.svelte` whenever you re-render it.** Platforms
cache the card against its URL and WhatsApp has no re-scrape tool, so a new card
at the old URL reaches nobody who has already shared the link.

```sh
bun test src        # prompt construction, guardrails, limits, name matching
bun run test:e2e    # 38 browser tests, needs `bun run dev` (pinned to :5188)
```

### `/admin` is gated at Traefik, not in the app

`/admin` lists every reply — name, going, heads, email, song, message — with the
three numbers above it. It is linked from nowhere and there is no login form,
because the gate is not in this codebase at all: `helm/values.yaml` declares a
second IngressRoute matching ``Host(...) && PathPrefix(`/admin`)`` and hangs
authentik's shared `default/authentik-forwardauth` middleware on it. The chart's
own route matches the host alone and carries no auth, which is what keeps the
invitation public. This app is that middleware's first consumer cluster-wide.

Two things in that manifest will serve the guest list to the internet if got
wrong, and both are commented at length where they live:

- **`priority: 100`.** Traefik's default priority is the *rule length*, so
  ``Host(`wedding.bnei.dev`)`` scores around 26 on its own. A tidy small number
  here puts the admin route *below* the chart's, and every `/admin` request gets
  served by the unauthenticated one with a 200.
- **The three baseline middlewares are repeated by hand.** The origin lock,
  rate limit and security headers are prepended only to the IngressRoute the
  chart renders; anything declared through `extraManifests` must wire the refs
  itself or it sits outside the Cloudflare origin lock.

`src/routes/admin/+page.server.js` also 404s unless the request carries
`X-authentik-username`, bypassed under `dev`. That is **not** the security
boundary — the header is set by the middleware and anything already on the pod
network could forge it. It exists so that a routing mistake is a 404 instead of
a leak. Nothing is authorised on the strength of it.

The arithmetic lives in `src/lib/rsvp-summary.js`, apart from the route so it can
be tested without a database. It deduplicates on the lowercased name because the
`rsvp` primary key is `visitor_id` — a cookie, not a person — so a guest who
replies on their phone and again on a laptop is two rows, and summing both books
a table for people who do not exist. Newest wins.

## Deliberately absent

There are **no phone numbers** on this site and none in this repo. The one
contact detail is an email, and it appears in exactly one place: the chat's
give-up line, assembled by `fallbackText()` in `wedding.js`. It is deliberately
**not** in the chatbot's system prompt, which still bans the model producing a
contact detail outright — without that ban, a model asked "how do I reach you?"
will format a plausible-looking address, and an invented one is worse than "I
don't know". The hand-off happens on the way out, in copy nobody generated.

While `SHARED.email` is empty the sentence is dropped entirely rather than
rendered as a dangling "write to us at ." — so the site is safe to ship before
the mailbox exists.

The venue address *is* public and lives in `wedding.js`.

## Still to fill in

`src/lib/content/wedding.js`:

- **street number** — the address has none
- **`email`** — the chat's hand-off address; the fallback omits the sentence until it is set

Env-driven, set in the Infisical project (`wedding-2026-ih1x`):

- **`PHOTO_DROP_URL`** — the shared album. Empty hides the link and the chatbot
  won't mention one. In env rather than content because an album URL tends to be
  decided late and changed after the day.
- **`gardenPlanImage`** — drop a drawing at `static/plan.jpg` and point at it;
  the four pins are positioned in percentages and scale over any image

## Running it locally

```sh
cp .env.example .env            # gitignored; edit if you want the real chatbot
docker compose up -d --wait     # Postgres on :55432, blocks until it accepts
bun run dev                     # :5188, and reachable from a phone on the LAN
```

`compose.yaml` is the database and nothing else — the app runs on the host. It
reads its port and credentials from the same `.env` the app does, so there is one
definition rather than two that drift. `docker compose down` keeps the data;
`down -v` wipes it. The schema builds itself on first request (`migrate()` in
`server/db.js`), so there is nothing to seed.

With `OPENAI_API_KEY` blank the chatbot answers from the canned FAQ, which is a
supported state and not a broken one — see the degradation notes above.

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
- **`infisical run` overrides the parent environment, not the other way round.**
  If you start the dev server under it to get the real chatbot key, the local
  database overrides have to come *after* the `--`, as `env KEY=VALUE …`.
  Exporting `WEDDING_DB_HOST` beforehand is silently replaced by
  `postgres.bnei.lan`, which does not resolve off-LAN. The invocation is written
  out in `.env.example`.
